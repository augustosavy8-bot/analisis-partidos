import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SensorType, clamp, useAnimatedSensor, useDerivedValue, useReducedMotion } from "react-native-reanimated";
import { PointCard } from "@/components/tarjetas/PointCard";
import { CardCarouselOverlay } from "@/components/tarjetas/CardCarouselOverlay";
import { TransactionList } from "@/components/tarjetas/TransactionList";
import type { Rect } from "@/components/tarjetas/geometria";
import { MOVIMIENTOS, NEGOCIOS } from "@/lib/mock/negocios";
import { useSesion } from "@/lib/sesion";

/** Home: saludo, puntos totales, la tarjeta activa y los últimos movimientos. */
export default function Inicio() {
  const { sesion } = useSesion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Datos de ejemplo: después vienen de la API.
  const negocios = NEGOCIOS;
  const total = negocios.reduce((s, n) => s + n.puntos, 0);
  const nombre = sesion?.nombre.split(" ")[0] ?? "";

  const [activo, setActivo] = useState(0);
  const [origen, setOrigen] = useState<Rect | null>(null);
  const [oculta, setOculta] = useState(false);
  const tarjeta = useRef<View>(null);

  // Brillo que sigue la inclinación del teléfono (giroscopio, en el hilo de UI).
  const reducir = useReducedMotion();
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: "auto" });
  const brillo = useDerivedValue(() => (reducir ? 0 : clamp(sensor.sensor.value.roll * 1.6, -1, 1)));

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  function abrirSelector() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    tarjeta.current?.measureInWindow((x, y, w, h) => setOrigen({ x, y, width: w, height: h }));
  }

  const alAbrir = useCallback(() => setOculta(true), []);
  const alCerrar = useCallback((i: number) => {
    setActivo(i);
    setOrigen(null);
    setOculta(false);
  }, []);

  return (
    <View style={estilos.pantalla}>
      <View style={[estilos.header, { paddingTop: insets.top + 14 }]}>
        <View style={estilos.filaHola}>
          <Text style={estilos.hola} numberOfLines={1}>
            Hola{nombre ? ` ${nombre}` : ""}
          </Text>
          <View style={estilos.botones}>
            <BotonCirculo icono="search" etiqueta="Buscar tarjetas" onPress={() => router.push("/tarjetas")} />
            <BotonCirculo
              icono="add"
              etiqueta="Sumar una tarjeta"
              onPress={() => Alert.alert("Sumar una tarjeta", "Acercá el iPhone al llavero Point del local y tu tarjeta aparece acá.")}
            />
          </View>
        </View>

        <View>
          <Text style={estilos.totalEtiqueta}>Puntos totales</Text>
          <Text style={estilos.total}>
            {total}
            <Text style={estilos.totalUnidad}> pts</Text>
          </Text>
        </View>

        <Pressable
          onPress={abrirSelector}
          disabled={!!origen}
          accessibilityRole="button"
          accessibilityHint="Abre el selector de tarjetas"
        >
          <View ref={tarjeta} collapsable={false} style={{ opacity: oculta ? 0 : 1 }}>
            <PointCard negocio={negocios[activo]} ancho={width - 40} brillo={brillo} />
          </View>
        </Pressable>
        <Text style={estilos.pista}>Tocá la tarjeta para cambiarla</Text>
      </View>

      <ScrollView style={estilos.movimientos} contentContainerStyle={estilos.movimientosContenido}>
        <Text style={estilos.subtitulo} accessibilityRole="header">
          Últimos movimientos
        </Text>
        <TransactionList movimientos={MOVIMIENTOS} />
      </ScrollView>

      {origen && (
        <CardCarouselOverlay negocios={negocios} activo={activo} origen={origen} onAbierto={alAbrir} onCerrado={alCerrar} />
      )}
    </View>
  );
}

function BotonCirculo({ icono, etiqueta, onPress }: { icono: keyof typeof Ionicons.glyphMap; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={4}
      style={({ pressed }) => [estilos.circulo, pressed && { transform: [{ scale: 0.92 }], backgroundColor: "#2a2d2a" }]}
    >
      <Ionicons name={icono} size={20} color="#fff" />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#0b0c0b",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 18,
  },
  filaHola: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  hola: { flex: 1, color: "#fff", fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  botones: { flexDirection: "row", gap: 10 },
  circulo: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#1d1f1d", alignItems: "center", justifyContent: "center" },
  totalEtiqueta: { color: "#a7aca5", fontSize: 13, letterSpacing: 0.3 },
  total: { color: "#fff", fontSize: 44, fontWeight: "800", letterSpacing: -1.3, marginTop: 4, fontVariant: ["tabular-nums"] },
  totalUnidad: { color: "#a7aca5", fontSize: 18, fontWeight: "700", letterSpacing: 0 },
  pista: { color: "#7d827b", fontSize: 12, textAlign: "center", marginTop: -6 },
  movimientos: { flex: 1 },
  movimientosContenido: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 140 },
  subtitulo: { fontSize: 18, fontWeight: "700", letterSpacing: -0.2, color: "#111311", marginBottom: 12 },
});
