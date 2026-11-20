"use client";
import Link from "next/link";
import { Scholarship } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import AddToTracker from "./AddToTracker";

export default function DetailActions({ s }: { s: Scholarship }) {
  const { me } = useAuth();
  return (
    <div className="flex flex-col gap-2">
      {me ? (
        <>
          <AddToTracker scholarshipId={s.id} />
          <Link href={`/lettre/${s.id}`} className="btn-ghost">Préparer ma lettre</Link>
          <Link href={`/cv?bourse=${s.id}`} className="btn-ghost">Adapter mon CV</Link>
        </>
      ) : (
        <Link href={`/connexion?mode=inscription&next=/bourses/${s.id}`} className="btn-ghost">Créer un compte pour préparer mon dossier</Link>
      )}
    </div>
  );
}
