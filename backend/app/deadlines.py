"""Dates limites : état, priorité et message prêt à afficher.

    expiree  : date dépassée (pour une bourse annuelle, on annonce la session suivante estimée)
    urgente  : 14 jours ou moins
    bientot  : 45 jours ou moins
    ouverte  : plus de 45 jours
    inconnue : pas de date publiée (candidature au fil de l'eau ou calendrier par pays)

La priorité sert au tri « urgentes d'abord » : 1 urgente, 2 bientôt, 3 ouverte, 4 inconnue, 5 expirée.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from .models import Scholarship

URGENT_DAYS = 14
SOON_DAYS = 45
PRIORITY = {"urgente": 1, "bientot": 2, "ouverte": 3, "inconnue": 4, "expiree": 5}
MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def fr_date(d: date) -> str:
    return f"{d.day}{'er' if d.day == 1 else ''} {MONTHS[d.month - 1]} {d.year}"


def fr_month(d: date) -> str:
    return f"{MONTHS[d.month - 1]} {d.year}"


def add_year(d: date) -> date:
    try:
        return d.replace(year=d.year + 1)
    except ValueError:  # 29 février
        return d.replace(year=d.year + 1, day=28)


@dataclass
class DeadlineInfo:
    status: str
    priority: int
    days_left: int | None
    label: str
    next_expected: date | None


def deadline_info(s: Scholarship, today: date | None = None) -> DeadlineInfo:
    today = today or date.today()
    d = s.deadline
    # Conférence sans date limite d'inscription : on se fie à la date de l'événement
    if d is None and s.kind == "conference" and s.event_start:
        d = s.event_start
    # Session passée connue (bourse annuelle dont la date a été reportée par estimation)
    if s.deadline_estimated and s.previous_deadline and s.previous_deadline < today and d and d >= today:
        days = (d - today).days
        return DeadlineInfo(
            "expiree", PRIORITY["expiree"], None,
            f"Session close le {fr_date(s.previous_deadline)}. Prochaine session attendue vers {fr_month(d)} : "
            "date à confirmer sur le site officiel.",
            d,
        )
    if s.status == "expiree" or (d and d < today):
        nxt = add_year(d) if (d and s.recurring) else None
        if d:
            label = f"Date limite dépassée depuis le {fr_date(d)}."
            if nxt:
                label += f" Rendez-vous annuel : prochaine session attendue vers {fr_month(nxt)}."
        else:
            label = "Cette opportunité n'accepte plus de candidatures."
        return DeadlineInfo("expiree", PRIORITY["expiree"], (d - today).days if d else None, label, nxt)
    if not d:
        if s.kind == "stage":
            return DeadlineInfo("inconnue", PRIORITY["inconnue"], None,
                                "Candidatures toute l'année ou selon les offres publiées : consulte la page officielle.", None)
        return DeadlineInfo("inconnue", PRIORITY["inconnue"], None,
                            "Date limite non publiée : vérifie le calendrier sur le site officiel.", None)
    days = (d - today).days
    suffix = " (date estimée, à confirmer)" if s.deadline_estimated else ""
    if days == 0:
        return DeadlineInfo("urgente", 1, 0, f"Clôture aujourd'hui{suffix}.", None)
    if days <= URGENT_DAYS:
        return DeadlineInfo("urgente", 1, days, f"Urgent : clôture dans {days} jour{'s' if days > 1 else ''}, le {fr_date(d)}{suffix}.", None)
    if days <= SOON_DAYS:
        return DeadlineInfo("bientot", 2, days, f"Clôture dans {days} jours, le {fr_date(d)}{suffix}.", None)
    return DeadlineInfo("ouverte", 3, days, f"Date limite : {fr_date(d)}{suffix}.", None)


def is_open(s: Scholarship, today: date | None = None) -> bool:
    return deadline_info(s, today).status != "expiree"
