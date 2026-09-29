import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { colorTextoSobre, type Local } from "@/lib/locales";
import { PROPORCION_LOGO, fuenteIcono, type FuenteIcono } from "@/lib/icono";
import { MAX_SELLOS_FRANJA, svgCabecera, svgFranja, svgStripApple, textoSobre } from "@/lib/diseno-billetera";

// Instrument Sans Bold (licencia OFL, ver assets/InstrumentSans-OFL.txt).
let fuente: Promise<Buffer> | null = null;
async function fuentes() {
  fuente ??= readFile(join(process.cwd(), "assets/InstrumentSans-Bold.ttf"));
  return [{ name: "Instrument Sans", data: await fuente, weight: 700 as const, style: "normal" as const }];
}

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Achica la letra si el nombre es largo, para que entre en la columna. */
function tamañoNombre(nombre: string, ancho: number, base: number) {
  return Math.max(22, Math.min(base, Math.floor(ancho / (nombre.length * 0.56))));
}

/** Franja de 1125×432 (Apple Wallet @3x / Pass2U) con los sellos del cliente. */
export async function imagenFranja(local: Local, puntos: number, meta: number) {
  const colores = { primario: local.color_primario, acento: local.color_secundario };
  const m = Math.max(1, Math.min(MAX_SELLOS_FRANJA, meta));
  return new ImageResponse(
    (
      <div style={{ width: 1125, height: 432, display: "flex", position: "relative", fontFamily: "Instrument Sans" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri(svgFranja({ ...colores, puntos, meta: m }))} width={1125} height={432} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
        <div
          style={{
            position: "absolute",
            left: 32,
            top: 160,
            width: 215,
            display: "flex",
            fontSize: tamañoNombre(local.nombre, 215, 41),
            fontWeight: 700,
            lineHeight: 1.1,
            color: textoSobre(local.color_primario),
          }}
        >
          {local.nombre}
        </div>
        {puntos > m && (
          <div style={{ position: "absolute", right: 70, top: 300, display: "flex", fontSize: 26, fontWeight: 700, color: local.color_primario }}>
            +{puntos - m}
          </div>
        )}
      </div>
    ),
    { width: 1125, height: 432, fonts: await fuentes(), headers: { "Cache-Control": "public, max-age=300" } },
  );
}

/** Cabecera de 1032×336 para Google Wallet. */
export async function imagenCabecera(local: Local, lema = "Un toque y sumás") {
  const colores = { primario: local.color_primario, acento: local.color_secundario };
  const texto = textoSobre(local.color_primario);
  return new ImageResponse(
    (
      <div style={{ width: 1032, height: 336, display: "flex", position: "relative", fontFamily: "Instrument Sans" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri(svgCabecera(colores))} width={1032} height={336} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
        <div style={{ position: "absolute", left: 290, top: 105, display: "flex", flexDirection: "column", color: texto }}>
          <div style={{ display: "flex", fontSize: tamañoNombre(local.nombre, 680, 56), fontWeight: 700 }}>{local.nombre}</div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 26, opacity: 0.85 }}>{lema}</div>
        </div>
      </div>
    ),
    { width: 1032, height: 336, fonts: await fuentes(), headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

// --- Ícono del local ----------------------------------------------------------------

const TIPOS_IMAGEN = new Set(["image/png", "image/jpeg"]);
const cacheImagenesRemotas = new Map<string, Promise<string | null>>();

/**
 * Baja una imagen (PNG o JPEG, hasta 5 MB) y la devuelve como data URI. null si no
 * se puede: así un logo caído no rompe el pase y caemos al siguiente nivel.
 */
function imagenRemota(url: string): Promise<string | null> {
  let p = cacheImagenesRemotas.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const tipo = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
        if (!res.ok || !TIPOS_IMAGEN.has(tipo)) {
          console.warn(`Ícono: no se pudo usar ${url} (status ${res.status}, tipo "${tipo}")`);
          return null;
        }
        const datos = Buffer.from(await res.arrayBuffer());
        if (datos.length > 5 * 1024 * 1024) {
          console.warn(`Ícono: ${url} pesa más de 5 MB`);
          return null;
        }
        return `data:${tipo};base64,${datos.toString("base64")}`;
      } catch (e) {
        console.warn(`Ícono: no se pudo bajar ${url}`, e instanceof Error ? e.message : e);
        return null;
      }
    })();
    // Los fallos no se cachean (puede ser algo momentáneo).
    p.then((v) => v === null && cacheImagenesRemotas.delete(url));
    if (cacheImagenesRemotas.size > 30) cacheImagenesRemotas.delete(cacheImagenesRemotas.keys().next().value!);
    cacheImagenesRemotas.set(url, p);
  }
  return p;
}

