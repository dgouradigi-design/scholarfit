"use client";
import { LetterData } from "@/lib/docs";
import Editable from "./Editable";

/** Aperçu de la lettre, disposée comme le PDF et le fichier Word, modifiable sur place. */
export default function PaperLetter({ letter, editable, onChange }: { letter: LetterData; editable: boolean; onChange: (l: LetterData) => void }) {
  const fr = letter.style === "fr";
  const setLines = (k: "sender" | "recipient", v: string) => onChange({ ...letter, [k]: v.split("\n").map((x) => x.trim()).filter(Boolean) });
  const setPara = (i: number, v: string) => {
    // Un double saut de ligne dans un paragraphe le coupe en deux
    const parts = v.split(/\n\s*\n/).map((x) => x.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
    const paragraphs = [...letter.paragraphs.slice(0, i), ...parts, ...letter.paragraphs.slice(i + 1)];
    onChange({ ...letter, paragraphs });
  };
  const field = (k: keyof LetterData, v: string) => onChange({ ...letter, [k]: v });

  return (
    <article
      className="mx-auto w-full max-w-[794px] bg-white px-6 py-8 text-[14px] leading-[1.6] text-[#111] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)] ring-1 ring-black/5 sm:px-[72px] sm:py-16 sm:text-[15px]"
      style={{ fontFamily: "Cambria, Caladea, Georgia, 'Times New Roman', serif" }}
    >
      <Editable as="div" multiline editable={editable} value={letter.sender.join("\n")} onChange={(v) => setLines("sender", v)} className="block whitespace-pre-line" />

      {fr ? (
        <>
          <Editable as="div" multiline editable={editable} value={letter.recipient.join("\n")} onChange={(v) => setLines("recipient", v)}
            className="mt-6 ml-auto block w-full whitespace-pre-line sm:w-[46%]" />
          <Editable as="p" editable={editable} value={letter.place_date} onChange={(v) => field("place_date", v)} className="mt-6 block text-right" />
        </>
      ) : (
        <>
          <Editable as="p" editable={editable} value={letter.place_date} onChange={(v) => field("place_date", v)} className="mt-6 block" />
          <Editable as="div" multiline editable={editable} value={letter.recipient.join("\n")} onChange={(v) => setLines("recipient", v)} className="mt-5 block whitespace-pre-line" />
        </>
      )}

      <Editable as="p" editable={editable} value={letter.subject} onChange={(v) => field("subject", v)} className="mt-8 block font-bold" />
      <Editable as="p" editable={editable} value={letter.salutation} onChange={(v) => field("salutation", v)} className="mt-5 block" />

      <div className="mt-3 space-y-3 text-justify" lang={letter.language}>
        {letter.paragraphs.map((p, i) => (
          <Editable key={i} as="p" multiline editable={editable} value={p} onChange={(v) => setPara(i, v)} className="block" />
        ))}
      </div>

      {fr ? (
        <>
          <Editable as="p" multiline editable={editable} value={letter.closing} onChange={(v) => field("closing", v)} className="mt-3 block text-justify" />
          <Editable as="p" editable={editable} value={letter.signature} onChange={(v) => field("signature", v)} className="mt-8 ml-auto block w-full sm:w-[46%]" />
        </>
      ) : (
        <>
          <Editable as="p" editable={editable} value={letter.closing} onChange={(v) => field("closing", v)} className="mt-5 block" />
          <Editable as="p" editable={editable} value={letter.signature} onChange={(v) => field("signature", v)} className="mt-10 block" />
        </>
      )}
    </article>
  );
}
