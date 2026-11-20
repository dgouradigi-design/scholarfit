"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgressBar, StatusChip } from "@/components/CoachingWorkspace";
import RequireAuth from "@/components/RequireAuth";
import { Coaching, CoachingMeta, api, formatDate, formatDateTime, getCoachingMeta } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

function List() {
  const { me } = useAuth();
  const [cm, setCm] = useState<CoachingMeta | null>(null);
  const [list, setList] = useState<Coaching[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    getCoachingMeta().then(setCm);
    api<Coaching[]>("/api/accompagnement/conseiller").then(setList).catch((e) => setError(e.message));
  }, []);

  if (me && !me.is_advisor) return <p className="text-danger">Cet espace est réservé aux conseillers. Un administrateur peut te donner ce rôle.</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!list || !cm) return <p className="text-muted">Chargement…</p>;

  const active = list.filter((c) => c.status === "en_cours");
  const closed = list.filter((c) => c.status !== "en_cours");
  const today = new Date().toISOString().slice(0, 10);
  const shown = showClosed ? list : active;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Espace conseiller</h1>
        <p className="mt-1 text-muted">{active.length} candidat{active.length > 1 ? "s" : ""} en cours d&apos;accompagnement.</p>
      </div>
      {shown.length === 0 && <p className="card p-8 text-center text-muted">Aucun candidat pour l&apos;instant. Les nouvelles demandes te sont attribuées selon ta langue, tes pays et tes domaines.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((c) => {
          const late = c.next_step?.due_date && c.next_step.due_date < today;
          return (
            <Link key={c.id} href={`/conseiller/${c.id}`} className="card block p-5 transition hover:border-brand">
              <div className="flex items-center justify-between gap-2">
                <p className="font-serif text-lg font-bold">{c.student_name}</p>
                <div className="flex items-center gap-2">
                  {c.unread > 0 && <span className="rounded-full bg-warm px-2 py-0.5 text-xs font-bold text-white">{c.unread} nouveau{c.unread > 1 ? "x" : ""}</span>}
                  <StatusChip status={c.status} label={cm.statuses[c.status]} />
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{c.goal}</p>
              <div className="mt-3"><ProgressBar value={c.progress} /></div>
              <div className="mt-2 space-y-0.5 text-xs">
                {c.next_step && <p className={late ? "font-semibold text-danger" : "text-muted"}>Prochaine étape : {c.next_step.title}{c.next_step.due_date ? ` · ${formatDate(c.next_step.due_date)}` : ""}</p>}
                {c.next_meeting && <p className="text-muted">Rendez-vous : {formatDateTime(c.next_meeting.starts_at)}</p>}
              </div>
            </Link>
          );
        })}
      </div>
      {closed.length > 0 && (
        <button className="text-sm text-brand hover:underline" onClick={() => setShowClosed(!showClosed)}>
          {showClosed ? "Masquer les accompagnements clos" : `Voir aussi les accompagnements clos (${closed.length})`}
        </button>
      )}
    </div>
  );
}

export default function ConseillerPage() {
  return <RequireAuth><List /></RequireAuth>;
}
