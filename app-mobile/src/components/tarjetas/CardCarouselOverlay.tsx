import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  clamp,
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import type { Negocio } from "@/lib/mock/negocios";
import { PointCard } from "./PointCard";
import { GAP_CARRUSEL, PROPORCION, estiloPorDistancia, geometriaCarrusel, indiceCentrado, vuelo, type Rect } from "./geometria";

/** El resorte del pedido: damping 18, stiffness 140 (~500 ms, con un rebote chiquito). */
const RESORTE = { damping: 18, stiffness: 140 };
/** Cuánto hay que arrastrar hacia abajo (o qué tan rápido) para cerrar. */
const UMBRAL_CIERRE = 110;
const VELOCIDAD_CIERRE = 900;
/** La entrada escalonada de las vecinas se mide en ms sobre un único valor 0..1. */
const DURACION_ENTRADA = 900;

type Geometria = ReturnType<typeof geometriaCarrusel>;

type Props = {
  negocios: Negocio[];
  /** Tarjeta que está en el home (la que sale volando). */
  activo: number;
  /** Dónde está la tarjeta del home, en coordenadas de la ventana. */
  origen: Rect;
  /** El overlay ya tapa la pantalla: el home puede esconder su tarjeta. */
  onAbierto: () => void;
  /** Terminó de volver: la tarjeta elegida ya está en el lugar del home. */
  onCerrado: (indice: number) => void;
};

function vibrarSeleccion() {
  Haptics.selectionAsync().catch(() => {});
}

/**
 * Selector de tarjetas: la tarjeta del home se levanta, gira 90° y queda vertical
 * en el centro; las demás entran por los costados y se eligen con un carrusel.
 * Todo corre en el hilo de UI (valores compartidos); React sólo se entera al
 * abrir y al cerrar.
 */
