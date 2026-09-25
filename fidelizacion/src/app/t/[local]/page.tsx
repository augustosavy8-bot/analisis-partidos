import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { buscarLocal } from "@/lib/locales";
import { clienteActual } from "@/lib/sesion-cliente";
import {
  canjeAlToqueHasta,
  cumpleDelCliente,
  esReciente,
  premiosDelLocal,
  promosDelLocal,
  proximoPremio,
  tarjetaDelCliente,
} from "@/lib/tarjeta";
import { urlBilletera } from "@/lib/billetera";
import { promoVigente } from "@/lib/promos";
import { SinTarjeta, VistaTarjeta } from "./VistaTarjeta";

export async function generateMetadata({ params }: PageProps<"/t/[local]">): Promise<Metadata> {
  const { local: slug } = await params;
  const local = await buscarLocal(slug);
  if (!local) return {};
  return {
    title: `Mi tarjeta · ${local.nombre}`,
    manifest: `/t/${slug}/manifest.webmanifest`,
    icons: { icon: `/t/${slug}/icono?s=192`, apple: `/t/${slug}/icono?s=180` },
    appleWebApp: { capable: true, title: local.nombre, statusBarStyle: "default" },
  };
}

export default async function Tarjeta({ params, searchParams }: PageProps<"/t/[local]">) {
  const { local: slug } = await params;
  const sp = await searchParams;
  const local = await buscarLocal(slug);
  if (!local) notFound();

  const [cliente, premios, promos] = await Promise.all([clienteActual(), premiosDelLocal(local.id), promosDelLocal(local.id)]);
  const tarjeta = cliente ? await tarjetaDelCliente(cliente.clienteId, local.id) : null;

  if (!cliente || !tarjeta) return <SinTarjeta local={local} />;
  const cumple = local.puntos_cumple > 0 ? await cumpleDelCliente(cliente.clienteId) : null;
  const promoAhora = promoVigente(promos, local.zona_horaria);

  // Celebración: sólo si el movimiento es de esta tarjeta y reciente (no se puede falsear).
  const movId = typeof sp.m === "string" ? sp.m : null;
  const movCelebrado = movId
    ? tarjeta.movimientos.find((m) => m.id === movId && m.tipo !== "regalo" && esReciente(m.created_at))
    : undefined;
  const limite = typeof sp.limite === "string" && !isNaN(Date.parse(sp.limite)) ? sp.limite : null;

  const objetivo = proximoPremio(premios, tarjeta.puntos);
  const urlPase = urlBilletera(tarjeta.serial, tarjeta.wallet_auth_token);
  const qrPase = await QRCode.toString(urlPase, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  // Regalos entregados en el mismo toque (misma transacción => misma hora).
  const regalos = movCelebrado?.tipo === "suma"
    ? tarjeta.movimientos.filter((m) => m.tipo === "regalo" && m.created_at === movCelebrado.created_at)
    : [];

  let mensajeCelebracion = "";
  if (movCelebrado?.tipo === "suma" && objetivo) {
    const faltan = objetivo.puntos_necesarios - tarjeta.puntos;
    mensajeCelebracion =
      faltan > 0
        ? `Te ${faltan === 1 ? "falta 1 punto" : `faltan ${faltan} puntos`} para ${objetivo.nombre.toLowerCase()}.`
        : `¡Ya podés canjear ${objetivo.nombre.toLowerCase()}!`;
  } else if (movCelebrado?.tipo === "canje") {
    mensajeCelebracion = "Disfrutalo. ¡Gracias por venir!";
  }

  return (
    <VistaTarjeta
      local={local}
      nombre={cliente.nombre}
      tarjeta={tarjeta}
      premios={premios}
      promos={promos}
      promoAhora={promoAhora}
      objetivo={objetivo}
      alToque={!!canjeAlToqueHasta(tarjeta.ultimo_toque_en)}
      pedirCumple={local.puntos_cumple > 0 && !cumple}
      limite={limite}
      urlPase={urlPase}
      qrPase={qrPase}
      celebracion={
        movCelebrado
          ? {
              tipo: movCelebrado.tipo === "canje" ? "canje" : "suma",
              sumados: movCelebrado.puntos,
              promo: movCelebrado.detalle,
              premio: movCelebrado.premio,
              regalos: regalos.map((r) => ({ motivo: r.motivo === "cumple" ? "cumple" : "bienvenida", puntos: r.puntos })),
              mensaje: mensajeCelebracion,
            }
          : null
      }
    />
  );
}
