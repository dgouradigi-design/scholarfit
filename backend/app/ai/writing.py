"""Hygiène des textes générés (CV et lettres).

Un jury repère vite un texte écrit à la chaîne : tirets cadratins, deux-points en série,
formules creuses, phrases laissées en suspens. Ce module :

- nettoie la ponctuation (tirets longs, espaces, guillemets, deux-points orphelins) ;
- repère les tournures stéréotypées et les phrases incomplètes ;
- met en forme les réponses libres de l'étudiant pour qu'elles s'insèrent dans une phrase.
"""
from __future__ import annotations

import re

# Formules que l'on retrouve dans les textes produits en série. La liste sert à deux choses :
# l'IA reçoit la consigne de les éviter, et le contrôle final les signale pour une réécriture.
CLICHES_FR = [
    "dans un monde en constante évolution", "en constante évolution", "en perpétuelle évolution",
    "véritable tremplin", "un tremplin", "riche et variée", "riche et varié", "fort de mon expérience",
    "forte de mon expérience", "je suis convaincu", "je suis convaincue", "intimement convaincu",
    "il est crucial", "il convient de noter", "n'est pas seulement", "pas seulement un", "plus qu'un simple",
    "passionné par", "passionnée par", "ma passion pour", "depuis mon plus jeune âge", "depuis toujours",
    "relever les défis", "relever ce défi", "contribuer activement", "pierre angulaire", "à l'ère du",
    "dans le paysage", "un atout majeur", "une valeur ajoutée", "synergie", "je me permets de",
    "c'est avec un grand intérêt", "c'est avec enthousiasme", "c'est avec une grande motivation",
    "je souhaite mettre à profit", "au service de", "incarne", "en somme", "en définitive",
]
CLICHES_EN = [
    "in today's fast-paced world", "ever-evolving", "ever-changing", "rapidly evolving", "i am writing to express",
    "delve", "tapestry", "testament to", "unwavering", "embark on", "journey", "foster", "leverage",
    "cutting-edge", "pivotal", "realm", "vibrant", "showcase", "navigate the", "i am passionate about",
    "passion for", "since i was a child", "furthermore", "moreover", "in conclusion", "not only", "game-changer",
    "thrive", "invaluable", "meticulous", "seamless", "holistic", "spearhead",
]

_DASHES = re.compile(r"\s*[—―]\s*|\s+–\s+")
_RANGE_DASH = re.compile(r"(\d)\s*[–—]\s*(\d|aujourd|présent|present|now)", re.I)
_TRAILING_CONNECTOR = re.compile(
    r"\b(et|ou|de|des|du|la|le|les|à|au|aux|pour|par|avec|dans|en|que|qui|mais|car|donc|and|or|of|the|to|for|with|in|a|an|that|which|but)$",
    re.I,
)


def clean_punctuation(text: str, language: str = "fr") -> str:
    """Tirets longs, espaces doubles, espaces avant la ponctuation, points de suspension."""
    if not text:
        return ""
    t = text.replace("\r\n", "\n").replace(" ", " ").replace(" ", " ")
    t = _RANGE_DASH.sub(r"\1 - \2", t)
    t = _DASHES.sub(", ", t)
    t = t.replace("–", "-").replace("…", ".")
    t = re.sub(r"\.{2,}", ".", t)
    t = re.sub(r",\s*,", ",", t)
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r" +([,.])", r"\1", t)
    if language == "fr":
        t = re.sub(r"\s*([;!?])", r" \1", t)  # espace avant ; ! ? en français
        t = re.sub(r"(\S)\s*:(\s|$)", r"\1 :\2", t)
    else:
        t = re.sub(r"\s+([;:!?])", r"\1", t)
    t = re.sub(r"\(\s*e\s*\)|\(\s*es\s*\)|·e|·es", "", t)  # écriture inclusive des modèles
    t = re.sub(r"[ \t]+\n", "\n", t)
    return t.strip()


def strip_placeholders(text: str) -> str:
    """Retire les phrases qui contiennent encore un emplacement [à compléter]."""
    sentences = split_sentences(text)
    kept = [s for s in sentences if "[" not in s and "]" not in s]
    return " ".join(kept)


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý«\"'0-9])", text.strip())
    return [p.strip() for p in parts if p.strip()]


