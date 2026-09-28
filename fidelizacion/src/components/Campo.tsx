import { AyudaCampo, ErrorCampo, EtiquetaCampo, claseInput } from "./app/Campos";
import { Boton } from "./app/Boton";

/** Campo de texto con etiqueta y ayuda (sistema de Point). */
export function Campo(props: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }) {
  const { etiqueta, ayuda, className = "", ...input } = props;
  return (
    <label className="block">
      <EtiquetaCampo>{etiqueta}</EtiquetaCampo>
      <input {...input} className={`${claseInput} ${className}`} />
      {ayuda && <AyudaCampo>{ayuda}</AyudaCampo>}
    </label>
  );
}

/** Botón principal de los formularios del cliente y del ingreso: ancho completo, en el acento. */
export function BotonMarca({ children, pendiente, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendiente?: boolean }) {
  return (
    <Boton {...props} variante="acento" tamaño="lg" pendiente={pendiente}>
      {children}
    </Boton>
  );
}

export function ErrorForm({ mensaje }: { mensaje?: string }) {
  return <ErrorCampo mensaje={mensaje} />;
}
