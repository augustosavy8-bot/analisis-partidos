"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas con URLs blob: y de Storage */
import { useActionState, useEffect, useState, useTransition } from "react";
import { guardarDiseno, subirBorrador, type EstadoDiseno } from "./actions";
import { MockupApple, MockupDorso, MockupGoogle, MockupNotificacion, type DatosMockup } from "./Mockups";
import { BotonPrimario, EtiquetaPanel, Tarjeta, inputPanel } from "@/components/Panel";
import { claseBoton } from "@/components/app/Boton";
import { claseTextarea } from "@/components/app/Campos";
import { Aviso } from "@/components/app/Superficie";
import { avisar } from "@/components/app/Toasts";
import { ErrorForm } from "@/components/Campo";
import { HEX_COLOR, etiquetaPorDefecto, nivelContraste, textoPorDefecto, type NivelContraste } from "@/lib/colores";
import { LIMITES_TEXTO } from "@/lib/diseno-tarjeta";
import { svgStripApple } from "@/lib/diseno-billetera";
import { REGLAS_IMAGEN, TIPOS_IMAGEN, validarMedidas, type Medidas, type TipoImagen } from "@/lib/imagenes-local";

type Props = {
  slug: string;
  comercio: string;
  inicial: {
    fondo: string;
    texto: string;
    etiqueta: string;
    acento: string;
    programa: string;
    textoDorso: string;
    imagenes: Record<TipoImagen, string | null>;
  };
  premio: { nombre: string; puntos: number } | null;
  alcance: { google: number; apple: number };
};

/** igual = la de hoy; borrador = subida recién (se publica al guardar); quitar = sin imagen. */
type AccionImagen = "igual" | "borrador" | "quitar";
type EstadoImagen = { accion: AccionImagen; vista: string | null; subiendo: boolean; error: string | null };

const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const NOMBRE_IMAGEN: Record<TipoImagen, string> = { logo: "Logo", icono: "Ícono de notificaciones", franja: "Franja / cabecera" };

