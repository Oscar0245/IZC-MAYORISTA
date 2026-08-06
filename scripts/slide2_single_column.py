# Second featured-brands slide: single column Topaz > Zebra > ZKTeco.
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

OLD = """            <div class="brand-slide">
              <div class="featured-grid">
                <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
                <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>
                <span class="brand-item brand-item--empty" aria-hidden="true"></span>
                <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>
              </div>
            </div>"""

NEW = """            <div class="brand-slide">
              <div class="featured-grid featured-grid--stack">
                <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
                <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>
                <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>
              </div>
            </div>"""

# Also handle if empty span version wasn't applied everywhere
OLD_ALT = """            <div class="brand-slide">
              <div class="featured-grid">
                <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
                <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>
                <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>
              </div>
            </div>"""

CSS_RULE = """
.featured-grid--stack {
  grid-template-columns: 1fr;
  max-width: 160px;
  margin: 0 auto;
  gap: 14px;
  padding: 18px 15px;
}
"""

HTML_NAMES = [
    "datalogic",
    "honeywell",
    "hid",
    "imou",
    "ruijie",
    "topaz",
    "zebra",
    "elo",
    "zkteco",
]

CSS_NAMES = [
    "datalogic",
    "honeywell",
    "hid",
    "imou",
    "ruijie",
    "topaz",
    "zebra",
    "elo",
    "zkteco",
    "sat",
]


def main() -> None:
    for name in HTML_NAMES:
        path = ROOT / f"{name}.html"
        text = path.read_text(encoding="utf-8")
        if OLD in text:
            text = text.replace(OLD, NEW, 1)
            print(f"{name}: updated (with empty)")
        elif OLD_ALT in text:
            text = text.replace(OLD_ALT, NEW, 1)
            print(f"{name}: updated (alt)")
        else:
            # try regex for any second slide after first
            pattern = re.compile(
                r'(<div class="brand-slide">\s*<div class="featured-grid">\s*'
                r'<a href="topaz\.html".*?</div>\s*</div>)',
                re.S,
            )
            matches = list(pattern.finditer(text))
            if not matches:
                print(f"{name}: pattern not found")
                continue
            m = matches[-1]
            text = text[: m.start()] + NEW.strip() + text[m.end() :]
            print(f"{name}: updated (regex)")
        path.write_text(text, encoding="utf-8")

    for name in CSS_NAMES:
        path = ROOT / "assets" / "css" / f"{name}.css"
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        if "featured-grid--stack" in text:
            print(f"{name}: css already has stack")
            continue
        marker = ".featured-grid {"
        idx = text.find(marker)
        if idx == -1:
            path.write_text(text.rstrip() + "\n" + CSS_RULE, encoding="utf-8")
            print(f"{name}: css appended")
            continue
        end = text.find("}", idx)
        path.write_text(text[: end + 1] + "\n" + CSS_RULE + text[end + 1 :], encoding="utf-8")
        print(f"{name}: css stack added")


if __name__ == "__main__":
    main()
