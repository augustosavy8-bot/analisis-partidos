import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/** Tope de mensajes escritos con IA por local y por día (cada uno cuesta plata de la API). */
const IA_USOS_POR_DIA = 20;

export type ContextoMensajeIA = {
  local: string;
  rubro: string | null;
  /** Días sin venir (segmento "inactivos"). */
  dias: number;
  cantidad: number;
  premios: { nombre: string; puntos: number }[];
  promos: string[];
  /** Instrucción opcional del dueño ("ofreceles un 2x1", "tono más formal"). */
  pedido: string | null;
};

const SISTEMA = `Escribís mensajes de WhatsApp cortos para que el dueño de un comercio en Argentina se los mande a clientes de su programa de puntos que hace tiempo no van.

Reglas:
- Español rioplatense, cálido y natural, como lo escribiría el dueño. Tuteo con "vos".
- Máximo 3 oraciones y 350 caracteres. Un emoji como mucho.
- Es una plantilla: usá estos marcadores tal cual, que el sistema reemplaza por cada cliente: {nombre} (nombre del cliente), {puntos} (sus puntos), {premio} (su próximo premio), {faltan} (cuántos puntos le faltan, ya dice "N puntos"), {local} (nombre del local), {link} (link a su tarjeta). Usá siempre {nombre} y terminá con {link}. No inventes otros marcadores.
- No prometas descuentos, regalos ni promociones que no estén en los datos o en el pedido del dueño.
- Respondé solo con el texto del mensaje, sin comillas ni explicaciones.`;

/** ¿Ya usó el tope de hoy? */
async function iaUsosHoy(localId: string): Promise<number> {
  const desde = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await crearClienteAdmin()
    .from("ia_usos")
    .select("id", { count: "exact", head: true })
    .eq("local_id", localId)
    .gte("created_at", desde);
  return count ?? 0;
}

/**
 * Le pide a Claude una plantilla de mensaje para los clientes que no vienen hace
 * `dias` días. Devuelve la plantilla (con {nombre}, {link}, etc.) o un error.
 */
export async function redactarMensajeReactivar(localId: string, c: ContextoMensajeIA): Promise<{ texto: string } | { error: string }> {
  if (!env.iaConfigurada) return { error: "La IA todavía no está configurada." };
  // Se reserva el uso ANTES de llamar (y cuenta aunque falle): muchos pedidos en
  // paralelo ya no pasan todos el límite.
  const admin = crearClienteAdmin();
  const { data: uso } = await admin.from("ia_usos").insert({ local_id: localId, tipo: "reactivar", tokens_in: 0, tokens_out: 0 }).select("id").single();
  if (!uso) return { error: "No pudimos escribir el mensaje. Probá de nuevo." };
  if ((await iaUsosHoy(localId)) > IA_USOS_POR_DIA) {
    await admin.from("ia_usos").delete().eq("id", uso.id);
    return { error: `Llegaste al máximo de ${IA_USOS_POR_DIA} mensajes con IA por día. Probá mañana.` };
  }

  const datos = [
    `Local: ${c.local}${c.rubro ? ` (${c.rubro})` : ""}`,
    `A quiénes: ${c.cantidad} clientes que no vienen hace ${c.dias} días o más.`,
    c.premios.length
      ? `Premios del programa: ${c.premios.map((p) => `${p.nombre} (${p.puntos} puntos)`).join(", ")}.`
      : "El local todavía no tiene premios cargados (no menciones {premio} ni {faltan}).",
    c.promos.length ? `Promos activas: ${c.promos.join("; ")}.` : "No hay promos activas.",
    c.pedido ? `Pedido del dueño: ${c.pedido}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic();
  try {
    const r = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1000,
      // Pedido simple: poco razonamiento (más rápido y barato).
      output_config: { effort: "low" },
      // Si el modelo declina por política, el pedido sigue en otro modelo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SISTEMA,
      messages: [{ role: "user", content: `Escribí el mensaje con estos datos:\n${datos}` }],
    });
    if (r.stop_reason === "refusal") return { error: "La IA no pudo escribir este mensaje. Probá con otro pedido." };
    const texto = r.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .replace(/^["“]|["”]$/g, "");
    if (!texto) return { error: "La IA no devolvió un mensaje. Probá de nuevo." };
    await admin.from("ia_usos").update({ tokens_in: r.usage.input_tokens, tokens_out: r.usage.output_tokens }).eq("id", uso.id);
    return { texto: texto.slice(0, 700) };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { error: "La IA está saturada. Probá en un minuto." };
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("IA: clave inválida", e.message);
      return { error: "La IA no está bien configurada." };
    }
    if (e instanceof Anthropic.APIError) {
      console.error("IA: error de la API", e.status, e.message);
      return { error: "No pudimos escribir el mensaje. Probá de nuevo." };
    }
    console.error("IA: error", e);
    return { error: "No pudimos escribir el mensaje. Probá de nuevo." };
  }
}
