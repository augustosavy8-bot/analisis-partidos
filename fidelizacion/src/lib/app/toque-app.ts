import "server-only";
import { after } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { buscarLocal } from "@/lib/locales";
import { env } from "@/lib/env";
import { mensajeAviso } from "@/lib/avisos";
import { registrarRechazo } from "@/lib/rechazos";
import { validarEntradaToque } from "@/lib/entrada-toque";
import { aplicarToque, consumirToquePendiente, firmarToquePendiente, leerToquePendiente, type Toque } from "@/lib/toque";
import { celebracion, localApp, type RespuestaToqueApp } from "./contrato";
import { detalleTarjeta } from "./servidor";

/** Error del toque con el texto para el cliente (el mismo de /aviso en la web). */
export class ErrorToque extends Error {
  constructor(
    readonly motivo: string,
    readonly status = 422,
  ) {
    super(mensajeAviso(motivo).texto);
  }
  get titulo() {
    return mensajeAviso(this.motivo).titulo;
  }
}

/** Valida el chip o QR con el que se abrió la app (mismo código que /n en la web). */
export async function validarToqueApp(params: URLSearchParams): Promise<Toque> {
  const { chip, origen } = await validarEntradaToque(params);
  if (!chip.ok) {
    after(() => registrarRechazo({ motivo: chip.motivo, origen, localId: chip.localId, chipId: chip.chipId }));
    throw new ErrorToque(chip.motivo);
  }
  return chip.toque;
}

/** Sin sesión: la app le pide al cliente registrarse o entrar, con el toque firmado (15 min, un solo uso). */
export async function pedirRegistro(toque: Toque): Promise<RespuestaToqueApp> {
  const local = await buscarLocal(toque.localSlug);
  if (!local) throw new ErrorToque("local_inactivo");
  return { estado: "registro", toquePendiente: firmarToquePendiente(toque), local: localApp(local, env.appUrl) };
}

/** Toque pendiente firmado → toque (lo marca usado: un solo uso). */
export async function usarToquePendiente(firmado: unknown): Promise<Toque> {
  const t = typeof firmado === "string" ? leerToquePendiente(firmado) : null;
  if (!t || !(await consumirToquePendiente(t))) throw new ErrorToque("toque_vencido", 410);
  return t;
}

/** Aplica el toque a la tarjeta del cliente y arma la respuesta con la celebración. */
export async function aplicarToqueApp(clienteId: string, toque: Toque): Promise<RespuestaToqueApp> {
  const r = await aplicarToque(clienteId, toque);
  if (r.tipo === "error") {
    after(() => registrarRechazo({ motivo: r.motivo, origen: toque.origen, localId: toque.localId, chipId: toque.chipId }));
    throw new ErrorToque(r.motivo);
  }
  if (r.tipo === "limite") {
    after(() => registrarRechazo({ motivo: "limite", origen: toque.origen, localId: toque.localId, chipId: toque.chipId }));
  }
  const d = await detalleTarjeta(clienteId, toque.localSlug);
  if (!d) throw new ErrorToque("error", 500);
  if (r.tipo === "limite") return { estado: "aplicado", resultado: { tipo: "limite", proximoEn: r.proximoEn }, tarjeta: d.detalle };

  let premio: string | null = null;
  if (r.tipo === "canje") {
    const { data } = await crearClienteAdmin().from("movimientos").select("canjes(premios(nombre))").eq("id", r.movimientoId).maybeSingle();
    premio = (data?.canjes as unknown as { premios: { nombre: string } | null } | null)?.premios?.nombre ?? null;
  }
  return { estado: "aplicado", resultado: celebracion(d.detalle, r.movimientoId, r.tipo, premio), tarjeta: d.detalle };
}