/**
 * Ícono cuadrado del local (icon.png de Apple Wallet, PWA y Google Wallet):
 * fondo sólido con el color del local y, centrado ocupando ~80%, el ícono subido
 * en el panel; si no hay, el logo recortado a cuadrado; si tampoco, la inicial.
 */
export async function imagenIcono(local: Local, s: number, headers?: Record<string, string>) {
  const fuente = fuenteIcono(local);
  let usada: FuenteIcono["tipo"] = fuente.tipo;
  let imagen = fuente.tipo !== "inicial" ? await imagenRemota(fuente.url) : null;
  // Si el ícono subido no se puede bajar, probamos con el logo.
  if (!imagen && fuente.tipo === "icono" && local.logo_url) {
    imagen = await imagenRemota(local.logo_url);
    usada = "logo";
  }
  if (!imagen) usada = "inicial";
  const lado = Math.round(s * PROPORCION_LOGO);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: local.color_primario }}>
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagen} alt="" width={lado} height={lado} style={{ width: lado, height: lado, objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: s * 0.56,
              height: s * 0.56,
              borderRadius: s * 0.16,
              background: local.color_secundario,
              color: colorTextoSobre(local.color_secundario) === "#ffffff" ? "#ffffff" : local.color_primario,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: s * 0.32,
              fontWeight: 700,
            }}
          >
            {local.nombre.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    ),
    // X-Icono-Fuente: qué se terminó dibujando (para diagnosticar).
    { width: s, height: s, headers: { ...headers, "X-Icono-Fuente": usada } },
  );
}

/**
 * logo.png del pase de Apple (160×50 por escala): el logo del local o su inicial,
 * alineado a la izquierda y con fondo transparente (el nombre va en logoText).
 */
export async function imagenLogoPase(local: Local, escala: number) {
  const w = 160 * escala;
  const h = 50 * escala;
  const lado = h * 0.84;
  const logo = local.logo_url ? await imagenRemota(local.logo_url) : null;
  return new ImageResponse(
    (
      <div style={{ width: w, height: h, display: "flex", alignItems: "center" }}>
        {logo ? (
          // Logo entero (sin recortar), a lo alto del espacio y alineado a la izquierda.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" height={lado} style={{ height: lado, maxWidth: w, objectFit: "contain", objectPosition: "left center" }} />
        ) : (
          <div
            style={{
              width: lado,
              height: lado,
              borderRadius: lado * 0.28,
              background: local.color_secundario,
              color: colorTextoSobre(local.color_secundario),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: lado * 0.56,
              fontWeight: 700,
            }}
          >
            {local.nombre.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    ),
    { width: w, height: h },
  );
}

/**
 * strip.png del pase de Apple (375×123 por escala): la franja que subió el local
 * (recortada para llenar) o, si no hay, el arte de la cabecera de Google sin
 * textos, con el sello a la derecha para que los puntos se lean limpios.
 */
export async function imagenStripPase(local: Local, escala: number) {
  const w = 375 * escala;
  const h = 123 * escala;
  const propia = local.franja_url ? await imagenRemota(local.franja_url) : null;
  const src = propia ?? dataUri(svgStripApple({ primario: local.color_primario, acento: local.color_secundario }));
  return new ImageResponse(
    (
      <div style={{ width: w, height: h, display: "flex", background: local.color_primario }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={w} height={h} alt="" style={{ width: w, height: h, objectFit: "cover" }} />
      </div>
    ),
    { width: w, height: h },
  );
}
