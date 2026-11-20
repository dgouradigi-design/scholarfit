from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Alert, Application, Scholarship, User
from ..schemas import AlertOut, ApplicationIn, ApplicationOut, ApplicationUpdate, DocCheckOut
from ..security import current_user
from ..serializers import scholarship_out

router = APIRouter(prefix="/api", tags=["suivi des candidatures"])
STATUSES = ["a_preparer", "en_cours", "envoyee", "acceptee", "refusee"]


def app_out(a: Application) -> ApplicationOut:
    return ApplicationOut(
        id=a.id, status=a.status, checklist=a.checklist or {}, notes=a.notes, letter=a.letter,
        created_at=a.created_at, updated_at=a.updated_at, scholarship=scholarship_out(a.scholarship),
    )


def _get(app_id: int, user: User, db: Session) -> Application:
    a = db.get(Application, app_id)
    if not a or a.user_id != user.id:
        raise HTTPException(404, "Candidature introuvable")
    return a


@router.get("/applications", response_model=list[ApplicationOut])
def list_apps(user: User = Depends(current_user), db: Session = Depends(get_db)):
    apps = db.scalars(select(Application).where(Application.user_id == user.id).order_by(Application.updated_at.desc()))
    return [app_out(a) for a in apps]


@router.post("/applications", response_model=ApplicationOut, status_code=201)
def add_app(body: ApplicationIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Scholarship, body.scholarship_id)
    if not s:
        raise HTTPException(404, "Bourse introuvable")
    existing = db.scalars(select(Application).where(Application.user_id == user.id, Application.scholarship_id == s.id)).first()
    if existing:
        return app_out(existing)
    a = Application(user_id=user.id, scholarship_id=s.id, checklist={r: False for r in (s.requirements or ["cv", "lettre"])})
    db.add(a)
    db.commit()
    return app_out(a)


@router.patch("/applications/{app_id}", response_model=ApplicationOut)
def update_app(app_id: int, body: ApplicationUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = _get(app_id, user, db)
    if body.status is not None:
        if body.status not in STATUSES:
            raise HTTPException(422, f"Statut inconnu. Valeurs : {STATUSES}")
        a.status = body.status
    if body.checklist is not None:
        a.checklist = {**(a.checklist or {}), **body.checklist}
    if body.notes is not None:
        a.notes = body.notes
    if body.letter is not None:
        a.letter = body.letter
        a.checklist = {**(a.checklist or {}), "lettre": bool(body.letter.strip())}
    db.commit()
    return app_out(a)


@router.delete("/applications/{app_id}", status_code=204)
def delete_app(app_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_get(app_id, user, db))
    db.commit()


@router.get("/applications/{app_id}/check", response_model=DocCheckOut)
def check_app(app_id: int, max_words: int = 500, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Vérification du dossier avant envoi : pièces manquantes, longueur de la lettre, test de langue."""
    a = _get(app_id, user, db)
    s = a.scholarship
    p = user.profile
    items = []
    for req, done in (a.checklist or {}).items():
        items.append({"label": f"Pièce : {req}", "ok": bool(done), "detail": None if done else "pas encore cochée comme prête"})
    if a.letter:
        words = len(a.letter.split())
        items.append({"label": "Longueur de la lettre", "ok": words <= max_words, "detail": f"{words} mots (limite {max_words})"})
        if "[" in a.letter:
            items.append({"label": "Emplacements à compléter", "ok": False, "detail": "la lettre contient encore des [crochets]"})
        if "en" in (s.languages or []) and "fr" not in (s.languages or []):
            french = sum(a.letter.lower().count(w) for w in (" je ", " le ", " les ", " des ", " et "))
            items.append({"label": "Langue de la lettre", "ok": french < 5, "detail": "la bourse attend une lettre en anglais" if french >= 5 else None})
    elif "lettre" in (s.requirements or []):
        items.append({"label": "Lettre de motivation", "ok": False, "detail": "aucune lettre enregistrée"})
    if s.language_tests and p is not None:
        ok = any((p.language_scores or {}).get(t, -1) >= m for t, m in s.language_tests.items())
        items.append({"label": "Test de langue", "ok": ok, "detail": None if ok else "demandé : " + " ou ".join(f"{t} {m:g}" for t, m in s.language_tests.items())})
    if s.min_grade and p is not None and p.grade_average is not None:
        items.append({"label": "Moyenne minimum", "ok": p.grade_average >= s.min_grade, "detail": f"{p.grade_average:g}/20 pour {s.min_grade:g}/20 demandé"})
    return DocCheckOut(ok=all(i["ok"] for i in items), items=items)


@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(Alert).where(Alert.user_id == user.id).order_by(Alert.created_at.desc()).limit(50)))


@router.post("/alerts/{alert_id}/read", status_code=204)
def read_alert(alert_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(Alert, alert_id)
    if a and a.user_id == user.id:
        a.read = True
        db.commit()
