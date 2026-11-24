"""Lettre de motivation adaptée à une bourse.

La lettre est rendue sous forme structurée : expéditeur, destinataire, lieu et date, objet,
formule d'appel, paragraphes, formule de politesse, signature. Cette structure sert à
l'aperçu, au PDF et au fichier Word, avec la disposition propre à chaque langue :

- français : coordonnées en haut à gauche, destinataire à droite, « Lomé, le 20 novembre 2026 »,
  « Objet : … », « Madame, Monsieur, », formule de politesse complète ;
- anglais (Royaume-Uni et international) : « 20 November 2026 », « Dear Members of the Selection
  Committee, », « Yours sincerely, » ;
- anglais (États-Unis, Canada) : « November 20, 2026 », « Sincerely, ».

Avant d'être rendue, la lettre passe un contrôle : pas de tiret cadratin, pas de deux-points dans
le corps, pas de phrase en suspens, pas de crochets, pas de formule stéréotypée.
"""
from __future__ import annotations

import re
from datetime import date

from ..i18n import is_en
from ..models import Profile, Scholarship
from ..vocab import DOMAINS
from . import writing
from .client import ask_json
from .cv import ACTION_VERBS_EN, ACTION_VERBS_FR, EN_MONTHS, FR_MONTHS, THEMES, _clean_line, apply_weak_start, detect_themes
from .documents import split_sections
from .formats import country_name, domain_name, letter_style

QUESTIONS_EN = {
    "target_program": "Programme or university you are aiming for",
    "why_country": "Why this country",
    "why_program": "Why this programme and this scholarship",
    "study_plan": "Your study plan",
    "project_after": "Your plans after your studies",
    "proud_of": "A notable achievement",
    "extra": "Anything else you want the panel to know",
}
READINESS_EN = {
    "full_name": "Full name", "phone": "Phone", "city": "City of residence", "residence_country": "Country of residence",
    "email": "Email", "domain": "Field of study", "target_level": "Target degree", "cv": "Imported CV",
}


def question_label(key: str, label: str) -> str:
    return QUESTIONS_EN.get(key, label) if is_en() else label


QUESTIONS = [
    ("target_program", "Programme ou université visés"),
    ("why_country", "Pourquoi ce pays"),
    ("why_program", "Pourquoi ce programme et cette bourse"),
    ("study_plan", "Votre plan d'études"),
    ("project_after", "Votre projet après les études"),
    ("proud_of", "Une réalisation marquante"),
    ("extra", "Ce que vous tenez à dire au jury"),
]

LEVEL_PHRASE = {
    "fr": {"BAC": "une licence", "BAC3": "une licence", "BAC5": "un master", "BAC7": "un doctorat"},
    "en": {"BAC": "an undergraduate degree", "BAC3": "a bachelor's degree", "BAC5": "a master's degree", "BAC7": "a PhD"},
}
CURRENT_PHRASE = {
    "fr": {"BAC": "le baccalauréat", "BAC3": "ma licence", "BAC5": "mon master", "BAC7": "mon doctorat"},
    "en": {"BAC": "secondary school", "BAC3": "my bachelor's degree", "BAC5": "my master's degree", "BAC7": "my doctorate"},
}


# ------------------------------------------------------------------ en-tête
def _date_text(style: str, today: date) -> str:
    if style == "fr":
        day = "1er" if today.day == 1 else str(today.day)
        return f"{day} {FR_MONTHS[today.month - 1]} {today.year}"
    if style == "en_us":
        return f"{EN_MONTHS[today.month - 1]} {today.day}, {today.year}"
    return f"{today.day} {EN_MONTHS[today.month - 1]} {today.year}"


def bourse_name_fr(s: Scholarship) -> str:
    """« la bourse Eiffel », « le programme DAAD EPOS », « les bourses MasterCard »."""
    t = s.title.strip()
    low = t.lower()
    if low.startswith(("bourses", "programmes", "prix ")):
        art = "les " if low.startswith(("bourses", "programmes")) else "le "
        return art + low[0] + t[1:]
    if low.startswith(("bourse", "allocation")):
        return "la " + low[0] + t[1:]
    if low.startswith(("programme", "prix", "fonds", "concours")):
        return "le " + low[0] + t[1:]
    return f"le programme {t}"


