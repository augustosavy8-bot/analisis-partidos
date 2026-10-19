/**
 * Mails de Point a los dueños que se mandan a mano desde /admin/anuncio
 * (bienvenida y novedades). Todos con el mismo marco: tablas y estilos en línea.
 */

export type MailDueno = { asunto: string; html: string; texto: string };

type Bloque = { titulo: string; html: string; texto: string };

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function armar(p: { asunto: string; etiqueta: string; titulo: string; intro: string; bloques: Bloque[]; urlPanel: string }): MailDueno {
  const bloques = p.bloques
    .map(
      (b) => `<tr><td style="padding:12px 0 0"><div style="border:1px solid #e2e5e0;border-radius:12px;padding:16px">
    <div style="font-size:15px;font-weight:600;color:#111311">${b.titulo}</div>
    <div style="font-size:14px;color:#656a65;margin-top:6px;line-height:1.55">${b.html}</div>
  </div></td></tr>`,
    )
    .join("\n  ");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapar(p.asunto)}</title></head>
<body style="margin:0;padding:0;background:#f7f8f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f6"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:24px">
  <tr><td style="font-size:13px;color:#949994;letter-spacing:.04em;text-transform:uppercase">Point · ${p.etiqueta}</td></tr>
  <tr><td style="padding-top:6px;font-size:22px;font-weight:700;color:#111311">${p.titulo}</td></tr>
  <tr><td style="padding-top:12px;font-size:15px;color:#111311;line-height:1.55">${p.intro}</td></tr>
  ${bloques}
  <tr><td style="padding-top:20px"><a href="${escapar(p.urlPanel)}" style="display:inline-block;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;background:#111311;color:#ffffff">Ir a mi panel</a></td></tr>
  <tr><td style="padding-top:20px;font-size:14px;color:#656a65;line-height:1.55">Cualquier duda, respondé este mail y te contestamos.<br><br>Gracias por confiar en Point,<br><strong style="color:#111311">El equipo de Point</strong></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:16px 8px;font-size:12px;color:#949994;text-align:center;line-height:1.5">Te llega porque gestionás un local en Point.</td></tr></table>
</td></tr></table></body></html>`;
  const sinEtiquetas = (s: string) => s.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "");
  const texto = [
    sinEtiquetas(p.intro),
    ...p.bloques.flatMap((b) => ["", b.titulo.toUpperCase(), b.texto]),
    "",
    `Ir a mi panel: ${p.urlPanel}`,
    "",
    "Cualquier duda, respondé este mail y te contestamos.",
    "",
    "Gracias por confiar en Point,",
    "El equipo de Point",
  ].join("\n");
  return { asunto: p.asunto, html, texto };
}

function bloque(titulo: string, ...parrafos: string[]): Bloque {
  return { titulo, html: parrafos.join("<br><br>"), texto: parrafos.map((x) => x.replace(/<[^>]+>/g, "")).join("\n") };
}

export const MAILS_DUENOS = {
  bienvenida: {
    nombre: "Bienvenida",
    armar: (urlPanel: string) =>
      armar({
        asunto: "Te damos la bienvenida a Point 👋",
        etiqueta: "Bienvenida",
        titulo: "Ya sos parte de Point",
        intro: "Hola, ¿cómo va?<br><br>Gracias por sumar tu local a Point. Te dejamos lo básico para arrancar con todo.",
        urlPanel,
        bloques: [
          bloque(
            "📲 Así suman tus clientes",
            "Tu equipo apoya el llavero en el celular del cliente y listo: se abre su tarjeta y suma el punto. No necesitan bajar ninguna app.",
            "La primera vez se registran con su nombre y WhatsApp, y pueden guardar la tarjeta en Apple Wallet o Google Wallet.",
          ),
          bloque(
            "🎁 Cargá tus premios",
            "Es lo que hace que vuelvan: definí qué se llevan y con cuántos puntos. Lo hacés en tu panel, en <strong style=\"color:#111311\">Premios</strong>.",
          ),
          bloque(
            "📊 Todo en tu panel",
            "Visitas, clientes nuevos, quién de tu equipo sumó más y qué clientes hace rato no vuelven, con un botón para escribirles por WhatsApp.",
            "Además, todos los lunes te llega un resumen de la semana a este mail.",
          ),
        ],
      }),
  },
  novedades: {
    nombre: "Novedades de octubre",
    armar: (urlPanel: string) =>
      armar({
        asunto: "Novedades en Point: tu resumen de los lunes",
        etiqueta: "Novedades",
        titulo: "Dos novedades para que tus clientes vuelvan más",
        intro: "Hola, ¿cómo va?<br><br>Sumamos dos cosas a Point. No tenés que configurar nada: ya están andando.",
        urlPanel,
        bloques: [
          bloque(
            "📊 Tu resumen de los lunes",
            "Todos los lunes a la mañana te llega un mail con cómo le fue a tu local en la semana: visitas, clientes nuevos, premios canjeados y quién de tu equipo sumó más. Comparado con la semana anterior.",
            "También te dice cuántos clientes hace 30 días que no vuelven, con un botón para escribirles por WhatsApp, y quiénes cumplen años.",
            '<strong style="color:#111311">El primero te llega el lunes 26 de octubre.</strong> Si no lo querés, lo apagás en Ajustes, en tu panel.',
          ),
          bloque(
            "🔔 “¡Te falta 1 punto!”",
            "Cuando a un cliente le falta un punto para su premio, su tarjeta en Apple Wallet o Google Wallet le avisa en el celular: <em>“Una visita más y te llevás tu premio”</em>. Es el empujón que más hace volver.",
          ),
        ],
      }),
  },
} as const;

export type IdMailDueno = keyof typeof MAILS_DUENOS;

export const esIdMailDueno = (v: unknown): v is IdMailDueno => typeof v === "string" && v in MAILS_DUENOS;
