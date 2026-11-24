"use client";
import { useEffect, useState } from "react";
import { StatusChip } from "@/components/CoachingWorkspace";
import { AdminCoaching as AdminItem, AdvisorAdmin, CoachingMeta, Meta, api, getCoachingMeta } from "@/lib/api";

const EMPTY = { email: "", display_name: "", bio: "", levels: [] as string[], countries: "", domains: [] as string[], languages: "fr", capacity: 5 };

/** Section « Accompagnement » de l'administration : demandes à attribuer et conseillers. */
export default function AdminCoaching({ meta }: { meta: Meta | null }) {
  const [cm, setCm] = useState<CoachingMeta | null>(null);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorAdmin[]>([]);
  const [choice, setChoice] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState("demande");
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => {
    api<AdminItem[]>(`/api/admin/accompagnement${filter ? `?status=${filter}` : ""}`).then(setItems).catch((e) => setMsg(e.message));
    api<AdvisorAdmin[]>("/api/admin/conseillers").then(setAdvisors).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { getCoachingMeta().then(setCm); refresh(); }, [filter]);

  async function assign(id: number, advisorId: number) {
    try {
      await api(`/api/admin/accompagnement/${id}/attribuer`, { method: "POST", body: JSON.stringify({ advisor_id: advisorId }) });
      setMsg("Conseiller attribué. Le candidat et le conseiller ont reçu une alerte.");
      refresh();
    } catch (e) { setMsg((e as Error).message); }
  }

  async function addAdvisor(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/admin/conseillers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          countries: form.countries.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean),
          languages: form.languages.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean),
        }),
      });
      setMsg(`${form.display_name} est maintenant conseiller.`);
      setForm(EMPTY);
      refresh();
    } catch (err) { setMsg((err as Error).message); }
  }

  async function toggle(a: AdvisorAdmin) {
    await api(`/api/admin/conseillers/${a.id}`, { method: "PATCH", body: JSON.stringify({ active: !a.active }) });
    refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl">Accompagnement</h2>
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrer par statut">
          <option value="">Tous</option>
          {cm && Object.entries(cm.statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {msg && <p className="text-sm text-brand-dark">{msg}</p>}

      <div className="card divide-y divide-line">
        {items.length === 0 && <p className="p-4 text-sm text-muted">Aucune demande{filter === "demande" ? " en attente" : ""}.</p>}
        {items.map((c) => (
          <div key={c.id} className="space-y-2 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p><strong>{c.student_name}</strong> <span className="text-muted">· {c.student_email} · {new Date(c.created_at).toLocaleDateString("fr-FR")}</span></p>
              <StatusChip status={c.status} label={cm?.statuses[c.status]} />
            </div>
            <p className="text-muted">{c.goal}</p>
            <div className="flex flex-wrap gap-1">{c.needs.map((n) => <span key={n} className="chip">{cm?.needs[n] ?? n}</span>)}<span className="chip">langue : {c.preferred_language}</span></div>
            {c.advisor && <p>Conseiller : {c.advisor.display_name} · {c.progress} % du plan</p>}
            {(c.status === "demande" || c.status === "en_cours") && (
              <div className="flex flex-wrap items-center gap-2">
                <select className="input w-auto" value={choice[c.id] ?? ""} onChange={(e) => setChoice({ ...choice, [c.id]: e.target.value })} aria-label="Choisir un conseiller">
                  <option value="">{c.status === "demande" ? "Choisir un conseiller" : "Changer de conseiller"}</option>
                  {c.suggestions.length > 0 && <optgroup label="Suggérés">{c.suggestions.map((a) => <option key={`s${a.id}`} value={a.id}>{a.display_name} ({a.load}/{a.capacity})</option>)}</optgroup>}
                  <optgroup label="Tous les conseillers actifs">
                    {advisors.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.display_name} ({a.load}/{a.capacity})</option>)}
                  </optgroup>
                </select>
                <button className="btn-primary px-3 py-1 text-xs" disabled={!choice[c.id]} onClick={() => assign(c.id, Number(choice[c.id]))}>Attribuer</button>
                {c.status === "demande" && c.suggestions[0] && (
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => assign(c.id, c.suggestions[0].id)}>Attribuer à {c.suggestions[0].display_name}</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 className="pt-2 text-lg">Conseillers ({advisors.length})</h3>
      <div className="card divide-y divide-line">
        {advisors.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold">{a.display_name} <span className="font-normal text-muted">· {a.email}</span></p>
              <p className="text-xs text-muted">{a.load}/{a.capacity} candidats · langues {a.languages.join(", ") || "?"} · pays {a.countries.join(", ") || "tous"}{a.levels.length ? ` · ${a.levels.map((l) => meta?.levels[l] ?? l).join(", ")}` : ""}</p>
            </div>
            <button className="btn-ghost px-3 py-1 text-xs" onClick={() => toggle(a)}>{a.active ? "Mettre en pause" : "Réactiver"}</button>
          </div>
        ))}
      </div>

      <form onSubmit={addAdvisor} className="card grid gap-3 p-5 sm:grid-cols-2">
        <p className="text-sm text-muted sm:col-span-2">Ajouter un conseiller : la personne crée d&apos;abord son compte, puis vous lui donnez le rôle avec son e-mail.</p>
        <input required type="email" className="input" placeholder="E-mail du compte" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required minLength={2} className="input" placeholder="Nom affiché" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        <textarea className="input sm:col-span-2" rows={2} placeholder="Présentation (parcours, bourses obtenues…)" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <div className="flex flex-wrap gap-3 text-sm sm:col-span-2">
          {meta && Object.entries(meta.levels).map(([k, v]) => (
            <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={form.levels.includes(k)} onChange={(e) => setForm({ ...form, levels: e.target.checked ? [...form.levels, k] : form.levels.filter((x) => x !== k) })} />{v}</label>
          ))}
        </div>
        <select multiple className="input h-28" value={form.domains} onChange={(e) => setForm({ ...form, domains: Array.from(e.target.selectedOptions).map((o) => o.value) })} aria-label="Domaines">
          {meta && Object.entries(meta.domains).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="space-y-3">
          <input className="input" placeholder="Pays connus (codes : FR,CA)" value={form.countries} onChange={(e) => setForm({ ...form, countries: e.target.value })} />
          <input className="input" placeholder="Langues (fr,en)" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">Candidats en même temps
            <input type="number" min={1} max={100} className="input w-20" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label>
        </div>
        <button className="btn-primary sm:col-span-2">Ajouter le conseiller</button>
      </form>
    </section>
  );
}
