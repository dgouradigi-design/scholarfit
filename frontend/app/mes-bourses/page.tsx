"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Icon from "@/components/Icon";
import ScholarshipCard from "@/components/ScholarshipCard";
import { AlertItem, Match, Meta, api, getMeta } from "@/lib/api";

type MatchesOut = { minimum_ok: boolean; missing_minimum: string[]; excluded_count: number; items: Match[] };

function Matches() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [data, setData] = useState<MatchesOut | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chance, setChance] = useState("");

  useEffect(() => {
    getMeta().then(setMeta);
    api<MatchesOut>("/api/matches").then(setData).catch((e) => setError(e.message));
    api<AlertItem[]>("/api/alerts").then(setAlerts).catch(() => {});
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-muted">Calcul de tes bourses…</p>;
  if (!data.minimum_ok)
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="font-serif text-2xl">Complète d&apos;abord ton profil minimum</p>
        <p className="mt-2 text-sm text-muted">Il manque : {data.missing_minimum.join(", ")}. Sans ces informations, on ne peut pas exclure les bourses auxquelles tu n&apos;as pas droit.</p>
        <Link href="/profil" className="btn-primary mt-4">Compléter mon profil</Link>
      </div>
    );

  const unread = alerts.filter((a) => !a.read);
  const items = chance ? data.items.filter((m) => m.chance === chance) : data.items;
  const count = (c: string) => data.items.filter((m) => m.chance === c).length;
  const tabs: [string, string, number][] = [["", "Recommandées", data.items.length], ["bonne", "Bonne chance", count("bonne")], ["moyenne", "Moyenne", count("moyenne")], ["faible", "Faible", count("faible")]];
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <div>
          <h1 className="text-3xl">Mes bourses</h1>
          <p className="mt-1 text-muted">{data.items.length} bourse(s) ouverte(s) pour toi, triées par pertinence et urgence. {data.excluded_count} exclue(s) car tu n&apos;y as pas droit.</p>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map(([k, label, n]) => (
            <button key={k} onClick={() => setChance(k)}
              className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${chance === k ? "border-brand font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}>
              {label}<span className={`rounded-full px-1.5 text-[11px] ${chance === k ? "bg-mint text-[#04140e]" : "bg-surface text-muted"}`}>{n}</span>
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {items.map((m) => <ScholarshipCard key={m.scholarship.id} s={m.scholarship} match={m} meta={meta} loggedIn />)}
          {items.length === 0 && <p className="card p-6 text-center text-sm text-muted">Aucune bourse dans cette catégorie.</p>}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><Icon name="bolt" className="h-4 w-4 text-gold" />Alertes</p>
          {unread.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Rien de nouveau. On te prévient dès qu&apos;une bourse correspond ou qu&apos;une date limite approche.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {unread.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 border-l-2 border-gold pl-3">
                  <span>{a.message}</span>
                  <button className="text-xs text-muted hover:underline" onClick={async () => { await api(`/api/alerts/${a.id}/read`, { method: "POST" }); setAlerts(alerts.map((x) => x.id === a.id ? { ...x, read: true } : x)); }}>OK</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5 text-sm">
          <p className="font-semibold">Comment lire le score</p>
          <p className="mt-2 text-muted">Le score est une estimation selon l&apos;écart entre ton profil et les critères, jamais une promesse : les jurys décident sur des éléments que la plateforme ne voit pas.</p>
          <Link href="/profil" className="mt-3 inline-flex items-center gap-1 font-semibold text-brand hover:underline">Améliorer mon profil <Icon name="arrow" className="h-3.5 w-3.5" /></Link>
        </div>
      </aside>
    </div>
  );
}

export default function Page() {
  return <RequireAuth><Matches /></RequireAuth>;
}
