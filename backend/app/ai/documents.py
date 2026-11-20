"""Amélioration de CV et lettres de motivation.

Règle d'or : l'IA aide à mieux présenter ce que l'étudiant a réellement fait. Elle
n'invente jamais d'expérience, de note ou de diplôme. Chaque texte est un brouillon.
"""
from __future__ import annotations

import io
import re
from datetime import date

from ..models import Profile, Scholarship
from ..vocab import COUNTRIES, DOMAINS, LEVELS
from .client import ask_json, ask_text

# ------------------------------------------------------------------ import
def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        return "\n".join((page.extract_text() or "") for page in reader.pages).strip()
    if name.endswith(".docx"):
        import docx

        d = docx.Document(io.BytesIO(data))
        return "\n".join(p.text for p in d.paragraphs).strip()
    return data.decode("utf-8", errors="ignore").strip()


# ------------------------------------------------------------------ CV
SECTION_PATTERNS = {
    "formation": r"formation|[ée]ducation|parcours (scolaire|acad[ée]mique)|dipl[ôo]mes?|education",
    "experiences": r"exp[ée]riences?|stages?|emplois?|work experience|professional",
    "competences": r"comp[ée]tences|skills|savoir-faire|outils",
    "langues": r"langues|languages",
    "engagement": r"engagements?|associati|b[ée]n[ée]volat|vie associative|volunteer|activit[ée]s",
    "projets": r"projets?|projects|r[ée]alisations",
    "centres_interet": r"centres? d.int[ée]r[êe]ts?|loisirs|hobbies|interests",
}

ACTION_VERBS = [
    "organisé", "dirigé", "piloté", "créé", "conçu", "développé", "mené", "coordonné", "animé", "géré",
    "réalisé", "lancé", "amélioré", "analysé", "encadré", "formé", "rédigé", "présenté", "négocié",
    "mis en place", "optimisé", "fondé", "accompagné", "enseigné", "programmé", "construit", "réduit",
    "augmenté", "obtenu", "remporté", "led", "built", "created", "managed", "designed", "developed",
    "organized", "launched", "improved", "analyzed", "taught",
]
WEAK_STARTS = {
    r"^(j'ai )?(été )?responsable d[eu']\s*": "Piloté ",
    r"^(j'ai )?(été )?charg[ée]e? d[eu']\s*": "Assuré ",
    r"^participation [àa]\s*": "Contribué à ",
    r"^aide [àa]\s*": "Accompagné ",
    r"^j'ai fait\s*": "Réalisé ",
    r"^j'ai travaill[ée] (sur|dans)\s*": "Travaillé sur ",
    r"^gestion d[eu']\s*": "Géré ",
    r"^organisation d[eu']\s*": "Organisé ",
}

FORMAT_TIPS = {
    "francais": [
        "Une page pour un profil étudiant, deux au maximum pour un doctorant.",
        "Ordre conseillé : formation, expériences, compétences, langues, engagement.",
        "La photo est facultative en France ; elle n'est jamais obligatoire.",
    ],
    "europass": [
        "Utilise le modèle officiel Europass (europass.europa.eu) pour les bourses européennes.",
        "Indique tes langues avec les niveaux du CECRL (A1 à C2).",
        "Les dates vont du plus récent au plus ancien.",
    ],
    "us_resume": [
        "Une seule page, sans photo, sans âge ni situation familiale (règles anti-discrimination).",
        "Chaque ligne commence par un verbe d'action et un résultat chiffré si possible.",
        "Ajoute un GPA ou une conversion de ta moyenne si la bourse le demande.",
    ],
    "lebenslauf": [
        "Le Lebenslauf allemand est tabulaire, chronologique et daté (Ort, Datum) en bas de page.",
        "Une photo professionnelle reste courante mais n'est pas obligatoire.",
        "Mentionne précisément les dates (mois/année) de chaque étape, sans trou inexpliqué.",
    ],
    "academique": [
        "Pour un doctorat, mets en avant mémoire, publications, communications, stages de recherche.",
        "Ajoute les noms de tes directeurs de mémoire ou de stage (avec leur accord) comme références.",
        "La longueur peut dépasser deux pages si les publications le justifient.",
    ],
}


