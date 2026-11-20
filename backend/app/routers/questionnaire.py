"""Questionnaire de profil en 5 étapes et offres d'accompagnement.

Le site affiche les étapes telles que l'API les décrit (GET /api/questionnaire), puis envoie
toutes les réponses (POST). Sans compte : nombre de bourses trouvées et 3 aperçus sans score.
Avec un compte : le profil est enregistré, toutes les bourses avec score, et l'offre conseillée.
"""
from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import offers
from ..db import get_db
from ..geo import REGIONS
from ..matching import SITUATION_LABELS, Criteria, age_on, missing_minimum, rank
from ..models import Profile, Scholarship, User
from ..schemas import MatchOut
from ..security import optional_user
from ..serializers import match_out
from ..vocab import COUNTRIES, DOMAINS, LEVEL_ORDER, LEVELS

router = APIRouter(prefix="/api", tags=["questionnaire et offres"])


def _opts(d: dict[str, str]) -> list[dict]:
    return [{"value": k, "label": v} for k, v in d.items()]


CURRENT_LEVELS = {
    "lycee": "Au lycée (avant le bac)", "BAC": "Bac obtenu", "BAC3": "Licence / bachelor obtenu(e) ou en cours",
    "BAC5": "Master obtenu ou en cours", "BAC7": "Doctorat en cours ou obtenu",
}
LANGUAGE_LEVELS = {"debutant": "Débutant", "intermediaire": "Intermédiaire (B1-B2)", "courant": "Courant (C1-C2)", "natif": "Langue maternelle"}
LANGS = {"fr": "Français", "en": "Anglais", "de": "Allemand", "es": "Espagnol", "pt": "Portugais", "ar": "Arabe",
         "zh": "Chinois", "ja": "Japonais", "ko": "Coréen", "ru": "Russe", "it": "Italien", "tr": "Turc"}
TESTS = ["IELTS", "TOEFL", "DELF", "DALF", "TCF", "TEF", "TestDaF", "HSK", "JLPT", "TOPIK", "Duolingo"]


def steps() -> list[dict]:
    countries = sorted(COUNTRIES.items(), key=lambda kv: kv[1])
    return [
        {
            "id": "identite", "title": "Toi", "subtitle": "Ta nationalité décide de la plupart des bourses ouvertes.",
            "questions": [
                {"id": "nationalities", "label": "Ta ou tes nationalités", "type": "countries", "required": True,
                 "options": [{"value": c, "label": n} for c, n in countries]},
                {"id": "residence_country", "label": "Pays où tu vis aujourd'hui", "type": "country", "required": False,
                 "options": [{"value": c, "label": n} for c, n in countries]},
                {"id": "birth_date", "label": "Date de naissance", "type": "date", "required": True,
                 "placeholder": "Beaucoup de bourses fixent un âge maximum"},
            ],
        },
        {
            "id": "etudes", "title": "Tes études", "subtitle": "Où tu en es et ce que tu veux financer.",
            "questions": [
                {"id": "current_level", "label": "Ton niveau actuel", "type": "select", "required": True, "options": _opts(CURRENT_LEVELS)},
                {"id": "target_level", "label": "Le diplôme que tu veux financer", "type": "select", "required": True, "options": _opts(LEVELS)},
                {"id": "domain", "label": "Ton domaine", "type": "select", "required": True,
                 "options": _opts({k: v for k, v in DOMAINS.items() if k != "tous"})},
                {"id": "grade_average", "label": "Ta moyenne sur 20 (dernière année)", "type": "number", "required": False,
                 "placeholder": "ex. 14,5"},
            ],
        },
        {
            "id": "destination", "title": "Ta destination", "subtitle": "Laisse vide pour chercher partout dans le monde.",
            "questions": [
                {"id": "wished_regions", "label": "Régions qui t'intéressent", "type": "multiselect", "required": False, "options": _opts(REGIONS)},
                {"id": "wished_countries", "label": "Pays précis (facultatif)", "type": "countries", "required": False,
                 "options": [{"value": c, "label": n} for c, n in countries]},
                {"id": "full_funding_only", "label": "Seulement les bourses complètes (frais, logement, voyage)", "type": "boolean", "required": False},
            ],
        },
        {
            "id": "langues", "title": "Tes langues", "subtitle": "Un score de test ouvre beaucoup de portes.",
            "questions": [
                {"id": "languages", "label": "Langues que tu parles", "type": "multiselect", "required": True, "options": _opts(LANGS)},
                {"id": "language_scores", "label": "Tests de langue passés (score)", "type": "language_scores", "required": False,
                 "options": [{"value": t, "label": t} for t in TESTS], "placeholder": "ex. IELTS 6,5"},
            ],
        },
        {
            "id": "situation", "title": "Ta situation et ton besoin d'aide", "subtitle": "Pour te montrer les bourses réservées et l'offre qui te convient.",
            "questions": [
                {"id": "situations", "label": "Ces situations te concernent-elles ? (facultatif, reste privé)", "type": "multiselect",
                 "required": False, "options": _opts(SITUATION_LABELS)},
                {"id": "applications_planned", "label": "À combien de bourses veux-tu postuler ?", "type": "number", "required": False,
                 "placeholder": "ex. 3"},
                {"id": "help_preference", "label": "Comment veux-tu postuler ?", "type": "select", "required": True,
                 "options": _opts(offers.HELP_PREFERENCES)},
                {"id": "project", "label": "Ton projet en une ou deux phrases", "type": "text", "required": False,
                 "placeholder": "ex. Devenir ingénieure en énergies renouvelables au Sénégal"},
            ],
        },
    ]


