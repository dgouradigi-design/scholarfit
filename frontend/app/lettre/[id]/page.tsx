"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { Application, Scholarship, api } from "@/lib/api";

type LetterOut = { letter: string; word_count: number; warnings: string[]; ai_used: boolean };

function LetterTool({ id }: { id: string }) {
  const [s, setS] = useState<Scholarship | null>(null);
  const [form, setForm] = useState({ why_country: "", why_program: "", project_after: "", proud_of: "", language: "fr", max_words: 500, tone: "sobre" });
  const [out, setOut] = useState<LetterOut | null>(null);
  const [letter, setLetter] = useState("");
  const [appId, setAppId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Scholarship>(`/api/scholarships/${id}`).then((sc) => {
      setS(sc);
      if (sc.languages.length && !sc.languages.includes("fr")) setForm((f) => ({ ...f, language: "en" }));
    }).catch((e) => setError(e.message));
    api<Application[]>("/api/applications").then((apps) => {
      const a = apps.find((x) => String(x.scholarship.id) === id);
      if (a) { setAppId(a.id); if (a.letter) setLetter(a.letter); }
    }).catch(() => {});
  }, [id]);

  async function generate() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const o = await api<LetterOut>("/api/letters", { method: "POST", body: JSON.stringify({ scholarship_id: Number(id), ...form }) });
      setOut(o);
      setLetter(o.letter);
      const apps = await api<Application[]>("/api/applications");
      setAppId(apps.find((x) => String(x.scholarship.id) === id)?.id ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!appId) return;
    await api(`/api/applications/${appId}`, { method: "PATCH", body: JSON.stringify({ letter }) });
    setMsg("Lettre enregistrée dans ton suivi.");
  }

  const words = letter.trim() ? letter.trim().split(/\s+/).length : 0;
  const q = (k: keyof typeof form, label: string, ph: string) => (
    <div>
      <label className="label">{label}</label>
      <textarea className="input" rows={2} placeholder={ph} value={form[k] as string} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  );

  if (!s) return <p className="text-muted">{error ?? "Chargement…"}</p>;
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/bourses/${s.id}`} className="text-sm text-brand hover:underline">← {s.title}</Link>
        <h1 className="mt-1 text-3xl">Lettre de motivation</h1>
        <p className="mt-1 text-muted">Réponds à ces questions avec tes mots : c&apos;est ton histoire qui distingue ta lettre. La lettre générée est un brouillon à relire et modifier.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="card space-y-4 p-5">
          {q("why_country", "Pourquoi ce pays ?", "Une raison personnelle et une raison académique")}
          {q("why_program", "Pourquoi ce programme ou cette bourse ?", "Un cours, un laboratoire, une valeur de l'organisme…")}
          {q("project_after", "Ton projet après les études ?", "Ce que tu veux faire, et pour qui")}
          {q("proud_of", "Une réalisation dont tu es fier ou fière ?", "Avec un résultat concret si possible")}
          <div className="grid grid-cols-3 gap-2">
            <div><label className="label">Langue</label><select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}><option value="fr">Français</option><option value="en">Anglais</option></select></div>
            <div><label className="label">Mots max</label><input type="number" min={150} max={1200} className="input" value={form.max_words} onChange={(e) => setForm({ ...form, max_words: Number(e.target.value) })} /></div>
            <div><label className="label">Ton</label><select className="input" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}><option value="sobre">Sobre</option><option value="chaleureux">Chaleureux</option><option value="dynamique">Dynamique</option></select></div>
          </div>
          <button className="btn-primary w-full" disabled={busy} onClick={generate}>{busy ? "Rédaction…" : letter ? "Régénérer la lettre" : "Générer ma lettre"}</button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <div className="card flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Ma lettre</h2>
            <span className={`text-sm ${words > form.max_words ? "text-danger" : "text-muted"}`}>{words} / {form.max_words} mots</span>
          </div>
          <textarea className="input mt-3 flex-1 font-serif text-[15px] leading-relaxed" rows={22} value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="Ta lettre apparaîtra ici. Tu peux la modifier librement." />
          {out && (
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-xs text-muted">{out.ai_used ? "Brouillon rédigé par l'IA à partir de ton profil et de tes réponses." : "Brouillon construit à partir d'un modèle (mode hors-ligne)."}</p>
              {out.warnings.map((w) => <p key={w} className="text-warm">! {w}</p>)}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!appId || !letter} onClick={save}>Enregistrer dans mon suivi</button>
            <button className="btn-ghost" disabled={!letter} onClick={() => navigator.clipboard.writeText(letter).then(() => setMsg("Lettre copiée."))}>Copier</button>
            <button className="btn-ghost" disabled={!letter} onClick={() => window.print()}>Imprimer / PDF</button>
          </div>
          {msg && <p className="mt-2 text-sm text-brand">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RequireAuth><LetterTool id={id} /></RequireAuth>;
}
