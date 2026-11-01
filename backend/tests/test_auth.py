def test_register_login_me(client):
    r = client.post("/api/auth/register", json={"email": "a@example.com", "password": "password123", "display_name": "A"})
    assert r.status_code == 200
    token = r.json()["token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()["email"] == "a@example.com"
    assert client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong-pass"}).status_code == 401


def test_duplicate_email_rejected(client):
    body = {"email": "dup@example.com", "password": "password123", "display_name": "D"}
    assert client.post("/api/auth/register", json=body).status_code == 200
    assert client.post("/api/auth/register", json=body).status_code == 409


def test_password_is_hashed(client):
    client.post("/api/auth/register", json={"email": "h@example.com", "password": "password123", "display_name": "H"})
    from app.db import SessionLocal
    from app.models import User
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="h@example.com").one()
        assert u.password_hash != "password123" and u.password_hash.startswith("$2")


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401
