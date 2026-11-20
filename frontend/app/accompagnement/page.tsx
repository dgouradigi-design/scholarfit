"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Offers from "@/components/Offers";
import CoachingWorkspace from "@/components/CoachingWorkspace";
import Icon from "@/components/Icon";
import RequireAuth from "@/components/RequireAuth";
import { Application, Coaching, CoachingDetail, CoachingMeta, DEFAULT_OFFERS, Offer, Scholarship, api, formatDate, getCoachingMeta, getOffers } from "@/lib/api";

const NEEDS_CARDS = [
  { icon: "search", t: "Choisir mes bourses", d: "On part de ton profil et de ton calendrier pour garder les bourses qui valent ton temps.", needs: ["choix_bourses"] },
  { icon: "file", t: "Faire relire mon dossier", d: "CV, lettre, recommandations : un retour précis avant d'envoyer.", needs: ["cv", "lettre", "recommandations"] },
  { icon: "chat", t: "Préparer l'entretien", d: "Une simulation avec quelqu'un qui connaît ce type de jury.", needs: ["entretien"] },
  { icon: "globe", t: "Après l'admission", d: "Test de langue, visa et installation dans le pays.", needs: ["langue", "visa"] },
];

const HOW = [
  { t: "Tu fais ta demande", d: "Ton objectif, ce sur quoi tu veux de l'aide et les bourses visées." },
  { t: "Un conseiller t'est attribué", d: "Ancien boursier ou conseiller d'orientation, choisi selon ta langue, ton niveau et tes pays." },
  { t: "Un plan daté", d: "Les étapes sont calées à rebours sur tes dates limites, avec un rappel la veille." },
  { t: "Messages et rendez-vous", d: "Pose tes questions, fais relire ton CV et ta lettre, prépare l'entretien." },
];

