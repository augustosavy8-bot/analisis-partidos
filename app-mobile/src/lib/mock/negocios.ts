/**
 * Datos de ejemplo del home (por ahora). Después vienen de la API (Supabase);
 * la forma es la misma que va a devolver el adaptador de lib/negocios.ts.
 */
type ColoresMarca = {
  /** Gradiente de la tarjeta (de claro a oscuro). */
  c1: string;
  c2: string;
  texto: string;
  /** Barra de progreso. */
  acento: string;
};

export type Negocio = {
  id: string;
  nombre: string;
  inicial: string;
  logo?: string | null;
  puntos: number;
  /** Puntos del próximo premio. */
  meta: number;
  premio: string;
  /** Sin marca = metal cepillado gris. */
  marca?: ColoresMarca | null;
};

export type Movimiento = {
  id: string;
  tipo: "suma" | "canje" | "regalo";
  titulo: string;
  negocio: string;
  cuando: string;
  puntos: number;
};

export const NEGOCIOS: Negocio[] = [
  {
    id: "fairplay",
    nombre: "FairPlay",
    inicial: "F",
    puntos: 7,
    meta: 8,
    premio: "15% OFF",
    marca: { c1: "#2b2d2a", c2: "#0c0d0c", texto: "#ffffff", acento: "#c8f031" },
  },
  {
    id: "aurora",
    nombre: "Café Aurora",
    inicial: "A",
    puntos: 5,
    meta: 8,
    premio: "Café gratis",
    marca: { c1: "#7a4a2e", c2: "#3b2419", texto: "#fff4ea", acento: "#f0a36b" },
  },
  { id: "norte", nombre: "Barbería Norte", inicial: "N", puntos: 3, meta: 10, premio: "Corte gratis", marca: null },
  {
    id: "polo",
    nombre: "Heladería Polo",
    inicial: "P",
    puntos: 9,
    meta: 12,
    premio: "Cuarto de helado",
    marca: { c1: "#2f7fd6", c2: "#123f7a", texto: "#ffffff", acento: "#9fe3ff" },
  },
];

export const MOVIMIENTOS: Movimiento[] = [
  { id: "m1", tipo: "suma", titulo: "Sumaste 1 punto", negocio: "FairPlay", cuando: "Hoy, 10:55", puntos: 1 },
  { id: "m2", tipo: "canje", titulo: "Canjeaste Medias de regalo", negocio: "FairPlay", cuando: "Ayer, 18:20", puntos: -1 },
  { id: "m3", tipo: "suma", titulo: "Sumaste 2 puntos · Happy hour", negocio: "Café Aurora", cuando: "Lun, 17:40", puntos: 2 },
  { id: "m4", tipo: "regalo", titulo: "Regalo de bienvenida", negocio: "Heladería Polo", cuando: "Dom, 16:05", puntos: 2 },
  { id: "m5", tipo: "suma", titulo: "Sumaste 1 punto", negocio: "Barbería Norte", cuando: "12 sept", puntos: 1 },
];
