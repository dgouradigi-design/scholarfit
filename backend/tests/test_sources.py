"""Sources de collecte : stages ReliefWeb, nom d'organisme, zones de découverte."""
from datetime import date, timedelta

from app.scrapers.collector import load_source_configs, org_from_url
from app.scrapers.discovery import ITEM_SCHEMA, ZONES
from app.scrapers.extract import EXTRACT_SCHEMA
from app.scrapers.reliefweb import iso2, to_record
from app.vocab import DOMAINS


def test_reliefweb_record():
    closing = (date.today() + timedelta(days=20)).isoformat() + "T00:00:00+00:00"
    item = {"id": 1, "fields": {
        "title": "Data Science Intern", "url_alias": "https://reliefweb.int/job/1/data-science-intern",
        "body": "UNICEF Ghana recherche un stagiaire. Le stage dure six mois. Autre phrase.",
        "how_to_apply": "Postulez sur https://jobs.unicef.org/job/123 avant la date limite.",
        "country": [{"iso3": "GHA"}], "source": [{"name": "UNICEF"}],
        "date": {"closing": closing}, "career_categories": [{"name": "Information and Communications Technology"}]}}
    r = to_record(item, DOMAINS)
    assert r["kind"] == "stage" and r["study_countries"] == ["GH"] and r["organization"] == "UNICEF"
    assert r["official_url"] == "https://jobs.unicef.org/job/123" and r["source_page"].startswith("https://reliefweb.int")
    assert r["domains"] == ["informatique"] and r["deadline"] == date.fromisoformat(closing[:10])
    assert iso2("CIV") == "CI" and iso2("XXX") is None


def test_org_from_url():
    assert org_from_url("https://www.chevening.org/apply") == "Chevening"
    assert org_from_url("https://www.daad.de/en/") == "DAAD"
    assert org_from_url("https://www.ox.ac.uk/admissions") == "OX"


def test_sources_and_zones():
    names = {c["name"] for c in load_source_configs() if c.get("enabled", True)}
    assert {"Afri-Carrières", "Scholarship Positions", "ReliefWeb (stages ONU, ONG, organisations internationales)"} <= names
    labels = " ".join(z[0] for z in ZONES)
    assert "Ghana" in labels and "femmes" in labels and "Informatique" in labels
    assert sum(1 for z in ZONES if len(z) > 2 and z[2] == "stage") >= 8
    assert "target_groups" in ITEM_SCHEMA["required"] and "target_groups" in EXTRACT_SCHEMA["required"]
