import { describe, expect, it } from "vitest";
import { fuenteIcono } from "./icono";

describe("fuente del ícono", () => {
  it("usa el ícono, si no el logo, si no la inicial", () => {
    expect(fuenteIcono({ icono_url: "https://s/i.png", logo_url: "https://s/l.png" })).toEqual({ tipo: "icono", url: "https://s/i.png" });
    expect(fuenteIcono({ icono_url: null, logo_url: "https://s/l.png" })).toEqual({ tipo: "logo", url: "https://s/l.png" });
    expect(fuenteIcono({ icono_url: null, logo_url: null })).toEqual({ tipo: "inicial" });
  });
});
