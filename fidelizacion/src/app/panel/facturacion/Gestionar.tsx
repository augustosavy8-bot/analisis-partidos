"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { Boton } from "@/components/app/Boton";
import { avisar } from "@/components/app/Toasts";
import { confirmar } from "@/components/app/Dialogos";
import { cambiarTarjeta, gestionarSuscripcion, reportarErrorBrick, type AccionSuscripcion } from "./actions";

let mpIniciado = false;

/**
 * Botones para gestionar la suscripción: cambiar la tarjeta, pausar, reactivar
 * y cancelar. Lo que se puede hacer en cada estado lo vuelve a validar el servidor.
 */
export function Gestionar({
  comercioId,
  estado,
  publicKey,
  precioCentavos,
  payerEmail,
  finPeriodo,
}: {
  comercioId: string;
  estado: string;
  publicKey: string;
  precioCentavos: number;
  payerEmail: string | null;
  /** Hasta cuándo tiene pago (texto ya formateado), para explicar qué pasa al pausar o cancelar. */
  finPeriodo: string | null;
}) {
  const [pendiente, iniciar] = useTransition();
  const [tarjeta, setTarjeta] = useState(false);

  async function ejecutar(accion: AccionSuscripcion) {
    const textos: Record<AccionSuscripcion, { titulo: string; texto: string; confirmar: string; peligro?: boolean }> = {
      pausar: {
        titulo: "¿Pausar tu suscripción?",
        texto: `No se te cobra mientras esté pausada.${finPeriodo ? ` Todo sigue igual hasta el ${finPeriodo};` : ""} después el panel queda restringido (tus clientes siguen sumando y canjeando). La reactivás cuando quieras.`,
        confirmar: "Pausar",
      },
      reactivar: { titulo: "¿Reactivar tu suscripción?", texto: "Se vuelve a cobrar el débito mensual con tu tarjeta.", confirmar: "Reactivar" },
      cancelar: {
        titulo: "¿Cancelar tu suscripción?",
        texto: `No se te va a cobrar más.${finPeriodo && estado !== "past_due" && estado !== "paused" ? ` Todo sigue funcionando hasta el ${finPeriodo}.` : ""} Después tus clientes no van a poder sumar puntos, pero sí canjear los que ya tienen. Para volver, tenés que suscribirte de nuevo.`,
        confirmar: "Cancelar suscripción",
        peligro: true,
      },
    };
    const t = textos[accion];
    if (!(await confirmar({ titulo: t.titulo, texto: t.texto, confirmar: t.confirmar, cancelar: "Volver", peligro: t.peligro }))) return;
    iniciar(async () => {
      const r = await gestionarSuscripcion({ comercioId, accion });
      avisar(r.ok ? r.mensaje : r.error, r.ok ? "ok" : "error");
    });
  }

  const activa = ["pending", "trialing", "authorized", "past_due", "paused"].includes(estado);
  if (!activa) return null;

  return (
    <div className="grid gap-3">
      {tarjeta ? (
        <CambiarTarjeta
          comercioId={comercioId}
          publicKey={publicKey}
          precioCentavos={precioCentavos}
          payerEmail={payerEmail}
          alTerminar={() => setTarjeta(false)}
        />
      ) : (
        <Boton variante={estado === "past_due" ? "primario" : "secundario"} onClick={() => setTarjeta(true)} disabled={pendiente}>
          Cambiar la tarjeta
        </Boton>
      )}
      <div className="flex flex-wrap gap-2">
        {estado === "paused" && (
          <Boton variante="primario" tamaño="sm" pendiente={pendiente} onClick={() => ejecutar("reactivar")}>
            Reactivar
          </Boton>
        )}
        {estado === "authorized" && (
          <Boton variante="secundario" tamaño="sm" disabled={pendiente} onClick={() => ejecutar("pausar")}>
            Pausar
          </Boton>
        )}
        <Boton variante="fantasma" tamaño="sm" disabled={pendiente} onClick={() => ejecutar("cancelar")}>
          Cancelar suscripción
        </Boton>
      </div>
    </div>
  );
}

function CambiarTarjeta({
  comercioId,
  publicKey,
  precioCentavos,
  payerEmail,
  alTerminar,
}: {
  comercioId: string;
  publicKey: string;
  precioCentavos: number;
  payerEmail: string | null;
  alTerminar: () => void;
}) {
  const [intento, setIntento] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const enviando = useRef(false);

  useEffect(() => {
    if (!mpIniciado) {
      initMercadoPago(publicKey, { locale: "es-AR" });
      mpIniciado = true;
    }
  }, [publicKey]);

  async function alEnviar(formData: { token: string }) {
    if (enviando.current) return;
    enviando.current = true;
    setError(null);
    try {
      const r = await cambiarTarjeta({ comercioId, token: formData.token });
      if (r.ok) {
        avisar(r.mensaje);
        alTerminar();
        return;
      }
      setError(r.error);
      setIntento((n) => n + 1); // el token es de un solo uso: formulario nuevo
    } finally {
      enviando.current = false;
    }
  }

  return (
    <div className="rounded-pt-card bg-pt-pure p-4 ring-1 ring-inset ring-pt-border">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[15px] font-semibold text-pt-ink">Tarjeta nueva</p>
        <button type="button" onClick={alTerminar} className="text-[13px] font-semibold text-pt-ink-2 underline underline-offset-2">
          Volver
        </button>
      </div>
      {error && (
        <p className="mb-3 rounded-pt-sm bg-red-50 px-4 py-3 text-[14px] text-red-800" role="alert">
          {error}
        </p>
      )}
      <CardPayment
        key={intento}
        locale="es-AR"
        initialization={{ amount: precioCentavos / 100, ...(payerEmail ? { payer: { email: payerEmail } } : {}) }}
        customization={{
          paymentMethods: { maxInstallments: 1 }, // crédito, débito y prepagas
          visual: { texts: { formSubmit: "Usar esta tarjeta" } },
        }}
        onError={(e) => {
              console.error("Brick de tarjeta", e);
              void reportarErrorBrick({ type: e?.type, cause: e?.cause, message: e?.message });
            }}
        onSubmit={alEnviar}
      />
      <p className="mt-2 text-center text-[12px] text-pt-ink-3">Hoy no se cobra nada: la tarjeta nueva se usa en el próximo débito.</p>
    </div>
  );
}
