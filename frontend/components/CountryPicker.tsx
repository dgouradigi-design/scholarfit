"use client";

export default function CountryPicker({ value, onChange, countries, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; countries: Record<string, string>; placeholder: string;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-dark">
            {countries[c] ?? c}
            <button type="button" aria-label={`Retirer ${countries[c] ?? c}`} onClick={() => onChange(value.filter((x) => x !== c))}>×</button>
          </span>
        ))}
      </div>
      <select className="input" value="" onChange={(e) => e.target.value && !value.includes(e.target.value) && onChange([...value, e.target.value])}>
        <option value="">{placeholder}</option>
        {Object.entries(countries).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}
