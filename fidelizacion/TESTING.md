# Pruebas del motor de pagos

Todo se prueba en el **sandbox de Mercado Pago**, con usuarios de prueba. Nunca
con tarjetas ni cuentas reales. Este documento se completa fase por fase; la
fase 8 lo cierra con todos los casos y el checklist para producción.

## Credenciales para probar

Lo que funcionó (verificado el 2/10/2026):

1. **Credenciales**: las **de prueba de la app Point26** (Tus integraciones → Point26 →
   Credenciales de prueba). Empiezan con `APP_USR-` y corresponden a una cuenta de
   prueba *vendedora* que MP crea sola. En Vercel: `MP_ACCESS_TOKEN` y
   `NEXT_PUBLIC_MP_PUBLIC_KEY` (redeploy después: la Public Key va en el build).
2. **Pagador**: una cuenta de prueba **compradora** creada en Point26 → Cuentas de
   prueba. En "Email de tu cuenta de Mercado Pago" va **su email exacto**, que el
   panel NO muestra: hay que entrar a mercadopago.com.ar con su usuario
   (`TESTUSER…`) y contraseña y mirarlo en el perfil. Tiene la forma
   `test_user_<número del usuario TESTUSER>@testuser.com`.
3. **Tarjeta**: una de prueba con titular `APRO` (ver abajo).

Errores típicos y qué significan:
| Error de MP | Causa |
|---|---|
| `Both payer and collector must be real or test users` | El email del pagador no es de una cuenta de prueba (o es de una real). |
| `User bad request` | El email no corresponde a ningún usuario de prueba, o es el tuyo (MP ignora lo que va después de `+` en Gmail). |

Webhooks: Point26 → Webhooks → **modo prueba** → URL
`https://fidelizacion-beta.vercel.app/api/webhooks/mercadopago`, eventos *Pagos* y
*Planes y suscripciones*. La clave secreta va en `MP_WEBHOOK_SECRET`.

Las contraseñas y los tokens **no** van en el repo: viven en Vercel y en tu panel
de Mercado Pago.

## Fase 1 — Esquema, planes y productos

- `npm test` (vitest): plata en centavos y límites de los planes.
- `./scripts/test-db.sh`: levanta un Postgres temporal, aplica todas las
  migraciones y corre los tests de base (RLS, constraints, idempotencia).
- Manual: `/precios` redirige a `/sumate` (los precios ya no son públicos).
- Manual: ya registrado, en `/panel/facturacion` se ven Básico ($15.000) y Pro
  ($30.000) con todo lo que incluye cada uno.
- Manual: `/admin` → crear un local → queda con su comercio en cortesía Pro.

## Fase 2 — Registro y alta con prueba gratis

**Antes de probar (una vez):**
- En Supabase → Authentication → URL Configuration, que `https://fidelizacion-beta.vercel.app/**`
  esté en *Redirect URLs* (el link de confirmación vuelve a `/auth/callback`).
- Supabase manda pocos emails por hora con su servidor por defecto: si no llega el de
  confirmación, esperá unos minutos o configurá un SMTP propio.
- Vercel tiene que tener las **credenciales de prueba de Point26** y tenés que saber
  el **email de la cuenta compradora de prueba** (ver "Credenciales para probar").

**Tarjetas de prueba de Argentina** (cualquier vencimiento futuro, CVV 123, DNI 12345678):
| Tarjeta | Número |
|---|---|
| Mastercard crédito | 5031 7557 3453 0604 |
| Visa crédito | 4509 9535 6623 3704 |
| Visa débito | 4002 7686 9439 5619 |

El **nombre del titular** decide el resultado: `APRO` aprobado, `OTHE` rechazado,
`FUND` fondos insuficientes, `CONT` pendiente.

