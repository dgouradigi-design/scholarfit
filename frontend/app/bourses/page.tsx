"use client";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { REGIONS } from "@/lib/geo";
import ScholarshipCard from "@/components/ScholarshipCard";
import { Meta, Scholarship, api, getMeta } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

type Filters = { kind: string; q: string; level: string; region: string; country: string; domain: string; nationality: string; full_funding: string; include_expired: string; sort: string };
const EMPTY: Filters = { kind: "bourse", q: "", level: "", region: "", country: "", domain: "", nationality: "", full_funding: "", include_expired: "", sort: "priority" };
const KEYS = Object.keys(EMPTY) as (keyof Filters)[];
const KINDS: Record<string, { label: string; title: string; one: string; many: string }> = {
  bourse: { label: "Bourses d'études", title: "Toutes les bourses", one: "bourse", many: "bourses" },
  stage: { label: "Stages", title: "Tous les stages", one: "stage", many: "stages" },
  conference: { label: "Conférences et événements", title: "Conférences et événements", one: "conférence", many: "conférences" },
  tout: { label: "Toutes les opportunités", title: "Toutes les opportunités", one: "opportunité", many: "opportunités" },
};

function fromParams(p: URLSearchParams): Filters {
  const f = { ...EMPTY };
  KEYS.forEach((k) => { const v = p.get(k); if (v) f[k] = v; });
  return f;
}

function Sel({ id, label, value, active, onChange, children }: { id: string; label: string; value: string; active: boolean; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={`f-${id}`}>{label}</label>
      <select id={`f-${id}`} className={`input ${active ? "border-brand/60" : ""}`} value={value} onChange={onChange}>{children}</select>
    </div>
  );
}

export default function BoursesPage() {
  return <Suspense><Bourses /></Suspense>;
}

