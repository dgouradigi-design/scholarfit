"use client";
import { ElementType, KeyboardEvent } from "react";

/**
 * Texte modifiable directement sur la page, comme dans un traitement de texte.
 * La valeur est relue à la sortie du champ (onBlur) : pas de saut du curseur pendant la frappe.
 */
export default function Editable({
  value, onChange, editable, as = "span", className = "", multiline = false, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const Tag = as;
  if (!editable) return <Tag className={className}>{value}</Tag>;
  return (
    <Tag
      key={value}
      className={`${className} rounded-sm outline-none transition hover:bg-[#fff6d6] focus:bg-[#fff6d6] focus:ring-1 focus:ring-[#e6c35c] empty:before:text-[#9a9a9a] empty:before:content-[attr(data-placeholder)]`}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder ?? ""}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = (e.currentTarget.innerText || "").replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trim();
        if (v !== value) onChange(v);
      }}
    >
      {value}
    </Tag>
  );
}
