import Link from "next/link";
import type { Metadata } from "next";
import { LogoPoint, IsotipoPoint } from "@/components/MarcaPoint";
import { Icono, type NombreIcono } from "@/components/Icono";
import { OndasNfc, SelloAnimado } from "@/components/Animaciones";
import { TarjetaVisual } from "@/components/TarjetaVisual";
import { estiloMarca, type Local } from "@/lib/locales";
import { FormInteres } from "./interes/FormInteres";

export const metadata: Metadata = {
  title: { absolute: "Point — Tus clientes vuelven. Con un toque." },
  description:
    "Tarjeta de puntos digital con llavero NFC para cafeterías, bares y comercios. Sin apps, sin cartón. Sumá a tu local.",
};

const NARANJA = "#E6633A";
const MARINO = "#0F172A";
const titulo = "font-[family-name:var(--font-poppins)] font-bold tracking-[-0.03em]";

// Local de ejemplo para la tarjeta de muestra.
const demo: Local = {
  id: "demo",
  slug: "demo",
  nombre: "Café Aurora",
  rubro: null,
  logo_url: null,
  color_primario: "#4A1F0C",
  color_secundario: "#F28C28",
  minutos_entre_puntos: 0,
  zona_horaria: "America/Argentina/Buenos_Aires",
  termino_personal: "mozo",
  puntos_bienvenida: 0,
  puntos_cumple: 0,
};

const PASOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  { icono: "nfc", titulo: "Apoyan el llavero", texto: "Tu mozo o vendedor acerca su llavero Point al celular del cliente. Sin escanear nada." },
  { icono: "sumar-punto", titulo: "El cliente suma", texto: "Se abre su tarjeta con tu marca y suma el punto al instante. La primera vez sólo deja su nombre y WhatsApp." },
  { icono: "premio", titulo: "Vuelve por su premio", texto: "Con los puntos canjea lo que vos definas: un café, un 15% OFF, una remera. Y vuelve." },
];

const BENEFICIOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  { icono: "cliente", titulo: "Sin apps para descargar", texto: "Funciona en cualquier celular, desde el navegador. El cliente no instala nada." },
  { icono: "wallet", titulo: "Chau tarjetas de cartón", texto: "Nada que se pierda o se moje. La tarjeta vive en el celu y en la billetera." },
  { icono: "nfc", titulo: "A prueba de trampas", texto: "Cada toque del chip es único y no se puede copiar. Sólo suma quien está en tu local." },
  { icono: "local", titulo: "Con tu marca", texto: "Tus colores, tu logo, tus premios. Point queda de fondo." },
  { icono: "whatsapp", titulo: "Reactivá por WhatsApp", texto: "Mirá quién dejó de venir o está cerca de un premio y escribile con un toque." },
  { icono: "notificacion", titulo: "Promos y cumpleaños", texto: "Puntos dobles en horas flojas, regalo de bienvenida y de cumple, automáticos." },
];

const RUBROS = ["Cafeterías", "Bares", "Restaurantes", "Indumentaria", "Barberías", "Gimnasios", "Heladerías", "Librerías"];

const PREGUNTAS = [
  { p: "¿Mis clientes tienen que bajarse una app?", r: "No. Al apoyar el llavero se abre su tarjeta en el navegador. Si quieren, la agregan a la pantalla de inicio o a su billetera." },
  { p: "¿Qué necesito en el local?", r: "Sólo los llaveros Point para tu equipo (te los mandamos programados) y conexión a internet en el celular del cliente. También hay un QR de respaldo." },
  { p: "¿Y si el cliente cambia de celular?", r: "Recupera su tarjeta con su WhatsApp y conserva todos sus puntos." },
  { p: "¿Se puede hacer trampa?", r: "Los llaveros usan chips NFC con firma única en cada toque: copiar el link no sirve. Además limitás cada cuánto se puede sumar." },
  { p: "¿Cuánto cuesta?", r: "Depende de la cantidad de locales y llaveros. Dejanos tus datos y te pasamos una propuesta sin compromiso." },
];

