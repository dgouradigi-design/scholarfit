from datetime import date

from . import details
from .deadlines import deadline_info
from .matching import MatchResult
from .models import Scholarship
from .schemas import DocumentItem, MatchOut, ScholarshipOut
from .vocab import KINDS


def scholarship_out(s: Scholarship, today: date | None = None) -> ScholarshipOut:
    out = ScholarshipOut.model_validate(s)
    out.source_name = s.source.name if s.source else None
    out.eligibility_notes = details.eligibility_notes(s)
    out.documents = [DocumentItem(**d) for d in details.documents(s)]
    out.application_steps = details.application_steps(s)
    out.regions = details.regions(s)
    out.apply_url = s.apply_url or s.official_url
    out.kind = s.kind or "bourse"
    out.kind_label = KINDS.get(out.kind, out.kind)
    info = deadline_info(s, today)
    out.deadline_status, out.priority, out.days_left = info.status, info.priority, info.days_left
    out.deadline_label, out.next_expected_deadline = info.label, info.next_expected
    return out


def match_out(m: MatchResult) -> MatchOut:
    return MatchOut(
        scholarship=scholarship_out(m.scholarship), score=m.score, chance=m.chance,
        reasons=m.reasons, gaps=m.gaps, days_left=m.days_left,
    )
