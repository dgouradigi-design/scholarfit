"""Assistant conversationnel de recherche.

Principe : l'IA ne répond jamais de mémoire sur les bourses. Elle (ou l'analyseur par
règles, sans clé API) extrait seulement des critères du message ; la recherche se fait
ensuite dans notre base avec le moteur de matching. Les liens affichés sont donc ceux
stockés dans les fiches.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date

from ..vocab import COUNTRIES, COUNTRY_KEYWORDS, DOMAIN_KEYWORDS, DOMAINS, LEVELS
from .client import ask_json

MONTHS = {
    "janvier": 1, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6, "juillet": 7,
    "aout": 8, "septembre": 9, "octobre": 10, "novembre": 11, "decembre": 12,
}


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def _find_countries(text: str) -> list[str]:
    t = _norm(text)
    found: list[tuple[int, str]] = []
    for code, words in COUNTRY_KEYWORDS.items():
        for w in words:
            m = re.search(r"(?<![a-z])" + re.escape(_norm(w)) + r"(?![a-z])", t)
            if m:
                found.append((m.start(), code))
                break
    return [c for _, c in sorted(found)]


def parse_rules(message: str, today: date | None = None) -> dict:
    """Extraction de critères par règles simples (mode hors-ligne)."""
    today = today or date.today()
    t = _norm(message)
    out: dict = {}

    # --- niveau visé
    if re.search(r"doctorat|these|phd|post-?doc|bac\s?\+\s?8", t):
        out["target_level"] = "BAC7"
    elif re.search(r"\bmaster\b|\bmsc\b|mastere|bac\s?\+\s?5", t):
        out["target_level"] = "BAC5"
    elif re.search(r"\blicence\b|bachelor|\bbts\b|bac\s?\+\s?3|apres (le|mon) bac|entrer a l.universite", t):
        out["target_level"] = "BAC3"
    elif re.search(r"terminale|\bau lycee\b|passe (le|mon) bac", t):
        out["target_level"] = "BAC3"
    if re.search(r"\b(l3|licence 3|bac\s?\+\s?3)\b", t) and "target_level" not in out:
        out["target_level"] = "BAC5"
    if re.search(r"\b(m2|master 2)\b", t) and not re.search(r"je (veux|vise|cherche) un master", t):
        out["target_level"] = "BAC7"
    m = re.search(r"\b(bac|bac3|bac5|bac7)\b", t)  # valeurs des réponses rapides
    if m and "target_level" not in out:
        out["target_level"] = m.group(1).upper()

    # --- âge
    m = re.search(r"\b(1[5-9]|[2-5]\d)\s*ans\b", t)
    if m:
        out["age"] = int(m.group(1))

    # --- nationalité / pays souhaités : ce qui précède « je veux / étudier / partir » = origine
    split = re.split(r"\b(veux|voudrais|souhaite|aimerais|vise|cherche|partir|aller|etudier en|etudier au|etudier aux)\b", t, maxsplit=1)
    before, after = split[0], "".join(split[1:]) if len(split) > 1 else ""
    origin = _find_countries(before)
    wished = _find_countries(after)
    if re.search(r"nationalit|je suis [a-z]+(e|ne)?\b", before) or origin:
        if origin:
            out["nationalities"] = origin[:2]
    if wished:
        out["wished_countries"] = wished
    if re.search(r"(n.importe quel pays|peu importe le pays|tous les pays|partout)", t):
        out["wished_countries"] = []

    # --- domaine
    for code, words in DOMAIN_KEYWORDS.items():
        if any(re.search(r"(?<![a-z])" + re.escape(_norm(w)), t) for w in words):
            out["domain"] = code
            break
    if re.search(r"tous (les )?domaines|peu importe le domaine", t):
        out["domain"] = "tous"
    m = re.search(r"\b(" + "|".join(DOMAINS) + r")\b", t)
    if m:
        out["domain"] = m.group(1)

    # --- financement
    if re.search(r"(complete|completes|totale|integrale|tout finance|100 ?%)", t):
        out["full_funding_only"] = True
    if re.search(r"(partielle|partiel|peu importe le financement)", t):
        out["full_funding_only"] = False

    # --- date limite après un mois
    m = re.search(r"apres (" + "|".join(MONTHS) + r")", t)
    if m:
        month = MONTHS[m.group(1)]
        year = today.year if month >= today.month else today.year + 1
        out["deadline_after"] = date(year, month, 28 if month == 2 else 30).isoformat()

    # --- note
    m = re.search(r"(\d{1,2}(?:[.,]\d+)?)\s*/\s*20", t)
    if m:
        out["grade_average"] = float(m.group(1).replace(",", "."))

    # --- tests de langue
    for test in ("ielts", "toefl", "delf", "dalf", "tcf", "testdaf"):
        m = re.search(test + r"\s*:?\s*(\d+(?:[.,]\d)?)", t)
        if m:
            out.setdefault("language_scores", {})[test.upper() if test != "testdaf" else "TestDaF"] = float(m.group(1).replace(",", "."))
    return out


AI_SCHEMA = {
    "type": "object",
    "properties": {
        "target_level": {"type": ["string", "null"], "enum": [*LEVELS.keys(), None]},
        "age": {"type": ["integer", "null"]},
        "nationalities": {"type": "array", "items": {"type": "string"}},
        "wished_countries": {"type": "array", "items": {"type": "string"}},
        "domain": {"type": ["string", "null"], "enum": [*DOMAINS.keys(), None]},
        "full_funding_only": {"type": ["boolean", "null"]},
        "grade_average": {"type": ["number", "null"]},
        "deadline_after": {"type": ["string", "null"]},
    },
    "required": ["target_level", "age", "nationalities", "wished_countries", "domain", "full_funding_only", "grade_average", "deadline_after"],
    "additionalProperties": False,
}

AI_SYSTEM = f"""Tu extrais des critères de recherche de bourses d'études depuis le dernier message d'un étudiant.
Tu ne réponds pas à l'étudiant et tu n'inventes aucune bourse : tu remplis seulement le JSON.
- target_level : diplôme que l'étudiant VEUT financer. BAC = lycée ou année préparatoire, BAC3 = licence
  ou bachelor, BAC5 = master, BAC7 = doctorat ou post-doc. Un étudiant en L3 qui veut un master → BAC5.
