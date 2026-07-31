# Remove leftover brand-slide markup after column carousel migration.
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

ORPHAN = re.compile(
    r'(</div>\s*</div>)\s*'
    r'<div class="brand-slide">\s*'
    r'<div class="featured-grid featured-grid--stack">.*?</div>\s*</div>\s*'
    r'</div>\s*</div>',
    re.S,
)

# After cleanup, featured-brands-box should close properly.
# Pattern: new track ends with </div></div> then orphan then extra closings.
# Replace orphan+extra with just the two closings already in NEW_TRACK... 
# Actually NEW_TRACK already ends with wrapper close. Orphan adds slide + track close + wrapper close.
# So after NEW_TRACK we have: orphan slide, </div></div> (old track+wrapper)
# We should delete from orphan brand-slide through those two closing divs.

ORPHAN2 = re.compile(
    r'\s*<div class="brand-slide">\s*'
    r'<div class="featured-grid(?: featured-grid--stack)?">.*?</div>\s*</div>\s*'
    r'</div>\s*</div>',
    re.S,
)

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
    for name in HTML_NAMES:
        path = ROOT / f"{name}.html"
        text = path.read_text(encoding="utf-8")
        new_text, n = ORPHAN2.subn("", text, count=1)
        if n:
            # fix indentation of wrapper block a bit
            new_text = new_text.replace(
                "                <div class=\"brands-carousel-wrapper\">",
                "        <div class=\"brands-carousel-wrapper\">",
            )
            path.write_text(new_text, encoding="utf-8")
            print(f"{name}: cleaned orphan ({n})")
        else:
            # show context if brandsTrack still has brand-slide nearby
            if "brand-slide" in text:
                print(f"{name}: still has brand-slide, pattern miss")
            else:
                print(f"{name}: clean")


if __name__ == "__main__":
    main()
