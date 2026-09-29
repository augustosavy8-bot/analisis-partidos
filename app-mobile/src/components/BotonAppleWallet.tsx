import { useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ButtonStyle, Constants, RNWalletView, addPass, canAddPasses } from "@premieroctet/react-native-wallet";
import { api } from "@/api/cliente";
import { useSesion } from "@/lib/sesion";

/**
 * Botón oficial "Agregar a Apple Wallet" (PKAddPassButton). Baja el .pkpass del
 * servidor con el token de la sesión y abre la hoja nativa de PassKit.
 * No se muestra en Android ni si el iPhone no puede agregar pases.
 */
export function BotonAppleWallet({ slug }: { slug: string }) {
  const { sesion, manejarError } = useSesion();
  const [cargando, setCargando] = useState(false);

  if (Platform.OS !== "ios" || !sesion || !puedeAgregar()) return null;

  async function agregar() {
    if (cargando || !sesion) return;
    setCargando(true);
    try {
      const uri = await api.bajarPaseApple(sesion.token, slug);
      const agregado = await addPass(uri);
      if (agregado) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("No pudimos agregar tu tarjeta", manejarError(e));
    } finally {
      setCargando(false);
    }
  }

  const alto = Constants.buttonLayout?.baseHeight ?? 48;
  return (
    <View style={[estilos.contenedor, { height: alto }]}>
      <RNWalletView buttonStyle={ButtonStyle.BLACK} onPress={agregar} style={[estilos.boton, { height: alto }, cargando && estilos.oculto]} />
      {cargando && <ActivityIndicator style={StyleSheet.absoluteFill} accessibilityLabel="Preparando tu pase" />}
    </View>
  );
}

function puedeAgregar() {
  try {
    return canAddPasses() as unknown as boolean;
  } catch {
    return false;
  }
}

const estilos = StyleSheet.create({
  contenedor: { alignSelf: "stretch", justifyContent: "center" },
  boton: { alignSelf: "stretch" },
  oculto: { opacity: 0 },
});
