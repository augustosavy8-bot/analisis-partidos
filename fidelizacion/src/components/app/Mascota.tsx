/** Mascota de Point: la gotita con el chip en el pecho. Imágenes en /public/mascota (512×512, fondo transparente). */
export type EstadoMascota = "base" | "cumple" | "extranamos" | "premio" | "festejo" | "pensando" | "tranqui" | "error";

export function Mascota({ estado, tamaño = 72, className = "" }: { estado: EstadoMascota; tamaño?: number; className?: string }) {
  return <img src={`/mascota/${estado}.png`} alt="" width={tamaño} height={tamaño} className={`shrink-0 select-none ${className}`} draggable={false} />;
}
