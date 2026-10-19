import { describe, expect, it } from "vitest";
import { armarMailResumen, comparar, textoSemana, type DatosResumen } from "./resumen";

const datos: DatosResumen = {
  visitas: 48,
  visitas_antes: 40,
  nuevos: 12,
  nuevos_antes: 15,
  canjes: 6,
  canjes_antes: 6,
  clientes_total: 230,
  inactivos: 9,
  mozo_top: { nombre: "Barra", sumas: 21 },
  cumples: [{ nombre: "Rita", dia: 21, mes: 10 }],
};
const urls = { urlPanel: "https://p.app/panel/nucia", urlReactivar: "https://p.app/panel/nucia/whatsapp", urlBaja: "https://p.app/resumen/baja?t=x" };

describe("resumen semanal", () => {
  it("compara con la semana pasada", () => {
    expect(comparar(48, 40)).toMatchObject({ flecha: "↑", texto: "8 más que la semana pasada", sube: true });
    expect(comparar(12, 15)).toMatchObject({ flecha: "↓", texto: "3 menos que la semana pasada", sube: false });
    expect(comparar(6, 6)).toMatchObject({ flecha: "=", sube: null });
  });

  it("asunto, números, reactivar, cumpleaños y baja", () => {
    const m = armarMailResumen({ local: "Nucia", semana: "13 al 19 de octubre", datos, ...urls });
    expect(m.asunto).toBe("Nucia: 48 visitas esta semana");
    expect(m.texto).toContain("Visitas: 48 (8 más que la semana pasada)");
    expect(m.texto).toContain("9 clientes no vuelven hace 30 días o más");
    expect(m.texto).toContain("Rita (21 oct)");
    expect(m.texto).toContain(urls.urlBaja);
    expect(m.html).toContain(urls.urlReactivar);
    expect(m.html).toContain("Quien más sumó");
  });

  it("escapa el nombre del local y no muestra bloques vacíos", () => {
    const m = armarMailResumen({
      local: "Bar <b>&</b>",
      semana: "x",
      datos: { ...datos, visitas: 0, inactivos: 0, mozo_top: null, cumples: [] },
      ...urls,
    });
    expect(m.asunto).toBe("Bar <b>&</b>: tu resumen de la semana");
    expect(m.html).toContain("Bar &lt;b&gt;&amp;&lt;/b&gt;");
    expect(m.html).not.toContain("Escribirles");
    expect(m.html).not.toContain("Cumplen años");
  });

  it("texto de la semana (lunes 20/10 → 13 al 19 de octubre)", () => {
    const hasta = new Date("2026-10-20T03:00:00Z");
    expect(textoSemana(hasta, "America/Argentina/Buenos_Aires")).toBe("13 al 19 de octubre");
    expect(textoSemana(new Date("2026-10-06T03:00:00Z"), "America/Argentina/Buenos_Aires")).toBe("29 de septiembre al 5 de octubre");
  });
});
