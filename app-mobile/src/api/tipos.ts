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

export type MovimientoApp = { id: string; tipo: "suma" | "canje" | "regalo"; texto: string; puntos: number; fecha: string };

export type TarjetaDetalleApp = TarjetaResumenApp & {
  premios: PremioApp[];
  qr: string;
  qrSvg: string;
  appleWallet: boolean;
  personal: string;
  movimientos: MovimientoApp[];
};

export type Sesion = { token: string; nombre: string };

export type ResultadoToqueApp =
  | { tipo: "suma"; sumados: number; regalos: { texto: string; puntos: number }[]; completado: string | null }
  | { tipo: "canje"; premio: string | null }
  | { tipo: "limite"; proximoEn: string };

export type RespuestaToqueApp =
  | { estado: "aplicado"; resultado: ResultadoToqueApp; tarjeta: TarjetaDetalleApp }
  | { estado: "registro"; toquePendiente: string; local: LocalApp };

/** Parámetros con los que el llavero (o el QR) abre la app: /n?p=…&m=… · ?t=… · ?q=… */
export type ParamsToque = Partial<Record<"p" | "m" | "picc_data" | "cmac" | "t" | "q", string>>;

export type DatosRegistro = {
  nombre: string;
  whatsapp: string;
  consentimiento: true;
  cumple?: { dia: number; mes: number } | null;
  toquePendiente: string;
};