def a_bourse_fr(s: Scholarship) -> str:
    """« à la bourse Eiffel », « au programme DAAD », « aux bourses MasterCard »."""
    name = bourse_name_fr(s)
    if name.startswith("le "):
        return "au " + name[3:]
    if name.startswith("les "):
        return "aux " + name[4:]
    return "à " + name


def offered_fr(s: Scholarship) -> str:
    name = bourse_name_fr(s)
    if name.startswith("les "):
        return "proposées" if name[4:].lower().startswith(("bourses", "allocations")) else "proposés"
    return "proposé" if name.startswith("le ") else "proposée"


def bourse_name_en(s: Scholarship) -> str:
    t = s.title.strip()
    return t if t.lower().startswith("the ") else f"the {t}"


def build_header(p: Profile, s: Scholarship, email: str | None, language: str, answers: dict, today: date | None = None) -> dict:
    today = today or date.today()
    style = letter_style(s, language)
    country = country_name(p.residence_country, language) if p.residence_country else ""
    sender = [p.full_name or ""]
    if p.address:
        sender.append(p.address)
    city_line = ", ".join(x for x in [p.city, country] if x)
    if city_line:
        sender.append(city_line)
    if p.phone:
        sender.append(p.phone)
    if email:
        sender.append(email)
    recipient = ["Comité de sélection" if style == "fr" else "Selection Committee", s.organization]
    if answers.get("recipient_address"):
        recipient += [l.strip() for l in answers["recipient_address"].splitlines() if l.strip()]
    dt = _date_text(style, today)
    place_date = (f"{p.city}, le {dt}" if p.city else f"Le {dt}") if style == "fr" else dt
    program = (answers.get("target_program") or "").strip().rstrip(".")
    if style == "fr":
        subject = f"Objet : candidature {a_bourse_fr(s)}" + (f", {program}" if program else "")
        salutation = "Madame, Monsieur,"
        closing = "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
    else:
        subject = f"Application for {bourse_name_en(s)}" + (f", {program}" if program else "")
        salutation = "Dear Members of the Selection Committee,"
        closing = "Sincerely," if style == "en_us" else "Yours sincerely,"
    return {
        "language": language, "style": style, "sender": [x for x in sender if x], "recipient": [x for x in recipient if x],
        "place_date": place_date, "subject": subject, "salutation": salutation, "closing": closing,
        "signature": p.full_name or "",
    }


# ------------------------------------------------------------------ lecture du CV pour la lettre
def cv_highlights(cv_text: str | None, language: str, limit: int = 2) -> list[str]:
    """Lignes d'expérience qui commencent (ou peuvent commencer) par un verbe d'action, dans la bonne langue."""
    if not cv_text:
        return []
    verbs = ACTION_VERBS_EN if language == "en" else ACTION_VERBS_FR
    sections = split_sections(cv_text)
    lines = []
    for key in ("experiences", "engagement", "projets", "recherche"):
        for raw in sections.get(key, "").splitlines():
            line = _clean_line(raw)
            line = apply_weak_start(line) or line
            low = line.lower()
            if len(line.split()) < 4 or len(line.split()) > 28 or "[" in line:
                continue
            if any(re.match(rf"{re.escape(v)}\b", low) for v in verbs):
                lines.append(line.rstrip(". "))
    # On privilégie les lignes chiffrées
    lines.sort(key=lambda l: 0 if re.search(r"\d", l) else 1)
    return lines[:limit]


# ------------------------------------------------------------------ modèle hors-ligne
def at_institution(name: str, language: str) -> str:
    if language == "en":
        return f"at {name}"
    low = name.lower()
    if low.startswith(("université", "universite", "école", "ecole", "institut", "académie", "université")):
        return f"à l'{name}"
    if low.startswith(("lycée", "collège", "complexe", "centre", "groupe")):
        return f"au {name}"
    return f"à {name}"


