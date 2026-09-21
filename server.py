#!/usr/bin/env python3
"""Minimal static file server + optional CORS proxy for HK open-data hosts.

Usage:
  python3 server.py          # http://127.0.0.1:8765/
  python3 server.py 9000

Proxy (only if browser CORS ever blocks):
  GET /proxy?url=https://data.etabus.gov.hk/v1/transport/kmb/eta/...
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ALLOWED_HOSTS = {
    "data.etabus.gov.hk",
    "data.weather.gov.hk",
    "api.open-meteo.com",
    "rt.data.gov.hk",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/proxy":
            return self._proxy(parsed)
        return super().do_GET()

    def _proxy(self, parsed):
        qs = urllib.parse.parse_qs(parsed.query)
        target = (qs.get("url") or [None])[0]
        if not target:
            return self._json(400, {"error": "missing url"})
        try:
            host = urllib.parse.urlparse(target).hostname or ""
        except Exception:
            return self._json(400, {"error": "bad url"})
        if host not in ALLOWED_HOSTS:
            return self._json(403, {"error": f"host not allowed: {host}"})
        try:
            req = urllib.request.Request(
                target, headers={"User-Agent": "hk-transit-dashboard/1.0"}
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                body = resp.read()
                ctype = resp.headers.get("Content-Type", "application/json")
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            self._json(e.code, {"error": str(e)})
        except Exception as e:
            self._json(502, {"error": str(e)})

    def _json(self, code, obj):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Serving {ROOT}")
    print(f"Open http://127.0.0.1:{PORT}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
