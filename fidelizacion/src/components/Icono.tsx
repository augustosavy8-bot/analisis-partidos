/** Íconos de interfaz de Point (trazo 1.9 sobre 24×24, heredan el color del texto). */
const ICONOS = {
  "sumar-punto": (
    <>
      <circle cx="9" cy="12" r="4.5"/><path d="M9 9.8v4.4M6.8 12h4.4"/><path d="M14.5 8.5c1.6.8 2.5 2 3.1 3.5"/><path d="M15.5 5.8c2.7 1.1 4.4 3.1 5.1 5.7"/>
    </>
  ),
  "canjear": (
    <>
      <path d="M5 8h11.5a2.5 2.5 0 0 1 0 5H8"/><path d="M8 5 5 8l3 3"/><path d="m13.5 15.5 1.6 1.6 3.4-3.8"/>
    </>
  ),
  "premio": (
    <>
      <path d="M4 10h16v10H4z"/><path d="M12 10v10"/><path d="M4 14h16"/><path d="M8.5 10c-1.7 0-2.5-.9-2.5-2.1 0-1 .7-1.9 1.9-1.9 1.8 0 3 2.1 4.1 4"/><path d="M15.5 10c1.7 0 2.5-.9 2.5-2.1 0-1-.7-1.9-1.9-1.9-1.8 0-3 2.1-4.1 4"/>
    </>
  ),
  "historial": (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.2-5.7"/><path d="M3.5 5.5v4h4"/><path d="M12 7.5V12l3 1.8"/>
    </>
  ),
  "notificacion": (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 6-2.5 8h17c0-2-2.5-2-2.5-8"/><path d="M9.5 19a2.7 2.7 0 0 0 5 0"/>
    </>
  ),
  "nfc": (
    <>
      <path d="M6 8.5a5 5 0 0 1 0 7"/><path d="M9 6a8.5 8.5 0 0 1 0 12"/><path d="M12 3.5a12 12 0 0 1 0 17"/><circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none"/>
    </>
  ),
  "qr": (
    <>
      <rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><path d="M15 15h2v2h-2zM19 15h2v4h-2zM15 19h4v2h-4z"/>
    </>
  ),
  "mozo": (
    <>
      <circle cx="12" cy="7" r="3"/><path d="M5.5 20c.4-4.1 2.7-6.2 6.5-6.2s6.1 2.1 6.5 6.2"/><path d="M9 13.5 12 17l3-3.5"/><path d="M12 17v3"/>
    </>
  ),
  "cliente": (
    <>
      <circle cx="12" cy="8" r="3.2"/><path d="M5 20c.6-4.3 3-6.5 7-6.5s6.4 2.2 7 6.5"/>
    </>
  ),
  "local": (
    <>
      <path d="M4 10h16"/><path d="M5 10V20h14V10"/><path d="M3.5 10 5.5 4h13l2 6"/><path d="M7.5 20v-5h4v5"/><path d="M3.5 10c.2 1.5 1.1 2.3 2.5 2.3S8.3 11.5 8.5 10c.2 1.5 1.1 2.3 2.5 2.3s2.3-.8 2.5-2.3c.2 1.5 1.1 2.3 2.5 2.3s2.3-.8 2.5-2.3"/>
    </>
  ),
  "estadisticas": (
    <>
      <path d="M4 20V10"/><path d="M10 20V5"/><path d="M16 20v-7"/><path d="M22 20H2"/><path d="m4 8 5-4 5 5 5-4"/>
    </>
  ),
  "configuracion": (
    <>
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </>
  ),
  "whatsapp": (
    <>
      <path d="M20 11.8a8 8 0 0 1-11.8 7l-4.2 1 1.1-4A8 8 0 1 1 20 11.8z"/><path d="M8.3 8.2c.2 3.3 2.2 5.6 5.6 7.1l1.6-1.6-2.1-1.1-.8.8c-1.4-.6-2.7-1.8-3.2-3.2l.8-.8-1.1-2.1-1.8.9z"/>
    </>
  ),
  "wallet": (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M15 13h6v4h-6a2 2 0 0 1 0-4z"/><circle cx="17" cy="15" r=".6" fill="currentColor" stroke="none"/>
    </>
  ),
} as const;

export type NombreIcono = keyof typeof ICONOS;

export function Icono({ nombre, tamaño = 20, className = "", trazo = 1.9 }: { nombre: NombreIcono; tamaño?: number; className?: string; trazo?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={tamaño}
      height={tamaño}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={trazo}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONOS[nombre]}
    </svg>
  );
}
