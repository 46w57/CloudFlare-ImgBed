#!/usr/bin/env python3
"""Download a Steam Workshop item through an HTTP CONNECT proxy.

This script monkey-patches the `steam` Python library so its gevent TCP
connection is tunneled through an HTTP CONNECT proxy, and the WebAPI
requests retry on the (flaky) proxy's SSL errors.

Usage:
  # Anonymous login (works only for free-to-play games' workshop content):
  python3 download_workshop.py

  # Authenticated login (required for paid games like KSP / App 220200):
  STEAM_USERNAME='your_account' STEAM_PASSWORD='your_password' python3 download_workshop.py
  # If 2FA / Steam Guard Mobile Authenticator is enabled, also set:
  #   STEAM_2FA_CODE='<shared_secret_base64>'   # generates TOTP automatically
  # or pass a literal 6-digit code:
  #   STEAM_2FA_CODE='123456'
  # For email Steam Guard codes:
  #   STEAM_AUTH_CODE='ABCDE'

Environment variables:
  HTTPS_PROXY / HTTP_PROXY - the proxy to use (default http://127.0.0.1:18080)
  STEAM_USERNAME           - Steam account name (optional)
  STEAM_PASSWORD           - Steam account password (optional)
  STEAM_2FA_CODE           - TOTP shared_secret (base64) or 6-digit code (optional)
  STEAM_AUTH_CODE          - Email Steam Guard code (optional)
"""
import sys
import os
import struct
import lzma
import zlib
import logging
import socket

# Use workspace-local libs
sys.path.insert(0, '/workspace/.python-libs')

from gevent import socket as gsocket
from steam.client import SteamClient
from steam.client.cdn import CDNClient
from steam.enums import EResult
from steam.core.connection import TCPConnection
from steam.core import cm as cm_module
from steam import webapi as steam_webapi
from steam.utils import web as steam_web_utils
import time as _time_module


# --- Patch make_requests_session to add retry on SSL errors --------------
_orig_make_session = steam_web_utils.make_requests_session


def _make_session_with_retry():
    import requests
    from requests.adapters import HTTPAdapter

    session = _orig_make_session()

    # Wrap each HTTP method to retry on SSL errors (proxy is flaky).
    def _with_retry(method_name):
        orig = getattr(session, method_name)

        def wrapped(url, *args, **kwargs):
            last_exc = None
            for attempt in range(8):
                try:
                    return orig(url, *args, **kwargs)
                except requests.exceptions.SSLError as e:
                    last_exc = e
                    print(f'[webapi-retry] SSL error on {method_name} {url} (attempt {attempt+1}/8): {e}')
                    _time_module.sleep(0.5 * (attempt + 1))
                except requests.exceptions.ConnectionError as e:
                    last_exc = e
                    print(f'[webapi-retry] Conn error on {method_name} {url} (attempt {attempt+1}/8): {e}')
                    _time_module.sleep(0.5 * (attempt + 1))
            raise last_exc
        return wrapped

    session.get = _with_retry('get')
    session.post = _with_retry('post')
    return session


steam_web_utils.make_requests_session = _make_session_with_retry
# Re-fetch the symbol that was already imported into steam.webapi
steam_webapi._make_session = _make_session_with_retry

APP_ID = 220200  # Kerbal Space Program
WORKSHOP_ID = 3540196599
OUTPUT_DIR = '/workspace/workshop_download'

os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Proxy config --------------------------------------------------------
PROXY_HOST, PROXY_PORT = '127.0.0.1', 18080
proxy_env = os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
if proxy_env:
    # parse http://host:port
    proxy_env = proxy_env.replace('http://', '').replace('https://', '')
    if ':' in proxy_env:
        PROXY_HOST, PROXY_PORT_s = proxy_env.rsplit(':', 1)
        try:
            PROXY_PORT = int(PROXY_PORT_s)
        except ValueError:
            pass
    else:
        PROXY_HOST = proxy_env


# --- Patch TCPConnection to tunnel through HTTP CONNECT proxy ------------
_orig_new_socket = TCPConnection._new_socket
_orig_connect = TCPConnection._connect


def _proxied_new_socket(self):
    self.socket = gsocket.socket(socket.AF_INET, socket.SOCK_STREAM)