export function CardCarouselOverlay({ negocios, activo, origen, onAbierto, onCerrado }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const g = useMemo(() => geometriaCarrusel(W, H), [W, H]);
  const destino = useMemo(() => ({ cx: W / 2, cy: g.arriba + g.alto / 2 }), [W, g]);
  const total = negocios.length;

  // 0 = en el home (horizontal) · 1 = en el carrusel (vertical).
  const progreso = useSharedValue(0);
  // Opacidad de la tarjeta que vuela; al terminar el vuelo la reemplaza su lugar en el carrusel.
  const volando = useSharedValue(1);
  // Lugar del carrusel escondido mientras su tarjeta vuela (-1 = ninguno).
  const oculto = useSharedValue(activo);
  const entrada = useSharedValue(0);
  const salida = useSharedValue(0);
  const arrastre = useSharedValue(0);
  // 1 cuando el carrusel está quieto y se puede usar (hápticos, gesto de cierre).
  const listo = useSharedValue(0);
  const scrollX = useSharedValue(activo * g.paso);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // La tarjeta que vuela: la activa al abrir, la elegida al cerrar.
  const [vuela, setVuela] = useState(activo);
  const [cierre, setCierre] = useState<number | null>(null);
  const abierto = useRef(false);
  const cerrando = useRef(false);

  const abrir = useCallback(() => {
    if (abierto.current) return;
    abierto.current = true;
    onAbierto();
    entrada.value = withTiming(1, { duration: DURACION_ENTRADA });
    progreso.value = withSpring(1, RESORTE, (termino) => {
      if (!termino) return;
      oculto.value = -1;
      volando.value = 0;
      listo.value = 1;
    });
  }, [onAbierto, entrada, progreso, oculto, volando, listo]);

  const cerrar = useCallback((indice: number) => {
    if (cerrando.current) return;
    cerrando.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setVuela(indice);
    setCierre(indice);
  }, []);

  // El cierre arranca después de que la tarjeta que vuela ya muestra la elegida
  // (estaba invisible), así no hay saltos. Vuelve rotando -90° al home.
  useLayoutEffect(() => {
    if (cierre === null) return;
    const i = cierre;
    scheduleOnUI(() => {
      "worklet";
      listo.value = 0;
      oculto.value = i;
      volando.value = 1;
      salida.value = withTiming(1, { duration: 220 });
      progreso.value = withSpring(0, RESORTE, () => {
        scheduleOnRN(onCerrado, i);
      });
    });
  }, [cierre, listo, oculto, volando, salida, progreso, onCerrado]);

  const alScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  // Háptico de selección cada vez que cambia la tarjeta centrada.
  useAnimatedReaction(
    () => indiceCentrado(scrollX.value, g.paso, total),
    (actual, previo) => {
      if (previo !== null && actual !== previo && listo.value === 1) scheduleOnRN(vibrarSeleccion);
    },
  );

  const tocarLugar = useCallback(
    (i: number) => {
      const centrado = indiceCentrado(scrollX.value, g.paso, total);
      if (i === centrado) cerrar(i);
      else
        scheduleOnUI(() => {
          "worklet";
          scrollTo(scrollRef, i * g.paso, 0, true);
        });
    },
    [cerrar, g.paso, total, scrollX, scrollRef],
  );

  const usarEsta = useCallback(() => cerrar(indiceCentrado(scrollX.value, g.paso, total)), [cerrar, scrollX, g.paso, total]);

  // Deslizar hacia abajo cierra; el gesto convive con el scroll horizontal.
  const gestos = useMemo(() => {
    const nativo = Gesture.Native();
    const pan = Gesture.Pan()
      .activeOffsetY(15)
      .failOffsetX([-15, 15])
      .simultaneousWithExternalGesture(nativo)
      .onUpdate((e) => {
        if (listo.value !== 1) return;
        arrastre.value = Math.max(0, e.translationY);
      })
      .onEnd((e) => {
        if (listo.value !== 1) return;
        if (e.translationY > UMBRAL_CIERRE || e.velocityY > VELOCIDAD_CIERRE) {
          scheduleOnRN(cerrar, indiceCentrado(scrollX.value, g.paso, total));
        } else {
          arrastre.value = withSpring(0, RESORTE);
        }
      });
    return { nativo, pan };
  }, [cerrar, g.paso, total, listo, arrastre, scrollX]);

  const estiloFondo = useAnimatedStyle(() => ({
    opacity: 0.95 * clamp(progreso.value, 0, 1) * (1 - clamp(arrastre.value / 500, 0, 0.5)),
  }));

  const estiloCarrusel = useAnimatedStyle(() => ({
    transform: [{ translateY: arrastre.value }],
  }));

  const altoTarjeta = g.alto / PROPORCION;
  const estiloVuelo = useAnimatedStyle(() => {
    const v = vuelo(progreso.value, origen, destino, g.alto, arrastre.value);
    return {
      opacity: volando.value,
      transform: [
        { translateX: v.cx - g.alto / 2 },
        { translateY: v.cy - altoTarjeta / 2 },
        { rotate: `${v.rotacion}deg` },
        { scale: v.escala },
      ],
    };
  });

  const estiloInfo = useAnimatedStyle(() => ({
    opacity:
      interpolate(progreso.value, [0.7, 1], [0, 1], Extrapolation.CLAMP) * (1 - salida.value) * (1 - clamp(arrastre.value / 150, 0, 1)),
  }));

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={usarEsta}>
      <StatusBar style="light" />
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <GestureDetector gesture={gestos.pan}>
          <View style={StyleSheet.absoluteFill} onLayout={abrir}>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, estilos.fondo, estiloFondo]} />

            <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: g.arriba, height: g.alto }, estiloCarrusel]}>
              <GestureDetector gesture={gestos.nativo}>
                <Animated.ScrollView
                  ref={scrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={g.paso}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  contentOffset={{ x: activo * g.paso, y: 0 }}
                  contentContainerStyle={{ paddingHorizontal: g.relleno, gap: GAP_CARRUSEL }}
                  onScroll={alScroll}
                  scrollEventThrottle={16}
                  style={{ overflow: "visible" }}
                >
                  {negocios.map((n, i) => (
                    <CarouselSlot
                      key={n.id}
                      negocio={n}
                      indice={i}
                      activo={activo}
                      g={g}
                      scrollX={scrollX}
                      entrada={entrada}
                      salida={salida}
                      oculto={oculto}
                      onPress={tocarLugar}
                    />
                  ))}
                </Animated.ScrollView>
              </GestureDetector>
            </Animated.View>

            <Animated.View style={[estilos.info, { top: g.arriba + g.alto + 22 }, estiloInfo]}>
              <View style={estilos.capas}>
                {negocios.map((n, i) => (
                  <CapaInfo key={n.id} negocio={n} indice={i} paso={g.paso} scrollX={scrollX} />
                ))}
              </View>
              <Pressable
                onPress={usarEsta}
                accessibilityRole="button"
                style={({ pressed }) => [estilos.usar, pressed && { transform: [{ scale: 0.97 }] }]}
              >
                <Text style={estilos.usarTexto}>Usar esta</Text>
              </Pressable>
              <Text style={estilos.pista}>Deslizá hacia abajo para cerrar</Text>
            </Animated.View>

            {/* La tarjeta que viaja entre el home y el carrusel. */}
            <Animated.View pointerEvents="none" style={[estilos.vuela, { width: g.alto, height: altoTarjeta }, estiloVuelo]}>
              <PointCard negocio={negocios[vuela]} ancho={g.alto} />
            </Animated.View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

type PropsLugar = {
  negocio: Negocio;
  indice: number;
  activo: number;
  g: Geometria;
  scrollX: SharedValue<number>;
  entrada: SharedValue<number>;
  salida: SharedValue<number>;
  oculto: SharedValue<number>;
  onPress: (i: number) => void;
};

/** Un lugar del carrusel: la tarjeta girada 90°, con escala, opacidad y rotateY según su distancia al centro. */
function CarouselSlot({ negocio, indice, activo, g, scrollX, entrada, salida, oculto, onPress }: PropsLugar) {
  const brillo = useDerivedValue(() => clamp((scrollX.value / g.paso - indice) * 1.4, -1, 1));

  const estilo = useAnimatedStyle(() => {
    const d = (indice * g.paso - scrollX.value) / g.paso;
    const e = estiloPorDistancia(d);
    // Las vecinas entran escalonadas desde su costado (la activa llega volando).
    const k = Math.abs(indice - activo);
    const t = entrada.value * DURACION_ENTRADA;
    const local = k === 0 ? 1 : clamp((t - 120 - 70 * (k - 1)) / 350, 0, 1);
    const suave = 1 - Math.pow(1 - local, 3);
    const visible = oculto.value === indice ? 0 : 1;
    return {
      opacity: e.opacidad * suave * (1 - salida.value) * visible,
      transform: [
        { translateX: (1 - suave) * 60 * Math.sign(indice - activo) },
        { perspective: 1000 },
        { rotateY: `${e.rotacionY}deg` },
        { scale: e.escala },
      ],
    };
  });

  const altoTarjeta = g.alto / PROPORCION;
  return (
    <Pressable
      onPress={() => onPress(indice)}
      accessibilityRole="button"
      accessibilityLabel={`${negocio.nombre}, ${negocio.puntos} puntos`}
      style={{ width: g.ancho, height: g.alto }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, estilo]}>
        <View
          style={{
            position: "absolute",
            left: (g.ancho - g.alto) / 2,
            top: (g.alto - altoTarjeta) / 2,
            transform: [{ rotate: "90deg" }],
          }}
        >
          <PointCard negocio={negocio} ancho={g.alto} brillo={brillo} sinSombra />
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** Nombre y puntos debajo del carrusel: cada capa aparece cuando su tarjeta está en el centro (crossfade). */
function CapaInfo({ negocio, indice, paso, scrollX }: { negocio: Negocio; indice: number; paso: number; scrollX: SharedValue<number> }) {
  const estilo = useAnimatedStyle(() => ({
    opacity: clamp(1 - Math.abs(scrollX.value / paso - indice) * 2.5, 0, 1),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, estilo]} pointerEvents="none">
      <Text style={estilos.capaNombre} numberOfLines={1}>
        {negocio.nombre}
      </Text>
      <Text style={estilos.capaPuntos}>
        {negocio.puntos} pts · {negocio.premio} a los {negocio.meta}
      </Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  fondo: { backgroundColor: "#000" },
  vuela: { position: "absolute", left: 0, top: 0 },
  info: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  capas: { alignSelf: "stretch", height: 56 },
  capaNombre: { color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: -0.2, textAlign: "center" },
  capaPuntos: { color: "#b5bab2", fontSize: 14, marginTop: 4, textAlign: "center", fontVariant: ["tabular-nums"] },
  usar: {
    marginTop: 14,
    height: 48,
    paddingHorizontal: 26,
    borderRadius: 999,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  usarTexto: { color: "#0b0c0b", fontWeight: "700", fontSize: 15 },
  pista: { color: "#7f857c", fontSize: 12, marginTop: 12 },
});
