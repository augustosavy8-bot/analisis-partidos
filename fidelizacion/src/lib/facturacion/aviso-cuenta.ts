/**
 * El cartel que ve el comercio arriba del panel según el estado de su cuenta.
 * Función pura (testeada): recibe el acceso ya calculado y devuelve qué decir.
 */
import type { Acceso } from "./acceso";

export type AvisoCuenta = {
  tono: "info" | "aviso" | "grave";
  titulo: string;
  texto: string;
  boton: string;
};

const DIA = 86_400_000;

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));

export function avisoDeCuenta(a: Acceso, ahora: Date = new Date()): AvisoCuenta | null {
  switch (a.nivel) {
    case "gracia":
      return {
        tono: "aviso",
        titulo: "No pudimos cobrar tu suscripción",
        texto: `Mercado Pago lo va a reintentar. Revisá que tu tarjeta tenga fondos o cambiala${a.hasta ? ` antes del ${fechaCorta(a.hasta)}` : ""}: después de esa fecha el panel se restringe.`,
        boton: "Revisar tarjeta",
      };
    case "restringido":
      if (a.estado === "paused") {
        return {
          tono: "aviso",
          titulo: "Tu suscripción está pausada",
          texto: "No se te cobra, pero el panel está restringido. Tus clientes siguen sumando y canjeando puntos.",
          boton: "Reactivar",
        };
      }
      if (a.estado === "pending") {
        return {
          tono: "grave",
          titulo: "Mercado Pago no confirmó tu tarjeta",
          texto: `El panel está restringido. Cargá otra tarjeta en Facturación. Tus clientes siguen sumando puntos${a.hasta ? ` hasta el ${fechaCorta(a.hasta)}` : ""}.`,
          boton: "Cambiar la tarjeta",
        };
      }
      return {
        tono: "grave",
        titulo: "Tu cuenta tiene un pago pendiente",
        texto: `El panel está restringido. Tus clientes siguen sumando puntos${a.hasta ? ` hasta el ${fechaCorta(a.hasta)}` : ""}; después el programa se pausa.`,
        boton: "Regularizar el pago",
      };
    case "sin_sumar":
      return {
        tono: "grave",
        titulo: "Tu programa de puntos está pausado",
        texto: "Tus clientes no pueden sumar puntos hasta que regularices el pago. Los que ya tienen los pueden canjear igual.",
        boton: "Regularizar el pago",
      };
    case "sin_suscripcion":
      return {
        tono: "grave",
        titulo: "Tu cuenta no está activa",
        texto: "Tus clientes no pueden sumar puntos. Activá tu suscripción para que el programa vuelva a funcionar.",
        boton: "Activar",
      };
    case "completo": {
      if (!a.hasta) return null;
      if (a.estado === "cancelled") {
        return { tono: "info", titulo: "Cancelaste tu suscripción", texto: `Todo sigue funcionando hasta el ${fechaCorta(a.hasta)}.`, boton: "Volver a activar" };
      }
      if (a.estado === "paused") {
        return { tono: "info", titulo: "Pausaste tu suscripción", texto: `Todo sigue funcionando hasta el ${fechaCorta(a.hasta)}; después el panel se restringe.`, boton: "Reactivar" };
      }
      if (a.estado === "pending") {
        return { tono: "aviso", titulo: "Mercado Pago está confirmando tu tarjeta", texto: `Suele tardar unos minutos. Si sigue así después del ${fechaCorta(a.hasta)}, el panel se restringe: probá con otra tarjeta.`, boton: "Ver facturación" };
      }
      // Cortesía con fecha de fin cercana.
      if (a.estado === "cortesia" && new Date(a.hasta).getTime() - ahora.getTime() < 15 * DIA) {
        return { tono: "info", titulo: "Tu cortesía está por terminar", texto: `Es sin cargo hasta el ${fechaCorta(a.hasta)}. Activá tu suscripción para seguir sin cortes.`, boton: "Ver planes" };
      }
      return null;
    }
  }
}
