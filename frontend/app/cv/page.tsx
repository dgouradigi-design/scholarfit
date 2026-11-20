"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Icon from "@/components/Icon";
import { ScoreRing } from "@/components/ScholarshipCard";
import { Profile, Scholarship, api } from "@/lib/api";

type Review = {
  score: number;
  scores: Record<string, number>;
  sections: Record<string, string>;
  issues: { category: string; message: string }[];
  rewrites: { original: string; proposal: string; why: string }[];
  format_tips: string[];
  ai_used: boolean;
};

const FORMATS: Record<string, string> = {
  francais: "CV français",
  europass: "Europass (Europe)",
  us_resume: "Résumé américain (1 page)",
  lebenslauf: "Lebenslauf (Allemagne)",
  academique: "CV académique (doctorat)",
};
const SCORE_LABELS: Record<string, string> = {
  structure: "Structure", verbes_action: "Verbes d'action", resultats_chiffres: "Résultats chiffrés",
  longueur: "Longueur", dates: "Dates", clarte: "Clarté", orthographe: "Orthographe",
};


const TEMPLATES: Record<string, { name: string; desc: string; layout: "classic" | "sidebar" | "dense" | "photo" | "long" }> = {
  francais: { name: "CV français", desc: "Clair et sobre, 1 à 2 pages, photo facultative.", layout: "classic" },
  europass: { name: "Europass", desc: "Le standard européen, colonne de compétences.", layout: "sidebar" },
  us_resume: { name: "Résumé américain", desc: "Une page, résultats chiffrés, sans photo.", layout: "dense" },
  lebenslauf: { name: "Lebenslauf", desc: "Tableau chronologique et photo, pour l'Allemagne.", layout: "photo" },
  academique: { name: "CV académique", desc: "Recherche, publications et conférences.", layout: "long" },
};

function Lines({ n, w = ["100%", "92%", "80%"] }: { n: number; w?: string[] }) {
  return <>{Array.from({ length: n }, (_, i) => <span key={i} className="block h-[3px] rounded-full bg-[#d9dbe6]" style={{ width: w[i % w.length] }} />)}</>;
}

