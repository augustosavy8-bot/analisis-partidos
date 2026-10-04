import { useCallback, useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Boton } from "@/components/Boton";
import { apiAdmin, guardarSesionAdmin, leerSesionAdmin, type LocalAdmin, type SesionAdmin } from "@/api/admin";
import { ErrorApi } from "@/api/cliente";
import { conChip, hayNfc } from "@/lib/nfc";
import { hexABytes, programarChip, type Paso } from "@/lib/ntag424";
import { color, radio } from "@/lib/tema";

const TEXTO_PASO: Record<Paso, string> = {
  conectando: "Conectando con el chip…",
  escribiendo: "Grabando la dirección…",
  claves: "Cargando las claves…",
  verificando: "Verificando con el servidor…",
  cerrando: "Cerrando el chip…",
  listo: "¡Listo!",
};

type Grabado = { uid: string; local: string; etiqueta: string | null };

/** Sólo superadmin: grabar llaveros NTAG 424 DNA con SUN y darlos de alta en un local. */
export default function Admin() {
  const [sesion, setSesion] = useState<SesionAdmin | null | undefined>(undefined);

  useEffect(() => {
    leerSesionAdmin().then(setSesion);
  }, []);

  const salir = useCallback(async () => {
    await guardarSesionAdmin(null);
    setSesion(null);
  }, []);

  if (sesion === undefined) return null;
  if (!sesion)
    return (
      <IngresoAdmin
        onListo={async (s) => {
          await guardarSesionAdmin(s);
          setSesion(s);
        }}
      />
    );
  return <Grabador sesion={sesion} onVencida={salir} />;
}

