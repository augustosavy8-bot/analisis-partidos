import { describe, expect, it } from "vitest";
import { mensajeMotivoPedido, validarDireccion } from "./pedido";

const ok = { nombre: "Ana Pérez", telefono: "+54 9 3471 123456", calle: "San Martín", numero: "123", ciudad: "Cañada de Gómez", provincia: "Santa Fe", cp: "2500" };

describe("pedido del kit", () => {
  it("valida la dirección de envío", () => {
    expect(validarDireccion(ok).ok).toBe(true);
    expect(validarDireccion({ ...ok, cp: "s2500abc" }).ok).toBe(true);
    expect(validarDireccion({ ...ok, cp: "25" }).ok).toBe(false);
    expect(validarDireccion({ ...ok, telefono: "abc" }).ok).toBe(false);
    expect(validarDireccion({ ...ok, calle: "" }).ok).toBe(false);
  });

  it("explica por qué no se pudo armar el pedido", () => {
    expect(mensajeMotivoPedido("sin_stock:Kit inicial:2")).toMatch(/quedan 2/);
    expect(mensajeMotivoPedido("sin_stock:Kit inicial:0")).toMatch(/agotado/);
    expect(mensajeMotivoPedido("max_por_pedido:Chip adicional:30")).toMatch(/hasta 30/);
    expect(mensajeMotivoPedido(undefined)).toMatch(/No pudimos/);
  });
});
