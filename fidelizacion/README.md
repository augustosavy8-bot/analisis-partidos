# Point: fidelización con chip NFC

MVP de tarjeta de puntos para cafeterías, bares y comercios. El mozo apoya su
llavero NFC en el celular del cliente y se suma 1 punto. Next.js (App Router) +
TypeScript + Tailwind + Supabase. Deploy en Vercel.

> El proyecto está en la carpeta `fidelizacion/` del repo. En Vercel configurá
> **Root Directory = `fidelizacion`**.

## Marca

Point: naranja `#E6633A`, azul marino `#0F172A`, tipografía Poppins Bold. Los SVG están en
`public/marca/` y el componente `src/components/MarcaPoint.tsx` dibuja el isotipo y el logo.
Cada local usa su propia marca en la tarjeta; Point aparece sólo como plataforma.

## Estado por fases

- [x] **Fase 1**: setup, esquema SQL con migraciones, RLS y seed demo
- [x] **Fase 2**: flujo del cliente completo con chips en modo prueba
- [x] **QR de respaldo**: el mozo entra con PIN y muestra un QR que rota cada 30 s y sirve una sola vez
- [x] **Fase 3**: verificación SUN de NTAG 424 DNA (AN12196), con simulador de toques y guía de programación
- [x] **Panel del dueño**: métricas, clientes (búsqueda + CSV), movimientos, premios, mozos y ajustes
- [x] **Panel superadmin**: locales, dueños, chips (prueba y producción con clave cifrada) y estado general
- [x] **Promos y regalos**: puntos dobles/triples por día y horario, puntos de bienvenida y regalo de cumple
- [x] **Apple Wallet nativo (iPhone)**: pase storeCard con web service de actualización y push por APNs (ver abajo)
- [x] **Google Wallet nativo (Android)**: pase de lealtad que se actualiza solo con cada punto (ver abajo)
- [x] **Reactivar por WhatsApp**: listas de clientes (no vienen, les falta poco, premio sin usar, cumpleaños) con mensaje listo vía wa.me

## Puesta en marcha (local)

Requisitos: Node 20+ y Docker (para Supabase local).

```bash
cd fidelizacion
npm install
npm run db:start            # levanta Supabase local y aplica migraciones + seed
cp .env.example .env.local  # completá la URL y las keys que imprimió db:start
npm run dev
```

Abrí:
- http://localhost:3000/api/salud → `{"ok":true, ...conteos}`
- http://localhost:3000/demo → local demo, mozos, chips de prueba con sus URLs y premios

Crear usuarios del panel:

```bash
npm run usuario:crear -- --email yo@mail.com --password 'algo-seguro' --rol superadmin
npm run usuario:crear -- --email duenio@mail.com --password 'algo-seguro' --rol dueno --local cafe-aurora
```

### Con un proyecto de Supabase en la nube

```bash
npx supabase login
npx supabase link --project-ref <ref>
npm run db:push                                   # aplica migraciones
psql "<connection string>" -f supabase/seed.sql   # opcional: datos demo
```

## Flujo del cliente (Fase 2)

| Ruta | Qué hace |
|---|---|
| `/n?t=<token>` | El toque. Valida el chip; si el celular no tiene tarjeta guarda el toque firmado (cookie de 15 min) y manda a `/registro`; si tiene, suma 1 punto (o confirma un canje pendiente) |
| `/registro` | Nombre + WhatsApp + consentimiento obligatorio. Crea cliente, tarjeta y dispositivo, y aplica el toque |
| `/recuperar?l=<local>` | Vincula este celular a una tarjeta existente con el WhatsApp (sin OTP en el MVP; el hook está en `src/lib/verificacion`) |
| `/t/<local>` | La tarjeta: puntos, sellos, premios, canje, historial. Instalable como PWA (manifest e ícono por local) |
| `/mozo/<local>` | QR de respaldo: el mozo elige su nombre, pone su PIN (5 intentos fallidos = 15 min bloqueado) y muestra un QR firmado (HMAC) que rota cada 30 s. Al escanearlo se abre `/n?q=…`, se marca usado y la pantalla del mozo muestra ✓ y genera otro |
| `/privacidad` | Política de privacidad (texto base para revisar con un abogado) |
| `/demo` | Botones para simular toques y “olvidar este celular” (sólo con `PERMITIR_MODO_PRUEBA=true`) |

