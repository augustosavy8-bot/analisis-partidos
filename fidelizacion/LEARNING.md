# Aprendiendo pagos con Point

Diario de las decisiones del motor de pagos de Point (suscripciones de los
comercios + venta del kit de chips con Mercado Pago). Cada fase suma lo que
apareció: qué se hizo, por qué, y el concepto de pagos que hay detrás.

---

## Antes de empezar: qué dice Mercado Pago (documentación vigente, sept. 2026)

- **Suscripción con plan asociado** (`preapproval_plan` + `preapproval`): siempre
  se crea con `card_token_id` y `status: "authorized"`. O sea: la tarjeta se carga
  en *nuestra* web (formulario de MP, el "Card Payment Brick") y MP nos devuelve un
  token. Sólo tarjeta de crédito o débito.
- **Validación de la tarjeta**: al suscribirse, MP hace un cobro mínimo y lo devuelve.
- **Reintentos**: una cuota rechazada queda en `recycling` y se reintenta hasta
  **4 veces dentro de 10 días**. Si no se cobra, la cuota queda `processed` con el
  pago rechazado. **Después de 3 cuotas rechazadas, MP cancela la suscripción** solo.
- **Cambiar el monto** de una suscripción: `PUT /preapproval/{id}` con
  `auto_recurring.transaction_amount` (MP le avisa por email al suscriptor).
- **Cambiar la tarjeta**: `PUT /preapproval/{id}` con un `card_token_id` nuevo.
- **Pausar / cancelar**: `PUT /preapproval/{id}` con `status: "paused" | "cancelled"`.
  Cancelar es irreversible.
- **Cambiar el precio de un plan** (`preapproval_plan`): la documentación no dice
  que se propague a los suscriptores; cada suscripción guarda su propio monto. Lo
  confirmamos en sandbox en la fase 5.
- **Webhooks**: firma en el header `x-signature` (`ts=...,v1=...`), HMAC-SHA256
  del texto `id:{data.id};request-id:{x-request-id};ts:{ts};` con la clave secreta.
  MP espera un 200/201 en 22 segundos; si no, reintenta cada 15 minutos.

### Formulario de tarjeta en nuestra web vs. redirigir a Mercado Pago

Elegimos **formulario de tarjeta en la web + plan de MP**. La alternativa era
"suscripción sin plan, con pago pendiente": creamos la suscripción en `pending` y
mandamos al comercio al `init_point` de MP para que pague ahí.

| | Tarjeta en nuestra web (elegida) | Redirigir a MP |
|---|---|---|
| Dónde carga la tarjeta | En Point, con el formulario de MP (el dato viaja directo a MP, nosotros sólo vemos un token) | En la página de Mercado Pago |
| Medios de pago | Sólo tarjeta de crédito o débito | Tarjeta o dinero en cuenta de MP |
| Estado al crearla | `authorized` en el momento (o error inmediato si la tarjeta falla) | `pending` hasta que el comercio vuelve de MP |
| Control del flujo | Todo en nuestra pantalla: trial, mensajes de error, reintentos | Salimos de la web y dependemos de la vuelta (`back_url`) y del webhook |
| Plan de MP (`preapproval_plan`) | Sí: agrupa suscriptores, trial definido en el plan | No hay plan: el monto y el trial van en cada suscripción |
| Cambio de tarjeta | El mismo formulario, en el panel | Hay que mandarlo de nuevo a MP |
| Seguridad (PCI) | El número de tarjeta nunca toca nuestro servidor: el formulario es de MP y tokeniza en el navegador | Todo pasa en MP |

La contra de la opción elegida: el comercio no puede pagar con dinero en cuenta.
Para una suscripción B2B con débito automático, la tarjeta es lo normal.

---

## Fase 0 — Credenciales y usuarios de prueba

