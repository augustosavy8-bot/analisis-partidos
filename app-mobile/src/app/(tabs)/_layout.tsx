import { Tabs } from "expo-router/js-tabs";
import { FloatingTabBar } from "@/components/tarjetas/FloatingTabBar";

/** Inicio y Movimientos con la barra flotante; Tarjetas y Perfil abren pantallas encima. */
export default function LayoutTabs() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="movimientos" options={{ title: "Movimientos" }} />
    </Tabs>
  );
}
