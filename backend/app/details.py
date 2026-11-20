"""Fiche détaillée d'une bourse : conditions en clair, pièces à fournir, étapes pour postuler.

Les conditions sont d'abord déduites des champs structurés (niveau, nationalité, âge, moyenne,
langue, public ciblé), puis complétées par les conditions propres à la bourse (champ
``eligibility``). Les étapes sont générées selon le mode de candidature (``apply_via``), sauf si
la bourse a ses propres étapes (``application_steps``).
"""
from __future__ import annotations

from .geo import REGIONS, region_of
from .models import Scholarship
from .vocab import COUNTRIES, DOMAINS, LEVELS, NATIONALITY_GROUPS

REQUIREMENTS: dict[str, tuple[str, str]] = {
    "cv": ("CV", "CV à jour d'une à deux pages, au format demandé (souvent Europass en Europe, résumé d'une page aux États-Unis)."),
    "lettre": ("Lettre de motivation", "Lettre adaptée à cette bourse : ton projet d'études, pourquoi ce pays et ce programme, ce que tu feras ensuite. Respecte la limite de mots indiquée."),
    "recommandation": ("Lettres de recommandation", "En général deux lettres d'enseignants ou d'employeurs qui te connaissent bien, signées, sur papier à en-tête. Préviens tes référents au moins un mois avant."),
    "releves": ("Relevés de notes", "Relevés officiels des dernières années d'études (souvent depuis le bac), avec traduction certifiée en anglais ou en français si nécessaire."),
    "test_langue": ("Test de langue", "Résultat officiel d'un test reconnu (IELTS, TOEFL, DELF/DALF, TCF, TestDaF…), en cours de validité (souvent moins de 2 ans)."),
    "projet_recherche": ("Projet de recherche", "Projet de 2 à 5 pages : question de recherche, méthode, calendrier et intérêt du sujet. Idéalement validé par un futur directeur de recherche."),
    "passeport": ("Passeport", "Copie de la page d'identité d'un passeport valide pendant toute la durée des études."),
    "diplome": ("Copie du diplôme", "Copie certifiée conforme du dernier diplôme obtenu (ou attestation de réussite), traduite si nécessaire."),
    "certificat_medical": ("Certificat médical", "Certificat médical récent, parfois sur un formulaire imposé par l'organisme."),
    "lettre_admission": ("Lettre d'admission", "Lettre d'admission ou de pré-acceptation de l'université d'accueil, si la bourse l'exige avant la candidature."),
    "photo": ("Photo d'identité", "Photo d'identité récente au format demandé."),
    "portfolio": ("Portfolio", "Sélection de travaux (arts, design, architecture) au format numérique demandé."),
    "justificatif_revenus": ("Justificatif de revenus", "Pièces montrant les revenus du foyer, pour les bourses sur critères sociaux."),
}

GROUP_LABELS = {
    "AFRICA": "ressortissants d'un pays africain",
    "EU": "ressortissants de l'Union européenne",
    "FRANCOPHONIE": "ressortissants d'un pays de la Francophonie",
    "DEVELOPING": "ressortissants d'un pays en développement (liste de l'organisme)",
    "COMMONWEALTH": "ressortissants d'un pays du Commonwealth éligible",
    "LATAM": "ressortissants d'Amérique latine ou des Caraïbes",
    "ASIA": "ressortissants d'un pays d'Asie",
}
TARGET_LABELS = {
    "refugie": "réservée aux personnes réfugiées ou déplacées",
    "handicap": "réservée aux étudiants en situation de handicap",
    "revenus_modestes": "réservée aux candidats issus de familles à revenus modestes",
    "premiere_generation": "réservée aux étudiants de première génération à l'université",
    "femmes": "réservée aux candidates femmes",
}
COVERAGE_LABELS = {"frais": "frais de scolarité", "logement": "logement", "voyage": "billet d'avion",
                   "allocation": "allocation mensuelle", "assurance": "assurance santé"}


def _names(codes: list[str], limit: int = 8) -> str:
    names = [COUNTRIES.get(c, c) for c in codes]
    if len(names) > limit:
        return ", ".join(names[:limit]) + f" et {len(names) - limit} autres pays"
    return ", ".join(names)


