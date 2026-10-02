import { env } from "@/lib/env";
import { cuentaMp } from "@/lib/facturacion/mp";
import { Tarjeta } from "@/components/Panel";

/**
 * Chequeo de configuración de pagos: en qué modo está MP (prueba o real) y qué
 * variables faltan. Sirve para el paso a producción (ver PRODUCCION.md).
 */
export async function EstadoConfig() {
  let cuenta: Awaited<ReturnType<typeof cuentaMp>> | null = null;
  let errorMp: string | null = null;
  if (env.mpConfigurado) {
    try {
      cuenta = await cuentaMp();
    } catch (e) {
      errorMp = e instanceof Error ? e.message : String(e);
    }
  }
  const items: [string, boolean, string][] = [
    ["Credenciales de Mercado Pago", env.mpConfigurado && !errorMp, errorMp ?? (env.mpConfigurado ? "Cargadas" : "Faltan MP_ACCESS_TOKEN / NEXT_PUBLIC_MP_PUBLIC_KEY")],
    ["Clave de webhooks", Boolean(process.env.MP_WEBHOOK_SECRET), process.env.MP_WEBHOOK_SECRET ? "Cargada" : "Falta MP_WEBHOOK_SECRET"],
    ["Clave del cron", Boolean(process.env.CRON_SECRET), process.env.CRON_SECRET ? "Cargada" : "Falta CRON_SECRET"],
    ["URL pública", env.appUrl.startsWith("https://"), env.appUrl],
  ];
  const real = cuenta && !cuenta.esPrueba;
  return (
    <Tarjeta className={`mb-5 ${real ? "" : "border-amber-300 bg-amber-50"}`}>
      <p className="font-medium">
        {cuenta ? (real ? "Modo real: los cobros son de verdad" : "Modo prueba: los cobros NO son reales") : "Mercado Pago sin conectar"}
        {cuenta?.nickname && <span className="ml-2 text-sm font-normal text-stone-500">cuenta {cuenta.nickname}</span>}
      </p>
      <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        {items.map(([nombre, ok, detalle]) => (
          <li key={nombre}>
            <span className={ok ? "text-emerald-700" : "text-red-700"}>{ok ? "✓" : "✗"}</span> {nombre}: <span className="text-stone-500">{detalle}</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
