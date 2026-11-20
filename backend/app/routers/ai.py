from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..ai.documents import generate_letter, review_cv
from ..db import get_db
from ..models import Application, Document, Scholarship, User
from ..quota import can_use_ai
from ..routers.profile import get_profile
from ..schemas import CVReviewOut, CVTextIn, LetterIn, LetterOut
from ..security import current_user

router = APIRouter(prefix="/api", tags=["IA : CV et lettres"])


@router.post("/cv/review", response_model=CVReviewOut)
def cv_review(body: CVTextIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Scholarship, body.scholarship_id) if body.scholarship_id else None
    return review_cv(body.text, body.target_format, s, use_ai=can_use_ai(user, db))


@router.post("/cv/save", status_code=201)
def cv_save(body: CVTextIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Enregistre une version améliorée du CV (l'étudiant a accepté des réécritures)."""
    p = get_profile(user, db)
    p.cv_text = body.text
    doc = Document(user_id=user.id, kind="cv_ameliore", title="CV amélioré", content=body.text)
    db.add(doc)
    db.commit()
    return {"id": doc.id}


@router.post("/letters", response_model=LetterOut)
def letter(body: LetterIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Scholarship, body.scholarship_id)
    if not s:
        raise HTTPException(404, "Bourse introuvable")
    p = get_profile(user, db)
    answers = {"why_country": body.why_country, "why_program": body.why_program, "project_after": body.project_after, "proud_of": body.proud_of}
    text, warnings, ai_used = generate_letter(p, s, answers, body.language, body.max_words, body.tone, use_ai=can_use_ai(user, db))

    # On range la lettre dans la candidature (créée si besoin) pour le suivi.
    app = next((a for a in user.applications if a.scholarship_id == s.id), None)
    if app is None:
        app = Application(user_id=user.id, scholarship_id=s.id, checklist={r: False for r in (s.requirements or ["cv", "lettre"])})
        db.add(app)
    app.letter = text
    db.add(Document(user_id=user.id, kind="lettre", title=f"Lettre : {s.title}", content=text))
    db.commit()
    return LetterOut(letter=text, word_count=len(text.split()), warnings=warnings, ai_used=ai_used)
