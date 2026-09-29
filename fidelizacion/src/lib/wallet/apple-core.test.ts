import { EventEmitter } from "node:events";
import type { ClientHttp2Session } from "node:http2";
import forge from "node-forge";
import { describe, expect, it } from "vitest";
import {
  armarPassJson,
  coloresPase,
  contraste,
  enviarPushes,
  firmarPkpass,
  leerCredencialesApple,
  leerTag,
  noModificado,
  normalizarPem,
  tagActualizacion,
  tokenDeAutorizacion,
  tokenValido,
  ultimaModificacion,
  type CredencialesApple,
  type DatosPaseApple,
} from "./apple-core";

/** Certificado autofirmado de prueba (NO son los de Apple). */
function certificadoDePrueba(cn: string) {
  const claves = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = claves.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 86_400_000);
  cert.validity.notAfter = new Date(Date.now() + 86_400_000);
  const attrs = [{ name: "commonName", value: cn }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(claves.privateKey, forge.md.sha256.create());
  return { cert: forge.pki.certificateToPem(cert), key: forge.pki.privateKeyToPem(claves.privateKey) };
}

const firmante = certificadoDePrueba("Pass Type ID: pass.com.point.fidelizacion");
const wwdr = certificadoDePrueba("Apple WWDR de prueba");
const cred: CredencialesApple = { passTypeId: "pass.com.point.fidelizacion", teamId: "ABCDE12345", cert: firmante.cert, key: firmante.key, wwdr: wwdr.cert };

const datos: DatosPaseApple = {
  serial: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  authToken: "t".repeat(48),
  puntos: 5,
  clienteNombre: "Sofía Gómez",
  urlPase: "https://point.app/w/a1b2c3d4e5f60718293a4b5c6d7e8f90/" + "f".repeat(64),
  urlTarjeta: "https://point.app/t/cafe-aurora",
  local: {
    nombre: "Café Aurora",
    colorPrimario: "#3b2a20",
    colorSecundario: "#e6633a",
    premios: [
      { nombre: "Café gratis", puntos: 8 },
      { nombre: "Desayuno", puntos: 15 },
    ],
    latitud: -32.9468,
    longitud: -60.6393,
  },
};

describe("credenciales", () => {
  it("valida y normaliza los PEM con \\n literales (como quedan en Vercel)", () => {
    const c = leerCredencialesApple({
      passTypeId: "pass.com.point.fidelizacion",
      teamId: "ABCDE12345",
      cert: firmante.cert.replace(/\n/g, "\\n"),
      key: firmante.key,
      wwdr: wwdr.cert,
    });
    expect(c.cert).toBe(normalizarPem(firmante.cert));
    expect(c.cert).toContain("\n");
  });

  it("rechaza datos inválidos sin mostrar los valores", () => {
    const base = { passTypeId: "pass.x", teamId: "ABCDE12345", cert: firmante.cert, key: firmante.key, wwdr: wwdr.cert };
    expect(() => leerCredencialesApple({ ...base, passTypeId: "com.x" })).toThrow(/APPLE_PASS_TYPE_ID/);
    expect(() => leerCredencialesApple({ ...base, teamId: "corto" })).toThrow(/APPLE_TEAM_ID/);
    expect(() => leerCredencialesApple({ ...base, key: "secreto-123" })).toThrow(/^APPLE_PASS_KEY no parece un PEM válido$/);
    expect(() => leerCredencialesApple({ ...base, wwdr: "x" })).toThrow(/APPLE_WWDR_CERT/);
  });
});