def split_sections(text: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {"entete": []}
    current = "entete"
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        found = None
        if len(line) < 45:
            for key, pat in SECTION_PATTERNS.items():
                if re.search(pat, line, re.I):
                    found = key
                    break
        if found:
            current = found
            sections.setdefault(current, [])
        else:
            sections.setdefault(current, []).append(line)
    return {k: "\n".join(v) for k, v in sections.items() if v}


def review_cv_rules(text: str, target_format: str = "francais", today: date | None = None) -> dict:
    today = today or date.today()
    sections = split_sections(text)
    lines = [l.strip("•-–* \t") for l in text.splitlines() if l.strip()]
    words = len(text.split())
    issues: list[dict] = []
    rewrites: list[dict] = []

    # Structure
    for key, label in [("formation", "Formation"), ("experiences", "Expériences"), ("langues", "Langues"), ("competences", "Compétences")]:
        if key not in sections:
            issues.append({"category": "structure", "message": f"Section « {label} » introuvable : ajoute-la avec un titre clair."})
    structure = max(0, 100 - 20 * sum(1 for i in issues if i["category"] == "structure"))

    # Verbes d'action
    content_lines = [l for l in lines if len(l.split()) >= 4]
    with_verbs = [l for l in content_lines if any(l.lower().startswith(v) for v in ACTION_VERBS)]
    verbs = int(100 * len(with_verbs) / max(1, len(content_lines))) if content_lines else 0
    verbs = min(100, verbs * 2)
    if verbs < 50:
        issues.append({"category": "verbes", "message": "Commence tes lignes d'expérience par un verbe d'action (organisé, conçu, encadré…)."})

    # Résultats chiffrés
    exp_text = sections.get("experiences", "") + "\n" + sections.get("projets", "") + "\n" + sections.get("engagement", "")
    exp_lines = [l for l in exp_text.splitlines() if len(l.split()) >= 4]
    quantified = [l for l in exp_lines if re.search(r"\d+\s*(%|personnes|élèves|participants|€|euros|fcfa|k|clients|membres|heures|projets)|\b\d{2,}\b", l, re.I)]
    numbers = int(100 * len(quantified) / max(1, len(exp_lines))) if exp_lines else 0
    numbers = min(100, numbers * 2)
    if numbers < 40:
        issues.append({"category": "resultats", "message": "Ajoute des résultats chiffrés là où c'est vrai : combien de personnes, quel budget, quel résultat."})

    # Longueur
    if words < 180:
        length = 50
        issues.append({"category": "longueur", "message": f"Ton CV est court ({words} mots) : détaille tes expériences et tes projets."})
    elif words > 900 and target_format != "academique":
        length = 60
        issues.append({"category": "longueur", "message": f"Ton CV est long ({words} mots) : vise une page, deux au maximum."})
    else:
        length = 100

    # Cohérence des dates
    years = [int(y) for y in re.findall(r"\b(19[6-9]\d|20[0-4]\d)\b", text)]
    dates = 100
    future = [y for y in years if y > today.year + 1]
    if future:
        dates -= 40
        issues.append({"category": "dates", "message": f"Date(s) dans le futur à vérifier : {', '.join(map(str, sorted(set(future))))}."})
    if not years:
        dates -= 40
        issues.append({"category": "dates", "message": "Aucune date trouvée : indique les années (ou mois/année) de chaque étape."})

    # Clarté
    long_lines = [l for l in lines if len(l.split()) > 35]
    clarity = max(40, 100 - 15 * len(long_lines))
    if long_lines:
        issues.append({"category": "clarte", "message": f"{len(long_lines)} ligne(s) trop longue(s) : coupe en phrases courtes, une idée par ligne."})

    # Réécritures proposées (structure seulement, aucun fait inventé)
    for l in lines:
        low = l.lower()
        for pat, verb in WEAK_STARTS.items():
            if re.match(pat, low):
                rest = re.sub(pat, "", low, count=1).strip()
                proposal = verb + rest
                if not re.search(r"\d", l):
                    proposal += " [ajoute un résultat réel : combien, pour qui, quel impact ?]"
                rewrites.append({"original": l, "proposal": proposal[0].upper() + proposal[1:], "why": "Un verbe d'action au début rend ton rôle plus clair."})
                break
        if len(rewrites) >= 8:
            break

    scores = {"structure": structure, "verbes_action": verbs, "resultats_chiffres": numbers, "longueur": length, "dates": dates, "clarte": clarity}
    overall = int(round(sum(scores.values()) / len(scores)))
    return {
        "score": overall,
        "scores": scores,
        "sections": sections,
        "issues": issues,
        "rewrites": rewrites,
        "format_tips": FORMAT_TIPS.get(target_format, FORMAT_TIPS["francais"]),
        "ai_used": False,
    }


CV_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {"type": "integer"},
        "scores": {
            "type": "object",
            "properties": {k: {"type": "integer"} for k in ["structure", "verbes_action", "resultats_chiffres", "longueur", "dates", "clarte", "orthographe"]},
            "required": ["structure", "verbes_action", "resultats_chiffres", "longueur", "dates", "clarte", "orthographe"],
            "additionalProperties": False,
        },
        "issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"category": {"type": "string"}, "message": {"type": "string"}},
                "required": ["category", "message"],
                "additionalProperties": False,
            },
        },
        "rewrites": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"original": {"type": "string"}, "proposal": {"type": "string"}, "why": {"type": "string"}},
                "required": ["original", "proposal", "why"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["score", "scores", "issues", "rewrites"],
    "additionalProperties": False,
}

