import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Boton } from "@/components/Boton";
import { useSesion } from "@/lib/sesion";
import { limpiarWhatsapp, whatsappPlausible } from "@/lib/formato";
import { color, radio } from "@/lib/tema";

/** Ingreso con el WhatsApp con el que el cliente creó su tarjeta en un local. */
export default function Ingresar() {
  const { entrar } = useSesion();
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    if (!whatsappPlausible(whatsapp)) return setError("Escribí tu WhatsApp con código de área. Ej: 341 123 4567.");
    setError(null);
    setCargando(true);
    try {
      await entrar(whatsapp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <View style={estilos.marca}>
            <Image source={require("../../assets/icon.png")} style={estilos.icono} accessibilityLabel="Point" />
            <Text style={estilos.point}>POINT</Text>
          </View>

          <Text style={estilos.titulo}>Tus tarjetas de puntos, en un solo lugar</Text>
          <Text style={estilos.texto}>Entrá con el WhatsApp que usaste al crear tu tarjeta en un local.</Text>

          <Text style={estilos.etiqueta} nativeID="etiqueta-whatsapp">
            Tu WhatsApp
          </Text>
          <TextInput
            value={whatsapp}
            onChangeText={(t) => setWhatsapp(limpiarWhatsapp(t))}
            placeholder="Ej: 341 123 4567"
            placeholderTextColor={color.tinta3}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            returnKeyType="go"
            onSubmitEditing={enviar}
            accessibilityLabelledBy="etiqueta-whatsapp"
            style={[estilos.input, error && estilos.inputError]}
          />
          {error && (
            <Text style={estilos.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <Boton titulo="Entrar" onPress={enviar} cargando={cargando} style={{ marginTop: 20 }} />

          <View style={estilos.ayuda}>
            <Text style={estilos.ayudaTitulo}>¿Todavía no tenés tarjeta?</Text>
            <Text style={estilos.ayudaTexto}>
              Se crea la primera vez que sumás en un local adherido: pedile a quien te atiende que apoye su llavero en tu celular.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  etiqueta: { fontSize: 14, fontWeight: "600", color: color.tinta, marginTop: 32, marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: radio.chico,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.blanco,
    paddingHorizontal: 16,
    fontSize: 18,
    color: color.tinta,
  },
  inputError: { borderColor: color.error },
  error: { color: color.error, fontSize: 14, marginTop: 8, lineHeight: 20 },
  ayuda: { marginTop: 32, padding: 16, borderRadius: radio.tarjeta, backgroundColor: color.superficie },
  ayudaTitulo: { fontSize: 15, fontWeight: "600", color: color.tinta },
  ayudaTexto: { fontSize: 14, color: color.tinta2, marginTop: 4, lineHeight: 20 },
});
