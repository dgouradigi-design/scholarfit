/* Petites illustrations du site, dans la palette ScholarFit (menthe, or, nuit, crème). */

const MINT = "#3ee0a8", GOLD = "#ffb547", NIGHT = "#1f2140", CREAM = "#f4f1ea";

/** Stage : un poste de travail avec ordinateur, badge et plante. */
export function InternshipArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 160" className={className} aria-hidden="true">
      <ellipse cx="110" cy="146" rx="92" ry="8" fill={MINT} opacity="0.12" />
      <rect x="22" y="112" width="176" height="8" rx="4" fill="#2b2f5a" />
      <rect x="40" y="120" width="8" height="26" rx="3" fill="#2b2f5a" />
      <rect x="172" y="120" width="8" height="26" rx="3" fill="#2b2f5a" />
      <g className="animate-float-slow">
        <rect x="62" y="44" width="96" height="64" rx="8" fill={NIGHT} stroke="rgba(170,175,230,0.35)" />
        <rect x="70" y="52" width="80" height="48" rx="4" fill="#14152b" />
        <rect x="78" y="60" width="38" height="5" rx="2.5" fill={MINT} />
        <rect x="78" y="70" width="58" height="4" rx="2" fill="#c4c8e0" opacity="0.5" />
        <rect x="78" y="78" width="48" height="4" rx="2" fill="#c4c8e0" opacity="0.5" />
        <rect x="78" y="88" width="22" height="7" rx="3.5" fill={GOLD} />
      </g>
      <path d="M96 108 h28 l4 4 h-36 z" fill="#c4c8e0" opacity="0.6" />
      <g className="animate-sway">
        <rect x="168" y="90" width="18" height="22" rx="4" fill={GOLD} />
        <path d="M177 90 q-14 -18 -4 -34 q6 14 4 34" fill={MINT} />
        <path d="M177 90 q12 -14 6 -30 q-10 12 -6 30" fill="#2fc493" />
      </g>
      <g className="animate-float">
        <rect x="18" y="58" width="34" height="44" rx="6" fill={CREAM} />
        <rect x="30" y="52" width="10" height="10" rx="3" fill="#c4c8e0" />
        <circle cx="35" cy="74" r="7" fill={MINT} />
        <rect x="25" y="86" width="20" height="4" rx="2" fill="#2b2f5a" opacity="0.5" />
        <rect x="28" y="93" width="14" height="3" rx="1.5" fill="#2b2f5a" opacity="0.3" />
      </g>
      <circle cx="196" cy="34" r="3" fill={GOLD} className="animate-pulse-dot" />
      <circle cx="30" cy="28" r="2" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}

/** Conférence : un pupitre, un micro et des bulles de discussion. */
export function ConferenceArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 160" className={className} aria-hidden="true">
      <ellipse cx="110" cy="146" rx="92" ry="8" fill={GOLD} opacity="0.12" />
      <path d="M70 92 h80 l-8 54 h-64 z" fill="#2b2f5a" />
      <rect x="64" y="84" width="92" height="10" rx="4" fill={NIGHT} stroke="rgba(170,175,230,0.35)" />
      <rect x="96" y="108" width="28" height="18" rx="4" fill={MINT} opacity="0.9" />
      <path d="M110 84 v-22" stroke="#c4c8e0" strokeWidth="3" strokeLinecap="round" />
      <rect x="103" y="46" width="14" height="20" rx="7" fill={GOLD} />
      <g className="animate-float">
        <rect x="18" y="26" width="58" height="34" rx="10" fill={CREAM} />
        <path d="M34 60 l-4 12 l14 -12 z" fill={CREAM} />
        <rect x="28" y="36" width="38" height="4" rx="2" fill="#2b2f5a" opacity="0.5" />
        <rect x="28" y="45" width="26" height="4" rx="2" fill="#2b2f5a" opacity="0.3" />
      </g>
      <g className="animate-float-slow">
        <rect x="146" y="14" width="58" height="34" rx="10" fill={MINT} />
        <path d="M186 48 l6 12 l-16 -12 z" fill={MINT} />
        <circle cx="162" cy="31" r="3.5" fill="#04140e" />
        <circle cx="175" cy="31" r="3.5" fill="#04140e" />
        <circle cx="188" cy="31" r="3.5" fill="#04140e" />
      </g>
      {[[30, 128], [52, 136], [168, 128], [190, 136]].map(([x, y], i) => (
        <g key={i}><circle cx={x} cy={y - 14} r="7" fill={i % 2 ? GOLD : "#c4c8e0"} opacity="0.85" /><rect x={x - 9} y={y - 6} width="18" height="14" rx="7" fill={i % 2 ? "#e09a2c" : "#8d91b5"} opacity="0.85" /></g>
      ))}
      <circle cx="132" cy="70" r="2.5" fill={GOLD} className="animate-pulse-dot" />
    </svg>
  );
}

/** Questions : une fiche cochée et une loupe. */
export function ChecklistArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 180" className={className} aria-hidden="true">
      <ellipse cx="110" cy="166" rx="80" ry="8" fill={MINT} opacity="0.12" />
      <g className="animate-float-slow">
        <rect x="46" y="18" width="110" height="140" rx="12" fill={NIGHT} stroke="rgba(170,175,230,0.35)" />
        <rect x="76" y="10" width="50" height="16" rx="8" fill={GOLD} />
        {[48, 78, 108].map((y, i) => (
          <g key={y}>
            <rect x="62" y={y} width="16" height="16" rx="5" fill={i < 2 ? MINT : "transparent"} stroke={i < 2 ? MINT : "#c4c8e0"} strokeOpacity="0.6" />
            {i < 2 && <path d={`M66 ${y + 8} l3.5 3.5 l6 -7`} stroke="#04140e" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            <rect x="86" y={y + 3} width="54" height="4" rx="2" fill="#c4c8e0" opacity="0.55" />
            <rect x="86" y={y + 10} width="36" height="3" rx="1.5" fill="#c4c8e0" opacity="0.3" />
          </g>
        ))}
      </g>
      <g className="animate-float">
        <circle cx="160" cy="118" r="22" fill="none" stroke={CREAM} strokeWidth="7" />
        <circle cx="160" cy="118" r="15" fill={MINT} opacity="0.18" />
        <path d="M176 134 l18 18" stroke={CREAM} strokeWidth="9" strokeLinecap="round" />
      </g>
      <circle cx="30" cy="40" r="3" fill={GOLD} className="animate-pulse-dot" />
      <circle cx="196" cy="56" r="2" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}

/** Dons : une main qui tient un cœur. */
export function HeartArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <ellipse cx="100" cy="138" rx="70" ry="7" fill={GOLD} opacity="0.12" />
      <g className="animate-beat">
        <path d="M100 74 c-22 -16 -38 -28 -38 -44 c0 -12 9 -20 20 -20 c8 0 14 5 18 11 c4 -6 10 -11 18 -11 c11 0 20 8 20 20 c0 16 -16 28 -38 44 z" fill={MINT} />
        <path d="M80 24 q-8 2 -8 12" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
      <path d="M30 120 q24 -30 54 -24 l34 6 q10 2 8 11 q-2 8 -12 7 l-22 -3 l34 4 q14 -10 30 -24 q9 -7 15 0 q5 6 -2 13 q-20 22 -44 30 h-70 z" fill="#8a5a3c" />
      <path d="M30 120 h-16 v18 h20 z" fill={NIGHT} />
      <circle cx="160" cy="34" r="3" fill={GOLD} className="animate-pulse-dot" />
      <circle cx="40" cy="50" r="2" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}