CV_SYSTEM = """Tu es conseiller ou conseillère en candidatures de bourses d'études. Tu relis le CV d'un étudiant
et tu rends un diagnostic en français. Notes de 0 à 100 : structure, verbes_action, resultats_chiffres,
longueur, dates, clarte, orthographe. Liste les problèmes concrets (issues) et propose jusqu'à 10
réécritures ligne par ligne (rewrites) : original = la ligne exacte du CV, proposal = ta version.
Règle absolue : n'invente aucun fait, chiffre, diplôme ou expérience. Si un résultat chiffré manque,
écris un emplacement entre crochets, par exemple [nombre de participants], que l'étudiant remplira."""


def review_cv(text: str, target_format: str, scholarship: Scholarship | None, use_ai: bool) -> dict:
    base = review_cv_rules(text, target_format)
    if not use_ai:
        return base
    focus = ""
    if scholarship:
        focus = f"\nLe CV sera envoyé pour la bourse « {scholarship.title} » ({scholarship.organization}) : {scholarship.summary}\nMets en avant ce qui correspond à ses critères."
    user = f"Format visé : {target_format}.{focus}\n\nCV :\n{text[:15000]}"
    data = ask_json(CV_SYSTEM, user, CV_SCHEMA, effort="medium", max_tokens=8000)
    if data is None:
        return base
    data["sections"] = base["sections"]
    data["format_tips"] = base["format_tips"]
    data["ai_used"] = True
    return data


# ------------------------------------------------------------------ lettres
def _words(text: str) -> int:
    return len(re.findall(r"\S+", text))


def _trim(text: str, max_words: int) -> str:
    paragraphs = text.split("\n\n")
    while _words("\n\n".join(paragraphs)) > max_words and len(paragraphs) > 3:
        # on raccourcit le paragraphe central le plus long
        mid = max(range(1, len(paragraphs) - 1), key=lambda i: _words(paragraphs[i]))
        sentences = re.split(r"(?<=[.!?])\s+", paragraphs[mid])
        if len(sentences) <= 1:
            paragraphs.pop(mid)
        else:
            paragraphs[mid] = " ".join(sentences[:-1])
    return "\n\n".join(paragraphs)


def letter_template(p: Profile, s: Scholarship, answers: dict, language: str, max_words: int) -> str:
    name = p.full_name or "[Prénom Nom]"
    domain = DOMAINS.get(p.domain or "", "mon domaine").lower()
    level = LEVELS.get(p.target_level or "", "ce programme").split(" : ")[-1]
    t = s.title
    low = t.lower()
    if low.startswith("bourses") or low.startswith("prix"):
        bourse_fr = "les " + low[0] + t[1:] if low.startswith("bourses") else "le " + low[0] + t[1:]
    elif low.startswith("bourse"):
        bourse_fr = "la " + low[0] + t[1:]
    elif low.startswith("programme"):
        bourse_fr = "le " + low[0] + t[1:]
    else:
        bourse_fr = f"la bourse « {t} »"
    countries = ", ".join(COUNTRIES.get(c, c) for c in s.study_countries) or "ce pays"
    institution = p.institution or "[mon établissement actuel]"
    why_country = answers.get("why_country") or f"[Pourquoi {countries} ? Une raison personnelle et une raison académique.]"
    why_program = answers.get("why_program") or "[Ce qui t'attire précisément dans ce programme : un cours, un laboratoire, une méthode.]"
    project_after = answers.get("project_after") or p.project or "[Ton projet après les études, et ce qu'il apportera à ton pays ou à ta communauté.]"
    proud = answers.get("proud_of") or p.experiences or "[Une réalisation dont tu es fier ou fière, avec un résultat concret.]"
    if language == "en":
        text = f"""Dear Selection Committee,

I am applying for the {s.title} offered by {s.organization}. Currently studying at {institution} in {domain}, I am seeking support for my next step: {level}.

{proud}

Why {countries}: {why_country}

Why this programme: {why_program}

After my studies: {project_after}

The {s.title} would allow me to focus fully on my studies and to bring back skills that matter for my community. Thank you for considering my application.

Sincerely,
{name}"""
    else:
        text = f"""Madame, Monsieur,

Je vous adresse ma candidature pour {bourse_fr}, proposée par {s.organization}. Actuellement inscrit(e) en {domain} ({institution}), je souhaite poursuivre mon parcours en {level}.

{proud}

Pourquoi {countries} : {why_country}

Pourquoi ce programme : {why_program}

Mon projet après mes études : {project_after}

Cette bourse me permettrait de me consacrer pleinement à mes études et de revenir avec des compétences utiles à ma communauté. Je vous remercie de l'attention portée à ma candidature et me tiens à votre disposition pour un entretien.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{name}"""
    return _trim(text, max_words)


