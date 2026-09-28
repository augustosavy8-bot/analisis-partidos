/**
 * WhatsApp de ventas de Point. PLACEHOLDER: reemplazar por el número real
 * (o definir NEXT_PUBLIC_WHATSAPP_POINT en Vercel, formato 549XXXXXXXXXX).
 */
const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_POINT ?? "5490000000000";

export function linkWhatsappPoint(texto = "¡Hola! Quiero crear el programa de puntos de mi local con Point.") {
  return `https://wa.me/${NUMERO}?text=${encodeURIComponent(texto)}`;
}
