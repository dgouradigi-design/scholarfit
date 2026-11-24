from datetime import date

from app.ai.chat import parse_rules
from app.matching import Criteria, hard_filter, score
from app.models import Scholarship
from app.scrapers.extract import extract_rules, find_amount, find_deadline


def make(**kw):
    base = dict(title="T", organization="O", official_url="https://x", summary="", levels=["BAC5"], study_countries=["FR"],
                eligible_nationalities=["ALL"], excluded_nationalities=[], domains=["tous"], languages=[], coverage=[],
                full_funding=False, deadline=date(2099, 1, 1), max_age=None, min_grade=None, requirements=[],
                language_tests={}, target_groups=[], status="active")
    base.update(kw)
    return Scholarship(**base)


TODAY = date(2026, 11, 16)


def crit(**kw):
    base = dict(target_level="BAC5", nationalities=["SN"], age=23, domain="informatique")
    base.update(kw)
    return Criteria(**base)


def test_hard_filters():
    assert hard_filter(make(), crit(), TODAY) is None
    assert hard_filter(make(levels=["BAC7"]), crit(), TODAY) == "niveau"
    assert hard_filter(make(eligible_nationalities=["EU"]), crit(), TODAY) == "nationalité"
    assert hard_filter(make(eligible_nationalities=["AFRICA"]), crit(), TODAY) is None
    assert hard_filter(make(excluded_nationalities=["SN"]), crit(), TODAY) == "nationalité"
    assert hard_filter(make(max_age=21), crit(), TODAY) == "âge"
    assert hard_filter(make(deadline=date(2026, 1, 1)), crit(), TODAY) == "date limite dépassée"
    assert hard_filter(make(study_countries=["JP"]), crit(wished_countries=["FR"]), TODAY) == "pays d'étude"
    assert hard_filter(make(target_groups=["femmes"]), crit(), TODAY) == "public ciblé"
    assert hard_filter(make(target_groups=["femmes"]), crit(situations=["femmes"]), TODAY) is None


def test_score_rewards_fit():
    good = score(make(domains=["informatique"], full_funding=True), crit(wished_countries=["FR"]), TODAY)
    weak = score(make(domains=["droit"], language_tests={"IELTS": 7.5}, min_grade=17), crit(grade_average=12), TODAY)
    assert good.score > weak.score
    assert good.chance == "bonne"
    assert weak.chance == "faible"
    assert any("IELTS" in g for g in weak.gaps)


def test_chat_parser():
    c = parse_rules("Je suis ivoirien, 25 ans, je veux faire un doctorat en physique en Allemagne, bourse complète")
    assert c["nationalities"] == ["CI"] and c["target_level"] == "BAC7" and c["domain"] == "physique"
    assert c["wished_countries"] == ["DE"] and c["age"] == 25 and c["full_funding_only"] is True
    assert parse_rules("Je vise un master")["target_level"] == "BAC5"
    assert "domain" not in parse_rules("Je veux partir étudier")  # « partir » ne doit pas donner « arts »


def test_extract_rules():
    html_text = "Bourse X\nCette bourse finance un master en France. Allocation de 1 200 € par mois.\nDate limite : 15 mars 2099."
    assert find_deadline(html_text) == date(2099, 3, 15)
    assert find_amount(html_text) == (1200.0, "EUR", "mois")
    rec = extract_rules("Bourse X", html_text, "https://exemple.org/x")
    assert rec["levels"] == ["BAC5"]
