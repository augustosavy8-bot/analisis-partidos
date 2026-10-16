import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { color, radio } from "@/lib/tema";

/**
 * Sin sesión. Para entrar hay que estar en el local: el toque del llavero abre la
 * app y ahí se crea la tarjeta o se entra con el WhatsApp (el servidor exige ese
 * toque; sólo con el número no se puede entrar a una tarjeta).
 */
export default function Ingresar() {
  return (
    <SafeAreaView style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.marca}>
          <Image source={require("../../assets/icon.png")} style={estilos.icono} accessibilityLabel="Point" />
          <Text style={estilos.point}>POINT</Text>
        </View>

        <Text style={estilos.titulo}>Tus tarjetas de puntos, en un solo lugar</Text>
        <Text style={estilos.texto}>
          Para entrar, pedile a quien te atiende en un local adherido que apoye su llavero en tu celular. Si ya tenés tarjeta, entrás con tu
          WhatsApp; si no, se crea en ese momento.
        </Text>

        <View style={estilos.ayuda}>
          <Text style={estilos.ayudaTitulo}>¿Por qué hace falta el llavero?</Text>
          <Text style={estilos.ayudaTexto}>Así nadie puede entrar a tu tarjeta sabiendo sólo tu número.</Text>
        </View>

        <Pressable onPress={() => router.push("/admin")} style={{ alignSelf: "center", padding: 12, marginTop: 8 }} accessibilityRole="link">
          <Text style={{ fontSize: 13, color: color.tinta3 }}>Soy de Point</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 24, paddingTop: 48, flexGrow: 1 },
  marca: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 40 },
  icono: { width: 40, height: 40, borderRadius: 10 },
  point: { fontSize: 16, fontWeight: "800", letterSpacing: 3, color: color.tinta },
  titulo: { fontSize: 30, fontWeight: "700", letterSpacing: -0.8, color: color.tinta, lineHeight: 36 },
  texto: { fontSize: 16, color: color.tinta2, marginTop: 10, lineHeight: 22 },
  ayuda: { marginTop: 32, padding: 16, borderRadius: radio.tarjeta, backgroundColor: color.superficie },
  ayudaTitulo: { fontSize: 15, fontWeight: "600", color: color.tinta },
  ayudaTexto: { fontSize: 14, color: color.tinta2, marginTop: 4, lineHeight: 20 },
});
