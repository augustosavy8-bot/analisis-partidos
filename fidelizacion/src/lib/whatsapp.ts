/**
 * Normaliza un WhatsApp a E.164. Pensado para Argentina (agrega el 9 de
 * celulares, saca el 0 y el 15), pero acepta cualquier número internacional
 * escrito con "+".
 */
export function normalizarWhatsapp(entrada: string): string | null {
  const texto = entrada.trim();
  const conMas = texto.startsWith("+");
  let d = texto.replace(/\D/g, "");
  if (!d) return null;

  if (d.startsWith("00")) d = d.slice(2); // 00 54 ... (formato internacional)
  const internacional = conMas || texto.replace(/\s/g, "").startsWith("00");

  if (d.startsWith("54")) {
    let resto = d.slice(2);
    if (resto.startsWith("9")) resto = resto.slice(1);
    resto = quitarCeroY15(resto);
    return resto.length === 10 ? `+549${resto}` : null;
  }

  if (internacional) {
    return /^[1-9]\d{7,14}$/.test(d) ? `+${d}` : null;
  }

  // Número nacional argentino: 0341 15 1234567, 341 1234567, 11 1234 5678...
  const nacional = quitarCeroY15(d);
  return nacional.length === 10 ? `+549${nacional}` : null;
}

function quitarCeroY15(d: string): string {
  let n = d.startsWith("0") ? d.slice(1) : d;
  if (n.length === 12) {
    // Código de área de 2 (11), 3 o 4 dígitos seguido de "15".
    const posiciones = n.startsWith("11") ? [2] : [3, 4, 2];
    for (const i of posiciones) {
      if (n.slice(i, i + 2) === "15") {
        n = n.slice(0, i) + n.slice(i + 2);
        break;
      }
    }
  }
  return n;
}

/** Para mostrar: +54 9 341 123-4567 → "341 123-4567". */
export function formatearWhatsapp(e164: string): string {
  const m = e164.match(/^\+549(\d{3,4})(\d{2,3})(\d{4})$/);
  if (!m) return e164;
  return `${m[1]} ${m[2]}-${m[3]}`;
}
