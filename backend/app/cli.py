"""Developer commands.

    python -m app.cli new-issuer-key   # print a fresh demo issuer private key
    python -m app.cli seed             # create demo payer, merchant and reviewer accounts
"""
import secrets
import sys

from .db import Base, SessionLocal, engine
from .models import User
from .security import hash_password

DEMO_ACCOUNTS = [
    ("payer@zkpass.dev", "Asha Verma", "user"),
    ("merchant@zkpass.dev", "Demo Merchant", "user"),
    ("reviewer@zkpass.dev", "KYC Reviewer", "reviewer"),
]
DEMO_PASSWORD = "zkpass-demo-123"


def seed() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for email, name, role in DEMO_ACCOUNTS:
            if not db.query(User).filter_by(email=email).first():
                db.add(User(email=email, display_name=name, role=role, password_hash=hash_password(DEMO_PASSWORD)))
                print(f"created {role:8} {email}")
            else:
                print(f"exists  {role:8} {email}")
        db.commit()
    print(f"\nDemo password for all accounts: {DEMO_PASSWORD}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "new-issuer-key":
        print(secrets.token_hex(32))
    elif cmd == "seed":
        seed()
    else:
        print(__doc__)
        sys.exit(1)
