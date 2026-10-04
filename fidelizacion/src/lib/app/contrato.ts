/**
 * Contrato de la API de la app móvil (/api/app/v1). Sin dependencias del servidor:
 * lo usan las rutas y los tests. La app (app-mobile/src/api/tipos.ts) tiene una
 * copia de estos tipos: si cambian acá, actualizarlos allá.
 */
import { coloresTarjeta } from "@/lib/colores";

type ColoresApp = { fondo: string; texto: string; etiqueta: string; acento: string };

export type LocalApp = {
  slug: string;
  nombre: string;
  programa: string;
  logo: string | null;
  /** Ícono cuadrado del local (ícono subido, logo o inicial sobre su color). */
  icono: string;
  colores: ColoresApp;
};

type PremioApp = { id: string; nombre: string; descripcion: string | null; puntos: number; alcanza: boolean };

export type TarjetaResumenApp = {
  local: LocalApp;
  puntos: number;
  /** Próximo premio (el primero que no alcanza, o el último si alcanzó todos). */
  proximo: { nombre: string; puntos: number; faltan: number } | null;
  premiosDisponibles: number;
};

type MovimientoApp = { id: string; tipo: "suma" | "canje" | "regalo"; texto: string; puntos: number; fecha: string };

export type TarjetaDetalleApp = TarjetaResumenApp & {
  premios: PremioApp[];
  /** Contenido del QR (el mismo link del pase de Apple/Google: /w/<serial>/<token>). */
  qr: string;
  /** El QR ya dibujado (SVG), para no sumar una librería de QR en la app. */
  qrSvg: string;
  /** Hay Apple Wallet configurado en el servidor. */
  appleWallet: boolean;
  /** Cómo llama el local a su personal ("mozo", "vendedor"…). */
  personal: string;
  movimientos: MovimientoApp[];
};

type LocalFila = {
  slug: string;
  nombre: string;
  nombre_programa: string | null;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  color_texto: string | null;
  color_etiqueta: string | null;
};

export function localApp(l: LocalFila & { icono_url?: string | null }, appUrl: string): LocalApp {
  const c = coloresTarjeta(l);
  const version = encodeURIComponent([l.icono_url ?? "", l.logo_url ?? "", l.color_primario].join("|")).slice(0, 120);
  return {
    slug: l.slug,
    nombre: l.nombre,
    programa: l.nombre_programa || l.nombre,
    logo: l.logo_url,
    icono: `${appUrl.replace(/\/$/, "")}/t/${l.slug}/icono?s=180&v=${version}`,
    colores: { fondo: c.fondo, texto: c.texto, etiqueta: c.etiqueta, acento: l.color_secundario },
  };
}

export function resumenTarjeta(local: LocalApp, puntos: number, premios: { nombre: string; puntos_necesarios: number }[]): TarjetaResumenApp {
  const ordenados = [...premios].sort((a, b) => a.puntos_necesarios - b.puntos_necesarios);
  const prox = ordenados.find((p) => p.puntos_necesarios > puntos) ?? ordenados[ordenados.length - 1];
  return {
    local,
    puntos,
    proximo: prox ? { nombre: prox.nombre, puntos: prox.puntos_necesarios, faltan: Math.max(0, prox.puntos_necesarios - puntos) } : null,
    premiosDisponibles: ordenados.filter((p) => puntos >= p.puntos_necesarios).length,
  };
}

// --- Límite de intentos de ingreso ----------------------------------------------------

/** Por IP: 10 intentos cada 15 minutos (5 fallidos). Suficiente para una persona, poco para un script. */
export const LIMITE_INGRESO = { ventanaMin: 15, maximo: 10, maximoFallidos: 5 } as const;

export function ingresoBloqueado(intentos: { exitoso: boolean }[]): boolean {
  return intentos.length >= LIMITE_INGRESO.maximo || intentos.filter((i) => !i.exitoso).length >= LIMITE_INGRESO.maximoFallidos;
}

/** "Bearer <token>" → token (o null). Mismo formato que el token de la cookie de la web. */
export function tokenBearer(header: string | null): string | null {
  const m = header?.match(/^Bearer\s+([A-Za-z0-9_-]{20,100})$/);
  return m ? m[1] : null;
}

// --- Toque desde la app (el llavero abre la app) --------------------------------------

/** Qué pasó con el toque, para la pantalla de celebración de la app. */
export type ResultadoToqueApp =
  | {
      tipo: "suma";
      /** Puntos del toque más los regalos (bienvenida, cumple) de la misma visita. */
      sumados: number;
      regalos: { texto: string; puntos: number }[];
      /** Premio que se alcanzó justo con este toque. */
      completado: string | null;
    }
  | { tipo: "canje"; premio: string | null }
  | { tipo: "limite"; proximoEn: string };

export type RespuestaToqueApp =
  | { estado: "aplicado"; resultado: ResultadoToqueApp; tarjeta: TarjetaDetalleApp }
  /** No hay sesión: la app pide registrarse (o entrar) y manda este toque firmado (15 min, un solo uso). */
  | { estado: "registro"; toquePendiente: string; local: LocalApp };

/**
 * Arma la celebración a partir del detalle de la tarjeta ya actualizado y el
 * movimiento del toque (los regalos de la misma visita tienen la misma hora).
 */
export function celebracion(
  t: Pick<TarjetaDetalleApp, "puntos" | "premios" | "movimientos">,
  movimientoId: string,
  tipo: "suma" | "canje",
  premioCanjeado: string | null = null,
): ResultadoToqueApp {
  if (tipo === "canje") return { tipo: "canje", premio: premioCanjeado };
  const mov = t.movimientos.find((m) => m.id === movimientoId);
  const regalos = mov ? t.movimientos.filter((m) => m.tipo === "regalo" && m.fecha === mov.fecha) : [];
  const sumados = (mov?.puntos ?? 1) + regalos.reduce((a, r) => a + r.puntos, 0);
  const antes = t.puntos - sumados;
  const completado = t.premios.find((p) => antes < p.puntos && t.puntos >= p.puntos)?.nombre ?? null;
  return { tipo: "suma", sumados, regalos: regalos.map((r) => ({ texto: r.texto, puntos: r.puntos })), completado };
}
