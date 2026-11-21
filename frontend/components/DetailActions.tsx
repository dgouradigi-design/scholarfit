"use client";
import Link from "next/link";
import { Scholarship } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import AddToTracker from "./AddToTracker";
import { useT } from "@/components/LangProvider";

export default function DetailActions({ s }: { s: Scholarship }) {
  const { t } = useT();
  const { me } = useAuth();
  return (
    <div className="flex flex-col gap-2">
      {me ? (
        <>
          <AddToTracker scholarshipId={s.id} />
          <Link href={`/preparer/${s.id}`} className="btn-primary">{t("Vérifier ma compatibilité")}</Link>
          <Link href={`/cv?bourse=${s.id}`} className="btn-ghost">{t("Adapter mon CV")}</Link>
          <Link href={`/lettre/${s.id}`} className="btn-ghost">{t("Rédiger ma lettre")}</Link>
        </>
      ) : (
        <Link href={`/connexion?mode=inscription&next=/bourses/${s.id}`} className="btn-ghost">{t("Créer un compte pour préparer mon dossier")}</Link>
      )}
    </div>
  );
}
