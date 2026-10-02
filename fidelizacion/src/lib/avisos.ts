/** Textos de los avisos al cliente (página /aviso y la app). */
export const MENSAJES_AVISO: Record<string, { titulo: string; texto: string }> = {
  chip_invalido: {
    titulo: "No reconocimos este llavero",
    texto: "Puede que el llavero no esté dado de alta. Avisale a quien te atiende.",
  },
  chip_sin_mozo: {
    titulo: "Este llavero no está asignado",
    texto: "El local tiene que asignarlo a alguien de su equipo antes de usarlo.",
  },
  modo_prueba_off: {
    titulo: "Llavero de prueba",
    texto: "Este llavero es de prueba y ya no se puede usar para sumar puntos.",
  },
  // El comercio dejó de pagar Point. Mensaje neutro: el cliente no tiene por qué
  // enterarse de la facturación del local. Sus puntos siguen siendo suyos.
  programa_pausado: {
    titulo: "Este local pausó su programa de puntos",
    texto: "Por ahora no se suman puntos acá. Los puntos que ya tenés siguen siendo tuyos y los podés canjear.",
  },
  local_inactivo: {
    titulo: "Local no disponible",
    texto: "Este local no está sumando puntos en este momento.",
  },
  toque_vencido: {
    titulo: "Pasó mucho tiempo",
    texto: "Pedile a quien te atiende que vuelva a apoyar el llavero en tu celular.",
  },
  canje_expirado: {
    titulo: "El canje venció",
    texto: "Volvé a tocar “Canjear” en tu tarjeta y pedile a quien te atiende que apoye el llavero.",
  },
  sun_invalido: {
    titulo: "No pudimos leer el llavero",
    texto: "Pedile a quien te atiende que lo vuelva a apoyar en tu celular.",
  },
  sun_cmac: {
    titulo: "Llavero no válido",
    texto: "La firma del llavero no coincide. Avisale a quien te atiende.",
  },
  sun_repetido: {
    titulo: "Este toque ya se usó",
    texto: "Cada toque del llavero sirve una sola vez. Pedile a quien te atiende que lo apoye de nuevo.",
  },
  sun_sin_configurar: {
    titulo: "Llavero no configurado",
    texto: "El sistema todavía no está listo para estos llaveros. Avisale al local.",
  },
  qr_vencido: {
    titulo: "Este QR ya no sirve",
    texto: "Venció o está incompleto. Los códigos cambian cada 30 segundos. Pedile a quien te atiende que te muestre uno nuevo y escanealo de nuevo.",
  },
  qr_usado: {
    titulo: "Este QR ya se usó",
    texto: "Cada código sirve una sola vez. Pedile a quien te atiende que te muestre el siguiente.",
  },
  qr_invalido: {
    titulo: "QR no válido",
    texto: "Este código no corresponde a nadie activo del local.",
  },
  wallet_error: {
    titulo: "No pudimos crear tu pase",
    texto: "La billetera no respondió. Probá de nuevo en un rato; mientras tanto tu tarjeta sigue funcionando igual.",
  },
  premio_invalido: {
    titulo: "Ese premio ya no está disponible",
    texto: "El local lo cambió o lo sacó. Mirá los premios que hay ahora en tu tarjeta.",
  },
  tarjeta_inexistente: {
    titulo: "No encontramos tu tarjeta",
    texto: "Pedile a quien te atiende que apoye el llavero en tu celular para crearla.",
  },
  mozo_invalido: {
    titulo: "No pudimos validar el toque",
    texto: "Pedile a quien te atiende que vuelva a apoyar el llavero en tu celular.",
  },
  puntos_insuficientes: {
    titulo: "No te alcanzan los puntos",
    texto: "Todavía te faltan puntos para ese premio.",
  },
};

export function mensajeAviso(motivo: string) {
  return MENSAJES_AVISO[motivo] ?? { titulo: "Algo salió mal", texto: "Probá de nuevo en un rato." };
}
