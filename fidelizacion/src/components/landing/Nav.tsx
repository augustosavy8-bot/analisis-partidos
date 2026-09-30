"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoPoint } from "./LogoPoint";

const LINKS = [
  { href: "/#como-funciona", texto: "Cómo funciona" },
  { href: "/#beneficios", texto: "Beneficios" },
  { href: "/#panel", texto: "Panel" },
  { href: "/#preguntas", texto: "Preguntas" },
];

export function Nav() {
  const [conFondo, setConFondo] = useState(false);
  useEffect(() => {
    const alScroll = () => setConFondo(window.scrollY > 12);
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-200 ${
        conFondo ? "bg-pt-bg/80 shadow-[0_1px_0_var(--border)] backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="POINT, inicio">
          <LogoPoint />
        </Link>
        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="pt-ui text-pt-ink-2 transition-colors hover:text-pt-ink">
              {l.texto}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/panel" className="hidden px-3 pt-ui text-pt-ink-2 hover:text-pt-ink sm:block">
            Ingresar
          </Link>
          <Link
            href="/sumate"
            className="inline-flex h-9 items-center rounded-full bg-pt-ink px-4 pt-ui text-white transition-colors hover:bg-black"
          >
            Empezar
          </Link>
        </div>
      </div>
    </header>
  );
}
