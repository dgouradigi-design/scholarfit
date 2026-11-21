"""Alertes intelligentes : nouvelles bourses correspondant au profil et rappels J-30, J-7, J-1.

Le MVP enregistre les alertes en base (affichées dans l'interface) et les « envoie » via
``send`` qui écrit dans la console. Pour brancher l'e-mail (SMTP, Brevo, Resend…) ou
WhatsApp (API Cloud de Meta, Twilio), il suffit de remplacer ``send``.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import i18n
from .deadlines import fr_date
from .details import content
from .i18n import t
from .matching import Criteria, missing_minimum, rank
from .models import Alert, Application, Scholarship, User

log = logging.getLogger("alertes")
REMINDER_DAYS = (30, 7, 1)


def send(user: User, message: str) -> None:
    log.info("[ALERTE → %s] %s", user.email, message)


def _add(db: Session, user: User, key: str, kind: str, message: str, scholarship_id: int | None) -> bool:
    exists = db.scalars(select(Alert).where(Alert.user_id == user.id, Alert.key == key)).first()
    if exists:
        return False
    db.add(Alert(user_id=user.id, key=key, kind=kind, message=message, scholarship_id=scholarship_id))
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return False
    if user.profile is None or user.profile.alerts_opt_in:
        send(user, message)
    return True


def run_alerts(db: Session, today: date | None = None, new_since_days: int = 7) -> int:
    today = today or date.today()
    since = datetime.now(timezone.utc) - timedelta(days=new_since_days)
    created = 0
    scholarships = list(db.scalars(select(Scholarship).where(Scholarship.status != "expiree")))
    for user in db.scalars(select(User)):
        token = i18n.set_lang(user.lang or "fr")  # messages dans la langue choisie sur le site
        try:
            created += _user_alerts(db, user, scholarships, today, since)
        finally:
            i18n._lang.reset(token)
    db.commit()
    return created


def _user_alerts(db: Session, user: User, scholarships: list[Scholarship], today: date, since: datetime) -> int:
    created = 0
    # 1. Rappels de date limite pour les candidatures pas encore envoyées
    for app in user.applications:
        s = app.scholarship
        if app.status not in ("a_preparer", "en_cours") or not s.deadline:
            continue
        days = (s.deadline - today).days
        for d in REMINDER_DAYS:
            if days == d or (d == 1 and days == 0):
                title = content(s, "title")
                created += _add(db, user, f"rappel-{s.id}-J{d}", "rappel",
                                t(f"Plus que {days} jour(s) pour « {title} » (date limite le {fr_date(s.deadline)}).",
                                  f"Only {days} day(s) left for \"{title}\" (deadline {fr_date(s.deadline)})."), s.id)
    # 2. Nouvelles bourses correspondant au profil
    if user.profile is None:
        return created
        c = Criteria.from_profile(user.profile, today)
        if missing_minimum(c):
            return created
        fresh = [s for s in scholarships if s.collected_at and _aware(s.collected_at) >= since]
        results, _ = rank(fresh, c, today, limit=10)
        for m in results:
            if m.score >= 60:
                title = content(m.scholarship, "title")
                created += _add(db, user, f"nouvelle-{m.scholarship.id}", "nouvelle_bourse",
                                t(f"Nouvelle bourse pour vous : « {title} » (score {m.score}/100).",
                                  f"New scholarship for you: \"{title}\" (score {m.score}/100)."), m.scholarship.id)
    return created


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
