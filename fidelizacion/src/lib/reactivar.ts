/** Segmentos y mensajes para reactivar clientes por WhatsApp (links wa.me). */
export type Segmento = "inactivos" | "cerca" | "premio" | "cumple";

export const SEGMENTOS: Record<
  Segmento,
  { titulo: string; descripcion: (valor: number) => string; valores: number[]; porDefecto: number; etiquetaValor: (v: number) => string; plantilla: string }
> = {
  inactivos: {
    titulo: "No vienen hace tiempo",
    descripcion: (v) => `Vinieron alguna vez y no volvieron en ${v} días o más.`,
    valores: [15, 30, 60, 90],
    porDefecto: 30,
    etiquetaValor: (v) => `${v} días`,
    plantilla:
      "¡Hola {nombre}! Te extrañamos en {local} 🙌 Tenés {puntos} puntos en tu tarjeta y te faltan {faltan} para {premio}. ¡Te esperamos! {link}",
  },
  cerca: {
    titulo: "Les falta poco",
    descripcion: (v) => `Les faltan ${v === 1 ? "1 punto" : `${v} puntos o menos`} para el próximo premio.`,
    valores: [1, 2, 3],
    porDefecto: 2,
    etiquetaValor: (v) => (v === 1 ? "1 punto" : `≤ ${v} puntos`),
    plantilla:
      "¡Hola {nombre}! Estás a {faltan} de {premio} en {local} 🎁 La próxima que vengas te acercás un montón. {link}",
  },
  premio: {
    titulo: "Tienen premio sin usar",
    descripcion: () => "Ya juntaron los puntos para un premio y todavía no lo canjearon.",
    valores: [],
    porDefecto: 0,
    etiquetaValor: () => "",
    plantilla:
      "¡Hola {nombre}! Tenés {puntos} puntos en {local}: ya podés canjear {premio} 🎉 Pasá cuando quieras y pedíselo a quien te atienda. {link}",
  },
  cumple: {
    titulo: "Cumplen años",
    descripcion: (v) => (v === 0 ? "Cumplen años hoy." : `Cumplen años en los próximos ${v} días.`),
    valores: [0, 7, 15, 30],
    porDefecto: 7,
    etiquetaValor: (v) => (v === 0 ? "Hoy" : `${v} días`),
    plantilla:
      "¡Feliz cumple, {nombre}! 🎂 Te esperamos en {local} para festejarlo: esa semana tu visita tiene puntos de regalo. {link}",
  },
};

export function esSegmento(s: unknown): s is Segmento {
  return typeof s === "string" && s in SEGMENTOS;
}

export type DatosMensaje = {
  nombre: string;
  local: string;
  puntos: number;
  premio: string | null;
  premioPuntos: number | null;
  link: string;
};

/** Reemplaza {nombre}, {local}, {puntos}, {premio}, {faltan} y {link}. */
export function armarMensaje(plantilla: string, d: DatosMensaje): string {
  const faltan = d.premioPuntos != null ? Math.max(0, d.premioPuntos - d.puntos) : 0;
  const valores: Record<string, string> = {
    nombre: d.nombre.trim().split(/\s+/)[0] ?? "",
    local: d.local,
    puntos: String(d.puntos),
    premio: d.premio ? d.premio.toLowerCase() : "tu próximo premio",
    faltan: faltan === 1 ? "1 punto" : `${faltan} puntos`,
    link: d.link,
  };
  return plantilla
    .replace(/\{(\w+)\}/g, (todo, clave: string) => valores[clave] ?? todo)
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Link que abre WhatsApp con el mensaje escrito (el dueño lo manda desde su celular). */
export function linkWhatsapp(e164: string, texto: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

/** "hoy", "ayer", "hace 5 días". */
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const dias = Math.floor((ahora - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}
