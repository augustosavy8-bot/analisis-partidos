import { requerirSuperadmin } from "@/lib/admin";
import { env } from "@/lib/env";
import { Tarjeta, Titulo } from "@/components/Panel";
import { armarMailAnuncio } from "@/lib/anuncio";
import { contarDestinatarios } from "./actions";
import { BotonesAnuncio } from "./Botones";

export const metadata = { title: "Anuncio" };

export default async function Anuncio() {
  const { email } = await requerirSuperadmin();
  const destinatarios = await contarDestinatarios();
  const mail = armarMailAnuncio(`${env.appUrl}/panel`);
  return (
    <>
      <Titulo detalle="Novedades de octubre: resumen de los lunes y aviso de “te falta 1 punto”.">Anuncio a los dueños</Titulo>
      <Tarjeta className="space-y-4">
        <p className="text-sm text-stone-600">
          Asunto: <strong className="text-stone-900">{mail.asunto}</strong>
          <br />
          Sale desde la dirección de MAIL_DESDE{env.mail?.responderA ? "; las respuestas llegan a MAIL_RESPONDER_A" : ""}.
          {!env.mail && <span className="text-red-700"> Falta configurar Resend.</span>}
        </p>
        <BotonesAnuncio destinatarios={destinatarios} email={email} />
      </Tarjeta>
      <Tarjeta className="mt-4 !p-0 overflow-hidden">
        <iframe title="Vista previa" srcDoc={mail.html} className="h-[900px] w-full border-0" sandbox="" />
      </Tarjeta>
    </>
  );
}
