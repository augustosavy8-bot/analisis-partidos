/** Cómo llama cada local a su personal. Los textos se arman con estas formas. */
export const TERMINOS = ["mozo", "vendedor", "barbero", "cajero", "empleado", "profesor", "estilista"] as const;
export type Termino = (typeof TERMINOS)[number];

export function esTermino(v: string): v is Termino {
  return (TERMINOS as readonly string[]).includes(v);
}

/** mozo → mozos, vendedor → vendedores. */
export function plural(t: string): string {
  return /[aeiou]$/.test(t) ? `${t}s` : `${t}es`;
}

export function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Formas listas para usar en textos: "mozo", "mozos", "Mozo", "Mozos". */
export function formasTermino(t: string | null | undefined) {
  const s = t && esTermino(t) ? t : "mozo";
  const p = plural(s);
  return { singular: s, plural: p, Singular: capitalizar(s), Plural: capitalizar(p) };
}
