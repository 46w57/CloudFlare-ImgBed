#!/usr/bin/env python3
"""E2E Test using browser-use's built-in browser management"""
import json
import os
import sys
import time

SCREENSHOT_DIR = "/workspace/zero-token-chat/e2e-screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)


def log(step, msg):
    print(f"[{time.strftime('%H:%M:%S')}] [{step}] {msg}")


def main():
    log("INIT", "Starting E2E test with browser-use...")

    # Import browser-use components
    try:
        from browser_use.browser.browser import Browser
        from browser_use.browser.context import BrowserContext
        import asyncio
    except ImportError as e:
        log("FATAL", f"Import error: {e}")
        return

    async def run_test():
        from playwright.async_api import async_playwright

        results = {}

        # Launch browser using Playwright directly (browser-use wraps it)
        log("1", "Launching browser...")
        pw = await async_playwright().start()

        try:
            browser = await pw.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            )
        except Exception as e:
            log("FATAL", f"Cannot launch browser: {e}")
            log("HINT", "Trying to install browser...")
            proc = await asyncio.create_subprocess_exec(
                sys.executable, '-m', 'playwright', 'install', 'chromium',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate(timeout=300)
            log("INSTALL", f"Install stdout: {stdout.decode()[-200:]}")
            log("INSTALL", f"Install stderr: {stderr.decode()[-200:]}")
            browser = await pw.chromium.launch(headless=True)

        context = await browser.new_context()
        page = await context.new_page()

        # Collect console errors
        console_errors = []
        page.on('console', lambda msg: (
            console_errors.append(f"{msg.type}: {msg.text}")
            if msg.type == 'error' else None
        ))

        # === Step 1: Extract token from chat.qwen.ai ===
        log("1", "Navigating to chat.qwen.ai...")
        try:
            await page.goto('https://chat.qwen.ai', wait_until='networkidle', timeout=30000)
            await page.screenshot(path=f'{SCREENSHOT_DIR}/01-qwen-page.png')
        except Exception as e:
            log("1", f"Navigation warning: {e}")
            await page.screenshot(path=f'{SCREENSHOT_DIR}/01-qwen-page.png')

        log("1", "Extracting token via JS eval...")
        token_data = await page.evaluate("""() => {
            const keys = Object.keys(localStorage);
            const storage = {};
            for (const k of keys) {
                try { storage[k] = localStorage.getItem(k)?.substring(0, 100); } catch(e) {}
            }
            return {
                token: localStorage.getItem('token') || '',
                allKeys: keys,
                cookie: document.cookie?.substring(0, 500) || '',
                storage: storage,
                url: location.href,
                title: document.title
            };
        }""")

        qwen_token = token_data.get('token', '')
        log("1", f"  URL: {token_data.get('url')}")
        log("1", f"  Title: {token_data.get('title')}")
        log("1", f"  Keys: {token_data.get('allKeys', [])}")
        log("1", f"  Token (first30): {qwen_token[:30]}..." if qwen_token else "  Token: EMPTY")
        log("1", f"  Cookie: {str(token_data.get('cookie', ''))[:100]}")

        results['token_extracted'] = bool(qwen_token and len(qwen_token) > 10)
        results['token_preview'] = (qwen_token[:20] + '...') if qwen_token else '(empty)'
        results['localStorage_keys'] = token_data.get('allKeys', [])
        results['page_title'] = token_data.get('title', '')
        results['full_storage'] = {k: v for k, v in token_data.get('storage', {}).items() if v}

        # Save raw data
        with open(f'{SCREENSHOT_DIR}/token_data.json', 'w') as f:
            json.dump(token_data, f, indent=2, ensure_ascii=False)

        # If no token in 'token' key, search all values
        if not qwen_token or len(qwen_token) < 10:
            log("1", "Searching for token in all localStorage values...")
            for k, v in token_data.get('storage', {}).items():
                if v and len(v) > 20 and ('eyJ' in v):
                    log(f"1", f"  Found JWT-like value in key '{k}': {v[:40]}...")
                    qwen_token = v
                    break

        # === Step 2: Import token via API ===
        log("2", "Importing token via backend API...")
        if qwen_token and len(qwen_token) > 10:
            import_result = await page.evaluate(f"""() => {{
                return fetch('/api/cookies/manual', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{
                        platform: 'qwen',
                        token: '{qwen_token}'
                    }})
                }})
                .then(r => r.json())
                .catch(e => ({{error: e.message}}));
            }}""")
            log("2", f"  Import result: {import_result}")
            results['import_result'] = import_result
        else:
            log("2", "  WARNING: No valid token found!")
            results['import_result'] = {'error': 'no_valid_token'}

        # Navigate to cookies page
        await page.goto('http://localhost:5173/cookies', wait_until='networkidle', timeout=15000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f'{SCREENSHOT_DIR}/02-cookies-after-import.png')

        # === Step 3: Validate credential ===
        log("3", "Validating Qwen credential...")
        validate_result = await page.evaluate("""() => {
            return fetch('/api/cookies/validate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({platform: 'qwen'})
            }).then(r => r.json());
        }""")
        log(f"3", f"  Validate: {validate_result}")
        results['validate_result'] = validate_result

        # List credentials
        creds = await page.evaluate("""() => {
            return fetch('/api/cookies').then(r => r.json());
        }""")
        log("3", f"  All creds: {json.dumps(creds)}")
        results['all_credentials'] = creds

        # === Step 4: Test AI Chat ===
        log("4", "Testing AI Chat...")
        await page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f'{SCREENSHOT_DIR}/03-chat-page.png')

        # Find input and type message
        log("4", "  Finding input element...")
        textarea = await page.query_selector('textarea')
        inputs = await page.query_selector_all('input[type="text"], [contenteditable="true"]')

        if textarea:
            await textarea.fill('\u4f60\u597d\uff0c\u8bf7\u7528\u4e00\u53e8\u8bdd\u4ecb\u7ecd\u4f60\u81ea\u5df1')
            log("4", "  Typed message via textarea")
        elif inputs:
            await inputs[0].click()
            await page.keyboard.type('\u4f60\u597d')
            log("4", "  Typed message via input")
        else:
            log("4", "  Using JS fallback to set input...")
            await page.evaluate("""() => {
                const ta = document.querySelector('textarea');
                if (ta) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                    nativeInputValueSetter.call(ta, '\u4f60\u597d');
                    ta.dispatchEvent(new Event('input', {bubbles: true}));
                    ta.dispatchEvent(new Event('change', {bubbles: true}));
                }
            }""")

        await page.screenshot(path=f'{SCREENSHOT_DIR}/04-message-typed.png')

        # Click send button
        log("4", "  Clicking send...")
        sent = False
        selectors = [
            'button[type="submit"]',
            'button:has(svg.lucide-send)',
            'button:has(svg):not(:disabled)',
            '.send-btn',
        ]
        for sel in selectors:
            btn = await page.query_selector(sel)
            if btn:
                await btn.click()
                sent = True
                log(f"4", f"  Clicked: {sel}")
                break
        if not sent:
            buttons = await page.query_selector_all('button')
            for btn in buttons:
                text = (await btn.inner_text()).strip()
                disabled = await btn.is_disabled()
                if not disabled and text in ['', 'Send']:
                    await btn.click()
                    sent = True
                    break

        await page.screenshot(path=f'{SCREENSHOT_DIR}/05-after-send.png')

        # Wait for response
        log("4", "  Waiting for response (25s max)...")
        received = False
        for i in range(12):
            await page.wait_for_timeout(2500)
            content = await page.evaluate("""() => {
                // Look for assistant message content
                const allText = document.body.innerText || '';
                const hasResponse = allText.includes('\u4f60\u597d') && allText.length > 20;
                // Try to find streaming/markdown content
                const articles = document.querySelectorAll('[class*=message], [class*=bubble], article');
                for (const a of articles) {
                    const t = (a.textContent || '').trim();
                    if (t.length > 10) return t.substring(0, 150);
                }
                return hasResponse ? allText.substring(0, 150) : null;
            }""")
            if content:
                log(f"4", f"  Response after {(i+1)*2.5}s: {content[:80]}...")
                results['ai_response'] = content
                received = True
                break

        if not received:
            final_text = await page.evaluate("() => document.body.innerText?.substring(0, 300) || ''")
            log(f"4", f"  No response. Page text: {final_text[:150]}")
            results['ai_response'] = None

        results['chat_response_received'] = received
        await page.screenshot(path=f'{SCREENSHOT_DIR}/06-final.png')

        # === Step 5: Error check ===
        log("5", "Checking errors...")
        uuid_err = any('randomUUID' in e for e in console_errors)
        results['has_randomUUID_error'] = uuid_err
        results['console_errors'] = console_errors
        log(f"5", f"  randomUUID error: {'YES (BUG!)' if uuid_err else 'NO (FIXED OK)'}")
        log(f"5", f"  Total errors: {len(console_errors)}")
        for e in console_errors[:10]:
            log(f"5", f"    - {e}")

        await browser.close()
        await pw.stop()
        return results

    results = asyncio.run(run_test())

    # Print report
    print("\n" + "=" * 60)
    print("E2E TEST REPORT")
    print("=" * 60)

    checks = []
    print(f"\n[Token Extraction]")
    ok = results.get('token_extracted', False)
    checks.append(ok)
    print(f"  Status: {'PASS' if ok else 'FAIL'}")
    print(f"  Preview: {results.get('token_preview', 'N/A')}")
    print(f"  Keys: {results.get('localStorage_keys', [])}")
    print(f"  Title: {results.get('page_title', 'N/A')}")

    print(f"\n[Credential Import]")
    imp = results.get('import_result', {})
    print(f"  Result: {imp}")

    print(f"\n[Credential Validation]")
    val = results.get('validate_result', {})
    valid = val.get('valid', False)
    checks.append(valid)
    print(f"  Valid: {valid}")
    print(f"  Message: {val.get('message', 'N/A')}")

    print(f"\n[AI Chat]")
    resp_ok = results.get('chat_response_received', False)
    checks.append(resp_ok)
    print(f"  Response: {'YES' if resp_ok else 'NO'}")
    if results.get('ai_response'):
        print(f"  Preview: {results['ai_response'][:100]}")

    print(f"\n[Error Check]")
    no_uuid = not results.get('has_randomUUID_error', True)
    checks.append(no_uuid)
    print(f"  crypto.randomUUID: {'PASS (fixed)' if no_uuid else 'FAIL'}")
    errs = results.get('console_errors', [])
    print(f"  Console errors: {len(errs)}")

    passed = sum(checks)
    total = len(checks)
    print(f"\n{'=' * 60}")
    print(f"OVERALL: {passed}/{total} PASSED")
    print(f"STATUS: {'ALL PASS' if passed == total else 'SOME FAILED'}")
    print("=" * 60)

    with open(f'{SCREENSHOT_DIR}/test_report.json', 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False, default=str)
    print(f"\nReport: {SCREENSHOT_DIR}/test_report.json")


if __name__ == '__main__':
    main()
