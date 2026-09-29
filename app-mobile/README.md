# Point — app para clientes (iOS)

App nativa de Point hecha con Expo (SDK 57, React Native + TypeScript, Expo Router).
Habla con la web (`../fidelizacion`) por la API `/api/app/v1`.

## Qué hace (v1)

- **Ingreso con WhatsApp**, igual que "Recuperá tu tarjeta" en la web: el servidor devuelve un token de
  dispositivo (el mismo mecanismo que la cookie de la web) que se guarda en el llavero de iOS (SecureStore).
  Límite de intentos por IP para frenar a quien pruebe números en masa.
- **Mis tarjetas**: los locales donde el cliente tiene tarjeta, con los colores de cada bar.
- **Detalle**: puntos, próximo premio, premios, QR e historial.
- **Agregar a Apple Wallet**: botón oficial de Apple (`PKAddPassButton`, vía `@premieroctet/react-native-wallet`).
  Baja el `.pkpass` de `/api/app/v1/tarjetas/<local>/apple-wallet` con el token y abre la hoja nativa.
- **Eliminar mi cuenta** (Ajustes): borra al cliente con todas sus tarjetas, puntos, historial y celulares.
- **El llavero abre la app** (enlaces universales): el chip abre `https://fidelizacion-beta.vercel.app/n?…` y, si la
  app está instalada, iOS abre la pantalla `src/app/n.tsx` en vez de Safari. La app manda los parámetros a
  `POST /api/app/v1/toque` (misma validación antifraude que `/n` en la web) y muestra la celebración con los
  colores del bar. Sin sesión, pide crear la tarjeta (`POST /api/app/v1/registro`) o entrar con el WhatsApp, con el
  toque firmado que quedó esperando (15 min, un solo uso). Sin la app, el llavero sigue abriendo la web igual.
  El dominio se declara en `app.json` (`ios.associatedDomains`) y la web sirve
  `/.well-known/apple-app-site-association` con el Team ID de Apple.

La tarjeta se crea siempre en el local, con el primer toque del llavero; la app entra a tarjetas que ya existen.

## API (en `fidelizacion/src/app/api/app/v1`)

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/sesion` `{ whatsapp }` | Devuelve `{ token, nombre }` (404 si no hay tarjetas con ese WhatsApp, 429 si hay muchos intentos) |
| DELETE | `/sesion` | Cierra la sesión (revoca el token) |
| GET | `/tarjetas` | Mis tarjetas |
| GET | `/tarjetas/<local>` | Detalle (incluye el QR en SVG) |
| GET | `/tarjetas/<local>/apple-wallet` | `.pkpass` |
| DELETE | `/cuenta` | Elimina la cuenta |
| POST | `/toque` `{ params }` o `{ toquePendiente }` | Aplica el toque del llavero (o devuelve el toque firmado para registrarse) |
| POST | `/registro` | Crea la tarjeta desde la app con el toque firmado; devuelve `{ token, nombre, resultado, tarjeta }` |

Todas (menos POST `/sesion`) usan `Authorization: Bearer <token>`. Los tipos están en
`src/api/tipos.ts` (copia de `fidelizacion/src/lib/app/contrato.ts`).

## Desarrollo

```bash
npm install
npm run typecheck
npm test
npx expo start            # con un development build (el botón de Wallet no anda en Expo Go)
```

El servidor se configura en `app.json` → `expo.extra.apiUrl`.

## Build y TestFlight (EAS)

Todo se hace en la nube de Expo: no hace falta Mac ni Xcode. Los logins (Expo y Apple) se hacen en la terminal
cuando EAS los pide; nunca se guardan credenciales en el repo.

```bash
cd app-mobile
npm install

# Una sola vez
npx eas-cli@latest login          # tu cuenta de Expo (expo.dev)
npx eas-cli@latest init           # crea el proyecto en EAS y guarda el projectId en app.json

# 1. Compilar para iOS en la nube (perfil production)
npx eas-cli@latest build --platform ios --profile production

# 2. Subir el último build a App Store Connect (TestFlight)
npx eas-cli@latest submit --platform ios --profile production --latest
```

En el primer `build`, EAS pide iniciar sesión con tu Apple ID (y el código de doble factor) y ofrece crear
el App ID `com.point.fidelizacion`, el certificado de distribución y el perfil de aprovisionamiento: aceptá todo.
En el primer `submit`, si la app todavía no existe en App Store Connect, EAS la crea (nombre "Point").

El número de build se incrementa solo (`autoIncrement` + `appVersionSource: remote`). Para una versión nueva
de la app, cambiá `expo.version` en `app.json`.

## Antes de mandar a revisión (App Store)

- En App Store Connect: URL de privacidad (`https://fidelizacion-beta.vercel.app/privacidad`) y las
  respuestas de "App Privacy" (se guardan nombre y WhatsApp, vinculados al usuario, para la función de la app).
- Datos de acceso para el revisor: un WhatsApp de prueba que tenga al menos una tarjeta.
