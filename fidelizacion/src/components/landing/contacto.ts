/**
 * WhatsApp de ventas de Point (347 153-8679). Se puede cambiar con
 * NEXT_PUBLIC_WHATSAPP_POINT en Vercel (formato 549XXXXXXXXXX).
 */
const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_POINT ?? "5493471538679";

export function linkWhatsappPoint(texto = "¡Hola! Quiero crear el programa de puntos de mi local con Point.") {
  return `https://wa.me/${NUMERO}?text=${encodeURIComponent(texto)}`;
}
