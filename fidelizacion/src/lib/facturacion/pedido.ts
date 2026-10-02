/**
 * Pedido del kit: validación de la dirección de envío y lectura de los motivos
 * de rechazo de crear_pedido. Funciones puras, testeadas.
 */

export type Direccion = {
  nombre: string;
  telefono: string;
  calle: string;
  numero: string;
  piso: string | null;
  ciudad: string;
  provincia: string;
  cp: string;
};

const campo = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");

export function validarDireccion(d: Record<string, unknown>): { ok: true; direccion: Direccion } | { ok: false; error: string } {
  const r: Direccion = {
    nombre: campo(d.nombre),
    telefono: campo(d.telefono),
    calle: campo(d.calle),
    numero: campo(d.numero),
    piso: campo(d.piso) || null,
    ciudad: campo(d.ciudad),
    provincia: campo(d.provincia),
    cp: campo(d.cp).toUpperCase(),
  };
  if (r.nombre.length < 3 || r.nombre.length > 80) return { ok: false, error: "Poné el nombre de quien recibe." };
  if (!/^[+\d][\d\s-]{6,19}$/.test(r.telefono)) return { ok: false, error: "Revisá el teléfono (lo usa el correo para avisar)." };
  if (r.calle.length < 2 || r.calle.length > 80) return { ok: false, error: "Revisá la calle." };
  if (!/^[\dA-Za-z/ -]{1,10}$/.test(r.numero)) return { ok: false, error: "Revisá la altura (número de la calle)." };
  if (r.piso && r.piso.length > 30) return { ok: false, error: "Piso/depto es muy largo." };
  if (r.ciudad.length < 2 || r.ciudad.length > 60) return { ok: false, error: "Revisá la ciudad." };
  if (r.provincia.length < 3 || r.provincia.length > 40) return { ok: false, error: "Revisá la provincia." };
  if (!/^([A-Z]\d{4}[A-Z]{3}|\d{4})$/.test(r.cp)) return { ok: false, error: "El código postal es de 4 números (o el nuevo, tipo S2500ABC)." };
  return { ok: true, direccion: r };
}

/** Motivo de crear_pedido ("sin_stock:Kit inicial:2") → mensaje para el comercio. */
export function mensajeMotivoPedido(motivo: string | null | undefined): string {
  const [codigo, nombre, numero] = String(motivo ?? "").split(":");
  if (codigo === "sin_stock") {
    return Number(numero) > 0 ? `De "${nombre}" quedan ${numero}. Bajá la cantidad.` : `"${nombre}" está agotado por ahora.`;
  }
  if (codigo === "max_por_pedido") return `De "${nombre}" podés pedir hasta ${numero} por pedido.`;
  if (codigo === "sin_items") return "Elegí al menos un producto.";
  return "No pudimos armar el pedido. Probá de nuevo.";
}