LETTER_SYSTEM = """Tu aides un étudiant à rédiger une lettre de motivation pour une bourse d'études.
Structure : accroche, parcours, projet, adéquation avec la bourse, conclusion. Écris dans la langue
demandée, sous la limite de mots, au ton demandé. Utilise UNIQUEMENT les faits fournis (profil, CV,
réponses). N'invente aucune expérience, note, prix, chiffre ou nom propre. S'il manque une information
utile, laisse un emplacement entre crochets, par exemple [nom du laboratoire visé]. Évite les phrases
génériques : chaque paragraphe doit contenir un élément propre à cet étudiant. Rends seulement la lettre."""


def fact_warnings(letter: str, sources: str) -> list[str]:
    """Signale les nombres de la lettre qui n'apparaissent nulle part dans le profil ou le CV."""
    warnings = []
    src = sources.lower()
    for num in sorted(set(re.findall(r"\b\d+(?:[.,]\d+)?\b", letter))):
        if num not in src:
            warnings.append(f"Le nombre « {num} » n'apparaît pas dans ton profil ni ton CV : vérifie qu'il est exact.")
    if "[" in letter:
        warnings.append("Des emplacements entre crochets restent à compléter avant l'envoi.")
    return warnings


def generate_letter(p: Profile, s: Scholarship, answers: dict, language: str, max_words: int, tone: str, use_ai: bool) -> tuple[str, list[str], bool]:
    sources = " ".join(
        str(x) for x in [p.full_name, p.institution, p.grade_average, p.experiences, p.engagement, p.project, p.cv_text, p.language_scores, *answers.values(), s.title, s.organization, s.summary, s.amount]
        if x
    )
    letter = None
    if use_ai:
        user = f"""Langue : {'anglais' if language == 'en' else 'français'}. Limite : {max_words} mots. Ton : {tone}.

BOURSE
Nom : {s.title}
Organisme : {s.organization}
Description : {s.summary}
Pays d'étude : {', '.join(COUNTRIES.get(c, c) for c in s.study_countries) or 'plusieurs pays'}

PROFIL
Nom : {p.full_name or '[Prénom Nom]'}
Niveau visé : {LEVELS.get(p.target_level or '', '?')} ; domaine : {DOMAINS.get(p.domain or '', '?')}
Établissement : {p.institution or '?'} ; moyenne : {p.grade_average or '?'}
Expériences : {p.experiences or '-'}
Engagement : {p.engagement or '-'}
Projet : {p.project or '-'}
Langues : {p.languages} {p.language_scores}

RÉPONSES DE L'ÉTUDIANT
Pourquoi ce pays : {answers.get('why_country') or '-'}
Pourquoi ce programme : {answers.get('why_program') or '-'}
Projet après les études : {answers.get('project_after') or '-'}
Réalisation dont il ou elle est fier : {answers.get('proud_of') or '-'}

CV
{(p.cv_text or '-')[:8000]}"""
        letter = ask_text(LETTER_SYSTEM, user, effort="medium", max_tokens=6000)
    ai_used = letter is not None
    if letter is None:
        letter = letter_template(p, s, answers, language, max_words)
    warnings = fact_warnings(letter, sources)
    wc = _words(letter)
    if wc > max_words:
        warnings.insert(0, f"La lettre fait {wc} mots, au-dessus de la limite de {max_words}.")
    if not any(answers.values()):
        warnings.append("Réponds aux questions (pourquoi ce pays, ce programme…) : c'est ce qui rend la lettre personnelle.")
    return letter, warnings, ai_used
