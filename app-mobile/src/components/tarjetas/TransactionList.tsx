import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Movimiento } from "@/lib/mock/negocios";

const ICONOS: Record<Movimiento["tipo"], { nombre: keyof typeof Ionicons.glyphMap; fondo: string; color: string }> = {
  suma: { nombre: "add", fondo: "#e3f8ea", color: "#137a3f" },
  canje: { nombre: "ticket-outline", fondo: "#f1eefe", color: "#5a3fc4" },
  regalo: { nombre: "gift-outline", fondo: "#fff2dc", color: "#9a5b00" },
};

/** Últimos movimientos: ícono en un círculo, qué pasó, dónde y cuándo, y los puntos. */
export function TransactionList({ movimientos }: { movimientos: Movimiento[] }) {
  if (!movimientos.length) return <Text style={estilos.vacio}>Todavía no hay movimientos.</Text>;
  return (
    <View>
      {movimientos.map((m, i) => {
        const icono = ICONOS[m.tipo];
        const suma = m.puntos > 0;
        return (
          <View
            key={m.id}
            style={[estilos.fila, i < movimientos.length - 1 && estilos.divisor]}
            accessible
            accessibilityLabel={`${m.titulo}, ${m.negocio}, ${m.cuando}, ${suma ? "más" : "menos"} ${Math.abs(m.puntos)} puntos`}
          >
            <View style={[estilos.icono, { backgroundColor: icono.fondo }]}>
              <Ionicons name={icono.nombre} size={20} color={icono.color} />
            </View>
            <View style={estilos.texto}>
              <Text style={estilos.titulo} numberOfLines={1}>
                {m.titulo}
              </Text>
              <Text style={estilos.detalle} numberOfLines={1}>
                {m.negocio} · {m.cuando}
              </Text>
            </View>
            <Text style={[estilos.puntos, suma && estilos.mas]}>
              {suma ? "+" : "−"}
              {Math.abs(m.puntos)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  divisor: { borderBottomWidth: 1, borderBottomColor: "#eef0ec" },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  texto: { flex: 1, minWidth: 0 },
  titulo: { fontSize: 15, fontWeight: "600", color: "#111311" },
  detalle: { fontSize: 13, color: "#6d726b", marginTop: 2 },
  puntos: { fontSize: 15, fontWeight: "700", color: "#111311", fontVariant: ["tabular-nums"] },
  mas: { color: "#137a3f" },
  vacio: { fontSize: 15, color: "#6d726b", paddingVertical: 12 },
});
