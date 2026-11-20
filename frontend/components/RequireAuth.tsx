"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, ready } = useAuth();
  const path = usePathname();
  if (!ready) return <p className="text-muted">Chargement…</p>;
  if (!me)
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="font-serif text-xl">Connecte-toi pour accéder à cette page.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={`/connexion?next=${encodeURIComponent(path)}`} className="btn-primary">Se connecter</Link>
          <Link href={`/connexion?mode=inscription&next=${encodeURIComponent(path)}`} className="btn-ghost">Créer un compte</Link>
        </div>
      </div>
    );
  return <>{children}</>;
}
