"""ZK Verify AI: guided KYC session lifecycle and human review (FR-02 – FR-05)."""
import logging
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import ai
from ..audit import audit
from ..db import get_db
from ..kyc_checks import mask_number, ocr_image, run_checks, valid_format
from ..models import KycSession, User, utcnow
from ..security import current_user, require_reviewer

router = APIRouter(tags=["kyc"])
log = logging.getLogger(__name__)
MAX_UPLOAD = 8 * 1024 * 1024
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}


class StartIn(BaseModel):
    consent: bool


class DetailsIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    date_of_birth: date


class ChatIn(BaseModel):
    step: str = Field(default="welcome", pattern=r"^(welcome|details|document|liveness|submit)$")
    message: str | None = Field(default=None, max_length=1000)


class LivenessIn(BaseModel):
    # "on_device": blink + head-turn challenges run with MediaPipe in the browser.
    # "simulated": camera unavailable or skipped; recorded and labelled as simulated.
    method: Literal["simulated", "on_device"] = "simulated"
    challenges: list[Literal["blink", "turn_left", "turn_right"]] = Field(default_factory=list, max_length=6)
    duration_ms: int | None = Field(default=None, ge=0, le=600_000)


class DecisionIn(BaseModel):
    decision: str = Field(pattern=r"^(approved|rejected|needs_review)$")
    reason_code: str = Field(default="reviewer_decision", max_length=60)


def session_out(s: KycSession) -> dict:
    return {
        "id": s.id, "status": s.status, "session_type": s.session_type,
        "declared": s.declared, "extracted": s.extracted, "checks": s.checks or [],
        "ai_summary": s.ai_summary, "transcript": s.transcript or [],
        "started_at": s.started_at.isoformat(),
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
        "decision_reason_code": s.decision_reason_code,
        "ai_provider": ai.provider_name(),
    }


def _own_session(db: Session, user: User, session_id: str, editable: bool = True) -> KycSession:
    s = db.get(KycSession, session_id)
    if s is None or s.user_id != user.id:
        raise HTTPException(404, "KYC session not found")
    if editable and s.status not in ("started",):
        raise HTTPException(409, "This session has already been submitted")
    return s


