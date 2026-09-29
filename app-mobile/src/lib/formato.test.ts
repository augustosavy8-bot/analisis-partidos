import { test } from "node:test";
import assert from "node:assert/strict";
import { limpiarWhatsapp, progreso, textoProximo, textoPuntos, textoSobre, whatsappPlausible } from "./formato.ts";

test("puntos y próximo premio", () => {
  assert.equal(textoPuntos(1), "1 punto");
  assert.equal(textoPuntos(7), "7 puntos");
  assert.equal(textoProximo({ nombre: "Café gratis", faltan: 3 }), "Te faltan 3 puntos para Café gratis");
  assert.equal(textoProximo({ nombre: "Café gratis", faltan: 1 }), "Te falta 1 punto para Café gratis");
  assert.equal(textoProximo({ nombre: "Café gratis", faltan: 0 }), "¡Ya podés canjear Café gratis!");
  assert.equal(textoProximo(null), "Sumá en cada visita");
});

test("progreso acotado entre 0 y 1", () => {
  assert.equal(progreso(4, { puntos: 8 }), 0.5);
  assert.equal(progreso(12, { puntos: 8 }), 1);
  assert.equal(progreso(3, null), 0);
});

test("WhatsApp", () => {
  assert.equal(limpiarWhatsapp("+54 9 (341) 123-4567"), "+5493411234567");
  assert.equal(whatsappPlausible("341 123 4567"), true);
  assert.equal(whatsappPlausible("123"), false);
});

test("texto legible sobre el color del bar", () => {
  assert.equal(textoSobre("#111111"), "#ffffff");
  assert.equal(textoSobre("#f7f1e3"), "#111311");
  assert.equal(textoSobre("#c8f031"), "#111311");
});
