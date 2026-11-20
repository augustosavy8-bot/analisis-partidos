/**
 * Club de socios: la tarjeta de un socio usa los colores del club y lleva la
 * insignia SOCIO. Socio se hace con el toque del llavero de socios (aplicar_toque)
 * o a mano desde el panel. Sin dependencias del servidor: lo usan el panel, las
 * tarjetas, los pases y los tests.
 */
import { coloresTarjeta } from "./colores";
import { luminancia } from "./diseno-billetera";

/** Tarjeta de socio por defecto: negra con dorado; si la común ya es oscura, dorada. */
export const CLUB_POR_DEFECTO = {
  negra: { primario: "#17140f", secundario: "#c9a45c" },
  dorada: { primario: "#c9a45c", secundario: "#17140f" },
} as const;

export const INSIGNIA_SOCIO = "Socio";

type LocalClub = {
  nombre: string;
  color_primario: string;
  color_secundario: string;
  color_texto?: string | null;
  color_etiqueta?: string | null;
  club_nombre?: string | null;
  club_color_primario?: string | null;
  club_color_secundario?: string | null;
};

/** Fondo y acento de la tarjeta de socio: los elegidos en el panel o los por defecto. */
export function coloresClub(local: LocalClub): { primario: string; secundario: string } {
  const defecto = luminancia(local.color_primario) < 0.05 ? CLUB_POR_DEFECTO.dorada : CLUB_POR_DEFECTO.negra;
  return {
    primario: local.club_color_primario ?? defecto.primario,
    secundario: local.club_color_secundario ?? defecto.secundario,
  };
}

/**
 * El local con los colores del club: lo que usan la tarjeta, la franja y los pases
 * de un socio. El texto y las etiquetas se calculan para el fondo del club.
 */
export function comoSocio<T extends LocalClub>(local: T): T {
  const c = coloresClub(local);
  return { ...local, color_primario: c.primario, color_secundario: c.secundario, color_texto: null, color_etiqueta: null };
}

/** Variables --pt-tarjeta-* (las de PointCard) con los colores del club. */
export function varsTarjetaSocio(local: LocalClub): Record<string, string> {
  const l = comoSocio(local);
  const c = coloresTarjeta(l);
  return {
    "--pt-tarjeta-fondo": c.fondo,
    "--pt-tarjeta-texto": c.texto,
    "--pt-tarjeta-etiqueta": c.etiqueta,
    "--pt-tarjeta-acento": l.color_secundario,
  };
}

/** Nombre del club para los textos: el elegido o "Club <local>". */
export function nombreClub(local: Pick<LocalClub, "nombre" | "club_nombre">) {
  return local.club_nombre?.trim() || `Club ${local.nombre}`;
}

/** "del Club Di Vinee" / "de Socios Di Vinee". */
export function delClub(nombre: string) {
  return /^club\b/i.test(nombre) ? `del ${nombre}` : `de ${nombre}`;
}

/** "al Club Di Vinee" / "a Socios Di Vinee". */
export function alClub(nombre: string) {
  return /^club\b/i.test(nombre) ? `al ${nombre}` : `a ${nombre}`;
}

/** Para quién es un premio: todos, sólo los socios del club o sólo los que no son socios. */
export type ParaPremio = "todos" | "socios" | "no_socios";

export function esParaPremio(v: unknown): v is ParaPremio {
  return v === "todos" || v === "socios" || v === "no_socios";
}

/** Los premios de una tarjeta: los de todos y los de su grupo (socio o no socio). */
export function premiosPara<T extends { para?: string | null }>(premios: T[], esSocio: boolean): T[] {
  return premios.filter((p) => !p.para || p.para === "todos" || (p.para === "socios") === esSocio);
}

/** "socios" / "no socios" para aclarar un premio en listas que ven todos; null si es para todos. */
export function aclaracionPara(para: string | null | undefined): string | null {
  return para === "socios" ? "socios" : para === "no_socios" ? "no socios" : null;
}

/** Mes y año en que se hizo socio ("10/2026"), en la zona del local. */
export function socioDesde(iso: string, zona: string) {
  return new Intl.DateTimeFormat("es-AR", { month: "2-digit", year: "numeric", timeZone: zona }).format(new Date(iso));
}
