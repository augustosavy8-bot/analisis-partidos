import { describe, expect, it } from "vitest";
import { firmar, verificarFirma } from "./firmas";

const S = "secreto-de-prueba";
const ahora = () => Math.floor(Date.now() / 1000);

describe("firmas HMAC", () => {
  it("verifica un token válido", () => {
    const t = firmar({ a: 1, exp: ahora() + 60 }, S);
    expect(verificarFirma<{ a: number; exp: number }>(t, S)?.a).toBe(1);
  });
  it("rechaza token vencido", () => {
    expect(verificarFirma(firmar({ exp: ahora() - 1 }, S), S)).toBeNull();
  });
  it("rechaza token adulterado o con otro secreto", () => {
    const t = firmar({ a: 1, exp: ahora() + 60 }, S);
    const [c, f] = t.split(".");
    const otro = Buffer.from(JSON.stringify({ a: 2, exp: ahora() + 60 })).toString("base64url");
    expect(verificarFirma(`${otro}.${f}`, S)).toBeNull();
    expect(verificarFirma(`${c}.${f}`, "otro")).toBeNull();
    expect(verificarFirma("basura", S)).toBeNull();
    expect(verificarFirma(undefined, S)).toBeNull();
  });
});
