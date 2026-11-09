from pathlib import Path

SAMPLES = Path(__file__).resolve().parents[2] / "samples"


def run_session(client, user, card="specimen_pan_card.png", name="Asha Verma", dob="1999-08-14", liveness=True):
    h = user["headers"]
    s = client.post("/api/kyc/sessions", json={"consent": True}, headers=h).json()
    assert s["transcript"][0]["role"] == "assistant"
    client.post(f"/api/kyc/sessions/{s['id']}/details", json={"full_name": name, "date_of_birth": dob}, headers=h)
    with open(SAMPLES / card, "rb") as f:
        up = client.post(f"/api/kyc/sessions/{s['id']}/documents", files={"file": (card, f, "image/png")}, headers=h)
    assert up.status_code == 200, up.text
    if liveness:
        assert client.post(f"/api/kyc/sessions/{s['id']}/liveness", headers=h).json()["simulated"] is True
    return client.post(f"/api/kyc/sessions/{s['id']}/complete", headers=h).json()


def test_consent_required(client, make_user):
    u = make_user()
    assert client.post("/api/kyc/sessions", json={"consent": False}, headers=u["headers"]).status_code == 400


def test_missing_ocr_engine_is_reported_as_setup_error(client, make_user, monkeypatch):
    import pytesseract

    from app.routers import kyc

    def no_tesseract(_data):
        raise pytesseract.TesseractNotFoundError()

    monkeypatch.setattr(kyc, "ocr_image", no_tesseract)
    h = make_user()["headers"]
    s = client.post("/api/kyc/sessions", json={"consent": True}, headers=h).json()
    with open(SAMPLES / "specimen_pan_card.png", "rb") as f:
        up = client.post(f"/api/kyc/sessions/{s['id']}/documents", files={"file": ("c.png", f, "image/png")}, headers=h)
    assert up.status_code == 503
    assert "OCR engine" in up.json()["detail"]


def test_matching_specimen_passes_checks_and_waits_for_human(client, make_user):
    res = run_session(client, make_user())
    assert res["status"] == "needs_review"  # AI never approves
    checks = {c["name"]: c for c in res["checks"]}
    assert all(c["passed"] for c in checks.values()), checks
    assert checks["liveness"]["simulated"] is True
    assert res["ai_summary"]


def test_document_number_never_stored_in_full(client, make_user):
    res = run_session(client, make_user())
    assert "ABCPV1234K" not in str(res)
    assert res["extracted"]["document_number_masked"].endswith("234K")


def test_mismatched_details_fail_checks(client, make_user):
    res = run_session(client, make_user(), card="mismatch_name_card.png")
    failed = {c["name"] for c in res["checks"] if not c["passed"]}
    assert {"name_match", "dob_match"} <= failed


def test_missing_liveness_flagged(client, make_user):
    res = run_session(client, make_user(), liveness=False)
    assert not {c["name"]: c for c in res["checks"]}["liveness"]["passed"]


def test_reviewer_flow_then_credential(client, make_user):
    from app import zk
    user, reviewer = make_user(), make_user("reviewer")
    res = run_session(client, user)
    commitment = zk.call("holder-commitment", holderSecret="555")["commitment"]
    # Pending session cannot get a credential
    assert client.post("/api/credentials/issue", json={"holder_commitment": commitment}, headers=user["headers"]).status_code == 403
    # Regular users cannot review
    assert client.get("/api/review/queue", headers=user["headers"]).status_code == 403
    assert res["id"] in [s["id"] for s in client.get("/api/review/queue", headers=reviewer["headers"]).json()]
    d = client.post(f"/api/review/sessions/{res['id']}/decision", json={"decision": "approved"}, headers=reviewer["headers"])
    assert d.json()["status"] == "approved"
    assert client.post("/api/credentials/issue", json={"holder_commitment": commitment}, headers=user["headers"]).status_code == 200


def test_rejected_session_gets_no_credential(client, make_user):
    from app import zk
    user, reviewer = make_user(), make_user("reviewer")
    res = run_session(client, user, card="mismatch_name_card.png")
    client.post(f"/api/review/sessions/{res['id']}/decision", json={"decision": "rejected"}, headers=reviewer["headers"])
    commitment = zk.call("holder-commitment", holderSecret="556")["commitment"]
    assert client.post("/api/credentials/issue", json={"holder_commitment": commitment}, headers=user["headers"]).status_code == 403


def test_reviewer_cannot_approve_own_session(client, make_user):
    reviewer = make_user("reviewer")
    res = run_session(client, reviewer)
    r = client.post(f"/api/review/sessions/{res['id']}/decision", json={"decision": "approved"}, headers=reviewer["headers"])
    assert r.status_code == 403
