import { Icono } from "@/components/Icono";

/**
 * "¿No le lee el llavero?": la mayoría de las veces no es un celular viejo sino el
 * NFC apagado (Android) o un iPhone 7/8/X, que no lee etiquetas solo. Desplegable,
 * sin JS. `paraEquipo` cambia el tono (se lo explica el mozo al cliente).
 */
export function AyudaNfc({ paraEquipo = false, className = "" }: { paraEquipo?: boolean; className?: string }) {
  const titulo = paraEquipo ? "¿Al cliente no le lee el llavero?" : "¿No te lee el llavero?";
  return (
    <details className={`group rounded-pt-card bg-pt-pure px-4 py-3 text-left shadow-pt-ui ring-1 ring-pt-border/60 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 pt-app-texto font-semibold text-pt-ink [&::-webkit-details-marker]:hidden">
        <Icono nombre="nfc" tamaño={18} className="shrink-0 text-pt-ink-2" />
        <span className="flex-1">{titulo}</span>
        <Icono nombre="chevron" tamaño={16} className="shrink-0 text-pt-ink-2 transition-transform duration-150 group-open:rotate-90" />
      </summary>
      <div className="mt-3 space-y-3 pt-app-detalle text-pt-ink-2">
        <p>Casi siempre se arregla en un minuto:</p>
        <div>
          <p className="font-semibold text-pt-ink">Android</p>
          <p>
            El NFC suele venir apagado. Abrí <strong>Ajustes</strong> y buscá <strong>“NFC”</strong> (está en Conexiones, Dispositivos conectados o
            Conexión y uso compartido, según la marca). Activalo y apoyá el llavero en la parte de atrás, cerca de la cámara.
          </p>
        </div>
        <div>
          <p className="font-semibold text-pt-ink">iPhone XS o más nuevo</p>
          <p>Con la pantalla desbloqueada, apoyá el llavero arriba, en la parte de atrás, cerca de la cámara. Tocá el aviso que aparece.</p>
        </div>
        <div>
          <p className="font-semibold text-pt-ink">iPhone 7, 8 o X</p>
          <p>
            No lee el llavero solo: abrí el <strong>Centro de Control</strong> (deslizá desde arriba a la derecha, o desde abajo) y tocá{" "}
            <strong>“Lector de etiquetas NFC”</strong>. Si no está, agregalo en Ajustes → Centro de Control.
          </p>
        </div>
        <div>
          <p className="font-semibold text-pt-ink">Si igual no anda</p>
          <p>
            {paraEquipo
              ? "Usá el QR de respaldo: el cliente lo escanea con la cámara y suma igual."
              : "Pedile al personal el QR de respaldo: lo escaneás con la cámara y sumás igual."}
          </p>
        </div>
      </div>
    </details>
  );
}
