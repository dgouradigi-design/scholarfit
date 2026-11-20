"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthPanel, { AuthMode } from "./AuthPanel";

/**
 * Ouvre la connexion / l'inscription dans une fenêtre par-dessus la page, au lieu de changer de page.
 * Tous les liens vers /connexion du site sont interceptés ; l'adresse /connexion reste une vraie page
 * (lien partagé, retour arrière, navigateur sans JavaScript).
 */
export default function AuthModal() {
  const path = usePathname();
  const [state, setState] = useState<{ mode: AuthMode; next: string | null } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/connexion") return;
      e.preventDefault();
      e.stopPropagation();
      setState({ mode: url.searchParams.get("mode") === "inscription" ? "inscription" : "connexion", next: url.searchParams.get("next") });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setState(null);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [state]);

  useEffect(() => { setState(null); }, [path]);

  if (!state || path === "/connexion") return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label={state.mode === "inscription" ? "Créer un compte" : "Se connecter"}>
      <button type="button" aria-label="Fermer" className="animate-fade-in absolute inset-0 bg-[#05060d]/70 backdrop-blur-sm" onClick={() => setState(null)} />
      <div className="animate-pop-in relative my-auto flex w-full justify-center">
        <AuthPanel key={state.mode} initialMode={state.mode} next={state.next} onClose={() => setState(null)} onSuccess={() => setState(null)} />
      </div>
    </div>
  );
}
