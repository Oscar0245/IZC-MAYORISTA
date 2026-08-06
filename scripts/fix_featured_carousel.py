# Fix featured brands carousel: JS early close, slide 2 brands, CSS flex.
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

JS_NAMES = [
    "datalogic",
    "honeywell",
    "hid",
    "imou",
    "ruijie",
    "topaz",
    "zebra",
    "sat",
    "zkteco",
]

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

OLD_JS = """  // Wishlist: manejado por wishlist.js
});
"""
NEW_JS = """  // Wishlist: manejado por wishlist.js
"""

SLIDE2_OLD = """            <div class="brand-slide">
              <div class="featured-grid">
                <a href="honeywell.html" class="brand-item"><img src="assets/imgmarcas/Honeywell.png" alt="Honeywell"></a>
                <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
                <a href="imou.html" class="brand-item"><img src="assets/imgmarcas/IMOU.png" alt="IMOU"></a>
                <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>
                <a href="ruijie.html" class="brand-item"><img src="assets/imgmarcas/Ruijie.png" alt="Ruijie"></a>
                <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>
              </div>
            </div>"""

SLIDE2_NEW = """            <div class="brand-slide">
              <div class="featured-grid">
                <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
                <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>
                <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>
              </div>
            </div>"""

OLD_CSS = """.brand-slide {
  min-width: 100%;
  box-sizing: border-box;
}"""

NEW_CSS = """.brand-slide {
  min-width: 100%;
  flex: 0 0 100%;
  box-sizing: border-box;
}"""


def main() -> None:
    for name in JS_NAMES:
        path = ROOT / "assets" / "js" / f"{name}.js"
        text = path.read_text(encoding="utf-8")
        if OLD_JS not in text:
            print(f"{name}: JS pattern not found")
            continue
        path.write_text(text.replace(OLD_JS, NEW_JS, 1), encoding="utf-8")
        print(f"{name}: JS fixed")

    for name in HTML_NAMES:
        path = ROOT / f"{name}.html"
        text = path.read_text(encoding="utf-8")
        if SLIDE2_OLD not in text:
            print(f"{name}: HTML slide2 pattern not found")
        else:
            text = text.replace(SLIDE2_OLD, SLIDE2_NEW, 1)
            print(f"{name}: HTML slide2 fixed")

        text2, n = re.subn(
            rf'(assets/js/{re.escape(name)}\.js\?v=)(\d+)',
            lambda m: f"{m.group(1)}{int(m.group(2)) + 1}",
            text,
            count=1,
        )
        if n:
            text = text2
            print(f"{name}: JS version bumped")

        css2, n_css = re.subn(
            rf'(assets/css/{re.escape(name)}\.css\?v=)(\d+)',
            lambda m: f"{m.group(1)}{int(m.group(2)) + 1}",
            text,
            count=1,
        )
        if n_css:
            text = css2
            print(f"{name}: CSS version bumped")

        path.write_text(text, encoding="utf-8")

    for name in CSS_NAMES:
        path = ROOT / "assets" / "css" / f"{name}.css"
        if not path.exists():
            print(f"{name}: CSS missing")
            continue
        text = path.read_text(encoding="utf-8")
        if OLD_CSS not in text:
            print(f"{name}: CSS pattern not found")
            continue
        path.write_text(text.replace(OLD_CSS, NEW_CSS, 1), encoding="utf-8")
        print(f"{name}: CSS fixed")


if __name__ == "__main__":
    main()
