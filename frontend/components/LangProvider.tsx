"use client";
import { createContext, useCallback, useContext } from "react";
import { LANG_COOKIE, Lang, translate } from "@/lib/i18n";

const Ctx = createContext<Lang>("fr");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function setLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}

/** Langue courante et fonction de traduction, pour les composants côté navigateur. */
export function useT() {
  const lang = useContext(Ctx);
  const t = useCallback((fr: string, vars?: Record<string, string | number | null | undefined>) => translate(lang, fr, vars), [lang]);
  return { lang, t };
}
