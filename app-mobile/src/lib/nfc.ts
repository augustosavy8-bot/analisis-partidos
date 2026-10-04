import { Platform } from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";
import type { Transceptor } from "./ntag424";

/** ¿Este celular tiene NFC? (En el simulador o sin la capacidad, false.) */
export async function hayNfc(): Promise<boolean> {
  try {
    return await NfcManager.isSupported();
  } catch {
    return false;
  }
}

/**
 * Abre la sesión NFC (en iPhone, la hoja "Listo para escanear"), espera un chip ISO 14443-4
 * (NTAG 424 DNA) y le pasa a `trabajo` un transceptor de APDUs y el UID.
 */
export async function conChip<T>(
  mensaje: string,
  trabajo: (tx: Transceptor, uid: string, avisar: (texto: string) => void) => Promise<T>,
): Promise<T> {
  await NfcManager.start();
  const avisar = (texto: string) => {
    if (Platform.OS === "ios") NfcManager.setAlertMessageIOS(texto).catch(() => {});
  };
  try {
    await NfcManager.requestTechnology(NfcTech.IsoDep, { alertMessage: mensaje });
    const tag = await NfcManager.getTag();
    const uid = (tag?.id ?? "").replace(/[^0-9a-f]/gi, "").toUpperCase();
    const tx: Transceptor = async (apdu) => {
      if (Platform.OS === "ios") {
        const r = await NfcManager.sendCommandAPDUIOS(Array.from(apdu));
        return Uint8Array.from([...r.response, r.sw1, r.sw2]);
      }
      return Uint8Array.from(await NfcManager.isoDepHandler.transceive(Array.from(apdu)));
    };
    const resultado = await trabajo(tx, uid, avisar);
    avisar("¡Listo!");
    return resultado;
  } catch (e) {
    if (Platform.OS === "ios") await NfcManager.invalidateSessionWithErrorIOS(e instanceof Error ? e.message : "No se pudo").catch(() => {});
    throw e;
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}
