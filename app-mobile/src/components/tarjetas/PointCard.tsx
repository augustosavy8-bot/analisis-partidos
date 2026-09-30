import { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import type { Negocio } from "@/lib/mock/negocios";
import { PROPORCION, RADIO_TARJETA, textoFalta } from "./geometria";

const METAL = { c1: "#e3e6e9", c2: "#9ba1a8", texto: "#16181a", acento: "#16181a" };
const CEPILLADO = require("../../../assets/texturas/metal-cepillado.png");
const RUIDO = require("../../../assets/texturas/ruido.png");

type Props = {
  negocio: Negocio;
  /** Ancho de la tarjeta horizontal; todo el contenido escala con él. */
  ancho: number;
  /** -1..1: posición de la franja de brillo (scroll, giroscopio o gesto). */
  brillo?: SharedValue<number>;
  /** Sin sombra (por ejemplo, mientras está en el carrusel sobre fondo negro). */
  sinSombra?: boolean;
};

/** "#rrggbb" + alfa → rgba() (reemplaza a color-mix del prototipo). */
function conAlfa(hex: string, alfa: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

/** Ícono de pago sin contacto (NFC). */
function IconoNfc({ lado, color }: { lado: number; color: string }) {
  return (
    <Svg width={lado} height={lado} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M8.5 8.8a5 5 0 0 1 0 6.4" />
      <Path d="M12 6.4a9 9 0 0 1 0 11.2" />
      <Path d="M15.5 4a13 13 0 0 1 0 16" />
    </Svg>
  );
}

/**
 * Tarjeta de un negocio: horizontal (1.586), metal cepillado gris o el color de
 * la marca, logo, NFC, nombre, puntos y la barra al próximo premio. No tiene
 * estado: las animaciones mueven al contenedor desde afuera.
 */
export const PointCard = memo(function PointCard({ negocio, ancho, brillo, sinSombra }: Props) {
  const alto = ancho / PROPORCION;
  const u = ancho / 100;
  const m = negocio.marca ?? METAL;
  const progreso = Math.min(1, negocio.puntos / Math.max(1, negocio.meta));

  const estiloBrillo = useAnimatedStyle(() => ({
    transform: [{ translateX: (brillo ? brillo.value : 0) * ancho * 0.55 }],
  }));

  return (
    <View
      style={[{ width: ancho, height: alto, borderRadius: RADIO_TARJETA }, !sinSombra && estilos.sombra]}
      accessible
      accessibilityLabel={`${negocio.nombre}: ${negocio.puntos} puntos. ${textoFalta(negocio.puntos, negocio.meta, negocio.premio)}`}
    >
      <View style={[StyleSheet.absoluteFill, estilos.recorte]}>
        <LinearGradient
          colors={[m.c1, m.c2, m.c1, m.c2]}
          locations={[0, 0.48, 0.72, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Metal cepillado: vetas horizontales + ruido fino. */}
        <Image source={CEPILLADO} resizeMode="stretch" style={[StyleSheet.absoluteFill, estilos.cepillado]} />
        <Image source={RUIDO} resizeMode="repeat" style={[StyleSheet.absoluteFill, estilos.ruido]} />

        {/* Franja de brillo diagonal. */}
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", left: -ancho * 0.6, top: -alto * 0.4, width: ancho * 2.2, height: alto * 1.8 }, estilos.brillo, estiloBrillo]}
        >
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.75)", "rgba(255,255,255,0.15)", "transparent"]}
            locations={[0.4, 0.48, 0.53, 0.6]}
            start={{ x: 0, y: 0.32 }}
            end={{ x: 1, y: 0.68 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={[StyleSheet.absoluteFill, { padding: 6.2 * u, justifyContent: "space-between" }]}>
          <View style={estilos.fila}>
            {negocio.logo ? (
              <ExpoImage source={negocio.logo} style={{ width: 11 * u, height: 11 * u, borderRadius: 3 * u }} contentFit="cover" />
            ) : (
              <View
                style={{
                  width: 11 * u,
                  height: 11 * u,
                  borderRadius: 3 * u,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: conAlfa(m.texto, 0.14),
                  borderWidth: Math.max(1, 0.3 * u),
                  borderColor: conAlfa(m.texto, 0.22),
                }}
              >
                <Text style={{ color: m.texto, fontSize: 5.4 * u, fontWeight: "800" }}>{negocio.inicial}</Text>
              </View>
            )}
            <View style={{ opacity: 0.8 }}>
              <IconoNfc lado={7.5 * u} color={m.texto} />
            </View>
          </View>

          <View style={{ gap: 2.4 * u }}>
            <View style={[estilos.fila, { alignItems: "baseline", gap: 3 * u }]}>
              <Text numberOfLines={1} style={{ flexShrink: 1, color: m.texto, fontSize: 5.4 * u, fontWeight: "700", letterSpacing: -0.05 * u }}>
                {negocio.nombre}
              </Text>
              <Text style={{ color: m.texto, fontSize: 7.6 * u, fontWeight: "800", letterSpacing: -0.15 * u, fontVariant: ["tabular-nums"] }}>
                {negocio.puntos}
                <Text style={{ fontSize: 3.8 * u, fontWeight: "700", opacity: 0.75 }}> pts</Text>
              </Text>
            </View>
            <View style={{ height: Math.max(3, 0.9 * u), borderRadius: 99, backgroundColor: conAlfa(m.texto, 0.18), overflow: "hidden" }}>
              <View style={{ width: `${progreso * 100}%`, height: "100%", borderRadius: 99, backgroundColor: m.acento }} />
            </View>
            <Text numberOfLines={1} style={{ color: m.texto, fontSize: 3.1 * u, opacity: 0.72, marginTop: -1 * u }}>
              {textoFalta(negocio.puntos, negocio.meta, negocio.premio)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const estilos = StyleSheet.create({
  sombra: {
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  recorte: {
    borderRadius: RADIO_TARJETA,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cepillado: { width: "100%", height: "100%", opacity: 0.55, mixBlendMode: "overlay" },
  ruido: { width: "100%", height: "100%", opacity: 0.22, mixBlendMode: "overlay" },
  brillo: { mixBlendMode: "soft-light" },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
});
