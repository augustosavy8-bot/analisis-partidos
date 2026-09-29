import { cssTema, temaDelLocal } from "@/lib/tema";

type Props = { local: Parameters<typeof temaDelLocal>[0] };

/**
 * Aplica la paleta del bar a toda la página: pisa las variables --color-pt-*
 * (las usan todos los componentes) y las de la tarjeta. Va en las pantallas del
 * cliente de un local; el panel y la landing siguen con la paleta de Point.
 */
export function TemaLocal({ local }: Props) {
  // Sólo hex validados (cssTema filtra): seguro para inyectar.
  return <style dangerouslySetInnerHTML={{ __html: cssTema(temaDelLocal(local)) }} />;
}
