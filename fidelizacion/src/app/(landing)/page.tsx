import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { DockRubros } from "@/components/landing/DockRubros";
import { Beneficios } from "@/components/landing/Beneficios";
import { PanelDemo } from "@/components/landing/PanelDemo";
import { Faq } from "@/components/landing/Faq";
import { CtaFinal } from "@/components/landing/CtaFinal";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: { absolute: "POINT — Fidelizá clientes. Sin pedirles una app." },
  description: "POINT convierte cada compra en una razón para volver. Tarjeta de puntos con un tap NFC, que vive en la Wallet del cliente.",
};

/** Tarjeta → Rubros → Wallet → Beneficio → Software → Conversión. */
export default function Landing() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <DockRubros />
        <Beneficios />
        <PanelDemo />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
    </>
  );
}