- nationalities et wished_countries : codes ISO 3166-1 alpha-2 (SN, FR, CA…). Un pays d'origine ou de
  résidence n'est pas un pays souhaité.
- domain : un des codes {', '.join(DOMAINS)}.
- deadline_after : date AAAA-MM-JJ si l'étudiant veut une date limite après un mois donné.
- Mets null ou une liste vide pour ce qui n'est pas dit dans le message. Ne devine pas l'âge."""


def extract_criteria(message: str, previous: dict, use_ai: bool, today: date | None = None) -> tuple[dict, bool]:
    """Fusionne les critères déjà connus avec ceux du nouveau message."""
    today = today or date.today()
    extracted: dict | None = None
    ai_used = False
    if use_ai:
        context = f"Date du jour : {today.isoformat()}.\nCritères déjà connus : {previous}\nDernier message : {message}"
        extracted = ask_json(AI_SYSTEM, context, AI_SCHEMA, effort="low", max_tokens=2000)
        if extracted is not None:
            ai_used = True
            extracted = {k: v for k, v in extracted.items() if v not in (None, [], "")}
            extracted["nationalities"] = [c for c in extracted.get("nationalities", []) if len(c) == 2]
            extracted["wished_countries"] = [c for c in extracted.get("wished_countries", []) if len(c) == 2]
            extracted = {k: v for k, v in extracted.items() if v not in (None, [])}
    if extracted is None:
        extracted = parse_rules(message, today)
    merged = {**previous, **extracted}
    return merged, ai_used


QUESTIONS = {
    "target_level": (
        "Quel niveau d'études veux-tu financer ?",
        [("Licence / bachelor", "Je vise une licence"), ("Master", "Je vise un master"),
         ("Doctorat", "Je vise un doctorat"), ("Après le bac", "Je passe mon bac")],
    ),
    "nationalities": (
        "Quelle est ta nationalité ? (beaucoup de bourses en dépendent)",
        [("Sénégal", "Je suis sénégalais"), ("Côte d'Ivoire", "Je suis ivoirien"),
         ("Cameroun", "Je suis camerounais"), ("Maroc", "Je suis du Maroc"), ("France", "Je suis français")],
    ),
    "domain": (
        "Dans quel domaine veux-tu étudier ?",
        [("Informatique", "informatique"), ("Économie / gestion", "economie"), ("Ingénierie", "ingenierie"),
         ("Médecine / santé", "medecine"), ("Biologie", "biologie"), ("Tous domaines", "tous domaines")],
    ),
    "age": ("Quel âge as-tu ? Certaines bourses ont un âge maximum.", []),
}


def next_question(criteria: dict) -> tuple[str | None, list[dict], list[str]]:
    missing = [k for k in ("target_level", "nationalities", "domain", "age") if not criteria.get(k)]
    if not missing:
        return None, [], []
    q, replies = QUESTIONS[missing[0]]
    labels = {"target_level": "niveau visé", "nationalities": "nationalité", "domain": "domaine", "age": "âge"}
    return q, [{"label": a, "value": b} for a, b in replies], [labels[m] for m in missing]


def summarize_understanding(c: dict) -> str:
    parts = []
    if c.get("target_level"):
        parts.append(LEVELS[c["target_level"]])
    if c.get("domain"):
        parts.append(DOMAINS.get(c["domain"], c["domain"]).lower())
    if c.get("nationalities"):
        parts.append("nationalité " + ", ".join(COUNTRIES.get(n, n) for n in c["nationalities"]))
    if c.get("wished_countries"):
        parts.append("pour étudier en " + ", ".join(COUNTRIES.get(n, n) for n in c["wished_countries"]))
    if c.get("age"):
        parts.append(f"{c['age']} ans")
    if c.get("full_funding_only"):
        parts.append("financement complet uniquement")
    return " · ".join(parts)
