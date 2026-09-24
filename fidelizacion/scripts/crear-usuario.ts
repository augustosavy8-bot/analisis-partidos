/**
 * Crea un usuario del panel (superadmin o dueño de un local).
 *
 *   npm run usuario:crear -- --email yo@mail.com --password xxxxxxxx --rol superadmin
 *   npm run usuario:crear -- --email duenio@mail.com --password xxxxxxxx --rol dueno --local cafe-aurora
 *
 * Si el email ya existe, reutiliza el usuario y sólo le asigna el rol.
 */
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    rol: { type: "string" },
    local: { type: "string" },
  },
});

function salir(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) salir("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
if (!values.email) salir("Falta --email");
if (values.rol !== "superadmin" && values.rol !== "dueno") salir("--rol debe ser superadmin o dueno");
if (values.rol === "dueno" && !values.local) salir("Para un dueño indicá --local <slug>");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function buscarUsuario(email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) salir(error.message);
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) return null;
  }
}

async function main() {
  const email = values.email!;
  let usuario = await buscarUsuario(email);
  if (!usuario) {
    if (!values.password || values.password.length < 8) salir("Falta --password (mínimo 8 caracteres)");
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: values.password,
      email_confirm: true,
    });
    if (error) salir(error.message);
    usuario = data.user;
    console.log(`✔ Usuario creado: ${email}`);
  } else {
    console.log(`• El usuario ${email} ya existía`);
  }

  if (values.rol === "superadmin") {
    const { error } = await db.from("superadmins").upsert({ user_id: usuario.id });
    if (error) salir(error.message);
    console.log("✔ Rol superadmin asignado");
  } else {
    const { data: local, error: e1 } = await db.from("locales").select("id, nombre").eq("slug", values.local!).single();
    if (e1 || !local) salir(`No existe el local "${values.local}"`);
    const { error } = await db.from("miembros_local").upsert({ user_id: usuario.id, local_id: local.id, rol: "dueno" });
    if (error) salir(error.message);
    console.log(`✔ Dueño de "${local.nombre}"`);
  }
}

main();
