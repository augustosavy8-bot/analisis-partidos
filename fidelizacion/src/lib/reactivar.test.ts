import { describe, expect, it } from "vitest";
import { armarMensaje, SEGMENTOS } from "./reactivar";

const base = { nombre: "Ana López", local: "Café Sol", puntos: 4, premio: "Café", premioPuntos: 10, link: "https://x" };

describe("mensajes de WhatsApp", () => {
  it("arma el mensaje con los datos", () => {
    expect(armarMensaje(SEGMENTOS.inactivos.plantilla, base)).toContain("te faltan 6 puntos para café");
  });
  it("si ya llegó al premio no dice 'te faltan 0 puntos'", () => {
    const m = armarMensaje(SEGMENTOS.inactivos.plantilla, { ...base, puntos: 12 });
    expect(m).not.toContain("faltan");
    expect(m).toContain("ya podés canjear café");
  });
  it("sin premios saca la frase del premio", () => {
    const m = armarMensaje(SEGMENTOS.inactivos.plantilla, { ...base, premio: null, premioPuntos: null });
    expect(m).not.toContain("faltan");
    expect(m).toContain("Tenés 4 puntos en tu tarjeta.");
  });
});
