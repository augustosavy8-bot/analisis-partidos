import Link from "next/link";
import { FormArrepentimiento } from "./FormArrepentimiento";

export const metadata = { title: "Botón de arrepentimiento" };

export default function Arrepentimiento() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 text-stone-700">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Botón de arrepentimiento</h1>
      <p className="mt-3 leading-relaxed">
        Tenés 10 días corridos desde la compra (o desde que recibiste el producto) para revocarla sin costo y sin dar explicaciones (Ley 24.240,
        art. 34). Completá el formulario y te damos un código de trámite al instante.
      </p>
      <p className="mt-3 text-sm text-stone-500">
        Si sólo querés dar de baja tu suscripción, también podés hacerlo vos mismo desde{" "}
        <Link href="/panel/facturacion" className="underline">Panel → Facturación</Link>. Más info en los{" "}
        <Link href="/terminos" className="underline">términos y condiciones</Link>.
      </p>
      <FormArrepentimiento />
    </main>
  );
}
