import { describe, expect, it } from "vitest";
import { esPinValido, hashearPin, verificarPin } from "./pin";

describe("PIN de mozos", () => {
  it("valida formato de 4 a 6 dígitos", () => {
    expect(esPinValido("1234")).toBe(true);
    expect(esPinValido("123456")).toBe(true);
    expect(esPinValido("123")).toBe(false);
    expect(esPinValido("12a4")).toBe(false);
  });

  it("verifica el PIN correcto y rechaza el incorrecto", () => {
    const hash = hashearPin("4821");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verificarPin("4821", hash)).toBe(true);
    expect(verificarPin("4822", hash)).toBe(false);
  });

  it("verifica los hashes del seed", () => {
    expect(verificarPin("1234", "scrypt$16384$8$1$_5AUqJaO1pqsAoJwMs-FXg$pmPTpaHpZ70huoEbh-_MJE5efFt-9z8QcFaR1KDCcUY")).toBe(true);
    expect(verificarPin("5678", "scrypt$16384$8$1$-NXb9bInMaQycXmb3eSuxg$W-4otBydQ2wgbVCcRb6uR5CK6nF1tj4f93GHrynFlCg")).toBe(true);
  });

  it("rechaza hashes vacíos o mal formados", () => {
    expect(verificarPin("1234", null)).toBe(false);
    expect(verificarPin("1234", "md5$abc")).toBe(false);
  });
});
