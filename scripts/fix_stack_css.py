# Keep featured-grid--stack as 1 column even inside mobile media queries.
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

OLD_STACK = """.featured-grid--stack {
  grid-template-columns: 1fr;
  max-width: 160px;
  margin: 0 auto;
  gap: 14px;
  padding: 18px 15px;
}"""

NEW_STACK = """.featured-grid.featured-grid--stack {
  grid-template-columns: 1fr;
  max-width: 180px;
  width: 100%;
  margin: 0 auto;
  gap: 14px;
  padding: 18px 15px;
}"""

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


def main() -> None:
    for name in CSS_NAMES:
        path = ROOT / "assets" / "css" / f"{name}.css"
        text = path.read_text(encoding="utf-8")
        if OLD_STACK in text:
            text = text.replace(OLD_STACK, NEW_STACK, 1)
        elif ".featured-grid.featured-grid--stack" not in text:
            print(f"{name}: stack rule missing/unexpected")
            continue

        # After every `.featured-grid { ... }` inside media queries, ensure stack override exists
        media_rule = """  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 14px;
  }"""
        media_fix = """  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 14px;
  }

  .featured-grid.featured-grid--stack {
    grid-template-columns: 1fr;
    max-width: 180px;
    margin: 0 auto;
  }"""

        if media_rule in text and ".featured-grid.featured-grid--stack {\n    grid-template-columns: 1fr;" not in text:
            text = text.replace(media_rule, media_fix)
            print(f"{name}: media override added")
        elif "featured-grid.featured-grid--stack" in text:
            print(f"{name}: stack specificity ok")
        else:
            print(f"{name}: media pattern not matched, appending at end")
            text = text.rstrip() + "\n\n.featured-grid.featured-grid--stack {\n  grid-template-columns: 1fr !important;\n  max-width: 180px;\n  margin: 0 auto;\n}\n"

        path.write_text(text, encoding="utf-8")

    for name in HTML_NAMES:
        path = ROOT / f"{name}.html"
        text = path.read_text(encoding="utf-8")
        # bump any brand css query version
        text2, n = re.subn(
            r"(assets/css/(?:datalogic|honeywell|hid|imou|ruijie|topaz|zebra|elo|zkteco|sat)\.css\?v=)(\d+)",
            lambda m: f"{m.group(1)}{int(m.group(2)) + 1}",
            text,
            count=1,
        )
        if n:
            path.write_text(text2, encoding="utf-8")
            print(f"{name}: css cache bumped")
        else:
            print(f"{name}: no css version to bump")


if __name__ == "__main__":
    main()