### Paso 0: verificar que el mail de confirmación llega
Hacelo cada vez que cambies algo de emails (SMTP, plantilla, dominio).
1. Registrate en `/sumate` con un email **que no exista todavía** en Supabase. Con
   Gmail podés usar alias: `tunombre+prueba7@gmail.com` llega a tu misma casilla
   pero para Supabase es otro usuario.
2. En Supabase → Authentication → Users tiene que aparecer el usuario "Waiting for
   verification". Si no aparece, el registro falló antes (mirá el mensaje en pantalla).
3. En Resend → Emails (o Logs) tiene que figurar el envío como *Delivered*.
   - *Bounced*: el email no existe.
   - Nada en Resend: Supabase no está usando el SMTP propio; revisá SMTP Settings.
4. El mail llega en menos de un minuto, en castellano y con la marca Point, desde la
   dirección que configuraste como remitente (no desde `noreply@mail.app.supabase.io`).
   Si cae en spam, falta verificar el dominio (SPF/DKIM) en Resend.
5. El botón "Confirmar mi cuenta" te lleva a `/panel/facturacion` con la sesión abierta.

**Si no llega, en este orden:**
- ¿El email ya tenía cuenta? Supabase no manda nada y responde "OK" igual (para no
  revelar quién está registrado). En los logs de Auth aparece `user_repeated_signup`.
- Logs de Auth (Supabase → Logs → Auth): errores de SMTP o `rate limit exceeded`.
- Límite de envíos: Authentication → Rate Limits → *Rate limit for sending emails*.

**Destrabar una prueba sin mail:** en Supabase → Authentication → Users → el usuario →
"Confirm email" (o `update auth.users set email_confirmed_at = now() where email = '...'`).
Después ingresás con la contraseña en `/panel/ingresar`: el comercio y el local se
crean en ese primer ingreso, igual que si hubieras tocado el link.

### Caso: alta con prueba gratis (feliz)
1. Abrí la landing → "Empezar" (lleva a `/sumate`).
2. Completá el registro con un email tuyo real (para recibir la confirmación).
3. Abrí el link del email **en el mismo navegador** → te lleva a `/panel/facturacion`.
   - Si lo abrís en otro navegador: te pide ingresar con la contraseña (el email ya
     quedó confirmado).
4. Elegí Pro (viene marcado por defecto). En la tarjeta: número de prueba y titular `APRO`. En
   "Email de tu cuenta de Mercado Pago" poné el email de la cuenta compradora de prueba.
5. "Empezar prueba gratis" → te lleva al panel del local.
6. Volvé a `/panel/facturacion`: "Plan Pro · prueba gratis. Tu prueba termina el …".
7. En Supabase: `suscripciones` tiene una fila `trialing` con `mp_preapproval_id`;
   `historial_suscripcion` y `avisos_comercio` tienen su registro.
8. En Mercado Pago (cuenta vendedora de prueba) → Suscripciones: aparece la nueva.

### Caso: tarjeta rechazada
- Igual que arriba, pero titular `OTHE` → mensaje "La tarjeta fue rechazada…", el
  formulario se vuelve a cargar vacío y no queda nada en `suscripciones`.

### Caso: doble clic / dos pestañas
- Abrí `/panel/facturacion` en dos pestañas y enviá las dos casi a la vez: una activa
  la cuenta y la otra dice "ya está activa o se está activando". En MP hay UNA sola.

### Caso: registro repetido
- Recargar `/panel/facturacion` varias veces después de confirmar no crea más
  comercios ni locales (hay uno solo, con la dirección `/t/nombre-del-local`).

## Fase 3 — Webhooks y control de acceso

### Configuración (una vez)
En Mercado Pago → Tus integraciones → "Point Test" → Webhooks → modo **prueba**:
- URL: `https://fidelizacion-beta.vercel.app/api/webhooks/mercadopago`
- Eventos: **Planes y suscripciones** (los tres) y **Pagos**.
- La clave secreta que muestra MP es `MP_WEBHOOK_SECRET` en Vercel (ya cargada).