function RequestForm({ cm, onDone, initialNeeds = [], onCancel, initialOffer = "standard", scholarshipId }: { cm: CoachingMeta; onDone: () => Promise<void>; initialNeeds?: string[]; onCancel?: () => void; initialOffer?: string; scholarshipId?: number }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [goal, setGoal] = useState("");
  const [offers, setOffers] = useState<Offer[]>(DEFAULT_OFFERS);
  const [offer, setOffer] = useState(initialOffer === "premium" ? "premium" : "standard");
  useEffect(() => { getOffers().then(setOffers); }, []);
  const maxApps = offer === "premium" ? 5 : 2;
  useEffect(() => { setIds((l) => l.slice(0, offer === "premium" ? 5 : 2)); }, [offer]);
  useEffect(() => {
    if (!scholarshipId) return;
    api<Scholarship>(`/api/scholarships/${scholarshipId}`)
      .then((s) => setGoal((g) => g || `Être accompagné pour candidater à « ${s.title} » (${s.organization}).`))
      .catch(() => {});
  }, [scholarshipId]);
  const [needs, setNeeds] = useState<string[]>(initialNeeds);
  const [ids, setIds] = useState<number[]>([]);
  const [lang, setLang] = useState("fr");
  const [availability, setAvailability] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<Application[]>("/api/applications").then(setApps).catch(() => {}); }, []);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api("/api/accompagnement", {
        method: "POST",
        body: JSON.stringify({ offer, goal, needs, application_ids: ids, preferred_language: lang, availability: availability || null, share_consent: consent }),
      });
      await onDone();
    } catch (e2) { setErr((e2 as Error).message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-3xl space-y-5 p-5 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Accompagnement personnalisé</p>
          <h2 className="mt-1 text-2xl">Demander un accompagnement</h2>
        </div>
        {onCancel && <button type="button" className="text-sm text-muted hover:text-ink" onClick={onCancel}>← Retour</button>}
      </div>
      <fieldset>
        <legend className="label">Ta formule</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {offers.filter((o) => o.code !== "autonome").map((o) => (
            <label key={o.code} className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition ${offer === o.code ? "border-brand bg-brand-soft/40" : "border-line bg-surface hover:border-brand/50"}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold"><input type="radio" name="offer" value={o.code} checked={offer === o.code} onChange={() => setOffer(o.code)} className="accent-[#3ee0a8]" />{o.name}</span>
                <span className="font-serif text-lg font-semibold">{o.price_label}</span>
              </span>
              <span className="mt-1 text-xs text-muted">{o.description}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Le paiement se règle avec ton conseiller une fois ta demande acceptée. Tu peux toujours postuler toi-même gratuitement.</p>
      </fieldset>
      <div>
        <label className="label" htmlFor="goal">Ton objectif</label>
        <textarea id="goal" className="input" rows={3} required minLength={10} value={goal} onChange={(e) => setGoal(e.target.value)}
          placeholder="ex. Obtenir une bourse pour un master en IA en France ou au Canada pour la rentrée prochaine." />
      </div>
      <fieldset>
        <legend className="label">Sur quoi veux-tu de l&apos;aide ?</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(cm.needs).map(([k, v]) => (
            <button type="button" key={k} onClick={() => setNeeds(toggle(needs, k))} aria-pressed={needs.includes(k)}
              className={`rounded-full border px-3 py-1.5 text-sm ${needs.includes(k) ? "border-brand bg-brand-soft font-semibold text-ink" : "border-line bg-card text-muted hover:border-brand/60"}`}>
              {v}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Bourses concernées · {offer === "premium" ? "jusqu'à 5" : "jusqu'à 2"} avec la formule {offer === "premium" ? "Premium" : "Standard"}</legend>
        {apps.length === 0 ? (
          <p className="text-sm text-muted">Tu n&apos;as pas encore de bourse dans ton suivi. Ce n&apos;est pas grave : ton conseiller t&apos;aidera à les choisir.</p>
        ) : (
          <div className="space-y-1">
            {apps.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ids.includes(a.id)} disabled={!ids.includes(a.id) && ids.length >= maxApps} onChange={() => setIds(toggle(ids, a.id))} />
                {a.scholarship.title} <span className="text-muted">· {formatDate(a.scholarship.deadline)}</span>
              </label>
            ))}
            <p className="text-xs text-muted">Si tu n&apos;en coches aucune, ton conseiller voit tout ton suivi.</p>
          </div>
        )}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="lang">Langue de l&apos;accompagnement</label>
          <select id="lang" className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
            <option value="ar">Arabe</option>
            <option value="pt">Portugais</option>
            <option value="es">Espagnol</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="dispo">Tes disponibilités</label>
          <input id="dispo" className="input" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="ex. soirs en semaine, samedi matin" />
        </div>
      </div>
      <label className="flex items-start gap-2 rounded-lg bg-paper p-3 text-sm">
        <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>J&apos;accepte que mon conseiller voie mon profil, mon CV et mes candidatures pour m&apos;aider. Je peux arrêter l&apos;accompagnement à tout moment.</span>
      </label>
      {err && <p className="text-sm text-danger">{err}</p>}
      <button className="btn-primary w-full sm:w-auto" disabled={busy || !consent}>{busy ? "Envoi…" : "Envoyer ma demande"}</button>
    </form>
  );
}

function Feedback({ c, onDone }: { c: Coaching; onDone: () => void }) {
  const [rating, setRating] = useState(c.rating ?? 0);
  const [text, setText] = useState(c.feedback ?? "");
  if (c.rating) return <p className="card p-4 text-sm">Merci pour ton avis : {"★".repeat(c.rating)}{"☆".repeat(5 - c.rating)}</p>;
  return (
    <div className="card space-y-3 p-5">
      <h3 className="text-lg">Comment s&apos;est passé ton accompagnement ?</h3>
      <div className="flex gap-1" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)}
            className={`text-2xl ${n <= rating ? "text-warm" : "text-line"}`} aria-label={`${n} sur 5`}>★</button>
        ))}
      </div>
      <textarea className="input" rows={2} placeholder="Un mot pour ton conseiller (facultatif)" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn-primary" disabled={!rating} onClick={async () => {
        await api(`/api/accompagnement/${c.id}/avis`, { method: "POST", body: JSON.stringify({ rating, feedback: text || null }) });
        onDone();
      }}>Envoyer mon avis</button>
    </div>
  );
}

