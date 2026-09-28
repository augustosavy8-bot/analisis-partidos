import { requerirSuperadmin } from "@/lib/admin";
import { fechaHora } from "@/lib/panel";
import { formatearWhatsapp } from "@/lib/whatsapp";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { FilaInteresado } from "./FilaInteresado";

export const metadata = { title: "Interesados" };

export default async function Interesados() {
  const { db } = await requerirSuperadmin();
  const { data, error } = await db
    .from("interesados")
    .select("id, nombre, local, rubro, ciudad, whatsapp, mensaje, estado, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  const filas = data ?? [];
  const nuevos = filas.filter((f) => f.estado === "nuevo").length;

  return (
    <>
      <Titulo>Interesados</Titulo>
      <p className="-mt-3 mb-5 text-sm text-stone-500">
        Dueños que dejaron sus datos en la página de inicio. {nuevos > 0 && <strong className="text-stone-800">{nuevos} sin contactar.</strong>}
      </p>
      {filas.length === 0 ? (
        <Vacio>Todavía no llegó ninguno. Compartí la página de inicio con dueños de locales.</Vacio>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {filas.map((f) => (
              <FilaInteresado
                key={f.id}
                i={{
                  ...f,
                  fecha: fechaHora(f.created_at, "America/Argentina/Buenos_Aires"),
                  whatsappLindo: formatearWhatsapp(f.whatsapp),
                }}
              />
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}
