const COLORES_CONFETI = ["#FFC21A", "#FF4FA3", "#2EC5F2", "#1E6BFF", "#7B6CFF", "#FFFFFF"];

/** Confeti cayendo en loop detrás de la mascota (posiciones fijas para que no cambie entre renders). */
export function Confeti() {
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-x-16 -top-10 bottom-0 overflow-visible">
      {Array.from({ length: 18 }, (_, i) => {
        const x = (i * 37) % 100;
        const ancho = 6 + (i % 3) * 2;
        return (
          <span
            key={i}
            className="confeti absolute top-0 rounded-[2px]"
            style={
              {
                left: `${x}%`,
                width: ancho,
                height: ancho * (i % 2 ? 2.2 : 1),
                background: COLORES_CONFETI[i % COLORES_CONFETI.length],
                "--dx": `${((i * 53) % 60) - 30}px`,
                "--giro": `${i % 2 ? 540 : -480}deg`,
                "--dur": `${2 + (i % 5) * 0.3}s`,
                "--delay": `${(i * 0.17) % 2}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
