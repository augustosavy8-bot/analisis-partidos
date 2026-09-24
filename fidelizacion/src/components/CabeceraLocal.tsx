import type { Local } from "@/lib/locales";

export function LogoLocal({ local, tamaño = 44 }: { local: Local; tamaño?: number }) {
  if (local.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={local.logo_url} alt="" width={tamaño} height={tamaño} className="rounded-2xl object-cover" />;
  }
  return (
    <div
      className="flex items-center justify-center rounded-2xl font-semibold"
      style={{
        width: tamaño,
        height: tamaño,
        background: "var(--marca-acento)",
        color: "var(--marca)",
        fontSize: tamaño * 0.45,
      }}
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
      <div>
        <p className="font-semibold leading-tight">{local.nombre}</p>
        {local.rubro && <p className="text-sm text-stone-500">{local.rubro}</p>}
      </div>
    </div>
  );
}
