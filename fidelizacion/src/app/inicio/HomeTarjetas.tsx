"use client";

/* eslint-disable @next/next/no-img-element -- logos de Storage en tarjetas chicas */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Icono } from "@/components/Icono";
import type { MovimientoInicio, TarjetaInicio } from "@/lib/inicio";
import s from "./inicio.module.css";

const CLAVE_ACTIVA = "point.tarjeta-activa";
/** Resorte del diseño: stiffness 140, damping 18 (~500 ms con un rebote chiquito). */
const RESORTE = { k: 140, c: 18 };
const UMBRAL_CIERRE = 110;

type Props = { nombre: string; tarjetas: TarjetaInicio[]; movimientos: MovimientoInicio[] };
type Rect = { x: number; y: number; w: number; h: number };
type Geometria = { ancho: number; alto: number; paso: number };

// La tarjeta elegida se recuerda en este navegador (si no se puede, arranca por la de más puntos).
const suscribirNada = () => () => {};
function leerActiva() {
  try {
    return localStorage.getItem(CLAVE_ACTIVA);
  } catch {
    return null;
  }
}

/** Con el selector abierto, la página de atrás no scrollea. */
function bloquearScroll(bloquear: boolean) {
  document.documentElement.style.overflow = bloquear ? "hidden" : "";
}

const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;
const reducirMovimiento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const vibrar = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};

