"""An existing v1 database gains the new columns and its old credentials are retired."""
from sqlalchemy import create_engine, inspect, text

from app.migrate import add_missing_columns, retire_old_credentials


def test_upgrade_old_database(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with engine.begin() as c:
        c.execute(text("CREATE TABLE credentials (id VARCHAR(32) PRIMARY KEY, status VARCHAR(20), circuit_version VARCHAR(40))"))
        c.execute(text("INSERT INTO credentials VALUES ('a', 'active', 'kyc_payment@1'), ('b', 'active', 'kyc_payment@2')"))
        c.execute(text("CREATE TABLE payment_requests (id VARCHAR(32) PRIMARY KEY)"))
    added = add_missing_columns(engine)
    assert "credentials.birth_date" in added and "payment_requests.min_age" in added
    cols = {c["name"] for c in inspect(engine).get_columns("credentials")}
    assert "birth_date" in cols
    assert add_missing_columns(engine) == []  # idempotent
    assert retire_old_credentials(engine, "kyc_payment@2") == 1
    with engine.connect() as c:
        assert dict(c.execute(text("SELECT id, status FROM credentials")).all()) == {"a": "revoked", "b": "active"}
