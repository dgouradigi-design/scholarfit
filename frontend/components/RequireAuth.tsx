"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useT } from "@/components/LangProvider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { me, ready } = useAuth();
  const path = usePathname();
  if (!ready) return <p className="text-muted">{t("Chargement…")}</p>;
  if (!me)
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="font-serif text-xl">{t("Connectez-vous pour accéder à cette page.")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={`/connexion?next=${encodeURIComponent(path)}`} className="btn-primary">{t("Se connecter")}</Link>
          <Link href={`/connexion?mode=inscription&next=${encodeURIComponent(path)}`} className="btn-ghost">{t("Créer un compte")}</Link>
        </div>
      </div>
    );
  return <>{children}</>;
}
