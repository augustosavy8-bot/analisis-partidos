# Pruebas del motor de pagos

Todo se prueba en el **sandbox de Mercado Pago**, con usuarios de prueba. Nunca
con tarjetas ni cuentas reales. Este documento se completa fase por fase; la
fase 8 lo cierra con todos los casos y el checklist para producción.

## Usuarios de prueba

| Rol | Para qué | Usuario | Dónde están sus datos |
|---|---|---|---|
| Vendedor | Hace de **Point**: sus credenciales van en `MP_ACCESS_TOKEN` / `NEXT_PUBLIC_MP_PUBLIC_KEY` | _pendiente_ | Tus integraciones → Point → Cuentas de prueba |
| Comprador | Hace del **comercio** que se suscribe y compra el kit | _pendiente_ | Tus integraciones → Point → Cuentas de prueba |

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