function Page() {
  const [cm, setCm] = useState<CoachingMeta | null>(null);
  const [list, setList] = useState<Coaching[] | null>(null);
  const params = useSearchParams();
  const offreParam = params.get("offre") ?? undefined;
  const bourseParam = Number(params.get("bourse")) || undefined;
  const [asking, setAsking] = useState(Boolean(offreParam && offreParam !== "autonome"));
  const [preset, setPreset] = useState<string[]>(bourseParam ? ["cv", "lettre"] : []);
  useEffect(() => { if (offreParam && offreParam !== "autonome") { setAsking(true); window.scrollTo({ top: 0 }); } }, [offreParam]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () => api<Coaching[]>("/api/accompagnement").then(setList).catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => { getCoachingMeta().then(setCm).catch((e) => setError(e.message)); load(); }, [load]);
  const onChange = useCallback((d: CoachingDetail) => {
    setList((l) => l?.map((x) => (x.id === d.id ? { ...x, status: d.status, rating: d.rating, unread: 0 } : x)) ?? l);
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!list || !cm) return <p className="text-muted">Chargement…</p>;

  const current = list.find((c) => c.status === "demande" || c.status === "en_cours");
  const last = list[0];
  const past = list.filter((c) => c !== current);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl">Accompagnement</h1>
        <p className="mt-1 max-w-2xl text-muted">Un conseiller te suit de la sélection des bourses jusqu&apos;à l&apos;entretien. Deux formules, ou tu postules toi-même gratuitement.</p>
      </div>

      {current ? (
        <>
          {current.status === "demande" && (
            <div className="card flex flex-wrap items-center justify-between gap-3 border-warm/40 bg-warm-soft p-4 text-sm">
              <p>Ta demande est bien reçue. Un conseiller va t&apos;être attribué ; tu recevras une alerte.</p>
              <button className="btn-ghost px-3 py-1 text-xs" onClick={async () => {
                if (!confirm("Annuler ta demande d'accompagnement ?")) return;
                await api(`/api/accompagnement/${current.id}/annuler`, { method: "POST" }); load();
              }}>Annuler la demande</button>
            </div>
          )}
          <CoachingWorkspace id={current.id} onChange={onChange} />
          {current.status === "en_cours" && (
            <button className="text-sm text-muted hover:text-danger hover:underline" onClick={async () => {
              if (!confirm("Arrêter ton accompagnement ? Ton conseiller sera prévenu.")) return;
              await api(`/api/accompagnement/${current.id}/annuler`, { method: "POST" }); load();
            }}>Arrêter l&apos;accompagnement</button>
          )}
        </>
      ) : (
        <>
          {last?.status === "termine" && <Feedback c={last} onDone={load} />}
          {!asking ? (
            <section className="space-y-8">
              <div className="card relative overflow-hidden p-6 sm:p-10">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-mint/15 blur-3xl" />
                <div className="relative grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
                  <div>
                    <p className="eyebrow">Conseiller humain · dès 15 000 F CFA</p>
                    <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">Quelqu&apos;un qui suit ton dossier <span className="accent">jusqu&apos;au bout.</span></h2>
                    <p className="mt-3 text-sm text-muted">Un ancien boursier ou un conseiller d&apos;orientation, choisi selon ta langue, ton niveau et tes pays. Tu arrêtes quand tu veux.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {NEEDS_CARDS.map((n) => (
                      <button key={n.t} onClick={() => { setPreset(n.needs); setAsking(true); }}
                        className="group flex gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand/50">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon name={n.icon} className="h-5 w-5" /></span>
                        <span>
                          <span className="flex items-center gap-1 font-semibold">{n.t}<Icon name="arrow" className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" /></span>
                          <span className="mt-0.5 block text-xs text-muted">{n.d}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="eyebrow">Comment ça se passe</p>
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {HOW.map((h, i) => (
                    <div key={h.t}>
                      <div className="grid h-9 w-9 place-items-center rounded-full border border-line bg-card font-mono text-xs text-brand">0{i + 1}</div>
                      <p className="mt-2 font-semibold">{h.t}</p>
                      <p className="mt-1 text-sm text-muted">{h.d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow">Tarifs</p>
                <h2 className="mt-2 text-2xl">Choisis ta formule</h2>
                <div className="mt-5"><Offers scholarshipId={bourseParam} compact /></div>
              </div>
            </section>
          ) : (
            <RequestForm cm={cm} initialNeeds={preset} initialOffer={offreParam} scholarshipId={bourseParam} onCancel={() => setAsking(false)} onDone={async () => { await load(); setAsking(false); }} />
          )}
        </>
      )}

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl">Historique</h2>
          <ul className="card divide-y divide-line text-sm">
            {past.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="min-w-0 truncate">{c.goal}</span>
                <span className="text-muted">{cm.statuses[c.status]}{c.offer_name ? ` · ${c.offer_name}${c.price_label ? ` (${c.price_label})` : ""}` : ""}{c.advisor ? ` · ${c.advisor.display_name}` : ""} · {new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function AccompagnementPage() {
  return <RequireAuth><Suspense><Page /></Suspense></RequireAuth>;
}
