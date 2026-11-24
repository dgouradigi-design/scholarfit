"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Match, Meta, api, getMeta } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import Icon from "./Icon";
import ScholarshipCard from "./ScholarshipCard";
import { useT } from "@/components/LangProvider";

type Msg = { role: "user" | "assistant"; content: string };
type ChatOut = {
  reply: string;
  criteria: Record<string, unknown>;
  missing: string[];
  quick_replies: { label: string; value: string }[];
  results: Match[];
  ai_used: boolean;
};

const EXAMPLES = [
  "Je suis en L3 de biologie au Sénégal, j'ai 22 ans, je veux un master en France ou au Canada",
  "Ivoirien, 26 ans, je cherche un doctorat en physique en Allemagne, bourse complète",
  "Je passe mon bac au Cameroun et je veux étudier l'informatique",
];

export default function Chat() {
  const { t, lang } = useT();
  const { me } = useAuth();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: t("Bonjour ! Indiquez votre niveau, votre nationalité, votre domaine et les pays qui vous intéressent. Nous vous proposons les bourses auxquelles vous pouvez prétendre.") },
  ]);
  const [criteria, setCriteria] = useState<Record<string, unknown>>({});
  const [quick, setQuick] = useState<ChatOut["quick_replies"]>([]);
  const [results, setResults] = useState<Match[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getMeta().then(setMeta).catch(() => {}); }, []);
  // On fait défiler seulement la zone du chat (pas la page entière).
  useEffect(() => {
    const box = boxRef.current;
    if (box && messages.length > 1) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const out = await api<ChatOut>("/api/chat", { method: "POST", body: JSON.stringify({ messages: next, criteria }) });
      setMessages([...next, { role: "assistant", content: out.reply }]);
      setCriteria(out.criteria);
      setQuick(out.quick_replies);
      if (out.results.length || !out.missing.length) setResults(out.results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="card flex h-[560px] flex-col overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <h2 className="flex items-center gap-2 text-lg"><span className="grid h-7 w-7 place-items-center rounded-lg bg-mint text-[#04140e]"><Icon name="sparkle" className="h-4 w-4" /></span>{t("Assistant de recherche")}</h2>
          <p className="text-xs text-muted">{t("Décrivez votre projet, nous trouvons les bourses qui vous correspondent.")}</p>
        </div>
        <div ref={boxRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-mint text-[#04140e]" : "bg-surface text-ink"}`}>{m.content}</div>
            </div>
          ))}
          {busy && <div className="text-sm text-muted">{t("Je cherche…")}</div>}
          {messages.length === 1 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted">{t("Exemples :")}</p>
              {EXAMPLES.map((x) => t(x)).map((e) => (
                <button key={e} onClick={() => send(e)} className="block w-full rounded-lg border border-dashed border-line px-3 py-2 text-left text-sm text-muted hover:border-brand hover:text-ink">{lang === "en" ? `“${e}”` : `« ${e} »`}</button>
              ))}
            </div>
          )}
        </div>
        {quick.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
            {quick.map((q) => (
              <button key={q.label} onClick={() => send(q.value)} className="rounded-full border border-brand/40 bg-brand-soft px-3 py-1 text-xs font-medium text-brand-dark hover:bg-mint hover:text-[#04140e]">{t(q.label)}</button>
            ))}
          </div>
        )}
        {error && <p className="px-5 pb-2 text-sm text-danger">{error}</p>}
        <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("Écrivez ce que vous cherchez…")} aria-label={t("Message")} />
          <button className="btn-primary" disabled={busy || !input.trim()}>{t("Envoyer")}</button>
        </form>
      </div>

      <div className="space-y-4">
        {results.length === 0 ? (
          <div className="card grid h-full min-h-[300px] place-items-center p-8 text-center text-muted">
            <div>
              <Icon name="star" className="mx-auto mb-3 h-7 w-7 text-brand" />
              <p className="font-serif text-xl text-ink">{t("Vos bourses apparaîtront ici")}</p>
              <p className="mt-2 text-sm">{t("Dès que je connais votre niveau visé, votre nationalité, votre âge et votre domaine.")}</p>
            </div>
          </div>
        ) : (
          <>
            {results.map((m) => <ScholarshipCard key={m.scholarship.id} s={m.scholarship} match={me ? m : undefined} lockedScore={!me} meta={meta} loggedIn={!!me} />)}
            {!me && (
              <div className="card border-brand/40 p-5 text-sm">
                <p className="font-semibold text-brand-dark">{t("Créez votre compte gratuit pour voir votre score sur chaque bourse, selon votre profil, et préparer votre dossier.")}</p>
                <Link href="/connexion?mode=inscription" className="btn-primary mt-3">{t("Créer mon compte")}</Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
