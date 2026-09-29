import { generateKeyPairSync, createVerify } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_WALLET,
  agregarMensaje,
  armarClase,
  armarObjeto,
  idClase,
  idObjeto,
  jwtGuardar,
  leerCredenciales,
  olvidarTokens,
  patchObjeto,
  textoProgreso,
  tokenAcceso,
  upsertObjeto,
  urlGuardar,
  type CredencialesGoogle,
  type TarjetaGoogle,
} from "./google-core";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const cred: CredencialesGoogle = { issuerId: "3388000000012345678", clientEmail: "point@proyecto.iam.gserviceaccount.com", privateKey: pem };
const APP = "https://point.app/";

const tarjeta: TarjetaGoogle = {
  serial: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  token: "f".repeat(64),
  puntos: 5,
  clienteNombre: "Sofía Gómez",
  localSlug: "cafe-aurora",
  localNombre: "Café Aurora",
  proximo: { nombre: "Café gratis", puntos: 8 },
};

function decodificar(jwt: string) {
  const [h, p, firma] = jwt.split(".");
  const valida = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(firma, "base64url"));
  return {
    cabecera: JSON.parse(Buffer.from(h, "base64url").toString()),
    payload: JSON.parse(Buffer.from(p, "base64url").toString()),
    valida,
  };
}

describe("credenciales", () => {
  const json = JSON.stringify({ client_email: cred.clientEmail, private_key: pem, type: "service_account" });

  it("lee el issuer y el JSON de la cuenta de servicio", () => {
    expect(leerCredenciales(cred.issuerId, json)).toEqual(cred);
  });

  it("rechaza datos inválidos con un mensaje claro", () => {
    expect(() => leerCredenciales("abc", json)).toThrow(/ISSUER_ID/);
    expect(() => leerCredenciales(cred.issuerId, "{no es json")).toThrow(/JSON válido/);
    expect(() => leerCredenciales(cred.issuerId, JSON.stringify({ private_key: pem }))).toThrow(/client_email/);
    expect(() => leerCredenciales(cred.issuerId, JSON.stringify({ client_email: "a@b" }))).toThrow(/private_key/);
  });
});

describe("clase del local", () => {
  const clase = armarClase(
    cred.issuerId,
    { slug: "cafe-aurora", nombre: "Café Aurora", logoUrl: null, colorPrimario: "#0f172a", premios: [{ nombre: "Café gratis", puntos: 8 }, { nombre: "Desayuno", puntos: 15 }] },
    APP,
  );

  it("usa el id {issuer}.local_{slug} y los datos del local", () => {
    expect(clase.id).toBe(`${cred.issuerId}.local_cafe-aurora`);
    expect(clase.programName).toBe("Café Aurora");
    expect(clase.issuerName).toBe("Café Aurora");
    expect(clase.hexBackgroundColor).toBe("#0f172a");
    expect(clase.reviewStatus).toBe("UNDER_REVIEW");
  });

  it("arma URLs absolutas con APP_URL (sin doble barra) y usa el ícono si no hay logo", () => {
    expect(clase.programLogo.sourceUri.uri).toBe("https://point.app/t/cafe-aurora/icono?s=660");
    expect(clase.heroImage.sourceUri.uri).toBe("https://point.app/t/cafe-aurora/cabecera");
  });

  it("usa el logo del local si tiene y lista los premios", () => {
    const conLogo = armarClase(cred.issuerId, { slug: "x", nombre: "X", logoUrl: "https://cdn/logo.png", colorPrimario: "#000000", premios: [] }, APP);
    expect(conLogo.programLogo.sourceUri.uri).toBe("https://cdn/logo.png");
    expect(conLogo.textModulesData[0].body).toMatch(/Sumá puntos/);
    expect(clase.textModulesData[0].body).toBe("Café gratis · 8 puntos\nDesayuno · 15 puntos");
  });

  it("carga la ubicación del local en merchantLocations (y [] para borrarla)", () => {
    expect(clase.merchantLocations).toEqual([]);
    const conUbicacion = armarClase(
      cred.issuerId,
      { slug: "x", nombre: "X", logoUrl: null, colorPrimario: "#000000", premios: [], ubicacion: { latitud: -32.9468, longitud: -60.6393 } },
      APP,
    );
    expect(conUbicacion.merchantLocations).toEqual([{ latitude: -32.9468, longitude: -60.6393 }]);
  });
});

