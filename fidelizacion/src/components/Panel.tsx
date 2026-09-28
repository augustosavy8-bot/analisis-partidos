/** Piezas visuales compartidas del panel (sobre el sistema de la app de Point). */
import { Encabezado, Superficie } from "./app/Superficie";
import { EstadoVacio } from "./app/EstadoVacio";
import { claseBoton } from "./app/Boton";
import { claseInputSm } from "./app/Campos";

export function Titulo({ children, accion, detalle }: { children: React.ReactNode; accion?: React.ReactNode; detalle?: React.ReactNode }) {
  return <Encabezado titulo={children} accion={accion} detalle={detalle} />;
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Superficie as="section" className={`p-5 ${className}`}>
      {children}
    </Superficie>
  );
}

/** Estado vacío: tarjeta en cero + texto + CTA. */
export function Vacio({ children, titulo, accion, ilustracion }: { children?: React.ReactNode; titulo?: string; accion?: React.ReactNode; ilustracion?: React.ReactNode | false }) {
  return <EstadoVacio titulo={titulo ?? "Nada por acá todavía"} texto={children} accion={accion} ilustracion={ilustracion} />;
}

export function BotonSecundario({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={claseBoton("secundario", "sm", className)} />;
}

export function BotonPrimario({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={claseBoton("primario", "sm", className)} />;
}

export const inputPanel = claseInputSm;

/** Etiqueta de campo del panel. */
export function EtiquetaPanel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-medium text-pt-ink">{children}</span>;
}
