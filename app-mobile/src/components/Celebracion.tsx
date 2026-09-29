import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { ResultadoToqueApp, TarjetaDetalleApp } from "@/api/tipos";
import { Boton } from "@/components/Boton";
import { horaCorta, textoProximo, textoPuntos } from "@/lib/formato";

/**
 * Pantalla completa con los colores del bar después del toque: sumaste, canjeaste
 * (con hora en vivo para mostrarle al personal) o "ya sumaste hace poco".
 */
export function Celebracion({ resultado, tarjeta, onListo }: { resultado: ResultadoToqueApp; tarjeta: TarjetaDetalleApp; onListo: () => void }) {
  const c = tarjeta.local.colores;
  useEffect(() => {
    if (resultado.tipo !== "limite") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [resultado.tipo]);

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: c.fondo }]}>
      <View style={estilos.centro}>
        <Text style={[estilos.local, { color: c.texto }]}>{tarjeta.local.programa}</Text>

        {resultado.tipo === "suma" && (
          <>
            <View style={[estilos.circulo, { backgroundColor: c.acento }]}>
              <Text style={[estilos.mas, { color: c.fondo }]}>+{resultado.sumados}</Text>
            </View>
            <Text style={[estilos.titulo, { color: c.texto }]} accessibilityRole="header">
              ¡Sumaste {textoPuntos(resultado.sumados)}!
            </Text>
            <Text style={[estilos.texto, { color: c.texto }]}>Ahora tenés {textoPuntos(tarjeta.puntos)}.</Text>
            {resultado.regalos.map((r, i) => (
              <Text key={i} style={[estilos.regalo, { color: c.etiqueta }]}>
                🎁 {r.texto}
              </Text>
            ))}
            <Text style={[estilos.proximo, { color: c.texto }]}>
              {resultado.completado ? `¡Ya podés canjear ${resultado.completado}!` : textoProximo(tarjeta.proximo)}
            </Text>
          </>
        )}

        {resultado.tipo === "canje" && (
          <>
            <View style={[estilos.circulo, { backgroundColor: c.acento }]}>
              <Ionicons name="gift" size={56} color={c.fondo} />
            </View>
            <Text style={[estilos.titulo, { color: c.texto }]} accessibilityRole="header">
              ¡Premio canjeado!
            </Text>
            {resultado.premio && <Text style={[estilos.premio, { color: c.texto }]}>{resultado.premio}</Text>}
            <Reloj color={c.texto} />
            <Text style={[estilos.texto, { color: c.texto }]}>Mostrale esta pantalla a quien te atiende.</Text>
          </>
        )}

        {resultado.tipo === "limite" && (
          <>
            <View style={[estilos.circulo, { backgroundColor: c.texto + "22" }]}>
              <Ionicons name="time-outline" size={56} color={c.texto} />
            </View>
            <Text style={[estilos.titulo, { color: c.texto }]} accessibilityRole="header">
              Ya sumaste hace poco
            </Text>
            <Text style={[estilos.texto, { color: c.texto }]}>Vas a poder sumar de nuevo a las {horaCorta(resultado.proximoEn)}.</Text>
          </>
        )}
      </View>
      <View style={estilos.pie}>
        <Boton titulo="Ver mi tarjeta" variante="secundario" onPress={onListo} />
      </View>
    </SafeAreaView>
  );
}

/** Hora en vivo con segundos: muestra que no es una captura de pantalla. */
function Reloj({ color }: { color: string }) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <Text style={[estilos.reloj, { color }]} accessibilityLabel={`Hora actual ${ahora.toLocaleTimeString("es-AR")}`}>
      {ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" })}
    </Text>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 6 },
  local: { fontSize: 15, fontWeight: "600", opacity: 0.8, marginBottom: 24 },
  circulo: { width: 132, height: 132, borderRadius: 66, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  mas: { fontSize: 52, fontWeight: "800", letterSpacing: -1 },
  titulo: { fontSize: 30, fontWeight: "800", textAlign: "center", letterSpacing: -0.6 },
  texto: { fontSize: 17, opacity: 0.85, textAlign: "center", marginTop: 4, lineHeight: 23 },
  regalo: { fontSize: 16, fontWeight: "600", marginTop: 6 },
  proximo: { fontSize: 16, opacity: 0.75, textAlign: "center", marginTop: 16 },
  premio: { fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 6 },
  reloj: { fontSize: 34, fontWeight: "700", fontVariant: ["tabular-nums"], marginTop: 14 },
  pie: { padding: 20 },
});
