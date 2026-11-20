"""Offres d'accompagnement : postuler seul (gratuit), Standard et Premium.

Les prix se règlent dans .env (OFFER_STANDARD_PRICE, OFFER_PREMIUM_PRICE, en F CFA).
L'offre conseillée dépend du profil : niveau visé, nombre de bourses visées, besoins, et ce que
la personne a répondu à la dernière étape du questionnaire.
"""
from __future__ import annotations

from .config import get_settings
from .models import Profile

HELP_PREFERENCES = {
    "seul": "Je préfère postuler seul",
    "standard": "Je veux un accompagnement standard",
    "premium": "Je veux un accompagnement complet",
    "ne_sait_pas": "Je ne sais pas encore",
}


def price_label(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " F CFA" if amount else "Gratuit"


def catalog() -> list[dict]:
    s = get_settings()
    return [
        {
            "code": "autonome",
            "name": "Je postule seul",
            "price": 0,
            "currency": "XOF",
            "price_label": "Gratuit",
            "description": "Tu suis les étapes de chaque fiche et tu utilises les outils de la plateforme.",
            "features": [
                "Matching et score pour toutes les bourses",
                "Conditions, pièces à fournir et étapes pour chaque bourse",
                "Aide au CV et à la lettre de motivation",
                "Suivi de tes candidatures et rappels avant les dates limites",
            ],
            "max_scholarships": None,
        },
        {
            "code": "standard",
            "name": "Accompagnement Standard",
            "price": s.offer_standard_price,
            "currency": "XOF",
            "price_label": price_label(s.offer_standard_price),
            "description": "Un conseiller t'aide à monter un dossier solide pour une à deux bourses.",
            "features": [
                "Un conseiller attitré",
                "Choix des bourses les plus adaptées à ton profil",
                "Relecture du CV et de la lettre de motivation (2 allers-retours)",
                "Vérification complète du dossier avant l'envoi",
                "Plan d'étapes daté et rappels",
                "Jusqu'à 2 bourses",
            ],
            "max_scholarships": 2,
        },
        {
            "code": "premium",
            "name": "Accompagnement Premium",
            "price": s.offer_premium_price,
            "currency": "XOF",
            "price_label": price_label(s.offer_premium_price),
            "description": "Un suivi complet, de la sélection des bourses jusqu'au visa.",
            "features": [
                "Tout l'accompagnement Standard",
                "Jusqu'à 5 bourses",
                "Relectures illimitées du CV, des lettres et du projet de recherche",
                "Conseils pour les lettres de recommandation",
                "Entretien blanc en visio",
                "Aide pour le visa et l'installation",
            ],
            "max_scholarships": 5,
        },
    ]


def recommend(p: Profile | None) -> str:
    """Code de l'offre conseillée pour ce profil."""
    if p is None:
        return "standard"
    pref = p.help_preference
    if pref in ("seul", "standard", "premium"):
        base = {"seul": "autonome"}.get(pref, pref)
    else:
        base = None
    planned = p.applications_planned or 0
    demanding = p.target_level == "BAC7" or planned >= 3 or "refugie" in (p.situations or [])
    if base == "autonome":
        return "autonome"
    if base == "premium" or demanding:
        return "premium"
    return "standard"


def with_recommendation(p: Profile | None) -> list[dict]:
    rec = recommend(p)
    return [{**o, "recommended": o["code"] == rec} for o in catalog()]


def paid_offer(code: str) -> dict | None:
    return next((o for o in catalog() if o["code"] == code and o["price"] > 0), None)
