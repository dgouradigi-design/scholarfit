from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai.chat import extract_criteria, next_question, summarize_understanding
from ..db import get_db
from ..matching import Criteria, rank
from ..models import Scholarship, User
from ..quota import can_use_ai
from ..schemas import ChatIn, ChatOut, QuickReply
from ..security import optional_user
from ..serializers import match_out

router = APIRouter(prefix="/api", tags=["assistant"])
ANONYMOUS_LIMIT = 3


@router.post("/chat", response_model=ChatOut)
def chat(body: ChatIn, user: User | None = Depends(optional_user), db: Session = Depends(get_db)):
    last = next((m.content for m in reversed(body.messages) if m.role == "user"), "")
    previous = dict(body.criteria or {})

    # Si l'étudiant est connecté, on part de son profil.
    if user and user.profile and not previous:
        p = user.profile
        pc = Criteria.from_profile(p)
        previous = {k: v for k, v in {
            "target_level": pc.target_level, "nationalities": pc.nationalities, "age": pc.age,
            "domain": pc.domain, "wished_countries": pc.wished_countries,
            "full_funding_only": pc.full_funding_only or None, "grade_average": pc.grade_average,
            "language_scores": pc.language_scores or None, "situations": pc.situations or None,
        }.items() if v not in (None, [], {})}

    criteria, ai_used = extract_criteria(last, previous, use_ai=can_use_ai(user, db))
    question, replies, missing = next_question(criteria)
    understood = summarize_understanding(criteria)

    if question:
        reply = (f"J'ai compris : {understood}. " if understood else "") + question
        return ChatOut(reply=reply, criteria=criteria, missing=missing,
                       quick_replies=[QuickReply(**r) for r in replies], ai_used=ai_used)

    # Profil minimum connu : recherche dans NOTRE base (jamais de réponse de mémoire).
    scholarships = list(db.scalars(select(Scholarship).where(Scholarship.status != "expiree", Scholarship.kind == "bourse")))
    results, excluded = rank(scholarships, Criteria.from_dict(criteria), limit=20)

    # Les critères donnés dans le chat remplissent le profil s'il est vide.
    if user and user.profile:
        p = user.profile
        p.target_level = p.target_level or criteria.get("target_level")
        p.domain = p.domain or criteria.get("domain")
        p.nationalities = p.nationalities or criteria.get("nationalities", [])
        p.wished_countries = p.wished_countries or criteria.get("wished_countries", [])
        db.commit()

    shown = results if user else results[:ANONYMOUS_LIMIT]
    if not results:
        reply = (f"J'ai compris : {understood}. Je n'ai trouvé aucune bourse ouverte avec ces critères "
                 f"({excluded} exclues). Essaie d'élargir les pays ou d'accepter un financement partiel.")
        quick = [QuickReply(label="N'importe quel pays", value="peu importe le pays"),
                 QuickReply(label="Financement partiel accepté", value="financement partiel accepté")]
    else:
        reply = f"J'ai compris : {understood}. Voici {len(results)} bourse(s) qui te correspondent, triées par pertinence et date limite."
        if not user and len(results) > ANONYMOUS_LIMIT:
            reply += f" Crée un compte gratuit pour voir les {len(results) - ANONYMOUS_LIMIT} autres et préparer ton dossier."
        reply += " Tu peux affiner : « seulement les bourses complètes », « date limite après mars »…"
        quick = [QuickReply(label="Seulement financement complet", value="seulement les bourses complètes"),
                 QuickReply(label="Date limite après mars", value="date limite après mars")]
    return ChatOut(reply=reply, criteria=criteria, missing=[], quick_replies=quick,
                   results=[match_out(m) for m in shown], ai_used=ai_used)
