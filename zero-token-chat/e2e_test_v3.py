#!/usr/bin/env python3
"""E2E Test - Playwright async with auto-install"""
import json, os, sys, time, asyncio

SCREENSHOT_DIR = "/workspace/zero-token-chat/e2e-screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def log(s, m): print(f"[{time.strftime('%H:%M:%S')}] [{s}] {m}")

async def main():
    log("INIT", "Starting E2E test...")
    from playwright.async_api import async_playwright

    pw = await async_playwright().start()

    # Try launch, install if needed
    try:
        browser = await pw.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
    except Exception as e:
        log("INIT", f"Browser not found: {e}")
        log("INIT", "Installing chromium via playwright...")
        proc = await asyncio.create_subprocess_exec(
            sys.executable, '-m', 'playwright', 'install', 'chromium',
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
        log("INSTALL", f"stdout: {stdout.decode()[-300:]}")
        log("INSTALL", f"stderr: {stderr.decode()[-300:]}")
        browser = await pw.chromium.launch(headless=True)

    results = {}
    page = await (await browser.new_context()).new_page()

    errors = []
    page.on('console', lambda msg: errors.append(f"{msg.type}: {msg.text}") if msg.type == 'error' else None)

    # Step 1: Extract token
    log("1", "Opening chat.qwen.ai...")
    try:
        await page.goto('https://chat.qwen.ai', wait_until='domcontentloaded', timeout=25000)
        await page.wait_for_timeout(5000)
    except Exception as e:
        log("1", f"Nav warning: {e}")

    await page.screenshot(path=f'{SCREENSHOT_DIR}/01-qwen.png')

    td = await page.evaluate("""() => {
        try {
            return JSON.stringify({
                token: localStorage.getItem('token') || '',
                keys: Object.keys(localStorage),
                cookie: document.cookie?.substring(0, 200) || '',
                title: document.title,
                url: location.href
            });
        } catch(e) { return JSON.stringify({error: e.message}); }
    }""")
    td = json.loads(td) if isinstance(td, str) else td
    token = td.get('token', '')
    log("1", f"  title={td.get('title')} keys={td.get('keys')}")
    log("1", f"  token={'YES('+str(len(token))+')' if token else 'NO'}")
    results['token_extracted'] = bool(token and len(token) > 10)
    results['token_preview'] = (token[:25]+'...') if token else '(empty)'
    results['keys'] = td.get('keys', [])
    with open(f'{SCREENSHOT_DIR}/token_data.json','w') as f: json.dump(td,f,indent=2)

    # Search fallback
    if not token or len(token) < 10:
        log("1", "Searching all localStorage...")
        storage = await page.evaluate("""() => {
            const r = {};
            for (const k of Object.keys(localStorage)) {
                try { r[k] = localStorage.getItem(k)?.substring(0, 80); } catch(e){}
            }
            return r;
        }""")
        for k,v in (storage or {}).items():
            if v and len(v) > 20 and ('eyJ' in v):
                log(f"1", f"  Found in '{k}': {v[:35]}...")
                token = v; break

    # Step 2: Import via API
    log("2", "Importing token...")
    await page.goto('http://localhost:5173/cookies', wait_until='networkidle', timeout=15000)
    if token and len(token) > 10:
        imp = await page.evaluate(f"""() => {{
            return fetch('/api/cookies/manual',{{
                method:'POST',
                headers:{{'Content-Type':'application/json'}},
                body:JSON.stringify({{platform:'qwen',token:'{token}'}})
            }}).then(r=>r.json()).catch(e=>({{error:e.message}}));
        }}""")
        log(f"2", f"  Result: {imp}")
        results['import_result'] = imp
    else:
        results['import_result'] = {'error':'no_token'}
        log("2", "  NO TOKEN to import!")

    await page.wait_for_timeout(2000)
    await page.screenshot(path=f'{SCREENSHOT_DIR}/02-cookies.png')

    # Step 3: Validate
    log("3", "Validating...")
    val = await page.evaluate("""() => {
        return fetch('/api/cookies/validate',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({platform:'qwen'})
        }).then(r=>r.json());
    }""")
    log(f"3", f"  Validate: {val}")
    results['validate'] = val

    creds = await page.evaluate("()=>fetch('/api/cookies').then(r=>r.json())")
    log("3", f"  Creds: {json.dumps(creds)}")
    results['creds'] = creds

    # Step 4: Chat test
    log("4", "Testing AI Chat...")
    await page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    await page.wait_for_timeout(3000)
    await page.screenshot(path=f'{SCREENSHOT_DIR}/03-chat.png')

    # Fill input
    msg = '\u4f60\u597d'
    filled = False
    ta = await page.query_selector('textarea')
    if ta:
        await ta.fill(msg); filled = True; log("4","  Filled textarea")
    else:
        ce = await page.query_selector('[contenteditable="true"]')
        if ce:
            await ce.click(); await page.keyboard.type(msg); filled = True; log("4","  Filled contenteditable")
        else:
            await page.evaluate(f"""() => {{
                const el=document.querySelector('textarea');
                if(el){{el.value='{msg}';el.dispatchEvent(new Event('input',{{bubbles:true}}));}}
            }}"""); log("4","  JS fill fallback")

    await page.screenshot(path=f'{SCREENSHOT_DIR}/04-typed.png')

    # Send
    for sel in ['button[type="submit"]', 'button:not([disabled])']:
        btn = await page.query_selector(sel)
        if btn:
            await btn.click(); log("4",f"  Clicked send"); break
    else:
        btns = await page.query_selector_all('button')
        for b in btns:
            if not await b.is_disabled():
                t = (await b.inner_text()).strip()
                if t in ['','Send','\u53d1\u9001']:
                    await b.click(); log("4","  Clicked button"); break

    await page.screenshot(path=f'{SCREENSHOT_DIR}/05-sent.png')

    # Wait response
    log("4","  Waiting response...")
    got_resp = False
    for i in range(10):
        await page.wait_for_timeout(3000)
        c = await page.evaluate("""()=>{
            const t=(document.body.innerText||'');
            const els=document.querySelectorAll('[class*=message],article,[role=article]');
            for(const e of els){const x=(e.textContent||'').trim();if(x.length>15)return x.substring(0,120);}
            if(t.includes('\u4f60\u597d')&&t.length>30)return t.substring(0,120);
            return null;
        }""")
        if c:
            log(f"4","  GOT RESPONSE: {c[:70]}...")
            results['ai_response']=c; got_resp=True; break

    if not got_resp:
        txt = await page.evaluate("()=>document.body.innerText?.substring(0,250)||''")
        log(f"4","  No response. Text: {txt[:120]}")
        results['ai_response']=None
    results['response_received']=got_resp
    await page.screenshot(path=f'{SCREENSHOT_DIR}/06-final.png')

    # Step 5: Errors
    log("5","Error check...")
    uuid_err = any('randomUUID' in e for e in errors)
    results['uuid_error']=uuid_err
    results['errors']=errors
    log(f"5","  randomUUID err: {'FAIL' if uuid_err else 'PASS (FIXED)'}")
    log(f"5","  Total errs: {len(errors)}")
    for e in errors[:8]: log(f"5","    {e}")

    await browser.close()
    await pw.stop()

    # Report
    print("\n"+"="*60+"\nFINAL REPORT\n"+"="*60)
    checks=[]
    print(f"\n[Token] {'PASS' if results.get('token_extracted') else 'FAIL'} - {results.get('token_preview')}")
    checks.append(results.get('token_extracted',False))
    print(f"\n[Import] {results.get('import_result',{})}")
    print(f"\n[Validate] valid={results.get('validate',{}).get('valid')}")
    checks.append(results.get('validate',{}).get('valid',False))
    print(f"\n[Chat] resp={'YES' if results.get('response_received') else 'NO'}")
    checks.append(results.get('response_received',False))
    if results.get('ai_response'): print(f"  -> {results['ai_response'][:80]}")
    print(f"\n[randomUUID] {'PASS' if not results.get('uuid_error') else 'FAIL'}")
    checks.append(not results.get('uuid_error',True))
    p=sum(checks); t=len(checks)
    print(f"\n{'='*60}\nRESULT: {p}/{t} | {'ALL PASS ✅' if p==t else 'SOME FAILED ⚠️'}\n{'='*60}")
    with open(f'{SCREENSHOT_DIR}/report.json','w') as f: json.dump(results,f,indent=2,default=str,ensure_ascii=False)

asyncio.run(main())
