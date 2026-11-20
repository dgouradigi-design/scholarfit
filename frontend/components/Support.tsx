"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "./Icon";

/*
  Dons pour soutenir le site. Les moyens de paiement se règlent dans frontend/.env.local :
    NEXT_PUBLIC_DON_WAVE=+221 77 000 00 00        (numéro Wave)
    NEXT_PUBLIC_DON_ORANGE_MONEY=+221 77 000 00 00 (numéro Orange Money)
    NEXT_PUBLIC_DON_LIEN=https://…                (lien de paiement en ligne : carte, PayPal…)
  Un moyen non renseigné n'est pas affiché.
*/
const METHODS = [
  { id: "wave", name: "Wave", value: process.env.NEXT_PUBLIC_DON_WAVE, kind: "phone" as const },
  { id: "om", name: "Orange Money", value: process.env.NEXT_PUBLIC_DON_ORANGE_MONEY, kind: "phone" as const },
  { id: "lien", name: "Carte bancaire ou PayPal", value: process.env.NEXT_PUBLIC_DON_LIEN, kind: "link" as const },
].filter((m) => m.value);

const AMOUNTS = [1000, 2500, 5000, 10000];
const fmt = (n: number) => `${n.toLocaleString("fr-FR")} F CFA`;

export default function Support({ compact = false }: { compact?: boolean }) {
  const [amount, setAmount] = useState<number | null>(2500);
  const [custom, setCustom] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const value = custom ? Number(custom) : amount;

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-line bg-card ${compact ? "p-6" : "p-6 sm:p-10"}`}>
      <div className="relative grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="eyebrow">Soutenir ScholarFit</p>
          <h2 className="mt-2 text-3xl sm:text-4xl">Garde le site gratuit <span className="accent">pour le suivant.</span></h2>
          <p className="mt-3 max-w-md text-muted">
            Chercher et postuler seul restera toujours gratuit. Les dons paient la vérification des bourses, des stages et des conférences, et l&apos;hébergement du site.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {["Chaque fiche relue et ses liens vérifiés", "De nouvelles sources chaque semaine", "Aucune publicité, aucune revente de données"].map((t) => (
              <li key={t} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{t}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="label">Montant du don</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AMOUNTS.map((a) => (
              <button key={a} type="button" onClick={() => { setAmount(a); setCustom(""); }} aria-pressed={!custom && amount === a}
                className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${!custom && amount === a ? "border-brand bg-brand-soft text-brand" : "border-line bg-card text-ink hover:border-brand/50"}`}>
                {a.toLocaleString("fr-FR")} F
              </button>
            ))}
          </div>
          <input className="input mt-2" type="number" min={100} step={100} inputMode="numeric" placeholder="Autre montant (F CFA)" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Autre montant" />

          <p className="label mt-5">Comment donner</p>
          {METHODS.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">Les dons ouvrent très bientôt. Merci de ta patience, et partage le site autour de toi : c&apos;est déjà une grande aide.</p>
          ) : (
            <ul className="space-y-2">
              {METHODS.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm">
                  <span>
                    <span className="block font-semibold">{m.name}</span>
                    {m.kind === "phone" && <span className="text-muted">Envoie {value ? fmt(value) : "le montant choisi"} au <span className="font-semibold text-ink">{m.value}</span></span>}
                  </span>
                  {m.kind === "phone" ? (
                    <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => { navigator.clipboard?.writeText(String(m.value)); setCopied(m.id); setTimeout(() => setCopied(null), 1800); }}>
                      {copied === m.id ? "Numéro copié" : "Copier le numéro"}
                    </button>
                  ) : (
                    <a href={m.value} target="_blank" rel="noopener noreferrer" className="btn-primary px-4 py-1.5 text-xs">Donner {value ? fmt(value) : ""}</a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {compact && <p className="mt-3 text-xs text-muted"><Link href="/soutenir" className="font-semibold text-brand hover:underline">En savoir plus sur l&apos;utilisation des dons</Link></p>}
        </div>
      </div>
    </div>
  );
}
