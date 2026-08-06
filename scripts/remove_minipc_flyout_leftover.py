import re
from pathlib import Path

ROOT = Path(r"C:\xampp1\htdocs\IZC")

FLYOUT_RE = re.compile(
    r'\s*<div class="flyout-group">\s*'
    r'<a href="[^"]*" class="flyout-group-title"><span class="icon">[^<]*</span>'
    r"(?:Mini PC|Cajones monederos)</a>\s*"
    r"</div>",
    re.IGNORECASE,
)

changed = []
for html in list((ROOT / "public").glob("*.html")) + list(ROOT.glob("*.html")):
    text = html.read_text(encoding="utf-8")
    new = FLYOUT_RE.sub("\n", text)
    if new != text:
        html.write_text(new, encoding="utf-8")
        changed.append(html.name)

print("fixed", len(changed), changed)

left = []
for html in list((ROOT / "public").glob("*.html")) + list(ROOT.glob("*.html")):
    text = html.read_text(encoding="utf-8")
    if re.search(r"Mini PC|cajones|mini-pc", text, re.I):
        left.append(html.name)
print("left html", left)

for rel in [
    "assets/js/buscar.js",
    "public/assets/js/buscar.js",
    "assets/js/brand_catalog.js",
    "public/assets/js/brand_catalog.js",
    "assets/files/categoria_skus.json",
    "assets/files/catalogo.json",
    "public/assets/files/categoria_skus.json",
    "public/assets/files/catalogo.json",
]:
    path = ROOT / rel
    if path.exists() and re.search(r"mini-pc|cajones|Mini PC", path.read_text(encoding="utf-8"), re.I):
        print("STILL", rel)
print("done")
