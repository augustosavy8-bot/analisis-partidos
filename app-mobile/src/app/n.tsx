import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ErrorApi } from "@/api/cliente";
import type { LocalApp, ParamsToque, RespuestaToqueApp } from "@/api/tipos";
import { Celebracion } from "@/components/Celebracion";
import { Boton } from "@/components/Boton";
import { useSesion } from "@/lib/sesion";
import { URL_PRIVACIDAD } from "@/lib/config";
import { limpiarWhatsapp, whatsappPlausible } from "@/lib/formato";
import { color, radio } from "@/lib/tema";

type Estado =
  | { fase: "cargando" }
  | { fase: "registro"; toquePendiente: string; local: LocalApp }
  | { fase: "listo"; respuesta: Extract<RespuestaToqueApp, { estado: "aplicado" }> }
  | { fase: "error"; titulo: string; texto: string };

const CLAVES = ["p", "m", "picc_data", "cmac", "t", "q"] as const;

/**
 * El llavero del local (o su QR de respaldo) abre https://…/n?… y, con los
 * enlaces universales, iOS abre esta pantalla en vez de Safari.
 */
export default function Toque() {
  const q = useLocalSearchParams<Record<string, string>>();
  const { sesion, iniciar, entrar } = useSesion();
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  // Cada toque se manda una sola vez (el contador del chip no se puede repetir); si
  // llega otro toque con la pantalla abierta, cambian los parámetros y se procesa.
  const procesado = useRef<string | null>(null);
  const params: ParamsToque = {};
  for (const k of CLAVES) if (typeof q[k] === "string") params[k] = q[k];
  const clave = JSON.stringify(params);

  useEffect(() => {
    if (sesion === undefined || procesado.current === clave) return;
    procesado.current = clave;
    setEstado({ fase: "cargando" });
    api
      .toque(sesion?.token ?? null, JSON.parse(clave) as ParamsToque)
      .then(mostrar)
      .catch((e) => setEstado(error(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sólo cuando llega un toque nuevo
  }, [clave, sesion === undefined]);

  function mostrar(r: RespuestaToqueApp) {
    setEstado(r.estado === "registro" ? { fase: "registro", toquePendiente: r.toquePendiente, local: r.local } : { fase: "listo", respuesta: r });
  }

  function verTarjeta(slug: string) {
    router.replace("/");
    router.push({ pathname: "/tarjetas/[slug]", params: { slug } });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: estado.fase !== "cargando" }} />
      {estado.fase === "cargando" && (
        <View style={estilos.centro}>
          <ActivityIndicator size="large" color={color.tinta} />
          <Text style={estilos.cargando}>Sumando tu punto…</Text>
        </View>
      )}
      {estado.fase === "listo" && (
        <Celebracion resultado={estado.respuesta.resultado} tarjeta={estado.respuesta.tarjeta} onListo={() => verTarjeta(estado.respuesta.tarjeta.local.slug)} />
      )}
      {estado.fase === "error" && (
        <SafeAreaView style={[estilos.centro, { padding: 28 }]}>
          <Ionicons name="alert-circle-outline" size={56} color={color.tinta2} />
          <Text style={estilos.errorTitulo} accessibilityRole="header">
            {estado.titulo}
          </Text>
          <Text style={estilos.errorTexto}>{estado.texto}</Text>
          <Boton titulo="Listo" variante="secundario" onPress={() => router.replace("/")} style={{ marginTop: 24, alignSelf: "stretch" }} />
        </SafeAreaView>
      )}
      {estado.fase === "registro" && (
        <Registro
          local={estado.local}
          onRegistro={async (datos) => {
            const r = await api.registro({ ...datos, consentimiento: true, toquePendiente: estado.toquePendiente });
            await iniciar(r);
            setEstado({ fase: "listo", respuesta: r });
          }}
          onEntrar={async (whatsapp) => {
            const s = await entrar(whatsapp);
            try {
              mostrar(await api.toquePendiente(s.token, estado.toquePendiente));
            } catch (e) {
              setEstado(error(e));
            }
          }}
        />
      )}
    </>
  );
}

function error(e: unknown): Estado {
  const titulo = e instanceof ErrorApi && e.titulo ? e.titulo : "No pudimos sumar tu punto";
  return { fase: "error", titulo, texto: e instanceof Error ? e.message : "Probá de nuevo." };
}

/** Primera vez en la app: crear la tarjeta (o entrar si ya tenés una en otro local). */
function Registro({
  local,
  onRegistro,
  onEntrar,
}: {
  local: LocalApp;
  onRegistro: (d: { nombre: string; whatsapp: string }) => Promise<void>;
  onEntrar: (whatsapp: string) => Promise<void>;
}) {
  const [modo, setModo] = useState<"crear" | "entrar">("crear");
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const c = local.colores;

  async function enviar() {
    if (modo === "crear" && nombre.trim().length < 2) return setError("Poné tu nombre.");
    if (!whatsappPlausible(whatsapp)) return setError("Escribí tu WhatsApp con código de área. Ej: 341 123 4567.");
    if (modo === "crear" && !acepto) return setError("Para crear tu tarjeta tenés que aceptar la política de privacidad.");
    setError(null);
    setCargando(true);
    try {
      if (modo === "crear") await onRegistro({ nombre: nombre.trim(), whatsapp });
      else await onEntrar(whatsapp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={estilos.form} keyboardShouldPersistTaps="handled">
          <View style={[estilos.cabecera, { backgroundColor: c.fondo }]}>
            <Text style={[estilos.cabeceraLocal, { color: c.texto }]}>{local.programa}</Text>
            <Text style={[estilos.cabeceraTitulo, { color: c.texto }]}>
              {modo === "crear" ? "Creá tu tarjeta y sumá tu primer punto" : "Entrá y sumá este punto"}
            </Text>
          </View>

          {modo === "crear" && (
            <>
              <Text style={estilos.etiqueta} nativeID="et-nombre">
                Tu nombre
              </Text>
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Sofi"
                placeholderTextColor={color.tinta3}
                textContentType="givenName"
                autoComplete="name-given"
                maxLength={80}
                accessibilityLabelledBy="et-nombre"
                style={estilos.input}
              />
            </>
          )}
          <Text style={estilos.etiqueta} nativeID="et-whatsapp">
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
            accessibilityLabelledBy="et-whatsapp"
            style={estilos.input}
          />
          <Text style={estilos.ayuda}>
            {modo === "crear" ? "Lo usamos para que recuperes tu tarjeta si cambiás de celular." : "El mismo con el que creaste tu tarjeta."}
          </Text>

          {modo === "crear" && (
            <View style={estilos.consentimiento}>
              <Switch value={acepto} onValueChange={setAcepto} accessibilityLabel="Acepto la política de privacidad" />
              <Text style={estilos.consentimientoTexto}>
                Acepto la{" "}
                <Text style={estilos.link} onPress={() => WebBrowser.openBrowserAsync(URL_PRIVACIDAD)} accessibilityRole="link">
                  política de privacidad
                </Text>
                .
              </Text>
            </View>
          )}

          {error && (
            <Text style={estilos.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          <Boton titulo={modo === "crear" ? "Crear mi tarjeta" : "Entrar"} onPress={enviar} cargando={cargando} style={{ marginTop: 20 }} />

          <Pressable
            onPress={() => {
              setModo(modo === "crear" ? "entrar" : "crear");
              setError(null);
            }}
            style={estilos.cambiar}
            accessibilityRole="button"
          >
            <Text style={estilos.cambiarTexto}>{modo === "crear" ? "Ya tengo tarjeta en otro local: entrar" : "Soy nuevo: crear mi tarjeta"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.fondo, gap: 12 },
  cargando: { fontSize: 16, color: color.tinta2 },
  errorTitulo: { fontSize: 24, fontWeight: "700", color: color.tinta, textAlign: "center", marginTop: 8 },
  errorTexto: { fontSize: 16, color: color.tinta2, textAlign: "center", lineHeight: 22 },
  form: { padding: 20, paddingBottom: 40 },
  cabecera: { borderRadius: radio.grande, padding: 24, marginBottom: 12 },
  cabeceraLocal: { fontSize: 14, fontWeight: "600", opacity: 0.8 },
  cabeceraTitulo: { fontSize: 26, fontWeight: "800", marginTop: 6, letterSpacing: -0.5, lineHeight: 31 },
  etiqueta: { fontSize: 14, fontWeight: "600", color: color.tinta, marginTop: 20, marginBottom: 8 },
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
  ayuda: { fontSize: 13, color: color.tinta2, marginTop: 6 },
  consentimiento: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
  consentimientoTexto: { flex: 1, fontSize: 15, color: color.tinta },
  link: { textDecorationLine: "underline", fontWeight: "600" },
  error: { color: color.error, fontSize: 14, marginTop: 12, lineHeight: 20 },
  cambiar: { alignItems: "center", paddingVertical: 16, marginTop: 4 },
  cambiarTexto: { fontSize: 15, fontWeight: "600", color: color.tinta2, textDecorationLine: "underline" },
});