describe("objeto de la tarjeta", () => {
  const objeto = armarObjeto(cred.issuerId, tarjeta, APP);

  it("usa el id {issuer}.{serial} y apunta a la clase del local", () => {
    expect(objeto.id).toBe(idObjeto(cred.issuerId, tarjeta.serial));
    expect(objeto.classId).toBe(idClase(cred.issuerId, "cafe-aurora"));
    expect(objeto.state).toBe("ACTIVE");
  });

  it("lleva puntos, progreso y nombre del cliente", () => {
    expect(objeto.accountName).toBe("Sofía Gómez");
    expect(objeto.loyaltyPoints).toEqual({ label: "Puntos", balance: { int: 5 } });
    expect(objeto.secondaryLoyaltyPoints).toEqual({ label: "Próximo premio", balance: { string: "5/8" } });
    expect(objeto.textModulesData[0].body).toBe("Café gratis · te faltan 3 puntos");
  });

  it("tiene un QR con el link /w/[serial]/[token] y la franja con los sellos", () => {
    expect(objeto.barcode).toEqual({ type: "QR_CODE", value: `https://point.app/w/${tarjeta.serial}/${tarjeta.token}`, alternateText: "Tu tarjeta" });
    expect(objeto.heroImage.sourceUri.uri).toBe("https://point.app/t/cafe-aurora/franja?p=5&m=8");
  });

  it("sin premios no muestra progreso", () => {
    const sin = armarObjeto(cred.issuerId, { ...tarjeta, proximo: null }, APP);
    expect(sin).not.toHaveProperty("secondaryLoyaltyPoints");
    expect(sin.heroImage.sourceUri.uri).toBe("https://point.app/t/cafe-aurora/franja?p=5");
  });

  it("pide notificación sólo cuando se lo indicamos (notifyPreference es por request)", () => {
    expect(objeto).not.toHaveProperty("notifyPreference");
    expect(armarObjeto(cred.issuerId, tarjeta, APP, true).notifyPreference).toBe("NOTIFY_ON_UPDATE");
  });

  it("describe el progreso", () => {
    expect(textoProgreso(7, { nombre: "Café", puntos: 8 })).toBe("Café · te falta 1 punto");
    expect(textoProgreso(8, { nombre: "Café", puntos: 8 })).toBe("¡Ya podés canjear Café!");
    expect(textoProgreso(3, null)).toMatch(/Sumá/);
  });
});

describe("JWT Guardar en Google Wallet", () => {
  it("es skinny: sólo el id del objeto, firmado RS256 por la cuenta de servicio", () => {
    const jwt = jwtGuardar(cred, idObjeto(cred.issuerId, tarjeta.serial), ["https://point.app"], 1_800_000_000_000);
    const { cabecera, payload, valida } = decodificar(jwt);
    expect(valida).toBe(true);
    expect(cabecera).toEqual({ alg: "RS256", typ: "JWT" });
    expect(payload).toEqual({
      iss: cred.clientEmail,
      aud: "google",
      typ: "savetowallet",
      iat: 1_800_000_000,
      origins: ["https://point.app"],
      payload: { loyaltyObjects: [{ id: `${cred.issuerId}.${tarjeta.serial}` }] },
    });
    expect(urlGuardar(jwt)).toBe(`https://pay.google.com/gp/v/save/${jwt}`);
    expect(urlGuardar(jwt).length).toBeLessThan(1000);
  });
});

