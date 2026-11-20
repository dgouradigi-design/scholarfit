"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CountryStat, api, getCountryStats } from "@/lib/api";
import { REGIONS, regionOf } from "@/lib/geo";
import Icon from "./Icon";
import WorldGlobe from "./WorldGlobe";

function useCountryStats() {
  const [rows, setRows] = useState<CountryStat[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { getCountryStats().then(setRows).catch(() => setFailed(true)); }, []);
  return { rows, failed };
}

export function HeroGlobe() {
  const { rows } = useCountryStats();
  return (
    <div className="relative aspect-square w-full">
      <WorldGlobe markers={(rows ?? []).map((r) => ({ code: r.code, name: r.name, count: r.count }))} />
      <div className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1 whitespace-nowrap rounded-full border border-line bg-card/80 px-4 py-1.5 text-[11px] text-muted backdrop-blur">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ffb547] shadow-[0_0_0_3px_rgba(255,181,71,0.25)] animate-pulse-dot" />Pays avec des bourses</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 bg-[#c4c8e0]/70" />Pas encore de bourse</span>
        <span className="hidden sm:inline">Plus le point est gros, plus il y a de bourses · fais tourner le globe</span>
      </div>
    </div>
  );
}

/** Carrousel des pays d'études avec le nombre réel de bourses (cliquable vers la liste filtrée). */
export function CountryCarousel() {
  const { rows, failed } = useCountryStats();
  if (failed) return <p className="py-6 text-center text-sm text-muted">Les pays s&apos;afficheront dès que l&apos;API sera joignable.</p>;
  if (!rows) return <div className="h-[118px]" />;
  const max = Math.max(1, ...rows.map((r) => r.count));
  const card = (r: CountryStat, k: string) => {
    const region = r.region ?? regionOf(r.code);
    return (
      <Link key={k} href={`/bourses?country=${r.code}`}
        className="group flex w-56 shrink-0 flex-col justify-between rounded-2xl border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:border-brand/50">
        <span className="flex items-start justify-between gap-2">
          <span>
            <span className="block font-semibold">{r.name}</span>
            <span className="text-[11px] text-muted">{region ? REGIONS[region]?.label : "International"}</span>
          </span>
          <Icon name="arrow" className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
        </span>
        <span className="mt-3 flex items-end gap-2">
          <span className="font-serif text-3xl font-semibold leading-none">{r.count}</span>
          <span className="pb-0.5 text-xs text-muted">bourse{r.count > 1 ? "s" : ""}</span>
        </span>
        <span className="mt-3 block h-1 overflow-hidden rounded-full bg-surface"><span className="block h-full rounded-full bg-gradient-to-r from-mint to-gold" style={{ width: `${(100 * r.count) / max}%` }} /></span>
      </Link>
    );
  };
  return (
    <div className="pause-on-hover relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
      <div className="flex w-max animate-marquee gap-3 py-2">{rows.map((r) => card(r, `a${r.code}`))}{rows.map((r) => card(r, `b${r.code}`))}</div>
    </div>
  );
}

type Stats = { total: number; open: number; closing_soon: number; countries: number; multi_country?: number; by_kind?: Record<string, number> };

export function LiveStats() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    api<Stats>("/api/stats").then(setS).catch(async () => {
      try {
        const page = await api<{ total: number; items: { study_countries: string[]; deadline: string | null }[] }>("/api/scholarships?per_page=100");
        const soon = page.items.filter((x) => x.deadline && (new Date(x.deadline).getTime() - Date.now()) / 86400000 <= 45).length;
        setS({ total: page.total, open: page.total, closing_soon: soon, countries: new Set(page.items.flatMap((x) => x.study_countries)).size });
      } catch { /* l'API n'est pas lancée */ }
    });
  }, []);
  const v = (n: number | undefined) => (s ? String(n ?? 0) : "…");
  const items = [
    { value: v(s?.by_kind?.bourse ?? s?.open), label: "bourses ouvertes" },
    { value: v((s?.by_kind?.stage ?? 0) + (s?.by_kind?.conference ?? 0)), label: "stages et conférences" },
    { value: v(s?.closing_soon), label: "ferment dans moins de 45 jours" },
    { value: v(s?.countries), label: "pays" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="border-l border-line pl-4">
          <dt className="sr-only">{i.label}</dt>
          <dd className="font-serif text-3xl font-semibold sm:text-4xl">{i.value}</dd>
          <dd className="mt-1 text-xs text-muted">{i.label}</dd>
        </div>
      ))}
    </dl>
  );
}
