/**
 * Hook para verificar el WhatsApp con un código (OTP) — PREPARADO, SIN IMPLEMENTAR.
 *
 * En el MVP la recuperación de tarjeta se hace sólo con el número. Para activar
 * OTP: implementar un VerificadorWhatsapp (p. ej. con la API de WhatsApp Business),
 * registrarlo acá y las pantallas de registro/recuperación pedirán el código.
 */
export interface VerificadorWhatsapp {
  enviarCodigo(whatsapp: string): Promise<void>;
  verificarCodigo(whatsapp: string, codigo: string): Promise<boolean>;
}

let verificador: VerificadorWhatsapp | null = null;

export function registrarVerificador(v: VerificadorWhatsapp) {
  verificador = v;
}

export function verificacionActiva(): boolean {
  return verificador !== null;
}

export function obtenerVerificador(): VerificadorWhatsapp | null {
  return verificador;
}
