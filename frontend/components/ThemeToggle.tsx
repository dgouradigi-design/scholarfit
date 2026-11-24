"use client";
import { useT } from "@/components/LangProvider";
import { useEffect, useState } from "react";
import { THEME_KEY } from "@/lib/theme";
import Icon from "./Icon";


export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useT();
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.dataset.theme === "light"), []);
  function toggle() {
    const next = !light;
    setLight(next);
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem(THEME_KEY, next ? "light" : "dark"); } catch { /* navigation privée */ }
  }
  return (
    <button type="button" onClick={toggle} title={t(light ? "Passer en mode sombre" : "Passer en mode clair")} aria-label={t(light ? "Passer en mode sombre" : "Passer en mode clair")}
      className={`grid h-9 w-9 place-items-center rounded-full border border-line bg-card text-muted transition hover:text-ink ${className}`}>
      <Icon name={light ? "moon" : "sun"} className="h-4 w-4" />
    </button>
  );
}
