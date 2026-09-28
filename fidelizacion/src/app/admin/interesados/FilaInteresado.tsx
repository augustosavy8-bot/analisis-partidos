"use client";

import { useTransition } from "react";
import { cambiarEstadoInteresado } from "./actions";
import { linkWhatsapp } from "@/lib/reactivar";

type Interesado = {
  id: number;
  nombre: string;
  local: string;
  rubro: string;
  ciudad: string | null;
  whatsapp: string;
  mensaje: string | null;
  estado: "nuevo" | "contactado" | "descartado";
  fecha: string;
  whatsappLindo: string;
};

const ESTILO = {
  nuevo: "bg-orange-100 text-orange-800",
  contactado: "bg-emerald-100 text-emerald-800",
  descartado: "bg-stone-100 text-stone-500",
};

export function FilaInteresado({ i }: { i: Interesado }) {
  const [pendiente, start] = useTransition();
  const texto = `¡Hola ${i.nombre.split(" ")[0]}! Te escribo de Point por ${i.local}. ¿Cuándo te queda cómodo que te muestre cómo funciona?`;
  return (
    <li className={`flex flex-wrap items-start gap-3 px-4 py-4 ${i.estado === "descartado" ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {i.local} <span className="font-normal text-stone-500">· {i.nombre}</span>
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${ESTILO[i.estado]}`}>{i.estado}</span>
        </p>
        <p className="text-sm text-stone-500">
          {i.rubro}
          {i.ciudad && ` · ${i.ciudad}`} · {i.whatsappLindo} · {i.fecha}
        </p>
        {i.mensaje && <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">“{i.mensaje}”</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={linkWhatsapp(i.whatsapp, texto)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => i.estado === "nuevo" && start(() => cambiarEstadoInteresado(i.id, "contactado"))}
          className="rounded-lg bg-[#1fa855] px-3 py-2 text-sm font-semibold text-white"
        >
          WhatsApp
        </a>
        <select
          value={i.estado}
          disabled={pendiente}
          onChange={(e) => start(() => cambiarEstadoInteresado(i.id, e.target.value as Interesado["estado"]))}
          className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
          aria-label="Estado"
        >
          <option value="nuevo">Nuevo</option>
          <option value="contactado">Contactado</option>
          <option value="descartado">Descartado</option>
        </select>
      </div>
    </li>
  );
}
