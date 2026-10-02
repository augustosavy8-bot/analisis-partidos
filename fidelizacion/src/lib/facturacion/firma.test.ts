import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { leerXSignature, manifestFirma, verificarFirmaMp } from "./firma";

const SECRETO = "clave-secreta-de-prueba";
const firmar = (manifest: string) => createHmac("sha256", SECRETO).update(manifest).digest("hex");

describe("firma de webhooks de Mercado Pago", () => {
  it("lee el header ts/v1", () => {
    expect(leerXSignature("ts=1704908010,v1=abc")).toEqual({ ts: "1704908010", v1: "abc" });
    expect(leerXSignature(" ts=1 , v1=ff ")).toEqual({ ts: "1", v1: "ff" });
    expect(leerXSignature("v1=abc")).toBeNull();
    expect(leerXSignature(null)).toBeNull();
  });

  it("arma el manifest como dice la documentación", () => {
    expect(manifestFirma("123456", "req-1", "99")).toBe("id:123456;request-id:req-1;ts:99;");
    // data.id alfanumérico en mayúsculas → minúsculas.
    expect(manifestFirma("ORD01JQ4S4KY8", "req-1", "99")).toBe("id:ord01jq4s4ky8;request-id:req-1;ts:99;");
    // Si falta un valor, se saca del manifest.
    expect(manifestFirma(null, "req-1", "99")).toBe("request-id:req-1;ts:99;");
    expect(manifestFirma("5", null, "99")).toBe("id:5;ts:99;");
  });

  it("acepta una firma válida", () => {
    const v1 = firmar("id:987;request-id:abc-123;ts:1704908010;");
    expect(verificarFirmaMp({ xSignature: `ts=1704908010,v1=${v1}`, xRequestId: "abc-123", dataId: "987", secreto: SECRETO })).toEqual({ valida: true });
  });

  it("rechaza firmas falsas, alteradas o con otra clave", () => {
    const v1 = firmar("id:987;request-id:abc-123;ts:1704908010;");
    const base = { xSignature: `ts=1704908010,v1=${v1}`, xRequestId: "abc-123", dataId: "987", secreto: SECRETO };
    expect(verificarFirmaMp({ ...base, dataId: "988" }).valida).toBe(false); // otro recurso
    expect(verificarFirmaMp({ ...base, xRequestId: "otro" }).valida).toBe(false);
    expect(verificarFirmaMp({ ...base, xSignature: `ts=1704908011,v1=${v1}` }).valida).toBe(false); // otro ts
    expect(verificarFirmaMp({ ...base, secreto: "otra-clave" }).valida).toBe(false);
    expect(verificarFirmaMp({ ...base, xSignature: "ts=1,v1=zz" }).valida).toBe(false);
    expect(verificarFirmaMp({ ...base, xSignature: null }).valida).toBe(false);
  });
});