### Caso: simular una notificación desde MP
1. En la pantalla de Webhooks → "Simular notificación", tipo *Planes y suscripciones*.
2. MP muestra la respuesta: tiene que ser **200** (el id de prueba no existe → se
   ignora) o 500 si algo falló nuestro.
3. En Supabase: `select * from eventos_pago order by id desc limit 5;` → una fila con
   `firma_valida = true`.

### Caso: firma inválida
- Un POST a mano sin firma (por ejemplo con curl, desde tu compu):
  `curl -X POST "https://fidelizacion-beta.vercel.app/api/webhooks/mercadopago?data.id=1&type=payment"`
  → **401**, y en `eventos_pago` queda la fila con `firma_valida = false` y sin procesar.

### Caso: el alta se confirma por webhook
1. Hacé el alta de la fase 2 (titular `APRO`).
2. A los segundos, `eventos_pago` tiene eventos `subscription_preapproval` con
   `procesado_en` lleno y `error` vacío.
3. La suscripción sigue en `trialing` (MP la tiene "authorized"; mientras dure la
   prueba, para nosotros es prueba).

### Caso: webhook duplicado
- En `eventos_pago` copiá un evento y pedile a MP que lo reenvíe (o simulá dos
  veces): `historial_suscripcion` y `avisos_comercio` no suman filas nuevas.

### Caso: huérfano
- (Sólo si querés forzarlo) borrá la fila de `suscripciones` recién creada en una
  base de prueba y reenviá la notificación: la suscripción vuelve a aparecer,
  reconstruida con `external_reference`.

### Caso: límites del plan Básico
1. Con un comercio en Básico, creá 3 premios: el 4.º no se puede (aviso "Pasar a Pro").
2. Promos y Mensajes muestran el aviso en lugar del formulario.
3. Resumen: se ven Clientes, Visitas y Canjes; "Vuelven", el gráfico y el ranking
   aparecen como "del plan Pro".
4. FairPlay y Café Aurora (cortesía Pro) ven todo como siempre.

## Fase 4 — Cobros fallidos, morosidad, pausa y cancelación

Las fechas se calculan desde `past_due_desde`, así que para probar los niveles sin
esperar días se puede "viajar en el tiempo" en Supabase (SQL Editor), sólo con
comercios de prueba (Point Prueba):

```sql
-- Simular cobro fallido hace N días
update suscripciones set estado = 'past_due', past_due_desde = now() - interval '3 days'
 where comercio_id = (select id from comercios where nombre = 'Point Prueba') and estado <> 'cancelled';
```

| Días desde el cobro fallido | Qué tenés que ver |
|---|---|
| 3 (gracia) | Cartel amarillo "No pudimos cobrar…" arriba del panel. Todo funciona. |
| 12 (restringido) | Cartel rojo "pago pendiente". No se pueden crear premios, ni editar ajustes/diseño, ni ver estadísticas. El toque **suma**. |
| 20 (sin sumar) | Cartel rojo "programa pausado". El toque muestra **"Este local pausó su programa de puntos"** y no suma. El **canje sigue andando**. |

Para volver: `update suscripciones set estado = 'trialing', past_due_desde = null where …`.

### Caso: canje con el programa pausado
1. Con el comercio en "sin sumar" (20 días), tocá el llavero en un cliente con puntos.
2. Ve "Este local pausó su programa de puntos" (no suma).
3. En su tarjeta, "Canjear" un premio → se canjea normalmente (el toque quedó registrado).

### Caso: pausar y reactivar (Facturación)
1. `/panel/facturacion` → **Pausar** → confirmar. Mensaje "Pausaste tu suscripción".
2. En MP (cuenta vendedora de prueba → Suscripciones) figura pausada.
3. Hasta el fin del período todo funciona; después, cartel "Tu suscripción está pausada".
4. **Reactivar** → vuelve a prueba gratis (si no terminó) o activa.