describe("pass.json", () => {
  const pase = armarPassJson(cred, datos, "https://fidelizacion-beta.vercel.app/");

  it("es un storeCard del local (no de Point) con el web service y el token", () => {
    expect(pase).toMatchObject({
      formatVersion: 1,
      passTypeIdentifier: "pass.com.point.fidelizacion",
      teamIdentifier: "ABCDE12345",
      serialNumber: datos.serial,
      authenticationToken: datos.authToken,
      webServiceURL: "https://fidelizacion-beta.vercel.app/api/apple-wallet",
      organizationName: "Café Aurora",
      logoText: "Café Aurora",
    });
    expect(pase.authenticationToken.length).toBeGreaterThanOrEqual(32);
  });

  it("puntos en primary, próximo premio y faltan en secondary", () => {
    expect(pase.storeCard.primaryFields[0]).toMatchObject({ key: "puntos", value: 5, changeMessage: "Sumaste puntos: ahora tenés %@" });
    const canje = armarPassJson(cred, { ...datos, ultimoMovimiento: "canje" }, "https://x.app");
    expect(canje.storeCard.primaryFields[0].changeMessage).toBe("Canjeaste tu premio: ahora tenés %@");
    expect(pase.storeCard.secondaryFields).toEqual([
      { key: "proximo", label: "PRÓXIMO PREMIO", value: "Café gratis" },
      { key: "faltan", label: "TE FALTAN", value: 3, textAlignment: "PKTextAlignmentRight" },
    ]);
  });

  it("dorso con todos los premios y el link a la tarjeta web", () => {
    const dorso = Object.fromEntries(pase.storeCard.backFields.map((f) => [f.key, f]));
    expect(dorso.premios.value).toBe("• Café gratis: 8 puntos\n• Desayuno: 15 puntos");
    expect(dorso.tarjeta.value).toBe("https://point.app/t/cafe-aurora");
  });

  it("Novedades en el dorso: siempre presente, con el último mensaje del local y changeMessage %@", () => {
    expect(pase.storeCard.backFields[0]).toEqual({ key: "novedades", label: "Novedades", value: "Todavía no hay novedades.", changeMessage: "%@" });
    const conMensaje = armarPassJson(cred, { ...datos, novedad: { titulo: "2x1 hoy", texto: "Medialunas hasta las 12" } }, "https://x.app");
    expect(conMensaje.storeCard.backFields[0].value).toBe("2x1 hoy\nMedialunas hasta las 12");
  });

  it("QR con el mismo link que Google y locations si hay coordenadas", () => {
    expect(pase.barcodes).toEqual([{ format: "PKBarcodeFormatQR", message: datos.urlPase, messageEncoding: "iso-8859-1" }]);
    expect(pase.locations?.[0]).toEqual({ latitude: -32.9468, longitude: -60.6393, relevantText: "Estás cerca de Café Aurora. Tenés 5 puntos" });
    const uno = armarPassJson(cred, { ...datos, puntos: 1 }, "https://x.app");
    expect(uno.locations?.[0].relevantText).toBe("Estás cerca de Café Aurora. Tenés 1 punto");
    const sinUbicacion = armarPassJson(cred, { ...datos, local: { ...datos.local, latitud: null, longitud: null } }, "https://x.app");
    expect(sinUbicacion).not.toHaveProperty("locations");
  });

  it("premio alcanzado: 'Listo para canjear'", () => {
    const listo = armarPassJson(cred, { ...datos, puntos: 20 }, "https://x.app");
    expect(listo.storeCard.secondaryFields[1]).toMatchObject({ value: "¡Listo para canjear!" });
  });

  it("colores legibles: texto contrastado y etiqueta en el acento sólo si se lee", () => {
    const oscuro = coloresPase("#3b2a20", "#e6633a");
    expect(oscuro.foregroundColor).toBe("rgb(255, 255, 255)");
    expect(oscuro.labelColor).toBe("rgb(230, 99, 58)");
    const claro = coloresPase("#f7f8f6", "#ffffff");
    expect(claro.foregroundColor).toBe("rgb(17, 19, 17)");
    expect(claro.labelColor).toBe(claro.foregroundColor);
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
});

describe(".pkpass", () => {
  it("arma el zip firmado con pass.json, imágenes, manifest y signature", () => {
    const png = Buffer.from("89504e470d0a1a0a", "hex");
    const pkpass = firmarPkpass(cred, armarPassJson(cred, datos, "https://x.app"), { "icon.png": png, "icon@2x.png": png, "strip.png": png });
    expect(pkpass.subarray(0, 2).toString()).toBe("PK");
    const nombres = pkpass.toString("latin1");
    for (const f of ["pass.json", "icon.png", "icon@2x.png", "strip.png", "manifest.json", "signature"]) expect(nombres).toContain(f);
  });

  it("sin icon.png no genera el pase", () => {
    expect(() => firmarPkpass(cred, {}, {})).toThrow(/icon.png/);
  });
});

describe("web service", () => {
  it("lee el header Authorization: ApplePass <token>", () => {
    expect(tokenDeAutorizacion("ApplePass abc123")).toBe("abc123");
    expect(tokenDeAutorizacion("Bearer abc123")).toBeNull();
    expect(tokenDeAutorizacion(null)).toBeNull();
    expect(tokenValido("abc123", "abc123")).toBe(true);
    expect(tokenValido("abc123", "abc124")).toBe(false);
    expect(tokenValido("abc123", null)).toBe(false);
  });

  it("If-Modified-Since con precisión de segundos (304)", () => {
    const d = new Date("2026-09-29T12:00:00.750Z");
    const lm = ultimaModificacion(d).toUTCString();
    expect(noModificado(d, lm)).toBe(true);
    expect(noModificado(new Date("2026-09-29T12:00:01.100Z"), lm)).toBe(false);
    expect(noModificado(d, null)).toBe(false);
  });

  it("passesUpdatedSince: tag opaco ida y vuelta", () => {
    const d = new Date("2026-09-29T12:00:00.750Z");
    expect(leerTag(tagActualizacion(d))?.getTime()).toBe(d.getTime());
    expect(leerTag("no-es-un-tag")).toBeNull();
    expect(leerTag(null)).toBeNull();
  });
});

describe("APNs", () => {
  it("manda {} a cada token con apns-topic = passTypeId y devuelve los status (410 = baja)", async () => {
    const pedidos: { headers: Record<string, string>; cuerpo: string }[] = [];
    const conexion: { host: string; opts: { cert: string; key: string } }[] = [];
    let cerrada = false;
    const sesion = Object.assign(new EventEmitter(), {
      close: () => (cerrada = true),
      request: (headers: Record<string, string>) => {
        const req = Object.assign(new EventEmitter(), {
          close: () => {},
          end: (cuerpo: string) => {
            pedidos.push({ headers, cuerpo });
            const status = headers[":path"].endsWith("/token-viejo") ? 410 : 200;
            setImmediate(() => {
              req.emit("response", { ":status": status });
              req.emit("end");
            });
          },
        });
        return req;
      },
    });
    const conectar = (host: string, opts: { cert: string; key: string }) => {
      conexion.push({ host, opts });
      return sesion as unknown as ClientHttp2Session;
    };

    const r = await enviarPushes(cred, ["token-ok", "token-viejo"], conectar);
    expect(r).toEqual([
      { token: "token-ok", status: 200 },
      { token: "token-viejo", status: 410 },
    ]);
    expect(conexion[0].host).toBe("https://api.push.apple.com");
    expect(conexion[0].opts).toEqual({ cert: cred.cert, key: cred.key });
    expect(pedidos[0].headers).toMatchObject({ ":method": "POST", ":path": "/3/device/token-ok", "apns-topic": "pass.com.point.fidelizacion" });
    expect(pedidos[0].cuerpo).toBe("{}");
    expect(cerrada).toBe(true);
  });

  it("sin tokens no abre conexión", async () => {
    await expect(enviarPushes(cred, [], () => { throw new Error("no debía conectar"); })).resolves.toEqual([]);
  });
});
