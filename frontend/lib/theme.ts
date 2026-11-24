export const THEME_KEY = "bm_theme";

// Lu avant l'affichage (voir app/layout.tsx) pour éviter un flash de mauvais thème. Sombre par défaut.
export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
