# Rough brace balance check for brand page JS files.
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def strip_noise(js: str) -> str:
    js = re.sub(r"//.*?$", "", js, flags=re.M)
    js = re.sub(r"/\*.*?\*/", "", js, flags=re.S)
    js = re.sub(r"`(?:\\.|[^\\`])*`", '""', js)
    js = re.sub(r'"(?:\\.|[^\\"])*"', '""', js)
    js = re.sub(r"'(?:\\.|[^\\'])*'", "''", js)
    return js


def main() -> None:
    for path in sorted((ROOT / "assets" / "js").glob("*.js")):
        if path.name not in {
            "datalogic.js",
            "honeywell.js",
            "hid.js",
            "imou.js",
            "ruijie.js",
            "topaz.js",
            "zebra.js",
            "sat.js",
            "zkteco.js",
            "elo.js",
        }:
            continue
        text = path.read_text(encoding="utf-8")
        cleaned = strip_noise(text)
        bal = 0
        neg_line = None
        line = 1
        for ch in cleaned:
            if ch == "\n":
                line += 1
            elif ch == "{":
                bal += 1
            elif ch == "}":
                bal -= 1
                if bal < 0 and neg_line is None:
                    neg_line = line
        print(f"{path.name}: balance={bal} neg_at={neg_line}")


if __name__ == "__main__":
    main()
