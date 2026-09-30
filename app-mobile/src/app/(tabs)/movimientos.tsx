import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionList } from "@/components/tarjetas/TransactionList";
import { MOVIMIENTOS } from "@/lib/mock/negocios";

/** Todos los movimientos (por ahora, los de ejemplo). */
export default function Movimientos() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}>
      <Text style={estilos.titulo} accessibilityRole="header">
        Movimientos
      </Text>
      <TransactionList movimientos={MOVIMIENTOS} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#fff" },
  titulo: { fontSize: 32, fontWeight: "800", letterSpacing: -0.6, color: "#111311", marginBottom: 8 },
});
