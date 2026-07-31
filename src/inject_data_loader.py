"""Inserta data-loader.js en las páginas HTML del sitio."""
#!/usr/bin/env python3
"""Inyecta data-loader.js en las páginas HTML antes de los scripts de datos."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INJECT = '  <script src="assets/js/data-loader.js?v=1" defer></script>\n'
MARKERS = [
    '  <script src="assets/js/search.js',
    '  <script src="assets/js/wishlist.js',
    '  <script src="assets/js/prices.js',
    '  <script src="assets/js/brand_catalog.js',
    '  <script src="assets/js/buscar.js',
    '  <script src="assets/js/producto.js',
    '  <script src="assets/js/favoritos.js',
    '  <script src="assets/js/index.js',
    '  <script src="assets/js/marcas.js',
]


def inject_file(html: Path) -> str:
    text = html.read_text(encoding="utf-8")
    if "data-loader.js" in text:
        return "skip"
    for marker in MARKERS:
        if marker in text:
            html.write_text(text.replace(marker, INJECT + marker, 1), encoding="utf-8")
            return "injected"
    if re.search(r"</head>", text, flags=re.I):
        html.write_text(re.sub(r"(</head>)", INJECT + r"\1", text, count=1, flags=re.I), encoding="utf-8")
        return "injected-head"
    return "fail"


def main() -> None:
    pages = list(ROOT.glob("*.html"))
    public = ROOT / "public"
    if public.exists():
        pages.extend(public.glob("*.html"))
    for html in pages:
        status = inject_file(html)
        print(status, html.relative_to(ROOT))


if __name__ == "__main__":
    main()
