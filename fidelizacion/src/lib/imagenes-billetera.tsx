import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Local } from "@/lib/locales";
import { MAX_SELLOS_FRANJA, svgCabecera, svgFranja, textoSobre } from "@/lib/diseno-billetera";

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
