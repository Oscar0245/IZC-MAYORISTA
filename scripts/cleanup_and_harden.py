# Cleanup dead carousel CSS, harden JS resize, add SAT featured brands.
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

FEATURED_HTML = """
      <div class="featured-brands-box">
        <div class="featured-header">
          <span>MARCAS DESTACADAS</span>
          <div class="nav-arrows">
            <button type="button" class="arrow-btn" id="prevBrand">❮</button>
            <button type="button" class="arrow-btn" id="nextBrand">❯</button>
          </div>
        </div>

        <div class="brands-carousel-wrapper">
          <div class="brands-carousel-track" id="brandsTrack">
            <div class="brand-column">
              <a href="datalogic.html" class="brand-item"><img src="assets/imgmarcas/Datalogic.png" alt="Datalogic"></a>
              <a href="elo.html" class="brand-item"><img src="assets/imgmarcas/Elo.png" alt="Elo"></a>
              <a href="hid.html" class="brand-item"><img src="assets/imgmarcas/HID.png" alt="HID"></a>
            </div>
            <div class="brand-column">
              <a href="honeywell.html" class="brand-item"><img src="assets/imgmarcas/Honeywell.png" alt="Honeywell"></a>
              <a href="imou.html" class="brand-item"><img src="assets/imgmarcas/IMOU.png" alt="IMOU"></a>
              <a href="ruijie.html" class="brand-item"><img src="assets/imgmarcas/Ruijie.png" alt="Ruijie"></a>
            </div>
            <div class="brand-column">
              <a href="topaz.html" class="brand-item"><img src="assets/imgmarcas/Topaz.png" alt="Topaz Systems"></a>
              <a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>
              <a href="zkteco.html" class="brand-item"><img src="assets/imgmarcas/ZKTeco.png" alt="ZKTeco"></a>
            </div>
          </div>
        </div>
      </div>
"""

OLD_CAROUSEL = """  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const columns = track.querySelectorAll('.brand-column');
    const maxSlide = Math.max(0, columns.length - 2);

    function updateCarousel() {
      var col = columns[0];
      var step = col ? col.getBoundingClientRect().width : 0;
      track.style.transform = 'translateX(-' + (currentSlide * step) + 'px)';
    }

    nextBtn.addEventListener('click', function () {
      currentSlide = currentSlide < maxSlide ? currentSlide + 1 : 0;
      updateCarousel();
    });

    prevBtn.addEventListener('click', function () {
      currentSlide = currentSlide > 0 ? currentSlide - 1 : maxSlide;
      updateCarousel();
    });
  }"""

NEW_CAROUSEL = """  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const columns = track.querySelectorAll('.brand-column');
    const maxSlide = Math.max(0, columns.length - 2);

    function updateCarousel() {
      var col = columns[0];
      var step = col ? col.getBoundingClientRect().width : 0;
      track.style.transform = 'translateX(-' + (currentSlide * step) + 'px)';
    }

    nextBtn.addEventListener('click', function () {
      currentSlide = currentSlide < maxSlide ? currentSlide + 1 : 0;
      updateCarousel();
    });

    prevBtn.addEventListener('click', function () {
      currentSlide = currentSlide > 0 ? currentSlide - 1 : maxSlide;
      updateCarousel();
    });

    window.addEventListener('resize', updateCarousel);
  }"""

DEAD_CSS_PATTERNS = [
    re.compile(
        r"\n\.brand-slide \{\n(?:.*\n)*?\}\n",
        re.M,
    ),
    re.compile(
        r"\n\.featured-grid\.featured-grid--stack \{\n(?:.*\n)*?\}\n",
        re.M,
    ),
    re.compile(
        r"\n\.featured-grid--stack \{\n(?:.*\n)*?\}\n",
        re.M,
    ),
    re.compile(
        r"\n\.brand-item--empty \{\n(?:.*\n)*?\}\n",
        re.M,
    ),
]