Reglas:
- El celular se identifica con una cookie httpOnly (`fid_disp`, 400 días); en la base sólo queda su SHA-256.
- La animación de “+1” sólo aparece si el movimiento es de esa tarjeta y de los últimos 5 minutos.
- El canje queda pendiente 15 minutos; el próximo toque de un mozo lo confirma en vez de sumar.
- En iPhone, la tarjeta instalada en inicio puede no compartir la cookie con Safari: si pasa, se recupera con el WhatsApp.

## Panel del dueño (`/panel`)

Ingreso con email y contraseña (Supabase Auth; el registro público está desactivado y los usuarios se crean con `npm run usuario:crear` o, más adelante, desde el panel superadmin). Todo pasa por RLS con la sesión del usuario: un dueño sólo ve sus locales.

| Sección | Qué tiene |
|---|---|
| Resumen | Clientes, visitas, % que vuelven, canjes (30 días), visitas por día (14 días) y ranking de mozos |
| Clientes | Búsqueda por nombre o WhatsApp, puntos, visitas, última visita; exportar CSV (Excel en español: `;` + BOM) |
| Movimientos | Últimos 150, filtros por tipo y por mozo, origen llavero/QR |
| Premios | Alta, edición, ocultar/mostrar y borrar (si ya se canjeó, se oculta para no perder historial) |
| Mozos | Alta con PIN, cambio de PIN, activar/desactivar, llaveros asignados |
| WhatsApp | Segmentos: no vienen hace N días, les falta poco para un premio, tienen premio sin usar, cumplen años. Mensaje editable con `{nombre}`, `{puntos}`, `{premio}`, `{faltan}`, `{local}`, `{link}`; cada botón abre `wa.me` con el texto listo y queda registrado (`contactos_whatsapp`). “No escribir más” marca la tarjeta con `no_contactar` |
| Promos | Puntos de bienvenida (primera visita), regalo de cumple (primera visita del día del cumple a 6 días después, una vez por año, si el cumple se cargó hace 30+ días) y promos x2/x3 por días y horario |
| Mensajes | “Enviar mensaje a clientes” (título + hasta 150 caracteres): notificación en Google Wallet (Add Message, `TEXT_AND_NOTIFY`) y Apple Wallet (campo Novedades + push). 1 por local cada 24 hs (`registrar_mensaje_local`, atómico); historial con a cuántas tarjetas llegó (`mensajes_local`) |
| Ajustes | Regla de puntos (horas entre puntos), nombre, rubro, colores y logo, con vista previa. Ubicación: se pega “lat, lng” de Google Maps; va a `merchantLocations` (Google) y `locations` (Apple) |

## Panel superadmin (`/admin`)

Sólo para usuarios en la tabla `superadmins` (para cualquier otro, `/admin` da 404).

- **Estado general**: totales, actividad por local y toques rechazados (tabla `rechazos`: chip desconocido, QR reusado o vencido, toque antes de tiempo…).
- **Nuevo local**: nombre, dirección `/t/…`, rubro, colores, regla y email del dueño. Si el dueño no tiene usuario se crea con una contraseña temporal que se muestra una sola vez (con botón para mandarla por WhatsApp).
- **Local**: activar/desactivar, dueños (agregar, quitar, generar contraseña nueva) y chips:
  - *Prueba (NTAG213)*: se genera un token y se muestra la URL para grabar en el tag (en la base sólo queda el hash).
  - *Producción (NTAG 424 DNA)*: UID + clave AES-128, que se guarda cifrada con AES-256-GCM usando `CHIPS_MASTER_KEY`.
- Dueños: “¿Olvidaste tu contraseña?” (link por email vía Supabase Auth → `/auth/callback` → `/panel/nueva-contrasena`) y “Cambiar mi contraseña”.

> ⚠️ `CHIPS_MASTER_KEY` no se puede perder ni cambiar sin volver a cargar las claves de todos los chips.

## Google Wallet (Android)

Pase de lealtad nativo; en iPhone sigue Pass2U hasta tener Apple Wallet. Todo el código está en
`src/lib/wallet/` (`google-core.ts` puro y testeado; `google.ts` el proveedor del servidor).

- **Clase por local** `{ISSUER_ID}.local_{slug}`: nombre, logo (o `/t/<local>/icono?s=660`),
  color principal, cabecera `/t/<local>/cabecera` y la lista de premios. Se crea o actualiza
  (con `after()`) al crear el local, guardar Ajustes y tocar Premios, y con `npm run wallet:google:sync`.
- **Objeto por tarjeta** `{ISSUER_ID}.{serial}`: puntos, progreso al próximo premio, nombre del
  cliente, franja con sellos y un QR con el link `/w/<serial>/<token>`.
