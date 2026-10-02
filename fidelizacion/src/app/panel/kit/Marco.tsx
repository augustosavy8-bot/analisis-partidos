import Link from "next/link";
import { LogoPoint } from "@/components/landing/LogoPoint";

export function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/panel" aria-label="Volver al panel">
            <LogoPoint alto={24} />
          </Link>
          <Link href="/panel/facturacion" className="text-[13px] font-semibold text-pt-ink-2 underline underline-offset-2">
            Facturación
          </Link>
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
