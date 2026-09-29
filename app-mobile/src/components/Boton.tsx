import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { color } from "@/lib/tema";

type Props = Omit<PressableProps, "style"> & {
  titulo: string;
  variante?: "primario" | "secundario" | "peligro";
  cargando?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Boton({ titulo, variante = "primario", cargando, disabled, style, ...props }: Props) {
  const v = estilos[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!cargando, busy: !!cargando }}
      disabled={disabled || cargando}
      style={({ pressed }) => [estilos.base, v.caja, (disabled || cargando) && estilos.apagado, pressed && estilos.apretado, style]}
      {...props}
    >
      {cargando ? <ActivityIndicator color={v.texto.color} /> : <Text style={[estilos.texto, v.texto]}>{titulo}</Text>}
    </Pressable>
  );
}

const estilos = {
  ...StyleSheet.create({
    base: { minHeight: 52, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    texto: { fontSize: 16, fontWeight: "600" },
    apagado: { opacity: 0.5 },
    apretado: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  }),
  primario: StyleSheet.create({ caja: { backgroundColor: color.tinta }, texto: { color: color.blanco } }),
  secundario: StyleSheet.create({ caja: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde }, texto: { color: color.tinta } }),
  peligro: StyleSheet.create({ caja: { backgroundColor: color.errorSuave }, texto: { color: color.error } }),
};
