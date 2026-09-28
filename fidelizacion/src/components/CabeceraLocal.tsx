import type { Local } from "@/lib/locales";

/** Logo del local (o su inicial sobre tinta, con el sistema de Point). */
export function LogoLocal({ local, tamaño = 44 }: { local: Local; tamaño?: number }) {
  if (local.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={local.logo_url} alt="" width={tamaño} height={tamaño} className="rounded-pt-sm object-cover ring-1 ring-pt-border" />;
  }
  return (
    <div
      className="flex items-center justify-center rounded-pt-sm bg-pt-ink font-[family-name:var(--font-pt-display)] font-bold text-white"
      style={{ width: tamaño, height: tamaño, fontSize: tamaño * 0.42 }}
      aria-hidden
    >
      {local.nombre.charAt(0).toUpperCase()}
    </div>
  );
}

export function CabeceraLocal({ local }: { local: Local }) {
  return (
    <div className="flex items-center gap-3">
      <LogoLocal local={local} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold leading-tight text-pt-ink">{local.nombre}</p>
        {local.rubro && <p className="truncate pt-app-detalle text-pt-ink-2">{local.rubro}</p>}
      </div>
    </div>
  );
}