### Caso: cancelar
1. **Cancelar suscripción** → confirmar. Estado "cancelado · todo sigue funcionando hasta el …".
2. En MP figura cancelada (no se cobra más).
3. "Volver a activar" muestra de nuevo el formulario de alta.
4. Si se cancela estando impaga, el acceso se corta en el momento (no conserva un período que no pagó).

### Caso: cambiar la tarjeta
1. **Cambiar la tarjeta** → cargar otra tarjeta de prueba → "Usar esta tarjeta".
2. Mensaje "Listo, actualizamos tu tarjeta" (si estaba impaga: "MP va a reintentar…").
3. `historial_suscripcion` tiene "Cambio de tarjeta".

## Fase 5 — Cambio de plan

Reglas: **subir** (Básico → Pro) es inmediato; **bajar** (Pro → Básico) se aplica al
fin del período pago; **en prueba gratis**, inmediato en los dos sentidos. Sin
prorrateo: el precio nuevo se cobra desde el próximo débito. Con pago pendiente o
pausada no se puede cambiar.

### Caso: bajar en prueba gratis (Point Prueba)
1. `/panel/facturacion` → "Cambiar de plan" → **Pasar a Básico** → el diálogo dice
   "El cambio es inmediato" y avisa que se apagan promos y regalos.
2. Confirmar → "¡Listo! Ya estás en el plan Básico". El estado dice "Plan Básico".
3. En MP (cuenta vendedora de prueba → Suscripciones): el monto pasó a $15.000.
4. En el panel: Promos y Mensajes muestran "Pasar a Pro"; el resumen, sólo estadísticas básicas.
5. `promos` del local quedaron con `activa = false` y `locales.puntos_bienvenida = 0`.

### Caso: subir
1. **Pasar a Pro** → inmediato; Promos y Mensajes vuelven a estar disponibles
   (las promos apagadas quedan apagadas: se reactivan a mano).
2. En MP el monto vuelve a $30.000.

### Caso: bajar con la suscripción activa (ya cobrada)
Simulá que terminó la prueba: `update suscripciones set estado = 'authorized' where …`.
1. **Pasar a Básico** → el diálogo dice "Seguís con Pro hasta el …".
2. Aparece el cartel "El … pasás al plan Básico" con **Quedarme en Pro** (lo anula).
3. Para ver el cambio aplicado sin esperar: `update suscripciones set current_period_end = now() - interval '1 minute' where …`
   y recargá Facturación → "Plan Básico" (se aplica solo al leer; también lo aplica el
   webhook del cobro del mes).

## Fase 6 — Kit NFC (Checkout Pro)

Precios y stock iniciales: kit (10 chips) $25.000, chip suelto $3.000, envío $5.000,
retiro gratis. Stock: 5 kits y 50 chips. Reserva: 30 minutos.

**Para pagar en Checkout Pro con credenciales de prueba hay que entrar a Mercado
Pago con la cuenta compradora de prueba** (`TESTUSER…`): abrí una ventana de
incógnito, iniciá sesión en mercadopago.com.ar con esa cuenta y recién ahí hacé el
pedido en Point (en la misma ventana). Pagá con tarjeta de prueba y titular `APRO`.

### Caso: compra feliz (envío)
1. Panel → "Comprar chips" (menú "Más" en el celu, o Facturación → Chips NFC).
2. 1 kit + 2 chips, envío, completá la dirección → total $36.000 → "Pagar con Mercado Pago".
3. En Supabase: `pedidos` tiene el pedido `pendiente_pago` con `reserva_hasta`;
   `productos.stock` bajó (kit 4, chip 48).
4. Pagá en MP (titular `APRO`) → volvés a "¡Gracias por tu compra!" con estado **Pagado**.
5. `pagos` tiene el pago `approved`; `avisos_comercio`, "Recibimos el pago de tu pedido".

