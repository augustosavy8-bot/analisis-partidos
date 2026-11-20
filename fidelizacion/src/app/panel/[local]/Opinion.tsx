"use client";

import { useState, useTransition } from "react";
import { Icono } from "@/components/Icono";
import { claseBoton } from "@/components/app/Boton";
import { claseTextarea } from "@/components/app/Campos";
import { comentar, opinar } from "./opinion-actions";

type Paso = "estrellas" | "recomendar" | "mejorar" | "gracias" | "cerrado";

/**
 * "¿Cómo te está resultando Point?": cartel del Resumen. 4-5 estrellas invita a
 * recomendar Point (el referido le da al local un mes a mitad de precio); 1-3
 * pregunta qué mejorar. Se guarda al tocar las estrellas. Cerrarlo sin contestar sólo
 * lo oculta hasta la próxima vez que entre al Resumen.
 */
export function Opinion({ slug, linkReferido }: { slug: string; linkReferido: string }) {
  const [paso, setPaso] = useState<Paso>("estrellas");
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [id, setId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  if (paso === "cerrado") return null;

  const elegir = (n: number) =>
    start(async () => {
      setError(null);
      const r = await opinar(slug, n);
      if (r.error) return setError(r.error);
      setEstrellas(n);
      setId(r.id ?? null);
      setPaso(n >= 4 ? "recomendar" : "mejorar");
    });

  const cerrar = () => setPaso("cerrado");

  const mensaje = `¡Hola! Te recomiendo Point, la tarjeta de puntos con llavero que uso en mi local: los clientes suman con un toque y vuelven más. Mirá: ${linkReferido}`;

  return (
    <section className="relative mb-4 rounded-pt-card bg-pt-pure p-4 shadow-pt-ui ring-1 ring-pt-ink/80">
      <button onClick={cerrar} aria-label="Cerrar" className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-pt-ink-3 transition-colors duration-150 hover:bg-pt-surface hover:text-pt-ink">
        <Icono nombre="cerrar" tamaño={16} />
      </button>

      {paso === "estrellas" && (
        <>
          <p className="pr-8 text-[16px] font-semibold text-pt-ink">¿Cómo te está resultando Point?</p>
          <p className="mt-0.5 pt-app-detalle text-pt-ink-2">Tu opinión nos ayuda a mejorarlo. Te lleva 5 segundos.</p>
        </>
      )}

      <div className={`flex gap-1 ${paso === "estrellas" ? "mt-3" : ""}`} role="radiogroup" aria-label="Puntaje" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const llena = n <= (hover || estrellas);
          return (
            <button
              key={n}
              role="radio"
              aria-checked={estrellas === n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
              disabled={paso !== "estrellas" || pendiente}
              onMouseEnter={() => paso === "estrellas" && setHover(n)}
              onClick={() => elegir(n)}
              className={`text-[34px] leading-none transition-[color,transform] duration-150 active:scale-90 disabled:cursor-default ${llena ? "text-[#f5b301]" : "text-pt-border"}`}
            >
              ★
            </button>
          );
        })}
      </div>
      {paso === "estrellas" && (
        <div className="mt-1 flex w-[190px] justify-between pt-app-detalle text-pt-ink-3">
          <span>Nada bien</span>
          <span>Excelente</span>
        </div>
      )}

      {paso === "recomendar" && (
        <div className="mt-3">
          <p className="text-[16px] font-semibold text-pt-ink">¡Gracias!</p>
          <p className="mt-0.5 pt-app-detalle text-pt-ink-2">
            ¿Conocés otro comercio al que le sirva Point? Si se suma por tu recomendación, tenés <strong className="text-pt-ink">un mes a mitad de precio</strong>.
          </p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setPaso("cerrado")}
            className={claseBoton("primario", "md", "mt-3 w-full !bg-[#25d366] !text-white")}
          >
            Recomendar por WhatsApp
          </a>
          <button onClick={() => setPaso("cerrado")} className={claseBoton("secundario", "md", "mt-2 w-full")}>
            Ahora no
          </button>
        </div>
      )}

      {paso === "mejorar" && (
        <div className="mt-3">
          <p className="text-[16px] font-semibold text-pt-ink">¿Qué mejorarías?</p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Contanos qué no te funciona o qué te gustaría que tenga."
            className={`${claseTextarea} mt-2 w-full`}
          />
          <button
            disabled={pendiente || !id}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = id ? await comentar(slug, id, texto) : { error: "Probá de nuevo." };
                if (r.error) return setError(r.error);
                setPaso("gracias");
              })
            }
            className={claseBoton("primario", "md", "mt-2 w-full")}
          >
            {texto.trim() ? "Enviar" : "Listo"}
          </button>
        </div>
      )}

      {paso === "gracias" && <p className="mt-3 pt-app-texto text-pt-ink-2">¡Gracias! Lo leemos y te escribimos si hace falta.</p>}
      {error && <p className="mt-2 pt-app-detalle text-red-600">{error}</p>}
    </section>
  );
}
