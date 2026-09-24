import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Formato: scrypt$N$r$p$salt(base64url)$hash(base64url)
const N = 16384;
const R = 8;
const P = 1;
const LARGO = 32;

export function esPinValido(pin: string): boolean {
  return /^[0-9]{4,6}$/.test(pin);
}

export function hashearPin(pin: string): string {
  if (!esPinValido(pin)) throw new Error("El PIN debe tener entre 4 y 6 dígitos");
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, LARGO, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export function verificarPin(pin: string, guardado: string | null | undefined): boolean {
  if (!guardado || !esPinValido(pin)) return false;
  const partes = guardado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = partes;
  const esperado = Buffer.from(hashB64, "base64url");
  const calculado = scryptSync(pin, Buffer.from(saltB64, "base64url"), esperado.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}
