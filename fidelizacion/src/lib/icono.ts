/**
 * Ícono de notificaciones del local: validación del PNG subido y de qué fuente
 * sale el ícono (ícono subido → logo recortado a cuadrado → inicial).
 * Sin "server-only" para poder testearlo y validar también en el navegador.
 */
export const ICONO = { minimo: 512, maximo: 4096, maxBytes: 2 * 1024 * 1024 } as const;

/** Fracción del lado que ocupa el logo dentro del ícono (el resto es el color del local). */
export const PROPORCION_LOGO = 0.8;

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Ancho y alto de un PNG leyendo el chunk IHDR (sin decodificar la imagen). */
export function dimensionesPng(buf: Uint8Array): { ancho: number; alto: number } | null {
  if (buf.length < 24 || FIRMA_PNG.some((b, i) => buf[i] !== b)) return null;
  // Bytes 12-15: tipo del primer chunk, tiene que ser IHDR.
  if (String.fromCharCode(buf[12], buf[13], buf[14], buf[15]) !== "IHDR") return null;
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { ancho: v.getUint32(16), alto: v.getUint32(20) };
}

/** Mensaje de error para el dueño, o null si el ícono sirve. */
export function validarIcono(buf: Uint8Array): string | null {
  if (buf.length === 0) return "Elegí un archivo PNG.";
  if (buf.length > ICONO.maxBytes) return "El archivo pesa más de 2 MB. Exportalo más liviano.";
  return validarDimensiones(dimensionesPng(buf));
}

export function validarDimensiones(d: { ancho: number; alto: number } | null): string | null {
  if (!d) return "Tiene que ser un archivo PNG.";
  if (d.ancho !== d.alto) return `Tiene que ser cuadrado (el tuyo mide ${d.ancho}×${d.alto}).`;
  if (d.ancho < ICONO.minimo) return `Tiene que medir al menos ${ICONO.minimo}×${ICONO.minimo} (el tuyo mide ${d.ancho}×${d.alto}).`;
  if (d.ancho > ICONO.maximo) return `Es demasiado grande: hasta ${ICONO.maximo}×${ICONO.maximo}.`;
  return null;
}

export type FuenteIcono = { tipo: "icono" | "logo"; url: string } | { tipo: "inicial" };

/** De dónde sale el ícono: el subido, si no el logo, si no la inicial. */
export function fuenteIcono(local: { icono_url: string | null; logo_url: string | null }): FuenteIcono {
  if (local.icono_url) return { tipo: "icono", url: local.icono_url };
  if (local.logo_url) return { tipo: "logo", url: local.logo_url };
  return { tipo: "inicial" };
}

/** Path del ícono en el bucket "logos". */
export const pathIcono = (localId: string) => `${localId}/icon.png`;
