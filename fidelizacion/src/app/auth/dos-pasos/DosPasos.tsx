"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/browser";
import { Boton } from "@/components/app/Boton";
import { claseInput } from "@/components/app/Campos";

/** Alta del factor TOTP (QR) o verificación del código. Todo con Supabase Auth MFA. */
export function DosPasos({ activada }: { activada: boolean }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secreto, setSecreto] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const sb = crearClienteNavegador();
    (async () => {
      const { data: factores } = await sb.auth.mfa.listFactors();
      const verificado = factores?.totp.find((f) => f.status === "verified");
      if (verificado) return setFactorId(verificado.id);
      // Factores a medio crear (se abrió el QR y no se terminó): se borran para empezar limpio.
      for (const f of factores?.all ?? []) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data, error: e } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Point admin" });
      if (e || !data) return setError("No pudimos generar el código QR. Recargá la página.");
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecreto(data.totp.secret);
    })();
  }, [activada]);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !/^\d{6}$/.test(codigo)) return setError("Escribí los 6 números.");
    setCargando(true);
    setError(null);
    const { error: err } = await crearClienteNavegador().auth.mfa.challengeAndVerify({ factorId, code: codigo });
    setCargando(false);
    if (err) {
      setCodigo("");
      return setError("Código incorrecto o vencido. Probá con el que aparece ahora.");
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={verificar} className="space-y-4">
      {qr && (
        <div className="flex flex-col items-center gap-2">
          {/* El QR lo genera Supabase como SVG (data URL). */}
          <img src={qr} alt="Código QR para la app autenticadora" width={200} height={200} className="rounded-pt-sm bg-white p-2" />
          {secreto && <p className="break-all text-center font-mono text-[12px] text-pt-ink-2">o cargá esta clave a mano: {secreto}</p>}
        </div>
      )}
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        aria-label="Código de 6 números"
        className={`${claseInput} text-center text-xl tracking-[0.4em]`}
        autoFocus
      />
      {error && <p className="text-[14px] text-pt-error-ink">{error}</p>}
      <Boton type="submit" variante="primario" className="w-full" pendiente={cargando} disabled={!factorId}>
        Verificar
      </Boton>
    </form>
  );
}
