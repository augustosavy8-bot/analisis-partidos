import "server-only";
import { env } from "@/lib/env";

export type Mail = {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  /** Link de baja: Gmail y Outlook muestran "Desuscribirse" (one-click, RFC 8058). */
  baja?: string;
  /** Misma clave = Resend no lo manda dos veces (24 hs). */
  idempotencia?: string;
};

/** Manda un mail con Resend. Devuelve false si no está configurado o falló (nunca lanza). */
export async function enviarMail(m: Mail): Promise<boolean> {
  const cfg = env.mail;
  if (!cfg) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        ...(m.idempotencia ? { "Idempotency-Key": m.idempotencia } : {}),
      },
      body: JSON.stringify({
        from: cfg.desde,
        to: [m.para],
        subject: m.asunto,
        html: m.html,
        text: m.texto,
        ...(m.baja ? { headers: { "List-Unsubscribe": `<${m.baja}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
      }),
    });
    if (!res.ok) {
      console.error("Mail: Resend respondió", res.status, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Mail: no se pudo enviar", e instanceof Error ? e.message : e);
    return false;
  }
}
