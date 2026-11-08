from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / "backend" / ".env", extra="ignore")

    # App
    database_url: str = f"sqlite:///{ROOT / 'backend' / 'data' / 'zkpass.db'}"
    jwt_secret: str = "change-me-in-.env"
    jwt_ttl_minutes: int = 240
    frontend_origin: str = "http://localhost:3000"

    # Credential issuer (demo issuer key; generate with `python -m app.cli new-issuer-key`)
    issuer_private_key_hex: str = ""
    issuer_id: str = "zkpass-demo-issuer"
    credential_ttl_days: int = 30
    verifier_id: int = 4242  # domain separator for this verifier

    # ZK bridge
    node_bin: str = "node"
    zk_cli_path: str = str(ROOT / "circuits" / "cli.mjs")
    zk_timeout_seconds: int = 60

    # Payments
    payment_request_ttl_minutes: int = 30
    proof_max_age_seconds: int = 300  # `now` in the proof must be this fresh

    # PayPal Sandbox
    paypal_mode: str = "sandbox"
    paypal_client_id: str = ""
    paypal_client_secret: str = ""

    # OCR: full path to tesseract if it isn't on PATH,
    # e.g. C:\\Program Files\\Tesseract-OCR\\tesseract.exe on Windows
    tesseract_cmd: str = ""

    # AI (free / local by default)
    llm_provider: str = "ollama"  # ollama | gemini | none
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    @property
    def paypal_base_url(self) -> str:
        return (
            "https://api-m.sandbox.paypal.com"
            if self.paypal_mode == "sandbox"
            else "https://api-m.paypal.com"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
