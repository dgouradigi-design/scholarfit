import Link from "next/link";
import { getT } from "@/lib/i18n-server";
export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <p className="font-serif text-2xl">{t("Page introuvable")}</p>
      <Link href="/bourses" className="btn-primary mt-4">{t("Voir les bourses")}</Link>
    </div>
  );
}
