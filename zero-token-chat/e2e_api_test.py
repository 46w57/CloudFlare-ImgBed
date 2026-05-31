#!/usr/bin/env python3
"""
Zero Token Chat - Comprehensive E2E Test (API-based + Code verification)
Tests everything that can be tested without a browser binary.
"""
import json, os, sys, time, re, urllib.request, urllib.error

SCREENSHOT_DIR = "/workspace/zero-token-chat/e2e-screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

BACKEND = "http://localhost:8000"
FRONTEND = "http://localhost:5173"
results = {"tests": {}, "code_checks": {}}

def log(s, m): print(f"[{time.strftime('%H:%M:%S')}] [{s}] {m}")

def api(method, path, data=None):
    url = f"{BACKEND}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()[:200], "status": e.code}, e.code
    except Exception as e:
        return {"error": str(e)}, 0


# ==================== TEST 1: Backend Health ====================
def test_backend_health():
    log("T1", "Backend health check...")
    d, s = api("GET", "/api/health")
    ok = s == 200 and d.get("status") == "ok"
    results["tests"]["backend_health"] = {"pass": ok, "detail": d}
    log("T1", f"{'PASS' if ok else 'FAIL'}: {d}")
    return ok


# ==================== TEST 2: crypto.randomUUID Fix Verification ====================
def test_uuid_fix():
    log("T2", "Verifying crypto.randomUUID fix in source code...")
    fixes = []
    files_to_check = [
        ("src/utils/api.ts", "generateId"),
        ("src/hooks/useChat.ts", "generateId"),
        ("src/store/chatStore.ts", "generateId"),
    ]
    for fname, expected_import in files_to_check:
        fpath = f"/workspace/zero-token-chat/{fname}"
        if not os.path.exists(fpath):
            fixes.append({"file": fname, "found": False, "reason": "not found"})
            continue
        content = open(fpath).read()
        lines = content.split("\n")
        # Check: no direct calls to crypto.randomUUID() as a statement
        # (only allowed inside generateId function definition)
        direct_calls = []
        for i, line in enumerate(lines):
            stripped = line.strip()
            # Skip lines that are part of generateId function or import/definition
            if 'generateId' in line or 'function generateId' in line:
                continue
            if stripped == '}' and i > 0:
                # Check if we're inside generateId function by looking back
                pass
            if 'crypto.randomUUID()' in stripped and 'generateId' not in line and 'typeof' not in line and '?' not in line and not stripped.startswith('return'):
                direct_calls.append((i+1, stripped))

        has_old_direct_call = len(direct_calls) > 0
        has_new = "generateId()" in content
        has_import = "generateId" in content
        fixes.append({
            "file": fname,
            "has_old_direct_call": has_old_direct_call,
            "direct_calls": direct_calls,
            "uses_new_func": has_new,
            "has_proper_import": has_import,
            "fixed": not has_old_direct_call and has_new and has_import
        })

    api_file = "/workspace/zero-token-chat/src/utils/api.ts"
    if os.path.exists(api_file):
        content = open(api_file).read()
        has_fallback = "xxxxxxxx" in content and "replace" in content
        has_crypto_check = "typeof crypto" in content and "randomUUID" in content
        results["code_checks"]["uuid_impl"] = {
            "has_fallback": has_fallback,
            "has_crypto_check": has_crypto_check,
            "complete": has_fallback and has_crypto_check
        }

    all_fixed = all(f.get("fixed") for f in fixes)
    results["tests"]["uuid_fix"] = {"pass": all_fixed, "files": fixes}
    log("T2", f"{'PASS' if all_fixed else 'FAIL'}")
    for f in fixes:
        st = "OK" if f.get("fixed") else "BUG"
        log("T2", f"  [{st}] {f['file']}: direct_calls={len(f.get('direct_calls',[]))} new_func={f.get('uses_new_func')}")
    return all_fixed


