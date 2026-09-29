import { describe, expect, it } from "vitest";
import { leerCoordenadas, urlMapa } from "./coordenadas";

describe("leerCoordenadas", () => {
  it("entiende lo que copia Google Maps", () => {
    expect(leerCoordenadas("-32.946812, -60.639321")).toEqual({ latitud: -32.946812, longitud: -60.639321 });
    expect(leerCoordenadas("  (-32.9468,-60.6393) ")).toEqual({ latitud: -32.9468, longitud: -60.6393 });
    expect(leerCoordenadas("-32.9468 -60.6393")).toEqual({ latitud: -32.9468, longitud: -60.6393 });
    expect(leerCoordenadas("-32,9468; -60,6393")).toEqual({ latitud: -32.9468, longitud: -60.6393 });
  });

  it("rechaza texto que no son coordenadas o fuera de rango", () => {
    expect(leerCoordenadas("")).toBeNull();
    expect(leerCoordenadas("Av. Pellegrini 1234")).toBeNull();
    expect(leerCoordenadas("-32.9468")).toBeNull();
    expect(leerCoordenadas("95, 10")).toBeNull();
    expect(leerCoordenadas("10, 190")).toBeNull();
  });

  it("arma el link para verificar en el mapa", () => {
    expect(urlMapa({ latitud: -32.9468, longitud: -60.6393 })).toBe("https://www.google.com/maps?q=-32.9468,-60.6393");
  });
});
