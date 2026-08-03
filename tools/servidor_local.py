#!/usr/bin/env python3
"""Servidor local IZC: archivos estáticos + API de registro/login (data/usuarios.json)."""
from __future__ import annotations

import json
import re
import webbrowser
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
USERS_FILE = ROOT / "data" / "usuarios.json"
PORT = 8080
NIT_RE = re.compile(r"^\d{6,15}(-\d)?$")


def normalize_nit(nit: str) -> str:
    return re.sub(r"[\s.]", "", (nit or "").strip())


def read_users() -> list:
    if not USERS_FILE.is_file():
        return []
    try:
        data = json.loads(USERS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def write_users(users: list) -> None:
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    USERS_FILE.write_text(
        json.dumps(users, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def find_user(users: list, nit: str):
    for i, u in enumerate(users):
        if normalize_nit(str(u.get("nit", ""))) == nit:
            return i, u
    return None, None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        path = urlparse(self.path).path
        if path in ("/api/auth", "/api/auth.php"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            return
        self.send_error(404)

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in ("/api/auth", "/api/auth.php"):
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            body = {}

        action = (body.get("action") or "").strip().lower()
        if action == "register":
            self._register(body)
        elif action == "login":
            self._login(body)
        else:
            self._json({"ok": False, "error": "Acción no válida. Usa register o login."}, 400)

    def _register(self, body: dict):
        nit = normalize_nit(str(body.get("nit", "")))
        password = str(body.get("password", ""))

        if not nit or not NIT_RE.match(nit):
            self._json(
                {
                    "ok": False,
                    "error": "NIT inválido. Usa solo números (opcional dígito de verificación).",
                },
                400,
            )
            return
        if len(password) < 4:
            self._json(
                {"ok": False, "error": "La contraseña debe tener al menos 4 caracteres."},
                400,
            )
            return

        users = read_users()
        _, existing = find_user(users, nit)
        if existing:
            self._json({"ok": False, "error": "Este NIT ya está registrado."}, 409)
            return

        users.append(
            {
                "nit": nit,
                "password": password,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        try:
            write_users(users)
        except OSError:
            self._json({"ok": False, "error": "No se pudo guardar el usuario en el archivo."}, 500)
            return

        self._json({"ok": True, "nit": nit, "message": "Registro exitoso."})

    def _login(self, body: dict):
        nit = normalize_nit(str(body.get("nit", "")))
        password = str(body.get("password", ""))

        if not nit or not password:
            self._json({"ok": False, "error": "Ingresa NIT y contraseña."}, 400)
            return

        users = read_users()
        _, user = find_user(users, nit)
        if not user or str(user.get("password", "")) != password:
            self._json({"ok": False, "error": "NIT o contraseña incorrectos."}, 401)
            return

        self._json({"ok": True, "nit": user["nit"], "message": "Sesión iniciada."})

    def _json(self, payload: dict, code: int = 200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


def main():
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.is_file():
        write_users([])

    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://127.0.0.1:{PORT}/index.html"
    print(f"IZC local en {url}")
    print(f"Usuarios: {USERS_FILE}")
    print("Ctrl+C para detener.")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")


if __name__ == "__main__":
    main()
