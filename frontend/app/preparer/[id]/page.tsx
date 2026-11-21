"use client";
import { useT } from "@/components/LangProvider";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Icon from "@/components/Icon";
import FitCheck from "@/components/docs/FitCheck";
import { Scholarship, api, applyUrl, deadlineInfo } from "@/lib/api";
import { CVData, Doc, LetterData, docApi } from "@/lib/docs";

function Prepare({ id }: { id: string }) {
  const { t, lang } = useT();
  const [s, setS] = useState<Scholarship | null>(null);
  const [cv, setCv] = useState<Doc<CVData> | null>(null);
  const [letter, setLetter] = useState<Doc<LetterData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Scholarship>(`/api/scholarships/${id}`).then(setS).catch((e) => setError(e.message));
    docApi<{ document: Doc<CVData> | null }>(`/api/cv/adapted?scholarship_id=${id}`).then((r) => setCv(r.document)).catch(() => null);
    docApi<{ document: Doc<LetterData> | null }>(`/api/letters/${id}/context`).then((r) => setLetter(r.document)).catch(() => null);
  }, [id]);

  if (!s) return <p className="text-muted">{error ?? t("Chargement…")}</p>;
  const steps = [
    { done: true, title: t("Vérifier la compatibilité"), text: t("Conditions d'accès, pièces demandées et attentes du jury."), href: "#compatibilite", cta: t("Voir ci-dessous") },
    { done: !!cv, title: t("Adapter le CV"), text: cv ? t("Format appliqué : {f}.", { f: cv.data.format_label }) : t("Réécrit au format du pays d'études, avec les mots-clés de la bourse."), href: `/cv?bourse=${s.id}`, cta: cv ? t("Revoir le CV") : t("Adapter mon CV") },
    { done: !!letter, title: t("Rédiger la lettre"), text: letter ? t("Lettre prête, modifiable et téléchargeable.") : t("Une lettre propre à cette bourse, à partir de vos réponses."), href: `/lettre/${s.id}`, cta: letter ? t("Revoir la lettre") : t("Rédiger ma lettre") },
    { done: false, title: t("Déposer le dossier"), text: t("Sur le site officiel, avant la date limite."), href: applyUrl(s), cta: t("Site officiel"), ext: true },
  ];
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <Link href={`/bourses/${s.id}`} className="inline-flex items-center gap-1 text-sm text-brand hover:underline"><span aria-hidden>←</span> {t("Fiche de la bourse")}</Link>
        <p className="eyebrow mt-3">{t("Préparer ma candidature")}</p>
        <h1 className="mt-2 text-[28px] leading-tight sm:text-4xl">{s.title}</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">{s.organization} · {deadlineInfo(s, lang).label}</p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((st, i) => (
          <li key={st.title} className="card flex flex-col p-4">
            <div className="flex items-center gap-2.5">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${st.done ? "bg-mint text-[#04140e]" : "border border-line text-muted"}`}>{st.done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}</span>
              <p className="font-semibold">{st.title}</p>
            </div>
            <p className="mt-2 flex-1 text-sm text-muted">{st.text}</p>
            {st.ext ? (
              <a href={st.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">{st.cta} <Icon name="ext" className="h-3.5 w-3.5" /></a>
            ) : (
              <Link href={st.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">{st.cta} <Icon name="arrow" className="h-3.5 w-3.5" /></Link>
            )}
          </li>
        ))}
      </ol>
      <div id="compatibilite" className="scroll-mt-20">
        <FitCheck scholarshipId={s.id} />
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RequireAuth><Prepare id={id} /></RequireAuth>;
}
