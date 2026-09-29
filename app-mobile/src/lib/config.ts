import Constants from "expo-constants";

/** Servidor de Point (app.json → extra.apiUrl). */
export const API_URL: string = (Constants.expoConfig?.extra?.apiUrl as string | undefined)?.replace(/\/$/, "") ?? "https://fidelizacion-beta.vercel.app";
export const URL_PRIVACIDAD = `${API_URL}/privacidad`;