@router.post("/api/kyc/sessions")
def start(body: StartIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not body.consent:
        raise HTTPException(400, "Consent is required to start a verification session")
    greeting = ai.assistant_reply("welcome", [], None)
    s = KycSession(user_id=user.id, declared={}, extracted={}, checks=[],
                   transcript=[{"role": "assistant", "content": greeting, "step": "welcome"}])
    db.add(s)
    db.flush()
    audit(db, user.id, "kyc.started", "kyc_session", s.id, consent=True)
    db.commit()
    return session_out(s)


@router.get("/api/kyc/sessions/{session_id}")
def get_session(session_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return session_out(_own_session(db, user, session_id, editable=False))


@router.post("/api/kyc/sessions/{session_id}/chat")
def chat(session_id: str, body: ChatIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = _own_session(db, user, session_id)
    history = list(s.transcript or [])
    reply = ai.assistant_reply(body.step, history, body.message)
    if body.message:
        history.append({"role": "user", "content": body.message, "step": body.step})
    history.append({"role": "assistant", "content": reply, "step": body.step})
    s.transcript = history[-40:]
    db.commit()
    return {"reply": reply, "transcript": s.transcript}


@router.post("/api/kyc/sessions/{session_id}/details")
def details(session_id: str, body: DetailsIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = _own_session(db, user, session_id)
    s.declared = {"full_name": body.full_name.strip(), "date_of_birth": body.date_of_birth.isoformat()}
    db.commit()
    return session_out(s)


@router.post("/api/kyc/sessions/{session_id}/documents")
async def upload_document(session_id: str, file: UploadFile = File(...),
                          user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = _own_session(db, user, session_id)
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Upload a PNG, JPEG or WebP image of the test document")
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "Image is larger than 8 MB")
    try:
        text = ocr_image(data)
    except Exception as exc:
        # A missing Tesseract binary is a server setup problem, not a bad upload
        if type(exc).__name__ == "TesseractNotFoundError":
            log.error("Tesseract not found; install it or set TESSERACT_CMD in backend/.env")
            raise HTTPException(503, "OCR engine is not installed on the server")
        raise HTTPException(422, "Could not read this image")
    finally:
        del data  # the raw document is never persisted
    fields, method = ai.extract_fields(text)
    previous_liveness = (s.extracted or {}).get("liveness")  # keep a liveness result if it came first
    s.extracted = {
        **({"liveness": previous_liveness} if previous_liveness else {}),
        "full_name": fields.get("full_name"),
        "date_of_birth": fields.get("date_of_birth"),
        "document_type": fields.get("document_type"),
        "document_number_masked": mask_number(fields.get("document_number")),
        "specimen_marker": bool(fields.get("specimen_marker")),
        "ocr_chars": len(text.strip()),
        "extraction_method": method,
        # Only the outcome of the format check is kept, never the full number.
        "document_format_valid": valid_format(fields.get("document_type"), fields.get("document_number")),
    }
    audit(db, user.id, "kyc.document_processed", "kyc_session", s.id, method=method)
    db.commit()
    return session_out(s)


@router.post("/api/kyc/sessions/{session_id}/liveness")
def liveness(session_id: str, body: LivenessIn | None = None,
             user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Record the liveness step. No video or images reach the server.

    On-device results come from the user's browser and can't be verified here,
    so they are labelled as not certified. Production would use a certified SDK.
    """
    body = body or LivenessIn()
    if body.method == "on_device" and not {"blink", "turn_left", "turn_right"} <= set(body.challenges):
        raise HTTPException(400, "On-device liveness needs the blink and both head-turn challenges")
    s = _own_session(db, user, session_id)
    s.extracted = {**(s.extracted or {}), "liveness": {"method": body.method, "challenges": body.challenges,
                                                       "duration_ms": body.duration_ms}}
    audit(db, user.id, f"kyc.liveness_{body.method}", "kyc_session", s.id)
    db.commit()
    return {"method": body.method, "simulated": body.method == "simulated", "completed": True}


@router.post("/api/kyc/sessions/{session_id}/complete")
def complete(session_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = _own_session(db, user, session_id)
    if not s.declared or not s.extracted or "ocr_chars" not in (s.extracted or {}):
        raise HTTPException(400, "Enter your details and upload the test document first")
    checks = run_checks(s.declared, s.extracted, s.extracted.get("ocr_chars", 0),
                        (s.extracted.get("liveness") or {}).get("method"))
    s.checks = checks
    s.ai_summary = ai.reviewer_summary(s.declared, s.extracted, checks)
    # AI never approves: every completed session goes to a human reviewer.
    s.status = "needs_review"
    s.completed_at = utcnow()
    explanation = ai.explain_checks(checks)
    s.transcript = (s.transcript or []) + [{"role": "assistant", "content": explanation, "step": "submit"}]
    audit(db, user.id, "kyc.submitted", "kyc_session", s.id,
          passed=sum(c["passed"] for c in checks), total=len(checks))
    db.commit()
    return {**session_out(s), "explanation": explanation}


@router.get("/api/kyc/sessions/{session_id}/summary")
def summary(session_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(KycSession, session_id)
    if s is None or (s.user_id != user.id and user.role != "reviewer"):
        raise HTTPException(404, "KYC session not found")
    return {"id": s.id, "status": s.status, "checks": s.checks or [], "ai_summary": s.ai_summary}


@router.get("/api/verification/status")
def verification_status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = (db.query(KycSession).filter_by(user_id=user.id).order_by(KycSession.started_at.desc()).first())
    return {"kyc": session_out(s) if s else None}


# ---------- reviewer ----------

@router.get("/api/review/queue")
def queue(reviewer: User = Depends(require_reviewer), db: Session = Depends(get_db)):
    sessions = (db.query(KycSession).filter(KycSession.status.in_(["needs_review"]))
                .order_by(KycSession.completed_at.asc()).all())
    out = []
    for s in sessions:
        u = db.get(User, s.user_id)
        out.append({**session_out(s), "user": {"id": u.id, "display_name": u.display_name, "email": u.email}})
    return out


@router.post("/api/review/sessions/{session_id}/decision")
def decide(session_id: str, body: DecisionIn, reviewer: User = Depends(require_reviewer), db: Session = Depends(get_db)):
    s = db.get(KycSession, session_id)
    if s is None:
        raise HTTPException(404, "KYC session not found")
    if s.user_id == reviewer.id:
        raise HTTPException(403, "Reviewers cannot decide their own session")
    if s.status not in ("needs_review",):
        raise HTTPException(409, f"Session is {s.status}, not awaiting review")
    s.status, s.reviewed_by, s.reviewed_at = body.decision, reviewer.id, utcnow()
    s.decision_reason_code = body.reason_code
    audit(db, reviewer.id, f"kyc.{body.decision}", "kyc_session", s.id, reason_code=body.reason_code)
    db.commit()
    return session_out(s)
