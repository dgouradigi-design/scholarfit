// Page rendue côté serveur : elle peut être indexée par les moteurs de recherche.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeadlineBadge } from "@/components/ScholarshipCard";
import Icon from "@/components/Icon";
import Offers from "@/components/Offers";
import DetailActions from "@/components/DetailActions";
import { Meta, Scholarship, applyUrl, deadlineInfo, formatAmount, formatDate } from "@/lib/api";

const API = process.env.API_URL_INTERNAL || "http://127.0.0.1:8000";

async function load(id: string): Promise<{ s: Scholarship; meta: Meta } | null> {
  try {
    const [r, m] = await Promise.all([
      fetch(`${API}/api/scholarships/${encodeURIComponent(id)}`, { cache: "no-store" }),
      fetch(`${API}/api/meta`, { next: { revalidate: 3600 } }),
    ]);
    if (!r.ok) return null;
    return { s: await r.json(), meta: await m.json() };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await load((await params).id);
  return data ? { title: data.s.title, description: data.s.summary } : { title: "Bourse introuvable" };
}

const COVERAGE: Record<string, string> = { frais: "Frais de scolarité", logement: "Logement", voyage: "Billet d'avion", allocation: "Allocation mensuelle", assurance: "Assurance santé" };
const GROUPS: Record<string, string> = { AFRICA: "un pays africain", EU: "un pays de l'Union européenne", FRANCOPHONIE: "un pays de la Francophonie", DEVELOPING: "un pays en développement" };
const TARGETS: Record<string, string> = { refugie: "aux personnes réfugiées", handicap: "aux personnes en situation de handicap", revenus_modestes: "aux étudiants de familles à revenus modestes", femmes: "aux femmes", premiere_generation: "aux étudiants de première génération" };

/** Ce que chaque pièce demande concrètement (utilisé quand la fiche ne le précise pas). */
const DOC_DETAIL: Record<string, string> = {
  cv: "Une à deux pages, à jour, centrées sur ton parcours scolaire, tes expériences et tes engagements.",
  lettre: "Une page qui explique ton projet d'études, pourquoi ce programme et ce que tu feras ensuite.",
  recommandation: "En général deux lettres d'enseignants ou d'encadrants qui te connaissent bien. Demande-les au moins trois semaines avant.",
  releves: "Les relevés des dernières années d'études, souvent traduits en anglais ou en français et certifiés conformes.",
  test_langue: "Un résultat officiel récent (moins de deux ans en général) au niveau demandé.",
  projet_recherche: "Deux à cinq pages : sujet, question de recherche, méthode, calendrier et directeur pressenti si possible.",
  passeport: "Valide au moins six mois après la date prévue d'arrivée. Lance la demande tôt si tu n'en as pas.",
  certificat_medical: "Certificat récent signé par un médecin agréé, parfois sur un formulaire fourni par le programme.",
  lettre_admission: "Lettre d'admission ou de pré-admission de l'université d'accueil, si le programme la demande au dépôt.",
  photo: "Photo d'identité récente sur fond clair, au format demandé.",
  portfolio: "Sélection de tes travaux (arts, design, architecture), en PDF ou en lien en ligne.",
  justificatif_revenus: "Attestation de revenus ou de non-imposition des parents, pour les bourses sur critères sociaux.",
  diplome: "Copie du dernier diplôme obtenu, ou une attestation de réussite s'il n'est pas encore délivré.",
};

const DEFAULT_STEPS = [
  "Vérifie que tu remplis toutes les conditions ci-dessus, en particulier la nationalité, le niveau et l'âge.",
  "Rassemble les documents demandés. Les traductions, certifications et lettres de recommandation prennent souvent plusieurs semaines.",
  "Rédige ta lettre de motivation et adapte ton CV à cette bourse. Tu peux les préparer depuis ton espace ScholarFit.",
  "Crée ton compte sur le site officiel et remplis le formulaire de candidature en ligne.",
  "Envoie ta candidature avant la date limite, garde l'accusé de réception et note la date des résultats.",
];

function conditions(s: Scholarship, meta: Meta): string[] {
  if (s.eligibility_notes?.length) return s.eligibility_notes;
  const c = (x: string) => meta.countries[x] ?? x;
  const out: string[] = [];
  if (s.eligible_nationalities.includes("ALL") || !s.eligible_nationalities.length) out.push("Ouverte à toutes les nationalités.");
  else out.push(`Être ressortissant de ${s.eligible_nationalities.map((n) => GROUPS[n] ?? c(n)).join(", ")}.`);
  if (s.excluded_nationalities.length) out.push(`Les ressortissants de ${s.excluded_nationalities.map(c).join(", ")} ne peuvent pas postuler.`);
  if (s.levels.length) out.push(`Postuler pour un diplôme de niveau ${s.levels.map((l) => (meta.levels[l] ?? l).split(" : ").pop()).join(", ou ")}.`);
  if (s.domains.length && !s.domains.includes("tous")) out.push(`Étudier dans l'un de ces domaines : ${s.domains.map((d) => meta.domains[d] ?? d).join(", ")}.`);
  if (s.max_age) out.push(`Avoir ${s.max_age} ans au plus à la date limite de candidature.`);
  if (s.min_grade) out.push(`Avoir une moyenne d'au moins ${s.min_grade}/20 (seuil indicatif, les dossiers sont comparés entre eux).`);
  const tests = Object.entries(s.language_tests);
  if (tests.length) out.push(`Justifier d'un niveau de langue : ${tests.map(([t, v]) => `${t} ${v}`).join(" ou ")}.`);
  else if (s.languages.length) out.push(`Pouvoir étudier en ${s.languages.map((l) => ({ fr: "français", en: "anglais", de: "allemand", es: "espagnol", ar: "arabe", pt: "portugais", it: "italien" }[l] ?? l)).join(" ou ")}.`);
  if (s.target_groups.length) out.push(`Bourse réservée ${s.target_groups.map((g) => TARGETS[g] ?? g).join(" ou ")}.`);
  return out;
}

function documents(s: Scholarship, meta: Meta): { label: string; detail?: string }[] {
  if (s.documents?.length) return s.documents.map((d) => ({ label: d.label, detail: d.detail || DOC_DETAIL[d.code] }));
  return s.requirements.map((r) => ({ label: meta.requirements[r] ?? r, detail: DOC_DETAIL[r] }));
}

const LINK: Record<string, { t: string; cls: string }> = {
  ok: { t: "Lien officiel vérifié", cls: "text-ok" },
  redirige: { t: "Le site officiel a changé d'adresse, le lien suit la nouvelle", cls: "text-gold-dark" },
  casse: { t: "Le site officiel ne répond pas en ce moment, réessaie plus tard ou cherche le programme par son nom", cls: "text-warm" },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { s, meta } = data;
  const dl = deadlineInfo(s);
  const conds = conditions(s, meta);
  const docs = documents(s, meta);
  const steps = s.application_steps?.length ? s.application_steps : DEFAULT_STEPS;
  const url = applyUrl(s);
  const link = s.link_status ? LINK[s.link_status] : undefined;
  const facts: [string, string, string][] = [
    ["medal", "Financement", formatAmount(s)],
    ["calendar", "Date limite", s.deadline ? formatDate(s.deadline) : "Variable selon le programme"],
    ["cap", "Niveaux", s.levels.map((l) => (meta.levels[l] ?? l).split(" : ").pop()).join(" · ") || "Non précisé"],
    ["globe", "Pays d'études", s.study_countries.map((c) => meta.countries[c] ?? c).join(", ") || "Plusieurs pays"],
  ];
  if (s.event_start) facts.splice(1, 0, ["calendar", "Dates", s.event_end && s.event_end !== s.event_start ? `Du ${formatDate(s.event_start)} au ${formatDate(s.event_end)}` : formatDate(s.event_start)]);
  if (s.duration) facts.push(["calendar", "Durée", s.duration]);
  if (s.city || s.remote) facts.push(["globe", "Lieu", s.remote ? "En ligne" : String(s.city)]);
  const coverage = s.coverage.map((c) => COVERAGE[c] ?? c);

  return (
    <div className="mx-auto max-w-6xl space-y-8 [overflow-wrap:anywhere]">
      <Link href={`/bourses${s.kind && s.kind !== "bourse" ? `?kind=${s.kind}` : ""}`} className="text-sm text-muted hover:text-ink">← {s.kind === "stage" ? "Tous les stages" : s.kind === "conference" ? "Toutes les conférences" : "Toutes les bourses"}</Link>

      <div className="card relative overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-mint/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
        <p className="eyebrow relative">{s.kind && s.kind !== "bourse" ? `${s.kind_label ?? s.kind} · ` : ""}{s.organization}</p>
        <h1 className="relative mt-2 max-w-3xl text-3xl leading-tight sm:text-5xl">{s.title}</h1>
        <p className="accent relative mt-3 text-2xl">{formatAmount(s)}</p>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <DeadlineBadge deadline={s.deadline} s={s} />
          {s.full_funding && <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-semibold text-ok">Financement complet</span>}
          {s.status === "a_verifier" && <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold-dark">Informations à vérifier sur le site officiel</span>}
        </div>
        <p className="relative mt-5 max-w-3xl text-muted">{s.summary}</p>
      </div>

      {dl.status === "expiree" && (
        <div className="card flex flex-wrap items-start gap-3 border-danger/40 p-5">
          <Icon name="calendar" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Les candidatures sont closes pour cette session.</p>
            <p className="mt-1 text-sm text-muted">
              {s.next_expected_deadline ? <>Prochaine date limite attendue vers le <span className="font-semibold text-ink">{formatDate(s.next_expected_deadline)}</span>. </> : "Ce programme rouvre en général à la même période chaque année. "}
              Tu peux préparer ton dossier dès maintenant pour être prêt à l&apos;ouverture.
            </p>
          </div>
          <Link href="/bourses" className="btn-ghost">Voir les bourses ouvertes</Link>
        </div>
      )}
      {dl.status === "urgente" && (
        <div className="card flex items-start gap-3 border-warm/50 bg-warm-soft p-5">
          <Icon name="calendar" className="mt-0.5 h-5 w-5 shrink-0 text-warm" />
          <p className="text-sm"><span className="font-semibold">{dl.long ?? `Plus que ${dl.days} jour${(dl.days ?? 0) > 1 ? "s" : ""} pour postuler.`}</span> Commence par les documents qui prennent le plus de temps : relevés certifiés, lettres de recommandation et test de langue.</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-10">
          <section>
            <p className="eyebrow">Conditions</p>
            <h2 className="mt-2 text-2xl">Qui peut postuler</h2>
            <ul className="mt-4 space-y-2">
              {conds.map((c) => (
                <li key={c} className="card flex gap-3 px-4 py-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon name="check" className="h-3 w-3" /></span>
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Toutes les conditions doivent être remplies le jour de la candidature. En cas de doute, la page officielle fait foi.</p>
          </section>

          {coverage.length > 0 && (
            <section>
              <p className="eyebrow">Financement</p>
              <h2 className="mt-2 text-2xl">Ce que la bourse prend en charge</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {coverage.map((c) => <span key={c} className="rounded-full border border-line bg-card px-3.5 py-1.5 text-sm">{c}</span>)}
              </div>
            </section>
          )}

          {docs.length > 0 && (
            <section>
              <p className="eyebrow">Dossier</p>
              <h2 className="mt-2 text-2xl">Documents à fournir</h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {docs.map((d, i) => (
                  <li key={d.label} className="card p-4">
                    <p className="flex items-center gap-2 font-semibold"><span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>{d.label}</p>
                    {d.detail && <p className="mt-1.5 text-sm text-muted">{d.detail}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <div className="card p-5">
            <dl className="space-y-3">
              {facts.map(([icon, k, v]) => (
                <div key={k} className="flex gap-3">
                  <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{k}</dt><dd className="text-sm">{v}</dd></div>
                </div>
              ))}
            </dl>
            <a href={url} target="_blank" rel="noopener noreferrer" className={`${dl.status === "expiree" ? "btn-ghost" : "btn-primary"} mt-5 w-full`}>
              {dl.status === "expiree" ? "Voir la page officielle" : "Postuler sur le site officiel"} <Icon name="arrow" className="h-4 w-4 -rotate-45" />
            </a>
            {link && <p className={`mt-2 text-xs ${link.cls}`}>{link.t}{s.link_checked_at ? ` · ${formatDate(s.link_checked_at)}` : ""}</p>}
            <p className="mt-2 truncate text-[11px] text-muted" title={url}>{url.replace(/^https?:\/\//, "")}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-night p-5 text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-mint/25 blur-2xl" />
            <p className="relative font-semibold">Besoin d&apos;aide pour ce dossier ?</p>
            <p className="relative mt-1 text-sm text-white/65">Un conseiller relit tes documents et te prépare à l&apos;entretien, dès 15 000 F CFA.</p>
            <Link href={`/accompagnement?offre=standard&bourse=${s.id}`} className="btn-primary relative mt-4 w-full">Être accompagné</Link>
          </div>
          <DetailActions s={s} />
        </aside>
      </div>

      <section id="postuler" className="scroll-mt-24 rounded-3xl border border-line bg-card p-6 sm:p-10">
        <p className="eyebrow">Comment postuler</p>
        <h2 className="mt-2 text-3xl">Les étapes, <span className="accent">dans l&apos;ordre.</span></h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((t, i) => (
            <li key={i} className="relative pl-12">
              <span className="absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full border border-brand/40 bg-brand-soft font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-sm leading-relaxed [overflow-wrap:anywhere]">{t}</p>
            </li>
          ))}
          <li className="relative pl-12">
            <span className="absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full bg-mint text-[#04140e]"><Icon name="arrow" className="h-4 w-4 -rotate-45" /></span>
            <p className="text-sm leading-relaxed">Le formulaire officiel est ici : <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline-offset-2 hover:underline">{s.organization}</a>.</p>
          </li>
        </ol>
      </section>

      <section>
        <p className="eyebrow">Tarifs</p>
        <h2 className="mt-2 text-3xl">Postule seul ou fais-toi <span className="accent">accompagner.</span></h2>
        <p className="mt-2 max-w-2xl text-muted">Postuler toi-même est gratuit. Si tu veux qu&apos;un conseiller relise ton dossier et te prépare, choisis une formule.</p>
        <div className="mt-6"><Offers scholarshipId={s.id} /></div>
      </section>

      <p className="text-xs text-muted">
        Source : {s.source_name ?? "saisie manuelle"} · collectée le {new Date(s.collected_at).toLocaleDateString("fr-FR")}
        {s.verified_at ? ` · vérifiée le ${new Date(s.verified_at).toLocaleDateString("fr-FR")}` : ""}. Les conditions peuvent changer : la page officielle fait foi.
      </p>
    </div>
  );
}
