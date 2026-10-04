/**
 * Modo nocturno: <html data-tema="oscuro">. La preferencia vive en este navegador
 * (localStorage). El script corre en el <head> antes de pintar, así no hay
 * parpadeo claro → oscuro al cargar.
 */
export const CLAVE_TEMA = "pt-tema";

/** Pinta la barra del navegador con el fondo actual (claro u oscuro). */
const SINCRONIZAR_BARRA = `function(){var c=getComputedStyle(document.documentElement).getPropertyValue("--color-pt-bg").trim();if(c)document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}`;

export const SCRIPT_TEMA = `(function(){try{if(localStorage.getItem("${CLAVE_TEMA}")==="oscuro"){document.documentElement.dataset.tema="oscuro";document.addEventListener("DOMContentLoaded",${SINCRONIZAR_BARRA})}}catch(e){}})();`;

export function aplicarTema(oscuro: boolean) {
  const raiz = document.documentElement;
  if (oscuro) raiz.dataset.tema = "oscuro";
  else delete raiz.dataset.tema;
  try {
    if (oscuro) localStorage.setItem(CLAVE_TEMA, "oscuro");
    else localStorage.removeItem(CLAVE_TEMA);
  } catch {}
  const fondo = getComputedStyle(raiz).getPropertyValue("--color-pt-bg").trim();
  if (fondo) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", fondo));
}
