import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Item = {
  clave: string;
  etiqueta: string;
  icono: keyof typeof Ionicons.glyphMap;
  /** Pestaña del navegador de tabs, o ruta del stack que se abre encima. */
  ruta?: string;
  href?: "/tarjetas" | "/ajustes";
};

const ITEMS: Item[] = [
  { clave: "inicio", etiqueta: "Inicio", icono: "home", ruta: "index" },
  { clave: "movimientos", etiqueta: "Movimientos", icono: "swap-vertical", ruta: "movimientos" },
  { clave: "tarjetas", etiqueta: "Tarjetas", icono: "card", href: "/tarjetas" },
  { clave: "perfil", etiqueta: "Perfil", icono: "person", href: "/ajustes" },
];

/** Barra de tabs flotante: píldora negra, el ítem activo en un círculo blanco. */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const actual = state.routes[state.index]?.name;

  function tocar(item: Item) {
    Haptics.selectionAsync().catch(() => {});
    if (item.href) {
      router.push(item.href);
      return;
    }
    const ruta = state.routes.find((r) => r.name === item.ruta);
    if (!ruta) return;
    const evento = navigation.emit({ type: "tabPress", target: ruta.key, canPreventDefault: true });
    if (actual !== ruta.name && !evento.defaultPrevented) navigation.navigate(ruta.name);
  }

  return (
    <View pointerEvents="box-none" style={[estilos.contenedor, { bottom: Math.max(insets.bottom, 12) + 10 }]}>
      <View style={estilos.pildora} accessibilityRole="tablist">
        {ITEMS.map((item) => {
          const activo = !!item.ruta && item.ruta === actual;
          return (
            <Pressable
              key={item.clave}
              onPress={() => tocar(item)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={item.etiqueta}
              style={({ pressed }) => [estilos.tab, activo && estilos.tabActivo, pressed && !activo && estilos.tabApretado]}
            >
              <Ionicons name={activo ? item.icono : (`${item.icono}-outline` as Item["icono"])} size={22} color={activo ? "#0b0c0b" : "#9aa097"} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  pildora: {
    flexDirection: "row",
    gap: 6,
    padding: 7,
    borderRadius: 999,
    backgroundColor: "#0b0c0b",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  tab: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  tabActivo: { backgroundColor: "#fff" },
  tabApretado: { backgroundColor: "#1d1f1d" },
});
