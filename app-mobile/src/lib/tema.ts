/** Colores y medidas de Point (los mismos tokens que la web). */
export const color = {
  fondo: "#f7f8f6",
  blanco: "#ffffff",
  superficie: "#f0f2ee",
  borde: "#e2e5e0",
  tinta: "#111311",
  tinta2: "#656a65",
  tinta3: "#949994",
  acento: "#36d477",
  acentoTexto: "#0d7a3e",
  acentoSuave: "#e2f9eb",
  error: "#b42318",
  errorSuave: "#fdecea",
} as const;

export const radio = { chico: 12, tarjeta: 20, grande: 28 } as const;

export const sombra = {
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
