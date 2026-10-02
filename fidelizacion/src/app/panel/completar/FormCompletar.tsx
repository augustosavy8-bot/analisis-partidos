"use client";

import { useActionState, useState } from "react";
import { completarComercio, type EstadoCompletar } from "./actions";
import { RUBROS } from "@/lib/interes";
import { CONDICIONES_FISCALES } from "@/lib/facturacion/registro";
import { BotonMarca, Campo, ErrorForm } from "@/components/Campo";
import { EtiquetaCampo, claseInput } from "@/components/app/Campos";

export function FormCompletar({ plan }: { plan: string | null }) {
  const [estado, accion, pendiente] = useActionState<EstadoCompletar, FormData>(completarComercio, {});
  const [fiscales, setFiscales] = useState(false);
  const v = estado.valores ?? {};
  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="plan" value={plan ?? ""} />
      <Campo etiqueta="Nombre de tu local" name="comercio" required maxLength={60} defaultValue={v.comercio} />
      <label className="block">
        <EtiquetaCampo>Rubro</EtiquetaCampo>
        <select name="rubro" required defaultValue={v.rubro ?? ""} className={claseInput}>
          <option value="" disabled>
            Elegí uno
          </option>
          {RUBROS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => setFiscales((x) => !x)} aria-expanded={fiscales} className="text-[14px] font-semibold text-pt-ink underline underline-offset-4">
        {fiscales ? "Ocultar datos fiscales" : "Agregar datos fiscales (opcional)"}
      </button>
      {fiscales && (
        <div className="space-y-5">
          <Campo etiqueta="Razón social" name="razon_social" maxLength={120} defaultValue={v.razon_social} />
          <Campo etiqueta="CUIT" name="cuit" inputMode="numeric" maxLength={13} defaultValue={v.cuit} ayuda="11 números, con o sin guiones." />
          <label className="block">
            <EtiquetaCampo>Condición fiscal</EtiquetaCampo>
            <select name="condicion_fiscal" defaultValue={v.condicion_fiscal ?? ""} className={claseInput}>
              <option value="">Elegí una</option>
              {Object.entries(CONDICIONES_FISCALES).map(([k, n]) => (
                <option key={k} value={k}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <ErrorForm mensaje={estado.error} />
      <BotonMarca type="submit" pendiente={pendiente}>
        Crear mi comercio
      </BotonMarca>
    </form>
  );
}
