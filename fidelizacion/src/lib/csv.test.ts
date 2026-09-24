import { describe, expect, it } from "vitest";
import { aCSV } from "./csv";

describe("aCSV", () => {
  it("separa con ; y agrega BOM", () => {
    expect(aCSV([["a", 1], ["b", null]])).toBe("﻿a;1\r\nb;\r\n");
  });
  it("escapa comillas, separadores y saltos", () => {
    expect(aCSV([['Juan "el" Pérez', "x;y"]])).toBe('﻿"Juan ""el"" Pérez";"x;y"\r\n');
  });
  it("neutraliza fórmulas", () => {
    expect(aCSV([["=HYPERLINK(1)", "+5493411234567"]])).toBe("﻿'=HYPERLINK(1);'+5493411234567\r\n");
  });
});
