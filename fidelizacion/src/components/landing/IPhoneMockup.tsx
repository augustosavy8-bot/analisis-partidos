/**
 * iPhone construido en CSS: marco de titanio grafito → bisel → pantalla con
 * Dynamic Island y un reflejo muy sutil. El contenido va en `children`.
 */
export function IPhoneMockup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative aspect-[9/19.5] w-full ${className}`}>
      {/* Botones laterales */}
      <span className="absolute -left-[1.1%] top-[17%] h-[4%] w-[1.4%] rounded-l-sm bg-[#2a2d30]" />
      <span className="absolute -left-[1.1%] top-[24%] h-[7.5%] w-[1.4%] rounded-l-sm bg-[#2a2d30]" />
      <span className="absolute -left-[1.1%] top-[33%] h-[7.5%] w-[1.4%] rounded-l-sm bg-[#2a2d30]" />
      <span className="absolute -right-[1.1%] top-[27%] h-[11%] w-[1.4%] rounded-r-sm bg-[#2a2d30]" />

      {/* Marco de titanio */}
      <div
        className="absolute inset-0 rounded-[15%/7%] shadow-pt-iphone"
        style={{
          background: "linear-gradient(145deg, #4a4e52 0%, #26292c 22%, #3b3f43 48%, #1d1f22 72%, #3a3e42 100%)",
          padding: "1.1%",
        }}
      >
        {/* Bisel negro */}
        <div className="h-full w-full rounded-[14%/6.5%] bg-black" style={{ padding: "3.2%" }}>
          {/* Pantalla */}
          <div className="relative h-full w-full overflow-hidden rounded-[11.5%/5.4%] bg-pt-bg">
            {children}
            {/* Dynamic Island */}
            <div className="absolute left-1/2 top-[1.6%] z-20 h-[3.6%] w-[31%] -translate-x-1/2 rounded-full bg-black" />
            {/* Reflejo muy sutil */}
            <div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(125deg,rgba(255,255,255,.14)_0%,rgba(255,255,255,0)_32%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