describe("API (con fetch simulado)", () => {
  beforeEach(() => olvidarTokens());

  const respuestaToken = () => new Response(JSON.stringify({ access_token: "tok-1", expires_in: 3600 }), { status: 200 });

  it("pide el token con una aserción firmada y lo cachea hasta 5 minutos antes de vencer", async () => {
    const f = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const cuerpo = new URLSearchParams(String(init?.body));
      expect(cuerpo.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
      const { payload, valida } = decodificar(cuerpo.get("assertion")!);
      expect(valida).toBe(true);
      expect(payload.scope).toBe("https://www.googleapis.com/auth/wallet_object.issuer");
      return respuestaToken();
    });
    const t0 = 1_800_000_000_000;
    expect(await tokenAcceso(cred, f as typeof fetch, t0)).toBe("tok-1");
    expect(await tokenAcceso(cred, f as typeof fetch, t0 + 50 * 60_000)).toBe("tok-1");
    expect(f).toHaveBeenCalledTimes(1);
    await tokenAcceso(cred, f as typeof fetch, t0 + 56 * 60_000);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("upsert del objeto: si el insert da 409, hace PATCH", async () => {
    const llamadas: string[] = [];
    const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("oauth2")) return respuestaToken();
      llamadas.push(`${init?.method} ${u.replace(API_WALLET, "")}`);
      return new Response("{}", { status: init?.method === "POST" ? 409 : 200 });
    });
    await upsertObjeto(cred, tarjeta, APP, f as typeof fetch);
    expect(llamadas).toEqual([
      "POST /loyaltyObject",
      `PATCH /loyaltyObject/${encodeURIComponent(idObjeto(cred.issuerId, tarjeta.serial))}`,
    ]);
  });

  it("PATCH del objeto: un 404 no es error, un 500 sí", async () => {
    const con = (status: number) =>
      vi.fn(async (url: string | URL | Request) => (String(url).includes("oauth2") ? respuestaToken() : new Response("x", { status })));
    await expect(patchObjeto(cred, tarjeta, APP, con(404) as typeof fetch)).resolves.toBe(false);
    await expect(patchObjeto(cred, tarjeta, APP, con(200) as typeof fetch)).resolves.toBe(true);
    await expect(patchObjeto(cred, tarjeta, APP, con(500) as typeof fetch)).rejects.toThrow(/500/);
  });

  it("PATCH con aviso: manda notifyPreference en el cuerpo", async () => {
    let cuerpo: Record<string, unknown> = {};
    const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("oauth2")) return respuestaToken();
      cuerpo = JSON.parse(String(init?.body));
      return new Response("{}", { status: 200 });
    });
    await patchObjeto(cred, tarjeta, APP, f as typeof fetch, true);
    expect(cuerpo).toMatchObject({ loyaltyPoints: { balance: { int: 5 } }, notifyPreference: "NOTIFY_ON_UPDATE" });
  });

  it("addMessage: TEXT_AND_NOTIFY al objeto de la tarjeta; 404 no es error", async () => {
    const llamadas: { url: string; cuerpo: unknown }[] = [];
    const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("oauth2")) return respuestaToken();
      llamadas.push({ url: String(url).replace(API_WALLET, ""), cuerpo: JSON.parse(String(init?.body)) });
      return new Response("{}", { status: llamadas.length === 1 ? 200 : 404 });
    });
    const m = { id: "msg-1", titulo: "2x1 hoy", texto: "Medialunas 2x1 hasta las 12" };
    await expect(agregarMensaje(cred, tarjeta.serial, m, f as typeof fetch)).resolves.toBe(true);
    await expect(agregarMensaje(cred, tarjeta.serial, m, f as typeof fetch)).resolves.toBe(false);
    expect(llamadas[0]).toEqual({
      url: `/loyaltyObject/${encodeURIComponent(idObjeto(cred.issuerId, tarjeta.serial))}/addMessage`,
      cuerpo: { message: { id: "msg-1", header: "2x1 hoy", body: "Medialunas 2x1 hasta las 12", messageType: "TEXT_AND_NOTIFY" } },
    });
  });
});
