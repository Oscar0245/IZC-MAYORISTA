# Deeper cleanup audit for brand carousel leftovers and inconsistencies.
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BRANDS = [
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


def main() -> None:
    print("=== Dead CSS selectors still referenced? ===")
    for name in BRANDS + ["sat", "index"]:
        css = ROOT / "assets" / "css" / f"{name}.css"
        if not css.exists():
            continue
        text = css.read_text(encoding="utf-8")
        flags = []
        if "featured-grid--stack" in text:
            flags.append("stack-rule")
        if "brand-item--empty" in text:
            flags.append("empty-rule")
        if "brand-slide" in text:
            flags.append("slide-rule")
        # duplicate brand-column definitions
        count = text.count(".brand-column {")
        if count > 1:
            flags.append(f"dup-brand-column={count}")
        print(f"{name}.css: {', '.join(flags) if flags else 'clean-ish'}")

    print("\n=== HTML still using dead classes? ===")
    for name in BRANDS:
        html = (ROOT / f"{name}.html").read_text(encoding="utf-8")
        flags = []
        for cls in ("featured-grid--stack", "brand-item--empty", "brand-slide", "featured-grid"):
            if cls in html:
                flags.append(cls)
        print(f"{name}.html: {', '.join(flags) if flags else 'no dead classes'}")

    print("\n=== Asset version consistency (sample) ===")
    for name in BRANDS:
        html = (ROOT / f"{name}.html").read_text(encoding="utf-8")
        css_v = re.findall(r"assets/css/(?:index|%s)\.css\?v=(\d+)" % name, html)
        # elo uses datalogic.css
        css_all = re.findall(r"assets/css/([\w-]+)\.css\?v=(\d+)", html)
        js_all = re.findall(r"assets/js/([\w-]+)\.js\?v=(\d+)", html)
        print(f"{name}: css={css_all} js={[j for j in js_all if j[0]==name or j[0] in ('brand_catalog','index')]}")

    print("\n=== Resize listener on carousel? ===")
    for name in BRANDS:
        js = (ROOT / "assets" / "js" / f"{name}.js").read_text(encoding="utf-8")
        print(f"{name}: {'yes' if 'resize' in js and 'updateCarousel' in js else 'no'}")

    # Check sat sidebar for featured section opportunity
    sat = ROOT / "sat.html"
    if sat.exists():
        t = sat.read_text(encoding="utf-8")
        print("\n=== sat.html sidebar ===")
        print("has aside:", "<aside" in t)
        print("has filter-box:", "filter-box" in t)


if __name__ == "__main__":
    main()
