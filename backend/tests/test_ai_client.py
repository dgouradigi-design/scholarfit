"""Vérifie le branchement Claude sans appeler l'API (client simulé)."""
import json
from types import SimpleNamespace

from app.ai import client as ai_client
from app.ai.chat import extract_criteria


class FakeMessages:
    def __init__(self, payload, stop="end_turn"):
        self.payload, self.stop, self.kwargs = payload, stop, None

    def create(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(stop_reason=self.stop, content=[SimpleNamespace(type="text", text=self.payload)])


def install(monkeypatch, payload, stop="end_turn"):
    fake = FakeMessages(payload, stop)
    monkeypatch.setattr(ai_client, "_get_client", lambda: SimpleNamespace(beta=SimpleNamespace(messages=fake)))
    return fake


def test_ai_extraction_merges(monkeypatch):
    fake = install(monkeypatch, json.dumps({
        "target_level": "BAC5", "age": None, "nationalities": ["ML"], "wished_countries": ["FR"],
        "domain": "agriculture", "full_funding_only": None, "grade_average": None, "deadline_after": None,
    }))
    crit, used = extract_criteria("je suis malien, master agronomie en France", {"age": 24}, use_ai=True)
    assert used and crit == {"age": 24, "target_level": "BAC5", "nationalities": ["ML"], "wished_countries": ["FR"], "domain": "agriculture"}
    assert fake.kwargs["output_config"]["format"]["type"] == "json_schema"
    assert fake.kwargs["fallbacks"] == "default"


def test_refusal_falls_back_to_rules(monkeypatch):
    install(monkeypatch, "", stop="refusal")
    crit, used = extract_criteria("Je vise un master", {}, use_ai=True)
    assert not used and crit["target_level"] == "BAC5"
