/**
 * Pantalla de Wallet dentro del iPhone. La tarjeta POINT (la misma del hero)
 * entra por `children`; debajo se asoman otras tarjetas genéricas.
 */
export function WalletScreen({ children, pie }: { children?: React.ReactNode; pie?: React.ReactNode }) {
  return (
    <div className="@container flex h-full flex-col bg-[#F2F3F1] text-pt-ink">
      {/* Barra de estado */}
      <div className="flex items-center justify-between px-[8cqw] pt-[5.2cqw] font-semibold" style={{ fontSize: "3.6cqw" }}>
        <span>9:41</span>
        <span className="flex items-center gap-[1.2cqw]">
          <svg viewBox="0 0 18 12" style={{ width: "4.4cqw" }} aria-hidden>
            <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
            <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
            <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
          </svg>
          <svg viewBox="0 0 26 12" style={{ width: "6.4cqw" }} aria-hidden>
            <rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4" />
            <rect x="2" y="2" width="17" height="8" rx="1.8" fill="currentColor" />
            <rect x="23.5" y="4" width="1.8" height="4" rx=".9" fill="currentColor" opacity=".4" />
          </svg>
        </span>
      </div>

      {/* Título */}
      <div className="flex items-center justify-between px-[6cqw] pt-[9cqw]">
        <span className="font-[family-name:var(--font-manrope)] font-bold tracking-[-0.02em]" style={{ fontSize: "8.4cqw" }}>
          Wallet
        </span>
        <span
          className="flex items-center justify-center rounded-full bg-white shadow-pt-ui"
          style={{ width: "8cqw", height: "8cqw", fontSize: "5cqw" }}
          aria-hidden
        >
          +
        </span>
      </div>

      {/* Tarjeta POINT */}
      <div className="relative px-[4.5cqw] pt-[5cqw]">{children}</div>

      {/* Otras tarjetas asomando */}
      <div className="relative mt-[3cqw] px-[4.5cqw]">
        {["#2f3b52", "#8a5a2b", "#c9ccd0"].map((c, i) => (
          <div
            key={c}
            className="rounded-t-[4.5cqw]"
            style={{ background: c, height: "11cqw", marginTop: i ? "-4cqw" : 0, opacity: 0.9 - i * 0.1 }}
          />
        ))}
      </div>

      {pie && <div className="mt-auto px-[6cqw] pb-[10cqw]">{pie}</div>}
    </div>
  );
}
