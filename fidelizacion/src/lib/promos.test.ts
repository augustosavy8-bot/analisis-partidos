import { describe, expect, it } from "vitest";
import { cumpleValido, describirDias, describirPromo, promoVigente, type Promo } from "./promos";
import { armarMensaje, haceCuanto, linkWhatsapp } from "./reactivar";

const zona = "America/Argentina/Buenos_Aires";
const promo = (p: Partial<Promo>): Promo => ({
  id: "1", nombre: "Happy hour", dias: [2, 4], desde: "15:00:00", hasta: "18:00:00", puntos: 2, activa: true, ...p,
});

describe("promos", () => {
  // Martes 29/9/2026 16:30 en Buenos Aires = 19:30 UTC.
  const martes1630 = new Date("2026-09-29T19:30:00Z");

  it("aplica la promo en su día y horario (hora del local)", () => {
    expect(promoVigente([promo({})], zona, martes1630)?.nombre).toBe("Happy hour");
    expect(promoVigente([promo({})], zona, new Date("2026-09-29T21:00:00Z"))).toBeNull(); // 18:00 justo: ya no
    expect(promoVigente([promo({})], zona, new Date("2026-09-30T19:30:00Z"))).toBeNull(); // miércoles
    expect(promoVigente([promo({ activa: false })], zona, martes1630)).toBeNull();
  });

  it("si hay varias, gana la que más da", () => {
    const r = promoVigente([promo({ id: "a" }), promo({ id: "b", puntos: 3 })], zona, martes1630);
    expect(r?.id).toBe("b");
  });

  it("describe días y horarios en castellano", () => {
    expect(describirDias([2, 4])).toBe("Martes y jueves");
    expect(describirDias([1, 2, 3, 4, 5])).toBe("Lunes a viernes");
    expect(describirDias([0, 6])).toBe("Fines de semana");
    expect(describirDias([0, 1, 2, 3, 4, 5, 6])).toBe("Todos los días");
    expect(describirDias([0, 1, 3])).toBe("Lunes, miércoles y domingos");
    expect(describirPromo(promo({}))).toBe("Martes y jueves de 15:00 a 18:00 · puntos dobles");
    expect(describirPromo(promo({ desde: "00:00", hasta: "23:59:59", puntos: 3 }))).toBe(
      "Martes y jueves todo el día · puntos triples",
    );
  });

  it("valida cumpleaños", () => {
    expect(cumpleValido(29, 2)).toBe(true);
    expect(cumpleValido(30, 2)).toBe(false);
    expect(cumpleValido(31, 4)).toBe(false);
    expect(cumpleValido(31, 12)).toBe(true);
    expect(cumpleValido(0, 1)).toBe(false);
  });
});

describe("mensajes de WhatsApp", () => {
  const datos = { nombre: "Sofía Pérez", local: "FairPlay", puntos: 6, premio: "Remera de regalo", premioPuntos: 8, link: "https://x/t/fairplay" };

  it("completa la plantilla", () => {
    expect(armarMensaje("Hola {nombre}, te faltan {faltan} para {premio} en {local}. {link}", datos)).toBe(
      "Hola Sofía, te faltan 2 puntos para remera de regalo en FairPlay. https://x/t/fairplay",
    );
    expect(armarMensaje("{faltan}", { ...datos, puntos: 7 })).toBe("1 punto");
    expect(armarMensaje("{premio} {desconocido}", { ...datos, premio: null, premioPuntos: null })).toBe(
      "tu próximo premio {desconocido}",
    );
  });

  it("arma el link wa.me con el texto codificado", () => {
    expect(linkWhatsapp("+5493411234567", "¡Hola! 🎁")).toBe(
      "https://wa.me/5493411234567?text=%C2%A1Hola!%20%F0%9F%8E%81",
    );
  });

  it("dice hace cuánto", () => {
    const ahora = Date.parse("2026-09-25T12:00:00Z");
    expect(haceCuanto("2026-09-25T08:00:00Z", ahora)).toBe("hoy");
    expect(haceCuanto("2026-09-24T08:00:00Z", ahora)).toBe("ayer");
    expect(haceCuanto("2026-09-20T12:00:00Z", ahora)).toBe("hace 5 días");
  });
});
