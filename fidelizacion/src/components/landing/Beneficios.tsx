import { IPhoneMockup } from "./IPhoneMockup";
import { WalletScreen } from "./WalletScreen";
import { PointCard } from "./PointCard";
import { SellosPoint } from "./SellosPoint";
import { Etiqueta } from "./Section";
import { Reveal } from "./Reveal";

/** 13 — Beneficios: tres bloques grandes, un concepto por bloque. */
export function Beneficios() {
  return (
    <section id="beneficios" className="scroll-mt-16 bg-pt-bg">
      <div className="mx-auto max-w-[1280px] px-5 pt-24 md:px-8 md:pt-40">
        <Reveal>
          <Etiqueta>Beneficios</Etiqueta>
          <h2 className="pt-display mt-4 max-w-[760px] text-pt-ink">
            Ellos vuelven.
            <br />
            Vos los conocés mejor.
          </h2>
        </Reveal>
      </div>

      <Bloque
        n="01"
        titulo="Sin aplicaciones."
        texto="Tus clientes no descargan nada ni crean contraseñas. La tarjeta vive en la Wallet del teléfono, al lado de sus tarjetas de siempre."
        visual={
          <div className="w-[62vw] max-w-[270px]">
            <IPhoneMockup>
              <WalletScreen>
                <div className="rounded-pt-lg shadow-pt-product">
                  <PointCard reflejo={false} />
                </div>
              </WalletScreen>
            </IPhoneMockup>
          </div>
        }
      />
      <Bloque
        n="02"
        invertido
        titulo="Siempre a mano."
        texto="La tarjeta aparece en la pantalla bloqueada cuando están cerca de tu local. Nada que olvidarse en casa."
        visual={
          <div className="w-[62vw] max-w-[270px]">
            <IPhoneMockup>
              <PantallaBloqueo />
            </IPhoneMockup>
          </div>
        }
      />
      <Bloque
        n="03"
        titulo="Una razón para volver."
        texto="Cada visita suma. Ver cuánto falta para el premio es lo que hace que la próxima compra sea en tu local."
        visual={
          <div className="flex flex-col items-center gap-8 rounded-pt-lg bg-pt-pure px-8 py-12 shadow-pt-ui md:px-14 md:py-20">
            <SellosPoint puntos={9} meta={10} />
            <p className="pt-h3 text-pt-ink">Te falta 1 punto</p>
          </div>
        }
      />
    </section>
  );
}

function Bloque({
  n,
  titulo,
  texto,
  visual,
  invertido,
}: {
  n: string;
  titulo: string;
  texto: string;
  visual: React.ReactNode;
  invertido?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-[78vh] max-w-[1280px] items-center px-5 py-16 md:min-h-[70vh] md:px-8 md:py-24">
      <div className={`grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-24 ${invertido ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <Reveal className="flex justify-center">{visual}</Reveal>
        <Reveal orden={1}>
          <p className="pt-label text-pt-ink-3">{n}</p>
          <h3 className="pt-h1 mt-3 text-pt-ink">{titulo}</h3>
          <p className="pt-lead mt-5 max-w-[460px] text-pt-ink-2">{texto}</p>
        </Reveal>
      </div>
    </div>
  );
}

/** Pantalla bloqueada con la tarjeta POINT sugerida. */
function PantallaBloqueo() {
  return (
    <div className="@container relative flex h-full flex-col items-center text-white" style={{ background: "linear-gradient(180deg, #2a3a33 0%, #1a211d 55%, #111311 100%)" }}>
      <p className="mt-[16cqw] font-medium opacity-80" style={{ fontSize: "4cqw" }}>
        martes 14 de octubre
      </p>
      <p className="font-[family-name:var(--font-manrope)] font-semibold tracking-[-0.03em]" style={{ fontSize: "22cqw", lineHeight: 1 }}>
        9:41
      </p>
      <div className="mt-auto w-full px-[4.5cqw] pb-[12cqw]">
        <div className="rounded-[5cqw] bg-white/12 p-[3cqw] backdrop-blur-md" style={{ background: "rgba(255,255,255,.12)" }}>
          <p className="mb-[2.4cqw] flex items-center justify-between px-[1.5cqw] font-medium opacity-80" style={{ fontSize: "3.2cqw" }}>
            <span>Wallet · Cerca</span>
            <span>ahora</span>
          </p>
          <PointCard reflejo={false} />
        </div>
      </div>
    </div>
  );
}
