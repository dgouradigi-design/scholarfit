import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import Shell from "@/components/Shell";
import { getLang, getT } from "@/lib/i18n-server";
import { THEME_SCRIPT } from "@/lib/theme";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { default: t("ScholarFit : les bourses d'études qui vous correspondent"), template: "%s · ScholarFit" },
    description: t("Trouvez les bourses d'études, stages et conférences auxquels vous avez droit, du bac au doctorat, avec votre dossier préparé et le suivi de vos candidatures."),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <LangProvider lang={lang}>
          <Shell>{children}</Shell>
        </LangProvider>
      </body>
    </html>
  );
}
