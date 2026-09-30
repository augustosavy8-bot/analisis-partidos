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

Estado: pendiente de crear la aplicación "Point" en Tus integraciones (ver
TESTING.md).

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