MEDIA_STACK = re.compile(
    r"\n\s*\.featured-grid\.featured-grid--stack \{\n(?:.*\n)*?\s*\}\n",
    re.M,
)


def clean_css(text: str) -> str:
    for pat in DEAD_CSS_PATTERNS:
        text = pat.sub("\n", text)
    text = MEDIA_STACK.sub("\n", text)
    # Remove trailing duplicate bare .brand-column block at end of index.css
    # Keep the one under .featured-brands-box
    if text.count(".brand-column {") > 1 and ".featured-brands-box .brand-column" in text:
        text = re.sub(
            r"\n\.brand-column \{\n  flex: 0 0 50%;\n  width: 50%;\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  padding: 15px 8px;\n\}\n?\Z",
            "\n",
            text,
        )
    # collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def bump(text: str, pattern: str) -> str:
    return re.sub(
        pattern,
        lambda m: f"{m.group(1)}{int(m.group(2)) + 1}",
        text,
        count=1,
    )


def main() -> None:
    # 1) CSS cleanup
    for name in BRANDS + ["index"]:
        path = ROOT / "assets" / "css" / f"{name}.css"
        if not path.exists():
            continue
        old = path.read_text(encoding="utf-8")
        new = clean_css(old)
        if new != old:
            path.write_text(new, encoding="utf-8")
            print(f"css cleaned: {name}")
        else:
            print(f"css unchanged: {name}")

    # 2) JS harden resize
    for name in BRANDS:
        path = ROOT / "assets" / "js" / f"{name}.js"
        text = path.read_text(encoding="utf-8")
        if "window.addEventListener('resize', updateCarousel)" in text:
            print(f"js already hardened: {name}")
            continue
        if OLD_CAROUSEL not in text:
            print(f"js carousel pattern miss: {name}")
            continue
        path.write_text(text.replace(OLD_CAROUSEL, NEW_CAROUSEL, 1), encoding="utf-8")
        print(f"js hardened: {name}")

    # 3) Add featured brands to sat.html
    sat = ROOT / "sat.html"
    sat_text = sat.read_text(encoding="utf-8")
    if 'id="brandsTrack"' not in sat_text:
        sat_text = sat_text.replace(
            "      </div>\n\n    </aside>",
            "      </div>\n" + FEATURED_HTML + "\n    </aside>",
            1,
        )
        sat_text = bump(sat_text, r"(assets/js/sat\.js\?v=)(\d+)")
        sat_text = bump(sat_text, r"(assets/css/sat\.css\?v=)(\d+)")
        sat_text = re.sub(
            r"(assets/css/index\.css\?v=)(\d+)",
            r"\g<1>24",
            sat_text,
            count=1,
        )
        sat.write_text(sat_text, encoding="utf-8")
        print("sat.html: featured brands added")
    else:
        print("sat.html: already has carousel")

    # 4) type=button on arrows + bump js/css versions on brand pages
    for name in BRANDS:
        if name == "sat":
            continue
        path = ROOT / f"{name}.html"
        text = path.read_text(encoding="utf-8")
        text2 = text.replace(
            '<button class="arrow-btn" id="prevBrand">',
            '<button type="button" class="arrow-btn" id="prevBrand">',
        ).replace(
            '<button class="arrow-btn" id="nextBrand">',
            '<button type="button" class="arrow-btn" id="nextBrand">',
        )
        text2 = bump(text2, rf"(assets/js/{re.escape(name)}\.js\?v=)(\d+)")
        # bump index.css once
        text2 = bump(text2, r"(assets/css/index\.css\?v=)(\d+)")
        # sync brand_catalog to v=7 if lower
        text2 = re.sub(
            r"assets/js/brand_catalog\.js\?v=\d+",
            "assets/js/brand_catalog.js?v=7",
            text2,
            count=1,
        )
        if text2 != text:
            path.write_text(text2, encoding="utf-8")
            print(f"html polished: {name}")
        else:
            print(f"html unchanged: {name}")


if __name__ == "__main__":
    main()
