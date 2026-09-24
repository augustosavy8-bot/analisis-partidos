"use client";

import { useActionState, useState, useTransition } from "react";
import {
  agregarDueno,
  alternarChip,
  alternarLocal,
  asignarMozo,
  borrarChip,
  crearChip,
  nuevaContraseña,
  quitarDueno,
  regenerarTokenChip,
  type EstadoChip,
  type EstadoDueno,
} from "../../actions";
import { BotonPrimario, BotonSecundario, inputPanel } from "@/components/Panel";
import { ErrorForm } from "@/components/Campo";
import { Credenciales } from "@/components/Credenciales";

type Mozo = { id: string; nombre: string; activo: boolean };

export function InterruptorLocal({ slug, activo }: { slug: string; activo: boolean }) {
  const [p, start] = useTransition();
  return (
    <BotonSecundario
      disabled={p}
      onClick={() => {
        if (!activo || confirm("Si lo desactivás, los clientes no van a poder sumar ni ver su tarjeta. ¿Seguimos?")) {
          start(() => alternarLocal(slug, !activo));
        }
      }}
    >
      {activo ? "Desactivar local" : "Activar local"}
    </BotonSecundario>
  );
}

export function FormDueno({ localId, appUrl }: { localId: string; appUrl: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoDueno, FormData>(agregarDueno.bind(null, localId), {});
  return (
    <div className="space-y-3">
      <form action={accion} className="flex flex-wrap gap-2">
        <input name="email" type="email" required placeholder="email del dueño" className={`${inputPanel} max-w-xs`} />
        <BotonPrimario type="submit" disabled={pendiente}>{pendiente ? "…" : "Agregar dueño"}</BotonPrimario>
      </form>
      <ErrorForm mensaje={estado.error} />
      {estado.ok && estado.email && estado.password && (
        <Credenciales email={estado.email} password={estado.password} url={`${appUrl}/panel`} />
      )}
      {estado.ok && estado.email && !estado.password && (
        <p className="text-sm text-emerald-700">✓ {estado.email} ya tenía usuario: ahora también gestiona este local.</p>
      )}
    </div>
  );
}

export function AccionesDueno({ localId, userId, email, appUrl }: { localId: string; userId: string; email: string; appUrl: string }) {
  const [p, start] = useTransition();
  const [pass, setPass] = useState<string | null>(null);
  return (
    <div className="w-full space-y-2 sm:w-auto">
      <div className="flex gap-2">
        <BotonSecundario
          disabled={p}
          onClick={() =>
            confirm(`¿Generar una contraseña nueva para ${email}? La anterior deja de funcionar.`) &&
            start(async () => {
              const r = await nuevaContraseña(userId);
              if (r.password) setPass(r.password);
              else alert(r.error ?? "No se pudo");
            })
          }
        >
          Nueva contraseña
        </BotonSecundario>
        <BotonSecundario
          disabled={p}
          onClick={() => confirm(`¿Quitarle a ${email} el acceso a este local?`) && start(() => quitarDueno(localId, userId))}
        >
          Quitar
        </BotonSecundario>
      </div>
      {pass && <Credenciales email={email} password={pass} url={`${appUrl}/panel`} />}
    </div>
  );
}

export function FormChip({ localId, mozos }: { localId: string; mozos: Mozo[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoChip, FormData>(crearChip.bind(null, localId), {});
  const [modo, setModo] = useState<"prueba" | "produccion">("prueba");
  return (
    <form action={accion} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-stone-600">UID del chip (hex)</span>
          <input name="uid" required placeholder="04A1B2C3D4E5F6" className={`${inputPanel} font-mono uppercase`} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Etiqueta (opcional)</span>
          <input name="etiqueta" maxLength={40} placeholder="Ej: Llavero rojo" className={inputPanel} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Mozo</span>
          <select name="mozo" className={inputPanel} defaultValue="">
            <option value="">Sin asignar</option>
            {mozos.filter((m) => m.activo).map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-xs font-medium text-stone-600">Modo</legend>
          <div className="mt-1 flex gap-2">
            {(["prueba", "produccion"] as const).map((m) => (
              <label key={m} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm ${modo === m ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>
                <input type="radio" name="modo" value={m} checked={modo === m} onChange={() => setModo(m)} className="sr-only" />
                {m === "prueba" ? "Prueba (NTAG213)" : "Producción (424 DNA)"}
              </label>
            ))}
          </div>
        </fieldset>
        {modo === "produccion" && (
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-stone-600">Clave AES-128 SDMFileRead (32 caracteres hex)</span>
            <input name="clave" required autoComplete="off" spellCheck={false} placeholder="00112233445566778899AABBCCDDEEFF" className={`${inputPanel} font-mono`} />
            <span className="mt-1 block text-xs text-stone-500">Se guarda cifrada. No se puede volver a ver.</span>
          </label>
        )}
      </div>
      <ErrorForm mensaje={estado.error} />
      {estado.ok && estado.urlPrueba && <UrlChip url={estado.urlPrueba} />}
      {estado.ok && !estado.urlPrueba && <p className="text-sm text-emerald-700">✓ Chip de producción creado.</p>}
      <BotonPrimario type="submit" disabled={pendiente}>{pendiente ? "Creando…" : "Dar de alta chip"}</BotonPrimario>
    </form>
  );
}

function UrlChip({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-semibold text-amber-900">Grabá esta URL en el chip con NFC Tools (se muestra una sola vez):</p>
      <p className="mt-2 break-all rounded-lg bg-white p-2 font-mono text-xs ring-1 ring-amber-200">{url}</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
          } catch {}
        }}
        className="mt-2 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white"
      >
        {copiado ? "Copiada ✓" : "Copiar URL"}
      </button>
    </div>
  );
}

export function AccionesChip({
  chip,
  mozos,
}: {
  chip: { id: string; activo: boolean; modo: string; mozo_id: string | null; uid: string };
  mozos: Mozo[];
}) {
  const [p, start] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  return (
    <div className="w-full space-y-2 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={chip.mozo_id ?? ""}
          disabled={p}
          onChange={(e) => start(() => asignarMozo(chip.id, e.target.value || null))}
          className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
          aria-label="Mozo asignado"
        >
          <option value="">Sin mozo</option>
          {mozos.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}{m.activo ? "" : " (inactivo)"}</option>
          ))}
        </select>
        {chip.modo === "prueba" && (
          <BotonSecundario
            disabled={p}
            onClick={() =>
              confirm("¿Generar una URL nueva? La que está grabada en el chip deja de funcionar.") &&
              start(async () => {
                const r = await regenerarTokenChip(chip.id);
                if (r.urlPrueba) setUrl(r.urlPrueba);
              })
            }
          >
            Nueva URL
          </BotonSecundario>
        )}
        <BotonSecundario disabled={p} onClick={() => start(() => alternarChip(chip.id, !chip.activo))}>
          {chip.activo ? "Desactivar" : "Activar"}
        </BotonSecundario>
        <BotonSecundario
          disabled={p}
          onClick={() => confirm(`¿Borrar el chip ${chip.uid}? Los movimientos que hizo se conservan.`) && start(() => borrarChip(chip.id))}
        >
          Borrar
        </BotonSecundario>
      </div>
      {url && <UrlChip url={url} />}
    </div>
  );
}