def _num(x: float, language: str) -> str:
    t = f"{x:g}"
    return t if language == "en" else t.replace(".", ",")


def _join_actions(items: list[str], language: str) -> str:
    items = [writing.lower_first(i) for i in items]
    if language == "en":
        return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " et " + items[-1]


def _integrate(answer: str, lead: str, fragment_prefix: str, language: str) -> str:
    """Insère une réponse libre : phrase autonome après une phrase d'appui, ou suite directe si c'est un fragment."""
    a = (answer or "").strip()
    if not a:
        return ""
    low = a.lower()
    connectors = ("parce que", "parce qu'", "car ", "pour ", "afin de", "because", "since ", "to ")
    if low.startswith(connectors):
        return writing.complete_sentence(f"{fragment_prefix} {writing.lower_first(a)}")
    sentences = writing.as_sentences(a)
    return f"{lead} {sentences}".strip() if lead else sentences


def letter_template(p: Profile, s: Scholarship, answers: dict, language: str, max_words: int) -> list[str]:
    en = language == "en"
    domain = (domain_name(p.domain, language) or ("my field" if en else "mon domaine")).lower()
    target = LEVEL_PHRASE["en" if en else "fr"].get(p.target_level or "", "")
    current = CURRENT_PHRASE["en" if en else "fr"].get(p.current_level or "", "")
    countries = [c for c in (s.study_countries or [])]
    country = country_name(countries[0], language) if len(countries) == 1 else ""
    where_fr = writing.country_in(countries[0], country) if country else ""
    program = (answers.get("target_program") or "").strip().rstrip(".")
    fem = p.gender == "f"
    paragraphs: list[str] = []

    # 1. Objet de la lettre
    if en:
        p1 = f"I am applying for {bourse_name_en(s)}, offered by {s.organization}"
        if target:
            p1 += f", to pursue {target} in {domain}"
        if country:
            p1 += f" in {country}"
        p1 += "."
        if program:
            p1 += f" The programme I am aiming for is {program}."
    else:
        p1 = f"Je vous adresse ma candidature {a_bourse_fr(s)}, {offered_fr(s)} par {s.organization}"
        if target:
            p1 += f", pour préparer {target} en {domain}"
        if where_fr:
            p1 += f" {where_fr}"
        p1 += "."
        if program:
            p1 += f" Je vise plus précisément le programme {program}."
    paragraphs.append(p1)

    # 2. Parcours
    parts = []
    if p.institution or current:
        if en:
            parts.append(f"I am currently completing {current or 'my studies'} in {domain}" + (f" {at_institution(p.institution, 'en')}" if p.institution else "") + ".")
        else:
            parts.append(f"Je termine actuellement {current or 'mes études'} en {domain}" + (f" {at_institution(p.institution, 'fr')}" if p.institution else "") + ".")
    if p.grade_average is not None:
        parts.append(f"My average grade is {_num(p.grade_average, 'en')} out of 20." if en else f"Ma moyenne générale est de {_num(p.grade_average, 'fr')} sur 20.")
    highlights = cv_highlights(p.cv_text, language)
    if highlights:
        parts.append(("Alongside my studies, I " if en else "En parallèle de ma formation, j'ai ") + _join_actions(highlights, language) + ".")
    if parts:
        paragraphs.append(" ".join(parts))

    # 3. Réalisation marquante
    proud = writing.as_sentences(answers.get("proud_of") or "")
    if proud:
        lead = "One experience shaped this application more than any other." if en else "Une expérience a particulièrement orienté ce projet."
        paragraphs.append(f"{lead} {proud}")

    # 4. Pourquoi ce pays, ce programme, plan d'études
    parts = []
    if answers.get("why_country"):
        if en:
            parts.append(_integrate(answers["why_country"], f"Studying in {country} is a deliberate choice." if country else "", (f"I have chosen to study in {country}" if country else "I have chosen this destination"), "en"))
        else:
            parts.append(_integrate(answers["why_country"], f"Étudier {where_fr} est un choix réfléchi." if where_fr else "", (f"J'ai choisi d'étudier {where_fr}" if where_fr else "J'ai choisi cette destination"), "fr"))
    if answers.get("why_program"):
        if en:
            parts.append(_integrate(answers["why_program"], "", "I am applying to this programme", "en"))
        else:
            parts.append(_integrate(answers["why_program"], "", "Je me tourne vers ce programme", "fr"))
    if answers.get("study_plan"):
        parts.append(writing.as_sentences(answers["study_plan"]))
    if parts:
        paragraphs.append(" ".join(x for x in parts if x))

    # 5. Projet après les études
    after = answers.get("project_after") or p.project or ""
    if after.strip():
        a = after.strip()
        if en:
            if re.match(r"^i\b", a):
                paragraphs.append(writing.complete_sentence("After graduating, " + a))
            else:
                paragraphs.append("After graduating, my goal is precise. " + writing.as_sentences(a))
        else:
            if re.match(r"^(je|j')\b", a, re.I):
                paragraphs.append(writing.complete_sentence("À l'issue de cette formation, " + writing.lower_first(a)))
            else:
                paragraphs.append("À l'issue de cette formation, mon objectif est précis. " + writing.as_sentences(a))
        themes = detect_themes(s)
        if "retour" in themes or "communaute" in themes:
            paragraphs[-1] += " This project is directly in line with the purpose of this scholarship." if en else " Ce projet rejoint directement la vocation de cette bourse."

    extra = writing.as_sentences(answers.get("extra") or "")
    if extra:
        paragraphs.append(extra)

    # 6. Conclusion
    if en:
        paragraphs.append("I would welcome the opportunity to discuss my application at an interview. Thank you for your time and consideration.")
    else:
        ready = "prête" if fem else ("prêt" if p.gender == "m" else "")
        if ready:
            paragraphs.append(f"Je suis {ready} à vous présenter mon projet lors d'un entretien et vous remercie de l'attention que vous porterez à ma candidature.")
        else:
            paragraphs.append("Je me tiens à votre disposition pour vous présenter mon projet lors d'un entretien et vous remercie de l'attention que vous porterez à ma candidature.")

    paragraphs = [writing.fix_paragraph(x, language) for x in paragraphs if x and x.strip()]
    return _fit_words(paragraphs, max_words)


