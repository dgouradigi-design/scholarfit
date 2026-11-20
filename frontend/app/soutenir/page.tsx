import type { Metadata } from "next";
import Support from "@/components/Support";

export const metadata: Metadata = { title: "Soutenir ScholarFit", description: "Faire un don pour garder ScholarFit gratuit." };

const USES = [
  { t: "Vérifier les offres", d: "Relire chaque bourse, stage et conférence, contrôler les dates et les liens officiels." },
  { t: "Ajouter des sources", d: "Brancher de nouveaux sites d'universités, d'ambassades et de fondations, en Afrique et ailleurs." },
  { t: "Faire tourner le site", d: "Serveurs, nom de domaine et envoi des alertes de dates limites." },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 py-6">
      <Support />
      <section>
        <p className="eyebrow">À quoi servent les dons</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {USES.map((u, i) => (
            <div key={u.t} className="card p-5">
              <span className="text-xs font-semibold text-brand">0{i + 1}</span>
              <p className="mt-2 font-semibold">{u.t}</p>
              <p className="mt-1 text-sm text-muted">{u.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
