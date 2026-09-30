# Pruebas del motor de pagos

Todo se prueba en el **sandbox de Mercado Pago**, con usuarios de prueba. Nunca
con tarjetas ni cuentas reales. Este documento se completa fase por fase; la
fase 8 lo cierra con todos los casos y el checklist para producción.

## Usuarios de prueba

| Rol | Para qué | Usuario | Dónde están sus datos |
|---|---|---|---|
| Vendedor | Hace de **Point**: sus credenciales (app "Point Test") están en Vercel | La cuenta de prueba con la que creaste "Point Test" | Tus integraciones → Cuentas de prueba |
| Comprador | Hace del **comercio**: su email va en el formulario de tarjeta | _creala en Cuentas de prueba (perfil comprador)_ | Tus integraciones → Cuentas de prueba |

Las contraseñas y los tokens **no** van en el repo: viven en Vercel (variables de
entorno) y en tu panel de Mercado Pago.

### Cómo crearlos (una sola vez)
1. Entrá a https://www.mercadopago.com.ar/developers/panel/app con tu cuenta real
   y creá una aplicación llamada **Point** (producto: Suscripciones y Checkout Pro).
2. En la aplicación → **Cuentas de prueba** → creá una **Vendedor** y una
   **Comprador** (país Argentina). Anotá usuario y contraseña de cada una.
3. Cerrá sesión e iniciá sesión en el panel de desarrolladores **con la cuenta de
   prueba vendedora**. Creá ahí otra aplicación "Point (pruebas)" y copiá sus
   credenciales: esas son las credenciales de prueba que usa el servidor.
4. En esa aplicación → **Webhooks → Configurar notificación**: URL
   `https://fidelizacion-beta.vercel.app/api/webhooks/mercadopago`, eventos
   *Pagos*, *Planes y suscripciones*. Guardá y copiá la **clave secreta**.
5. En Vercel → proyecto fidelizacion → Settings → Environment Variables, cargá
   `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` y
   `CRON_SECRET` (un texto largo al azar).

## Fase 1 — Esquema y precios

- `npm test` (vitest): plata en centavos y límites de los planes.
- `./scripts/test-db.sh`: levanta un Postgres temporal, aplica todas las
  migraciones y corre los tests de base (RLS, constraints, idempotencia).
- Manual: abrí `/precios` → se ven Básico ($15.000) y Pro ($30.000) con sus
  límites, y el kit ($25.000), chip ($3.000) y envío ($5.000).
- Manual: `/admin` → crear un local → queda con su comercio en cortesía Pro.

## Fase 2 — Registro y alta con prueba gratis

**Antes de probar (una vez):**
- En Supabase → Authentication → URL Configuration, que `https://fidelizacion-beta.vercel.app/**`
  esté en *Redirect URLs* (el link de confirmación vuelve a `/auth/callback`).
- Supabase manda pocos emails por hora con su servidor por defecto: si no llega el de
  confirmación, esperá unos minutos o configurá un SMTP propio.
- Tené a mano el **email del usuario de prueba comprador** (Tus integraciones →
  Cuentas de prueba). MP exige que quien paga también sea de prueba.

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
1. Abrí `/precios` → "Probar 14 días gratis" en Pro.
2. Completá el registro con un email tuyo real (para recibir la confirmación).
3. Abrí el link del email **en el mismo navegador** → te lleva a `/panel/facturacion`.
   - Si lo abrís en otro navegador: te pide ingresar con la contraseña (el email ya
     quedó confirmado).
4. Pro ya viene elegido. En la tarjeta: número de prueba, titular `APRO`, y en el
   email del formulario **el del usuario de prueba comprador**.
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