def _fit_words(paragraphs: list[str], max_words: int) -> list[str]:
    """Raccourcit en retirant la dernière phrase des paragraphes centraux les plus longs."""
    paragraphs = [x for x in paragraphs if x]
    guard = 0
    while sum(writing.word_count(x) for x in paragraphs) > max_words and len(paragraphs) > 2 and guard < 60:
        guard += 1
        middle = range(1, len(paragraphs) - 1)
        i = max(middle, key=lambda k: writing.word_count(paragraphs[k]))
        sentences = writing.split_sentences(paragraphs[i])
        if len(sentences) <= 1:
            paragraphs.pop(i)
        else:
            paragraphs[i] = " ".join(sentences[:-1])
    return paragraphs


# ------------------------------------------------------------------ IA
LETTER_SCHEMA = {
    "type": "object",
    "properties": {"paragraphs": {"type": "array", "items": {"type": "string"}}},
    "required": ["paragraphs"],
    "additionalProperties": False,
}

LETTER_SYSTEM = """Vous rédigez la lettre de motivation d'un étudiant pour une bourse d'études. La lettre sera lue par un
jury qui en lit des centaines : elle doit être précise, personnelle et sobre, et ne jamais sonner comme un
texte produit en série.

Vous rendez uniquement le CORPS de la lettre (les paragraphes entre la formule d'appel et la formule de
politesse). L'en-tête, l'objet, la formule d'appel, la formule de politesse et la signature sont ajoutés
ensuite par la plateforme : ne les écrivez pas.

Construction (4 à 6 paragraphes) :
1. Une ouverture qui nomme la bourse et le diplôme visé, et qui donne d'emblée un fait marquant propre
   à l'étudiant (une réalisation, un déclic, un problème concret observé). Pas de phrase d'introduction vide.
2. Le parcours : formation, résultats, expériences les plus utiles à cette candidature, avec les faits du CV.
3. Le choix du pays, du programme et le plan d'études : cours, laboratoire, méthode, sujet de mémoire,
   en reprenant les réponses de l'étudiant.
4. Le projet après les études et le lien avec la mission de l'organisme qui finance la bourse.
5. Une conclusion courte : disponibilité pour un entretien et remerciement.

Règles de fond :
- Utilisez uniquement les faits fournis (profil, CV, réponses). N'inventez aucune expérience, note, prix,
  chiffre, nom de cours, de laboratoire ou de professeur.
- Une information manquante ne laisse aucune trace : pas de crochets, pas d'emplacement à compléter,
  pas de phrase vague pour la remplacer. Construisez la lettre avec ce qui est disponible.
- Chaque paragraphe contient au moins un élément propre à l'étudiant ou à la bourse.

Règles de forme :
- Phrases complètes, qui se terminent toutes par un point. Pas de liste, pas de titre, pas de deux-points
  dans le corps de la lettre, pas de tiret cadratin ni demi-cadratin, pas de point de suspension.
- Proscrivez ces formules : « passionné », « depuis mon plus jeune âge », « dans un monde en constante
  évolution », « véritable tremplin », « je suis convaincu », « relever les défis », « riche et varié »,
  « fort de », « c'est avec un grand intérêt », « n'est pas seulement… mais », « plus qu'un simple »,
  « pierre angulaire », « valeur ajoutée ». En anglais : « passionate », « journey », « delve », « foster »,
  « leverage », « testament », « unwavering », « cutting-edge », « vibrant », « furthermore », « moreover »,
  « I am writing to express ».
- Variez la longueur des phrases. Verbes concrets, peu d'adjectifs. Pas de série de trois adjectifs.
- Français : registre soutenu sans lourdeur, vouvoiement du jury. Respectez le genre indiqué pour les
  accords ; si le genre n'est pas indiqué, tournez les phrases pour éviter tout accord genré et n'écrivez
  jamais « (e) ».
- Anglais : anglais britannique pour une candidature hors États-Unis et Canada, américain sinon.
- Respectez la limite de mots demandée pour le corps de la lettre."""


