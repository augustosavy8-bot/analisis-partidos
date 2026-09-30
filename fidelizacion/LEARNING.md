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

## Fase 1 — Esquema, RLS, planes y productos, página de precios

### Qué se hizo
- Migración `20260930000021_facturacion.sql`: `comercios`, `planes`,
  `suscripciones`, `pagos_suscripcion`, `historial_suscripcion`, `productos`,
  `pedidos`, `pedido_items`, `pagos`, `eventos_pago`, `avisos_comercio`,
  `config_facturacion`.
- Cada local pertenece a un **comercio** (la cuenta que paga). Los locales que ya
  existían quedaron cada uno en su comercio, **en cortesía con plan Pro y sin fecha
  de fin**.
- Planes y productos cargados con los valores de prueba (editables desde /admin
  en la fase 7). Página pública `/precios` que los lee de la base.
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
su comercio, su suscripción y sus pedidos; cualquiera ve el catálogo de precios).
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
