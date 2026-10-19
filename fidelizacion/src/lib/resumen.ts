/**
 * Resumen semanal para los dueños: arma el mail (asunto, HTML y texto) a partir de
 * los números de public.resumen_semanal. Sin "server-only" para poder testearlo.
 */

export type DatosResumen = {
  visitas: number;
  visitas_antes: number;
  nuevos: number;
  nuevos_antes: number;
  canjes: number;
  canjes_antes: number;
  clientes_total: number;
  inactivos: number;
  mozo_top: { nombre: string; sumas: number } | null;
  cumples: { nombre: string; dia: number; mes: number }[];
};

export type MailResumen = { asunto: string; html: string; texto: string };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "↑ 3 más que la semana pasada" / "↓ 2 menos" / "igual". */
export function comparar(ahora: number, antes: number) {
  const d = ahora - antes;
  if (d === 0) return { flecha: "=", texto: "igual que la semana pasada", sube: null as boolean | null };
  return { flecha: d > 0 ? "↑" : "↓", texto: `${Math.abs(d)} ${d > 0 ? "más" : "menos"} que la semana pasada`, sube: d > 0 };
}

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function armarMailResumen(p: {
  local: string;
  /** "13 al 19 de octubre" */
  semana: string;
  datos: DatosResumen;
  urlPanel: string;
  urlReactivar: string;
  urlBaja: string;
}): MailResumen {
  const { datos: d } = p;
  const filas = [
    { etiqueta: "Visitas", valor: d.visitas, c: comparar(d.visitas, d.visitas_antes) },
    { etiqueta: "Clientes nuevos", valor: d.nuevos, c: comparar(d.nuevos, d.nuevos_antes) },
    { etiqueta: "Premios canjeados", valor: d.canjes, c: comparar(d.canjes, d.canjes_antes) },
  ];
  const cumples = d.cumples.map((c) => `${c.nombre} (${c.dia} ${MESES[c.mes - 1]})`);
  const asunto =
    d.visitas > 0
      ? `${p.local}: ${d.visitas} ${d.visitas === 1 ? "visita" : "visitas"} esta semana`
      : `${p.local}: tu resumen de la semana`;

  // --- texto plano ---
  const texto = [
    `Tu semana en ${p.local} (${p.semana})`,
    "",
    ...filas.map((f) => `${f.etiqueta}: ${f.valor} (${f.c.texto})`),
    d.mozo_top ? `Quien más sumó: ${d.mozo_top.nombre} (${d.mozo_top.sumas})` : "",
    `Clientes en total: ${d.clientes_total}`,
    "",
    d.inactivos > 0 ? `${d.inactivos} ${d.inactivos === 1 ? "cliente no vuelve" : "clientes no vuelven"} hace 30 días o más. Escribiles: ${p.urlReactivar}` : "",
    cumples.length ? `Cumplen años esta semana: ${cumples.join(", ")}` : "",
    "",
    `Ver el panel: ${p.urlPanel}`,
    "",
    `No quiero recibir más este resumen: ${p.urlBaja}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  // --- HTML (tablas y estilos en línea: es lo que entienden todos los clientes de mail) ---
  const color = (sube: boolean | null) => (sube === null ? "#656a65" : sube ? "#20b85e" : "#c2410c");
  const celdas = filas
    .map(
      (f) => `<td width="33%" style="padding:16px 8px;text-align:center;background:#f0f2ee;border-radius:12px">
        <div style="font-size:28px;font-weight:700;color:#111311;line-height:1">${f.valor}</div>
        <div style="font-size:13px;color:#656a65;margin-top:6px">${f.etiqueta}</div>
        <div style="font-size:12px;color:${color(f.c.sube)};margin-top:4px">${f.c.flecha} ${escapar(f.c.texto)}</div>
      </td>`,
    )
    .join('<td width="8"></td>');
  const bloque = (titulo: string, cuerpo: string) =>
    `<tr><td style="padding:16px 0 0"><div style="border:1px solid #e2e5e0;border-radius:12px;padding:16px">
      <div style="font-size:15px;font-weight:600;color:#111311">${titulo}</div>
      <div style="font-size:14px;color:#656a65;margin-top:6px;line-height:1.5">${cuerpo}</div>
    </div></td></tr>`;
  const boton = (href: string, txt: string, primario: boolean) =>
    `<a href="${escapar(href)}" style="display:inline-block;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;${
      primario ? "background:#111311;color:#ffffff" : "background:#ffffff;color:#111311;border:1px solid #e2e5e0"
    }">${txt}</a>`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapar(asunto)}</title></head>
<body style="margin:0;padding:0;background:#f7f8f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f6"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:24px">
<tr><td style="padding-bottom:16px"><img src="${new URL(p.urlPanel).origin}/marcas/point-logo.png" width="96" height="34" alt="Point" style="display:block;border:0;height:34px;width:96px"></td></tr>
  <tr><td style="font-size:13px;color:#949994;letter-spacing:.04em;text-transform:uppercase">Resumen semanal</td></tr>
  <tr><td style="padding-top:6px;font-size:22px;font-weight:700;color:#111311">Tu semana en ${escapar(p.local)}</td></tr>
  <tr><td style="padding-top:2px;font-size:14px;color:#656a65">${escapar(p.semana)}</td></tr>
  <tr><td style="padding-top:20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${celdas}</tr></table></td></tr>
  ${d.mozo_top ? bloque("Quien más sumó", `${escapar(d.mozo_top.nombre)}, con ${d.mozo_top.sumas} ${d.mozo_top.sumas === 1 ? "visita" : "visitas"}. ¡Contáselo!`) : ""}
  ${
    d.inactivos > 0
      ? bloque(
          `${d.inactivos} ${d.inactivos === 1 ? "cliente no vuelve" : "clientes no vuelven"} hace 30 días`,
          `Un mensaje a tiempo los trae de vuelta. Point te lo escribe y vos lo mandás por WhatsApp.<div style="margin-top:12px">${boton(p.urlReactivar, "Escribirles", true)}</div>`,
        )
      : ""
  }
  ${cumples.length ? bloque("Cumplen años esta semana", escapar(cumples.join(", "))) : ""}
  <tr><td style="padding-top:20px;font-size:14px;color:#656a65">Tenés ${d.clientes_total} ${d.clientes_total === 1 ? "cliente" : "clientes"} con tarjeta.</td></tr>
  <tr><td style="padding-top:16px">${boton(p.urlPanel, "Ver el panel", d.inactivos === 0)}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:16px 8px;font-size:12px;color:#949994;text-align:center;line-height:1.5">
  Te llega porque gestionás ${escapar(p.local)} en Point.<br><a href="${escapar(p.urlBaja)}" style="color:#949994">No quiero recibir más este resumen</a>
</td></tr></table>
</td></tr></table></body></html>`;

  return { asunto, html, texto };
}

/** "13 al 19 de octubre" (o "28 de septiembre al 4 de octubre") para la semana que termina el día anterior a `hasta`. */
export function textoSemana(hasta: Date, zona: string) {
  const fin = new Date(hasta.getTime() - 86_400_000);
  const inicio = new Date(hasta.getTime() - 7 * 86_400_000);
  const parte = (d: Date) => {
    const f = new Intl.DateTimeFormat("es-AR", { timeZone: zona, day: "numeric", month: "long" }).formatToParts(d);
    return { dia: f.find((x) => x.type === "day")!.value, mes: f.find((x) => x.type === "month")!.value };
  };
  const a = parte(inicio);
  const b = parte(fin);
  return a.mes === b.mes ? `${a.dia} al ${b.dia} de ${b.mes}` : `${a.dia} de ${a.mes} al ${b.dia} de ${b.mes}`;
}