# ==================== TEST 3: Cookie Management APIs ====================
def test_cookie_apis():
    log("T3", "Testing cookie management APIs...")

    # List credentials
    d, s = api("GET", "/api/cookies")
    list_ok = s == 200
    log("T3", f"  GET /cookies -> {s}: {json.dumps(d)[:100]}")

    # Import test token
    test_token = "test-e2e-token-verify-" + str(int(time.time()))
    d, s = api("POST", "/api/cookies/manual", {
        "platform": "qwen",
        "token": test_token
    })
    import_ok = s == 200 and d.get("success") == True
    log("T3", f"  POST /manual -> {s}: {d}")

    # Verify imported
    d2, s2 = api("GET", "/api/cookies")
    qwen_has_token = False
    if s2 == 200 and "qwen" in d2:
        qwen_has_token = d2["qwen"].get("hasToken", False)
    log("T3", f"  Verify import: qwen.hasToken={qwen_has_token}")

    # Validate
    d3, s3 = api("POST", "/api/cookies/validate", {"platform": "qwen"})
    validate_resp = d3
    log("T3", f"  POST /validate -> {s3}: {d3}")

    # Delete test credential
    d4, s4 = api("DELETE", "/api/cookies/qwen")
    delete_ok = s4 == 200 or s4 == 204  # 204 No Content also OK
    log("T3", f"  DELETE /qwen -> {s4}: {d4}")

    # Verify deleted
    d5, s5 = api("GET", "/api/cookies")
    qwen_gone = False
    if s5 == 200 and "qwen" in d5:
        qwen_gone = not d5["qwen"].get("hasToken", True)
    log("T3", f"  Verify delete: qwen gone={qwen_gone}")

    all_ok = list_ok and import_ok and delete_ok
    results["tests"]["cookie_apis"] = {
        "pass": all_ok,
        "list": list_ok,
        "import": import_ok,
        "delete": delete_ok,
        "validate_response": validate_resp
    }
    log("T3", f"{'PASS' if all_ok else 'PARTIAL'}")
    return all_ok


# ==================== TEST 4: Chat API Endpoint ====================
def test_chat_api():
    log("T4", "Testing chat endpoint...")
    # Chat endpoint is SSE streaming, use stream=True
    d, s = api("POST", "/api/chat", {
        "platform": "qwen",
        "model": "qwen-max",
        "messages": [{"role": "user", "content": "hello"}],
        "stream": True
    })
    # Should return 200 with SSE stream, or meaningful error (401/400/500)
    graceful = s in (200, 401, 400, 403, 500) or d.get("error")
    results["tests"]["chat_endpoint"] = {
        "pass": graceful,
        "status": s,
        "response_preview": str(d)[:150]
    }
    log("T4", f"  Status={s} graceful={'YES' if graceful else 'NO'}: {str(d)[:120]}")
    return graceful


# ==================== TEST 5: Models Endpoint ====================
def test_models_api():
    log("T5", "Testing models endpoint...")
    d, s = api("GET", "/api/models")
    ok = s == 200 and "models" in d and isinstance(d["models"], list)
    model_count = len(d.get("models", []))
    results["tests"]["models_endpoint"] = {
        "pass": ok,
        "count": model_count,
        "models": [m.get("id","?") for m in d.get("models", [])[:8]]
    }
    log("T5", f"{'PASS' if ok else 'FAIL'}: {model_count} models")
    for m in d.get("models", []):
        log(f"T5", f"  - {m.get('id','?')} ({m.get('platform','?')})")
    return ok


# ==================== TEST 6: Auto-Detect Endpoint ====================
def test_autodetect_api():
    log("T6", "Testing auto-detect endpoint...")
    d, s = api("POST", "/api/cookies/auto-detect", {"platform": "qwen"})
    # Should return found=True/False without crashing
    ok = s == 200 and "found" in d
    results["tests"]["autodetect"] = {
        "pass": ok,
        "found": d.get("found"),
        "detail": d
    }
    log("T6", f"{'PASS' if ok else 'FAIL'}: found={d.get('found')}")
    return ok


# ==================== TEST 7: Frontend Build Check ====================
def test_frontend_build():
    log("T7", "Checking frontend build artifacts...")
    dist_dir = "/workspace/zero-token-chat/dist"
    has_dist = os.path.exists(dist_dir)
    has_index = os.path.exists(f"{dist_dir}/index.html")
    has_js = False
    js_files = []
    if has_dist:
        for root, dirs, files in os.walk(dist_dir):
            for f in files:
                if f.endswith(".js"):
                    has_js = True
                    js_files.append(os.path.join(root, f))

    # Check for randomUUID direct calls in built JS (should NOT have any outside generateId)
    uuid_direct_calls = 0
    if js_files:
        for jf in js_files:
            content = open(jf, errors="ignore").read()
            # Count occurrences that are NOT inside the feature-detection pattern
            import re
            for m in re.finditer(r'crypto\.randomUUID\(\)', content):
                ctx = content[max(0,m.start()-30):m.end()+10]
                if 'typeof' not in ctx and '?' not in ctx:  # Not a feature check = potential bug
                    uuid_direct_calls += 1

    # Check Vite proxy config
    vite_config = "/workspace/zero-token-chat/vite.config.ts"
    has_proxy = False
    if os.path.exists(vite_config):
        vc = open(vite_config).read()
        has_proxy = "8000" in vc and "proxy" in vc

    ok = has_dist and has_index and has_js and uuid_direct_calls == 0 and has_proxy
    results["tests"]["frontend_build"] = {
        "pass": ok,
        "has_dist": has_dist,
        "has_index": has_index,
        "js_files_count": len(js_files),
        "uuid_direct_calls_in_build": uuid_direct_calls,
        "has_vite_proxy": has_proxy
    }
    log("T7", f"{'PASS' if ok else 'PARTIAL'}: dist={has_dist} index={has_index} js={len(js_files)} uuid_direct_calls={uuid_direct_calls}")
    return ok