**Concepto: sandbox con usuarios de prueba.** En Mercado Pago no se prueba con tu
cuenta real: se crean dos cuentas de prueba, una **vendedora** (hace de "Point",
cobra) y una **compradora** (hace del comercio, paga con tarjetas de prueba).
Las credenciales de la app de la cuenta vendedora son las que usa el servidor.
Un pago de prueba nunca mueve plata real.

Estado: listo. App "Point Test" creada con la cuenta de prueba vendedora; sus
credenciales están en Vercel (`MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY`,
`MP_WEBHOOK_SECRET`, `CRON_SECRET`).

**Por qué las credenciales de una cuenta de prueba "de producción" son de prueba:**
MP marca a las cuentas de prueba como tales. Todo lo que hagan (cobros, suscripciones)
vive en el sandbox, aunque las credenciales empiecen con `APP_USR-` como las reales.
Y ambas puntas tienen que ser de prueba: un vendedor de prueba no puede cobrarle a
una persona real, ni al revés.

---

## Fase 1 — Esquema, RLS, planes y productos

### Qué se hizo
- Migración `20260930000021_facturacion.sql`: `comercios`, `planes`,
  `suscripciones`, `pagos_suscripcion`, `historial_suscripcion`, `productos`,
  `pedidos`, `pedido_items`, `pagos`, `eventos_pago`, `avisos_comercio`,
  `config_facturacion`.
- Cada local pertenece a un **comercio** (la cuenta que paga). Los locales que ya
  existían quedaron cada uno en su comercio, **en cortesía con plan Pro y sin fecha
  de fin**.
