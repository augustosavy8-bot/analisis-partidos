/* eslint-disable @next/next/no-img-element -- vistas previas con URLs locales (blob:) y de Storage */
import { textoPorDefecto } from "@/lib/colores";
import { svgFranja, svgStripApple } from "@/lib/diseno-billetera";
import { PROPORCION_LOGO } from "@/lib/icono";

export type DatosMockup = {
  comercio: string;
  programa: string;
  fondo: string;
  texto: string;
  etiqueta: string;
  acento: string;
  /** URLs (Storage o blob: de lo recién elegido). null = sin imagen. */
  logo: string | null;
  icono: string | null;
  franja: string | null;
  premio: { nombre: string; puntos: number } | null;
  textoDorso: string;
};

const PUNTOS = 5;
const CLIENTE = "Sofía";
const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Ícono como lo genera el servidor: color de fondo y la imagen al 80% (o la inicial). */
export function IconoLocal({ d, lado, redondeo }: { d: DatosMockup; lado: number; redondeo: number }) {
  const src = d.icono ?? d.logo;
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden" style={{ width: lado, height: lado, borderRadius: redondeo, background: d.fondo }} aria-hidden>
      {src ? (
        <img src={src} alt="" className="object-cover" style={{ width: lado * PROPORCION_LOGO, height: lado * PROPORCION_LOGO }} />
      ) : (
        <span
          className="flex items-center justify-center font-bold"
          style={{ width: lado * 0.56, height: lado * 0.56, borderRadius: lado * 0.16, background: d.acento, color: textoPorDefecto(d.acento), fontSize: lado * 0.32 }}
        >
          {d.comercio.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/** QR de mentira (sólo para el mockup). */
function QrFalso({ lado }: { lado: number }) {
  const celdas = 21;
  const lleno = (x: number, y: number) => {
    const esquina = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7 && (x === cx || x === cx + 6 || y === cy || y === cy + 6 || (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4));
    if (esquina(0, 0) || esquina(14, 0) || esquina(0, 14)) return true;
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return false;
    return (x * 7 + y * 13 + x * y) % 5 < 2;
  };
  return (
    <svg viewBox={`0 0 ${celdas} ${celdas}`} width={lado} height={lado} shapeRendering="crispEdges" aria-hidden>
      {Array.from({ length: celdas * celdas }, (_, i) => {
        const x = i % celdas;
        const y = Math.floor(i / celdas);
        return lleno(x, y) ? <rect key={i} x={x} y={y} width={1} height={1} fill="#111" /> : null;
      })}
    </svg>
  );
}

function Campo({ etiqueta, valor, color, colorEtiqueta, alinear = "left" }: { etiqueta: string; valor: string; color: string; colorEtiqueta: string; alinear?: "left" | "right" }) {
  return (
    <div className="min-w-0" style={{ textAlign: alinear }}>
      <p className="truncate text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: colorEtiqueta }}>
        {etiqueta}
      </p>
      <p className="truncate text-[14px] leading-tight" style={{ color }}>
        {valor}
      </p>
    </div>
  );
}

/** storeCard de Apple Wallet: logo + logoText, franja con los puntos encima, campos y QR. */
export function MockupApple({ d }: { d: DatosMockup }) {
  const faltan = d.premio ? Math.max(0, d.premio.puntos - PUNTOS) : 0;
  const franja = d.franja ?? svgUri(svgStripApple({ primario: d.fondo, acento: d.acento }));
  return (
    <div className="w-full overflow-hidden rounded-[14px] shadow-pt-card-app" style={{ background: d.fondo, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif" }}>
      <div className="flex h-[46px] items-center gap-2 px-3">
        {d.logo ? (
          <img src={d.logo} alt="" className="h-[26px] max-w-[96px] object-contain object-left" />
        ) : (
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] text-[14px] font-bold" style={{ background: d.acento, color: textoPorDefecto(d.acento) }}>
            {d.comercio.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="truncate text-[15px] font-semibold" style={{ color: d.texto }}>
          {d.programa}
        </span>
      </div>
      <div className="relative aspect-[375/123] w-full">
        <img src={franja} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute left-3 top-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: d.etiqueta }}>
            Puntos
          </p>
          <p className="text-[34px] font-light leading-none" style={{ color: d.texto }}>
            {PUNTOS}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-3 pt-2.5">
        {d.premio ? (
          <>
            <Campo etiqueta="Próximo premio" valor={d.premio.nombre} color={d.texto} colorEtiqueta={d.etiqueta} />
            <Campo etiqueta="Te faltan" valor={String(faltan)} color={d.texto} colorEtiqueta={d.etiqueta} alinear="right" />
          </>
        ) : (
          <Campo etiqueta="Premios" valor="Próximamente" color={d.texto} colorEtiqueta={d.etiqueta} />
        )}
      </div>
      <div className="px-3 pt-2">
        <Campo etiqueta="Cliente" valor={CLIENTE} color={d.texto} colorEtiqueta={d.etiqueta} />
      </div>
      <div className="flex justify-center pb-4 pt-4">
        <span className="rounded-[6px] bg-white p-1.5">
          <QrFalso lado={84} />
        </span>
      </div>
    </div>
  );
}

/** Tarjeta de lealtad de Google Wallet: logo redondo, programa, puntos, QR y la franja abajo. */
export function MockupGoogle({ d }: { d: DatosMockup }) {
  // Google elige solo el color del texto según el fondo.
  const texto = textoPorDefecto(d.fondo);
  const hero = d.franja ?? svgUri(svgFranja({ primario: d.fondo, acento: d.acento, puntos: PUNTOS, meta: d.premio?.puntos ?? 8 }));
  return (
    <div className="w-full overflow-hidden rounded-[20px] shadow-pt-card-app" style={{ background: d.fondo, color: texto, fontFamily: "'Google Sans', Roboto, Inter, sans-serif" }}>
      <div className="flex items-center gap-2 px-4 pt-4">
        <span className="overflow-hidden rounded-full">
          <IconoLocal d={d} lado={26} redondeo={13} />
        </span>
        <span className="truncate text-[12px] font-medium opacity-90">{d.comercio}</span>
      </div>
      <p className="truncate px-4 pt-2.5 text-[19px] leading-tight">{d.programa}</p>
      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        <div>
          <p className="text-[10px] opacity-75">Puntos</p>
          <p className="text-[15px]">{PUNTOS}</p>
        </div>
        {d.premio && (
          <div className="text-right">
            <p className="text-[10px] opacity-75">Próximo premio</p>
            <p className="text-[15px]">
              {Math.min(PUNTOS, d.premio.puntos)}/{d.premio.puntos}
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-center py-4">
        <span className="rounded-[10px] bg-white p-2">
          <QrFalso lado={80} />
        </span>
      </div>
      <img src={hero} alt="" className="aspect-[1032/336] w-full object-cover" />
    </div>
  );
}

/** Notificación de iOS con el ícono (puntos, mensajes, cercanía). */
export function MockupNotificacion({ d }: { d: DatosMockup }) {
  return (
    <div className="flex gap-2.5 rounded-[16px] bg-pt-pure/90 p-2.5 shadow-pt-flotante">
      <IconoLocal d={d} lado={34} redondeo={8} />
      <div className="min-w-0 flex-1">
        <p className="flex justify-between gap-2 text-[11px] text-pt-ink-2">
          <span className="truncate font-medium uppercase tracking-wide">{d.comercio}</span>
          <span className="shrink-0">ahora</span>
        </p>
        <p className="text-[13px] leading-snug text-pt-ink">Sumaste puntos: ahora tenés {PUNTOS}</p>
      </div>
    </div>
  );
}

/** Dorso de Apple Wallet: sólo lo que se edita acá (el texto del programa). */
export function MockupDorso({ d }: { d: DatosMockup }) {
  if (!d.textoDorso.trim()) return null;
  return (
    <div className="rounded-[14px] bg-pt-pure p-3 text-[13px] shadow-pt-flotante">
      <p className="text-[11px] font-medium text-pt-ink-2">{d.programa}</p>
      <p className="mt-0.5 whitespace-pre-line break-words text-pt-ink">{d.textoDorso}</p>
    </div>
  );
}
