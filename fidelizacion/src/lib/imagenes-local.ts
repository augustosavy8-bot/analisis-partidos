/**
 * Imágenes que el local sube en "Diseño de tarjeta": reglas por tipo, lectura de
 * medidas (PNG y JPEG, sin decodificar) y paths en Storage (bucket "logos").
 * Sin "server-only": valida igual en el navegador y en el servidor.
 */
export type TipoImagen = "logo" | "icono" | "franja";
export const TIPOS_IMAGEN: TipoImagen[] = ["logo", "icono", "franja"];

type Formato = "png" | "jpeg";
type Regla = {
  formatos: Formato[];
  maxBytes: number;
  /** Lado mínimo (el menor de los dos) y máximo (el mayor). */
  minimo: number;
  maximo: number;
  cuadrada?: boolean;
  /** Ancho / alto permitido. */
  proporcion?: [number, number];
  ayuda: string;
};

export const REGLAS_IMAGEN: Record<TipoImagen, Regla> = {
  logo: {
    formatos: ["png"],
    maxBytes: 2 * 1024 * 1024,
    minimo: 150,
    maximo: 4096,
    ayuda: "PNG con fondo transparente, de al menos 150 px de alto. Va arriba a la izquierda en Apple Wallet.",
  },
  icono: {
    formatos: ["png"],
    maxBytes: 2 * 1024 * 1024,
    minimo: 512,
    maximo: 4096,
    cuadrada: true,
    ayuda: "PNG cuadrado de al menos 512×512. Aparece en las notificaciones y como logo en Google Wallet.",
  },
  franja: {
    formatos: ["png", "jpeg"],
    maxBytes: 2 * 1024 * 1024,
    minimo: 336,
    maximo: 4096,
    proporcion: [2.4, 3.8],
    ayuda: "PNG o JPG apaisado, ideal 1125×369 (mínimo 1032 de ancho). Mejor sin texto: la billetera escribe los puntos encima.",
  },
};

/** Ancho mínimo extra para la franja (Google usa 1032 de ancho). */
const ANCHO_MIN_FRANJA = 1032;

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type Medidas = { formato: Formato; ancho: number; alto: number };

function medidasPng(b: Uint8Array): Medidas | null {
  if (b.length < 24 || FIRMA_PNG.some((x, i) => b[i] !== x)) return null;
  if (String.fromCharCode(b[12], b[13], b[14], b[15]) !== "IHDR") return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { formato: "png", ancho: v.getUint32(16), alto: v.getUint32(20) };
}

/** Recorre los segmentos JPEG hasta el SOF (baseline, progresivo, etc.). */
function medidasJpeg(b: Uint8Array): Medidas | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marca = b[i + 1];
    if (marca === 0xff) {
      i++;
      continue;
    }
    const largo = (b[i + 2] << 8) | b[i + 3];
    // SOF0-SOF15 salvo DHT (C4), JPG (C8) y DAC (CC).
    if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
      return { formato: "jpeg", alto: (b[i + 5] << 8) | b[i + 6], ancho: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + largo;
  }
  return null;
}

export function medidasImagen(b: Uint8Array): Medidas | null {
  return medidasPng(b) ?? medidasJpeg(b);
}

const NOMBRE_FORMATO: Record<Formato, string> = { png: "PNG", jpeg: "JPG" };

/** Motivo por el que la imagen no sirve (para mostrarle al dueño), o null. */
export function validarMedidas(tipo: TipoImagen, m: Medidas | null): string | null {
  const r = REGLAS_IMAGEN[tipo];
  const formatos = r.formatos.map((f) => NOMBRE_FORMATO[f]).join(" o ");
  if (!m || !r.formatos.includes(m.formato)) return `Tiene que ser un archivo ${formatos}.`;
  const { ancho, alto } = m;
  const medida = `${ancho}×${alto}`;
  if (r.cuadrada && ancho !== alto) return `Tiene que ser cuadrado (el tuyo mide ${medida}).`;
  if (Math.max(ancho, alto) > r.maximo) return `Es demasiado grande (${medida}): hasta ${r.maximo} px por lado.`;
  if (tipo === "franja") {
    const p = ancho / alto;
    if (p < r.proporcion![0] || p > r.proporcion![1]) return `Tiene que ser apaisada, unas 3 veces más ancha que alta (la tuya mide ${medida}).`;
    if (ancho < ANCHO_MIN_FRANJA) return `Tiene que medir al menos ${ANCHO_MIN_FRANJA} de ancho (la tuya mide ${medida}).`;
    return null;
  }
  if (Math.min(ancho, alto) < r.minimo) {
    return r.cuadrada ? `Tiene que medir al menos ${r.minimo}×${r.minimo} (el tuyo mide ${medida}).` : `Es muy chico (${medida}): al menos ${r.minimo} px de alto.`;
  }
  return null;
}

export function validarImagen(tipo: TipoImagen, b: Uint8Array): string | null {
  if (b.length === 0) return "Elegí un archivo.";
  if (b.length > REGLAS_IMAGEN[tipo].maxBytes) return "El archivo pesa más de 2 MB. Exportalo más liviano.";
  return validarMedidas(tipo, medidasImagen(b));
}

export const EXTENSION: Record<Formato, string> = { png: "png", jpeg: "jpg" };
export const CONTENT_TYPE: Record<Formato, string> = { png: "image/png", jpeg: "image/jpeg" };

const ARCHIVO: Record<TipoImagen, string> = { logo: "logo", icono: "icon", franja: "franja" };

/** Path definitivo en el bucket: {local_id}/icon.png, {local_id}/logo.png, {local_id}/franja.jpg… */
export const pathImagen = (localId: string, tipo: TipoImagen, formato: Formato) => `${localId}/${ARCHIVO[tipo]}.${EXTENSION[formato]}`;
/** Borrador (subido al elegirlo, antes de "Guardar"). */
export const pathBorrador = (localId: string, tipo: TipoImagen, formato: Formato) => `${localId}/borrador/${ARCHIVO[tipo]}.${EXTENSION[formato]}`;
/** Todos los paths posibles (para limpiar la otra extensión). */
export const pathsPosibles = (localId: string, tipo: TipoImagen, borrador = false) =>
  (["png", "jpeg"] as Formato[]).map((f) => (borrador ? pathBorrador : pathImagen)(localId, tipo, f));
