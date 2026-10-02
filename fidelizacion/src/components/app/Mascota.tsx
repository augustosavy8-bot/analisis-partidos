/** Mascota de Point: la gotita con el chip en el pecho. Imágenes en /public/mascota (512×512, fondo transparente). */
export type EstadoMascota = "base" | "cumple" | "extranamos" | "premio" | "festejo" | "pensando" | "tranqui" | "error";
export type AnimacionMascota = "flota" | "salta" | "piensa" | "tiembla" | "ninguna";

const ANIMACION_POR_ESTADO: Record<EstadoMascota, AnimacionMascota> = {
  base: "flota",
  cumple: "flota",
  extranamos: "piensa",
  premio: "flota",
  festejo: "salta",
  pensando: "piensa",
  tranqui: "flota",
  error: "tiembla",
};

/**
 * Entra con un rebote y después queda "viva" (respira, salta, se balancea o tiembla según el estado).
 * El contenedor hace la entrada y la imagen el movimiento continuo, para que no se pisen los transform.
 * Con "reducir movimiento" queda quieta (ver globals.css).
 */
export function Mascota({
  estado,
  tamaño = 72,
  animacion,
  entrada = true,
  className = "",
}: {
  estado: EstadoMascota;
  tamaño?: number;
  animacion?: AnimacionMascota;
  entrada?: boolean;
  className?: string;
}) {
  const mov = animacion ?? ANIMACION_POR_ESTADO[estado];
  return (
    <span key={estado} className={`inline-block shrink-0 ${entrada ? "mascota-entra" : ""} ${className}`} style={{ width: tamaño, height: tamaño }}>
      <img
        src={`/mascota/${estado}.png`}
        alt=""
        width={tamaño}
        height={tamaño}
        className={`block select-none ${mov === "ninguna" ? "" : `mascota-${mov}`}`}
        draggable={false}
      />
    </span>
  );
}
