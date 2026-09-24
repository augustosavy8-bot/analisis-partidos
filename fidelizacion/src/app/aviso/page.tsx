import Link from "next/link";

export const metadata = { title: "Aviso" };

const MENSAJES: Record<string, { titulo: string; texto: string }> = {
  chip_invalido: {
    titulo: "No reconocimos este llavero",
    texto: "Puede que el llavero no esté dado de alta. Avisale al mozo.",
  },
  chip_sin_mozo: {
    titulo: "Este llavero no tiene mozo asignado",
    texto: "El local tiene que asignarlo a un mozo antes de usarlo.",
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
    texto: "Pedile al mozo que vuelva a apoyar el llavero en tu celular.",
  },
  canje_expirado: {
    titulo: "El canje venció",
    texto: "Volvé a tocar “Canjear” en tu tarjeta y pedile al mozo que apoye el llavero.",
  },
  sun_invalido: {
    titulo: "No pudimos leer el llavero",
    texto: "Pedile al mozo que lo vuelva a apoyar en tu celular.",
  },
  sun_cmac: {
    titulo: "Llavero no válido",
    texto: "La firma del llavero no coincide. Avisale al mozo.",
  },
  sun_repetido: {
    titulo: "Este toque ya se usó",
    texto: "Cada toque del llavero sirve una sola vez. Pedile al mozo que lo apoye de nuevo.",
  },
  sun_sin_configurar: {
    titulo: "Llavero no configurado",
    texto: "El sistema todavía no está listo para estos llaveros. Avisale al local.",
  },
  qr_vencido: {
    titulo: "Este QR ya no sirve",
    texto: "Venció o está incompleto. Los códigos cambian cada 30 segundos. Pedile al mozo que te muestre uno nuevo y escanealo de nuevo.",
  },
  qr_usado: {
    titulo: "Este QR ya se usó",
    texto: "Cada código sirve una sola vez. Pedile al mozo que te muestre el siguiente.",
  },
  qr_invalido: {
    titulo: "QR no válido",
    texto: "Este código no corresponde a un mozo activo del local.",
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">!</div>
      <h1 className="text-2xl font-semibold tracking-tight">{msg.titulo}</h1>
      <p className="text-stone-600">{msg.texto}</p>
      <Link href="/" className="mt-4 text-sm font-medium text-stone-500 underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}
