import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Manrope, Poppins } from "next/font/google";
import "./globals.css";
import { SCRIPT_TEMA } from "@/lib/tema-nocturno";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700"],
  // Se usa en pocas pantallas: no la precargamos en todas (mejor LCP de la landing).
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

// Tipografías de Point (landing y app). Fuentes variables: un archivo por familia.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Point — Fidelización para tu local",
    template: "%s · Point",
  },
  description: "Tarjeta de puntos digital con chip NFC para cafeterías, bares y comercios.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f8f6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script del tema agrega data-tema antes de hidratar.
    <html
      lang="es-AR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
