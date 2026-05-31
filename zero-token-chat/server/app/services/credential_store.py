import os
import json
import hashlib
from pathlib import Path
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import DATA_DIR, CREDENTIALS_FILE


def _derive_key() -> bytes:
    machine_id = os.getenv("COMPUTERNAME", os.getenv("HOSTNAME", "default"))
    user = os.getenv("USER", os.getenv("USERNAME", "unknown"))
    raw = f"{machine_id}:{user}:zero-token-chat-v1"
    return hashlib.sha256(raw.encode()).digest()


def _encrypt(data: bytes, key: bytes) -> bytes:
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return nonce + ciphertext


def _decrypt(data: bytes, key: bytes) -> bytes:
    nonce = data[:12]
    ciphertext = data[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)


def _load_store() -> dict:
    if not CREDENTIALS_FILE.exists():
        return {}
    key = _derive_key()
    try:
        encrypted = CREDENTIALS_FILE.read_bytes()
        decrypted = _decrypt(encrypted, key)
        return json.loads(decrypted.decode("utf-8"))
    except Exception:
        return {}


def _save_store(store: dict) -> None:
    key = _derive_key()
    plaintext = json.dumps(store, ensure_ascii=False).encode("utf-8")
    encrypted = _encrypt(plaintext, key)
    CREDENTIALS_FILE.write_bytes(encrypted)


def save_credential(platform: str, token: str, cookies: Optional[str] = None) -> None:
    store = _load_store()
    store[platform] = {
        "token": token,
        "cookies": cookies or "",
    }
    _save_store(store)


def load_credential(platform: str) -> Optional[dict]:
    store = _load_store()
    return store.get(platform)


def delete_credential(platform: str) -> bool:
    store = _load_store()
    if platform not in store:
        return False
    del store[platform]
    _save_store(store)
    return True


def list_credentials() -> dict:
    return _load_store()