def _proxied_connect(self, server_addr):
    # server_addr is (ip, port) tuple
    target_host, target_port = server_addr
    print(f'[proxy] CONNECT {target_host}:{target_port} via {PROXY_HOST}:{PROXY_PORT}')
    # 1) Connect to the proxy
    self.socket.connect((PROXY_HOST, PROXY_PORT))
    # 2) Send HTTP CONNECT
    req = (
        f'CONNECT {target_host}:{target_port} HTTP/1.1\r\n'
        f'Host: {target_host}:{target_port}\r\n'
        f'User-Agent: steam-py/1.0\r\n'
        f'Proxy-Connection: Keep-Alive\r\n\r\n'
    ).encode()
    self.socket.sendall(req)
    # 3) Read CONNECT response (until end of headers)
    buf = b''
    while b'\r\n\r\n' not in buf:
        chunk = self.socket.recv(4096)
        if not chunk:
            raise socket.error('Proxy closed connection during CONNECT')
        buf += chunk
        if len(buf) > 8192:
            raise socket.error('Proxy response too large')
    status_line = buf.split(b'\r\n', 1)[0].decode(errors='replace')
    print(f'[proxy] {status_line}')
    if ' 200 ' not in status_line and not status_line.endswith(' 200'):
        raise socket.error(f'Proxy CONNECT failed: {status_line}')
    # Connection is now a tunnel; the remaining bytes (if any) belong to the
    # Steam protocol. Inject them back as a peek/prefix.
    if buf.endswith(b'\r\n\r\n'):
        leftover = buf.split(b'\r\n\r\n', 1)[1]
    else:
        leftover = b''
    if leftover:
        # We need to make sure the reader loop sees these bytes first.
        # The TCPConnection uses socket.recv directly; emulate by overriding recv.
        orig_recv = self.socket.recv
        _left = [leftover]

        def _recv_with_leftover(*args, **kwargs):
            if _left[0]:
                data = _left[0]
                _left[0] = b''
                return data
            return orig_recv(*args, **kwargs)
        self.socket.recv = _recv_with_leftover


TCPConnection._new_socket = _proxied_new_socket
TCPConnection._connect = _proxied_connect

# --- Increase WebAPI timeout --------------------------------------------
# The steam library hardcodes http_timeout=3 in bootstrap_from_webapi.
# Patch CMServerList.bootstrap_from_webapi to use a larger timeout.
_orig_bootstrap = cm_module.CMServerList.bootstrap_from_webapi


def _bootstrap_with_long_timeout(self, cell_id=0):
    from steam import webapi
    try:
        resp = webapi.get('ISteamDirectory', 'GetCMList', 1,
                          params={'cellid': cell_id, 'http_timeout': 30})
    except Exception as exp:
        print(f'[!] WebAPI bootstrap failed: {exp}')
        return False
    result = EResult(resp['response']['result'])
    if result != EResult.OK:
        print(f'[!] GetCMList failed: {result}')
        return False
    new_servers = resp['response']['serverlist']
    self.clear()
    # Parse "host:port" strings into (host, port) tuples
    parsed = []
    for s in new_servers:
        if isinstance(s, str) and ':' in s:
            h, p = s.rsplit(':', 1)
            try:
                parsed.append((h, int(p)))
            except ValueError:
                pass
    self.merge_list(parsed)
    self.cell_id = cell_id
    self.last_updated = int(__import__('time').time())
    print(f'[+] Bootstrap got {len(self)} CM servers')
    return True


cm_module.CMServerList.bootstrap_from_webapi = _bootstrap_with_long_timeout


