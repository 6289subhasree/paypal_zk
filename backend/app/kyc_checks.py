"""OCR and rule-based consistency checks for the demo KYC flow (FR-04).

Raw images are processed in memory and never written to disk or the database.
Only masked fields and check outcomes are stored. Extraction is not treated as
proof that a document is genuine.
"""
import io
import re
from datetime import date
from difflib import SequenceMatcher

from PIL import Image, ImageOps


def ocr_image(data: bytes) -> str:
    import pytesseract

    from .config import get_settings

    if cmd := get_settings().tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd

    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img).convert("L")
    if img.width < 1200:  # upscale small photos for better OCR
        img = img.resize((img.width * 2, img.height * 2))
    return pytesseract.image_to_string(img)


def mask_number(number: str | None) -> str | None:
    if not number:
        return None
    n = re.sub(r"\s", "", number)
    return "•" * max(len(n) - 4, 0) + n[-4:]


def _norm_name(s: str | None) -> str:
    return re.sub(r"[^a-z ]", "", (s or "").lower()).strip()


def valid_format(doc_type: str | None, number: str | None) -> bool:
    if not number:
        return False
    if doc_type and doc_type.startswith("PAN"):
        return bool(re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", number))
    if doc_type and doc_type.startswith("Aadhaar"):
        return bool(re.fullmatch(r"[2-9][0-9]{11}", number))
    return False


def run_checks(declared: dict, extracted: dict, ocr_chars: int, liveness_done: bool) -> list[dict]:
    checks = []

    def add(name, label, passed, detail, simulated=False):
        checks.append({"name": name, "label": label, "passed": bool(passed), "detail": detail, "simulated": simulated})

    add("ocr_readable", "Document is readable", ocr_chars >= 30,
        f"{ocr_chars} characters recognised" if ocr_chars >= 30 else "Too little text recognised; retake the photo")

    add("specimen_marker", "Test document marker present", extracted.get("specimen_marker"),
        "Document is marked SPECIMEN / TEST" if extracted.get("specimen_marker")
        else "No SPECIMEN marker found. This demo only accepts test documents.")

    fmt_ok = bool(extracted.get("document_format_valid"))
    add("document_format", "Document number format", fmt_ok,
        f"{extracted.get('document_type') or 'Unknown type'} number format "
        + ("is valid" if fmt_ok else "is invalid or missing"))

    ratio = SequenceMatcher(None, _norm_name(declared.get("full_name")), _norm_name(extracted.get("full_name"))).ratio()
    add("name_match", "Name matches document", ratio >= 0.85,
        f"Similarity {ratio:.0%}" + ("" if extracted.get("full_name") else " (no name read from document)"))

    dob_ok = bool(declared.get("date_of_birth")) and declared.get("date_of_birth") == extracted.get("date_of_birth")
    add("dob_match", "Date of birth matches document", dob_ok,
        "Dates match" if dob_ok else "Declared and extracted dates differ or are missing")

    try:
        adult = (date.today() - date.fromisoformat(declared.get("date_of_birth", ""))).days >= 18 * 365.25
    except ValueError:
        adult = False
    add("age_18", "Holder is 18 or older", adult, "Based on declared date of birth")

    add("liveness", "Liveness check", liveness_done,
        "Simulated for the hackathon: no face or biometric analysis is performed" if liveness_done
        else "Liveness step not completed", simulated=True)
    return checks
