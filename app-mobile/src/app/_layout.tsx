import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { ProveedorSesion, useSesion } from "@/lib/sesion";
import { color } from "@/lib/tema";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navegacion() {
  const { sesion } = useSesion();
  const leyendo = sesion === undefined;

  // El splash queda hasta saber si hay sesión (así no parpadea el ingreso).
  useEffect(() => {
    if (!leyendo) SplashScreen.hideAsync().catch(() => {});
  }, [leyendo]);

  if (leyendo) return null;
  const conSesion = !!sesion;

  return (
    <Stack
      screenOptions={{
        headerTintColor: color.tinta,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: color.fondo },
        headerTitleStyle: { fontWeight: "600" },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: color.fondo },
      }}
    >
      <Stack.Protected guard={!conSesion}>
        <Stack.Screen name="ingresar" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={conSesion}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tarjetas/index" options={{ title: "Mis tarjetas", headerLargeTitle: true }} />
        <Stack.Screen name="tarjetas/[slug]" options={{ title: "" }} />
        <Stack.Screen name="ajustes" options={{ title: "Ajustes", presentation: "modal" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function Raiz() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProveedorSesion>
        <StatusBar style="dark" />
        <Navegacion />
      </ProveedorSesion>
    </GestureHandlerRootView>
  );
}