/** Resorte con integración propia (60 fps, sin estado de React en el medio). */
function resorte(alMover: (p: number) => void, alTerminar?: () => void, opts = RESORTE) {
  if (reducirMovimiento()) {
    alMover(1);
    alTerminar?.();
    return;
  }
  let x = 0;
  let v = 0;
  let ultimo = performance.now();
  const paso = (ahora: number) => {
    const dt = Math.min(0.034, (ahora - ultimo) / 1000);
    ultimo = ahora;
    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      v += (-opts.k * (x - 1) - opts.c * v) * h;
      x += v * h;
    }
    alMover(x);
    if (Math.abs(x - 1) < 0.0008 && Math.abs(v) < 0.002) {
      alMover(1);
      alTerminar?.();
      return;
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function textoFalta(t: TarjetaInicio, corto = false) {
  if (t.meta === null || !t.premio) return corto ? "Premios próximamente" : "Tu local está cargando sus premios";
  const falta = Math.max(0, t.meta - t.puntos);
  if (!falta) return `¡${t.premio} disponible!`;
  if (corto) return `${falta === 1 ? "falta 1" : `faltan ${falta}`} para ${t.premio}`;
  return `${falta === 1 ? "Falta 1 punto" : `Faltan ${falta} puntos`} para ${t.premio}`;
}

function IconoNfc() {
  return (
    <svg className={s.nfc} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
      <path d="M8.5 7.5a6.5 6.5 0 0 1 0 9" />
      <path d="M12 5a10 10 0 0 1 0 14" />
      <path d="M15.5 2.5a13.5 13.5 0 0 1 0 19" />
    </svg>
  );
}

/** La tarjeta: horizontal (1.586), color del bar con textura de metal cepillado, logo, NFC, puntos y progreso. */
function Tarjeta({ t }: { t: TarjetaInicio }) {
  const progreso = t.meta ? Math.min(100, (t.puntos / t.meta) * 100) : 0;
  const estilo = { "--c1": t.c1, "--c2": t.c2, "--txt": t.texto, "--acento": t.acento } as CSSProperties;
  return (
    <div className={s.card} style={estilo} data-tarjeta>
      <div className={s.metal} />
      <div className={s.brillo} />
      <div className={s.cuerpo}>
        <div className={s.cardArriba}>
          <div className={s.logo}>{t.logo ? <img src={t.logo} alt="" /> : t.nombre.charAt(0).toUpperCase()}</div>
          <IconoNfc />
        </div>
        <div className={s.cardAbajo}>
          <div className={s.cardFila}>
            <div className={s.cardNombre}>{t.nombre}</div>
            <div className={s.cardPts}>
              {t.puntos}
              <span>pts</span>
            </div>
          </div>
          <div className={s.barra}>
            <i style={{ width: `${progreso}%` }} />
          </div>
          <div className={s.cardMeta}>{textoFalta(t)}</div>
        </div>
      </div>
    </div>
  );
}

function IconoMas({ tamaño }: { tamaño: number }) {
  return (
    <svg width={tamaño} height={tamaño} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconoMovimiento({ tipo }: { tipo: MovimientoInicio["tipo"] }) {
  if (tipo === "canje") return <Icono nombre="canjear" tamaño={20} />;
  if (tipo === "regalo") return <Icono nombre="premio" tamaño={20} />;
  return <IconoMas tamaño={20} />;
}

/**
 * Home del cliente. Tocar la tarjeta la levanta, la gira 90° y abre un carrusel
 * con todas; al elegir una vuelve girando a su lugar. La animación escribe
 * estilos directo en el DOM (requestAnimationFrame): React sólo cambia la
 * tarjeta activa al terminar.
 */
export function HomeTarjetas({ nombre, tarjetas, movimientos }: Props) {
  const guardada = useSyncExternalStore(suscribirNada, leerActiva, () => null);
  const [elegida, setElegida] = useState<string | null>(null);
  const indiceGuardado = tarjetas.findIndex((t) => t.slug === (elegida ?? guardada));
  const activa = indiceGuardado >= 0 ? indiceGuardado : 0;
  const total = tarjetas.reduce((a, t) => a + t.puntos, 0);
  const primerNombre = nombre.split(" ")[0];

  const homeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fondoRef = useRef<HTMLDivElement>(null);
  const carruselRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const capasRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const estado = useRef({ abierto: false, animando: false, centrada: 0, g: null as Geometria | null });

  const slots = () => Array.from(carruselRef.current?.children ?? []) as HTMLElement[];
  const interior = (el: HTMLElement) => el.firstElementChild as HTMLElement;

  const geometria = useCallback((): Geometria => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const alto = Math.round(Math.min(H * 0.62, W * 0.64 * 1.586));
    const ancho = Math.round(alto / 1.586);
    const arriba = Math.round(Math.max(70, (H - alto) / 2 - 70));
    const o = overlayRef.current!;
    o.style.setProperty("--ancho", `${ancho}px`);
    o.style.setProperty("--alto", `${alto}px`);
    o.style.setProperty("--gap", "16px");
    o.style.setProperty("--relleno", `${(W - ancho) / 2}px`);
    o.style.setProperty("--arriba", `${arriba}px`);
    const g = { ancho, alto, paso: ancho + 16 };
    estado.current.g = g;
    return g;
  }, []);

  const mostrarInfo = useCallback(
    (i: number) => {
      Array.from(capasRef.current?.children ?? []).forEach((c, j) => ((c as HTMLElement).style.opacity = j === i ? "1" : "0"));
      if (linkRef.current) linkRef.current.href = `/t/${tarjetas[i].slug}`;
    },
    [tarjetas],
  );

  // Escala, opacidad, giro (rotateY) y brillo según la distancia al centro.
  const interpolar = useCallback(() => {
    const e = estado.current;
    if (!e.g || !carruselRef.current) return;
    const pos = carruselRef.current.scrollLeft / e.g.paso;
    slots().forEach((el, i) => {
      const d = i - pos;
      const c = Math.max(-1, Math.min(1, d));
      const a = Math.abs(c);
      const inn = interior(el);
      inn.style.transform = `rotateY(${(-c * 22).toFixed(2)}deg) scale(${(1 - 0.15 * a).toFixed(4)})`;
      inn.style.opacity = (1 - 0.5 * a).toFixed(3);
      inn.style.setProperty("--brillo", `${(d * 90).toFixed(1)}px`);
    });
    const centrada = Math.max(0, Math.min(tarjetas.length - 1, Math.round(pos)));
    if (centrada !== e.centrada && e.abierto) {
      e.centrada = centrada;
      vibrar(6);
      mostrarInfo(centrada);
    }
  }, [tarjetas.length, mostrarInfo]);

  // La tarjeta "voladora": copia de la del carrusel a tamaño final; se mueve con transform.
  const volador = (i: number) => {
    const g = estado.current.g!;
    const v = document.createElement("div");
    v.className = s.vuela;
    const card = interior(slots()[i]).querySelector("[data-tarjeta]")!.cloneNode(true) as HTMLElement;
    card.style.width = `${g.alto}px`;
    v.appendChild(card);
    overlayRef.current!.appendChild(v);
    return v;
  };
  const ubicar = (v: HTMLElement, desde: Rect, hasta: Rect, p: number, rotDesde: number, rotHasta: number) => {
    const g = estado.current.g!;
    const W = g.alto;
    const H = g.alto / 1.586;
    const sD = (rotDesde === 0 ? desde.w : desde.h) / W;
    const sH = (rotHasta === 0 ? hasta.w : hasta.h) / W;
    const cx = mezcla(desde.x + desde.w / 2, hasta.x + hasta.w / 2, p);
    const cy = mezcla(desde.y + desde.h / 2, hasta.y + hasta.h / 2, p);
    v.style.width = `${W}px`;
    v.style.height = `${H}px`;
    v.style.transform = `translate(${cx - W / 2}px, ${cy - H / 2}px) rotate(${mezcla(rotDesde, rotHasta, p)}deg) scale(${mezcla(sD, sH, p)})`;
  };
  const rect = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };

  function abrir() {
    const e = estado.current;
    if (e.animando || e.abierto || !tarjetas.length) return;
    e.animando = true;
    vibrar(10);
    const g = geometria();
    const overlay = overlayRef.current!;
    const carrusel = carruselRef.current!;
    const lista = slots();
    lista.forEach((el) => {
      el.classList.remove(s.entra, s.sale);
      el.style.opacity = "0";
      el.style.transform = "";
    });
    overlay.hidden = false;
    bloquearScroll(true);
    infoRef.current!.style.opacity = "0";
    fondoRef.current!.style.opacity = "0";
    carrusel.style.transform = "";
    carrusel.scrollLeft = activa * g.paso;
    e.centrada = activa;
    mostrarInfo(activa);
    interpolar();

    const desde = rect(homeRef.current!);
    const destino = rect(interior(lista[activa]));
    homeRef.current!.style.visibility = "hidden";
    const vuela = volador(activa);
    let vecinas = false;
    resorte(
      (p) => {
        ubicar(vuela, desde, destino, p, 0, 90);
        fondoRef.current!.style.opacity = String(Math.min(1, Math.max(0, p)) * 0.95);
        if (!vecinas && p > 0.55) {
          vecinas = true;
          entrarVecinas(activa);
          infoRef.current!.style.opacity = "1";
        }
      },
      () => {
        if (!vecinas) entrarVecinas(activa);
        infoRef.current!.style.opacity = "1";
        lista[activa].style.opacity = "1";
        vuela.remove();
        e.abierto = true;
        e.animando = false;
        lista[activa].focus({ preventScroll: true });
      },
    );
  }

  function entrarVecinas(activaAhora: number) {
    slots().forEach((el, i) => {
      if (i === activaAhora) return;
      el.style.transform = `translateX(${Math.sign(i - activaAhora) * 60}px)`;
      el.style.opacity = "0";
      el.style.setProperty("--demora", `${(Math.abs(i - activaAhora) - 1) * 70}ms`);
      requestAnimationFrame(() => {
        el.classList.add(s.entra);
        el.style.opacity = "1";
        el.style.transform = "translateX(0)";
      });
    });
  }

  function cerrar(i: number) {
    const e = estado.current;
    if (!e.abierto || e.animando) return;
    e.animando = true;
    e.abierto = false;
    vibrar(10);
    const lista = slots();
    const desde = rect(interior(lista[i]));
    const fondoInicial = parseFloat(fondoRef.current!.style.opacity) || 0.95;
    const vuela = volador(i);
    ubicar(vuela, desde, desde, 0, 90, 90);

    // La elegida pasa a ser la activa (antes de medir dónde queda en el home).
    try {
      localStorage.setItem(CLAVE_ACTIVA, tarjetas[i].slug);
    } catch {}
    flushSync(() => setElegida(tarjetas[i].slug));
    homeRef.current!.style.visibility = "hidden";
    const hasta = rect(homeRef.current!);

    lista[i].style.opacity = "0";
    lista.forEach((el, j) => j !== i && el.classList.add(s.sale));
    infoRef.current!.style.opacity = "0";
    resorte(
      (p) => {
        ubicar(vuela, desde, hasta, p, 90, 0);
        fondoRef.current!.style.opacity = String(Math.max(0, fondoInicial * (1 - Math.min(1, p))));
      },
      () => {
        homeRef.current!.style.visibility = "";
        vuela.remove();
        overlayRef.current!.hidden = true;
        bloquearScroll(false);
        carruselRef.current!.style.transform = "";
        e.animando = false;
        homeRef.current!.focus({ preventScroll: true });
      },
    );
  }

  function tocarLugar(i: number) {
    const e = estado.current;
    if (!e.abierto || e.animando || !e.g) return;
    if (i === e.centrada) cerrar(i);
    else carruselRef.current!.scrollTo({ left: i * e.g.paso, behavior: reducirMovimiento() ? "auto" : "smooth" });
  }

  // Scroll del carrusel, Escape, resize y "deslizar hacia abajo para cerrar".
  useEffect(() => {
    const carrusel = carruselRef.current;
    const overlay = overlayRef.current;
    if (!carrusel || !overlay) return;
    const alScroll = () => requestAnimationFrame(interpolar);
    const alTeclado = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && estado.current.abierto) cerrar(estado.current.centrada);
    };
    const alRedimensionar = () => {
      const e = estado.current;
      if (!e.abierto) return;
      const g = geometria();
      carrusel.scrollLeft = e.centrada * g.paso;
      interpolar();
    };

    let arrastre: { x: number; y: number; dy: number; vertical: boolean | null } | null = null;
    const bajar = (ev: PointerEvent) => {
      if (estado.current.abierto && !estado.current.animando) arrastre = { x: ev.clientX, y: ev.clientY, dy: 0, vertical: null };
    };
    const mover = (ev: PointerEvent) => {
      if (!arrastre) return;
      const dx = ev.clientX - arrastre.x;
      const dy = ev.clientY - arrastre.y;
      if (arrastre.vertical === null && Math.hypot(dx, dy) > 8) arrastre.vertical = Math.abs(dy) > Math.abs(dx);
      if (!arrastre.vertical) return;
      arrastre.dy = Math.max(0, dy);
      carrusel.style.transform = `translateY(${arrastre.dy * 0.7}px)`;
      infoRef.current!.style.opacity = String(Math.max(0, 1 - arrastre.dy / 160));
      fondoRef.current!.style.opacity = String(0.95 * Math.max(0.35, 1 - arrastre.dy / 500));
    };
    const soltar = () => {
      if (!arrastre) return;
      const { dy, vertical } = arrastre;
      arrastre = null;
      if (!vertical) return;
      if (dy > UMBRAL_CIERRE) return cerrar(estado.current.centrada);
      const inicio = dy * 0.7;
      const fondoDesde = 0.95 * Math.max(0.35, 1 - dy / 500);
      resorte(
        (p) => {
          carrusel.style.transform = `translateY(${inicio * (1 - p)}px)`;
          fondoRef.current!.style.opacity = String(mezcla(fondoDesde, 0.95, Math.min(1, p)));
          infoRef.current!.style.opacity = String(Math.min(1, p));
        },
        undefined,
        { k: 260, c: 26 },
      );
    };
    const cancelar = () => {
      arrastre = null;
      carrusel.style.transform = "";
      infoRef.current!.style.opacity = "1";
      fondoRef.current!.style.opacity = "0.95";
    };
    // Un tap después de arrastrar no cuenta como elegir.
    const filtrarClick = (ev: MouseEvent) => {
      const m = carrusel.style.transform.match(/-?[\d.]+/);
      if (m && Math.abs(parseFloat(m[0])) > 4) ev.stopPropagation();
    };

    carrusel.addEventListener("scroll", alScroll, { passive: true });
    carrusel.addEventListener("click", filtrarClick, true);
    overlay.addEventListener("pointerdown", bajar);
    overlay.addEventListener("pointermove", mover);
    overlay.addEventListener("pointerup", soltar);
    overlay.addEventListener("pointercancel", cancelar);
    document.addEventListener("keydown", alTeclado);
    window.addEventListener("resize", alRedimensionar);
    return () => {
      carrusel.removeEventListener("scroll", alScroll);
      carrusel.removeEventListener("click", filtrarClick, true);
      overlay.removeEventListener("pointerdown", bajar);
      overlay.removeEventListener("pointermove", mover);
      overlay.removeEventListener("pointerup", soltar);
      overlay.removeEventListener("pointercancel", cancelar);
      document.removeEventListener("keydown", alTeclado);
      window.removeEventListener("resize", alRedimensionar);
      bloquearScroll(false);
    };
    // cerrar/geometria/interpolar sólo leen refs: alcanza con engancharlos una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Brillo que sigue al dedo (o al mouse) sobre la tarjeta del home.
  function moverBrillo(ev: React.PointerEvent<HTMLButtonElement>) {
    const r = ev.currentTarget.getBoundingClientRect();
    ev.currentTarget.style.setProperty("--brillo", `${((ev.clientX - r.left) / r.width - 0.5) * 120}px`);
  }

  const activaT = tarjetas[activa];

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={`${s.columna} ${s.headerInterior}`}>
          <div className={s.filaHola}>
            <h1 className={s.hola}>Hola{primerNombre ? ` ${primerNombre}` : ""}</h1>
            <div className={s.botones}>
              <button type="button" className={s.circulo} aria-label="Ver todas mis tarjetas" onClick={abrir}>
                <Icono nombre="buscar" tamaño={20} />
              </button>
              <button
                type="button"
                className={s.circulo}
                aria-label="Sumar una tarjeta"
                onClick={() => alert("Para sumar una tarjeta, acercá el celular al llavero Point del local.")}
              >
                <IconoMas tamaño={20} />
              </button>
            </div>
          </div>
          <div>
            <div className={s.totalEtiqueta}>Puntos totales</div>
            <div className={s.total}>
              {total}
              <small>pts</small>
            </div>
          </div>
          <button
            ref={homeRef}
            type="button"
            className={s.homeCard}
            onClick={abrir}
            onPointerMove={moverBrillo}
            onPointerLeave={(ev) => ev.currentTarget.style.setProperty("--brillo", "0px")}
            aria-label={`${activaT.nombre}: ${activaT.puntos} puntos. Ver todas mis tarjetas`}
            aria-haspopup="dialog"
          >
            <Tarjeta t={activaT} />
          </button>
          <div className={s.pista}>{tarjetas.length > 1 ? "Tocá la tarjeta para ver todas" : "Tocá la tarjeta para verla en grande"}</div>
        </div>
      </header>

      <section id="movimientos" className={`${s.columna} ${s.movimientos}`} aria-labelledby="titulo-mov">
        <h2 id="titulo-mov" className={s.subtitulo}>
          Últimos movimientos
        </h2>
        {movimientos.length ? (
          <ul className={s.lista}>
            {movimientos.map((m) => (
              <li key={m.id} className={s.mov}>
                <span className={`${s.movIcono} ${s[m.tipo]}`} aria-hidden>
                  <IconoMovimiento tipo={m.tipo} />
                </span>
                <div className="min-w-0">
                  <div className={s.movTitulo}>{m.titulo}</div>
                  <div className={s.movDetalle}>
                    {m.negocio} · {m.cuando}
                  </div>
                </div>
                <div className={`${s.movPts} ${m.puntos > 0 ? s.mas : ""}`}>
                  {m.puntos > 0 ? "+" : "−"}
                  {Math.abs(m.puntos)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.vacio}>Todavía no hay movimientos.</p>
        )}
      </section>

      <nav className={s.tabbar} aria-label="Secciones">
        <Link href="/inicio" className={s.tab} aria-label="Inicio" aria-current="page">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinejoin="round" aria-hidden>
            <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
          </svg>
        </Link>
        <a href="#movimientos" className={s.tab} aria-label="Movimientos">
          <Icono nombre="historial" tamaño={22} />
        </a>
        <Link href={`/t/${activaT.slug}`} className={s.tab} aria-label={`Tarjeta de ${activaT.nombre}`}>
          <Icono nombre="tarjeta" tamaño={22} />
        </Link>
        <Link href={`/t/${activaT.slug}#premios`} className={s.tab} aria-label={`Premios de ${activaT.nombre}`}>
          <Icono nombre="premio" tamaño={22} />
        </Link>
      </nav>

      <div ref={overlayRef} className={s.overlay} hidden role="dialog" aria-modal="true" aria-label="Tus tarjetas">
        <div ref={fondoRef} className={s.fondo} />
        <div ref={carruselRef} className={s.carrusel}>
          {tarjetas.map((t, i) => (
            <div
              key={t.slug}
              className={s.slot}
              role="button"
              tabIndex={0}
              aria-label={`${t.nombre}, ${t.puntos} puntos`}
              onClick={() => tocarLugar(i)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  tocarLugar(i);
                }
              }}
            >
              <div className={s.slotInterior}>
                <Tarjeta t={t} />
              </div>
            </div>
          ))}
        </div>
        <div ref={infoRef} className={s.info}>
          <div ref={capasRef} className={s.capas} aria-live="polite">
            {tarjetas.map((t) => (
              <div key={t.slug} className={s.capa}>
                <b>{t.nombre}</b>
                <span>
                  {t.puntos} pts · {textoFalta(t, true)}
                </span>
              </div>
            ))}
          </div>
          <div className={s.acciones}>
            <button type="button" className={s.usar} onClick={() => cerrar(estado.current.centrada)}>
              Usar esta
            </button>
            <a ref={linkRef} href={`/t/${activaT.slug}`} className={s.link}>
              Abrir
            </a>
          </div>
          <div className={s.cerrarPista}>Deslizá hacia abajo para cerrar</div>
        </div>
      </div>
    </div>
  );
}