def _ai_user_prompt(p: Profile, s: Scholarship, answers: dict, language: str, max_words: int, tone: str) -> str:
    gender = {"f": "féminin", "m": "masculin"}.get(p.gender or "", "non indiqué")
    countries = ", ".join(country_name(c, "fr") for c in (s.study_countries or [])) or "plusieurs pays"
    themes = ", ".join(THEMES[k]["label"] for k in detect_themes(s)) or "non précisés"
    ans = "\n".join(f"{label} : {answers.get(key) or '-'}" for key, label in QUESTIONS)
    return f"""Langue : {'anglais' if language == 'en' else 'français'} ({'américain' if letter_style(s, language) == 'en_us' else 'britannique' if language == 'en' else 'France'}).
Limite du corps de la lettre : {max_words} mots environ. Ton : {tone}. Genre grammatical du candidat : {gender}.

BOURSE
Nom : {s.title}
Organisme : {s.organization}
Pays d'études : {countries}
Description : {s.summary}
Conditions : {'; '.join(s.eligibility or []) or '-'}
Ce que le jury valorise : {themes}

PROFIL
Nom : {p.full_name}
Diplôme en cours ou obtenu : {p.current_level or '-'} ; diplôme visé : {p.target_level or '-'}
Domaine : {DOMAINS.get(p.domain or '', '-')}
Établissement : {p.institution or '-'} ; moyenne : {p.grade_average if p.grade_average is not None else '-'} sur 20
Expériences : {p.experiences or '-'}
Engagement : {p.engagement or '-'}
Projet : {p.project or '-'}
Langues : {p.languages} ; tests : {p.language_scores}

RÉPONSES DU CANDIDAT
{ans}

CV
{(p.cv_text or '-')[:9000]}"""


