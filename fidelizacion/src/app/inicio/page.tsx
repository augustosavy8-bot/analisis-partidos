import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { clienteActual } from "@/lib/sesion-cliente";
import { datosInicio } from "@/lib/inicio";
import { HomeTarjetas } from "./HomeTarjetas";
import s from "./inicio.module.css";

export const metadata: Metadata = {
  title: "Mis tarjetas · Point",
  robots: { index: false },
  appleWebApp: { capable: true, title: "Point", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0b0c0b", viewportFit: "cover" };

/** Home del cliente: todas sus tarjetas Point en este celular. */
export default async function Inicio() {
  const cliente = await clienteActual();
  const datos = cliente ? await datosInicio(cliente.clienteId) : null;

  if (!cliente || !datos?.tarjetas.length) {
    return (
      <div className={s.app}>
        <header className={s.header}>
          <div className={`${s.columna} ${s.vacioHeader}`}>
            <h1 className={s.vacioTitulo}>{cliente ? `Hola ${cliente.nombre.split(" ")[0]}` : "Tus tarjetas Point"}</h1>
            <p className={s.vacioTexto}>
              Todavía no tenés tarjetas en este celular. Acercalo al llavero Point de un local adherido y tu primera tarjeta aparece acá.
            </p>
          </div>
        </header>
        {!cliente && (
          <p className={`${s.columna} ${s.movimientos}`}>
            <Link href="/recuperar" className="font-semibold text-pt-accent-ink underline underline-offset-4">
              Ya tengo tarjetas en otro celular
            </Link>
          </p>
        )}
      </div>
    );
  }

  return <HomeTarjetas nombre={cliente.nombre} tarjetas={datos.tarjetas} movimientos={datos.movimientos} />;
}
