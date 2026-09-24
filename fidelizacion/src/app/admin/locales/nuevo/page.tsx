import { requerirSuperadmin } from "@/lib/admin";
import { env } from "@/lib/env";
import { Titulo } from "@/components/Panel";
import { FormNuevoLocal } from "./FormNuevoLocal";

export const metadata = { title: "Nuevo local" };

export default async function NuevoLocal() {
  await requerirSuperadmin();
  return (
    <div className="max-w-2xl">
      <Titulo>Nuevo local</Titulo>
      <FormNuevoLocal appUrl={env.appUrl} />
    </div>
  );
}
