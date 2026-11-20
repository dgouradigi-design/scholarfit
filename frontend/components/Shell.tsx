"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setToken } from "@/lib/api";
import { Me, useAuth } from "@/lib/useAuth";
import AuthModal from "./AuthModal";
import Icon, { Logo } from "./Icon";
import ThemeToggle from "./ThemeToggle";

const APP_LINKS = [
  { href: "/mes-bourses", label: "Mes bourses", icon: "star" },
  { href: "/bourses", label: "Explorer", icon: "search" },
  { href: "/suivi", label: "Suivi", icon: "kanban" },
  { href: "/accompagnement", label: "Accompagnement", icon: "people" },
  { href: "/cv", label: "Mon CV", icon: "file" },
  { href: "/profil", label: "Profil", icon: "user" },
];

const TITLES: [string, string][] = [
  ["/mes-bourses", "Mes bourses"],
  ["/bourses", "Explorer les bourses"],
  ["/suivi", "Suivi"],
  ["/accompagnement", "Accompagnement"],
  ["/cv", "Mon CV"],
  ["/lettre", "Lettre de motivation"],
  ["/profil", "Profil"],
  ["/conseiller", "Espace conseiller"],
  ["/admin", "Administration"],
];

const PUBLIC_PATHS = ["/", "/connexion", "/questionnaire", "/soutenir"];

function PublicShell({ children, loggedIn }: { children: React.ReactNode; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const links = [
    { href: "/bourses", label: "Les bourses" },
    { href: "/questionnaire", label: "Mon profil en 5 étapes" },
    { href: "/#comment", label: "Comment ça marche" },
    { href: "/#offres", label: "Tarifs" },
    { href: "/#questions", label: "Questions" },
  ];
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-2 md:hidden"><ThemeToggle /><button className="rounded-full border border-line p-2 text-ink" onClick={() => setOpen(!open)} aria-label="Menu">
            <Icon name={open ? "close" : "menu"} />
          </button></div>
          <nav className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col gap-1 border-b border-line bg-paper px-4 py-4 md:static md:flex md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0`}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={`rounded-full px-3 py-2 text-sm ${path === l.href ? "text-ink" : "text-muted hover:text-ink"}`}>{l.label}</Link>
            ))}
            <ThemeToggle className="hidden md:grid" />
            {loggedIn ? (
              <Link href="/mes-bourses" className="btn-primary md:ml-3" onClick={() => setOpen(false)}>Mon espace</Link>
            ) : (
              <>
                <Link href="/connexion" onClick={() => setOpen(false)} className="rounded-full px-3 py-2 text-sm text-muted hover:text-ink">Connexion</Link>
                <Link href="/connexion?mode=inscription" className="btn-primary md:ml-1" onClick={() => setOpen(false)}>Commencer</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{path === "/" ? children : <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">{children}</div>}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-xs text-muted sm:px-6">
          <span>© {new Date().getFullYear()} ScholarFit · Les informations viennent des sites officiels : vérifie toujours la page d&apos;origine avant de postuler.</span>
          <span className="flex gap-4"><Link href="/bourses" className="hover:text-ink">Les bourses</Link><Link href="/soutenir" className="hover:text-ink">Soutenir le site</Link>{!loggedIn && <Link href="/connexion" className="hover:text-ink">Connexion</Link>}</span>
        </div>
      </footer>
    </div>
  );
}

function AppShell({ children, me }: { children: React.ReactNode; me: Me | null }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const extra = [
    ...(me?.is_advisor ? [{ href: "/conseiller", label: "Espace conseiller", icon: "chat" }] : []),
    ...(me?.is_admin ? [{ href: "/admin", label: "Admin", icon: "settings" }] : []),
  ];
  const title = TITLES.find(([p]) => path.startsWith(p))?.[1] ?? "ScholarFit";
  const item = (l: { href: string; label: string; icon: string }) => {
    const active = path.startsWith(l.href);
    return (
      <Link key={l.href} href={l.href}
        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:bg-paper hover:text-ink"}`}>
        <Icon name={l.icon} className={`h-[18px] w-[18px] ${active ? "text-brand" : ""}`} />
        {l.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-paper">
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-card px-3 py-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <Link href="/" className="px-2 pb-5"><Logo /></Link>
        <nav className="space-y-0.5">{APP_LINKS.map(item)}</nav>
        {extra.length > 0 && <nav className="mt-4 space-y-0.5 border-t border-line pt-4">{extra.map(item)}</nav>}
        <div className="mt-auto space-y-3">
          {!path.startsWith("/accompagnement") && !me?.is_advisor && !me?.is_admin && (
            <Link href="/accompagnement" className="block rounded-2xl border border-line bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-mint)_16%,transparent),color-mix(in_srgb,var(--color-gold)_12%,transparent))] p-4 transition hover:border-brand/50">
              <span className="eyebrow">Dès 15 000 F CFA</span>
              <p className="mt-1 font-serif text-[15px] font-semibold leading-snug">Fais relire ton dossier par un conseiller.</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">Demander <Icon name="arrow" className="h-3.5 w-3.5" /></span>
            </Link>
          )}
          <button onClick={() => { setToken(null); router.push("/"); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-paper hover:text-ink">
            <Icon name="logout" className="h-[18px] w-[18px]" /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-card/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-line p-1.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Icon name="menu" /></button>
            <span className="font-serif text-lg font-bold tracking-tight text-ink">{title}</span>
          </div>
          <div className="flex items-center gap-3">
          <ThemeToggle />
          {me && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="hidden sm:inline">{me.email}</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-xs font-bold uppercase text-[#04140e]">{me.email[0]}</span>
            </div>
          )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { me, ready } = useAuth();
  const path = usePathname();
  const isPublic = PUBLIC_PATHS.includes(path) || (ready && !me);
  return (
    <>
      {isPublic ? <PublicShell loggedIn={!!me}>{children}</PublicShell> : <AppShell me={me}>{children}</AppShell>}
      {!me && <AuthModal />}
    </>
  );
}