function IngresoAdmin({ onListo }: { onListo: (s: SesionAdmin) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setError(null);
    setCargando(true);
    try {
      onListo(await apiAdmin.ingresar(email, password));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={estilos.texto}>Entrá con tu cuenta de administrador de Point (la misma del panel).</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={color.tinta3}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          style={estilos.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor={color.tinta3}
          secureTextEntry
          textContentType="password"
          onSubmitEditing={entrar}
          style={estilos.input}
        />
        {error && <Text style={estilos.error}>{error}</Text>}
        <Boton titulo="Entrar" onPress={entrar} cargando={cargando} disabled={!email || !password} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Grabador({ sesion, onVencida }: { sesion: SesionAdmin; onVencida: () => void }) {
  const [locales, setLocales] = useState<LocalAdmin[] | null>(null);
  const [localId, setLocalId] = useState<string | null>(null);
  const [mozoId, setMozoId] = useState<string | null>(null);
  const [etiqueta, setEtiqueta] = useState("");
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [grabados, setGrabados] = useState<Grabado[]>([]);
  const [conNfc, setConNfc] = useState(true);

  const manejar = useCallback(
    (e: unknown) => {
      if (e instanceof ErrorApi && e.status === 401) {
        Alert.alert("Sesión vencida", "Volvé a entrar con tu cuenta de administrador.");
        onVencida();
        return null;
      }
      return e instanceof Error ? e.message : "Algo salió mal.";
    },
    [onVencida],
  );

  useEffect(() => {
    hayNfc().then(setConNfc);
    apiAdmin
      .locales(sesion.token)
      .then((r) => setLocales(r.locales.filter((l) => l.activo)))
      .catch((e) => setError(manejar(e)));
  }, [sesion.token, manejar]);

  const local = locales?.find((l) => l.id === localId) ?? null;

  async function grabar() {
    if (!local) return;
    setError(null);
    setEstado(null);
    setGrabando(true);
    try {
      const uid = await conChip("Apoyá el llavero arriba del iPhone y no lo muevas hasta que termine.", async (tx, uid, avisar) => {
        if (!/^[0-9A-F]{14}$/.test(uid)) throw new Error("Este chip no es un NTAG 424 DNA.");
        const k = await apiAdmin.claves(sesion.token, uid);
        await programarChip(tx, {
          base: k.base,
          claves: { k0: hexABytes(k.k0), kMeta: hexABytes(k.kMeta), kFile: hexABytes(k.kFile) },
          aleatorio: (n) => Crypto.getRandomBytes(n),
          paso: (p) => {
            avisar(TEXTO_PASO[p]);
            setEstado(TEXTO_PASO[p]);
          },
          verificar: async ({ p, m }) => {
            await apiAdmin.registrar(sesion.token, { uid, p, m, localId: local.id, mozoId, etiqueta: etiqueta.trim() || null });
          },
        });
        return uid;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setGrabados((g) => [{ uid, local: local.nombre, etiqueta: etiqueta.trim() || null }, ...g]);
      setEstado(`Chip ${uid} listo en ${local.nombre}.`);
      setEtiqueta("");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const msg = manejar(e);
      if (msg && !/cancel/i.test(msg)) setError(msg);
      setEstado(null);
    } finally {
      setGrabando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      {!conNfc && <Text style={estilos.error}>Este celular no tiene NFC disponible.</Text>}

      <Text style={estilos.seccion}>1. Local</Text>
      {!locales ? (
        <Text style={estilos.texto}>Cargando locales…</Text>
      ) : (
        <View style={estilos.chips}>
          {locales.map((l) => (
            <Chip
              key={l.id}
              texto={`${l.nombre} · ${l.chips}`}
              activo={l.id === localId}
              onPress={() => {
                setLocalId(l.id);
                setMozoId(null);
              }}
            />
          ))}
        </View>
      )}

      {local && local.equipo.length > 0 && (
        <>
          <Text style={estilos.seccion}>2. ¿De quién es el llavero? (opcional)</Text>
          <View style={estilos.chips}>
            <Chip texto="Del local" activo={mozoId === null} onPress={() => setMozoId(null)} />
            {local.equipo.map((m) => (
              <Chip key={m.id} texto={m.nombre} activo={m.id === mozoId} onPress={() => setMozoId(m.id)} />
            ))}
          </View>
        </>
      )}

      {local && (
        <>
          <Text style={estilos.seccion}>Nombre del llavero (opcional)</Text>
          <TextInput
            value={etiqueta}
            onChangeText={setEtiqueta}
            placeholder="Ej: Caja 1, Barra, Llavero 03"
            placeholderTextColor={color.tinta3}
            maxLength={40}
            style={estilos.input}
          />
          <Boton titulo={grabando ? "Grabando…" : "Grabar llavero"} onPress={grabar} cargando={grabando} disabled={!conNfc} />
          <Text style={estilos.ayuda}>
            Sirve con llaveros NTAG 424 DNA nuevos. Queda con URL cifrada: no se puede copiar ni sumar puntos desde otro lado.
          </Text>
        </>
      )}

      {estado && <Text style={estilos.estado}>{estado}</Text>}
      {error && <Text style={estilos.error}>{error}</Text>}

      {grabados.length > 0 && (
        <View style={estilos.caja}>
          <Text style={estilos.seccion}>Grabados ahora</Text>
          {grabados.map((g) => (
            <View key={g.uid} style={estilos.fila}>
              <Ionicons name="checkmark-circle" size={20} color={color.acentoTexto} />
              <Text style={estilos.filaTexto}>
                {g.etiqueta ?? g.uid} · {g.local}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Pressable onPress={onVencida} style={{ alignSelf: "center", padding: 12 }}>
        <Text style={estilos.salir}>Salir de administrador ({sesion.email})</Text>
      </Pressable>
    </ScrollView>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[estilos.chip, activo && estilos.chipActivo]} accessibilityState={{ selected: activo }}>
      <Text style={[estilos.chipTexto, activo && estilos.chipTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 16, gap: 12, paddingBottom: 48 },
  texto: { fontSize: 15, color: color.tinta2, lineHeight: 21 },
  seccion: { fontSize: 15, fontWeight: "700", color: color.tinta, marginTop: 8 },
  input: {
    backgroundColor: color.blanco,
    borderRadius: radio.chico,
    borderWidth: 1,
    borderColor: color.borde,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: color.tinta,
  },
  error: { color: color.error, fontSize: 14, lineHeight: 20 },
  estado: { color: color.acentoTexto, fontSize: 15, fontWeight: "600", textAlign: "center" },
  ayuda: { fontSize: 13, color: color.tinta3, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde },
  chipActivo: { backgroundColor: color.tinta, borderColor: color.tinta },
  chipTexto: { fontSize: 14, color: color.tinta },
  chipTextoActivo: { color: color.blanco, fontWeight: "600" },
  caja: { backgroundColor: color.blanco, borderRadius: radio.tarjeta, padding: 16, gap: 8, marginTop: 8 },
  fila: { flexDirection: "row", alignItems: "center", gap: 8 },
  filaTexto: { fontSize: 14, color: color.tinta, flex: 1 },
  salir: { fontSize: 13, color: color.tinta3, textDecorationLine: "underline" },
});
