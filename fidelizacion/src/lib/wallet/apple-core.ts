/**
 * Apple Wallet (storeCard): pass.json, firma del .pkpass con passkit-generator,
 * helpers del web service (PassKit Web Service v1) y push por APNs (HTTP/2).
 * Sin "server-only" para poder testearlo. Nunca loguea certificados ni tokens.
 */
import { connect, type ClientHttp2Session } from "node:http2";
import { timingSafeEqual } from "node:crypto";
import { PKPass } from "passkit-generator";

export type CredencialesApple = {
  passTypeId: string;
  teamId: string;
  /** PEM del certificado del Pass Type ID. */
  cert: string;
  /** PEM de la clave privada (sin contraseña). */
  key: string;
  /** PEM del Apple WWDR G4. */
  wwdr: string;
};

/** En Vercel los PEM suelen quedar con "\n" literales: los normalizamos. */
export function normalizarPem(v: string) {
  return v.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim() + "\n";
}

/** Valida las variables de Apple. Lanza con un mensaje que NO incluye los valores. */
export function leerCredencialesApple(v: {
  passTypeId?: string;
  teamId?: string;
  cert?: string;
  key?: string;
  wwdr?: string;
}): CredencialesApple {
  const passTypeId = v.passTypeId?.trim() ?? "";
  const teamId = v.teamId?.trim() ?? "";
  if (!/^pass\.[A-Za-z0-9.-]+$/.test(passTypeId)) throw new Error("APPLE_PASS_TYPE_ID debe empezar con pass.");
  if (!/^[A-Z0-9]{10}$/.test(teamId)) throw new Error("APPLE_TEAM_ID debe tener 10 caracteres (A-Z, 0-9)");
  const pem = (nombre: string, valor: string | undefined, tipo: RegExp) => {
    const n = normalizarPem(valor ?? "");
    if (!tipo.test(n)) throw new Error(`${nombre} no parece un PEM válido`);
    return n;
  };
  return {
    passTypeId,
    teamId,
    cert: pem("APPLE_PASS_CERT", v.cert, /-----BEGIN CERTIFICATE-----/),
    key: pem("APPLE_PASS_KEY", v.key, /-----BEGIN (RSA |EC |ENCRYPTED )?PRIVATE KEY-----/),
    wwdr: pem("APPLE_WWDR_CERT", v.wwdr, /-----BEGIN CERTIFICATE-----/),
  };
}

// --- Colores ------------------------------------------------------------------

function rgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
const cssRgb = (hex: string) => `rgb(${rgb(hex).join(", ")})`;

