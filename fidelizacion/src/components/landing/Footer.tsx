import Link from "next/link";
import { LogoPoint } from "./LogoPoint";

export function Footer() {
  return (
    <footer className="border-t border-pt-border bg-pt-pure">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-5 py-10 md:flex-row md:px-8">
        <LogoPoint alto={18} />
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-ui text-pt-ink-3">
          <Link href="/terminos" className="hover:text-pt-ink">Términos</Link>
          <Link href="/privacidad" className="hover:text-pt-ink">Privacidad</Link>
          <Link href="/arrepentimiento" className="hover:text-pt-ink">Botón de arrepentimiento</Link>
          <Link href="/sumate" className="hover:text-pt-ink">Sumá tu local</Link>
          <Link href="/panel" className="hover:text-pt-ink">Ingresar</Link>
        </nav>
        <p className="pt-ui text-pt-ink-3">© {new Date().getFullYear()} POINT</p>
      </div>
    </footer>
  );
}
