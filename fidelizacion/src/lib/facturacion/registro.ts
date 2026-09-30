/**
 * Registro propio de un comercio (validación pura: se usa en la server action
 * y en los tests). Los datos fiscales son opcionales, pero si vienen se validan
 * en serio: un CUIT con el dígito verificador mal es un typo que después rompe
 * la factura electrónica.
 */
import { RUBROS } from "@/lib/interes";

export const CONDICIONES_FISCALES = {
  monotributo: "Monotributo",
  responsable_inscripto: "Responsable inscripto",
  exento: "Exento",
} as const;
export type CondicionFiscal = keyof typeof CONDICIONES_FISCALES;

export type DatosComercio = {
  comercio: string;
  rubro: string;
  razonSocial: string | null;
  cuit: string | null;
  condicionFiscal: CondicionFiscal | null;
};

export type DatosRegistro = DatosComercio & {
  nombre: string;
  email: string;
  password: string;
  plan: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** CUIT/CUIL argentino: 11 dígitos con dígito verificador (módulo 11). */
export function cuitValido(cuit: string): boolean {
  if (!/^\d{11}$/.test(cuit)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((s, p, i) => s + p * Number(cuit[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return verificador === Number(cuit[10]);
}

/** "20-12345678-9" / "20 12345678 9" → "20123456789". */
export function limpiarCuit(v: string): string {
  return v.replace(/[\s.-]/g, "");
}

const texto = (entrada: Record<string, unknown>, k: string) => String(entrada[k] ?? "").trim().replace(/\s+/g, " ");

/** Los datos del comercio (se validan al registrarse y otra vez al crear el comercio). */
export function validarDatosComercio(entrada: Record<string, unknown>): { datos: DatosComercio } | { error: string } {
  const comercio = texto(entrada, "comercio");
  const rubro = texto(entrada, "rubro");
  const razonSocial = texto(entrada, "razon_social");
  const cuit = limpiarCuit(texto(entrada, "cuit"));
  const condicion = texto(entrada, "condicion_fiscal");
  if (comercio.length < 2 || comercio.length > 60) return { error: "Poné el nombre de tu local." };
  if (!RUBROS.includes(rubro)) return { error: "Elegí el rubro." };
  if (razonSocial && (razonSocial.length < 2 || razonSocial.length > 120)) return { error: "Revisá la razón social." };
  if (cuit && !cuitValido(cuit)) return { error: "El CUIT no es válido: revisá los 11 números." };
  if (condicion && !(condicion in CONDICIONES_FISCALES)) return { error: "Elegí la condición fiscal." };
  return {
    datos: {
      comercio,
      rubro,
      razonSocial: razonSocial || null,
      cuit: cuit || null,
      condicionFiscal: (condicion as CondicionFiscal) || null,
    },
  };
}

export function validarRegistro(entrada: Record<string, string>): { datos: DatosRegistro } | { error: string } {
  const nombre = texto(entrada, "nombre");
  const email = texto(entrada, "email").toLowerCase();
  const password = entrada.password ?? "";
  const plan = texto(entrada, "plan");

  if (nombre.length < 2 || nombre.length > 80) return { error: "Poné tu nombre." };
  if (!EMAIL.test(email) || email.length > 120) return { error: "Revisá el email." };
  if (password.length < 8) return { error: "La contraseña tiene que tener al menos 8 caracteres." };
  if (password.length > 72) return { error: "La contraseña es demasiado larga." };
  const c = validarDatosComercio(entrada);
  if ("error" in c) return c;
  if (entrada.acepto !== "on") return { error: "Tenés que aceptar los términos para seguir." };

  return {
    datos: {
      nombre,
      email,
      password,
      ...c.datos,
      plan: /^[a-z0-9_]{2,30}$/.test(plan) ? plan : null,
    },
  };
}
