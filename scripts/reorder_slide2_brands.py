# Put ZKTeco under Zebra on featured brands page 2.
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD = """                <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
                <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>
                <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>"""

NEW = """                <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
                <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>
                <span class="brand-item brand-item--empty" aria-hidden="true"></span>
                <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>"""

CSS_RULE = """
.brand-item--empty {
  border: none;
  pointer-events: none;
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
        if OLD not in text:
            print(f"{name}: pattern not found")
            continue
        path.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")
        print(f"{name}: reordered")

    for name in CSS_NAMES:
        path = ROOT / "assets" / "css" / f"{name}.css"
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        if "brand-item--empty" in text:
            print(f"{name}: css already has empty rule")
            continue
        # Insert after .brand-item img block if possible, else append
        marker = ".brand-item img {"
        idx = text.find(marker)
        if idx == -1:
            path.write_text(text.rstrip() + "\n" + CSS_RULE, encoding="utf-8")
            print(f"{name}: css appended")
            continue
        # find end of that rule
        end = text.find("}", idx)
        if end == -1:
            path.write_text(text.rstrip() + "\n" + CSS_RULE, encoding="utf-8")
            print(f"{name}: css appended")
            continue
        insert_at = end + 1
        path.write_text(text[:insert_at] + "\n" + CSS_RULE + text[insert_at:], encoding="utf-8")
        print(f"{name}: css updated")


if __name__ == "__main__":
    main()
