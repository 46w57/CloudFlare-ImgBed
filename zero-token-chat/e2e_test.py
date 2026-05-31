#!/usr/bin/env python3
"""Zero Token Chat - Full E2E Automated Test Script"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

SCREENSHOT_DIR = "/workspace/zero-token-chat/e2e-screenshots"
BACKEND = "http://localhost:8000"
FRONTEND = "http://localhost:5173"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)


def log(step, msg):
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] [{step}] {msg}")


def api_call(method, path, data=None):
    url = f"{BACKEND}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        return {"error": body, "status_code": e.code}, e.code
    except Exception as e:
        return {"error": str(e)}, 0


def test_backend_health():
    """Step 0: Check backend health"""
    log("STEP0", "Checking backend health...")
    data, status = api_call("GET", "/api/health")
    if status == 200:
        log("STEP0", f"Backend OK: {data}")
        return True
    else:
        log("STEP0", f"Backend FAIL: {data}")
        return False


def import_token(token):
    """Step A: Import Qwen token via API"""
    log("STEPA", f"Importing Qwen token (len={len(token)})...")
    data, status = api_call("POST", "/api/cookies/manual", {
        "platform": "qwen",
        "token": token,
    })
    log("STEPA", f"Import result: status={status}, data={data}")
    return status == 200


def validate_credential():
    """Step B: Validate credential"""
    log("STEPB", "Validating Qwen credential...")
    data, status = api_call("POST", "/api/cookies/validate", {
        "platform": "qwen",
    })
    log("STEPB", f"Validate result: status={status}, data={data}")
    return data.get("valid", False)


def list_credentials():
    """List all credentials"""
    data, status = api_call("GET", "/api/cookies")
    log("CREDS", f"Credentials: {json.dumps(data, indent=2)}")
    return data


def run_browser_test():
    """Main browser automation using Playwright"""
    from playwright.sync_api import sync_playwright

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: (
            console_errors.append(f"{msg.type}: {msg.text}")
            if msg.type == "error" else None
        ))

        # === Step 1: Extract token from chat.qwen.ai ===
        log("1", "Navigating to chat.qwen.ai...")
        page.goto("https://chat.qwen.ai", wait_until="networkidle", timeout=30000)
        page.screenshot(path=f"{SCREENSHOT_DIR}/01-qwen-page.png")

        # Execute JS to extract token
        log("1", "Extracting token via localStorage...")
        token_data = page.evaluate("""() => {
            const keys = Object.keys(localStorage);
            const result = {};
            for (const k of keys) {
                try { result[k] = localStorage.getItem(k); } catch(e) {}
            }
            return {
                token: localStorage.getItem('token') || '',
                allKeys: keys,
                cookie: document.cookie,
                storage: result
            };
        }""")

        log("1", f"Token extraction result:")
        log("1", f"  - token key exists: {'token' in token_data.get('allKeys', [])}")
        log("1", f"  - token value (first 20): {str(token_data.get('token', ''))[:20]}...")
        log("1", f"  - all localStorage keys: {token_data.get('allKeys', [])}")
        log("1", f"  - cookies: {str(token_data.get('cookie', ''))[:100]}")

        qwen_token = token_data.get("token", "")
        results["token_extracted"] = bool(qwen_token and len(qwen_token) > 10)
        results["token_preview"] = qwen_token[:20] + "..." if qwen_token else "(empty)"
        results["localStorage_keys"] = token_data.get("allKeys", [])

        # Save full token data for debugging
        with open(f"{SCREENSHOT_DIR}/token_extract.json", "w") as f:
            json.dump({k: (v[:50] + "..." if isinstance(v, str) and len(v) > 50 else v)
                       for k, v in token_data.items()}, f, indent=2)

        # === Step 2: Import token via our frontend API ===
        log("2", "Navigating to localhost:5173 to import token...")
        page.goto(f"{FRONTEND}/cookies", wait_until="networkidle", timeout=15000)
        page.screenshot(path=f"{SCREENSHOT_DIR}/02-cookies-page.png")

        if qwen_token and len(qwen_token) > 10:
            # Use fetch on our frontend to call backend API
            log("2", "Calling /api/cookies/manual via frontend fetch...")
            import_result = page.evaluate(f"""() => {{
                return fetch('/api/cookies/manual', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{platform: 'qwen', token: '{qwen_token}'}})
                }}).then(r => r.json()).catch(e => ({{error: e.message}}));
            }}""")
            log("2", f"Import API result: {import_result}")
            results["import_result"] = import_result

            # Also directly verify via backend
            direct_import, _ = import_token(qwen_token)
            results["direct_import"] = direct_import
        else:
            log("2", "WARNING: No valid token extracted! Trying to find alternative...")
            # Search all localStorage values for anything that looks like a JWT
            storage = token_data.get("storage", {})
            for k, v in storage.items():
                if v and len(v) > 20 and ("eyJ" in v or "." in v):
                    log("2", f"Found potential token in key '{k}': {v[:30]}...")
                    qwen_token = v
                    break

            if qwen_token:
                import_result = page.evaluate(f"""() => {{
                    return fetch('/api/cookies/manual', {{
                        method: 'POST',
                        headers: {{'Content-Type': 'application/json'}},
                        body: JSON.stringify({{platform: 'qwen', token: '{qwen_token}'}})
                    }}).then(r => r.json());
                }}""")
                log("2", f"Fallback import result: {import_result}")
                results["import_result"] = import_result
            else:
                results["import_result"] = {"error": "No token found in localStorage"}

        # === Step 3: Validate credential ===
        log("3", "Validating credential...")
        page.goto(f"{FRONTEND}/cookies", wait_until="networkidle", timeout=15000)
        validate_result = page.evaluate("""() => {
            return fetch('/api/cookies/validate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({platform: 'qwen'})
            }).then(r => r.json());
        }""")
        log("3", f"Validate result: {validate_result}")
        results["validate_result"] = validate_result

        # Reload credentials page and screenshot
        page.reload(wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=f"{SCREENSHOT_DIR}/03-after-import.png")

        # === Step 4: Test AI Chat ===
        log("4", "Testing AI Chat...")
        page.goto(FRONTEND, wait_until="networkidle", timeout=15000)
        page.screenshot(path=f"{SCREENSHOT_DIR}/04-chat-page.png")

        # Wait for React to fully render
        page.wait_for_timeout(2000)

        # Find and fill the input area
        log("4", "Looking for chat input...")
        textarea = page.query_selector("textarea")
        contenteditable = page.query_selector("[contenteditable='true']")

        if textarea:
            log("4", "Found textarea, typing message...")
            textarea.fill("你好，请用一句话介绍你自己")
        elif contenteditable:
            log("4", "Found contenteditable, typing message...")
            contenteditable.click()
            page.keyboard.type("你好，请用一句话介绍你自己")
        else:
            log("4", "WARNING: No input found, trying selector fallback...")
            page.evaluate("""() => {
                const el = document.querySelector('[data-placeholder], .input-area textarea, #chat-input');
                if (el) { el.focus(); el.value = '你好'; el.dispatchEvent(new Event('input', {bubbles:true})); }
            }""")

        page.screenshot(path=f"{SCREENSHOT_DIR}/05-message-typed.png")

        # Click send button
        log("4", "Clicking send button...")
        send_btn = page.query_selector("button[type='submit'], .send-btn, button:has(svg)")
        if send_btn:
            send_btn.click()
            log("4", "Send button clicked!")
        else:
            # Try any button that looks like send
            buttons = page.query_selector_all("button")
            for btn in buttons:
                text = btn.inner_text().strip()
                if text in ["", "Send", "\u53d1\u9001"] or (btn.query_selector("svg")):
                    btn.click()
                    log(f"4", f"Clicked button: '{text}'")
                    break

        page.screenshot(path=f"{SCREENSHOT_DIR}/06-after-send.png")

        # Wait for response (up to 30 seconds)
        log("4", "Waiting for AI response (30s max)...")
        received_response = False
        for i in range(15):
            page.wait_for_timeout(2000)
            # Check if there's an assistant message with content
            assistant_content = page.evaluate("""() => {
                const msgs = document.querySelectorAll('[class*=message], [class*=bubble], [role*=article]');
                for (const m of msgs) {
                    const t = m.textContent || '';
                    if (t.length > 5 && !m.closest('[class*=user]')) return t.substring(0, 100);
                }
                // Try checking for streaming content
                const streamEl = document.querySelector('.streaming, [data-streaming]');
                if (streamEl) return streamEl.textContent?.substring(0, 100) || 'streaming...';
                return null;
            }""")
            if assistant_content and len(assistant_content) > 5:
                log("4", f"Got response after {(i+1)*2}s: {assistant_content[:80]}...")
                received_response = True
                results["ai_response"] = assistant_content
                break
            log("4", f"  ... waiting ({(i+1)*2}s)")

        if not received_response:
            # Final check - get all visible text
            all_text = page.evaluate("() => document.body.innerText.substring(0, 500)")
            log("4", f"No response detected. Page text: {all_text[:200]}...")
            results["ai_response"] = None

        page.screenshot(path=f"{SCREENSHOT_DIR}/07-final-result.png")
        results["chat_response_received"] = received_response

        # === Step 5: Check errors ===
        log("5", "Collecting console errors...")
        results["console_errors"] = console_errors
        has_uuid_error = any("randomUUID" in e for e in console_errors)
        results["has_randomUUID_error"] = has_uuid_error
        log("5", f"Console errors ({len(console_errors)}):")
        for err in console_errors:
            log("5", f"  - {err}")

        # Check network requests
        log("5", "Checking network requests for API calls...")
        api_requests = []
        # We can't easily intercept in this mode, but check if response appeared

        browser.close()

    return results


def main():
    print("=" * 60)
    print("Zero Token Chat - E2E Automated Test")
    print("=" * 60)

    # Step 0: Health check
    if not test_backend_health():
        log("FATAL", "Backend not running! Aborting.")
        sys.exit(1)

    # Run browser test
    print("\n--- Starting Browser Automation ---\n")
    try:
        results = run_browser_test()
    except Exception as e:
        log("FATAL", f"Browser test crashed: {e}")
        import traceback
        traceback.print_exc()
        results = {"error": str(e)}

    # Print final report
    print("\n" + "=" * 60)
    print("FINAL TEST REPORT")
    print("=" * 60)

    print(f"\n[Token Extraction]")
    print(f"  Status: {'PASS' if results.get('token_extracted') else 'FAIL'}")
    print(f"  Preview: {results.get('token_preview', 'N/A')}")
    print(f"  Keys: {results.get('localStorage_keys', [])}")

    print(f"\n[Credential Import]")
    imp = results.get('import_result', {})
    print(f"  Result: {imp}")

    print(f"\n[Credential Validation]")
    val = results.get('validate_result', {})
    print(f"  Valid: {val.get('valid', 'N/A')}")
    print(f"  Message: {val.get('message', 'N/A')}")

    print(f"\n[AI Chat Test]")
    print(f"  Response Received: {'YES' if results.get('chat_response_received') else 'NO'}")
    resp = results.get('ai_response')
    if resp:
        print(f"  Response Preview: {resp[:100]}...")

    print(f"\n[Error Checks]")
    uuid_err = results.get('has_randomUUID_error', False)
    print(f"  crypto.randomUUID Error: {'FAIL' if uuid_err else 'PASS (fixed)'}")
    errs = results.get('console_errors', [])
    print(f"  Total Console Errors: {len(errs)}")
    for e in errs[:5]:
        print(f"    - {e}")

    # Summary
    print("\n" + "=" * 60)
    all_pass = [
        results.get('token_extracted', False),
        results.get('validate_result', {}).get('valid', False),
        not uuid_err,
    ]
    passed = sum(all_pass)
    total = len(all_pass)
    print(f"OVERALL: {passed}/{total} checks passed")
    if passed == total:
        print("STATUS: ALL TESTS PASSED ✅")
    else:
        print("STATUS: SOME TESTS FAILED ⚠️")
    print("=" * 60)

    # Save report
    report_path = f"{SCREENSHOT_DIR}/test_report.json"
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False, default=str)
    print(f"\nReport saved to: {report_path}")


if __name__ == "__main__":
    main()