def main():
    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s %(name)s %(levelname)s %(message)s')

    # Read Steam credentials from env (preferred - no shell history exposure)
    steam_user = os.environ.get('STEAM_USERNAME', '').strip()
    steam_pass = os.environ.get('STEAM_PASSWORD', '').strip()
    steam_2fa  = os.environ.get('STEAM_2FA_CODE', '').strip()      # TOTP or auth code
    steam_guard = os.environ.get('STEAM_AUTH_CODE', '').strip()    # email guard code

    print(f'[*] Connecting via proxy {PROXY_HOST}:{PROXY_PORT}...')
    client = SteamClient()
    client.verbose_debug = False

    if steam_user and steam_pass:
        print(f'[*] Logging in as {steam_user}...')
        from steam.guard import generate_twofactor_code_for_time
        # If a shared_secret was provided as STEAM_2FA_CODE, generate TOTP for current time
        kwargs = {'username': steam_user, 'password': steam_pass}
        # Try to interpret STEAM_2FA_CODE as a shared_secret (base64)
        if steam_2fa:
            try:
                code = generate_twofactor_code_for_time(steam_2fa)
                kwargs['two_factor_code'] = code
                print(f'[*] Generated TOTP code from shared_secret')
            except Exception:
                # Treat as a literal 2FA code
                kwargs['two_factor_code'] = steam_2fa
        if steam_guard:
            kwargs['auth_code'] = steam_guard
        status = client.login(**kwargs)
        if status != EResult.OK:
            print(f'[!] Login failed: {status}')
            client.disconnect()
            return 1
    else:
        print('[*] No STEAM_USERNAME/STEAM_PASSWORD env vars - trying anonymous login...')
        if not client.anonymous_login():
            print('[!] Anonymous login failed')
            return 1
    print(f'[+] Logged in. CellID={client.cell_id}')

    cdn = CDNClient(client)

    print(f'[*] Getting manifest for workshop item {WORKSHOP_ID} (app {APP_ID})...')
    # Call the underlying methods directly to avoid a bug in
    # CDNClient.get_manifest_for_workshop_item (NameError on depot_id).
    resp = client.send_um_and_wait('PublishedFile.GetDetails#1', {
        'publishedfileids': [WORKSHOP_ID],
        'includetags': False,
        'includeadditionalpreviews': False,
        'includechildren': False,
        'includekvtags': False,
        'includevotes': False,
        'short_description': True,
        'includeforsaledata': False,
        'includemetadata': False,
        'language': 0
    }, timeout=15)
    if resp is None:
        print('[!] PublishedFile.GetDetails returned no response (timeout)')
        client.logout(); return 1
    if resp.header.eresult != EResult.OK:
        print(f'[!] PublishedFile.GetDetails failed: {resp.header.eresult} - {resp.header.error_message!r}')
        client.logout(); return 1
    wf = resp.body.publishedfiledetails[0]
    print(f'[+] Workshop file: title={wf.title!r} hcontent_file={wf.hcontent_file} consumer_appid={wf.consumer_appid}')
    if not wf.hcontent_file:
        print('[!] Workshop file is not on SteamPipe (no hcontent_file)')
        client.logout(); return 1

    ws_app_id = wf.consumer_appid
    hcontent = int(wf.hcontent_file)
    print(f'[*] Getting manifest request code for app={ws_app_id} depot={hcontent}...')
    manifest_code = 0
    try:
        manifest_code = cdn.get_manifest_request_code(ws_app_id, ws_app_id, hcontent)
        print(f'[+] Manifest request code: {manifest_code}')
    except Exception as e:
        print(f'[!] get_manifest_request_code failed: {type(e).__name__}: {e}')
        print('[*] Trying without manifest request code (workaround)...')

    try:
        manifest = cdn.get_manifest(ws_app_id, ws_app_id, hcontent, manifest_request_code=manifest_code)
    except Exception as e:
        print(f'[!] get_manifest failed: {type(e).__name__}: {e}')
        client.logout(); return 1

    print(f'[+] Got manifest. Depot id={manifest.depot_id}, #files={len(manifest.files)}')

    total_bytes = 0
    for f in manifest.files:
        filename = f.filename
        print(f'[*] File: {filename} (size={f.size}, #chunks={len(f.chunks)})')
        out_path = os.path.join(OUTPUT_DIR, filename.replace('\\', '/'))
        d = os.path.dirname(out_path)
        if d:
            os.makedirs(d, exist_ok=True)
        with open(out_path, 'wb') as out:
            for chunk in f.chunks:
                try:
                    data = cdn.get_chunk(APP_ID, manifest.depot_id, chunk.sha)
                except Exception as e:
                    print(f'[!] Chunk download failed: {type(e).__name__}: {e}')
                    client.logout()
                    return 1
                if chunk.compression == 0:
                    out.write(data)
                elif chunk.compression == 2:
                    out.write(lzma.decompress(data))
                elif chunk.compression == 1:
                    out.write(zlib.decompress(data))
                else:
                    out.write(data)
        sz = os.path.getsize(out_path)
        total_bytes += sz
        print(f'[+] Saved: {out_path} ({sz} bytes)')

    print(f'[✓] Done. Total {total_bytes} bytes in {OUTPUT_DIR}')
    client.logout()
    return 0


if __name__ == '__main__':
    sys.exit(main())
