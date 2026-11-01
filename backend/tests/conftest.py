import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["ISSUER_PRIVATE_KEY_HEX"] = "11" * 32
os.environ["LLM_PROVIDER"] = "none"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


_n = [0]


@pytest.fixture
def make_user(client):
    def _make(role: str = "user"):
        _n[0] += 1
        email = f"user{_n[0]}@example.com"
        r = client.post("/api/auth/register", json={"email": email, "password": "password123", "display_name": f"U{_n[0]}"})
        assert r.status_code == 200, r.text
        data = r.json()
        if role != "user":
            from app.db import SessionLocal
            from app.models import User
            with SessionLocal() as db:
                u = db.get(User, data["user"]["id"])
                u.role = role
                db.commit()
            data = client.post("/api/auth/login", json={"email": email, "password": "password123"}).json()
        data["headers"] = {"Authorization": f"Bearer {data['token']}"}
        return data
    return _make
