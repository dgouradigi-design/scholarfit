import { cookies } from "next/headers";
import { LANG_COOKIE, Lang, translate } from "./i18n";

export async function getLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "fr";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: (fr: string, vars?: Record<string, string | number | null | undefined>) => translate(lang, fr, vars) };
}