export default function Inicio() {
  return (
    <div className="flex-1 bg-[#FAF7F2] text-stone-900">
      {/* Barra */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <LogoPoint alto={30} tono="blanco" />
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/panel" className="text-white/70 hover:text-white">Ingresar</Link>
            <a href="#sumarme" className="rounded-full bg-white px-4 py-2 font-semibold text-[#0F172A]">Me interesa</a>
          </nav>
        </div>
      </header>

      {/* Portada */}
      <section className="relative overflow-hidden text-white" style={{ background: MARINO }}>
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: NARANJA }}
        />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-28 md:grid-cols-[1.1fr_0.9fr] md:pb-28 md:pt-36">
          <div>
            <p className="anim-subir inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: NARANJA }} /> Fidelización para tu local
            </p>
            <h1 className={`anim-subir mt-5 text-[44px] leading-[1.02] md:text-[64px] ${titulo}`} style={{ animationDelay: "80ms" }}>
              Tus clientes vuelven.
              <br />
              Con un <span style={{ color: NARANJA }}>toque</span>.
            </h1>
            <p className="anim-subir mt-5 max-w-md text-lg text-white/70" style={{ animationDelay: "160ms" }}>
              La tarjeta de puntos que se suma apoyando un llavero en el celular. Sin apps, sin cartón, con tu marca.
            </p>
            <div className="anim-subir mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <a
                href="#sumarme"
                className="rounded-2xl px-6 py-4 text-base font-semibold text-white shadow-[0_14px_34px_-12px_#E6633A] transition hover:brightness-105"
                style={{ background: NARANJA }}
              >
                Quiero sumar mi local
              </a>
              <a href="#como-funciona" className="rounded-2xl px-6 py-4 text-base font-semibold text-white ring-1 ring-white/20 hover:bg-white/5">
                Cómo funciona
              </a>
            </div>
          </div>

          {/* Celular con la tarjeta */}
          <div className="relative mx-auto w-full max-w-[330px]">
            <div className="absolute -left-10 top-24 z-10 hidden rounded-3xl bg-white p-3 shadow-2xl sm:block">
              <OndasNfc punto={NARANJA} ondas={MARINO} tamaño={56} />
            </div>
            <div className="relative rounded-[44px] bg-[#1E293B] p-3 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
              <div style={estiloMarca(demo)} className="fondo-marca overflow-hidden rounded-[34px] px-4 pb-6 pt-8 text-stone-900">
                <p className="px-1 text-[12px] text-stone-500">Hola,</p>
                <p className="px-1 text-xl font-semibold tracking-tight">Sofía</p>
                <TarjetaVisual
                  local={demo}
                  puntos={6}
                  objetivo={{ id: "p", nombre: "Café gratis", descripcion: null, puntos_necesarios: 8 }}
                  titular="Sofía Gómez"
                  desde="2026-03-10T12:00:00Z"
                  serial="0000000000003f2a"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: NARANJA }}>Cómo funciona</p>
        <h2 className={`mt-2 max-w-xl text-4xl ${titulo}`} style={{ color: MARINO }}>Tres pasos. Cero fricción.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PASOS.map((p, i) => (
            <div key={p.titulo} className="relative rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(15,23,42,0.35)] ring-1 ring-black/5">
              <span className="absolute right-6 top-5 font-[family-name:var(--font-poppins)] text-5xl font-bold text-stone-100">{i + 1}</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: MARINO }}>
                <Icono nombre={p.icono} tamaño={24} />
              </div>
              <h3 className="relative mt-5 text-xl font-semibold tracking-tight" style={{ color: MARINO }}>{p.titulo}</h3>
              <p className="relative mt-2 text-stone-600">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: NARANJA }}>Por qué Point</p>
            <h2 className={`mt-2 text-4xl ${titulo}`} style={{ color: MARINO }}>Más visitas, sin complicarte.</h2>
            <p className="mt-4 text-stone-600">
              Todo lo que necesitás para que un cliente de una vez se convierta en un cliente de siempre.
            </p>
            <div className="mt-8 hidden md:block">
              <SelloAnimado aro={NARANJA} ondas={MARINO} tamaño={150} />
            </div>
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {BENEFICIOS.map((b) => (
              <div key={b.titulo}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#FDEEE8", color: NARANJA }}>
                  <Icono nombre={b.icono} tamaño={20} />
                </div>
                <h3 className="mt-3 font-semibold" style={{ color: MARINO }}>{b.titulo}</h3>
                <p className="mt-1 text-sm text-stone-600">{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Panel del dueño */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: NARANJA }}>Tu panel</p>
            <h2 className={`mt-2 text-4xl ${titulo}`} style={{ color: MARINO }}>Sabé quién vuelve y quién no.</h2>
            <ul className="mt-6 space-y-3 text-stone-700">
              {[
                "Clientes, visitas y cuántos vuelven",
                "Ranking de tu equipo",
                "Premios, promos y regalos de cumple",
                "Listas para escribir por WhatsApp",
                "Exportá tus clientes a Excel",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: NARANJA }}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.4)] ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <p className="font-semibold" style={{ color: MARINO }}>Resumen · últimos 30 días</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">+18%</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { i: "cliente" as const, e: "Clientes", v: "248" },
                { i: "sumar-punto" as const, e: "Visitas", v: "1.132" },
                { i: "historial" as const, e: "Vuelven", v: "64%" },
                { i: "canjear" as const, e: "Canjes", v: "87" },
              ].map((m) => (
                <div key={m.e} className="rounded-2xl bg-stone-50 p-4">
                  <p className="flex items-center gap-2 text-sm text-stone-500">
                    <Icono nombre={m.i} tamaño={16} /> {m.e}
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums" style={{ color: MARINO }}>{m.v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-28 items-end gap-1.5 rounded-2xl bg-stone-50 p-4">
              {[30, 45, 38, 60, 52, 70, 48, 66, 80, 58, 74, 90, 68, 84].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === 13 ? NARANJA : "#CBD5E1" }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rubros */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Ideal para</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {RUBROS.map((r) => (
              <span key={r} className="rounded-full bg-[#FAF7F2] px-4 py-2 text-sm font-medium ring-1 ring-black/5" style={{ color: MARINO }}>
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Preguntas */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <h2 className={`text-center text-4xl ${titulo}`} style={{ color: MARINO }}>Preguntas frecuentes</h2>
        <div className="mt-10 space-y-3">
          {PREGUNTAS.map((q) => (
            <details key={q.p} className="group rounded-2xl bg-white px-5 py-4 ring-1 ring-black/5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold" style={{ color: MARINO }}>
                {q.p}
                <span className="text-xl transition group-open:rotate-45" style={{ color: NARANJA }}>+</span>
              </summary>
              <p className="mt-3 text-stone-600">{q.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Formulario */}
      <section id="sumarme" className="scroll-mt-6 px-3 pb-6 md:px-5">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] px-5 py-14 text-white md:px-14" style={{ background: MARINO }}>
          <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full opacity-25 blur-3xl" style={{ background: NARANJA }} />
          <div className="relative grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <IsotipoPoint tamaño={52} tono="blanco" />
              <h2 className={`mt-5 text-4xl ${titulo}`}>Sumá tu local a Point</h2>
              <p className="mt-4 text-white/70">
                Dejanos tus datos y te contactamos por WhatsApp. Te mostramos una demo y armamos los premios con vos.
              </p>
              <p className="mt-6 text-sm text-white/50">Precio: consultanos, según cantidad de locales y llaveros.</p>
            </div>
            <FormInteres />
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-stone-500 sm:flex-row">
        <LogoPoint alto={22} />
        <div className="flex gap-5">
          <Link href="/privacidad" className="hover:text-stone-800">Privacidad</Link>
          <Link href="/panel" className="hover:text-stone-800">Ingresar al panel</Link>
        </div>
      </footer>
    </div>
  );
}
