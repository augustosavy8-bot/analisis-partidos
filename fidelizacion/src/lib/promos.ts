/** Promos de puntos por día y horario (se aplican en registrar_suma, en la base). */
export type Promo = {
  id: string;
  nombre: string;
  dias: number[]; // 0 = domingo … 6 = sábado
  desde: string; // "HH:MM" o "HH:MM:SS"
  hasta: string;
  puntos: number;
  activa: boolean;
};

export const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
const DIAS_LARGOS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
// Orden en que se muestran (lunes primero).
export const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "15:00:00" → "15:00"; "23:59:59" → "24:00" (fin del día). */
export function horaCorta(h: string): string {
  const hhmm = h.slice(0, 5);
  return hhmm === "23:59" ? "24:00" : hhmm;
}

/** Día de la semana y hora ("HH:MM:SS") en la zona del local. */
export function ahoraEnZona(zona: string, fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v("weekday"));
  return { dia, hora: `${v("hour")}:${v("minute")}:${v("second")}` };
}

const normalizar = (h: string) => (h.length === 5 ? `${h}:00` : h.slice(0, 8));

/** La promo que aplica ahora (la que más puntos da), o null. Misma regla que la base. */
export function promoVigente(promos: Promo[], zona: string, fecha = new Date()): Promo | null {
  const { dia, hora } = ahoraEnZona(zona, fecha);
  const vigentes = promos.filter(
    (p) => p.activa && p.dias.includes(dia) && hora >= normalizar(p.desde) && hora < normalizar(p.hasta),
  );
  return vigentes.sort((a, b) => b.puntos - a.puntos)[0] ?? null;
}

/** "Martes y jueves", "Todos los días", "Lunes a viernes", "Sáb y Dom". */
export function describirDias(dias: number[]): string {
  const set = new Set(dias);
  if (set.size === 7) return "Todos los días";
  const orden = ORDEN_DIAS.filter((d) => set.has(d));
  if (orden.length === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Lunes a viernes";
  if (orden.length === 2 && set.has(6) && set.has(0)) return "Fines de semana";
  const nombres = orden.map((d) => DIAS_LARGOS[d]);
  const texto = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Martes y jueves de 15:00 a 18:00 · puntos dobles". */
export function describirPromo(p: Pick<Promo, "dias" | "desde" | "hasta" | "puntos">): string {
  const horario = horaCorta(p.desde) === "00:00" && horaCorta(p.hasta) === "24:00"
    ? "todo el día"
    : `de ${horaCorta(p.desde)} a ${horaCorta(p.hasta)}`;
  return `${describirDias(p.dias)} ${horario} · ${nombreMultiplicador(p.puntos)}`;
}

export function nombreMultiplicador(puntos: number): string {
  return puntos === 2 ? "puntos dobles" : puntos === 3 ? "puntos triples" : `${puntos} puntos por visita`;
}

/** Días válidos para una fecha día/mes (29/2 permitido). */
export function cumpleValido(dia: number, mes: number): boolean {
  if (!Number.isInteger(dia) || !Number.isInteger(mes) || mes < 1 || mes > 12 || dia < 1) return false;
  const max = mes === 2 ? 29 : [4, 6, 9, 11].includes(mes) ? 30 : 31;
  return dia <= max;
}

export function textoCumple(dia: number, mes: number): string {
  return `${dia} de ${MESES[mes - 1]}`;
}

/** Lee el cumple de un form: null si está vacío, "invalido" si está mal. */
export function leerCumple(form: FormData): { dia: number; mes: number } | null | "invalido" {
  const d = String(form.get("cumple_dia") ?? "");
  const m = String(form.get("cumple_mes") ?? "");
  if (!d && !m) return null;
  const dia = Number(d);
  const mes = Number(m);
  return cumpleValido(dia, mes) ? { dia, mes } : "invalido";
}
