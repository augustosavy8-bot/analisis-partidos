/**
 * Contrato de la API /api/app/v1 (copia de fidelizacion/src/lib/app/contrato.ts).
 * Si cambia allá, actualizar acá.
 */
export type ColoresApp = { fondo: string; texto: string; etiqueta: string; acento: string };

export type LocalApp = {
  slug: string;
  nombre: string;
  programa: string;
  logo: string | null;
  icono: string;
  colores: ColoresApp;
};

export type PremioApp = { id: string; nombre: string; descripcion: string | null; puntos: number; alcanza: boolean };

export type TarjetaResumenApp = {
  local: LocalApp;
  puntos: number;
  proximo: { nombre: string; puntos: number; faltan: number } | null;
  premiosDisponibles: number;
};

export type MovimientoApp = { id: string; texto: string; puntos: number; fecha: string };

export type TarjetaDetalleApp = TarjetaResumenApp & {
  premios: PremioApp[];
  qr: string;
  qrSvg: string;
  appleWallet: boolean;
  personal: string;
  movimientos: MovimientoApp[];
};

export type Sesion = { token: string; nombre: string };
