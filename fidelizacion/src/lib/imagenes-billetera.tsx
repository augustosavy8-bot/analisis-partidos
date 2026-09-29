import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { colorTextoSobre, type Local } from "@/lib/locales";
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

/** Ícono cuadrado del local (PWA, Google Wallet y icon.png de Apple Wallet). */
export function imagenIcono(local: Local, s: number, headers?: Record<string, string>) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: local.color_primario }}>
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
      </div>
    ),
    { width: s, height: s, headers },
  );
}

/**
 * logo.png del pase de Apple (160×50 por escala): el logo del local o su inicial,
 * alineado a la izquierda y con fondo transparente (el nombre va en logoText).
 */
export function imagenLogoPase(local: Local, escala: number) {
  const w = 160 * escala;
  const h = 50 * escala;
  const lado = h * 0.84;
  return new ImageResponse(
    (
      <div style={{ width: w, height: h, display: "flex", alignItems: "center" }}>
        {local.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={local.logo_url} alt="" width={lado} height={lado} style={{ borderRadius: lado * 0.22, objectFit: "cover" }} />
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
 * strip.png del pase de Apple (375×123 por escala): el arte de la cabecera de
 * Google sin textos, con el sello a la derecha para que los puntos (que Wallet
 * dibuja arriba a la izquierda) se lean limpios.
 */
export function imagenStripPase(local: Local, escala: number) {
  const w = 375 * escala;
  const h = 123 * escala;
  const svg = svgStripApple({ primario: local.color_primario, acento: local.color_secundario });
  return new ImageResponse(
    (
      <div style={{ width: w, height: h, display: "flex", background: local.color_primario }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri(svg)} width={w} height={h} alt="" style={{ objectFit: "cover" }} />
      </div>
    ),
    { width: w, height: h },
  );
}
