import { Inter, Manrope } from "next/font/google";
import { MotionProvider } from "@/components/landing/MotionProvider";
import "./landing.css";

// Tipografías de la landing (sólo se cargan acá, no en la app).
// Fuentes variables: un solo archivo por familia.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export default function LayoutLanding({ children }: LayoutProps<"/">) {
  return (
    <div className={`landing ${manrope.variable} ${inter.variable} flex flex-1 flex-col`}>
      <MotionProvider>{children}</MotionProvider>
    </div>
  );
}
