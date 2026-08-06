# Audit brand pages HTML/JS/CSS for featured carousel health.
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
    "sat",
]


def strip_js(js: str) -> str:
    js = re.sub(r"//.*?$", "", js, flags=re.M)
    js = re.sub(r"/\*.*?\*/", "", js, flags=re.S)
    js = re.sub(r"`(?:\\.|[^\\`])*`", '""', js)
    js = re.sub(r'"(?:\\.|[^\\"])*"', '""', js)
    js = re.sub(r"'(?:\\.|[^\\'])*'", "''", js)
    return js


def brace_balance(js: str):
    s = strip_js(js)
    bal = 0
    neg = None
    line = 1
    for ch in s:
        if ch == "\n":
            line += 1
        elif ch == "{":
            bal += 1
        elif ch == "}":
            bal -= 1
            if bal < 0 and neg is None:
                neg = line
    return bal, neg


def main() -> None:
    print("=== HTML featured brands ===")
    for name in BRANDS:
        path = ROOT / f"{name}.html"
        if not path.exists():
            print(f"{name}: MISSING HTML")
            continue
        text = path.read_text(encoding="utf-8")
        issues = []
        if "brandsTrack" not in text:
            issues.append("no brandsTrack")
        if "brand-slide" in text:
            issues.append("leftover brand-slide")
        cols = text.count("class=\"brand-column\"")
        if "brandsTrack" in text and cols != 3:
            issues.append(f"brand-column count={cols}")
        if "brandsTrack" in text:
            if 'id="prevBrand"' not in text or 'id="nextBrand"' not in text:
                issues.append("missing arrow ids")
        m = re.search(r'<div class="featured-brands-box">(.*?)</aside>', text, re.S)
        if m:
            chunk = m.group(0)
            opens = len(re.findall(r"<div\b", chunk))
            closes = chunk.count("</div>")
            if opens != closes:
                issues.append(f"div imbalance featured {opens}/{closes}")
        # duplicate ids
        if text.count('id="brandsTrack"') > 1:
            issues.append("duplicate brandsTrack")
        if text.count('id="prevBrand"') > 1:
            issues.append("duplicate prevBrand")
        print(f"{name}: {'OK' if not issues else '; '.join(issues)}")

    print("\n=== JS ===")
    for name in BRANDS:
        path = ROOT / "assets" / "js" / f"{name}.js"
        if not path.exists():
            print(f"{name}: MISSING JS")
            continue
        text = path.read_text(encoding="utf-8")
        bal, neg = brace_balance(text)
        issues = []
        if bal != 0:
            issues.append(f"brace_bal={bal}")
        if neg is not None:
            issues.append(f"neg_at={neg}")
        if "Wishlist: manejado por wishlist.js\n});" in text:
            issues.append("early_close")
        if ".brand-slide" in text:
            issues.append("old_slide_logic")
        if "brand-column" not in text:
            issues.append("no_column_logic")
        if "getBoundingClientRect" not in text:
            issues.append("no_px_step")
        # top-level orphan after DOMContentLoaded
        opens = text.count("document.addEventListener('DOMContentLoaded'")
        if opens != 1:
            issues.append(f"DOMContentLoaded={opens}")
        print(f"{name}: {'OK' if not issues else '; '.join(issues)}")

    print("\n=== CSS brand-column presence ===")
    for name in BRANDS + ["index"]:
        path = ROOT / "assets" / "css" / f"{name}.css"
        if not path.exists():
            print(f"{name}: MISSING")
            continue
        text = path.read_text(encoding="utf-8")
        issues = []
        if ".brand-column" not in text:
            issues.append("no brand-column")
        # check height in index
        if name == "index":
            if "height: 110px" not in text:
                issues.append("desktop height not 110px")
        print(f"{name}: {'OK' if not issues else '; '.join(issues)}")


if __name__ == "__main__":
    main()
