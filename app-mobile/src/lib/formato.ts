/**
 * Textos de la app (sin dependencias: se testean con node --test).
 */

export function textoPuntos(n: number) {
  return n === 1 ? "1 punto" : `${n} puntos`;
}

/** "Te faltan 3 puntos para Café gratis" / "¡Ya podés canjear Café gratis!" */
export function textoProximo(proximo: { nombre: string; faltan: number } | null): string {
  if (!proximo) return "Sumá en cada visita";
  if (proximo.faltan <= 0) return `¡Ya podés canjear ${proximo.nombre}!`;
  return `Te ${proximo.faltan === 1 ? "falta 1 punto" : `faltan ${proximo.faltan} puntos`} para ${proximo.nombre}`;
}

/** Progreso hacia el próximo premio, de 0 a 1. */
export function progreso(puntos: number, proximo: { puntos: number } | null): number {
  if (!proximo || proximo.puntos <= 0) return 0;
  return Math.max(0, Math.min(1, puntos / proximo.puntos));
}

/** Deja sólo dígitos y + (para el campo de WhatsApp); el servidor normaliza el resto. */
export function limpiarWhatsapp(texto: string) {
  return texto.replace(/[^\d+]/g, "").slice(0, 20);
}

/** Un número razonable para intentar: 8 a 15 dígitos. */
export function whatsappPlausible(texto: string) {
  const digitos = texto.replace(/\D/g, "");
  return digitos.length >= 8 && digitos.length <= 15;
}

/** "29 sept · 10:55" en hora de Argentina. */
export function fechaCorta(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "America/Argentina/Buenos_Aires" });
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
  return `${fecha} · ${hora}`;
}

/** Color de texto legible (blanco o casi negro) sobre un fondo hex: el de mayor contraste WCAG. */
export function textoSobre(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contraBlanco = 1.05 / (l + 0.05);
  const contraNegro = (l + 0.05) / (0.0065 + 0.05); // #111311
  return contraBlanco >= contraNegro ? "#ffffff" : "#111311";
}

/** "14:05" en hora de Argentina. */
export function horaCorta(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
}
