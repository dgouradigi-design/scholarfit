"""Dossiers CV + lettre : un offert, les suivants à 2 500 F CFA.

Un dossier correspond à une bourse : il couvre la version adaptée du CV et la lettre de
motivation pour cette bourse, avec quelques relances de génération. Le diagnostic du CV et
la modification manuelle des textes restent gratuits et illimités.

Paiement : Mobile Money (Flooz, Mixx by Yas), transfert (TapTap Send, LemFi) ou PI-SPI de la
BCEAO vers les numéros de ScholarFit. L'étudiant déclare son paiement avec la référence de la
transaction ; un administrateur le valide dans /admin et le dossier est crédité.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .i18n import t
from .models import CreditOrder, DocPack, User

ORDER_STATUSES = {"en_verification": "En vérification", "paye": "Payé", "refuse": "Refusé"}


def payment_methods() -> list[dict]:
    s = get_settings()
    return [
        {"code": "flooz", "label": "Flooz", "logo": "/paiement/flooz.png", "number": s.payment_flooz_number,
         "how": t("Depuis votre compte Flooz (Moov Africa), envoyez le montant au numéro ci-dessous.", "From your Flooz (Moov Africa) account, send the amount to the number below.")},
        {"code": "mixx", "label": "Mixx by Yas", "logo": "/paiement/mixx-by-yas.png", "number": s.payment_mixx_number,
         "how": t("Depuis votre compte Mixx by Yas, envoyez le montant au numéro ci-dessous.", "From your Mixx by Yas account, send the amount to the number below.")},
        {"code": "taptap_send", "label": "TapTap Send", "logo": "/paiement/taptap-send.png", "number": s.payment_flooz_number,
         "how": t("Depuis l'étranger, choisissez le Togo puis un envoi Mobile Money vers le numéro ci-dessous.", "From abroad, choose Togo and then a Mobile Money transfer to the number below.")},
        {"code": "lemfi", "label": "LemFi", "logo": "/paiement/lemfi.png", "number": s.payment_mixx_number,
         "how": t("Depuis l'étranger, choisissez le Togo puis un envoi Mobile Money vers le numéro ci-dessous.", "From abroad, choose Togo and then a Mobile Money transfer to the number below.")},
        {"code": "pi_spi", "label": "PI-SPI (BCEAO)", "logo": "/paiement/pi-spi.png", "number": s.payment_flooz_number,
         "how": t("Depuis votre application bancaire ou Mobile Money compatible PI-SPI, payez vers le numéro ci-dessous.", "From a banking or Mobile Money app that supports PI-SPI, pay to the number below.")},
    ]


def _paid_count(user: User, db: Session) -> int:
    return db.scalar(select(func.count()).select_from(CreditOrder).where(CreditOrder.user_id == user.id, CreditOrder.status == "paye")) or 0


def _used_count(user: User, db: Session) -> int:
    return db.scalar(select(func.count()).select_from(DocPack).where(DocPack.user_id == user.id)) or 0


def summary(user: User, db: Session) -> dict:
    s = get_settings()
    free = s.doc_free_packs
    paid = _paid_count(user, db)
    used = _used_count(user, db)
    pending = db.scalar(select(func.count()).select_from(CreditOrder).where(CreditOrder.user_id == user.id, CreditOrder.status == "en_verification")) or 0
    packs = db.scalars(select(DocPack).where(DocPack.user_id == user.id).order_by(DocPack.created_at.desc())).all()
    return {
        "free_total": free,
        "paid_total": paid,
        "used": used,
        "available": max(0, free + paid - used),
        "pending_orders": pending,
        "price": s.doc_pack_price,
        "price_label": f"{s.doc_pack_price:,}".replace(",", " ") + " F CFA",
        "regenerations": s.doc_pack_regenerations,
        "packs": [
            {"scholarship_id": pk.scholarship_id, "scholarship_title": pk.scholarship.title if pk.scholarship else None,
             "cv_runs": pk.cv_runs, "letter_runs": pk.letter_runs, "source": pk.source}
            for pk in packs
        ],
        "methods": payment_methods(),
    }


def find_pack(user: User, scholarship_id: int | None, db: Session) -> DocPack | None:
    stmt = select(DocPack).where(DocPack.user_id == user.id)
    stmt = stmt.where(DocPack.scholarship_id.is_(None)) if scholarship_id is None else stmt.where(DocPack.scholarship_id == scholarship_id)
    return db.scalars(stmt).first()


def use_pack(user: User, scholarship_id: int | None, kind: str, db: Session) -> DocPack:
    """Ouvre (ou reprend) le dossier de cette bourse et compte une génération ``kind`` (cv | lettre).

    Lève 402 si aucun dossier n'est disponible, 429 si les relances du dossier sont épuisées.
    """
    s = get_settings()
    pack = find_pack(user, scholarship_id, db)
    if pack is None:
        free, paid, used = s.doc_free_packs, _paid_count(user, db), _used_count(user, db)
        if used >= free + paid:
            raise HTTPException(402, {
                "code": "dossier_payant",
                "message": t(f"Votre dossier offert a déjà été utilisé. Un nouveau dossier, CV et lettre adaptés à une autre bourse, coûte {s.doc_pack_price:,} F CFA.".replace(",", " "),
                             f"Your free application pack has been used. A new pack, with a CV and letter tailored to another scholarship, costs {s.doc_pack_price:,} F CFA."),
                "price": s.doc_pack_price,
            })
        source = "offert" if used < free else "achat"
        pack = DocPack(user_id=user.id, scholarship_id=scholarship_id, source=source)
        db.add(pack)
        db.flush()
    runs = pack.cv_runs if kind == "cv" else pack.letter_runs
    if runs >= s.doc_pack_regenerations:
        what = t("du CV", "CV") if kind == "cv" else t("de la lettre", "letter")
        raise HTTPException(429, {
            "code": "relances_epuisees",
            "message": t(f"Vous avez utilisé les {s.doc_pack_regenerations} générations {what} prévues pour cette bourse. Vous pouvez encore modifier le texte et le télécharger.",
                         f"You have used the {s.doc_pack_regenerations} {what} generations included for this scholarship. You can still edit the text and download it."),
        })
    return pack


def count_run(pack: DocPack, kind: str) -> None:
    if kind == "cv":
        pack.cv_runs += 1
    else:
        pack.letter_runs += 1


def create_order(user: User, method: str, reference: str | None, payer_phone: str | None, db: Session) -> CreditOrder:
    if method not in {m["code"] for m in payment_methods()}:
        raise HTTPException(422, t("Moyen de paiement inconnu", "Unknown payment method"))
    order = CreditOrder(user_id=user.id, amount=get_settings().doc_pack_price, currency="XOF", method=method,
                        reference=(reference or "").strip()[:120] or None, payer_phone=(payer_phone or "").strip()[:50] or None)
    db.add(order)
    db.commit()
    return order


def set_order_status(order: CreditOrder, status: str, db: Session) -> CreditOrder:
    if status not in ORDER_STATUSES:
        raise HTTPException(422, t("Statut inconnu", "Unknown status"))
    order.status = status
    order.paid_at = datetime.now(timezone.utc) if status == "paye" else None
    db.commit()
    return order
