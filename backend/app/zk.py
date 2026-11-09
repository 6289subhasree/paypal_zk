"""Bridge to the Node ZK toolkit (circuits/cli.mjs): issuer signing and Groth16 verification."""
import json
import subprocess
from functools import lru_cache

from .config import get_settings

settings = get_settings()
CIRCUIT_VERSION = "kyc_payment@2"


class ZkError(RuntimeError):
    pass


def call(cmd: str, **payload) -> dict:
    try:
        proc = subprocess.run(
            [settings.node_bin, settings.zk_cli_path],
            input=json.dumps({"cmd": cmd, **payload}),
            capture_output=True,
            text=True,
            timeout=settings.zk_timeout_seconds,
        )
    except subprocess.TimeoutExpired as e:
        raise ZkError(f"zk {cmd} timed out") from e
    try:
        out = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        raise ZkError(f"zk {cmd} returned no result") from e
    if not out.get("ok"):
        raise ZkError(out.get("error", f"zk {cmd} failed"))
    return out["result"]


@lru_cache
def issuer_public_key() -> dict:
    if not settings.issuer_private_key_hex:
        raise ZkError("ISSUER_PRIVATE_KEY_HEX is not configured")
    return call("issuer-pubkey", issuerPrivHex=settings.issuer_private_key_hex)


def sign_credential(credential: dict) -> dict:
    return call("sign", issuerPrivHex=settings.issuer_private_key_hex, credential=credential)["signature"]


def verify_signature(credential: dict, signature: dict) -> bool:
    return call("verify-signature", issuerPub=issuer_public_key(), credential=credential, signature=signature)["valid"]


def verify_proof(proof: dict, public_signals: list[str]) -> dict:
    return call("verify", proof=proof, publicSignals=public_signals)


def revocation_tag(credential_id: str, verifier_id: int) -> str:
    return call("revocation-tag", credentialIds=[credential_id], verifierId=str(verifier_id))["tags"][0]


def random_field() -> str:
    return call("random-field")["value"]
