/**
 * Apple Wallet (storeCard): pass.json, firma del .pkpass con passkit-generator,
 * helpers del web service (PassKit Web Service v1) y push por APNs (HTTP/2).
 * Sin "server-only" para poder testearlo. Nunca loguea certificados ni tokens.
 */
import { connect, type ClientHttp2Session } from "node:http2";
import { timingSafeEqual } from "node:crypto";
import { PKPass } from "passkit-generator";
import { coloresTarjeta, contraste, cssRgb } from "@/lib/colores";

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

export { contraste };

/** Fondo = color principal; texto y etiquetas: lo elegido en el panel o lo calculado por contraste. */
export function coloresPase(primario: string, secundario: string, texto?: string | null, etiqueta?: string | null) {
  const c = coloresTarjeta({ color_primario: primario, color_secundario: secundario, color_texto: texto, color_etiqueta: etiqueta });
  return { backgroundColor: cssRgb(c.fondo), foregroundColor: cssRgb(c.texto), labelColor: cssRgb(c.etiqueta) };
}

// --- pass.json ----------------------------------------------------------------

export type DatosPaseApple = {
  serial: string;
  authToken: string;
  puntos: number;
  clienteNombre: string;
  /** El mismo link del QR de Google: /w/<serial>/<wallet_auth_token>. */
  urlPase: string;
  /** Tipo del último movimiento: elige el texto de la notificación de puntos. */
  ultimoMovimiento?: "suma" | "canje" | "regalo" | null;
  /** Último mensaje del local (campo Novedades del dorso). */
  novedad?: { titulo: string; texto: string } | null;
  urlTarjeta: string;
  local: {
    nombre: string;
    colorPrimario: string;
    colorSecundario: string;
    /** Diseño elegido en el panel (null = calculado / nombre del local). */
    colorTexto?: string | null;
    colorEtiqueta?: string | null;
    nombrePrograma?: string | null;
    textoDorso?: string | null;
    premios: { nombre: string; puntos: number }[];
    latitud: number | null;
    longitud: number | null;
  };
};

function proximoPremioApple(puntos: number, premios: DatosPaseApple["local"]["premios"]) {
  if (!premios.length) return null;
  return premios.find((p) => p.puntos > puntos) ?? premios[premios.length - 1];
}

const SIN_NOVEDADES = "Todavía no hay novedades.";

/** Texto de la notificación de iOS cuando cambian los puntos (%@ = puntos nuevos). */
function mensajeCambioPuntos(ultimo: DatosPaseApple["ultimoMovimiento"]) {
  return ultimo === "canje" ? "Canjeaste tu premio: ahora tenés %@" : "Sumaste puntos: ahora tenés %@";
}

export function armarPassJson(cred: Pick<CredencialesApple, "passTypeId" | "teamId">, d: DatosPaseApple, appUrl: string) {
  const base = appUrl.replace(/\/$/, "");
  const { local } = d;
  const programa = local.nombrePrograma || local.nombre;
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
    description: `Tarjeta de puntos de ${programa}`,
    logoText: programa,
    sharingProhibited: true,
    ...coloresPase(local.colorPrimario, local.colorSecundario, local.colorTexto, local.colorEtiqueta),
    storeCard: {
      primaryFields: [
        {
          key: "puntos",
          label: "PUNTOS",
          value: d.puntos,
          changeMessage: mensajeCambioPuntos(d.ultimoMovimiento),
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
        // Siempre presente: cuando el local manda un mensaje cambia el valor e iOS lo notifica.
        {
          key: "novedades",
          label: "Novedades",
          value: d.novedad ? `${d.novedad.titulo}\n${d.novedad.texto}` : SIN_NOVEDADES,
          changeMessage: "%@",
        },
        { key: "premios", label: "Premios", value: premios },
        ...(local.textoDorso ? [{ key: "sobre", label: programa, value: local.textoDorso }] : []),
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
              relevantText: `Estás cerca de ${local.nombre}. Tenés ${d.puntos} ${d.puntos === 1 ? "punto" : "puntos"}`,
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

const APNS_HOST = "https://api.push.apple.com";

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
