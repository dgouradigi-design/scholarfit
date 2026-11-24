/* Drapeau d'un pays (code ISO à deux lettres), servi depuis public/flags (paquet flag-icons, licence MIT). */
export default function Flag({ code, className = "h-3.5 w-5" }: { code: string; className?: string }) {
  const c = code.toLowerCase();
  if (!/^[a-z]{2}$/.test(c)) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/flags/${c}.svg`} alt="" aria-hidden="true" loading="lazy" className={`inline-block shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.12)] ${className}`} />;
}