def check_letter(paragraphs: list[str], language: str, max_words: int) -> list[str]:
    """Problèmes de forme qui justifient une réécriture."""
    issues = []
    body = "\n".join(paragraphs)
    for c in writing.find_cliches(body, language):
        issues.append(f"formule à retirer : « {c} »")
    if re.search(r"\S\s?:\s", body):
        issues.append("deux-points dans le corps de la lettre")
    if "[" in body or "]" in body:
        issues.append("emplacement entre crochets")
    for x in paragraphs:
        if x.strip() and x.strip()[-1] not in ".!?»":
            issues.append(f"phrase incomplète : « {x.strip()[-60:]} »")
    if language == "fr" and re.search(r"\(e\)|\(es\)", body):
        issues.append("écriture « (e) »")
    words = writing.word_count(body)
    if words > max_words:
        issues.append(f"trop long ({words} mots pour {max_words})")
    if len(paragraphs) < 3:
        issues.append("pas assez de paragraphes")
    return issues


def _ai_paragraphs(system_user: str, language: str, max_words: int) -> list[str] | None:
    data = ask_json(LETTER_SYSTEM, system_user, LETTER_SCHEMA, effort="high", max_tokens=8000)
    if not data or not data.get("paragraphs"):
        return None
    paragraphs = [x.strip() for x in data["paragraphs"] if x.strip()]
    issues = check_letter(paragraphs, language, max_words)
    if issues:
        retry = system_user + "\n\nVERSION PRÉCÉDENTE\n" + "\n\n".join(paragraphs) + "\n\nCORRIGEZ CES POINTS\n- " + "\n- ".join(issues)
        data2 = ask_json(LETTER_SYSTEM, retry, LETTER_SCHEMA, effort="high", max_tokens=8000)
        if data2 and data2.get("paragraphs"):
            paragraphs = [x.strip() for x in data2["paragraphs"] if x.strip()]
    return paragraphs


# ------------------------------------------------------------------ point d'entrée
def readiness(p: Profile, email: str | None) -> list[dict]:
    """Informations indispensables pour une lettre et un CV propres."""
    missing = []
    if not p.full_name:
        missing.append({"field": "full_name", "label": "Nom complet"})
    if not p.phone:
        missing.append({"field": "phone", "label": "Téléphone"})
    if not p.city:
        missing.append({"field": "city", "label": "Ville de résidence"})
    if not p.residence_country:
        missing.append({"field": "residence_country", "label": "Pays de résidence"})
    if not email:
        missing.append({"field": "email", "label": "E-mail"})
    if not p.domain:
        missing.append({"field": "domain", "label": "Domaine d'études"})
    if not p.target_level:
        missing.append({"field": "target_level", "label": "Diplôme visé"})
    if not p.cv_text:
        missing.append({"field": "cv", "label": "CV importé"})
    if is_en():
        for m in missing:
            m["label"] = READINESS_EN.get(m["field"], m["label"])
    return missing


def generate_letter(p: Profile, s: Scholarship, answers: dict, language: str, max_words: int, tone: str, use_ai: bool, email: str | None = None) -> dict:
    header = build_header(p, s, email, language, answers)
    paragraphs = None
    if use_ai:
        paragraphs = _ai_paragraphs(_ai_user_prompt(p, s, answers, language, max_words, tone), language, max_words)
    ai_used = paragraphs is not None
    if paragraphs is None:
        paragraphs = letter_template(p, s, answers, language, max_words)
    paragraphs = [writing.fix_paragraph(x, language) for x in paragraphs]
    paragraphs = _fit_words([x for x in paragraphs if x], max_words)
    letter = {**header, "paragraphs": paragraphs, "scholarship_id": s.id, "scholarship_title": s.title, "ai_used": ai_used}
    return letter


def letter_plain_text(letter: dict) -> str:
    parts = ["\n".join(letter.get("sender", [])), "\n".join(letter.get("recipient", [])), letter.get("place_date", ""),
             letter.get("subject", ""), letter.get("salutation", ""), *letter.get("paragraphs", []),
             letter.get("closing", "") if letter.get("style") != "fr" else letter.get("closing", ""), letter.get("signature", "")]
    return "\n\n".join(x for x in parts if x)


def letter_word_count(letter: dict) -> int:
    return sum(writing.word_count(x) for x in letter.get("paragraphs", []))