### Caso: pago rechazado
- Igual, con titular `OTHE` → "El pago no se aprobó". El pedido sigue
  `pendiente_pago` (el stock sigue reservado hasta que venza o armes otro).

### Caso: no paga a tiempo
- Armá el pedido y no pagues. Pasados 30 minutos (o forzándolo:
  `update pedidos set reserva_hasta = now() - interval '1 minute' where numero = …`),
  al entrar a "Comprar chips" el pedido figura "Venció sin pagar" y el stock volvió.
- El link de pago de MP también vence a los 30 minutos (`expiration_date_to`).

### Caso: armar otro pedido
- Con un pedido impago, armá otro: el anterior queda "cancelado" y su stock vuelve
  (no se puede acaparar stock con pedidos sin pagar).

### Caso: sin stock
- `update productos set stock = 0 where codigo = 'kit_inicial'` → el kit figura
  "Agotado"; pedirlo igual (forzando el form) devuelve "está agotado por ahora".

### Caso: la vuelta sin webhook
- Aunque el webhook no llegue, al volver de MP la página consulta el pago a MP
  con el `payment_id` y lo registra. Abrir esa URL a mano con otro `payment_id`
  no marca nada (se verifica que el pago sea de ESE pedido).

## Fase 7 — Panel del superadmin y conciliación diaria

Todo en `/admin/facturacion` (sólo superadmin; para cualquier otro es 404).

### Resumen
- Métricas: ingreso mensual (MRR: activas + impagas), lo que entra cuando terminen
  las pruebas, cobrado en 30 días (cuotas + kits, neto de reembolsos), cantidades por
  estado, pedidos para despachar y eventos sin procesar.
- Lista de comercios con su estado → detalle.
- "Consultar un pago en MP" por número de operación (soporte: "pagué y no se ve").

### Detalle de un comercio
- **Sincronizar con MP**: vuelve a consultar la suscripción y aplica lo que diga.
- **Cortesía**: elegir plan y fecha de fin (vacía = sin fin). Si tiene suscripción
  paga vigente, no deja (hay que cancelarla primero). Probalo con un comercio sin
  suscripción → aparece "Point te regaló el plan sin cargo" en sus novedades.
- **Mensajes por local**: horas entre mensajes (0 = sin límite).
- Cuotas, historial y pedidos.

### Pedidos
- Por defecto, los pagados que falta entregar. Botones según el estado:
  Preparando → Marcar enviado / Listo para retirar → Entregado. Cada paso avisa al
  comercio (novedades).
- **Reembolsar**: devuelve el total en MP y marca el pedido. Si no se despachó, el
  stock vuelve. En MP (cuenta vendedora de prueba) el pago figura devuelto.

### Eventos de pago
- Log crudo de webhooks. Filtro "problemas" (sin procesar o con error).
  **Reprocesar** es seguro (todo es idempotente).

### Planes y productos
- Editar precio, prueba, límites y si se ofrece. Cambiar el precio o la prueba crea
  un plan nuevo en MP en la próxima alta; **los suscriptos actuales no cambian**.
- Productos: precio, stock disponible, máximo por pedido, activo.
- Configuración: envío, minutos de reserva, días de gracia y de sumar, dirección de retiro.

### Conciliación diaria (cron)
- Corre todos los días a las 6:00 (Argentina). También: botón "Conciliar con MP ahora".
- Libera reservas vencidas, aplica bajadas de plan programadas, re-consulta las
  suscripciones vivas, busca en MP pagos de pedidos impagos y reprocesa webhooks fallidos.
- Sin la clave: `curl https://fidelizacion-beta.vercel.app/api/cron/diario` → **401**.
- En Vercel → proyecto → Settings → Cron Jobs figura `/api/cron/diario`.

### Volver a suscribirse sin repetir la prueba
- Con un comercio que canceló: "Volver a activar" ya no muestra "14 días de prueba
  gratis" y el botón dice "Suscribirme". La suscripción nueva arranca cobrando.
