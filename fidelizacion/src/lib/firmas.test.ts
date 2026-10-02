import { describe, expect, it } from "vitest";
import { firmar, verificarFirma } from "./firmas";

const S = "secreto-de-prueba";
const ahora = () => Math.floor(Date.now() / 1000);

describe("firmas HMAC", () => {
  it("verifica un token válido", () => {
    const t = firmar("qr", { a: 1, exp: ahora() + 60 }, S);
    expect(verificarFirma<{ a: number; exp: number }>("qr", t, S)?.a).toBe(1);
  });
  it("rechaza token vencido", () => {
    expect(verificarFirma("qr", firmar("qr", { exp: ahora() - 1 }, S), S)).toBeNull();
  });
  it("rechaza token adulterado o con otro secreto", () => {
    const t = firmar("qr", { a: 1, exp: ahora() + 60 }, S);
    const [c, f] = t.split(".");
    const otro = Buffer.from(JSON.stringify({ a: 2, exp: ahora() + 60, typ: "qr" })).toString("base64url");
    expect(verificarFirma("qr", `${otro}.${f}`, S)).toBeNull();
    expect(verificarFirma("qr", `${c}.${f}`, "otro")).toBeNull();
    expect(verificarFirma("qr", "basura", S)).toBeNull();
    expect(verificarFirma("qr", undefined, S)).toBeNull();
  });
  it("un token de un tipo no sirve como otro (toque pendiente ≠ sesión de mozo)", () => {
    const toque = firmar("toque", { mozoId: "m", localId: "l", localSlug: "s", exp: ahora() + 60 }, S);
    expect(verificarFirma("toque", toque, S)).not.toBeNull();
    expect(verificarFirma("mozo", toque, S)).toBeNull();
    expect(verificarFirma("qr", toque, S)).toBeNull();
  });
  it("no se puede cambiar el tipo declarado en el cuerpo", () => {
    const t = firmar("toque", { exp: ahora() + 60 }, S);
    const [, f] = t.split(".");
    const cuerpo = Buffer.from(JSON.stringify({ exp: ahora() + 60, typ: "mozo" })).toString("base64url");
    expect(verificarFirma("mozo", `${cuerpo}.${f}`, S)).toBeNull();
  });
});