def regions(s: Scholarship) -> list[str]:
    out = []
    for c in s.study_countries or []:
        r = region_of(c)
        if r and r not in out:
            out.append(r)
    return out


def _when_where(s: Scholarship) -> list[str]:
    out = []
    if s.event_start:
        from .deadlines import fr_date

        if s.event_end and s.event_end != s.event_start:
            out.append(f"Dates : du {fr_date(s.event_start)} au {fr_date(s.event_end)}.")
        else:
            out.append(f"Date : {fr_date(s.event_start)}.")
    place = s.city or ""
    if s.study_countries:
        place = ", ".join(filter(None, [place, _names(s.study_countries)]))
    if place:
        out.append(f"Lieu : {place}" + (" (participation en ligne possible)." if s.remote else "."))
    elif s.remote:
        out.append("En ligne / à distance.")
    if s.duration:
        out.append(f"Durée : {s.duration}.")
    return out


def eligibility_notes(s: Scholarship) -> list[str]:
    notes: list[str] = []
    kind = s.kind or "bourse"
    if kind != "bourse":
        notes.extend(_when_where(s))
    if s.levels:
        notes.append(("Niveau financé : " if kind == "bourse" else "Niveau d'études visé : ") + " ; ".join(LEVELS.get(l, l) for l in s.levels) + ".")
    nat = s.eligible_nationalities or ["ALL"]
    if "ALL" in nat:
        line = "Ouverte à toutes les nationalités"
    else:
        groups = [GROUP_LABELS[n] for n in nat if n in GROUP_LABELS]
        countries = [n for n in nat if n not in NATIONALITY_GROUPS]
        parts = groups + ([f"ressortissants de : {_names(countries)}"] if countries else [])
        line ="Réservée aux " + " ou ".join(parts)
    if s.excluded_nationalities:
        excl = [GROUP_LABELS.get(n, COUNTRIES.get(n, n)) for n in s.excluded_nationalities]
        line += f" (sauf : {', '.join(excl)})"
    notes.append(line + ".")
    if kind == "bourse":
        if s.study_countries:
            notes.append(f"Études dans : {_names(s.study_countries)}.")
        else:
            notes.append("Études possibles dans plusieurs pays (selon le programme ou l'université choisie).")
    if s.domains and "tous" not in s.domains:
        notes.append(("Domaines financés : " if kind == "bourse" else "Domaines : ") + ", ".join(DOMAINS.get(d, d).lower() for d in s.domains) + ".")
    else:
        notes.append("Tous les domaines sont acceptés.")
    if s.max_age:
        notes.append(f"Âge maximum : {s.max_age} ans (en général à la date limite ou au début du programme).")
    if s.min_grade is not None:
        notes.append(f"Excellent dossier attendu : moyenne d'au moins {s.min_grade:g}/20 environ (ou équivalent).")
    if s.language_tests:
        tests = " ou ".join(f"{t} {m:g}" for t, m in s.language_tests.items())
        notes.append(f"Niveau de langue prouvé par un test : {tests} minimum.")
    elif s.languages:
        langs = {"fr": "français", "en": "anglais", "de": "allemand", "es": "espagnol", "pt": "portugais", "it": "italien",
                 "zh": "chinois", "ja": "japonais", "ko": "coréen", "ru": "russe", "ar": "arabe", "tr": "turc", "hu": "hongrois", "nl": "néerlandais"}
        notes.append("Langue d'enseignement : " + " ou ".join(langs.get(l, l) for l in s.languages) + ".")
    for g in s.target_groups or []:
        notes.append(TARGET_LABELS.get(g, g).capitalize() + ".")
    notes.extend(s.eligibility or [])
    if kind == "stage" and (s.amount or s.coverage):
        if s.amount:
            notes.append(f"Stage rémunéré : environ {s.amount:,.0f} {s.currency or ''} par {s.amount_period or 'mois'}.".replace(",", " "))
    if s.coverage:
        notes.append(("Ce qui est couvert : " if kind == "bourse" else "Prise en charge : ") + ", ".join(COVERAGE_LABELS.get(c, c) for c in s.coverage)
                     + (" (financement complet)." if s.full_funding else "."))
    return notes


