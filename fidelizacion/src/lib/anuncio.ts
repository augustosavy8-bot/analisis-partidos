/**
 * Mail de novedades a los dueños (octubre 2026): resumen de los lunes y aviso de
 * "te falta 1 punto". Se manda una vez desde /admin/anuncio.
 */
export const ID_ANUNCIO = "novedades-2026-10";

export function armarMailAnuncio(urlPanel: string) {
  const asunto = "Novedades en Point: tu resumen de los lunes";
  const texto = [
    "Hola, ¿cómo va?",
    "",
    "Sumamos dos cosas a Point. No tenés que configurar nada: ya están andando.",
    "",
    "TU RESUMEN DE LOS LUNES",
    "Todos los lunes a la mañana te llega un mail con cómo le fue a tu local en la semana: visitas, clientes nuevos, premios canjeados y quién de tu equipo sumó más. Comparado con la semana anterior.",
    "También te dice cuántos clientes hace 30 días que no vuelven, con un botón para escribirles por WhatsApp, y quiénes cumplen años.",
    "El primero te llega el lunes 26 de octubre. Si no lo querés, lo apagás en Ajustes, en tu panel.",
    "",
    "\"¡TE FALTA 1 PUNTO!\"",
    "Cuando a un cliente le falta un punto para su premio, su tarjeta en Apple Wallet o Google Wallet le avisa en el celular: \"Una visita más y te llevás tu premio\". Es el empujón que más hace volver.",
    "",
    `Ir a mi panel: ${urlPanel}`,
    "",
    "Cualquier duda, respondé este mail y te contestamos.",
    "",
    "Gracias por confiar en Point,",
    "El equipo de Point",
  ].join("\n");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Novedades en Point: tu resumen de los lunes</title></head>
<body style="margin:0;padding:0;background:#f7f8f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f6"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:24px">
  <tr><td style="font-size:13px;color:#949994;letter-spacing:.04em;text-transform:uppercase">Point · Novedades</td></tr>
  <tr><td style="padding-top:6px;font-size:22px;font-weight:700;color:#111311">Dos novedades para que tus clientes vuelvan más</td></tr>
  <tr><td style="padding-top:12px;font-size:15px;color:#111311;line-height:1.55">Hola, ¿cómo va?<br><br>Sumamos dos cosas a Point. No tenés que configurar nada: ya están andando.</td></tr>
  <tr><td style="padding:16px 0 0"><div style="border:1px solid #e2e5e0;border-radius:12px;padding:16px">
    <div style="font-size:15px;font-weight:600;color:#111311">📊 Tu resumen de los lunes</div>
    <div style="font-size:14px;color:#656a65;margin-top:6px;line-height:1.55">Todos los lunes a la mañana te llega un mail con cómo le fue a tu local en la semana: visitas, clientes nuevos, premios canjeados y quién de tu equipo sumó más. Comparado con la semana anterior.<br><br>También te dice cuántos clientes hace 30 días que no vuelven, con un botón para escribirles por WhatsApp, y quiénes cumplen años.<br><br><strong style="color:#111311">El primero te llega el lunes 26 de octubre.</strong> Si no lo querés, lo apagás en Ajustes, en tu panel.</div>
  </div></td></tr>
  <tr><td style="padding:12px 0 0"><div style="border:1px solid #e2e5e0;border-radius:12px;padding:16px">
    <div style="font-size:15px;font-weight:600;color:#111311">🔔 "¡Te falta 1 punto!"</div>
    <div style="font-size:14px;color:#656a65;margin-top:6px;line-height:1.55">Cuando a un cliente le falta un punto para su premio, su tarjeta en Apple Wallet o Google Wallet le avisa en el celular: <em>"Una visita más y te llevás tu premio"</em>. Es el empujón que más hace volver.</div>
  </div></td></tr>
  <tr><td style="padding-top:20px"><a href="${urlPanel}" style="display:inline-block;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;background:#111311;color:#ffffff">Ir a mi panel</a></td></tr>
  <tr><td style="padding-top:20px;font-size:14px;color:#656a65;line-height:1.55">Cualquier duda, respondé este mail y te contestamos.<br><br>Gracias por confiar en Point,<br><strong style="color:#111311">El equipo de Point</strong></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:16px 8px;font-size:12px;color:#949994;text-align:center;line-height:1.5">Te llega porque gestionás un local en Point.</td></tr></table>
</td></tr></table></body></html>`;
  return { asunto, html, texto };
}