function Bourses() {
  const { me } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [f, setF] = useState<Filters>(() => fromParams(params));
  const [page, setPage] = useState(1);
  // Les liens du carrousel (/bourses?country=XX) arrivent ici : on suit l'URL…
  const qs = params.toString();
  useEffect(() => { setF(fromParams(new URLSearchParams(qs))); setPage(1); }, [qs]);
  // …et on la met à jour quand les filtres changent (lien partageable, retour arrière).
  useEffect(() => {
    const p = new URLSearchParams();
    KEYS.forEach((k) => { if (f[k] && f[k] !== EMPTY[k]) p.set(k, f[k]); });
    const next = p.toString();
    if (next !== qs) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);
  const [data, setData] = useState<{ total: number; items: Scholarship[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getMeta().then(setMeta).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), per_page: "12" });
    Object.entries(f).forEach(([k, v]) => v && !(k === "kind" && v === "tout") && params.set(k, v));
    const t = setTimeout(() => {
      type Page = { total: number; items: Scholarship[] };
      api<Page>(`/api/scholarships?${params}`)
        .catch(() => { params.set("sort", params.get("sort") === "priority" ? "deadline" : params.get("sort") ?? "deadline"); return api<Page>(`/api/scholarships?${params}`); })
        .then((d) => { setError(null); setData(d); })
        .catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [f, page]);

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setPage(1); setF({ ...f, [k]: e.target.value }); };
  const pages = data ? Math.max(1, Math.ceil(data.total / 12)) : 1;

  const K = KINDS[f.kind] ?? KINDS.bourse;
  const active = KEYS.filter((k) => k !== "sort" && k !== "kind" && f[k] && f[k] !== EMPTY[k]).length;
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">{K.title}</h1>
          <p className="mt-1 text-muted">Les opportunités qui ferment bientôt passent en premier.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input pl-10" placeholder="Rechercher par nom ou organisme" value={f.q} onChange={set("q")} aria-label="Rechercher" />
          </div>
          <button type="button" className="btn-ghost lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
            <Icon name="filter" className="h-4 w-4" />Filtres{active ? ` (${active})` : ""}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className={`${open ? "block" : "hidden"} card space-y-5 p-5 lg:sticky lg:top-24 lg:block`} aria-label="Filtres">
          <Sel id="kind" value={f.kind} active={!!f.kind && f.kind !== EMPTY.kind} onChange={set("kind")} label="Type d'opportunité">
            {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Sel id="level" value={f.level} active={!!f.level && f.level !== EMPTY.level} onChange={set("level")} label="Niveau d'études">
            <option value="">Tous les niveaux</option>
            {meta && Object.entries(meta.levels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
          <Sel id="full_funding" value={f.full_funding} active={!!f.full_funding && f.full_funding !== EMPTY.full_funding} onChange={set("full_funding")} label="Financement">
            <option value="">Tout</option>
            <option value="true">Financement complet</option>
            <option value="false">Financement partiel</option>
          </Sel>
          <Sel id="domain" value={f.domain} active={!!f.domain && f.domain !== EMPTY.domain} onChange={set("domain")} label="Domaine">
            <option value="">Tous les domaines</option>
            {meta && Object.entries(meta.domains).filter(([k]) => k !== "tous").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
          <Sel id="region" value={f.region} active={!!f.region && f.region !== EMPTY.region} onChange={set("region")} label="Région">
            <option value="">Monde entier</option>
            {Object.entries(REGIONS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </Sel>
          <Sel id="country" value={f.country} active={!!f.country && f.country !== EMPTY.country} onChange={set("country")} label="Pays">
            <option value="">Tous les pays</option>
            {meta && Object.entries(meta.countries).filter(([k]) => !f.region || REGIONS[f.region]?.codes.includes(k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
          <Sel id="nationality" value={f.nationality} active={!!f.nationality && f.nationality !== EMPTY.nationality} onChange={set("nationality")} label="Ma nationalité">
            <option value="">Toutes</option>
            {meta && Object.entries(meta.countries).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
          <Sel id="sort" value={f.sort} active={!!f.sort && f.sort !== EMPTY.sort} onChange={set("sort")} label="Trier par">
            <option value="priority">Priorité (urgentes d&apos;abord)</option>
            <option value="deadline">Date limite</option>
            <option value="amount">Financement</option>
            <option value="title">Nom</option>
            <option value="recent">Plus récentes</option>
          </Sel>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-muted">
            <input type="checkbox" className="mt-0.5 accent-[#3ee0a8]" checked={f.include_expired === "true"} onChange={(e) => { setPage(1); setF({ ...f, include_expired: e.target.checked ? "true" : "" }); }} />
            Afficher aussi les offres clôturées
          </label>
          {active > 0 && (
            <button className="w-full rounded-full border border-line py-2 text-xs font-semibold text-gold-dark hover:border-gold/50" onClick={() => { setPage(1); setF({ ...EMPTY, kind: f.kind }); }}>Effacer les filtres</button>
          )}
        </aside>

        <div className="min-w-0 space-y-5">
      {error && <p className="text-danger">{error}</p>}
      {data && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p><span className="font-semibold text-ink">{data.total}</span> {data.total > 1 ? K.many : K.one}{f.include_expired ? "" : data.total > 1 ? (K.one === "stage" ? " ouverts" : " ouvertes") : (K.one === "stage" ? " ouvert" : " ouverte")}{f.region && REGIONS[f.region] ? ` · ${REGIONS[f.region].label}` : ""}{f.country && meta ? ` · ${meta.countries[f.country] ?? f.country}` : ""}</p>
          <p className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warm" />Urgent : moins de 14 jours</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" />Bientôt : moins de 45 jours</span>
            {f.include_expired && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" />Clôturée</span>}
          </p>
        </div>
      )}
      {data && data.total === 0 && (
        <div className="card p-8 text-center">
          <p className="font-serif text-xl">Rien ne correspond à ces filtres pour l&apos;instant.</p>
          <p className="mt-1 text-sm text-muted">Élargis la région ou le niveau, ou affiche aussi les bourses clôturées pour connaître leur prochaine session.</p>
          <button className="btn-ghost mt-4" onClick={() => { setPage(1); setF({ ...EMPTY, kind: f.kind }); }}>Effacer les filtres</button>
        </div>
      )}
      <div className="grid gap-4 2xl:grid-cols-2">
        {data?.items.map((s) => <ScholarshipCard key={s.id} s={s} meta={meta} loggedIn={!!me} lockedScore={!me} />)}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Précédent</button>
          <span className="text-sm text-muted">Page {page} / {pages}</span>
          <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Suivant →</button>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
