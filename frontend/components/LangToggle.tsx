"use client";
import { setLang, useT } from "./LangProvider";

export default function LangToggle({ className = "" }: { className?: string }) {
  const { lang, t } = useT();
  return (
    <div role="group" aria-label={t("Langue")} className={`flex h-9 items-center rounded-full border border-line bg-card p-0.5 text-xs font-semibold ${className}`}>
      {(["fr", "en"] as const).map((l) => (
        <button key={l} type="button" onClick={() => l !== lang && setLang(l)} aria-pressed={lang === l} lang={l}
          className={`h-full rounded-full px-2.5 uppercase transition ${lang === l ? "bg-brand-soft text-brand" : "text-muted hover:text-ink"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}
