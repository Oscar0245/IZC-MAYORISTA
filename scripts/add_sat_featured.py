# Add SAT to featured brands carousel (third column / page 2).
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD = """            <div class="brand-column">
              <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
              <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>
              <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>
            </div>"""

NEW = """            <div class="brand-column">
              <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
              <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>
              <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>
              <a href="sat.html" class="brand-item"><img src="assets/imgmarcas/SAT.png" alt="SAT"></a>
            </div>"""

PAGES = [
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
    for name in PAGES:
        path = ROOT / f"{name}.html"
        text = path.read_text(encoding="utf-8")
        if OLD not in text:
            print(f"{name}: pattern not found")
            continue
        path.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")
        print(f"{name}: SAT added")


if __name__ == "__main__":
    main()
