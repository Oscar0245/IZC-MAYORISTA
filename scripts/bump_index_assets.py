"""Sube la versión ?v= de index.css/js en los HTML."""
from pathlib import Path

ROOT = Path(r"C:\IZC")
for html in ROOT.glob("*.html"):
    text = html.read_text(encoding="utf-8")
    new = text.replace("assets/css/index.css?v=16", "assets/css/index.css?v=17")
    new = new.replace("assets/js/index.js?v=2", "assets/js/index.js?v=3")
    if new != text:
        html.write_text(new, encoding="utf-8")
        print("bumped", html.name)
print("done")
