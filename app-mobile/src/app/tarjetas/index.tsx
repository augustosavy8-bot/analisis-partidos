import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Link, Stack, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "@/api/cliente";
import type { TarjetaResumenApp } from "@/api/tipos";
import { TarjetaLocal } from "@/components/TarjetaLocal";
import { Boton } from "@/components/Boton";
import { useSesion } from "@/lib/sesion";
import { color, radio } from "@/lib/tema";

/** "Mis tarjetas": los locales donde el cliente tiene puntos. */
export default function MisTarjetas() {
  const { sesion, manejarError } = useSesion();
  const [tarjetas, setTarjetas] = useState<TarjetaResumenApp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    try {
      const r = await api.tarjetas(sesion.token);
      setTarjetas(r.tarjetas);
      setError(null);
    } catch (e) {
      setError(manejarError(e));
    }
  }, [sesion, manejarError]);

  // Al volver a la pantalla (por ejemplo, después de sumar en un local) se actualiza.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/ajustes" asChild>
              <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Ajustes">
                <Ionicons name="person-circle-outline" size={28} color={color.tinta} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <FlatList
        data={tarjetas ?? []}
        keyExtractor={(t) => t.local.slug}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
        ListHeaderComponent={
          sesion?.nombre ? <Text style={estilos.hola}>Hola, {sesion.nombre.split(" ")[0]}</Text> : null
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: "/tarjetas/[slug]", params: { slug: item.local.slug } }} asChild>
            <Pressable style={({ pressed }) => [estilos.item, pressed && { transform: [{ scale: 0.98 }] }]} accessibilityRole="button">
              <TarjetaLocal tarjeta={item} compacta />
              {item.premiosDisponibles > 0 && (
                <View style={estilos.premio}>
                  <Ionicons name="gift" size={16} color={color.acentoTexto} />
                  <Text style={estilos.premioTexto}>
                    {item.premiosDisponibles === 1 ? "Tenés un premio para canjear" : `Tenés ${item.premiosDisponibles} premios para canjear`}
                  </Text>
                </View>
              )}
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          error ? (
            <View style={estilos.vacio}>
              <Text style={estilos.vacioTitulo}>No pudimos cargar tus tarjetas</Text>
              <Text style={estilos.vacioTexto}>{error}</Text>
              <Boton titulo="Reintentar" variante="secundario" onPress={refrescar} style={{ marginTop: 16 }} />
            </View>
          ) : tarjetas ? (
            <View style={estilos.vacio}>
              <Text style={estilos.vacioTitulo}>Todavía no tenés tarjetas</Text>
              <Text style={estilos.vacioTexto}>
                La primera vez que sumás en un local con Point, tu tarjeta aparece acá. Pedile a quien te atiende que apoye su llavero.
              </Text>
            </View>
          ) : null
        }
      />
    </>
  );
}

const estilos = StyleSheet.create({
  lista: { padding: 16, gap: 16, paddingBottom: 40 },
  hola: { fontSize: 16, color: color.tinta2, marginBottom: 4 },
  item: { gap: 8 },
  premio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: color.acentoSuave,
    borderRadius: radio.chico,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  premioTexto: { fontSize: 14, fontWeight: "600", color: color.acentoTexto },
  vacio: { padding: 24, borderRadius: radio.tarjeta, backgroundColor: color.blanco, marginTop: 8 },
  vacioTitulo: { fontSize: 18, fontWeight: "600", color: color.tinta },
  vacioTexto: { fontSize: 15, color: color.tinta2, marginTop: 6, lineHeight: 21 },
});
