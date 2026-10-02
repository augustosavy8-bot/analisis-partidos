# Pruebas del motor de pagos

Todo se prueba en el **sandbox de Mercado Pago**, con usuarios de prueba. Nunca
con tarjetas ni cuentas reales. Este documento se completa fase por fase; la
fase 8 lo cierra con todos los casos y el checklist para producción.

## Credenciales para probar

Usamos el formulario de tarjeta de MP (Card Payment Brick). Para pagos con
tarjeta desde un Brick, Mercado Pago pide **las credenciales de prueba de tu
cuenta real** (no las de una cuenta de prueba vendedora) y **cualquier email**
como pagador:

1. Mercado Pago Developers → Tus integraciones → **Point26** → **Credenciales de prueba**.
2. En Vercel → fidelizacion → Settings → Environment Variables, reemplazá:
   - `MP_ACCESS_TOKEN` → el *Access Token* de prueba de Point26.
   - `NEXT_PUBLIC_MP_PUBLIC_KEY` → la *Public Key* de prueba de Point26.
3. Redeploy (la Public Key se incrusta en el build).
4. Webhooks: Point26 → Webhooks → **modo prueba** → URL
   `https://fidelizacion-beta.vercel.app/api/webhooks/mercadopago`, eventos *Pagos* y
   *Planes y suscripciones*. La clave secreta nueva va en `MP_WEBHOOK_SECRET`.

En el formulario de pago:
- Email: **cualquiera que no sea el de tu cuenta de Mercado Pago ni el de un
  usuario de prueba** (por ejemplo, el de la cuenta de Point con la que entraste).
- Tarjeta de prueba y titular `APRO` (ver más abajo).

> Por qué: con las credenciales de una cuenta de prueba vendedora, MP exige que el
> pagador también sea un usuario de prueba, y el Brick no soporta ese modo para
> tarjetas (el alta falla con "User bad request" o "Both payer and collector must
> be real or test users"). Las cuentas de prueba (vendedor/comprador) sirven para
> Checkout Pro (fase 6), donde el comprador inicia sesión en MP.

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
- Vercel tiene que tener las **credenciales de prueba de Point26** (ver "Credenciales
  para probar"). El email del pagador puede ser cualquiera que no sea el de tu cuenta
  de Mercado Pago.

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
   "Email de tu cuenta de Mercado Pago" dejá el email de tu cuenta de Point (no uno de prueba).
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
