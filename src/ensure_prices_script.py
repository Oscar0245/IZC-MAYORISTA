"""Asegura que el script de precios esté en las páginas."""
#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRICES = '  <script src="assets/js/prices.js?v=3" defer></script>\n'
LOADER_MARKERS = [
    '  <script src="assets/js/data-loader.js?v=1" defer></script>\n',
    '  <script src="assets/js/data-loader.js?v=2" defer></script>\n',
]


def patch(html: Path) -> str:
    text = html.read_text(encoding="utf-8")
    text = text.replace("assets/js/data-loader.js?v=1", "assets/js/data-loader.js?v=2")
    text = text.replace("assets/js/prices.js?v=2", "assets/js/prices.js?v=3")
    if "assets/js/prices.js" not in text:
        inserted = False
        for marker in LOADER_MARKERS:
            # after bump, marker may be v=2
            pass
        for needle in (
            '  <script src="assets/js/data-loader.js?v=2" defer></script>\n',
            '  <script src="assets/js/data-loader.js?v=1" defer></script>\n',
        ):
            if needle in text:
                text = text.replace(needle, needle + PRICES, 1)
                inserted = True
                break
        if not inserted:
            return f"fail-no-loader {html.name}"
    html.write_text(text, encoding="utf-8")
    return f"ok {html.relative_to(ROOT)}"


def main() -> None:
    pages = list(ROOT.glob("*.html"))
    public = ROOT / "public"
    if public.exists():
        pages.extend(public.glob("*.html"))
    for page in pages:
        print(patch(page))


if __name__ == "__main__":
    main()
