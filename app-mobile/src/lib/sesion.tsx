import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { api, ErrorApi } from "@/api/cliente";
import type { Sesion } from "@/api/tipos";

const CLAVE = "point.sesion";

type ValorSesion = {
  /** undefined = todavía leyendo el llavero; null = sin sesión. */
  sesion: Sesion | null | undefined;
  entrar: (whatsapp: string) => Promise<void>;
  salir: () => Promise<void>;
  eliminarCuenta: () => Promise<void>;
  /** Para las pantallas: si la API dice 401, cerramos la sesión. */
  manejarError: (e: unknown) => string;
};

const Contexto = createContext<ValorSesion | null>(null);

/** Sesión del cliente: el token de dispositivo vive en el llavero de iOS (SecureStore). */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined);

  useEffect(() => {
    SecureStore.getItemAsync(CLAVE)
      .then((v) => setSesion(v ? (JSON.parse(v) as Sesion) : null))
      .catch(() => setSesion(null));
  }, []);

  const guardar = useCallback(async (s: Sesion | null) => {
    if (s) await SecureStore.setItemAsync(CLAVE, JSON.stringify(s), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    else await SecureStore.deleteItemAsync(CLAVE);
    setSesion(s);
  }, []);

  const entrar = useCallback(async (whatsapp: string) => guardar(await api.ingresar(whatsapp)), [guardar]);

  const salir = useCallback(async () => {
    const token = sesion?.token;
    await guardar(null);
    if (token) api.salir(token).catch(() => {}); // si falla, el token igual queda olvidado en este celular
  }, [sesion, guardar]);

  const eliminarCuenta = useCallback(async () => {
    if (!sesion) return;
    await api.eliminarCuenta(sesion.token);
    await guardar(null);
  }, [sesion, guardar]);

  const manejarError = useCallback(
    (e: unknown) => {
      if (e instanceof ErrorApi && e.status === 401) guardar(null);
      return e instanceof Error ? e.message : "Algo salió mal.";
    },
    [guardar],
  );

  const valor = useMemo(() => ({ sesion, entrar, salir, eliminarCuenta, manejarError }), [sesion, entrar, salir, eliminarCuenta, manejarError]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const v = useContext(Contexto);
  if (!v) throw new Error("useSesion fuera de ProveedorSesion");
  return v;
}
