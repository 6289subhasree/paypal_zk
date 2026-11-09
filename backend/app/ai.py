"""AI assistance for the KYC workflow.

Providers (all free): Ollama running locally (default), Google Gemini API free tier,
or `none`, which uses deterministic templates so the demo still works offline.

The AI guides, extracts, explains and summarizes. It never approves or rejects a
session, and it is never asked to judge identity or liveness from a face, voice or
tone (PRD §9.5). Decisions are made by rule-based checks plus a human reviewer.
"""
import json
import re

import httpx

from .config import get_settings

settings = get_settings()

SYSTEM = (
    "You are the ZK Pass verification assistant in a hackathon demo that uses only test "
    "identity documents. Be brief, friendly and concrete. You help the user complete each "
    "step and explain results. You never decide whether someone is approved, never claim "
    "to verify a real identity, and never infer identity, honesty or liveness from "
    "appearance, voice, accent or emotion. If asked, say a human reviewer makes the decision."
)

STEPS = {
    "welcome": "Explain the session: consent, using a test document marked SPECIMEN, a short liveness check, and human review.",
    "details": "Ask the user to enter their full name and date of birth exactly as on the test document.",
    "document": "Ask the user to upload the test document image and explain that only masked fields are kept.",
    "liveness": "Explain the liveness check: blink twice and turn the head left and right while the camera runs in the browser. Nothing is recorded or uploaded, and it is not a certified check. Without a camera the step is simulated and labelled as such.",
    "submit": "Explain that the evidence goes to a human reviewer and what happens after approval.",
}


def provider_name() -> str:
    if settings.llm_provider == "ollama":
        return f"Ollama ({settings.ollama_model}, local)"
    if settings.llm_provider == "gemini" and settings.gemini_api_key:
        return f"Google Gemini ({settings.gemini_model}, free tier)"
    return "Offline templates (no LLM)"


def _chat(messages: list[dict], want_json: bool = False) -> str | None:
    """Return model text, or None if no provider is reachable (caller falls back)."""
    try:
        if settings.llm_provider == "ollama":
            r = httpx.post(f"{settings.ollama_url}/api/chat", timeout=60, json={
                "model": settings.ollama_model, "messages": messages, "stream": False,
                "options": {"temperature": 0.2}, **({"format": "json"} if want_json else {}),
            })
            r.raise_for_status()
            return r.json()["message"]["content"]
        if settings.llm_provider == "gemini" and settings.gemini_api_key:
            system = "\n".join(m["content"] for m in messages if m["role"] == "system")
            contents = [{"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
                        for m in messages if m["role"] != "system"]
            r = httpx.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                params={"key": settings.gemini_api_key}, timeout=60,
                json={"systemInstruction": {"parts": [{"text": system}]}, "contents": contents,
                      "generationConfig": {"temperature": 0.2,
                                           **({"responseMimeType": "application/json"} if want_json else {})}},
            )
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return None
    return None


# ---------- guided assistant ----------

_FALLBACK_REPLIES = {
    "welcome": "Hi! I'll guide you through a demo identity check. We only use a test document marked SPECIMEN, there's a short liveness check in your browser, and a human reviewer makes the final decision. Ready to start?",
    "details": "Please enter your full name and date of birth exactly as they appear on your test document.",
    "document": "Now upload a photo or scan of your SPECIMEN test document. I'll read the fields with OCR and keep only masked values.",
    "liveness": "Turn on your camera, then blink twice and turn your head left and right when asked. It all runs in your browser; nothing is recorded or uploaded. If you have no camera, you can use the simulated step instead.",
    "submit": "All set. Your evidence summary goes to a human reviewer. Once approved, you can issue your ZK Passport.",
}


def assistant_reply(step: str, history: list[dict], user_message: str | None) -> str:
    guide = STEPS.get(step, STEPS["welcome"])
    messages = [{"role": "system", "content": f"{SYSTEM}\nCurrent step: {step}. {guide}"}]
    messages += [m for m in history[-10:] if m.get("role") in ("user", "assistant")]
    messages.append({"role": "user", "content": user_message or f"(The user opened the '{step}' step.)"})
    return _chat(messages) or _FALLBACK_REPLIES.get(step, _FALLBACK_REPLIES["welcome"])


# ---------- document field extraction ----------

PAN_RE = re.compile(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b")
AADHAAR_RE = re.compile(r"\b(\d{4}\s?\d{4}\s?\d{4})\b")
DATE_RE = re.compile(r"\b(\d{2})[/\-.](\d{2})[/\-.](\d{4})\b")


def _regex_fields(text: str) -> dict:
    upper = text.upper()
    fields: dict = {"specimen_marker": "SPECIMEN" in upper or "TEST DOCUMENT" in upper}
    if m := PAN_RE.search(upper):
        fields.update(document_type="PAN (test)", document_number=m.group(1))
    elif m := AADHAAR_RE.search(text):
        fields.update(document_type="Aadhaar (test)", document_number=m.group(1).replace(" ", ""))
    if m := DATE_RE.search(text):
        fields["date_of_birth"] = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    for line in text.splitlines():
        if re.match(r"^\s*name\s*[:\-]", line, re.I):
            fields["full_name"] = re.split(r"[:\-]", line, maxsplit=1)[1].strip().title()
            break
    return fields


def extract_fields(ocr_text: str) -> tuple[dict, str]:
    """Structured fields from noisy OCR text. Returns (fields, method)."""
    base = _regex_fields(ocr_text)
    prompt = (
        "Extract fields from this OCR text of a TEST identity document. Return JSON with keys "
        "full_name, date_of_birth (YYYY-MM-DD), document_type, document_number. Use null when a "
        "field is missing or unreadable. Do not guess.\n\nOCR text:\n" + ocr_text[:3000]
    )
    raw = _chat([{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}], want_json=True)
    if raw:
        try:
            llm = json.loads(raw)
            merged = {**base, **{k: v for k, v in llm.items() if v and k in
                                 ("full_name", "date_of_birth", "document_type", "document_number")}}
            # Regex wins for the strictly formatted number; the LLM mostly helps with names.
            if "document_number" in base:
                merged["document_number"] = base["document_number"]
            return merged, "ocr+llm"
        except (json.JSONDecodeError, AttributeError):
            pass
    return base, "ocr+rules"


# ---------- explanations and summaries ----------

def explain_checks(checks: list[dict]) -> str:
    failed = [c for c in checks if not c["passed"]]
    if not failed:
        return "Every automated check passed. A reviewer still needs to confirm the session."
    text = _chat([
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": "In 2-3 short sentences, tell the user which checks failed and what they can do "
                                    "next. Checks: " + json.dumps(failed)},
    ])
    return text or "Some checks need attention: " + "; ".join(f"{c['label']} ({c['detail']})" for c in failed) + "."


def reviewer_summary(declared: dict, extracted: dict, checks: list[dict]) -> str:
    text = _chat([
        {"role": "system", "content": SYSTEM + " You are now writing for a human reviewer."},
        {"role": "user", "content": (
            "Write a neutral evidence summary in at most 5 bullet points for a reviewer. State which checks "
            "passed or failed, flag inconsistencies, and name simulated checks as simulated. Do not recommend "
            "approval or rejection.\n"
            f"Declared by user: {json.dumps(declared)}\nExtracted (masked): {json.dumps(extracted)}\n"
            f"Checks: {json.dumps(checks)}")},
    ])
    if text:
        return text
    lines = [f"- {'PASS' if c['passed'] else 'FAIL'}: {c['label']}{' (simulated)' if c.get('simulated') else ''} — {c['detail']}"
             for c in checks]
    return "\n".join(lines)