def complete_sentence(text: str) -> str:
    """Majuscule initiale et point final. Retire une fin de phrase laissée en suspens."""
    t = (text or "").strip().strip("-•*").strip()
    t = re.sub(r"[\s:;,\-]+$", "", t)
    while _TRAILING_CONNECTOR.search(t):
        t = _TRAILING_CONNECTOR.sub("", t).rstrip(" ,;:-")
    if not t:
        return ""
    t = t[0].upper() + t[1:]
    if t[-1] not in ".!?»\"":
        t += "."
    return t


def fix_paragraph(p: str, language: str = "fr") -> str:
    """Nettoie un paragraphe : pas d'étiquette « Titre : » en tête, phrases complètes."""
    p = clean_punctuation(strip_placeholders(p), language)
    # « Pourquoi ce pays : … » ou « Mon projet : … » en tête de paragraphe
    p = re.sub(r"^[A-ZÀ-Ýa-zà-ÿ' ]{2,40}\s?:\s+", "", p)
    sentences = [complete_sentence(s) for s in split_sentences(p)]
    return " ".join(s for s in sentences if s)


def find_cliches(text: str, language: str = "fr") -> list[str]:
    low = text.lower().replace("’", "'")
    found = [c for c in (CLICHES_EN if language == "en" else CLICHES_FR) if c in low]
    if "—" in text or " – " in text:
        found.append("tiret long")
    return found


def as_sentences(answer: str) -> str:
    """Transforme une réponse libre en une ou plusieurs phrases propres."""
    if not answer or not answer.strip():
        return ""
    lines = [l.strip(" -•*\t") for l in answer.strip().splitlines() if l.strip(" -•*\t")]
    joined = " ".join(complete_sentence(l) for l in lines)
    return clean_punctuation(joined)


def lower_first(text: str) -> str:
    if not text:
        return text
    if len(text) > 1 and text[1].isupper():  # sigle (« UCAD », « IA »)
        return text
    return text[0].lower() + text[1:]


def word_count(text: str) -> int:
    return len(re.findall(r"\S+", text or ""))


# ------------------------------------------------------------------ pays et prépositions
_PLURAL = {"US", "NL", "AE", "PH", "KM", "MV", "SC", "BS", "MH", "SB", "FM"}
_ISLANDS = {"MU", "SG", "CU", "MG", "MT", "CY", "HK", "TW", "MC", "BH", "SC", "KM", "MV", "BB", "TT", "JM", "HT", "CV", "ST", "SM", "LC", "VC", "GD", "KN", "AG", "DM", "NR", "TV", "KI", "TO", "WS", "FJ", "PW"}
_MASC_E = {"MX", "KH", "MZ", "ZW", "BZ", "SR"}
_SPECIAL = {"CD": "en République démocratique du Congo", "CF": "en Centrafrique", "IL": "en Israël"}
_ISLAND_EXCEPT = {"CU", "MG", "HT", "JM", "CY", "MT", "FJ", "SC", "KM", "MV", "CV", "TT"}  # « à Cuba », mais « en Haïti »…
_EN_ISLANDS = {"HT", "JM", "FJ"}
_AUX_ISLANDS = {"SC", "KM", "MV"}
_FR_ARTICLE_NONE = {"CU", "MG", "MT", "CY"}


def country_in(code: str, name: str) -> str:
    """« en Allemagne », « au Ghana », « aux États-Unis », « à Maurice »."""
    if code in _SPECIAL:
        return _SPECIAL[code]
    if code in _PLURAL or code in _AUX_ISLANDS:
        return f"aux {name}"
    if code in _EN_ISLANDS:
        return f"en {name}"
    if code in _ISLANDS or code in _FR_ARTICLE_NONE:
        return f"à {name}"
    first = name[:1].lower()
    if first in "aeiouéèêâîôûy" and code not in {"YE"}:
        return f"en {name}"
    if name.split(" ")[0].lower().endswith("e") and code not in _MASC_E:
        return f"en {name}"
    return f"au {name}"
