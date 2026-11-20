"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import CountryPicker from "@/components/CountryPicker";
import Icon from "@/components/Icon";
import RequireAuth from "@/components/RequireAuth";
import { ScoreRing } from "@/components/ScholarshipCard";
import { Meta, Profile, api, getMeta, setToken } from "@/lib/api";

const STEPS = ["Identité", "Parcours", "Projet et atouts", "Facultatif"];
const SITUATIONS: Record<string, string> = {
  revenus_modestes: "Revenus familiaux modestes",
  premiere_generation: "Première génération à l'université",
  refugie: "Statut de réfugié",
  handicap: "Situation de handicap",
  femmes: "Je suis une femme (bourses réservées)",
};
const TESTS = ["IELTS", "TOEFL", "DELF", "DALF", "TCF", "TestDaF"];

function ProfileForm() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [p, setP] = useState<Profile | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [langText, setLangText] = useState("");

  useEffect(() => {
    getMeta().then(setMeta);
    api<Profile>("/api/profile").then((pr) => {
      setP(pr);
      setLangText(Object.entries(pr.languages).map(([k, v]) => `${k}:${v}`).join(", "));
    }).catch((e) => setError(e.message));
  }, []);

  if (!p || !meta) return <p className="text-muted">{error ?? "Chargement…"}</p>;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });

  async function save(goNext = false) {
    if (!p) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    const languages = Object.fromEntries(langText.split(",").map((x) => x.split(":").map((s) => s.trim())).filter((x) => x[0]).map(([k, v]) => [k.toLowerCase(), v || "?"]));
    const body = {
      full_name: p.full_name || null, birth_date: p.birth_date || null, nationalities: p.nationalities,
      residence_country: p.residence_country || null, phone: p.phone || null, alerts_opt_in: p.alerts_opt_in,
      current_level: p.current_level || null, target_level: p.target_level || null, domain: p.domain || null,
      institution: p.institution || null, grade_average: p.grade_average, wished_countries: p.wished_countries,
      languages, language_scores: p.language_scores, experiences: p.experiences || null, engagement: p.engagement || null,
      project: p.project || null, full_funding_only: p.full_funding_only, situations: p.situations,
    };
    try {
      const out = await api<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(body) });
      setP(out);
      setMsg("Profil enregistré.");
      if (goNext) setStep(Math.min(step + 1, STEPS.length - 1));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadCV(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    setError(null);
    try {
      const out = await api<Profile>("/api/profile/cv", { method: "POST", body: fd });
      setP(out);
      setMsg("CV importé : vérifie les champs préremplis (expériences, engagement, domaine).");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteAccount() {
    if (!confirm("Supprimer définitivement ton compte, ton profil, tes CV, lettres et candidatures ?")) return;
    await api("/api/auth/me", { method: "DELETE" });
    setToken(null);
    window.location.href = "/";
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
      <div>
        <h1 className="text-3xl">Mon profil</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted"><Icon name="shield" className="h-4 w-4 text-ok" />Tes données sont privées : elles servent uniquement au matching de tes bourses.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${i === step ? "border-brand font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}>{s}</button>
        ))}
      </div>
      <div className="card space-y-4 p-6">
        {step === 0 && (
          <>
            <div><label className="label">Nom complet</label><input className="input" name="name" autoComplete="name" value={p.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Date de naissance *</label><input type="date" name="bday" autoComplete="bday" className="input" value={p.birth_date ?? ""} onChange={(e) => set("birth_date", e.target.value)} /></div>
              <div><label className="label">Pays de résidence</label>
                <select className="input" name="country" autoComplete="country" value={p.residence_country ?? ""} onChange={(e) => set("residence_country", e.target.value)}>
                  <option value="">—</option>{Object.entries(meta.countries).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
            </div>
            <div><label className="label">Nationalité(s) *</label><CountryPicker value={p.nationalities} onChange={(v) => set("nationalities", v)} countries={meta.countries} placeholder="Ajouter une nationalité" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">WhatsApp (alertes, facultatif)</label><input type="tel" name="tel" autoComplete="tel" inputMode="tel" className="input" value={p.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+221…" /></div>
              <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={p.alerts_opt_in} onChange={(e) => set("alerts_opt_in", e.target.checked)} />Recevoir les alertes (nouvelles bourses, rappels)</label>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Niveau actuel</label>
                <select className="input" value={p.current_level ?? ""} onChange={(e) => set("current_level", e.target.value)}>
                  <option value="">—</option>{Object.entries(meta.levels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="label">Niveau visé (diplôme à financer) *</label>
                <select className="input" value={p.target_level ?? ""} onChange={(e) => set("target_level", e.target.value)}>
                  <option value="">—</option>{Object.entries(meta.levels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Domaine d&apos;études *</label>
                <select className="input" value={p.domain ?? ""} onChange={(e) => set("domain", e.target.value)}>
                  <option value="">—</option>{Object.entries(meta.domains).filter(([k]) => k !== "tous").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="label">Moyenne (sur 20)</label><input type="number" step="0.1" min={0} max={20} className="input" value={p.grade_average ?? ""} onChange={(e) => set("grade_average", e.target.value === "" ? null : Number(e.target.value))} /></div>
            </div>
            <div><label className="label">Établissement actuel</label><input className="input" name="organization" autoComplete="organization" value={p.institution ?? ""} onChange={(e) => set("institution", e.target.value)} /></div>
          </>
        )}
        {step === 2 && (
          <>
            <div><label className="label">Pays où tu veux étudier</label>
              <CountryPicker value={p.wished_countries} onChange={(v) => set("wished_countries", v)} countries={meta.countries} placeholder="Ajouter un pays (vide = tous)" />
              <p className="mt-1 text-xs text-muted">Si tu choisis des pays, on exclut les bourses limitées à d&apos;autres pays.</p></div>
            <div><label className="label">Langues parlées</label><input className="input" value={langText} onChange={(e) => setLangText(e.target.value)} placeholder="fr:natif, en:B2, de:A2" /></div>
            <div><label className="label">Scores de tests de langue</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TESTS.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-muted">{t}</span>
                    <input type="number" step="0.5" className="input" value={p.language_scores[t] ?? ""} onChange={(e) => {
                      const ls = { ...p.language_scores };
                      if (e.target.value === "") delete ls[t]; else ls[t] = Number(e.target.value);
                      set("language_scores", ls);
                    }} />
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">DELF/DALF : indique le niveau en chiffre (B1 = 1, B2 = 2, C1 = 3).</p></div>
            <div><label className="label">Expériences (stages, emplois, projets)</label><textarea rows={4} className="input" value={p.experiences ?? ""} onChange={(e) => set("experiences", e.target.value)} /></div>
            <div><label className="label">Engagement associatif</label><textarea rows={3} className="input" value={p.engagement ?? ""} onChange={(e) => set("engagement", e.target.value)} /></div>
            <div><label className="label">Projet professionnel</label><textarea rows={3} className="input" value={p.project ?? ""} onChange={(e) => set("project", e.target.value)} placeholder="Ce que tu veux faire après tes études, et pourquoi." /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.full_funding_only} onChange={(e) => set("full_funding_only", e.target.checked)} />Je ne cherche que des bourses à financement complet</label>
          </>
        )}
        {step === 3 && (
          <>
            <p className="text-sm text-muted">Ces informations sont facultatives et ne sont jamais partagées. Elles débloquent des bourses réservées à certains publics.</p>
            {Object.entries(SITUATIONS).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={p.situations.includes(k)} onChange={(e) => set("situations", e.target.checked ? [...p.situations, k] : p.situations.filter((x) => x !== k))} />{v}
              </label>
            ))}
          </>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        {msg && <p className="text-sm text-brand">{msg}</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          <button className="btn-primary" disabled={saving} onClick={() => save(step < STEPS.length - 1)}>{step < STEPS.length - 1 ? "Enregistrer et continuer" : "Enregistrer"}</button>
          {step > 0 && <button className="btn-ghost" onClick={() => setStep(step - 1)}>Retour</button>}
        </div>
      </div>

      </div>

      <aside className="space-y-4">
        <div className={`card p-5 ${p.minimum_ok ? "border-ok/40" : ""}`}>
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-night p-1"><ScoreRing value={p.completeness} color={p.minimum_ok ? "#3ee0a8" : "#ffb547"} size={60} /></span>
            <div>
              <p className="font-semibold">{p.minimum_ok ? "Ton profil permet le matching" : "Profil à compléter"}</p>
              <p className="text-xs text-muted">Complété à {p.completeness} %</p>
            </div>
          </div>
          {!p.minimum_ok && <p className="mt-3 text-sm text-warm">Il manque : {p.missing_minimum.join(", ")}</p>}
          {p.completeness_tip && <p className="mt-2 text-xs text-muted">{p.completeness_tip}</p>}
          {p.minimum_ok && <Link href="/mes-bourses" className="btn-dark mt-4 w-full">Voir mes bourses</Link>}
        </div>

        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><Icon name="upload" className="h-4 w-4 text-brand" />Importe ton CV</p>
          <p className="mt-1 text-xs text-muted">PDF texte, Word (.docx) ou .txt. On préremplit seulement les champs vides, tu vérifies ensuite.</p>
          <label className="btn-ghost mt-3 w-full cursor-pointer">
            Choisir un fichier
            <input type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadCV(e.target.files[0])} />
          </label>
          {p.has_cv && <p className="mt-2 text-xs text-ok">✓ Un CV est enregistré. <Link href="/cv" className="underline">L&apos;améliorer</Link></p>}
        </div>

        <button className="w-full text-center text-xs text-danger hover:underline" onClick={deleteAccount}>Supprimer mon compte et toutes mes données</button>
      </aside>
    </div>
  );
}

export default function Page() {
  return <RequireAuth><ProfileForm /></RequireAuth>;
}
