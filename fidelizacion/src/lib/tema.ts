/**
 * Tema de la app del cliente según la paleta de cada bar (panel > Diseño).
 * Devuelve valores para las variables --color-pt-* (las que usan todos los
 * componentes) y para la tarjeta. Todo se ajusta para cumplir contraste AA:
 * los colores del bar se respetan en tono, pero se aclaran u oscurecen lo
 * mínimo necesario para que se lean.
 */
import { coloresTarjeta, contraste, saturacion, separarDe, ajustarHasta } from "@/lib/colores";
import { mezclar } from "@/lib/diseno-billetera";

type LocalTema = {
  color_primario: string;
  color_secundario: string;
  color_texto?: string | null;
  color_etiqueta?: string | null;
};

const BLANCO = "#ffffff";
const CASI_NEGRO = "#111311";

export type Tema = {
  /** Variables CSS (sin el prefijo --). */
  variables: Record<string, string>;
  /** Color del navegador (barra de Safari/Chrome). */
  themeColor: string;
};

export function temaDelLocal(local: LocalTema): Tema {
  const { fondo, texto, etiqueta } = coloresTarjeta(local);
  const acento = local.color_secundario;

  // Tinta (textos, botones principales, barra de pestañas): el color del bar,
  // oscurecido si hace falta para leerse bien (AAA 7:1, con margen para el fondo
  // teñido). Si es muy saturado (un azul eléctrico) lo apagamos un poco: párrafos
  // enteros en un color puro cansan la vista.
  const sobrio = saturacion(fondo) > 0.55 ? mezclar(fondo, CASI_NEGRO, 0.35) : fondo;
  const tinta = ajustarHasta(sobrio, BLANCO, 7.6, "#000000");

  // Fondo, superficies y bordes: blanco apenas teñido con la tinta (así también
  // marcan cuando el color del bar es claro).
  const bg = mezclar(BLANCO, tinta, 0.03);
  const superficie = mezclar(BLANCO, tinta, 0.055);
  const superficieHover = mezclar(BLANCO, tinta, 0.08);
  const borde = mezclar(BLANCO, tinta, 0.12);

  // Secundarios: casi neutros (con un toque del bar), hasta el mínimo AA (4.5) y para detalles (3).
  const base = mezclar(tinta, CASI_NEGRO, 0.6);
  const tinta2 = masClaroQueCumple(base, bg, 4.6);
  const tinta3 = masClaroQueCumple(base, bg, 3);

  // Acento como fondo (botón "Canjear", insignias): con texto en tinta encima.
  const acentoUi = separarDe(acento, tinta, 4.5);
  const acentoOscuro = mezclar(acentoUi, "#000000", 0.14);
  const acentoSuave = mezclar(BLANCO, acentoUi, 0.16);
  // Acento como texto sobre fondos claros ("listo para canjear").
  const acentoTexto = ajustarHasta(acentoUi, bg, 4.5, "#000000");

  return {
    themeColor: bg,
    variables: {
      "color-pt-bg": bg,
      "color-pt-surface": superficie,
      "color-pt-surface-hover": superficieHover,
      "color-pt-border": borde,
      "color-pt-ink": tinta,
      "color-pt-ink-2": tinta2,
      "color-pt-ink-3": tinta3,
      "color-pt-accent": acentoUi,
      "color-pt-accent-dark": acentoOscuro,
      "color-pt-accent-soft": acentoSuave,
      "color-pt-accent-ink": acentoTexto,
      // Pantallas oscuras (celebración): la tinta, que siempre lleva texto blanco.
      "color-pt-card": tinta,
      // La tarjeta protagonista: exactamente los colores de su pase.
      "pt-tarjeta-fondo": fondo,
      "pt-tarjeta-texto": texto,
      "pt-tarjeta-etiqueta": etiqueta,
      "pt-tarjeta-acento": acento,
    },
  };
}

/** La mezcla más clara de `tinta` hacia `fondo` que todavía cumple `objetivo`. */
function masClaroQueCumple(tinta: string, fondo: string, objetivo: number) {
  let mejor = tinta;
  for (let t = 0.05; t < 1; t += 0.05) {
    const c = mezclar(tinta, fondo, t);
    if (contraste(c, fondo) < objetivo) break;
    mejor = c;
  }
  return mejor;
}

/** `:root{--color-pt-bg:#…;…}` para inyectar en la página del bar. */
export function cssTema(tema: Tema) {
  const declaraciones = Object.entries(tema.variables)
    .filter(([, v]) => /^#[0-9a-f]{6}$/i.test(v))
    .map(([k, v]) => `--${k}:${v}`)
    .join(";");
  return `:root{${declaraciones}}`;
}
