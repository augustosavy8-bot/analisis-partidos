import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/lib/config";
import { ErrorApi } from "./cliente";

/** API de superadmin (grabar chips). El token es el de Supabase Auth: dura ~1 hora. */
export type SesionAdmin = { token: string; vence: number | null; email: string };
export type LocalAdmin = { id: string; slug: string; nombre: string; activo: boolean; chips: number; equipo: { id: string; nombre: string }[] };
export type ClavesChipApi = { uid: string; base: string; k0: string; kMeta: string; kFile: string };

const CLAVE = "point.admin";

async function pedir<T>(ruta: string, opciones: { token?: string; metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/app/v1/admin${ruta}`, {
      method: opciones.metodo ?? "GET",
      headers: {
        Accept: "application/json",
        ...(opciones.cuerpo ? { "Content-Type": "application/json" } : {}),
        ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
      },
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.", 0);
  }
  const datos = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new ErrorApi(datos?.error ?? "Algo salió mal. Probá de nuevo en un rato.", res.status);
  return datos as T;
}

export const apiAdmin = {
  ingresar: (email: string, password: string) => pedir<SesionAdmin>("/sesion", { metodo: "POST", cuerpo: { email, password } }),
  locales: (token: string) => pedir<{ locales: LocalAdmin[] }>("/locales", { token }),
  claves: (token: string, uid: string) => pedir<ClavesChipApi>("/chips/claves", { metodo: "POST", token, cuerpo: { uid } }),
  registrar: (token: string, d: { uid: string; p: string; m: string; localId: string; mozoId: string | null; etiqueta: string | null }) =>
    pedir<{ ok: true; chipId: string }>("/chips", { metodo: "POST", token, cuerpo: d }),
};

export async function leerSesionAdmin(): Promise<SesionAdmin | null> {
  try {
    const v = await SecureStore.getItemAsync(CLAVE);
    const s = v ? (JSON.parse(v) as SesionAdmin) : null;
    if (s?.vence && s.vence * 1000 < Date.now() + 60_000) return null;
    return s;
  } catch {
    return null;
  }
}

export async function guardarSesionAdmin(s: SesionAdmin | null) {
  if (s) await SecureStore.setItemAsync(CLAVE, JSON.stringify(s), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(CLAVE);
}