- Planes y productos cargados con los valores de prueba (editables desde /admin
  en la fase 7). ~~Página pública `/precios`~~: se sacó después (ver "Cambio: precios
  sólo dentro del panel" en la fase 2).
- `crear_comercio()`: alta atómica de un comercio (con cortesía opcional). La usa
  /admin y la va a usar el registro propio (fase 2).

### Conceptos de pagos que aparecieron

**1. La plata va en centavos enteros.** `precio_centavos = 1500000` es $15.000.
Los decimales en punto flotante no son exactos (`0.1 + 0.2 = 0.30000000000000004`):
sumando precios así aparecen diferencias de un centavo que después no cierran
contra lo que cobró MP. Con enteros la suma es exacta; convertimos a pesos sólo en
el borde, al llamar a la API (`src/lib/facturacion/dinero.ts`).

**2. Idempotencia con constraints UNIQUE.** Mercado Pago puede mandar el mismo
webhook más de una vez (reintentos, duplicados). Si cada notificación insertara
un cobro, cobraríamos doble en nuestros registros. Solución: los ids de MP son
`UNIQUE` (`mp_preapproval_id`, `mp_authorized_payment_id`, `mp_payment_id`). El
segundo intento de insertar el mismo cobro choca contra la base, no contra un
`if` que puede fallar con dos requests en paralelo. La base es la última defensa
porque es la única que ve las dos transacciones a la vez.

**3. Una sola fuente de verdad para "¿este comercio puede usar Point?"** No hay
una columna `comercios.estado` que haya que mantener sincronizada: el acceso se
deriva de la suscripción vigente (estado, fechas, plan). Dos columnas que dicen lo
mismo terminan diciendo cosas distintas.

**4. Cortesía = una suscripción más, sin Mercado Pago.** En vez de un "if" especial
para los comercios que no pagan, la cortesía es una fila en `suscripciones` con
`estado = 'cortesia'`, un plan y una fecha de fin opcional. El control de acceso
por plan funciona igual para todos. Pasarla a pago = crear la suscripción de MP y
cerrar la cortesía. Los `check` de la tabla lo garantizan: una suscripción paga
siempre tiene `mp_preapproval_id` y una cortesía nunca.

**5. Una suscripción vigente por comercio.** Índice único parcial
`(comercio_id) where estado <> 'cancelled'`: puede haber muchas canceladas (historial)
pero nunca dos activas, ni aunque dos requests intenten crearla a la vez.

**6. El navegador lee, el servidor escribe.** RLS abre sólo lecturas (el dueño ve
su comercio, su suscripción y sus pedidos; el catálogo de precios sólo con sesión).
Ningún rol del navegador puede insertar ni modificar: los cambios de estado pasan
por el servidor, que es quien habla con MP y valida. Si el precio o el estado se
pudieran escribir desde el cliente, bastaría con abrir la consola para darse el
plan Pro.

**7. Montos calculados en el servidor y congelados.** `pedidos.total_centavos`
tiene un `check (total = subtotal + envío)` y `pedido_items` guarda el precio
unitario del momento de la compra. Si mañana cambia el precio del kit, los pedidos
viejos siguen diciendo lo que se cobró.

**8. Log crudo de webhooks sin UNIQUE.** `eventos_pago` guarda cada notificación
tal como llegó (con firma válida o no). No es la tabla de negocio: es la caja
negra para auditar, depurar y "reprocesar". Por eso no tiene UNIQUE: queremos ver
también los duplicados.

**9. Límites del plan en jsonb, validados al leer y "fallando cerrado".** Si el
jsonb de un plan viene roto, se aplican los límites más restrictivos (nunca "sin
límite"). Un error de carga no puede regalar el plan Pro
(`src/lib/facturacion/planes.ts`).

---

## Fase 2 — Registro del comercio y alta de la suscripción con prueba gratis

### Qué se hizo
- `/sumate` es el registro: email + contraseña (con verificación por email), nombre
  del local, rubro y datos fiscales opcionales (razón social, CUIT con dígito
  verificador, condición fiscal). "Empezar" en la landing lleva acá.
- Al confirmar el email y entrar por primera vez, se crea el comercio con su primer
  local (`completar_registro`, en una transacción).
- `/panel/facturacion`: sin suscripción → elegir plan + tarjeta (formulario de MP).
  Con suscripción → estado, plan y fecha del primer cobro.
- Un comercio sin suscripción que entra a `/panel` va primero a activar la cuenta.
- El plan de MP (`preapproval_plan`) se crea solo la primera vez que alguien se
  suscribe a ese plan, con el precio y los días de prueba de nuestra base.

### Conceptos de pagos que aparecieron

**1. Tokenización: nunca tocar la tarjeta.** El formulario de tarjeta es de MP
(Card Payment Brick) y corre en el navegador. El número viaja directo a MP, que
devuelve un `token` de un solo uso. Nuestro servidor sólo recibe el token. Si el
número de tarjeta pasara por nuestro servidor, quedaríamos dentro del estándar PCI
DSS completo (auditorías, cifrado, controles). Con el token, eso lo carga MP.

**2. El precio nunca viene del navegador.** La server action recibe el *código*
del plan (`"pro"`), no el monto. El monto sale de la base. Si aceptáramos el precio
del cliente, cualquiera podría suscribirse al Pro por $1 editando la request.

**3. El doble clic que cobra dos veces.** Entre "el usuario apretó el botón" y
"quedó guardado" hay una llamada a MP que tarda. Dos clics (o dos pestañas) = dos
suscripciones en MP = dos débitos por mes. Solución en capas:
- El botón se deshabilita mientras procesa (UX, no seguridad).
- `reservar_alta_suscripcion`: un `UPDATE ... WHERE alta_en_curso_hasta IS NULL`
  atómico. Dos requests a la vez → sólo una lo consigue; la otra recibe "ya se está
  activando". La reserva vence sola en 2 minutos por si el servidor se cae a mitad.
- `idempotencyKey` en la llamada a MP: si reintentamos la misma request (timeout de
  red), MP devuelve la misma suscripción en vez de crear otra.

**4. No hay transacción entre MP y nuestra base.** Son dos sistemas: no existe un
"commit" que abarque a los dos. El orden importa:
1. Reservar en nuestra base.
2. Crear en MP.
3. Guardar en nuestra base.

Si falla 2, liberamos y no pasó nada. Si 2 sale bien y falla 3, **la suscripción
existe en MP y no en nuestra base**. No la podemos "deshacer" con seguridad, así
que la recuperamos. Para eso es clave el `external_reference = id del comercio`:
el webhook (fase 3) y la reconciliación diaria (fase 7) la encuentran y la
registran. `registrar_alta_suscripcion` es idempotente por `mp_preapproval_id`,
así que da igual quién llegue primero, el panel o el webhook.

**5. La prueba gratis no es "sin tarjeta".** Con el plan de MP, el trial se
configura en el `preapproval_plan` (`free_trial: 14 days`). La suscripción nace
`authorized` (la tarjeta quedó autorizada) y MP hace un cobro mínimo de validación
que devuelve. El primer débito real es cuando termina la prueba (`next_payment_date`).

**6. Traducir estados: los de MP no son los nuestros.** Para MP, una suscripción en
prueba está `authorized`. Para nosotros es `trialing`: todavía no cobramos nada y
eso cambia qué mostramos ("tu prueba termina el…"). La traducción vive en una
función pura y testeada (`estadoInicial`). Preferimos las fechas que manda MP
(`next_payment_date`) a calcularlas nosotros, porque MP es quien realmente cobra.

**7. Registro diferido.** Al registrarse no se crea el comercio: se guarda lo que
cargó y se crea recién al confirmar el email. Así un email mal escrito o un bot no
dejan comercios fantasma ocupando direcciones (`/t/bar-central`). Esos datos los
escribió el navegador, así que el servidor los vuelve a validar al usarlos.

**8. Errores de MP para humanos.** MP responde errores técnicos
(`cc_rejected_insufficient_amount`, `Card token was used`). Al comercio le mostramos
algo accionable ("La tarjeta fue rechazada, probá con otra"); el detalle técnico va
a los logs, sin datos de la tarjeta.

### Anexo fase 2 — Los emails de Auth y por qué hace falta un SMTP propio

El registro depende de un mail (la confirmación). Si ese mail no llega, el comercio
no puede pagar: el email es parte del embudo de cobro, no un detalle.

**El SMTP que trae Supabase no sirve para producción:**
- Es un servidor compartido para que pruebes: tiene un límite muy bajo de envíos
  por hora (del orden de un par de mails) y sólo entrega a direcciones autorizadas
  (los miembros del equipo del proyecto). A un comercio real directamente no le llega.
- El remitente es de Supabase, no tuyo. Eso resta confianza ("¿quién me escribe?") y
  sube la chance de spam.
- No controlás la reputación del dominio que envía ni ves qué pasó con cada mail
  (entregado, rebotado, marcado como spam).

**Con un SMTP propio (Resend) el mail sale desde tu dominio**, con límites que se
ajustan a tu volumen y un registro de cada envío. Para que Gmail y Outlook confíen
en tu dominio hay que publicar en el DNS:
- **SPF**: qué servidores pueden mandar mails "de" tu dominio.
- **DKIM**: una firma criptográfica en cada mail. El receptor la verifica con una
  clave pública que está en tu DNS, y así sabe que el mail no fue alterado.
- **DMARC** (recomendado): qué hacer si falla lo anterior, y a quién avisar.

**Lo que aprendimos depurando:** Supabase no manda el mail de confirmación si el
email ya está registrado, y responde "OK" igual. Es a propósito (evita la
*enumeración de usuarios*: que alguien pruebe emails para saber quién tiene cuenta).
Por eso la pantalla de "Revisá tu email" avisa que, si ya tenías cuenta, tenés que
ingresar o recuperar la contraseña.

### Cambio: precios sólo dentro del panel

Los precios dejaron de ser públicos: la landing no los muestra y `/precios` redirige
al registro. El dueño los ve recién en `/panel/facturacion`, ya registrado, con todo
lo que incluye cada plan.

Esto no es sólo "sacar una página": también se cerró la lectura anónima de `planes`,
`productos` y `config_facturacion` en la base (migración 023). Con la clave pública de
Supabase cualquiera podía consultar la API y ver los precios aunque no hubiera página.
**Lo que no querés público no alcanza con no mostrarlo en la interfaz: hay que
cerrarlo en la fuente.**

## Fase 3 — Webhooks, activación de la cuenta y control de acceso por plan

### Qué se hizo
- `POST /api/webhooks/mercadopago`: recibe las notificaciones de MP
  (`subscription_preapproval`, `subscription_authorized_payment`, `payment`).
  Guarda cada una en `eventos_pago`, valida la firma y procesa.
- `aplicar_cambio_suscripcion` y `registrar_cuota` (funciones Postgres): aplican el
  cambio de estado de forma atómica, con historial y aviso al comercio.
- Control de acceso (`acceso.ts`): el servidor decide qué puede hacer cada comercio
  según plan y estado. Básico: 3 premios, sin promos ni mensajes, estadísticas
  básicas. Pro: todo. Cuenta impaga después de la gracia: panel restringido.
- En el panel, lo que el plan no incluye se ve con un aviso "Pasar a Pro" en lugar
  del formulario.

### Conceptos de pagos que aparecieron

**1. Nunca creerle al cuerpo del webhook.** La notificación sólo dice "cambió el
recurso X". No usamos el estado que viene adentro: con el id, consultamos a la API
de MP (`GET /preapproval/{id}`, `GET /authorized_payments/{id}`) y usamos *esa*
respuesta. Así, aunque alguien nos mande un POST trucho, lo peor que logra es que
le preguntemos a MP algo que ya sabe.

**2. Firma HMAC (`x-signature`).** MP firma cada notificación con un secreto que
sólo conocemos nosotros y MP. Armamos el mismo texto
(`id:{data.id};request-id:{x-request-id};ts:{ts};`), calculamos HMAC-SHA256 con el
secreto y comparamos con `v1` usando una comparación de tiempo constante
(`timingSafeEqual`, para no filtrar cuántos caracteres coinciden). Firma inválida
→ 401 y no se procesa (pero queda guardada para auditar).

**3. Idempotencia: el mismo evento puede llegar 2, 5 o 20 veces.** MP reintenta si
no respondemos 200 a tiempo (22 s), y a veces manda duplicados igual. Todo el
procesamiento es idempotente: la cuota se guarda por su id único de MP
(`ON CONFLICT`), y aplicar "authorized" a una suscripción ya "authorized" no hace
nada nuevo (ni historial ni aviso).

**4. Los eventos llegan desordenados.** Puede llegar "cuota rechazada, intento 1"
después de "intento 3". Por eso la cuota guardada sólo se pisa si el intento nuevo
es mayor o igual. Y los estados terminales no vuelven: una suscripción cancelada
no se "resucita" por un webhook viejo que dice "authorized".

**5. 200 vs 500: cuándo pedir que reintenten.** Si el problema es nuestro (base
caída, MP lento al consultar) respondemos 500 y MP reintenta cada 15 minutos. Si el
recurso no existe en MP (404) respondemos 200: reintentar no lo va a arreglar.

**6. Huérfanos: "MP la creó pero nosotros no la guardamos".** Si el servidor se
cae justo después de crear la suscripción en MP, nuestra base no la tiene. Al
crearla mandamos `external_reference` = id del comercio; cuando llega el webhook de
una suscripción que no conocemos, la reconstruimos con ese dato. Nada se pierde.

**7. El acceso se decide en el servidor, en cada acción.** Esconder un botón no
alcanza: alguien puede llamar a la server action directo. Por eso `crear premio`,
`crear promo`, `enviar mensaje`, etc. preguntan `exigirFuncion`/`exigirLimite`
antes de guardar. La pantalla sólo refleja lo que el servidor ya decidió.

**8. No castigar al cliente final.** Si un comercio Básico pasa los 300 clientes,
no le cortamos el alta de tarjetas (el que paga el error sería el cliente del
café). Le mostramos un aviso para que pase a Pro. Los límites duros van donde el
que decide es el dueño (cuántos premios crea), no el cliente. Y el canje de
puntos ya ganados nunca se bloquea, pase lo que pase con el pago.

### Anexo fase 3 — Por qué el alta fallaba en pruebas

En el modo de pruebas de Mercado Pago **los dos lados tienen que ser de prueba**: si
quien cobra es una cuenta de prueba (y las "credenciales de prueba" de las apps
nuevas lo son: empiezan con `APP_USR-` y son de un vendedor de prueba que MP crea
solo), quien paga también tiene que ser una cuenta de prueba, identificada por su
**email exacto**.

Lo que fallaba era el email:
- Con un email real (o uno inventado), MP respondía *"Both payer and collector must
  be real or test users"*.
- Con `augustosavy8+prueba1@gmail.com`, *"User bad request"*: Gmail ignora lo que va
  después del `+`, así que para MP era el mismo dueño de la cuenta pagándose a sí mismo.
- Con un `test_user_…` armado a mano con el User ID, también *"User bad request"*: el
  número del email no es el User ID sino el del usuario `TESTUSER…`, y el panel no lo
  muestra. Hay que entrar con la cuenta compradora y leerlo en el perfil.

Lecciones:
1. Ante un error genérico de un proveedor de pagos, no adivinar: mirar el mensaje
   exacto en los logs (Vercel → Logs) y cambiar **una** variable por vez.
2. En pruebas, anotar en un lugar seguro (no en el repo) usuario, contraseña,
   User ID y **email** de cada cuenta de prueba.

### Anexo fase 3 — Un bug que dejó a todos "sin suscripción"

`suscripciones` tiene **dos** claves foráneas a `planes` (`plan_id` y
`plan_programado_id`). Al pedir `planes(...)` embebido, PostgREST no sabe cuál usar
y devuelve un error; el código lo trataba como "no tiene suscripción" y el control
de acceso restringía a todos. Arreglo: nombrar la relación
(`planes!suscripciones_plan_id_fkey(...)`) y **tirar error** si la consulta falla.
Regla general: en control de acceso, un error de lectura nunca puede convertirse
en silencio en "no tiene permiso" (ni en "tiene permiso"): tiene que verse.

## Fase 4 — Cobros fallidos, morosidad, pausa y cancelación

### Qué se hizo
- Cartel arriba del panel según el estado de la cuenta: cobro fallido (gracia),
  pago pendiente (restringido), programa pausado, pausada, cancelada, cortesía por
  vencer.
- Con la cuenta restringida no se pueden crear premios, editar ajustes ni diseño,
  ni ver estadísticas. Sumar sigue unos días más.
- Pasado ese plazo, el toque responde **"Este local pausó su programa de puntos"**
  y no suma. El canje **nunca** se bloquea.
- Facturación: pausar, reactivar, cancelar y cambiar la tarjeta; historial de
  cobros y novedades.

### Conceptos de pagos que aparecieron

**1. Dunning (gestión de morosidad).** Cuando un cobro falla no se corta el
servicio de golpe: MP reintenta hasta 4 veces en 10 días, y nosotros escalonamos.
Primero **gracia** (todo anda, con aviso), después **restringido** (el dueño pierde
comodidades pero sus clientes no se enteran), y recién al final se **pausa el
programa**. La mayoría de los cobros fallidos son tarjetas vencidas o sin fondos:
el objetivo es que el dueño lo arregle, no castigarlo.

**2. No castigar al cliente final, y nunca quitarle lo que ganó.** Los puntos ya
ganados son del cliente: el canje no se bloquea en ningún estado. Y el mensaje
que ve es neutro ("este local pausó su programa"): la deuda del local con Point no
es asunto del cliente.

**3. Cancelar al final del período.** Si el dueño cancela estando al día, ya pagó
el mes: conserva todo hasta `current_period_end`. Pero si cancela (o MP cancela)
estando **impago**, el acceso se corta ya: no se regala un período que no se pagó.
Esa regla está en la base (`aplicar_cambio_suscripcion`), no en la pantalla.

**4. Primero el proveedor, después nuestra base.** Para pausar o cancelar, primero
se cambia en MP (que es quien cobra) y sólo si sale bien se registra acá. Al revés,
podríamos mostrar "cancelada" mientras MP sigue cobrando. El webhook que llega
después repite el cambio y, por idempotencia, no hace nada nuevo.

**5. Una regla en dos lugares, con tests en los dos.** El panel calcula el acceso
en TypeScript, pero el toque es una sola llamada a Postgres por velocidad, así que
"¿puede sumar?" también vive en la base (`suma_habilitada_local`). Duplicar una
regla es un riesgo: lo mitigamos con un comentario en ambos lados y tests con los
mismos casos (gracia, restringido, sin sumar, pausada, cancelada).

**6. Cambiar la tarjeta no cobra.** Se manda un token nuevo al `preapproval` (PUT
`card_token_id`); si había una cuota impaga, MP la reintenta con la tarjeta nueva en
su próximo intento.

## Fase 5 — Cambio de plan

### Qué se hizo
- "Cambiar de plan" en Facturación, con un diálogo que explica cuándo se aplica y
  cuánto se va a cobrar antes de confirmar.
- Subir: inmediato. Bajar: al fin del período (`plan_programado_id`), con opción de
  anularlo ("Quedarme en Pro"). En prueba gratis: inmediato.
- Al pasar a un plan sin promos se apagan las promos y los regalos.

### Conceptos de pagos que aparecieron

**1. Prorrateo (y por qué no lo hacemos).** Prorratear es cobrar o devolver la
diferencia por los días que quedan del mes ("pasaste a Pro el día 20: te cobro 10
días de diferencia"). Es lo más justo, pero complica todo: cobros sueltos, notas de
crédito, explicaciones. Sin prorrateo la regla es simple y se explica en una línea:
el precio nuevo arranca en el próximo débito. Subir de inmediato regala unos días
de Pro (bueno para convertir); bajar al fin del período respeta lo que ya pagó.

**2. Upgrade inmediato, downgrade programado.** Es el patrón estándar del SaaS:
nadie se queja de recibir más antes, y bajar en el momento le sacaría algo que ya
pagó. Para programarlo guardamos `plan_programado_id` y lo aplicamos cuando llega
`current_period_end`.

**3. Aplicar algo "en una fecha" sin depender de un único disparador.** El cambio
programado se aplica desde tres lugares, todos idempotentes: el webhook del cobro
del mes (justo antes de extender el período), al leer la suscripción, y el cron
diario (fase 7). Si uno falla, otro lo hace; si los tres lo intentan, sólo el
primero cambia algo.

**4. En MP, cambiar de plan es cambiar el monto.** La suscripción en MP quedó
creada con el plan de MP del alta. Para cambiar lo que se cobra hacemos `PUT
/preapproval/{id}` con `auto_recurring.transaction_amount` (MP le avisa al pagador
por email). El plan "de verdad" (qué puede usar el comercio) es el de nuestra base.

**5. Lo que el plan nuevo no incluye se apaga, no se borra.** Si bajás a Básico,
las promos quedan guardadas pero inactivas (si no, `registrar_suma` las seguiría
aplicando: Básico con puntos dobles). Al volver a Pro se reactivan a mano. Los
premios de más no se borran: simplemente no se pueden crear nuevos.
