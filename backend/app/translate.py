"""Version anglaise des fiches (titre, résumé, conditions, étapes, pièces, durée).

Les fiches sont rédigées en français. La traduction est faite une fois par Claude, puis gardée dans
``Scholarship.translations["en"]`` avec l'empreinte du texte français : si la fiche change, elle est
retraduite au passage suivant. Les fiches de départ ont leur traduction dans data/scholarships_en.json
(chargée par le seed, sans IA). Sans clé API, une fiche non traduite s'affiche en français.

Quand : à chaque collecte automatique (``translate_missing``), et à la demande pour une fiche ouverte
en anglais (``ensure_en``).
"""
from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from .ai.client import ask_json
from .config import get_settings
from .models import Scholarship

log = logging.getLogger(__name__)
FIELDS = ("title", "summary", "eligibility", "application_steps", "documents_detail", "extra_documents", "duration")
SEED_EN = Path(__file__).resolve().parent / "data" / "scholarships_en.json"

SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "eligibility": {"type": "array", "items": {"type": "string"}},
        "application_steps": {"type": "array", "items": {"type": "string"}},
        "documents_detail": {"type": "array", "items": {"type": "object", "properties": {
            "code": {"type": "string"}, "text": {"type": "string"}}, "required": ["code", "text"], "additionalProperties": False}},
        "extra_documents": {"type": "array", "items": {"type": "string"}},
        "duration": {"type": ["string", "null"]},
    },
    "required": list(FIELDS),
    "additionalProperties": False,
}
SYSTEM = """You translate scholarship, internship and conference listings from French into English for a student platform.
Rules:
- Keep the meaning exactly; do not add or remove conditions, numbers, dates or names.
- Title: use the official English name of the programme when it is well known (e.g. "Bourse d'excellence Eiffel" becomes
  "Eiffel Excellence Scholarship"); otherwise translate naturally.
- Clear, professional British English. Address the reader as "you". No em dashes.
- Keep each list in the same order and with the same number of items. Keep the document codes unchanged.
- Answer with the JSON only."""


def source_of(s: Scholarship) -> dict:
    return {f: getattr(s, f) for f in FIELDS}


def fingerprint(s: Scholarship) -> str:
    return hashlib.sha1(json.dumps(source_of(s), ensure_ascii=False, sort_keys=True, default=str).encode()).hexdigest()[:16]


def is_current(s: Scholarship) -> bool:
    en = (s.translations or {}).get("en") or {}
    return bool(en) and en.get("hash") == fingerprint(s)


def store(s: Scholarship, en: dict) -> None:
    clean = {f: en.get(f) for f in FIELDS if en.get(f) not in (None, "", [], {})}
    clean["hash"] = fingerprint(s)
    s.translations = {**(s.translations or {}), "en": clean}


def translate_one(s: Scholarship) -> bool:
    if not get_settings().ai_enabled:
        return False
    src = source_of(s)
    payload = {**src, "documents_detail": [{"code": k, "text": v} for k, v in (src["documents_detail"] or {}).items()]}
    data = ask_json(SYSTEM, json.dumps(payload, ensure_ascii=False), SCHEMA, effort="low", max_tokens=4000)
    if not data or not data.get("title"):
        return False
    data["documents_detail"] = {d["code"]: d["text"] for d in data.get("documents_detail") or [] if d.get("text")}
    store(s, data)
    return True


def ensure_en(db: Session, s: Scholarship) -> None:
    """Traduit la fiche si besoin (fiche ouverte en anglais). Silencieux si l'IA n'est pas disponible."""
    if is_current(s):
        return
    try:
        if translate_one(s):
            db.commit()
    except Exception:  # noqa: BLE001 - une traduction ratée ne doit pas casser la page
        log.exception("Traduction impossible pour %s", s.slug)
        db.rollback()


def translate_missing(db: Session, limit: int = 200) -> int:
    """Traduit les fiches ouvertes sans version anglaise à jour (collecte automatique)."""
    if not get_settings().ai_enabled:
        return 0
    done = 0
    for s in db.scalars(select(Scholarship).where(Scholarship.status != "expiree")):
        if done >= limit:
            break
        if is_current(s):
            continue
        try:
            if translate_one(s):
                done += 1
                db.commit()
        except Exception:  # noqa: BLE001
            log.exception("Traduction impossible pour %s", s.slug)
            db.rollback()
    return done


def load_seed_translations(db: Session) -> int:
    """Charge les traductions des fiches de départ (data/scholarships_en.json), sans IA."""
    if not SEED_EN.exists():
        return 0
    table = json.loads(SEED_EN.read_text(encoding="utf-8"))
    n = 0
    from .scrapers.collector import slugify

    for s in db.scalars(select(Scholarship)):
        en = table.get(s.slug) or table.get(slugify(s.title))
        if en and not is_current(s):
            store(s, en)
            n += 1
    db.commit()
    return n
