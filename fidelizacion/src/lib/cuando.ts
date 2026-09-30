/** "Hoy, 10:55" · "Ayer, 18:20" · "Lun, 17:40" · "12 sept" (en la zona horaria del local). */
export function cuandoRelativo(iso: string, zona: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const hora = new Intl.DateTimeFormat("es-AR", { timeZone: zona, hour: "2-digit", minute: "2-digit", hour12: false }).format(fecha);
  const dias = Math.round((Date.parse(dia(ahora)) - Date.parse(dia(fecha))) / 86_400_000);
  if (dias <= 0) return `Hoy, ${hora}`;
  if (dias === 1) return `Ayer, ${hora}`;
  if (dias < 7) {
    const nombre = new Intl.DateTimeFormat("es-AR", { timeZone: zona, weekday: "short" }).format(fecha).replace(".", "");
    return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}, ${hora}`;
  }
  const mismoAnio = dia(ahora).slice(0, 4) === dia(fecha).slice(0, 4);
  return new Intl.DateTimeFormat("es-AR", { timeZone: zona, day: "numeric", month: "short", ...(mismoAnio ? {} : { year: "numeric" }) })
    .format(fecha)
    .replace(/\./g, "");
}
