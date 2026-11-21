"""Offres d'accompagnement : postuler seul (gratuit), Standard et Premium.

Les prix se règlent dans .env (OFFER_STANDARD_PRICE, OFFER_PREMIUM_PRICE, en F CFA).
L'offre conseillée dépend du profil : niveau visé, nombre de bourses visées, besoins, et ce que
la personne a répondu à la dernière étape du questionnaire.
"""
from __future__ import annotations

from . import i18n
from .config import get_settings
from .i18n import t
from .models import Profile

HELP_PREFERENCES = {
    "seul": "Je préfère postuler seul",
    "standard": "Je veux un accompagnement standard",
    "premium": "Je veux un accompagnement complet",
    "ne_sait_pas": "Je ne sais pas encore",
}
HELP_PREFERENCES_EN = {
    "seul": "I prefer to apply on my own",
    "standard": "I would like standard support",
    "premium": "I would like full support",
    "ne_sait_pas": "I am not sure yet",
}


def help_preferences() -> dict[str, str]:
    return i18n.loc(HELP_PREFERENCES, HELP_PREFERENCES_EN)


def price_label(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " F CFA" if amount else t("Gratuit", "Free")


def catalog() -> list[dict]:
    s = get_settings()
    return [
        {
            "code": "autonome",
            "name": t("Je postule seul", "I apply on my own"),
            "price": 0,
            "currency": "XOF",
            "price_label": price_label(0),
            "description": t("Vous suivez les étapes de chaque fiche et utilisez les outils de la plateforme.",
                             "You follow the steps on each listing and use the platform's tools."),
            "features": [
                t("Matching et score pour toutes les bourses", "Matching and score for every scholarship"),
                t("Conditions, pièces à fournir et étapes pour chaque bourse", "Conditions, required documents and steps for each scholarship"),
                t("Aide au CV et à la lettre de motivation", "Help with your CV and cover letter"),
                t("Suivi de vos candidatures et rappels avant les dates limites", "Application tracking and reminders before deadlines"),
            ],
            "max_scholarships": None,
        },
        {
            "code": "standard",
            "name": t("Accompagnement Standard", "Standard support"),
            "price": s.offer_standard_price,
            "currency": "XOF",
            "price_label": price_label(s.offer_standard_price),
            "description": t("Un conseiller vous aide à monter un dossier solide pour une à deux bourses.",
                             "An advisor helps you build a strong application for one or two scholarships."),
            "features": [
                t("Un conseiller attitré", "A dedicated advisor"),
                t("Choix des bourses les plus adaptées à votre profil", "Selection of the scholarships best suited to your profile"),
                t("Relecture du CV et de la lettre de motivation (2 allers-retours)", "Review of your CV and cover letter (2 rounds)"),
                t("Vérification complète du dossier avant l'envoi", "Full check of your application before submission"),
                t("Plan d'étapes daté et rappels", "Dated action plan and reminders"),
                t("Jusqu'à 2 bourses", "Up to 2 scholarships"),
            ],
            "max_scholarships": 2,
        },
        {
            "code": "premium",
            "name": t("Accompagnement Premium", "Premium support"),
            "price": s.offer_premium_price,
            "currency": "XOF",
            "price_label": price_label(s.offer_premium_price),
            "description": t("Un suivi complet, de la sélection des bourses jusqu'au visa.",
                             "Complete support, from choosing scholarships to getting your visa."),
            "features": [
                t("Tout l'accompagnement Standard", "Everything in Standard support"),
                t("Jusqu'à 5 bourses", "Up to 5 scholarships"),
                t("Relectures illimitées du CV, des lettres et du projet de recherche", "Unlimited reviews of your CV, letters and research proposal"),
                t("Conseils pour les lettres de recommandation", "Guidance on reference letters"),
                t("Entretien blanc en visio", "Mock interview by video call"),
                t("Aide pour le visa et l'installation", "Help with your visa and settling in"),
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
