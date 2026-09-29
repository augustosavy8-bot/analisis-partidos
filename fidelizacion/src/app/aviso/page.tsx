import { BotonLink } from "@/components/app/Boton";

export const metadata = { title: "Aviso" };

const MENSAJES: Record<string, { titulo: string; texto: string }> = {
  chip_invalido: {
    titulo: "No reconocimos este llavero",
    texto: "Puede que el llavero no esté dado de alta. Avisale a quien te atiende.",
  },
  chip_sin_mozo: {
    titulo: "Este llavero no está asignado",
    texto: "El local tiene que asignarlo a alguien de su equipo antes de usarlo.",
  },
  modo_prueba_off: {
    titulo: "Llavero de prueba",
    texto: "Este llavero es de prueba y ya no se puede usar para sumar puntos.",
  },
  local_inactivo: {
    titulo: "Local no disponible",
    texto: "Este local no está sumando puntos en este momento.",
  },
  toque_vencido: {
    titulo: "Pasó mucho tiempo",
    texto: "Pedile a quien te atiende que vuelva a apoyar el llavero en tu celular.",
  },
  canje_expirado: {
    titulo: "El canje venció",
    texto: "Volvé a tocar “Canjear” en tu tarjeta y pedile a quien te atiende que apoye el llavero.",
  },
  sun_invalido: {
    titulo: "No pudimos leer el llavero",
    texto: "Pedile a quien te atiende que lo vuelva a apoyar en tu celular.",
  },
  sun_cmac: {
    titulo: "Llavero no válido",
    texto: "La firma del llavero no coincide. Avisale a quien te atiende.",
  },
  sun_repetido: {
    titulo: "Este toque ya se usó",
    texto: "Cada toque del llavero sirve una sola vez. Pedile a quien te atiende que lo apoye de nuevo.",
  },
  sun_sin_configurar: {
    titulo: "Llavero no configurado",
    texto: "El sistema todavía no está listo para estos llaveros. Avisale al local.",
  },
  qr_vencido: {
    titulo: "Este QR ya no sirve",
    texto: "Venció o está incompleto. Los códigos cambian cada 30 segundos. Pedile a quien te atiende que te muestre uno nuevo y escanealo de nuevo.",
  },
  qr_usado: {
    titulo: "Este QR ya se usó",
    texto: "Cada código sirve una sola vez. Pedile a quien te atiende que te muestre el siguiente.",
  },
  qr_invalido: {
    titulo: "QR no válido",
    texto: "Este código no corresponde a nadie activo del local.",
  },
  wallet_error: {
    titulo: "No pudimos crear tu pase",
    texto: "La billetera no respondió. Probá de nuevo en un rato; mientras tanto tu tarjeta sigue funcionando igual.",
  },
  puntos_insuficientes: {
    titulo: "No te alcanzan los puntos",
    texto: "Todavía te faltan puntos para ese premio.",
  },
};

const GENERICO = { titulo: "Algo salió mal", texto: "Probá de nuevo en un ratito." };

export default async function Aviso({ searchParams }: PageProps<"/aviso">) {
  const { m } = await searchParams;
  const msg = (typeof m === "string" && MENSAJES[m]) || GENERICO;
  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pt-warning-soft font-[family-name:var(--font-pt-display)] text-2xl font-bold text-pt-warning-ink" aria-hidden>
          !
        </span>
        <h1 className="pt-app-titulo mt-5 text-pt-ink">{msg.titulo}</h1>
        <p className="mt-2 pt-app-texto text-pt-ink-2">{msg.texto}</p>
        <BotonLink href="/" variante="secundario" className="mt-8">
          Volver al inicio
        </BotonLink>
      </main>
    </div>
  );
}
