/**
 * Ícono del local: de qué fuente sale (ícono subido → logo recortado a cuadrado →
 * inicial). Las reglas de subida están en imagenes-local.ts.
 */
/** Fracción del lado que ocupa el logo dentro del ícono (el resto es el color del local). */
export const PROPORCION_LOGO = 0.8;

export type FuenteIcono = { tipo: "icono" | "logo"; url: string } | { tipo: "inicial" };

/** De dónde sale el ícono: el subido, si no el logo, si no la inicial. */
export function fuenteIcono(local: { icono_url: string | null; logo_url: string | null }): FuenteIcono {
  if (local.icono_url) return { tipo: "icono", url: local.icono_url };
  if (local.logo_url) return { tipo: "logo", url: local.logo_url };
  return { tipo: "inicial" };
}

