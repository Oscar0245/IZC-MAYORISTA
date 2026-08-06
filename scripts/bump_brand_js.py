from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
NAMES = [
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

for name in NAMES:
    path = ROOT / f"{name}.html"
    text = path.read_text(encoding="utf-8")
    pat = rf"(assets/js/{re.escape(name)}\.js\?v=)(\d+)"
    text2, n = re.subn(pat, lambda m: f"{m.group(1)}{int(m.group(2)) + 1}", text, count=1)
    if n:
        path.write_text(text2, encoding="utf-8")
        print(name, "bumped")
    else:
        print(name, "miss")
