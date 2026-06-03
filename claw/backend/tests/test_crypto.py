"""加密模块 roundtrip 测试。"""
from __future__ import annotations

import tempfile
from pathlib import Path

from app.core.crypto import CryptoManager


def test_roundtrip():
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        cm = CryptoManager(td / "master.key")
        payload = {"hello": "世界", "n": 42, "list": [1, 2, 3], "nested": {"k": "v"}}
        out = td / "data.enc"
        cm.encrypt_to_file(out, payload)
        assert out.exists()
        got = cm.decrypt_from_file(out)
        assert got == payload


def test_tamper_detection():
    from app.core.crypto import DecryptionError

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        cm = CryptoManager(td / "master.key")
        out = td / "data.enc"
        cm.encrypt_to_file(out, {"x": 1})
        # 篡改最后 1 字节
        data = bytearray(out.read_bytes())
        data[-1] ^= 0xFF
        out.write_bytes(bytes(data))
        try:
            cm.decrypt_from_file(out)
        except DecryptionError:
            return
        raise AssertionError("expected DecryptionError")


if __name__ == "__main__":
    test_roundtrip()
    test_tamper_detection()
    print("crypto tests passed")
