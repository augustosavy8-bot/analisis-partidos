"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { refresh } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { buscarLocal } from "@/lib/locales";
import { clienteActual } from "@/lib/sesion-cliente";
import { guardarCumpleCliente, MINUTOS_CANJE_AL_TOQUE } from "@/lib/tarjeta";
import { leerCumple } from "@/lib/promos";
import { notificarCambioTarjeta } from "@/lib/wallet";
import { comprobarPinMozo } from "@/lib/sesion-mozo";

async function tarjetaActual(slug: string) {
  const [local, cliente] = await Promise.all([buscarLocal(slug), clienteActual()]);
  if (!local || !cliente) return null;
  const db = crearClienteAdmin();
  const { data } = await db
    .from("tarjetas")
    .select("id, serial, local_id, created_at")
    .eq("cliente_id", cliente.clienteId)
    .eq("local_id", local.id)
    .maybeSingle();
  if (!data) return null;
  // Las tarjetas que se crearon desde este celular no piden PIN: sólo las que la cuenta ya tenía.
  const recienVinculado = cliente.recienVinculado && new Date(data.created_at) < new Date(cliente.vinculadoEn);
  return { ...data, recienVinculado };
}

export type RespuestaCanje = { requierePin?: { equipo: { id: string; nombre: string }[] }; error?: string } | undefined;

/**
 * Canje al toque. Con un chip de link fijo (modo prueba) la base pide además el PIN de alguien
 * del local: así nadie canjea abriendo un link guardado desde su casa.
 */
export async function solicitarCanje(slug: string, premioId: string, confirmacion?: { mozoId: string; pin: string }): Promise<RespuestaCanje> {
  const tarjeta = await tarjetaActual(slug);
  if (!tarjeta) redirect(`/t/${slug}`);
  const db = crearClienteAdmin();

  let mozoConfirmado: string | null = null;
  // Celular recién vinculado a una cuenta existente (recuperó la tarjeta con el
  // número): sin código por WhatsApp no sabemos si es el dueño, así que el canje
  // lo confirma alguien del local con su PIN.
  if (tarjeta.recienVinculado && !confirmacion) return pedirPin(db, tarjeta.local_id);
  if (confirmacion) {
    const r = await comprobarPinMozo(confirmacion.mozoId, confirmacion.pin.trim(), tarjeta.local_id);
    if (!r.ok) return { error: r.error };
    mozoConfirmado = r.mozo.id;
  }

  // Si acaban de apoyar el llavero, se canjea en el momento (un toque, una pestaña).
  const { data: alToque } = await db.rpc("canjear_al_toque", {
    p_tarjeta_id: tarjeta.id,
    p_premio_id: premioId,
    p_minutos: MINUTOS_CANJE_AL_TOQUE,
    p_mozo_confirmado: mozoConfirmado,
  });
  if (alToque?.ok) {
    after(() => notificarCambioTarjeta(tarjeta.serial));
    redirect(`/t/${slug}?m=${alToque.movimiento_id}`);
  }
  if (alToque?.motivo === "requiere_pin") return pedirPin(db, tarjeta.local_id);
  if (alToque?.motivo === "pin_invalido") return { error: "Esa persona no es de este local." };
  // El dueño desactivó el premio mientras el cliente tenía la tarjeta abierta: se recarga.
  if (alToque?.motivo === "premio_invalido") {
    refresh();
    return;
  }
  if (alToque && alToque.motivo !== "sin_toque") redirect(`/aviso?m=${alToque.motivo}&l=${encodeURIComponent(slug)}`);
  // Sin toque reciente no hay canje (ni canje pendiente): la pantalla vuelve a
  // pedir que apoyen el llavero.
  refresh();
}

async function pedirPin(db: ReturnType<typeof crearClienteAdmin>, localId: string): Promise<RespuestaCanje> {
  const { data: equipo } = await db
    .from("mozos")
    .select("id, nombre")
    .eq("local_id", localId)
    .eq("activo", true)
    .not("pin_hash", "is", null)
    .order("nombre");
  if (!equipo?.length) return { error: "Para canjear, el local tiene que crear un PIN para su equipo en el panel." };
  return { requierePin: { equipo } };
}

export type EstadoCumple = { error?: string; ok?: boolean };

export async function guardarCumple(slug: string, _prev: EstadoCumple, form: FormData): Promise<EstadoCumple> {
  const cliente = await clienteActual();
  if (!cliente) redirect(`/t/${slug}`);
  const cumple = leerCumple(form);
  if (!cumple || cumple === "invalido") return { error: "Elegí un día y un mes válidos." };
  if (!(await guardarCumpleCliente(cliente.clienteId, cumple.dia, cumple.mes))) {
    return { error: "Tu cumple ya estaba cargado." };
  }
  refresh();
  return { ok: true };
}
