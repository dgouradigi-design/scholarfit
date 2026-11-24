"""Configuration de l'application, lue depuis les variables d'environnement (ou un fichier .env)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ScholarFit"
    # SQLite par défaut pour démarrer sans rien installer. En production :
    # postgresql+psycopg://user:pass@localhost:5432/bourses
    database_url: str = "sqlite:///./bourses.db"

    # Secret de signature des jetons de connexion. À CHANGER en production.
    secret_key: str = "dev-secret-a-changer-absolument-en-production-0123456789"
    token_expire_minutes: int = 60 * 24 * 7

    # Origines autorisées à appeler l'API (le site Next.js en local)
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # IA : si aucune clé n'est fournie, la plateforme fonctionne en mode hors-ligne
    # (extraction par règles, lettres et diagnostics à partir de modèles).
    anthropic_api_key: str | None = None
    claude_model: str = "claude-opus-5-5"
    ai_free_generations_per_day: int = 20

    # Collecte
    scraper_user_agent: str = "ScholarFitBot/0.1 (+https://example.org/bot)"
    scraper_min_delay_seconds: float = 5.0

    # Accompagnement : attribue tout de suite le conseiller le plus adapté qui a de la place.
    # À false, chaque demande attend qu'un administrateur choisisse le conseiller dans /admin.
    coaching_auto_assign: bool = True

    # Offres d'accompagnement (prix en F CFA)
    offer_standard_price: int = 15000
    offer_premium_price: int = 35000

    # CV et lettres : un dossier (CV adapté + lettre pour une bourse) est offert à chaque compte.
    # Ensuite, abonnement mensuel : SUBSCRIPTION_PRICE F CFA pour SUBSCRIPTION_DAYS jours, qui
    # permet de préparer jusqu'à SUBSCRIPTION_MONTHLY_PACKS dossiers (limite qui maîtrise le coût de l'IA).
    # Relances de génération permises dans un même dossier.
    doc_free_packs: int = 1
    subscription_price: int = 2500
    subscription_days: int = 30
    subscription_monthly_packs: int = 10
    doc_pack_regenerations: int = 3
    # Numéros qui reçoivent les paiements (Flooz = Moov Africa, Mixx by Yas)
    payment_flooz_number: str = "+228 98 64 55 43"
    payment_mixx_number: str = "+228 91 12 75 84"
    payment_beneficiary: str = "ScholarFit"

    # Collecte automatique : toutes les N heures, l'API relance les sources, la découverte par IA,
    # la vérification des liens et les expirations (0 = désactivé, utiliser alors « python -m app.cli nightly »).
    # Chaque source garde sa propre fréquence (sources.json, une fois par semaine) : ce réglage dit seulement à quel rythme on regarde.
    auto_collect_hours: float = 24
    # Stages des organisations internationales (API ReliefWeb) : nom d'application approuvé
    reliefweb_appname: str = ""
    # Découverte de nouvelles bourses par l'IA (recherche web Claude), région par région
    ai_discovery_enabled: bool = True
    ai_discovery_max_searches: int = 6  # recherches web par région et par passage (coût maîtrisé)

    # Comptes administrateurs (e-mails séparés par des virgules)
    admin_emails: str = "admin@example.org"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.anthropic_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