def documents(s: Scholarship) -> list[dict]:
    out = []
    detail = s.documents_detail or {}
    for code in s.requirements or []:
        label, default = REQUIREMENTS.get(code, (code, ""))
        text = detail.get(code) or default
        if code == "test_langue" and s.language_tests and not detail.get(code):
            text += " Scores demandés : " + ", ".join(f"{t} {m:g}" for t, m in s.language_tests.items()) + "."
        out.append({"code": code, "label": label, "detail": text})
    for i, extra in enumerate(s.extra_documents or []):
        out.append({"code": f"autre_{i + 1}", "label": extra, "detail": ""})
    if not out:
        out.append({"code": "voir_site", "label": "Liste des pièces sur le site officiel",
                    "detail": "L'organisme ne publie pas de liste unique : consulte l'appel à candidatures."})
    return out


def application_steps(s: Scholarship) -> list[str]:
    if s.application_steps:
        return list(s.application_steps)
    url = s.apply_url or s.official_url
    if (s.kind or "bourse") == "stage":
        return [
            f"Consulte l'offre de stage sur la page officielle ({url}) et vérifie le niveau d'études, la durée et les dates demandés.",
            "Crée ton compte sur le portail de recrutement de l'organisation et active les alertes pour ton domaine.",
            "Adapte ton CV et ta lettre de motivation à la mission (ScholarFit peut t'aider à les préparer).",
            "Prépare une attestation d'inscription de ton université ou de ton dernier diplôme, souvent demandée.",
            "Envoie ta candidature avant la date limite de l'offre, puis prépare l'entretien ou le test écrit.",
        ]
    if s.kind == "conference":
        return [
            f"Lis le programme et les conditions de participation sur le site officiel ({url}).",
            "Si la conférence propose une prise en charge (travel grant, bourse de participation), dépose ta demande avant la date limite.",
            "Prépare ce qui est demandé : résumé de ta recherche ou de ton projet, CV, lettre de motivation.",
            "Une fois accepté(e), demande la lettre d'invitation pour le visa et réserve ton voyage.",
        ]
    steps = [
        f"Lis l'appel à candidatures complet sur le site officiel ({url}) et vérifie que tu remplis chaque condition ci-dessus.",
    ]
    via = s.apply_via or "direct"
    if via == "universite":
        steps.append("Choisis ton programme et fais d'abord ta demande d'admission à l'université : la bourse se demande en même temps ou juste après.")
    elif via == "ambassade":
        steps.append("Contacte l'ambassade ou le service culturel du pays d'accueil dans ton pays : c'est lui qui publie le calendrier et reçoit les dossiers.")
    elif via == "etablissement":
        steps.append("Fais-toi admettre dans un établissement partenaire : c'est l'établissement d'accueil qui présente ta candidature à la bourse.")
    elif via == "nomination":
        steps.append("Demande à ton université ou à ton futur directeur de recherche de proposer ta candidature : la bourse fonctionne sur nomination.")
    else:
        steps.append("Crée ton compte sur le portail de candidature de l'organisme.")
    needs = set(s.requirements or [])
    prep = []
    if "recommandation" in needs:
        prep.append("demande tes lettres de recommandation (au moins un mois avant)")
    if "test_langue" in needs:
        prep.append("passe ou planifie ton test de langue")
    if "releves" in needs or "diplome" in needs:
        prep.append("fais certifier et traduire relevés et diplômes")
    if "projet_recherche" in needs:
        prep.append("rédige ton projet de recherche avec ton futur encadrant")
    if prep:
        steps.append("Prépare les pièces qui prennent du temps : " + ", ".join(prep) + ".")
    steps.append("Rédige ta lettre de motivation et mets ton CV au format demandé (ScholarFit peut t'aider à les préparer).")
    steps.append("Rassemble toutes les pièces de la liste, vérifie-les une dernière fois, puis dépose ton dossier avant la date limite.")
    steps.append("Garde l'accusé de réception et prépare l'entretien éventuel : la sélection prend souvent plusieurs mois.")
    return steps


def region_labels(codes: list[str]) -> list[str]:
    return [REGIONS.get(c, c) for c in codes]
