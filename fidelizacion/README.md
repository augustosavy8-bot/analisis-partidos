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
- [ ] Fase 3: verificación SUN (NTAG 424 DNA, AN12196)
- [ ] Siguientes: panel del dueño, panel superadmin

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
| `movimientos` | Registro de puntos: suma/canje, mozo, chip, origen nfc/qr y hora |
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
- Producción (NTAG 424 DNA, fase 3): SUN con PICCData cifrado + CMAC en la misma
  ruta `/n`. La clave para descifrar PICCData (SDMMetaRead) va a ser una sola por
  instalación, porque antes de descifrar no se sabe qué chip es. La clave del CMAC
  (SDMFileRead) es por chip y se guarda cifrada con `CHIPS_MASTER_KEY`.

### Datos demo (seed)

Local **Café Aurora** (`/t/cafe-aurora`), con 1 punto cada 2 minutos para poder probar seguido.

| Mozo | PIN | URL del chip de prueba |
|---|---|---|
| Lucía | 1234 | `/n?t=V3T9H9CbnTQPmJVstgnPn1SV` |
| Martín | 5678 | `/n?t=j7BouD2PYHicm51uzVMZO8tH` |

Premios: Café gratis (8 puntos) y Café + medialuna (12 puntos).
Estos tokens y PINs son públicos: no uses el seed en producción.