function luminancia(hex: string) {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Fondo = color principal; texto blanco o casi negro; etiquetas en el acento si se leen. */
export function coloresPase(primario: string, secundario: string) {
  const texto = contraste(primario, "#ffffff") >= contraste(primario, "#111311") ? "#ffffff" : "#111311";
  const etiqueta = contraste(primario, secundario) >= 3 ? secundario : texto;
  return { backgroundColor: cssRgb(primario), foregroundColor: cssRgb(texto), labelColor: cssRgb(etiqueta) };
}

// --- pass.json ----------------------------------------------------------------

export type DatosPaseApple = {
  serial: string;
  authToken: string;
  puntos: number;
  clienteNombre: string;
  /** El mismo link del QR de Google: /w/<serial>/<wallet_auth_token>. */
  urlPase: string;
  urlTarjeta: string;
  local: {
    nombre: string;
    colorPrimario: string;
    colorSecundario: string;
    premios: { nombre: string; puntos: number }[];
    latitud: number | null;
    longitud: number | null;
  };
};

export function proximoPremioApple(puntos: number, premios: DatosPaseApple["local"]["premios"]) {
  if (!premios.length) return null;
  return premios.find((p) => p.puntos > puntos) ?? premios[premios.length - 1];
}

export function armarPassJson(cred: Pick<CredencialesApple, "passTypeId" | "teamId">, d: DatosPaseApple, appUrl: string) {
  const base = appUrl.replace(/\/$/, "");
  const { local } = d;
  const proximo = proximoPremioApple(d.puntos, local.premios);
  const faltan = proximo ? Math.max(0, proximo.puntos - d.puntos) : 0;
  const premios = local.premios.length
    ? local.premios.map((p) => `• ${p.nombre}: ${p.puntos} ${p.puntos === 1 ? "punto" : "puntos"}`).join("\n")
    : "Todavía no hay premios cargados. Igual sumás en cada visita.";

  return {
    formatVersion: 1,
    passTypeIdentifier: cred.passTypeId,
    teamIdentifier: cred.teamId,
    serialNumber: d.serial,
    authenticationToken: d.authToken,
    webServiceURL: `${base}/api/apple-wallet`,
    organizationName: local.nombre,
    description: `Tarjeta de puntos de ${local.nombre}`,
    logoText: local.nombre,
    sharingProhibited: true,
    ...coloresPase(local.colorPrimario, local.colorSecundario),
    storeCard: {
      primaryFields: [
        {
          key: "puntos",
          label: "PUNTOS",
          value: d.puntos,
          changeMessage: "Ahora tenés %@ puntos",
        },
      ],
      secondaryFields: proximo
        ? [
            { key: "proximo", label: "PRÓXIMO PREMIO", value: proximo.nombre },
            faltan > 0
              ? { key: "faltan", label: "TE FALTAN", value: faltan, textAlignment: "PKTextAlignmentRight" }
              : { key: "faltan", label: "ESTADO", value: "¡Listo para canjear!", textAlignment: "PKTextAlignmentRight" },
          ]
        : [{ key: "proximo", label: "PREMIOS", value: "Próximamente" }],
      auxiliaryFields: [{ key: "cliente", label: "CLIENTE", value: d.clienteNombre }],
      backFields: [
        { key: "premios", label: "Premios", value: premios },
        {
          key: "tarjeta",
          label: "Tu tarjeta",
          value: d.urlTarjeta,
          attributedValue: `<a href="${d.urlTarjeta}">Abrir mi tarjeta completa</a>`,
        },
        { key: "como", label: "Cómo sumar", value: "Pedile a quien te atiende que apoye su llavero en tu celular." },
        { key: "point", label: "", value: "Tarjeta de puntos con Point" },
      ],
    },
    barcodes: [{ format: "PKBarcodeFormatQR", message: d.urlPase, messageEncoding: "iso-8859-1" }],
    ...(local.latitud != null && local.longitud != null
      ? {
          locations: [
            {
              latitude: local.latitud,
              longitude: local.longitud,
              relevantText: `Estás cerca de ${local.nombre}: sumá con tu tarjeta`,
            },
          ],
        }
      : {}),
  };
}

// --- .pkpass ------------------------------------------------------------------

/** Nombre de archivo del pase → PNG. Obligatorio: icon.png (y conviene @2x/@3x). */
export type ImagenesPase = Record<string, Buffer>;

/** Arma y firma el .pkpass (PKCS#7 detached con el WWDR). */
export function firmarPkpass(cred: CredencialesApple, passJson: object, imagenes: ImagenesPase): Buffer {
  if (!imagenes["icon.png"]) throw new Error("Falta icon.png");
  const pase = new PKPass(
    { "pass.json": Buffer.from(JSON.stringify(passJson)), ...imagenes },
    { wwdr: cred.wwdr, signerCert: cred.cert, signerKey: cred.key },
  );
  return pase.getAsBuffer();
}

// --- Web service --------------------------------------------------------------

/** "ApplePass <token>" → token (o null). */
export function tokenDeAutorizacion(header: string | null) {
  const m = header?.match(/^ApplePass\s+(\S+)$/);
  return m ? m[1] : null;
}

export function tokenValido(esperado: string, recibido: string | null) {
  if (!recibido) return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recibido);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Last-Modified (fecha HTTP, precisión de segundos) y comparación con If-Modified-Since. */
export function ultimaModificacion(actualizado: Date) {
  return new Date(Math.floor(actualizado.getTime() / 1000) * 1000);
}
export function noModificado(actualizado: Date, ifModifiedSince: string | null) {
  if (!ifModifiedSince) return false;
  const desde = Date.parse(ifModifiedSince);
  return Number.isFinite(desde) && ultimaModificacion(actualizado).getTime() <= desde;
}

/** Tag opaco de passesUpdatedSince: milisegundos desde epoch. */
export const tagActualizacion = (d: Date) => String(d.getTime());
export function leerTag(v: string | null): Date | null {
  if (!v || !/^\d{1,16}$/.test(v)) return null;
  return new Date(Number(v));
}

// --- APNs ---------------------------------------------------------------------

export const APNS_HOST = "https://api.push.apple.com";

export type ResultadoPush = { token: string; status: number };

/**
 * Manda un push vacío ({}) a cada token con el certificado del pase (HTTP/2).
 * apns-topic = passTypeId. Devuelve el status de cada envío (410 = token dado de baja).
 */
export async function enviarPushes(
  cred: CredencialesApple,
  tokens: string[],
  conectar: (host: string, opts: { cert: string; key: string }) => ClientHttp2Session = (h, o) => connect(h, o),
  timeoutMs = 10_000,
): Promise<ResultadoPush[]> {
  if (!tokens.length) return [];
  const sesion = conectar(APNS_HOST, { cert: cred.cert, key: cred.key });
  sesion.on("error", () => {}); // los errores se reportan por request
  try {
    return await Promise.all(
      tokens.map(
        (token) =>
          new Promise<ResultadoPush>((resolver) => {
            const req = sesion.request({
              ":method": "POST",
              ":path": `/3/device/${token}`,
              "apns-topic": cred.passTypeId,
              "content-type": "application/json",
            });
            const reloj = setTimeout(() => {
              req.close();
              resolver({ token, status: 0 });
            }, timeoutMs);
            let status = 0;
            req.on("response", (h) => (status = Number(h[":status"]) || 0));
            req.on("data", () => {});
            req.on("end", () => {
              clearTimeout(reloj);
              resolver({ token, status });
            });
            req.on("error", () => {
              clearTimeout(reloj);
              resolver({ token, status: 0 });
            });
            req.end("{}");
          }),
      ),
    );
  } finally {
    sesion.close();
  }
}
