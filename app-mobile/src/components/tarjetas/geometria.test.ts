import { test } from "node:test";
import assert from "node:assert/strict";
import { estiloPorDistancia, geometriaCarrusel, indiceCentrado, textoFalta, vuelo } from "./geometria.ts";

test("carrusel: la tarjeta vertical entra en pantalla y deja ver a las vecinas", () => {
  const g = geometriaCarrusel(390, 844);
  assert.ok(g.ancho <= 390 * 0.64 + 1, "ancho visible");
  assert.ok(g.alto <= 844 * 0.62 + 1, "alto visible");
  assert.ok(Math.abs(g.alto / g.ancho - 1.586) < 0.01, "proporción de tarjeta");
  assert.equal(g.paso, g.ancho + 16);
  assert.ok(g.relleno > 0);
});

test("estilo por distancia: centro a escala 1, costados a 0.85 y opacidad 0.5", () => {
  assert.deepEqual(estiloPorDistancia(0), { escala: 1, opacidad: 1, rotacionY: -0 });
  const lado = estiloPorDistancia(1);
  assert.equal(lado.escala, 0.85);
  assert.equal(lado.opacidad, 0.5);
  assert.equal(estiloPorDistancia(-3).escala, 0.85);
});

test("índice centrado acotado", () => {
  assert.equal(indiceCentrado(0, 300, 4), 0);
  assert.equal(indiceCentrado(460, 300, 4), 2);
  assert.equal(indiceCentrado(99999, 300, 4), 3);
  assert.equal(indiceCentrado(-50, 300, 4), 0);
});

test("vuelo: sale del home horizontal y llega al centro vertical a escala 1", () => {
  const origen = { x: 20, y: 150, width: 350, height: 350 / 1.586 };
  const destino = { cx: 195, cy: 400 };
  const inicio = vuelo(0, origen, destino, 400);
  assert.equal(inicio.rotacion, 0);
  assert.equal(inicio.escala, 350 / 400);
  assert.equal(inicio.cx, 195);
  const fin = vuelo(1, origen, destino, 400, 30);
  assert.deepEqual(fin, { cx: 195, cy: 430, escala: 1, rotacion: 90 });
});

test("texto de progreso", () => {
  assert.equal(textoFalta(7, 8, "15% OFF"), "Falta 1 punto para 15% OFF");
  assert.equal(textoFalta(5, 8, "Café gratis"), "Faltan 3 puntos para Café gratis");
  assert.equal(textoFalta(9, 8, "Café gratis"), "¡Café gratis disponible!");
});
