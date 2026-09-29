import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "@/api/cliente";
import type { TarjetaDetalleApp } from "@/api/tipos";
import { TarjetaLocal } from "@/components/TarjetaLocal";
import { BotonAppleWallet } from "@/components/BotonAppleWallet";
import { Qr } from "@/components/Qr";
import { Boton } from "@/components/Boton";
import { useSesion } from "@/lib/sesion";
import { fechaCorta, textoPuntos } from "@/lib/formato";
import { color, radio, sombra } from "@/lib/tema";

/** Detalle: puntos, próximo premio, Apple Wallet, premios, QR e historial. */
export default function DetalleTarjeta() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { sesion, manejarError } = useSesion();
  const [t, setT] = useState<TarjetaDetalleApp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!sesion || !slug) return;
    try {
      setT(await api.tarjeta(sesion.token, slug));
      setError(null);
    } catch (e) {
      setError(manejarError(e));
    }
  }, [sesion, slug, manejarError]);

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

  if (!t) {
    return (
      <View style={estilos.centro}>
        {error ? (
          <>
            <Text style={estilos.vacioTexto}>{error}</Text>
            <Boton titulo="Reintentar" variante="secundario" onPress={cargar} style={{ marginTop: 16 }} />
          </>
        ) : (
          <ActivityIndicator accessibilityLabel="Cargando tu tarjeta" />
        )}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t.local.nombre }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={estilos.contenido}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
      >
        <View style={sombra}>
          <TarjetaLocal tarjeta={t} />
        </View>

        {t.proximo && (
          <View style={estilos.proximo}>
            <Text style={estilos.etiqueta}>PRÓXIMO PREMIO</Text>
            <Text style={estilos.proximoNombre}>{t.proximo.nombre}</Text>
            <Text style={[estilos.proximoDetalle, t.proximo.faltan === 0 && { color: color.acentoTexto, fontWeight: "600" }]}>
              {t.proximo.faltan === 0 ? `¡Ya lo podés canjear! Pedíselo al ${t.personal}.` : `Te ${t.proximo.faltan === 1 ? "falta 1 punto" : `faltan ${t.proximo.faltan} puntos`}`}
            </Text>
          </View>
        )}

        {t.appleWallet && (
          <View style={estilos.seccion}>
            <BotonAppleWallet slug={t.local.slug} />
            <Text style={estilos.nota}>Se actualiza sola cada vez que sumás.</Text>
          </View>
        )}

        <Text style={estilos.titulo}>Premios</Text>
        {t.premios.length === 0 ? (
          <Text style={estilos.vacioTexto}>{t.local.nombre} todavía está armando sus premios. Igual sumás en cada visita.</Text>
        ) : (
          <View style={estilos.lista}>
            {t.premios.map((p, i) => (
              <View key={p.id} style={[estilos.fila, i > 0 && estilos.separador]}>
                <View style={[estilos.premioIcono, p.alcanza && { backgroundColor: color.acentoSuave }]}>
                  <Ionicons name={p.alcanza ? "gift" : "gift-outline"} size={18} color={p.alcanza ? color.acentoTexto : color.tinta2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.filaTitulo}>{p.nombre}</Text>
                  {p.descripcion ? <Text style={estilos.filaDetalle}>{p.descripcion}</Text> : null}
                </View>
                <Text style={[estilos.filaPuntos, p.alcanza && { color: color.acentoTexto }]}>{textoPuntos(p.puntos)}</Text>
              </View>
            ))}
          </View>
        )}
        {t.premios.some((p) => p.alcanza) && (
          <Text style={estilos.nota}>Para canjear, pedile al {t.personal} que apoye su llavero en tu celular.</Text>
        )}

        <Text style={estilos.titulo}>Tu código</Text>
        <View style={[estilos.lista, estilos.qr]}>
          <Qr svg={t.qrSvg} lado={196} />
          <Text style={[estilos.nota, { textAlign: "center" }]}>Abre tu tarjeta (sólo para ver) desde cualquier celular.</Text>
        </View>

        {t.movimientos.length > 0 && (
          <>
            <Text style={estilos.titulo}>Historial</Text>
            <View style={estilos.lista}>
              {t.movimientos.map((m, i) => (
                <View key={m.id} style={[estilos.fila, i > 0 && estilos.separador]}>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.filaTitulo}>{m.texto}</Text>
                    <Text style={estilos.filaDetalle}>{fechaCorta(m.fecha)}</Text>
                  </View>
                  <Text style={[estilos.filaPuntos, m.puntos > 0 && { color: color.acentoTexto }]}>
                    {m.puntos > 0 ? `+${m.puntos}` : m.puntos}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 48 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  proximo: { marginTop: 20, padding: 18, borderRadius: radio.tarjeta, backgroundColor: color.blanco },
  etiqueta: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: color.tinta2 },
  proximoNombre: { fontSize: 20, fontWeight: "700", color: color.tinta, marginTop: 4 },
  proximoDetalle: { fontSize: 15, color: color.tinta2, marginTop: 2 },
  seccion: { marginTop: 16, gap: 8 },
  titulo: { fontSize: 20, fontWeight: "700", color: color.tinta, marginTop: 28, marginBottom: 10, letterSpacing: -0.3 },
  lista: { borderRadius: radio.tarjeta, backgroundColor: color.blanco, overflow: "hidden" },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borde },
  premioIcono: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.superficie, alignItems: "center", justifyContent: "center" },
  filaTitulo: { fontSize: 15, fontWeight: "600", color: color.tinta },
  filaDetalle: { fontSize: 13, color: color.tinta2, marginTop: 2 },
  filaPuntos: { fontSize: 14, fontWeight: "600", color: color.tinta2, fontVariant: ["tabular-nums"] },
  qr: { alignItems: "center", padding: 20, gap: 12 },
  nota: { fontSize: 13, color: color.tinta2, marginTop: 8, lineHeight: 18 },
  vacioTexto: { fontSize: 15, color: color.tinta2, lineHeight: 21, textAlign: "center" },
});
