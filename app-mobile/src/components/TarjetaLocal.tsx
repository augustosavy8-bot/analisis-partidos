import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { TarjetaResumenApp } from "@/api/tipos";
import { progreso, textoProximo } from "@/lib/formato";

/**
 * La tarjeta del local (la misma de la web): colores del pase del bar, logo,
 * puntos grandes y el progreso al próximo premio.
 */
export function TarjetaLocal({ tarjeta, compacta = false }: { tarjeta: TarjetaResumenApp; compacta?: boolean }) {
  const { local, puntos, proximo } = tarjeta;
  const c = local.colores;
  const p = progreso(puntos, proximo);
  return (
    <View
      style={[estilos.tarjeta, { backgroundColor: c.fondo }, compacta && estilos.compacta]}
      accessible
      accessibilityLabel={`Tarjeta de ${local.nombre}: ${puntos} ${puntos === 1 ? "punto" : "puntos"}. ${textoProximo(proximo)}`}
    >
      <View style={estilos.fila}>
        <View style={estilos.marca}>
          {local.logo ? (
            <Image source={local.logo} style={estilos.logo} contentFit="cover" />
          ) : (
            <View style={[estilos.logo, estilos.inicial, { backgroundColor: c.acento }]}>
              <Text style={[estilos.inicialTexto, { color: c.fondo }]}>{local.nombre.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={[estilos.nombre, { color: c.texto }]} numberOfLines={1}>
            {local.programa}
          </Text>
        </View>
        <Text style={[estilos.point, { color: c.texto }]}>POINT</Text>
      </View>

      <View>
        <View style={estilos.puntosFila}>
          <Text style={[estilos.puntos, compacta && estilos.puntosCompacta, { color: c.texto }]}>{puntos}</Text>
          <Text style={[estilos.puntosEtiqueta, { color: c.texto }]}>{puntos === 1 ? "punto" : "puntos"}</Text>
        </View>
        <Text style={[estilos.proximo, { color: c.texto }]} numberOfLines={1}>
          {textoProximo(proximo)}
        </Text>
      </View>

      {proximo ? (
        <View style={estilos.fila}>
          <View style={[estilos.barra, { backgroundColor: c.texto + "26" }]}>
            <View style={[estilos.barraLlena, { width: `${p * 100}%`, backgroundColor: c.acento }]} />
          </View>
          <Text style={[estilos.cuenta, { color: c.texto }]}>
            {Math.min(puntos, proximo.puntos)} / {proximo.puntos}
          </Text>
        </View>
      ) : (
        <View />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { aspectRatio: 1.586, borderRadius: 24, padding: 22, justifyContent: "space-between", overflow: "hidden" },
  compacta: { padding: 18 },
  fila: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  marca: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  logo: { width: 28, height: 28, borderRadius: 14 },
  inicial: { alignItems: "center", justifyContent: "center" },
  inicialTexto: { fontSize: 14, fontWeight: "700" },
  nombre: { fontSize: 14, fontWeight: "600", opacity: 0.9, flexShrink: 1 },
  point: { fontSize: 10, fontWeight: "800", letterSpacing: 2, opacity: 0.45 },
  puntosFila: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  puntos: { fontSize: 64, fontWeight: "700", letterSpacing: -2, fontVariant: ["tabular-nums"] },
  puntosCompacta: { fontSize: 52 },
  puntosEtiqueta: { fontSize: 17, opacity: 0.7 },
  proximo: { fontSize: 13, opacity: 0.6, marginTop: 2 },
  barra: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barraLlena: { height: 6, borderRadius: 3 },
  cuenta: { fontSize: 12, opacity: 0.6, fontVariant: ["tabular-nums"] },
});
