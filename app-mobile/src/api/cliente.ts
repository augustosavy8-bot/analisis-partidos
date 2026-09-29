import { File, Paths } from "expo-file-system";
import { API_URL } from "@/lib/config";
import type { Sesion, TarjetaDetalleApp, TarjetaResumenApp } from "./tipos";

/** Error de la API con el mensaje (ya en castellano) que devuelve el servidor. */
export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    readonly status: number,
  ) {
    super(mensaje);
  }
}

const SIN_CONEXION = "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.";

async function pedir<T>(ruta: string, opciones: { token?: string | null; metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/app/v1${ruta}`, {
      method: opciones.metodo ?? "GET",
      headers: {
        Accept: "application/json",
        ...(opciones.cuerpo ? { "Content-Type": "application/json" } : {}),
        ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
      },
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(SIN_CONEXION, 0);
  }
  const datos = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new ErrorApi(datos?.error ?? "Algo salió mal. Probá de nuevo en un rato.", res.status);
  return datos as T;
}

export const api = {
  ingresar: (whatsapp: string) => pedir<Sesion>("/sesion", { metodo: "POST", cuerpo: { whatsapp } }),
  salir: (token: string) => pedir<{ ok: true }>("/sesion", { metodo: "DELETE", token }),
  tarjetas: (token: string) => pedir<{ nombre: string; tarjetas: TarjetaResumenApp[] }>("/tarjetas", { token }),
  tarjeta: (token: string, slug: string) => pedir<TarjetaDetalleApp>(`/tarjetas/${encodeURIComponent(slug)}`, { token }),
  eliminarCuenta: (token: string) => pedir<{ ok: true }>("/cuenta", { metodo: "DELETE", token }),

  /** Baja el .pkpass (con el token) a la caché y devuelve su URI local, para PassKit. */
  async bajarPaseApple(token: string, slug: string): Promise<string> {
    const destino = new File(Paths.cache, `point-${slug}.pkpass`);
    try {
      const archivo = await File.downloadFileAsync(`${API_URL}/api/app/v1/tarjetas/${encodeURIComponent(slug)}/apple-wallet`, destino, {
        headers: { Authorization: `Bearer ${token}` },
        idempotent: true,
      });
      return archivo.uri;
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "";
      if (/401/.test(mensaje)) throw new ErrorApi("Tu sesión venció. Volvé a entrar.", 401);
      if (/50\d/.test(mensaje)) throw new ErrorApi("No pudimos crear tu pase. Probá de nuevo en un rato.", 502);
      throw new ErrorApi(SIN_CONEXION, 0);
    }
  },
};
