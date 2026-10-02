# Pasar a cobrar de verdad — checklist

Hoy Point cobra en **modo prueba** (credenciales de prueba de la app Point26: nadie
paga plata real). Esta lista es lo que hay que hacer, en orden, para cobrar de
verdad. En `/admin/facturacion` el cartel de arriba dice en qué modo está.

> Regla de oro: las credenciales **de producción** nunca se pegan en un chat, un
> mail ni el repo. Se cargan directo en Vercel.

---

## 1. Antes de tocar nada

- [x] **Planes**: Básico $25.000 (austero a propósito), Pro $40.000 (recomendado),
      Max $80.000 (todo, locales ilimitados). Se editan en `/admin/facturacion/catalogo`.
- [ ] **Dirección de retiro** real (hoy dice "a confirmar") y precios del kit/chip/envío.
- [ ] **Facturación (AFIP)**: Point tiene que emitir factura por cada cobro
      (suscripción y kit). El sistema no factura solo (quedó fuera de alcance):
      definí cómo lo vas a hacer (manual desde AFIP o un servicio tipo Facturante /
      TusFacturas) y con qué condición fiscal (monotributo / responsable inscripto).
      Los datos fiscales que cargan los comercios al registrarse están en
      `comercios` (razón social, CUIT, condición fiscal).
- [x] **Textos legales**: `/terminos` (suscripción, prueba, renovación, baja online,
      cambio de plan, morosidad, kit, arrepentimiento) y `/privacidad`, enlazados en el
      pie de la web, en el registro, en el alta y en la compra del kit.
- [x] **Botón de arrepentimiento** (Res. 424/2020): `/arrepentimiento`, visible en el
      pie de la página de inicio, sin login, da un código de trámite al instante. Las
      solicitudes aparecen en rojo en `/admin/facturacion` hasta marcarlas resueltas.
- [ ] **Revisar los textos legales con un abogado** (son una base razonable, no
      asesoramiento legal) y completar el contacto (razón social, CUIT y domicilio de
      Point, que la ley de defensa del consumidor pide mostrar).
- [ ] **Emails (SMTP propio)**: configurá Resend en Supabase (ver LEARNING.md, anexo
      fase 2). Con el SMTP de prueba de Supabase los mails de confirmación de cuenta
      llegan tarde o no llegan, y un comercio real no puede registrarse.
- [ ] **Dominio propio** (opcional pero recomendado, p. ej. `point.com.ar`): si lo
      cambiás, actualizá `APP_URL` en Vercel, las *Redirect URLs* de Supabase Auth y
      la URL del webhook en MP.

## 2. Mercado Pago: credenciales de producción

- [ ] Mercado Pago Developers → Tus integraciones → **Point26** → **Credenciales de
      producción**. Si pide activarlas: completá los datos del negocio (rubro, sitio
      web) y aceptá los términos.
- [ ] En **Vercel → fidelizacion → Settings → Environment Variables** reemplazá
      (Production):
  - `MP_ACCESS_TOKEN` → Access Token **de producción**.
  - `NEXT_PUBLIC_MP_PUBLIC_KEY` → Public Key **de producción**.
- [ ] **Webhooks**: Point26 → Webhooks → **modo productivo**: misma URL
      (`https://<dominio>/api/webhooks/mercadopago`), eventos *Pagos* y *Planes y
      suscripciones*. Si MP muestra una clave secreta distinta para producción,
      cargala en `MP_WEBHOOK_SECRET`.
- [ ] **Redeploy** (la Public Key va en el build).

## 3. Limpiar los datos de prueba

Correr en Supabase → SQL Editor, **revisando cada resultado antes del siguiente**:

```sql
-- 1. Los planes de MP guardados son de la cuenta de prueba: se recrean solos en la
--    cuenta real con la próxima alta (igual conviene limpiarlos).
update planes set mp_preapproval_plan_id = null;

-- 2. Ver qué suscripciones/pedidos son de prueba (las de Point Prueba y cualquier otra con MP).
select c.nombre, s.estado, s.mp_preapproval_id from suscripciones s join comercios c on c.id = s.comercio_id
 where s.mp_preapproval_id is not null;
select numero, estado, total_centavos from pedidos;
```

- [ ] Borrar el comercio **Point Prueba** desde Supabase (o dejarlo, pero su
      suscripción apunta a la cuenta de prueba: la conciliación la va a marcar como
      inexistente). Lo más limpio: cancelar su suscripción en la base
      (`update suscripciones set estado = 'cancelled' where mp_preapproval_id = '…'`).
- [ ] Restablecer el **stock** real del kit y los chips en el catálogo.
- [ ] Opcional: vaciar `eventos_pago` de las pruebas (`delete from eventos_pago;`).

## 4. Primer cobro real, controlado

- [ ] Con **otra** cuenta de MP (un familiar; no podés pagarte a vos mismo) y una
      tarjeta real: registrá un comercio de prueba en `/sumate` y suscribilo al
      Básico. Como tiene prueba gratis, hoy no se cobra (MP puede hacer una
      validación mínima que devuelve al instante).
- [ ] Verificá en `/admin/facturacion`: aparece "En prueba", el cartel dice
      **"Modo real"**, y en MP (cuenta real → Suscripciones) está la suscripción.
- [ ] Cancelala desde Facturación → en MP figura cancelada.
- [ ] Kit: comprá 1 chip con retiro y pagalo con tarjeta real → "Pagado" → en
      `/admin/facturacion/pedidos` **Reembolsar** → verificá la devolución en MP.
- [ ] Mirá `/admin/facturacion/eventos`: los webhooks llegan con firma válida.

## 5. Sin cortesías: todo se cobra

- [x] Los locales que crea el superadmin ya **no** arrancan en cortesía: el dueño
      activa su suscripción (con prueba gratis) y hasta entonces el local no suma.
- [ ] FairPlay, BAR EJEMPLO y 1365 SOCIAL HOUSE siguen en cortesía Pro sin fin.
      Ponerles fecha de fin (detalle del comercio → Cortesía → fecha): 15 días antes
      ven "Tu cortesía está por terminar" y al vencer tienen que suscribirse.

## 6. Seguridad (revisión hecha el 2/10/2026)

- [x] Todas las tablas de pagos con RLS; las escrituras sólo desde el servidor
      (service role) y funciones `security definer` sin permiso para `authenticated`.
- [x] Webhook con firma HMAC y verificación contra la API; cron con `CRON_SECRET`.
- [ ] **Activar "Leaked password protection"** en Supabase → Authentication →
      Policies (avisa si la contraseña está filtrada; aviso del linter de Supabase).
- [ ] Las credenciales de **prueba** que pasaron por el chat no importan; si alguna
      vez pegaste una de producción en otro lado, regenerala en MP.
- Avisos del linter que son a propósito (no tocar): tablas con RLS y sin políticas
  (`eventos_pago`, `apple_*`, etc.: sólo el servidor las usa) y funciones del panel
  ejecutables por usuarios logueados (validan permisos adentro).

## 7. Las primeras semanas

- [ ] Mirar `/admin/facturacion` todos los días: pagos pendientes, eventos sin
      procesar, pedidos para despachar.
- [ ] Vercel → Settings → **Cron Jobs**: `/api/cron/diario` corriendo (6:00 AR).
- [ ] Los logs de Vercel duran poco en el plan gratis: lo importante queda igual en
      la base (`eventos_pago`, `historial_suscripcion`, `avisos_comercio`).

## Volver atrás

Si algo sale mal: volvé a poner las credenciales **de prueba** en Vercel y
redeploy. Las suscripciones reales siguen en MP (cobra MP, no Point); se
re-sincronizan al volver a las credenciales reales (botón "Sincronizar con MP" o
la conciliación diaria).
