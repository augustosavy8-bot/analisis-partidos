import "server-only";
import { cache } from "react";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { suscripcionVigente } from "./comercio";
import { configFacturacion } from "./catalogo";
import { calcularAcceso, dentroDelLimite, puedeUsar, type Acceso, type Funcion, type Limite } from "./acceso";

/**
 * Acceso del comercio dueño de un local. Se calcula SIEMPRE en el servidor a
 * partir de la base (plan + estado de la suscripción). El navegador sólo ve el
 * resultado; nunca lo decide.
 */
export const accesoDelLocal = cache(async (localId: string): Promise<Acceso> => {
  const { data: local } = await crearClienteAdmin().from("locales").select("comercio_id").eq("id", localId).single();
  if (!local) return calcularAcceso(null, { diasGracia: 0, diasSumarTrasGracia: 0 });
  const [s, cfg] = await Promise.all([suscripcionVigente(local.comercio_id), configFacturacion()]);
  return calcularAcceso(
    s && {
      estado: s.estado,
      limites: s.limites,
      planNombre: s.planNombre,
      pastDueDesde: s.pastDueDesde,
      currentPeriodEnd: s.currentPeriodEnd,
      cortesiaHasta: s.cortesiaHasta,
    },
    cfg,
  );
});

const MENSAJES: Record<Funcion, string> = {
  sumar_puntos: "El programa de puntos está pausado.",
  canjear: "",
  crear_premio: "Tu cuenta está restringida: regularizá el pago en Facturación para crear premios.",
  editar_programa: "Tu cuenta está restringida: regularizá el pago en Facturación para editar el programa.",
  promos: "Las promos están incluidas en el plan Pro.",
  mensajes: "Los mensajes a clientes están incluidos en el plan Pro.",
  estadisticas: "Tu cuenta está restringida: regularizá el pago en Facturación para ver estadísticas.",
  estadisticas_avanzadas: "Las estadísticas avanzadas están incluidas en el plan Pro.",
};

/** Para server actions: null si puede, o el mensaje para mostrarle al comercio. */
export async function exigirFuncion(localId: string, f: Funcion): Promise<string | null> {
  const a = await accesoDelLocal(localId);
  if (puedeUsar(a, f)) return null;
  if (a.nivel === "sin_suscripcion") return "Activá tu cuenta en Facturación para usar esta función.";
  return MENSAJES[f];
}

/** Para server actions: null si `cantidad` entra en el plan, o el mensaje con el límite. */
export async function exigirLimite(localId: string, l: Limite, cantidad: number): Promise<string | null> {
  const a = await accesoDelLocal(localId);
  if (dentroDelLimite(a, l, cantidad)) return null;
  const max = a.limites?.[l];
  const nombres = { locales: "locales", clientes: "clientes", premios: "premios activos" };
  return max != null ? `Tu plan ${a.planNombre ?? ""} incluye hasta ${max} ${nombres[l]}. Pasá a Pro para tener más.` : "Activá tu cuenta en Facturación.";
}