function MiniCV({ layout }: { layout: string }) {
  const title = <span className="block h-[5px] w-2/5 rounded-full bg-brand" />;
  const section = (n: number) => <span className="block space-y-[3px]"><span className="block h-[4px] w-1/4 rounded-full bg-gold" /><Lines n={n} /></span>;
  return (
    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-white p-3 shadow-[0_8px_24px_-12px_rgba(18,20,43,0.35)] ring-1 ring-line">
      {layout === "sidebar" ? (
        <div className="flex h-full gap-2">
          <div className="w-1/3 space-y-2 rounded bg-brand p-1.5">
            <span className="mx-auto block h-6 w-6 rounded-full bg-white/70" />
            <span className="block space-y-[3px]">{[1, 2, 3, 4].map((i) => <span key={i} className="block h-[3px] rounded-full bg-white/50" />)}</span>
          </div>
          <div className="flex-1 space-y-2">{title}{section(4)}{section(3)}{section(3)}</div>
        </div>
      ) : layout === "photo" ? (
        <div className="space-y-2">
          <div className="flex items-start justify-between"><span className="block w-1/2 space-y-1">{title}<Lines n={2} /></span><span className="block h-9 w-7 rounded bg-[#d9dbe6]" /></div>
          {[0, 1, 2].map((i) => <span key={i} className="flex gap-2"><span className="block h-[3px] w-1/5 rounded-full bg-gold" /><span className="block flex-1 space-y-[3px]"><Lines n={2} /></span></span>)}
          {section(3)}
        </div>
      ) : layout === "dense" ? (
        <div className="space-y-1.5 text-center">
          <span className="mx-auto block h-[5px] w-1/2 rounded-full bg-brand" />
          <span className="mx-auto block h-[3px] w-3/4 rounded-full bg-[#d9dbe6]" />
          <div className="space-y-1.5 text-left">{section(5)}{section(5)}{section(3)}</div>
        </div>
      ) : layout === "long" ? (
        <div className="space-y-2">{title}{section(3)}{section(4)}{section(4)}{section(2)}</div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2"><span className="block h-7 w-7 rounded-full bg-[#d9dbe6]" /><span className="block flex-1 space-y-1">{title}<Lines n={1} /></span></div>
          {section(3)}{section(3)}{section(2)}
        </div>
      )}
    </div>
  );
}

function TemplateGallery({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Object.entries(TEMPLATES).map(([k, t]) => {
        const on = value === k;
        return (
          <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={on}
            className={`group rounded-2xl border bg-card p-3 text-left transition ${on ? "border-brand ring-2 ring-brand/25" : "border-line hover:border-brand/50"}`}>
            <MiniCV layout={t.layout} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{t.name}</span>
              <span className={`grid h-4 w-4 place-items-center rounded-full border ${on ? "border-mint bg-mint text-[#04140e]" : "border-line"}`}>{on && <Icon name="check" className="h-2.5 w-2.5" />}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">{t.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

function CVTool() {
  const params = useSearchParams();
  const bourseId = params.get("bourse");
  const [text, setText] = useState("");
  const [format, setFormat] = useState("francais");
  const [bourse, setBourse] = useState<Scholarship | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Profile>("/api/profile").then((p) => { if (p.cv_text) setText((t) => t || p.cv_text || ""); }).catch(() => null);
    if (bourseId) api<Scholarship>(`/api/scholarships/${bourseId}`).then(setBourse).catch(() => {});
  }, [bourseId]);

  async function analyse() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      setReview(await api<Review>("/api/cv/review", { method: "POST", body: JSON.stringify({ text, target_format: format, scholarship_id: bourse?.id ?? null }) }));
      setAccepted({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function applyAccepted(): string {
    let out = text;
    review?.rewrites.forEach((r, i) => { if (accepted[i]) out = out.replace(r.original, r.proposal); });
    return out;
  }

  async function saveVersion() {
    const improved = applyAccepted();
    await api("/api/cv/save", { method: "POST", body: JSON.stringify({ text: improved, target_format: format }) });
    setText(improved);
    setMsg("Nouvelle version enregistrée dans ton profil. Pense à compléter les [crochets] avec des faits réels.");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Modèles et diagnostic</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Un CV au format <span className="accent">du pays visé.</span></h1>
        <p className="mt-1 text-muted">Colle ton CV ci-dessous. Le diagnostic propose des réécritures ligne par ligne : tu acceptes ou refuses chacune. Rien n&apos;est inventé ; les chiffres manquants sont laissés entre [crochets].</p>
        {bourse && <p className="mt-2 text-sm text-brand">Version adaptée à : <strong>{bourse.title}</strong></p>}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg">1. Choisis ton modèle</h2>
        <TemplateGallery value={format} onChange={setFormat} />
      </section>
      <h2 className="text-lg">2. Colle ton CV et lance le diagnostic</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3 p-5">
          <p className="text-sm text-muted">Modèle choisi : <span className="font-semibold text-ink">{FORMATS[format]}</span></p>
          <textarea className="input font-[ui-monospace,Menlo,Consolas,monospace] text-xs" rows={22} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Prénom Nom\nFORMATION\n2022-2025 Licence…\nEXPÉRIENCES\n…\nCOMPÉTENCES\n…\nLANGUES\n…"} />
          <button className="btn-primary" disabled={busy || text.trim().length < 30} onClick={analyse}>{busy ? "Analyse…" : "Analyser mon CV"}</button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <div className="space-y-4">
          {!review ? (
            <div className="card grid min-h-[260px] place-items-center p-8 text-center text-muted"><div><Icon name="sparkle" className="mx-auto mb-3 h-7 w-7 text-brand" /><p className="font-serif text-xl text-ink">Le diagnostic apparaîtra ici</p><p className="mt-1 text-sm">Score, points à corriger et réécritures ligne par ligne.</p></div></div>
          ) : (
            <>
              <div className="card overflow-hidden p-5">
                <div className="-m-5 mb-4 flex items-center gap-4 rounded-t-2xl bg-night p-5 text-white">
                  <ScoreRing value={review.score} color={review.score >= 70 ? "#3ee0a8" : "#ffb547"} size={68} />
                  <div>
                    <p className="eyebrow">Diagnostic</p>
                    <p className="font-serif text-xl">{review.score >= 70 ? "Ton CV tient la route" : review.score >= 50 ? "Quelques points à renforcer" : "À retravailler"}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(review.scores).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between"><span className="text-muted">{SCORE_LABELS[k] ?? k}</span><span>{v}</span></div>
                      <div className="h-1.5 rounded-full bg-paper"><div className={`h-full rounded-full ${v >= 70 ? "bg-ok" : "bg-gold"}`} style={{ width: `${v}%` }} /></div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">{review.ai_used ? "Analyse réalisée par l'IA." : "Analyse par règles (mode hors-ligne : ajoute une clé API pour une analyse IA complète, orthographe comprise)."}</p>
              </div>
              {review.issues.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-bold">À corriger</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{review.issues.map((i, n) => <li key={n}>{i.message}</li>)}</ul>
                </div>
              )}
              {review.rewrites.length > 0 && (
                <div className="card space-y-3 p-5">
                  <h3 className="font-bold">Réécritures proposées</h3>
                  {review.rewrites.map((r, i) => (
                    <div key={i} className="rounded-lg border border-line p-3 text-sm">
                      <p className="text-muted line-through">{r.original}</p>
                      <p className="mt-1 font-medium">{r.proposal}</p>
                      <p className="mt-1 text-xs text-muted">{r.why}</p>
                      <div className="mt-2 flex gap-2">
                        <button className={`btn px-2 py-1 text-xs ${accepted[i] ? "bg-mint text-[#04140e]" : "btn-ghost"}`} onClick={() => setAccepted({ ...accepted, [i]: true })}>Accepter</button>
                        <button className={`btn px-2 py-1 text-xs ${accepted[i] === false ? "bg-ink text-paper" : "btn-ghost"}`} onClick={() => setAccepted({ ...accepted, [i]: false })}>Refuser</button>
                      </div>
                    </div>
                  ))}
                  <button className="btn-primary" onClick={saveVersion}>Enregistrer la version avec mes choix</button>
                </div>
              )}
              <div className="card p-5">
                <h3 className="font-bold">Conseils pour le format « {FORMATS[format]} »</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{review.format_tips.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
              {msg && <p className="text-sm text-brand">{msg}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <RequireAuth><Suspense><CVTool /></Suspense></RequireAuth>;
}