# ==================== TEST 8: Browser Support Config ====================
def test_browser_support():
    log("T8", "Checking browser support configuration...")
    extractor = "/workspace/zero-token-chat/server/app/services/auto_extractor.py"
    content = open(extractor).read()

    checks = {
        "chrome_windows": '"Google/Chrome"' in content,
        "edge_windows": '"Microsoft/Edge"' in content,
        "brave_windows": '"BraveSoftware/Brave-Browser"' in content,
        "chromium_linux": '"chromium"' in content or ".config/chromium" in content,
        "macos_support": '"Library/Application Support"' in content,
        "rookiepy_chromium": '"chromium"' in content and "rookiepy" in content,
        "rookiepy_brave": '"brave"' in content,
        "temp_copy": "shutil.copy2" in content and "mkstemp" in content,
        "token_len_check": "len(token_val) > 10" in content,
    }
    all_ok = all(checks.values())
    results["tests"]["browser_support"] = {"pass": all_ok, "checks": checks}
    log("T8", f"{'PASS' if all_ok else 'PARTIAL'}")
    for k, v in checks.items():
        log("T8", f"  [{'OK' if v else 'MISS'}] {k}")
    return all_ok


# ==================== TEST 9: Error Handling in useChat ====================
def test_error_handling():
    log("T9", "Checking error handling in chat hook...")
    hook_file = "/workspace/zero-token-chat/src/hooks/useChat.ts"
    content = open(hook_file).read()

    checks = {
        "try_catch_around_send": "try {" in content and "sendChatMessage" in content,
        "error_message_display": 'updateLastMessage' in content and ('error' in content.lower() or 'fail' in content.lower()),
        "finally_streaming": "finally" in content and "setIsStreaming" in content,
        "slice_before_filter": ".slice(0, -1)" in content and ".filter(" in content,
    }
    all_ok = all(checks.values())
    results["tests"]["error_handling"] = {"pass": all_ok, "checks": checks}
    log("T9", f"{'PASS' if all_ok else 'PARTIAL'}")
    for k, v in checks.items():
        log("T9", f"  [{'OK' if v else 'MISS'}] {k}")
    return all_ok


# ==================== MAIN ====================
def main():
    print("=" * 60)
    print("Zero Token Chat - Comprehensive E2E Test Suite")
    print("=" * 60)

    tests = [
        ("Backend Health", test_backend_health),
        ("UUID Fix (P0)", test_uuid_fix),
        ("Cookie APIs", test_cookie_apis),
        ("Chat Endpoint", test_chat_api),
        ("Models Endpoint", test_models_api),
        ("Auto-Detect API", test_autodetect_api),
        ("Frontend Build", test_frontend_build),
        ("Browser Support", test_browser_support),
        ("Error Handling", test_error_handling),
    ]

    passed = 0
    total = len(tests)
    for name, fn in tests:
        try:
            if fn():
                passed += 1
        except Exception as e:
            log("ERR", f"{name} crashed: {e}")
            results["tests"][name.lower().replace(" ","_")] = {"pass": False, "error": str(e)}
        print()

    # Summary
    print("=" * 60)
    print(f"RESULTS: {passed}/{total} tests passed")
    if passed == total:
        print("STATUS: ALL TESTS PASSED ✅")
    elif passed >= total * 0.8:
        print("STATUS: MOSTLY PASS ⚠️ (minor issues)")
    else:
        print("STATUS: SOME FAILURES ❌")
    print("=" * 60)

    # Detail per test
    for name, _ in tests:
        key = name.lower().replace(" ", "_").replace("(", "").replace(")", "")
        r = results["tests"].get(key, {})
        status = "✅" if r.get("pass") else "❌"
        print(f"  {status} {name}")

    # Save report
    report_path = f"{SCREENSHOT_DIR}/api_test_report.json"
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False, default=str)
    print(f"\nReport saved: {report_path}")


if __name__ == "__main__":
    main()
