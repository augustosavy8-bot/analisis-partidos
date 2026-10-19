import Link from "next/link";
import { requerirSuperadmin } from "@/lib/admin";
import { env } from "@/lib/env";
import { Tarjeta, Titulo } from "@/components/Panel";
import { esIdMailDueno, MAILS_DUENOS, type IdMailDueno } from "@/lib/anuncio";
import { contarDestinatarios } from "./actions";
import { BotonesAnuncio } from "./Botones";

export const metadata = { title: "Mails a dueños" };

export default async function Anuncio({ searchParams }: PageProps<"/admin/anuncio">) {
  const { email } = await requerirSuperadmin();
  const { m } = await searchParams;
  const id: IdMailDueno = esIdMailDueno(m) ? m : "bienvenida";
  const destinatarios = await contarDestinatarios();
  const mail = MAILS_DUENOS[id].armar(`${env.appUrl}/panel`);
  return (
    <>
      <Titulo detalle="Probalo primero con tu mail; después mandalo a los dueños.">Mails a los dueños</Titulo>
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(MAILS_DUENOS) as IdMailDueno[]).map((k) => (
          <Link
            key={k}
            href={`/admin/anuncio?m=${k}`}
            className={`rounded-full px-4 py-1.5 text-sm ${k === id ? "bg-stone-900 text-white" : "ring-1 ring-stone-300 hover:bg-stone-50"}`}
          >
            {MAILS_DUENOS[k].nombre}
          </Link>
        ))}
      </div>
      <Tarjeta className="space-y-4">
        <p className="text-sm text-stone-600">
          Asunto: <strong className="text-stone-900">{mail.asunto}</strong>
          <br />
          Sale desde la dirección de MAIL_DESDE{env.mail?.responderA ? "; las respuestas llegan a MAIL_RESPONDER_A" : ""}.
          {!env.mail && <span className="text-red-700"> Falta configurar Resend.</span>}
        </p>
        <BotonesAnuncio key={id} id={id} destinatarios={destinatarios} email={email} />
      </Tarjeta>
      <Tarjeta className="mt-4 !p-0 overflow-hidden">
        <iframe title="Vista previa" srcDoc={mail.html} className="h-[900px] w-full border-0" sandbox="" />
      </Tarjeta>
    </>
  );
}
