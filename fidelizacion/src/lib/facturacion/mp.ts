import "server-only";
import { Invoice, MercadoPagoConfig, Payment, PreApproval, PreApprovalPlan, Preference } from "mercadopago";
import { env } from "@/lib/env";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { centavosAPesos } from "./dinero";

/**
 * Único punto de contacto con la API de Mercado Pago. Todo lo que habla con MP
 * pasa por acá: así es fácil ver qué llamadas hacemos y con qué datos.
 */
function config() {
  // timeout: si MP tarda, preferimos cortar y reintentar antes que colgar la request.
  return new MercadoPagoConfig({ accessToken: env.mpAccessToken, options: { timeout: 15000 } });
}

type PlanDb = {
  id: string;
  nombre: string;
  precio_centavos: number;
  dias_prueba: number;
  mp_preapproval_plan_id: string | null;
};

/**
 * Devuelve el `preapproval_plan` de MP de un plan nuestro; si todavía no existe
 * lo crea (con el precio y los días de prueba de la base) y guarda su id.
 * La fuente de verdad del precio es nuestra base; MP recibe una copia.
 */
export async function asegurarPlanMp(plan: PlanDb): Promise<string> {
  if (plan.mp_preapproval_plan_id) {
    // Si cambiaron las credenciales (otra cuenta de MP), el plan guardado no existe
    // en la cuenta nueva: lo volvemos a crear en vez de fallar.
    try {
      await new PreApprovalPlan(config()).get({ preApprovalPlanId: plan.mp_preapproval_plan_id });
      return plan.mp_preapproval_plan_id;
    } catch (e) {
      // 404 (no existe) o 403 (es de otra cuenta): hay que crearlo de nuevo.
      if (!esNoEncontradoMp(e) && (e as { status?: number })?.status !== 403) throw e;
    }
  }

  const creado = await new PreApprovalPlan(config()).create({
    body: {
      reason: `Point ${plan.nombre}`,
      back_url: `${env.appUrl}/panel/facturacion`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: centavosAPesos(plan.precio_centavos),
        currency_id: "ARS",
        ...(plan.dias_prueba > 0 ? { free_trial: { frequency: plan.dias_prueba, frequency_type: "days" } } : {}),
      },
    },
    // Si la red se corta y reintentamos, MP no crea un segundo plan con la misma clave.
    requestOptions: { idempotencyKey: `plan-${plan.id}-${plan.precio_centavos}-${plan.dias_prueba}` },
  });
  if (!creado.id) throw new Error("Mercado Pago no devolvió el id del plan");

  // Guardamos sólo si nadie lo guardó antes (dos altas simultáneas del primer suscriptor).
  const db = crearClienteAdmin();
  const anterior = plan.mp_preapproval_plan_id;
  const cambio = db.from("planes").update({ mp_preapproval_plan_id: creado.id }).eq("id", plan.id);
  await (anterior ? cambio.eq("mp_preapproval_plan_id", anterior) : cambio.is("mp_preapproval_plan_id", null));
  const { data } = await db.from("planes").select("mp_preapproval_plan_id").eq("id", plan.id).single();
  return data?.mp_preapproval_plan_id ?? creado.id;
}

/**
 * Crea la suscripción en MP con la tarjeta tokenizada en el navegador.
 * `external_reference` = id del comercio: es lo que nos permite, desde un
 * webhook o una búsqueda, saber de quién es una suscripción aunque perdamos
 * todo lo demás.
 */
export async function crearSuscripcionMp(p: {
  planMpId: string;
  comercioId: string;
  reason: string;
  payerEmail: string;
  cardToken: string;
}) {
  return new PreApproval(config()).create({
    body: {
      preapproval_plan_id: p.planMpId,
      reason: p.reason,
      external_reference: p.comercioId,
      payer_email: p.payerEmail,
      card_token_id: p.cardToken,
      back_url: `${env.appUrl}/panel/facturacion`,
      status: "authorized",
    },
    // Un token de tarjeta sirve una sola vez; la clave evita duplicar si reintentamos la misma request.
    requestOptions: { idempotencyKey: `alta-${p.comercioId}-${p.cardToken}` },
  });
}

/**
 * Cambia una suscripción en MP: pausar (`paused`), reactivar (`authorized`),
 * cancelar (`cancelled`, irreversible) o cambiar la tarjeta (`card_token_id`).
 */
export async function actualizarSuscripcionMp(
  id: string,
  body: {
    status?: "paused" | "authorized" | "cancelled";
    card_token_id?: string;
    /** Cambio de plan: el monto de los próximos débitos (MP le avisa al pagador por email). */
    auto_recurring?: { transaction_amount: number; currency_id: "ARS" };
  },
) {
  return new PreApproval(config()).update({ id, body });
}

export async function obtenerSuscripcionMp(id: string) {
  return new PreApproval(config()).get({ id });
}

/** Cuota de una suscripción ("authorized payment" / factura). */
export async function obtenerCuotaMp(id: string) {
  return new Invoice(config()).get({ id });
}

export async function obtenerPagoMp(id: string) {
  return new Payment(config()).get({ id });
}

/** ¿El error de MP es "ese recurso no existe"? (ids de prueba, recursos de otra cuenta) */
export function esNoEncontradoMp(e: unknown): boolean {
  const x = e as { status?: number; message?: string } | null;
  return x?.status === 404 || /not.?found|no encontrad/i.test(x?.message ?? "");
}

/**
 * Checkout Pro para un pedido del kit: el comercio paga en la página de MP
 * (tarjeta, dinero en cuenta, etc.) y vuelve a /panel/kit/resultado.
 *  - external_reference = id del pedido: así el pago se asocia aunque se pierda todo lo demás.
 *  - binary_mode: aprobado o rechazado al instante, sin "pendiente" (un Rapipago
 *    que se paga en 3 días no sirve con una reserva de stock de 30 minutos).
 *  - expiration_date_to = fin de la reserva: después MP no deja pagar ese link.
 */
export async function crearPreferenciaMp(p: {
  pedidoId: string;
  numero: number;
  items: { codigo: string; nombre: string; cantidad: number; precioCentavos: number }[];
  envioCentavos: number;
  email: string | null;
  reservaHasta: string;
}) {
  const vuelta = `${env.appUrl}/panel/kit/resultado?pedido=${p.pedidoId}`;
  const items = p.items.map((i) => ({
    id: i.codigo,
    title: i.nombre,
    quantity: i.cantidad,
    unit_price: centavosAPesos(i.precioCentavos),
    currency_id: "ARS",
  }));
  if (p.envioCentavos > 0) {
    items.push({ id: "envio", title: "Envío", quantity: 1, unit_price: centavosAPesos(p.envioCentavos), currency_id: "ARS" });
  }
  return new Preference(config()).create({
    body: {
      items,
      external_reference: p.pedidoId,
      ...(p.email ? { payer: { email: p.email } } : {}),
      back_urls: { success: vuelta, failure: vuelta, pending: vuelta },
      auto_return: "approved",
      binary_mode: true,
      payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 1 },
      notification_url: `${env.appUrl}/api/webhooks/mercadopago?source_news=webhooks`,
      statement_descriptor: "POINT",
      expires: true,
      expiration_date_to: p.reservaHasta,
      metadata: { pedido_numero: p.numero },
    },
    requestOptions: { idempotencyKey: `pedido-${p.pedidoId}` },
  });
}
