"use client";
import { useT } from "@/components/LangProvider";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { ScoreRing } from "@/components/ScholarshipCard";
import { Fit, docApi } from "@/lib/docs";

const DOT: Record<string, string> = { ok: "bg-ok", ko: "bg-danger", inconnu: "bg-muted", attention: "bg-gold" };
const RING: Record<Fit["level"], string> = { ok: "#3ee0a8", moyen: "#ffb547", faible: "#ff8a5c", ko: "#ff6b6b" };

/** Compatibilité du profil et du CV avec la bourse, à consulter avant de postuler. */
export default function FitCheck({ scholarshipId, refreshKey = 0, compact = false }: { scholarshipId: number; refreshKey?: number; compact?: boolean }) {
  const { t } = useT();
  const [fit, setFit] = useState<Fit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    docApi<Fit>(`/api/scholarships/${scholarshipId}/fit?ai=true`).then(setFit).catch((e) => setError(e.message));
  }, [scholarshipId, refreshKey]);

  if (error) return <div className="card p-5 text-sm text-danger">{error}</div>;
  if (!fit) return <div className="card h-40 animate-pulse p-5" aria-busy="true" />;

  const href = (a: string) => (a === "cv" ? `/cv?bourse=${scholarshipId}` : a === "lettre" ? `/lettre/${scholarshipId}` : "/profil");
  return (
    <section className="card overflow-hidden" aria-label={t("Compatibilité avec la bourse")}>
      <div className="flex flex-col gap-4 bg-night p-5 text-white sm:flex-row sm:items-center sm:p-6">
        <span className="shrink-0"><ScoreRing value={fit.score} color={RING[fit.level]} size={74} /></span>
        <div className="min-w-0">
          <p className="eyebrow">{t("Compatibilité avant de postuler")}</p>
          <p className="mt-1 font-serif text-xl font-bold sm:text-2xl">{fit.verdict}</p>
          <p className="mt-1 text-sm text-white/70">{fit.verdict_detail}</p>
        </div>
      </div>
      <div className={`grid gap-6 p-5 sm:p-6 ${compact ? "" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"}`}>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-muted">{t("Conditions d'accès")}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {fit.checks.map((c) => (
                <li key={c.key} className="flex gap-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[c.status]}`} aria-hidden />
                  <span><span className="font-semibold">{c.label}.</span> <span className="text-muted">{c.detail}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-muted">{t("Pièces du dossier")}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {fit.documents.map((d) => (
                <span key={d.key} className={`chip ${d.ready ? "!border-brand/40 !text-brand" : ""}`}>
                  {d.ready && <Icon name="check" className="h-3 w-3" />}{d.label}
                </span>
              ))}
            </div>
          </div>
          {fit.themes.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-muted">{t("Ce que le jury valorise")}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fit.themes.map((th) => (
                  <span key={th.key} className={`chip ${th.covered ? "!border-brand/40 !text-brand" : "!border-gold/50 !text-gold-dark"}`}>
                    {th.covered ? <Icon name="check" className="h-3 w-3" /> : <span aria-hidden>+</span>}{th.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-muted">{t("Améliorations avant l'envoi")}</h3>
          {fit.improvements.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("Rien de bloquant. Relisez votre lettre et déposez votre dossier.")}</p>
          ) : (
            <ol className="mt-2 space-y-2.5">
              {fit.improvements.map((i, n) => (
                <li key={n} className="flex gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{n + 1}</span>
                  <span className="min-w-0 flex-1">
                    {i.text}
                    {i.action !== "conditions" && (
                      <Link href={href(i.action)} className="mt-1 block text-xs font-semibold text-brand hover:underline">
                        {i.action === "cv" ? t("Travailler mon CV") : i.action === "lettre" ? t("Rédiger la lettre") : t("Compléter mon profil")} →
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
