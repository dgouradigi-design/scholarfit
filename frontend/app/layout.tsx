import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";
import { THEME_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: "ScholarFit : les bourses d'études qui te correspondent", template: "%s · ScholarFit" },
  description:
    "Trouve les bourses d'études auxquelles tu as droit, du bac au doctorat, avec ton dossier préparé : CV amélioré, lettre de motivation et suivi des candidatures.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