class QuestionnaireIn(BaseModel):
    answers: dict


class QuestionnaireOut(BaseModel):
    total_matches: int
    excluded_count: int
    items: list[MatchOut]
    recommended_offer: str
    offers: list[dict]
    profile_saved: bool
    missing: list[str]


def _clean(a: dict) -> dict:
    """Valide et normalise les réponses (codes connus seulement)."""
    out: dict = {}
    nats = [c for c in a.get("nationalities") or [] if c in COUNTRIES]
    if nats:
        out["nationalities"] = nats
    if a.get("residence_country") in COUNTRIES:
        out["residence_country"] = a["residence_country"]
    if a.get("birth_date"):
        try:
            bd = date.fromisoformat(str(a["birth_date"])[:10])
        except ValueError:
            raise HTTPException(422, "Date de naissance invalide (format AAAA-MM-JJ)")
        if bd > date.today():
            raise HTTPException(422, "Date de naissance dans le futur")
        out["birth_date"] = bd
    cur = a.get("current_level")
    if cur in LEVELS:
        out["current_level"] = cur
    if a.get("target_level") in LEVELS:
        out["target_level"] = a["target_level"]
    elif cur in CURRENT_LEVELS:  # déduit : le diplôme suivant
        nxt = {"lycee": "BAC", "BAC": "BAC3", "BAC3": "BAC5", "BAC5": "BAC7", "BAC7": "BAC7"}[cur]
        out["target_level"] = nxt if nxt in LEVEL_ORDER else None
    if a.get("domain") in DOMAINS:
        out["domain"] = a["domain"]
    if a.get("grade_average") not in (None, ""):
        try:
            g = float(str(a["grade_average"]).replace(",", "."))
        except ValueError:
            raise HTTPException(422, "Moyenne invalide")
        if not 0 <= g <= 20:
            raise HTTPException(422, "La moyenne doit être entre 0 et 20")
        out["grade_average"] = g
    out["wished_regions"] = [r for r in a.get("wished_regions") or [] if r in REGIONS]
    out["wished_countries"] = [c for c in a.get("wished_countries") or [] if c in COUNTRIES]
    out["full_funding_only"] = bool(a.get("full_funding_only"))
    langs = a.get("languages") or []
    if isinstance(langs, dict):
        out["languages"] = {k: str(v) for k, v in langs.items() if k in LANGS}
    else:
        out["languages"] = {k: "courant" for k in langs if k in LANGS}
    scores = {}
    for k, v in (a.get("language_scores") or {}).items():
        try:
            if k in TESTS and v not in (None, ""):
                scores[k] = float(str(v).replace(",", "."))
        except ValueError:
            raise HTTPException(422, f"Score invalide pour {k}")
    out["language_scores"] = scores
    out["situations"] = [x for x in a.get("situations") or [] if x in SITUATION_LABELS]
    if a.get("applications_planned") not in (None, ""):
        try:
            out["applications_planned"] = max(1, min(50, int(a["applications_planned"])))
        except (TypeError, ValueError):
            raise HTTPException(422, "Nombre de bourses invalide")
    if a.get("help_preference") in offers.HELP_PREFERENCES:
        out["help_preference"] = a["help_preference"]
    if a.get("project"):
        out["project"] = str(a["project"])[:2000]
    return out


@router.get("/questionnaire")
def questionnaire():
    return {"steps": steps()}


@router.post("/questionnaire", response_model=QuestionnaireOut)
def submit(body: QuestionnaireIn, kind: str = Query("bourse", pattern="^(bourse|stage|conference|tout)$"), user: User | None = Depends(optional_user), db: Session = Depends(get_db)):
    data = _clean(body.answers)
    today = date.today()
    if user is not None:
        p = user.profile or Profile()
        user.profile = p
        for k, v in data.items():
            setattr(p, k, v)
        p.questionnaire_done_at = datetime.now(timezone.utc)
        db.commit()
        c = Criteria.from_profile(p, today)
    else:
        p = Profile(**{k: v for k, v in data.items()})
        c = Criteria(
            target_level=data.get("target_level"), nationalities=data.get("nationalities", []),
            age=age_on(data["birth_date"], today) if data.get("birth_date") else None, domain=data.get("domain"),
            wished_countries=data["wished_countries"], wished_regions=data["wished_regions"],
            grade_average=data.get("grade_average"), language_scores=data["language_scores"],
            languages=list(data["languages"]), project_text=data.get("project", ""),
            full_funding_only=data["full_funding_only"], situations=data["situations"],
        )
    stmt = select(Scholarship) if kind == "tout" else select(Scholarship).where(Scholarship.kind == kind)
    results, excluded = rank(list(db.scalars(stmt)), c, today, limit=500)
    items = [match_out(m) for m in results]
    if user is None:  # aperçu : 3 bourses, sans score (réservé aux comptes)
        items = items[:3]
        for m in items:
            m.score, m.chance = None, None
    rec = offers.recommend(p)
    return QuestionnaireOut(
        total_matches=len(results), excluded_count=excluded, items=items, recommended_offer=rec,
        offers=[{**o, "recommended": o["code"] == rec} for o in offers.catalog()],
        profile_saved=user is not None, missing=missing_minimum(c),
    )


@router.get("/offres")
def list_offers(user: User | None = Depends(optional_user)):
    """Les trois façons de postuler : seul (gratuit), Standard, Premium. Avec un jeton,
    ``recommended`` suit le profil de la personne connectée."""
    return offers.with_recommendation(user.profile if user else None)
