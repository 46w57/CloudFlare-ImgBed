"""AES-256-GCM 加密 + Windows DPAPI 保护主密钥。

设计目标：
- 主密钥（256 bit）本地存储，**Windows 上额外用 DPAPI 加密**（绑用户/机器），非 Windows 用文件权限 0600。
- Cookies 文件每次写入都是 完整文件级加密（IV 每次新生成，附在密文头部）。
- 解密失败时抛 `DecryptionError`，调用方应提示用户重新登录。
"""
from __future__ import annotations

import base64
import json
import os
import platform
import secrets
import struct
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from loguru import logger


class DecryptionError(Exception):
    """解密失败（密钥错、文件损坏、篡改）。"""


class CryptoManager:
    """统一的加解密入口。"""

    MAGIC = b"CLAW1"  # 文件 magic，前 5 字节
    VERSION = 1

    def __init__(self, master_key_file: Path) -> None:
        self.master_key_file = Path(master_key_file)
        self._master_key: bytes | None = None

    @property
    def master_key(self) -> bytes:
        if self._master_key is None:
            self._master_key = self._load_or_create_master_key()
        return self._master_key

    # ---------- 主密钥 ----------

    def _load_or_create_master_key(self) -> bytes:
        if self.master_key_file.exists():
            try:
                data = self.master_key_file.read_bytes()
                return self._unwrap_master_key(data)
            except Exception as exc:  # noqa: BLE001
                logger.warning(f"主密钥加载失败，将重新生成: {exc}")

        # 生成新密钥
        raw = secrets.token_bytes(32)  # 256 bit
        wrapped = self._wrap_master_key(raw)
        self.master_key_file.parent.mkdir(parents=True, exist_ok=True)
        self.master_key_file.write_bytes(wrapped)
        try:
            os.chmod(self.master_key_file, 0o600)
        except OSError:
            pass
        logger.info(f"已生成新主密钥: {self.master_key_file}")
        return raw

    def _wrap_master_key(self, raw_key: bytes) -> bytes:
        """加密主密钥落盘。Windows 用 DPAPI，其他系统直接存（配 0o600）。"""
        if platform.system().lower() == "windows":
            return self._dpapi_wrap(raw_key)
        return raw_key

    def _unwrap_master_key(self, data: bytes) -> bytes:
        if platform.system().lower() == "windows" and data.startswith(b"\x00DPAPI"):
            return self._dpapi_unwrap(data)
        # 非加密形式直接用
        if len(data) == 32:
            return data
        raise DecryptionError("主密钥格式非法")

    # ---------- DPAPI（仅 Windows） ----------

    def _dpapi_wrap(self, raw: bytes) -> bytes:
        try:
            import win32crypt  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("Windows 平台需要安装 pywin32") from exc
        encrypted = win32crypt.CryptProtectData(raw, "ClawMasterKey", None, None, None, 0)
        return b"\x00DPAPI" + encrypted

    def _dpapi_unwrap(self, data: bytes) -> bytes:
        try:
            import win32crypt  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("Windows 平台需要安装 pywin32") from exc
        _, decrypted = win32crypt.CryptUnprotectData(data[6:], None, None, None, 0)
        return decrypted

    # ---------- 文件级加密 ----------

    def encrypt_to_file(self, path: Path, payload: Any) -> None:
        """把可 JSON 序列化的对象加密后写入 path。"""
        plaintext = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
        nonce = secrets.token_bytes(12)
        aes = AESGCM(self.master_key)
        ciphertext = aes.encrypt(nonce, plaintext, associated_data=self.MAGIC)
        # 文件格式：MAGIC(5) | VERSION(1) | nonce(12) | ciphertext
        blob = self.MAGIC + struct.pack("B", self.VERSION) + nonce + ciphertext
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(blob)
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass

    def decrypt_from_file(self, path: Path) -> Any:
        if not path.exists():
            raise FileNotFoundError(f"加密文件不存在: {path}")
        blob = path.read_bytes()
        if len(blob) < len(self.MAGIC) + 1 + 12:
            raise DecryptionError("加密文件过短")
        if blob[: len(self.MAGIC)] != self.MAGIC:
            raise DecryptionError("文件 magic 不匹配")
        version = blob[len(self.MAGIC)]
        if version != self.VERSION:
            raise DecryptionError(f"不支持的加密文件版本: {version}")
        nonce = blob[len(self.MAGIC) + 1 : len(self.MAGIC) + 1 + 12]
        ciphertext = blob[len(self.MAGIC) + 1 + 12 :]
        try:
            aes = AESGCM(self.master_key)
            plaintext = aes.decrypt(nonce, ciphertext, associated_data=self.MAGIC)
        except Exception as exc:  # noqa: BLE001
            raise DecryptionError(f"解密失败: {exc}") from exc
        return json.loads(plaintext.decode("utf-8"))


def test_roundtrip(tmp: Path | None = None) -> None:
    """自检：用于测试和首次启动健康检查。"""
    tmp = tmp or Path("./.claw-test")
    tmp.mkdir(parents=True, exist_ok=True)
    key_file = tmp / "master.key"
    payload_file = tmp / "data.enc"
    cm = CryptoManager(key_file)
    payload = {"hello": "世界", "n": 42, "list": [1, 2, 3]}
    cm.encrypt_to_file(payload_file, payload)
    got = cm.decrypt_from_file(payload_file)
    assert got == payload, f"roundtrip failed: {got} != {payload}"
    print("[crypto] roundtrip OK")
    import shutil

    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    test_roundtrip()
