# Featured brands: 3 columns, slide by one column (left exits, middle->left, new on right).
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

NEW_TRACK = """        <div class="brands-carousel-wrapper">
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
        </div>"""

TRACK_RE = re.compile(
    r'<div class="brands-carousel-wrapper">\s*'
    r'<div class="brands-carousel-track" id="brandsTrack">.*?</div>\s*</div>',
    re.S,
)

OLD_JS = """  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.brand-slide');
    const totalSlides = slides.length;

    function updateCarousel() {
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    nextBtn.addEventListener('click', function () {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
      } else {
        currentSlide = 0; // Regresa al inicio
      }
      updateCarousel();
    });

    prevBtn.addEventListener('click', function () {
      if (currentSlide > 0) {
        currentSlide--;
      } else {
        currentSlide = totalSlides - 1; // Va al final
      }
      updateCarousel();
    });
  }"""

OLD_JS_ALT = """  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.brand-slide');
    const totalSlides = slides.length;

    function updateCarousel() {
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    nextBtn.addEventListener('click', function () {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
      } else {
        currentSlide = 0;
      }
      updateCarousel();
    });

    prevBtn.addEventListener('click', function () {
      if (currentSlide > 0) {
        currentSlide--;
      } else {
        currentSlide = totalSlides - 1;
      }
      updateCarousel();
    });
  }"""

OLD_JS_IMOU = """  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.brand-slide');
    const totalSlides = slides.length;

    function updateCarousel() {
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    nextBtn.addEventListener('click', function () {
      currentSlide = currentSlide < totalSlides - 1 ? currentSlide + 1 : 0;
      updateCarousel();
    });

    prevBtn.addEventListener('click', function () {
      currentSlide = currentSlide > 0 ? currentSlide - 1 : totalSlides - 1;
      updateCarousel();
    });
  }"""

NEW_JS = """  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const columns = track.querySelectorAll('.brand-column');
    const maxSlide = Math.max(0, columns.length - 2);

    function updateCarousel() {
      track.style.transform = 'translateX(-' + (currentSlide * 50) + '%)';
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

CSS_COLUMN = """
.brand-column {
  flex: 0 0 50%;
  width: 50%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px 8px;
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
    "sat",
]

JS_NAMES = [
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
    "index",
]


def main() -> None:
    for name in HTML_NAMES:
        path = ROOT / f"{name}.html"
        if not path.exists():
            print(f"{name}: html missing")
            continue
        text = path.read_text(encoding="utf-8")
        if not TRACK_RE.search(text):
            print(f"{name}: track not found")
            continue
        text = TRACK_RE.sub(NEW_TRACK, text, count=1)
        text, n = re.subn(
            rf"(assets/js/{re.escape(name)}\.js\?v=)(\d+)",
            lambda m: f"{m.group(1)}{int(m.group(2)) + 1}",
            text,
            count=1,
        )
        text, n2 = re.subn(
            r"(assets/css/(?:datalogic|honeywell|hid|imou|ruijie|topaz|zebra|elo|zkteco|sat|index)\.css\?v=)(\d+)",
            lambda m: f"{m.group(1)}{int(m.group(2)) + 1}",
            text,
            count=2,
        )
        path.write_text(text, encoding="utf-8")
        print(f"{name}: html updated (js bump={n}, css bump={n2})")

    for name in JS_NAMES:
        path = ROOT / "assets" / "js" / f"{name}.js"
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        replaced = False
        for old in (OLD_JS, OLD_JS_ALT, OLD_JS_IMOU):
            if old in text:
                text = text.replace(old, NEW_JS, 1)
                replaced = True
                break
        if not replaced:
            # generic replace of brand-slide carousel block
            pat = re.compile(
                r"if \(track && prevBtn && nextBtn\) \{.*?^\s{2}\}",
                re.S | re.M,
            )
            if pat.search(text):
                text = pat.sub(NEW_JS.strip(), text, count=1)
                replaced = True
        if replaced:
            path.write_text(text, encoding="utf-8")
            print(f"{name}: js updated")
        else:
            print(f"{name}: js pattern not found")

    for name in CSS_NAMES:
        path = ROOT / "assets" / "css" / f"{name}.css"
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        if ".brand-column {" in text:
            print(f"{name}: css already has brand-column")
        else:
            marker = ".brands-carousel-track {"
            idx = text.find(marker)
            if idx != -1:
                end = text.find("}", idx)
                text = text[: end + 1] + "\n" + CSS_COLUMN + text[end + 1 :]
            else:
                text = text.rstrip() + "\n" + CSS_COLUMN

        # Ensure track width allows column sliding
        text = text.replace(
            """.brands-carousel-track {
  display: flex;
  transition: transform 0.4s ease-in-out;
  width: 100%;
}""",
            """.brands-carousel-track {
  display: flex;
  transition: transform 0.4s ease-in-out;
  width: 100%;
  will-change: transform;
}""",
        )
        path.write_text(text, encoding="utf-8")
        print(f"{name}: css ready")


if __name__ == "__main__":
    main()
