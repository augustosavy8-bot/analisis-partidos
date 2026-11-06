import type { Metadata } from "next";

/** El panel se instala como app (en la compu desde Chrome o Edge; en el celular, "Agregar a inicio"). */
export const metadata: Metadata = {
  manifest: "/panel.webmanifest",
  appleWebApp: { capable: true, title: "Point", statusBarStyle: "default" },
};

export default function LayoutPanelRaiz({ children }: LayoutProps<"/panel">) {
  return children;
}
