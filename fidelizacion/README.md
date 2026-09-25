# Sumá: fidelización con chip NFC

MVP de tarjeta de puntos para cafeterías, bares y comercios. El mozo apoya su
llavero NFC en el celular del cliente y se suma 1 punto. Next.js (App Router) +
TypeScript + Tailwind + Supabase. Deploy en Vercel.

> El proyecto está en la carpeta `fidelizacion/` del repo. En Vercel configurá
> **Root Directory = `fidelizacion`**.

## Estado por fases

- [x] **Fase 1**: setup, esquema SQL con migraciones, RLS y seed demo
- [x] **Fase 2**: flujo del cliente completo con chips en modo prueba
- [x] **QR de respaldo**: el mozo entra con PIN y muestra un QR que rota cada 30 s y sirve una sola vez
- [x] **Fase 3**: verificación SUN de NTAG 424 DNA (AN12196), con simulador de toques y guía de programación
- [x] **Panel del dueño**: métricas, clientes (búsqueda + CSV), movimientos, premios, mozos y ajustes
- [x] **Panel superadmin**: locales, dueños, chips (prueba y producción con clave cifrada) y estado general
- [x] **Promos y regalos**: puntos dobles/triples por día y horario, puntos de bienvenida y regalo de cumple
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
| Ajustes | Regla de puntos (horas entre puntos), nombre, rubro, colores y logo, con vista previa |

## Panel superadmin (`/admin`)

Sólo para usuarios en la tabla `superadmins` (para cualquier otro, `/admin` da 404).

- **Estado general**: totales, actividad por local y toques rechazados (tabla `rechazos`: chip desconocido, QR reusado o vencido, toque antes de tiempo…).
- **Nuevo local**: nombre, dirección `/t/…`, rubro, colores, regla y email del dueño. Si el dueño no tiene usuario se crea con una contraseña temporal que se muestra una sola vez (con botón para mandarla por WhatsApp).
- **Local**: activar/desactivar, dueños (agregar, quitar, generar contraseña nueva) y chips:
  - *Prueba (NTAG213)*: se genera un token y se muestra la URL para grabar en el tag (en la base sólo queda el hash).
  - *Producción (NTAG 424 DNA)*: UID + clave AES-128, que se guarda cifrada con AES-256-GCM usando `CHIPS_MASTER_KEY`.
- Dueños: “¿Olvidaste tu contraseña?” (link por email vía Supabase Auth → `/auth/callback` → `/panel/nueva-contrasena`) y “Cambiar mi contraseña”.

> ⚠️ `CHIPS_MASTER_KEY` no se puede perder ni cambiar sin volver a cargar las claves de todos los chips.

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
| `wallet_registros` | Preparada para Apple/Google Wallet (todavía sin uso) |

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
