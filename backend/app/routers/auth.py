from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Profile, User
from ..schemas import LoginIn, RegisterIn, TokenOut, UserOut
from ..security import create_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["comptes"])


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    pw = body.password
    if not any(ch.isalpha() for ch in pw) or not any(ch.isdigit() for ch in pw):
        raise HTTPException(422, "Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.")
    if pw.strip().lower() == email or pw.lower() in email:
        raise HTTPException(422, "Le mot de passe ne doit pas reprendre votre adresse e-mail.")
    if db.scalars(select(User).where(User.email == email)).first():
        raise HTTPException(409, "Un compte existe déjà avec cet e-mail : connectez-vous ou utilisez une autre adresse.")
    user = User(email=email, password_hash=hash_password(body.password), is_admin=email in get_settings().admin_email_list)
    user.profile = Profile()
    db.add(user)
    db.commit()
    return TokenOut(access_token=create_token(user.id))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalars(select(User).where(User.email == body.email.strip().lower())).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "E-mail ou mot de passe incorrect")
    return TokenOut(access_token=create_token(user.id))


@router.get("/email-disponible")
def email_available(email: str, db: Session = Depends(get_db)):
    """Pour le formulaire d'inscription : prévient tout de suite si un compte existe déjà."""
    return {"available": db.scalars(select(User).where(User.email == email.strip().lower())).first() is None}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.delete("/me", status_code=204)
def delete_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Suppression du compte en un clic : profil, CV, lettres, candidatures, accompagnements et alertes."""
    if user.advisor is not None:  # ses candidats repassent en attente d'un nouveau conseiller
        for c in user.advisor.coachings:
            if c.status == "en_cours":
                c.status = "demande"
    db.delete(user)
    db.commit()
