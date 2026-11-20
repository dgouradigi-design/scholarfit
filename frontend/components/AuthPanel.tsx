"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";
import StudentsIllustration from "./StudentsIllustration";
import { api, setToken } from "@/lib/api";

function strength(p: string) {
  if (p.length < 8) return 0;
  let n = 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++;
  if (/\d/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) n++;
  return Math.min(n, 4);
}

/** Mot de passe aléatoire lisible (le navigateur proposera de l'enregistrer). */
function suggestPassword() {
  const sets = ["abcdefghjkmnpqrstuvwxyz", "ABCDEFGHJKMNPQRSTUVWXYZ", "23456789", "-_!?*#"];
  const r = new Uint32Array(16);
  crypto.getRandomValues(r);
  return Array.from(r, (v, i) => { const set = sets[i % 4 === 3 && i % 8 === 7 ? 3 : i % 3]; return set[v % set.length]; }).join("");
}

export type AuthMode = "connexion" | "inscription";

/** Fenêtre de connexion / inscription : illustration à gauche, champs à droite. */
export default function AuthPanel({ initialMode = "connexion", next, onClose, onSuccess }: { initialMode?: AuthMode; next?: string | null; onClose?: () => void; onSuccess?: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [taken, setTaken] = useState(false);

  async function checkEmail() {
    if (mode !== "inscription" || !/^\S+@\S+\.\S+$/.test(email)) return setTaken(false);
    try {
      const r = await api<{ available: boolean }>(`/api/auth/email-disponible?email=${encodeURIComponent(email)}`);
      setTaken(!r.available);
    } catch { setTaken(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const path = mode === "connexion" ? "/api/auth/login" : "/api/auth/register";
      const { access_token } = await api<{ access_token: string }>(path, { method: "POST", body: JSON.stringify({ email, password }) });
      setToken(access_token);
      const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      onSuccess?.();
      router.push(safe ?? (mode === "inscription" ? "/profil" : "/mes-bourses"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "connexion";
  return (
    <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-line bg-card shadow-[0_40px_120px_-30px_rgba(0,0,0,0.7)] md:grid-cols-[1fr_1.1fr]">
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink">
          <Icon name="close" />
        </button>
      )}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0f1022] p-8 text-white md:flex">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3ee0a8]">ScholarFit</p>
          <p className="mt-3 font-serif text-3xl font-bold leading-tight">Ton prochain départ <span className="italic text-[#ffc979]">commence ici.</span></p>
        </div>
        <StudentsIllustration className="mx-auto -mb-8 mt-4 w-full max-w-[340px]" />
        <ul className="relative mt-2 grid grid-cols-3 gap-2 text-center text-[11px] text-white/70">
          {[{ i: "star", t: "Score par bourse" }, { i: "file", t: "CV et lettre" }, { i: "people", t: "Conseiller dédié" }].map((x) => (
            <li key={x.t} className="flex flex-col items-center gap-1.5"><Icon name={x.i} className="h-4 w-4 text-[#3ee0a8]" />{x.t}</li>
          ))}
        </ul>
      </div>
      <div className="relative p-6 sm:p-9">
          <div className="relative grid grid-cols-2 rounded-full border border-line bg-surface p-1 text-sm">
            {(["connexion", "inscription"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(null); }}
                className={`rounded-full py-2 font-semibold transition ${mode === m ? "bg-card text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"}`}>
                {m === "connexion" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>
          <h1 className="mt-7 text-3xl leading-tight">{isLogin ? <>Content de te <span className="accent">revoir.</span></> : <>Ton profil en <span className="accent">cinq minutes.</span></>}</h1>
          <p className="mt-2 text-sm text-muted">
            {isLogin ? <>Retrouve tes bourses et ton score. Démo : <span className="font-mono text-xs text-brand">demo@example.org</span> / <span className="font-mono text-xs text-brand">demo12345</span></> : "Un e-mail et un mot de passe. Ensuite, ton profil sert uniquement à trouver tes bourses."}
          </p>
          <form onSubmit={submit} className="relative mt-6 space-y-5">
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete={isLogin ? "username" : "email"} inputMode="email" autoCapitalize="none" spellCheck={false} required className="input" placeholder="awa@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setTaken(false); }} onBlur={checkEmail} />
              {taken && !isLogin && (
                <p className="mt-1.5 text-xs text-warm">Un compte existe déjà avec cet e-mail. <button type="button" className="font-semibold underline" onClick={() => { setMode("connexion"); setTaken(false); }}>Se connecter</button></p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <div className="relative">
                <input id="password" name="password" type={show ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} required minLength={isLogin ? 1 : 8} pattern={isLogin ? undefined : "(?=.*[A-Za-z])(?=.*\\d).{8,}"} title={isLogin ? undefined : "8 caractères minimum, avec au moins une lettre et un chiffre"} className="input pr-10" placeholder={isLogin ? "••••••••" : "8 caractères, une lettre et un chiffre"} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}><Icon name="eye" /></button>
              </div>
            </div>
            {!isLogin && (
              <div className="-mt-2 space-y-2">
                <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < strength(password) ? (strength(password) >= 3 ? "bg-mint" : "bg-gold") : "bg-surface"}`} />)}</div>
                <p className="flex items-center justify-between text-[11px] text-muted">
                  <span>{password ? ["Trop court", "Faible", "Correct", "Solide", "Très solide"][strength(password)] : "Ton navigateur peut aussi proposer et retenir un mot de passe."}</span>
                  <button type="button" className="font-semibold text-brand hover:underline" onClick={() => { setPassword(suggestPassword()); setShow(true); }}>Suggérer un mot de passe</button>
                </p>
              </div>
            )}
            {!isLogin && (
              <label className="flex items-start gap-2 text-xs text-muted">
                <input type="checkbox" className="mt-0.5 accent-[#3ee0a8]" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                J&apos;accepte que mes informations servent au matching et à la préparation de mes candidatures. Elles ne sont jamais vendues ni utilisées pour entraîner un modèle, et je peux supprimer mon compte à tout moment.
              </label>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? "…" : isLogin ? "Se connecter" : "Créer mon compte"} <Icon name="arrow" /></button>
          </form>
          {!onClose && <p className="mt-6 text-center text-xs text-muted"><Link href="/" className="hover:text-ink">← Retour à l&apos;accueil</Link></p>}
      </div>
    </div>
  );
}