- **Guardar**: en Android la pestaña Tarjeta muestra el botón oficial → `GET /t/<local>/google-wallet`
  hace upsert de la clase y del objeto por API (insert; si da 409, PATCH), registra el pedido en
  `wallet_registros` (plataforma `google`, por intención) y redirige a `pay.google.com/gp/v/save/<jwt>`
  con un JWT *skinny* (sólo el id del objeto, `origins` = `APP_URL`).
- **Actualización**: después de cada suma, canje o regalo, `notificarCambioTarjeta(serial)` corre en
  `after()` y hace PATCH del objeto (sólo si la tarjeta tiene registro `google`; un 404 se ignora).
  El token OAuth de la cuenta de servicio se cachea en memoria hasta 5 min antes de vencer.
- **Configuración**: `GOOGLE_WALLET_ISSUER_ID` y `GOOGLE_SERVICE_ACCOUNT_JSON` (el contenido del JSON;
  la cuenta de servicio tiene que tener acceso al issuer en la Google Pay & Wallet Console). Sin ellas,
  el botón no aparece y todo sigue como antes. `APP_URL` tiene que ser la URL pública https.
- **Modo demo**: mientras el issuer esté en modo demo, sólo pueden guardar el pase las cuentas de
  Google agregadas como usuarios de prueba en la consola.
- Botón oficial: `public/wallet/agregar-a-google-wallet.svg` (asset de Google es-419 "Agregar a la Billetera de Google", sin modificar).
- Pendiente: callbacks de Google (guardado/borrado confirmado) y Apple Wallet.

## Apple Wallet (iPhone)

Pase `storeCard` nativo, en paralelo a Google Wallet. Código en `src/lib/wallet/apple-core.ts`
(pass.json, firma con `passkit-generator`, APNs; testeado) y `src/lib/wallet/apple.ts` (proveedor).

- **Pase por tarjeta** (cliente + local): `serialNumber` = serial de la tarjeta, `authenticationToken`
  aleatorio de 48 caracteres guardado en `apple_passes`. `organizationName` y `logoText` = el local.
  Campos: puntos (primary), próximo premio y cuántos faltan (secondary), cliente (auxiliary), premios y
  link a la tarjeta web (back). QR con el mismo link `/w/<serial>/<token>` que Google.
  `locations` si el local cargó latitud/longitud en Ajustes.
- **Imágenes** generadas con ImageResponse (colores del local): `icon` 29/58/87, `logo` 160×50 @1-3x y
  `strip` 375×123 @1-3x (el arte de la cabecera, con el sello a la derecha).
- **Descarga**: `GET /t/<local>/apple-wallet` → `.pkpass` (`application/vnd.apple.pkpass`) de la tarjeta
  del celular logueado (cookie). En iPhone la pestaña Tarjeta muestra el badge oficial; en la compu, los dos.
- **Web service** (`webServiceURL` = `APP_URL/api/apple-wallet`), runtime Node:
  - `POST|DELETE /v1/devices/:device/registrations/:passTypeId/:serial` (201/200; `Authorization: ApplePass <token>`)
  - `GET /v1/devices/:device/registrations/:passTypeId?passesUpdatedSince=` (seriales + `lastUpdated`, 204 sin cambios)
  - `GET /v1/passes/:passTypeId/:serial` (pase con `Last-Modified`; 304 con `If-Modified-Since`)
  - `POST /v1/log`
- **Push**: `notificarCambioTarjeta` (suma, canje, regalo; en `after()`) y `notificarCambioLocal` (Ajustes,
  premios) actualizan `apple_passes.updated_at` y mandan `{}` por APNs (HTTP/2, certificado del pase,
  `apns-topic` = Pass Type ID). Un 410 borra el dispositivo.
- **Notificaciones**: puntos con `changeMessage` “Sumaste puntos: ahora tenés %@” (o “Canjeaste tu premio…”
  si el último movimiento fue un canje); dorso “Novedades” con el último mensaje del local y `changeMessage` `%@`;
  `relevantText` “Estás cerca de {local}. Tenés {puntos} puntos”. En Google, el PATCH de una suma lleva
  `notifyPreference: NOTIFY_ON_UPDATE` (Google limita a 3 avisos por pase cada 24 hs).
- **Tablas** (sólo service_role): `apple_passes`, `apple_devices`, `apple_registrations`.
- **Variables**: `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERT`, `APPLE_PASS_KEY` (sin contraseña),
  `APPLE_WWDR_CERT` (G4). Sin alguna, el botón no aparece.

