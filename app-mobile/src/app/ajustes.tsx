import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Boton } from "@/components/Boton";
import { useSesion } from "@/lib/sesion";
import { URL_PRIVACIDAD } from "@/lib/config";
import { color, radio } from "@/lib/tema";

/** Cuenta: cerrar sesión, privacidad y "Eliminar mi cuenta" (lo exige Apple). */
export default function Ajustes() {
  const { sesion, salir, eliminarCuenta } = useSesion();
  const [eliminando, setEliminando] = useState(false);

  function confirmarEliminar() {
    Alert.alert(
      "¿Eliminar tu cuenta?",
      "Se borran todas tus tarjetas, puntos, premios e historial en todos los locales, y tus datos personales. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setEliminando(true);
            try {
              await eliminarCuenta();
              Alert.alert("Listo", "Tu cuenta y tus datos fueron eliminados.");
            } catch (e) {
              Alert.alert("No pudimos eliminar tu cuenta", e instanceof Error ? e.message : "Probá de nuevo.");
            } finally {
              setEliminando(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <View style={estilos.caja}>
        <Text style={estilos.etiqueta}>Nombre</Text>
        <Text style={estilos.valor}>{sesion?.nombre}</Text>
      </View>

      <View style={[estilos.caja, { padding: 0 }]}>
        <Pressable
          style={estilos.fila}
          accessibilityRole="link"
          onPress={() => WebBrowser.openBrowserAsync(URL_PRIVACIDAD)}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={color.tinta} />
          <Text style={estilos.filaTexto}>Privacidad</Text>
          <Ionicons name="chevron-forward" size={18} color={color.tinta3} />
        </Pressable>
      </View>

      <Boton
        titulo="Cerrar sesión"
        variante="secundario"
        onPress={async () => {
          await salir();
          router.dismissAll();
        }}
      />

      <View style={estilos.peligro}>
        <Text style={estilos.peligroTitulo}>Eliminar mi cuenta</Text>
        <Text style={estilos.peligroTexto}>
          Borra tus tarjetas en todos los locales, tus puntos, premios, historial y tus datos personales. No se puede deshacer.
        </Text>
        <Boton titulo="Eliminar mi cuenta" variante="peligro" onPress={confirmarEliminar} cargando={eliminando} style={{ marginTop: 14 }} />
      </View>

      <Text style={estilos.version}>Point {Constants.expoConfig?.version}</Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 16, gap: 16, paddingBottom: 48 },
  caja: { backgroundColor: color.blanco, borderRadius: radio.tarjeta, padding: 16 },
  etiqueta: { fontSize: 13, color: color.tinta2 },
  valor: { fontSize: 17, fontWeight: "600", color: color.tinta, marginTop: 2 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  filaTexto: { flex: 1, fontSize: 16, color: color.tinta },
  peligro: { marginTop: 16, padding: 16, borderRadius: radio.tarjeta, borderWidth: 1, borderColor: color.errorSuave, backgroundColor: color.blanco },
  peligroTitulo: { fontSize: 16, fontWeight: "700", color: color.error },
  peligroTexto: { fontSize: 14, color: color.tinta2, marginTop: 6, lineHeight: 20 },
  version: { textAlign: "center", fontSize: 12, color: color.tinta3, marginTop: 8 },
});
