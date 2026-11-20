/** Illustration : une étudiante et un étudiant, sac au dos, devant un globe en pointillés. */
export default function StudentsIllustration({ className = "" }: { className?: string }) {
  const dots: [number, number][] = [];
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 22; x++) {
      const cx = 30 + x * 16 + (y % 2) * 8, cy = 392 + y * 14;
      if (Math.hypot(cx - 200, cy - 560) < 205) dots.push([cx, cy]);
    }
  return (
    <svg viewBox="0 0 400 520" className={className} role="img" aria-label="Une étudiante et un étudiant avec leur sac à dos">
      <defs>
        <radialGradient id="si-glow" cx="50%" cy="80%" r="60%">
          <stop offset="0" stopColor="#3ee0a8" stopOpacity="0.16" />
          <stop offset="1" stopColor="#3ee0a8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="si-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f2140" />
          <stop offset="1" stopColor="#0b0b19" />
        </linearGradient>
      </defs>
      <rect width="400" height="520" fill="url(#si-glow)" />
      {/* étoiles */}
      {[[40, 60, 1.4], [92, 120, 1], [330, 70, 1.6], [360, 150, 1], [60, 220, 1.1], [300, 230, 1.3], [210, 40, 1], [150, 90, 0.9]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 3 === 0 ? "#ffb547" : "#ffffff"} opacity={0.7} />
      ))}
      {/* globe en pointillés */}
      <circle cx="200" cy="560" r="210" fill="url(#si-ground)" stroke="rgba(170,175,230,0.25)" />
      {dots.map(([x, y], i) => <rect key={i} x={x} y={y} width="3" height="3" fill="#c4c8e0" opacity={0.28} />)}
      {[[118, 420], [262, 410], [310, 448], [176, 452]].map(([x, y], i) => (
        <g key={i}><circle cx={x} cy={y} r="9" fill="#ffb547" opacity="0.18" /><circle cx={x} cy={y} r="4" fill="#ffc36b" /></g>
      ))}

      {/* ÉTUDIANTE (à gauche) */}
      <g>
        {/* sac à dos */}
        <rect x="84" y="226" width="58" height="84" rx="16" fill="#ffb547" />
        <rect x="92" y="262" width="42" height="30" rx="8" fill="#e09a2c" />
        {/* jambes */}
        <path d="M120 360 L114 438" stroke="#2b2f5a" strokeWidth="18" strokeLinecap="round" />
        <path d="M146 360 L152 438" stroke="#2b2f5a" strokeWidth="18" strokeLinecap="round" />
        <path d="M104 440 h22 a6 6 0 0 1 0 12 h-26 z" fill="#f4f1ea" />
        <path d="M144 440 h22 a6 6 0 0 1 4 12 h-26 z" fill="#f4f1ea" />
        {/* corps */}
        <path d="M104 250 q29 -18 58 0 l8 112 h-74 z" fill="#3ee0a8" />
        <path d="M104 250 q29 -18 58 0 l2 18 q-31 -14 -62 0 z" fill="#2fc493" />
        {/* bretelles */}
        <path d="M112 248 L116 322" stroke="#c97f12" strokeWidth="6" strokeLinecap="round" />
        <path d="M154 248 L150 322" stroke="#c97f12" strokeWidth="6" strokeLinecap="round" />
        {/* bras + livre */}
        <path d="M162 262 q16 34 6 60" stroke="#8a5a3c" strokeWidth="13" strokeLinecap="round" fill="none" />
        <path d="M104 262 q-12 36 -2 64" stroke="#8a5a3c" strokeWidth="13" strokeLinecap="round" fill="none" />
        <rect x="156" y="300" width="30" height="38" rx="4" fill="#f4f1ea" transform="rotate(8 171 319)" />
        <rect x="160" y="304" width="22" height="4" rx="2" fill="#ffb547" transform="rotate(8 171 319)" />
        {/* cou et tête */}
        <rect x="126" y="222" width="14" height="20" rx="6" fill="#7a4d32" />
        <circle cx="133" cy="196" r="30" fill="#8a5a3c" />
        {/* cheveux : afro avec chignon */}
        <path d="M103 196 q-4 -40 30 -42 q34 2 30 42 q-6 -22 -30 -24 q-24 2 -30 24 z" fill="#1b1626" />
        <circle cx="133" cy="150" r="15" fill="#1b1626" />
        {/* visage */}
        <circle cx="123" cy="200" r="2.6" fill="#1b1626" />
        <circle cx="143" cy="200" r="2.6" fill="#1b1626" />
        <path d="M126 213 q7 6 14 0" stroke="#1b1626" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="104" cy="204" r="3" fill="#ffb547" />
      </g>

      {/* ÉTUDIANT (à droite) */}
      <g>
        {/* sac à dos */}
        <rect x="258" y="220" width="62" height="90" rx="16" fill="#3ee0a8" />
        <rect x="266" y="258" width="46" height="32" rx="8" fill="#2fc493" />
        {/* jambes */}
        <path d="M238 360 L232 438" stroke="#14152b" strokeWidth="20" strokeLinecap="round" />
        <path d="M266 360 L272 438" stroke="#14152b" strokeWidth="20" strokeLinecap="round" />
        <path d="M220 440 h24 a6 6 0 0 1 0 13 h-28 z" fill="#ffb547" />
        <path d="M262 440 h24 a6 6 0 0 1 4 13 h-28 z" fill="#ffb547" />
        {/* corps */}
        <path d="M218 246 q34 -20 66 0 l6 120 h-78 z" fill="#f4f1ea" />
        <path d="M240 236 l11 22 l11 -22 z" fill="#d8d3c6" />
        {/* bretelles */}
        <path d="M228 246 L232 330" stroke="#1f8a66" strokeWidth="7" strokeLinecap="round" />
        <path d="M274 246 L270 330" stroke="#1f8a66" strokeWidth="7" strokeLinecap="round" />
        {/* bras : l'un tient la bretelle, l'autre fait signe */}
        <path d="M218 260 q-14 34 -4 64" stroke="#5c3a26" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M284 258 q22 -22 26 -58" stroke="#5c3a26" strokeWidth="14" strokeLinecap="round" fill="none" />
        <circle cx="311" cy="194" r="9" fill="#5c3a26" />
        {/* cou et tête */}
        <rect x="243" y="216" width="16" height="22" rx="6" fill="#4e311f" />
        <circle cx="251" cy="190" r="31" fill="#5c3a26" />
        {/* cheveux courts */}
        <path d="M220 186 q2 -36 31 -36 q30 0 31 36 q-8 -16 -31 -18 q-22 2 -31 18 z" fill="#14101c" />
        {/* visage */}
        <circle cx="241" cy="194" r="2.6" fill="#14101c" />
        <circle cx="261" cy="194" r="2.6" fill="#14101c" />
        <path d="M243 207 q8 7 16 0" stroke="#14101c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </g>

      {/* petit avion en pointillés entre eux et le monde */}
      <path d="M60 300 q60 -150 170 -190 q70 -24 120 -4" stroke="#ffb547" strokeWidth="1.6" strokeDasharray="3 6" fill="none" opacity="0.7" />
      <path d="M350 106 l-14 -6 l3 6 l-3 6 z" fill="#ffb547" />
    </svg>
  );
}