export function EditorDiseno({ slug, comercio, inicial, premio, alcance }: Props) {
  const [estado, accion, guardando] = useActionState<EstadoDiseno, FormData>(guardarDiseno.bind(null, slug), {});
  const [fondo, setFondo] = useState(inicial.fondo);
  const [texto, setTexto] = useState(inicial.texto);
  const [etiqueta, setEtiqueta] = useState(inicial.etiqueta);
  const [acento, setAcento] = useState(inicial.acento);
  const [programa, setPrograma] = useState(inicial.programa);
  const [textoDorso, setTextoDorso] = useState(inicial.textoDorso);
  const [imagenes, setImagenes] = useState<Record<TipoImagen, EstadoImagen>>(() => {
    const e = {} as Record<TipoImagen, EstadoImagen>;
    for (const t of TIPOS_IMAGEN) e[t] = { accion: "igual", vista: inicial.imagenes[t], subiendo: false, error: null };
    return e;
  });
  const [, startSubida] = useTransition();

  useEffect(() => {
    if (estado.ok) avisar("Diseño guardado. Las tarjetas se actualizan en unos minutos.");
  }, [estado.ok]);

  const d: DatosMockup = {
    comercio,
    programa: programa.trim() || comercio,
    fondo: HEX_COLOR.test(fondo) ? fondo : inicial.fondo,
    texto: HEX_COLOR.test(texto) ? texto : inicial.texto,
    etiqueta: HEX_COLOR.test(etiqueta) ? etiqueta : inicial.etiqueta,
    acento: HEX_COLOR.test(acento) ? acento : inicial.acento,
    logo: imagenes.logo.vista,
    icono: imagenes.icono.vista,
    franja: imagenes.franja.vista,
    premio,
    textoDorso,
  };
  const contrasteTexto = nivelContraste(d.fondo, d.texto);
  const contrasteEtiqueta = nivelContraste(d.fondo, d.etiqueta, 3);
  const subiendoAlguna = TIPOS_IMAGEN.some((t) => imagenes[t].subiendo);
  const total = alcance.google + alcance.apple;

  const cambiarImagen = (t: TipoImagen, cambio: Partial<EstadoImagen>) => setImagenes((prev) => ({ ...prev, [t]: { ...prev[t], ...cambio } }));

  /** Valida en el navegador y sube el borrador. La tarjeta no cambia hasta guardar. */
  function elegir(t: TipoImagen, archivo: File | undefined) {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onerror = () => cambiarImagen(t, { error: "No pudimos leer la imagen." });
    img.onload = () => {
      const formato = archivo.type === "image/png" ? "png" : archivo.type === "image/jpeg" ? "jpeg" : null;
      const medidas: Medidas | null = formato ? { formato, ancho: img.naturalWidth, alto: img.naturalHeight } : null;
      const error = archivo.size > REGLAS_IMAGEN[t].maxBytes ? "El archivo pesa más de 2 MB. Exportalo más liviano." : validarMedidas(t, medidas);
      if (error) return cambiarImagen(t, { error });
      const anterior = imagenes[t];
      cambiarImagen(t, { vista: url, subiendo: true, error: null });
      const datos = new FormData();
      datos.set("archivo", archivo);
      startSubida(async () => {
        const r = await subirBorrador(slug, t, datos);
        if (r.error) cambiarImagen(t, { vista: anterior.vista, accion: anterior.accion, subiendo: false, error: r.error });
        else cambiarImagen(t, { accion: "borrador", subiendo: false });
      });
    };
    img.src = url;
  }

  return (
    <form action={accion} className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      {TIPOS_IMAGEN.map((t) => (
        <input key={t} type="hidden" name={`imagen_${t}`} value={imagenes[t].accion} />
      ))}

      {/* Vista previa: arriba en celu, a la derecha (fija) en escritorio */}
      <div className="min-w-0 lg:order-2">
        <div className="lg:sticky lg:top-40">
          <p className="pt-label mb-2 uppercase text-pt-ink-2">Vista previa</p>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
            <figure className="w-[250px] shrink-0 snap-center sm:w-auto">
              <MockupApple d={d} />
              <figcaption className="mt-2 text-center pt-app-detalle font-medium text-pt-ink-2">Apple Wallet</figcaption>
            </figure>
            <figure className="w-[250px] shrink-0 snap-center sm:w-auto">
              <MockupGoogle d={d} />
              <figcaption className="mt-2 text-center pt-app-detalle font-medium text-pt-ink-2">Google Wallet</figcaption>
            </figure>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MockupNotificacion d={d} />
            <MockupDorso d={d} />
          </div>
          <p className="mt-2 pt-app-detalle text-pt-ink-2">En Google Wallet el color del texto lo elige Google según el fondo.</p>
        </div>
      </div>

      <div className="min-w-0 space-y-4 lg:order-1">
        <Tarjeta>
          <h2 className="pt-app-seccion text-pt-ink">Colores</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SelectorColor nombre="color_fondo" etiqueta="Fondo" valor={fondo} onChange={setFondo} />
            <SelectorColor nombre="color_texto" etiqueta="Texto" valor={texto} onChange={setTexto} ayuda="Puntos, premio y nombre (Apple)." />
            <SelectorColor nombre="color_etiqueta" etiqueta="Etiquetas" valor={etiqueta} onChange={setEtiqueta} ayuda="“PUNTOS”, “PRÓXIMO PREMIO”… (Apple)." />
            <SelectorColor nombre="color_acento" etiqueta="Acento de los sellos" valor={acento} onChange={setAcento} ayuda="Para la franja que generamos si no subís una." />
          </div>
          <AvisoContraste nivel={contrasteTexto} que="el fondo y el texto" />
          <AvisoContraste nivel={contrasteEtiqueta} que="el fondo y las etiquetas" />
          <button
            type="button"
            onClick={() => {
              const t = textoPorDefecto(d.fondo);
              setTexto(t);
              setEtiqueta(etiquetaPorDefecto(d.fondo, d.acento, t));
            }}
            className="mt-3 pt-app-detalle font-medium text-pt-ink-2 underline underline-offset-2 hover:text-pt-ink"
          >
            Calcular texto y etiquetas según el fondo
          </button>
        </Tarjeta>

        <Tarjeta>
          <h2 className="pt-app-seccion text-pt-ink">Imágenes</h2>
          <p className="mt-1 pt-app-detalle text-pt-ink-2">Se suben al elegirlas, pero la tarjeta cambia recién cuando guardás.</p>
          <ul className="mt-2 divide-y divide-pt-border">
            {TIPOS_IMAGEN.map((t) => (
              <FilaImagen
                key={t}
                tipo={t}
                estado={imagenes[t]}
                fondo={d.fondo}
                porDefecto={t === "franja" ? svgUri(svgStripApple({ primario: d.fondo, acento: d.acento })) : null}
                onElegir={(f) => elegir(t, f)}
                onQuitar={() => cambiarImagen(t, { accion: "quitar", vista: null, error: null })}
              />
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta>
          <h2 className="pt-app-seccion text-pt-ink">Textos</h2>
          <label className="mt-3 block">
            <EtiquetaPanel>Nombre del programa</EtiquetaPanel>
            <input
              name="nombre_programa"
              maxLength={LIMITES_TEXTO.programa}
              value={programa}
              onChange={(e) => setPrograma(e.target.value)}
              placeholder={comercio}
              className={inputPanel}
            />
            <span className="mt-1.5 block pt-app-detalle text-pt-ink-2">Ej: “Club {comercio}”. Vacío = el nombre del local.</span>
          </label>
          <label className="mt-4 block">
            <EtiquetaPanel>Texto del dorso</EtiquetaPanel>
            <textarea
              name="texto_dorso"
              rows={4}
              maxLength={LIMITES_TEXTO.dorso}
              value={textoDorso}
              onChange={(e) => setTextoDorso(e.target.value)}
              placeholder="Ej: Sumá 1 punto en cada compra. Canjeá tus premios en el local mostrando esta tarjeta."
              className={`${claseTextarea} resize-y text-[15px]`}
            />
            <span className="mt-1.5 flex justify-between gap-3 pt-app-detalle text-pt-ink-2">
              <span>Aparece en el dorso de Apple Wallet y en los detalles de Google Wallet.</span>
              <span className="shrink-0 tabular-nums">
                {textoDorso.length}/{LIMITES_TEXTO.dorso}
              </span>
            </span>
          </label>
        </Tarjeta>

        <div className="space-y-3">
          <ErrorForm mensaje={estado.error} />
          <BotonPrimario type="submit" disabled={guardando || subiendoAlguna} className="!h-11 !rounded-full !px-5 !text-[15px]">
            {guardando ? "Guardando…" : subiendoAlguna ? "Subiendo imagen…" : "Guardar y actualizar tarjetas"}
          </BotonPrimario>
          <p className="pt-app-detalle text-pt-ink-2">
            {total > 0
              ? `Se actualizan las ${total} ${total === 1 ? "tarjeta" : "tarjetas"} que ya están en las billeteras (${alcance.google} Google, ${alcance.apple} Apple). Puede tardar unos minutos.`
              : "Todavía ningún cliente agregó la tarjeta a su billetera: el diseño se usa en las que se agreguen."}
          </p>
        </div>
      </div>
    </form>
  );
}

function SelectorColor({ nombre, etiqueta, valor, onChange, ayuda }: { nombre: string; etiqueta: string; valor: string; onChange: (v: string) => void; ayuda?: string }) {
  const valido = HEX_COLOR.test(valor);
  return (
    <label className="block">
      <EtiquetaPanel>{etiqueta}</EtiquetaPanel>
      <div className="flex gap-2">
        <input
          type="color"
          value={valido ? valor : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${etiqueta}: elegir color`}
          className="h-pt-control-sm w-14 shrink-0 cursor-pointer rounded-pt-sm border border-pt-border bg-pt-pure p-1"
        />
        <input
          name={nombre}
          value={valor}
          onChange={(e) => onChange(e.target.value.trim())}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!valido}
          aria-label={`${etiqueta}: código del color`}
          className={`${inputPanel} font-mono ${valido ? "" : "!border-pt-error-ink"}`}
        />
      </div>
      {ayuda && <span className="mt-1.5 block pt-app-detalle text-pt-ink-2">{ayuda}</span>}
    </label>
  );
}

function AvisoContraste({ nivel, que }: { nivel: NivelContraste; que: string }) {
  if (nivel === "ok") return null;
  return (
    <div role="status" className={`mt-3 rounded-pt-card px-4 py-3 pt-app-detalle ${nivel === "muy-bajo" ? "bg-pt-error-soft text-pt-error-ink" : "bg-pt-warning-soft text-pt-warning-ink"}`}>
      <strong className="font-semibold">Contraste {nivel === "muy-bajo" ? "muy bajo" : "bajo"}</strong> entre {que}: puede costar leerlo, sobre todo al sol. Probá un color más claro u oscuro.
    </div>
  );
}

function FilaImagen({
  tipo,
  estado,
  fondo,
  porDefecto,
  onElegir,
  onQuitar,
}: {
  tipo: TipoImagen;
  estado: EstadoImagen;
  fondo: string;
  porDefecto: string | null;
  onElegir: (f: File | undefined) => void;
  onQuitar: () => void;
}) {
  const id = `imagen-${tipo}`;
  const regla = REGLAS_IMAGEN[tipo];
  const acepta = regla.formatos.map((f) => (f === "png" ? "image/png" : "image/jpeg")).join(",");
  const forma = tipo === "franja" ? "h-12 w-[146px]" : tipo === "icono" ? "h-12 w-12" : "h-12 w-24";
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-pt-sm border border-pt-border ${forma}`} style={{ background: tipo === "franja" ? undefined : fondo }}>
        {estado.vista ? (
          <img src={estado.vista} alt="" className={tipo === "logo" ? "max-h-[80%] max-w-[90%] object-contain" : tipo === "icono" ? "h-[80%] w-[80%] object-cover" : "h-full w-full object-cover"} />
        ) : porDefecto ? (
          <img src={porDefecto} alt="Franja generada con tus colores" className="h-full w-full object-cover" />
        ) : (
          <span className="px-1 text-center text-[11px] leading-tight" style={{ color: textoPorDefecto(fondo) }}>
            Sin imagen
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-pt-ink">
          {NOMBRE_IMAGEN[tipo]}
          {estado.accion === "borrador" && <span className="ml-2 text-[12px] font-medium text-pt-accent-ink">Nueva · se aplica al guardar</span>}
          {estado.accion === "quitar" && <span className="ml-2 text-[12px] font-medium text-pt-warning-ink">Se quita al guardar</span>}
        </p>
        <p className="mt-0.5 pt-app-detalle text-pt-ink-2">{regla.ayuda}</p>
        {tipo === "franja" && (
          <Aviso tono="suave" className="mt-2">
            <strong className="text-pt-ink">Recomendado: sin texto.</strong> Apple escribe los puntos encima y Google la recorta según el celular.
            {!estado.vista && " Si no subís una, usamos la generada con tus colores."}
          </Aviso>
        )}
        {estado.error && <p className="mt-2 pt-app-detalle font-medium text-pt-error-ink">{estado.error}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <label htmlFor={id} className={claseBoton("secundario", "sm", `cursor-pointer ${estado.subiendo ? "pointer-events-none opacity-60" : ""}`)}>
            {estado.subiendo ? "Subiendo…" : estado.vista ? "Cambiar" : "Subir"}
          </label>
          <input id={id} type="file" accept={acepta} className="sr-only" onChange={(e) => (onElegir(e.target.files?.[0]), (e.target.value = ""))} />
          {estado.vista && !estado.subiendo && (
            <button type="button" onClick={onQuitar} className="px-2 text-[13px] font-medium text-pt-ink-2 underline underline-offset-2 hover:text-pt-ink">
              Quitar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