## Tests

```bash
npm test          # unitarios (vitest)
npm run db:test   # Postgres temporal: migraciones + seed + tests de RLS y funciones
```

`db:test` necesita los binarios de Postgres (`initdb`, `pg_ctl`, `psql`).

## Modelo de datos

| Tabla | Para qué |
|---|---|
| `locales` | Branding (logo, colores) y regla de puntos (`minutos_entre_puntos`) |
| `superadmins`, `miembros_local` | Usuarios del panel (Supabase Auth) y a qué local pertenecen |
| `mozos` | Mozos del local, con `pin_hash` (scrypt) para el QR de respaldo |
| `chips` | UID, local, mozo, `clave_aes_cifrada`, `ultimo_contador`, `modo` prueba/producción |
| `clientes` | Nombre, WhatsApp (E.164), consentimiento obligatorio y fecha |
| `tarjetas` | Una por cliente y local: puntos y `serial` (para Wallet más adelante) |
| `premios` | Premios del local y puntos necesarios |
| `canjes` | Pedidos de canje, pendientes hasta que el mozo los valida (vencen a los 15 minutos) |
| `movimientos` | Registro de puntos: suma/canje/regalo, motivo (promo, bienvenida, cumple), mozo, chip, origen nfc/qr y hora |
| `promos` | Promos de puntos por días (0 = domingo) y horario, en la hora del local |
| `contactos_whatsapp` | Mensajes de WhatsApp que abrió el dueño desde el panel |
| `dispositivos` | Hash del token de la cookie httpOnly del cliente |
| `qr_usados` | Anti-replay del QR de respaldo (un solo uso) |
| `wallet_registros` | Quién pidió cada pase de billetera (hoy Google Wallet, por intención) |

### Seguridad

- **RLS en todas las tablas.** `anon` no tiene ningún permiso: los clientes
  finales no tienen cuenta y todo su flujo pasa por el servidor con `service_role`.
- **Dueños**: ven y editan sólo sus locales. No pueden leer claves de chips ni
  hashes de PIN (privilegios por columna) ni cambiar puntos a mano.
- **Operaciones de puntos atómicas** en Postgres (`registrar_suma`,
  `solicitar_canje`, `confirmar_canje`, `consumir_contador_chip`, `consumir_qr`).
  Sólo las puede ejecutar `service_role`. Bloquean la fila de la tarjeta para que
  dos toques simultáneos no se cuenten doble.
- **FKs compuestas** `(x_id, local_id)`: no se pueden mezclar mozo, tarjeta o
  premio de locales distintos.

### Chips y URLs

- Modo prueba (NTAG213): `https://<dominio>/n?t=<token>`. La base guarda sólo el
  SHA-256 del token. Se desactiva para toda la instalación con `PERMITIR_MODO_PRUEBA=false`.
- Producción (NTAG 424 DNA): `https://<dominio>/n?p=<PICCData>&m=<CMAC>` (SUN, NXP AN12196).
  1. `p` se descifra con AES-128-CBC y la clave SDMMetaRead **común** (`NFC_SDM_META_KEY`),
     porque antes de descifrar no se sabe qué chip es → UID + contador.
  2. Se busca el chip por UID y se descifra su clave SDMFileRead (guardada con `CHIPS_MASTER_KEY`).
  3. Clave de sesión = CMAC(clave, `3CC300010080` ‖ UID ‖ contador) y se compara el MAC truncado (bytes impares).
  4. El contador tiene que ser mayor al último aceptado (`consumir_contador_chip`, atómico): un toque copiado no sirve.
  - Tests con los vectores de RFC 4493 (AES-CMAC) y de AN12196 (`src/lib/sun.test.ts`).
  - En `/admin/locales/<local>` hay “Simular toque” (genera la URL que produciría el chip) y una guía para programarlo.

### Datos demo (seed)

Local **Café Aurora** (`/t/cafe-aurora`), con 1 punto cada 2 minutos para poder probar seguido.

| Mozo | PIN | URL del chip de prueba |
|---|---|---|
| Lucía | 1234 | `/n?t=V3T9H9CbnTQPmJVstgnPn1SV` |
| Martín | 5678 | `/n?t=j7BouD2PYHicm51uzVMZO8tH` |

Premios: Café gratis (8 puntos) y Café + medialuna (12 puntos).
Estos tokens y PINs son públicos: no uses el seed en producción.
