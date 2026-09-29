import { Redirect } from "expo-router";
import { useSesion } from "@/lib/sesion";

/** Entrada: a "Mis tarjetas" si hay sesión; si no, al ingreso. */
export default function Inicio() {
  const { sesion } = useSesion();
  return <Redirect href={sesion ? "/tarjetas" : "/ingresar"} />;
}
