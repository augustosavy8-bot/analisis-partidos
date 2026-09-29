/**
 * Contrato de la API de la app móvil (/api/app/v1). Sin dependencias del servidor:
 * lo usan las rutas y los tests. La app (app-mobile/src/api/tipos.ts) tiene una
 * copia de estos tipos: si cambian acá, actualizarlos allá.
 */
import { coloresTarjeta } from "@/lib/colores";

export type ColoresApp = { fondo: string; texto: string; etiqueta: string; acento: string };

export type LocalApp = {
  slug: string;
  nombre: string;
  programa: string;
  logo: string | null;
  /** Ícono cuadrado del local (ícono subido, logo o inicial sobre su color). */
  icono: string;
  colores: ColoresApp;
};

export type PremioApp = { id: string; nombre: string; descripcion: string | null; puntos: number; alcanza: boolean };

export type TarjetaResumenApp = {
  local: LocalApp;
  puntos: number;
  /** Próximo premio (el primero que no alcanza, o el último si alcanzó todos). */
  proximo: { nombre: string; puntos: number; faltan: number } | null;
  premiosDisponibles: number;
};

export type MovimientoApp = { id: string; texto: string; puntos: number; fecha: string };

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
