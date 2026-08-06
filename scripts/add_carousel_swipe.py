# Add touch/pointer swipe to featured brands column carousel on brand pages.
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD = """  if (track && prevBtn && nextBtn) {
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

NEW = """  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const columns = track.querySelectorAll('.brand-column');
    const maxSlide = Math.max(0, columns.length - 2);
    const wrapper = track.parentElement || track;
    let isDragging = false;
    let hasDragged = false;
    let startX = 0;
    let baseX = 0;
    let currentX = 0;
    let pointerId = null;

    function stepWidth() {
      var col = columns[0];
      return col ? col.getBoundingClientRect().width : 0;
    }

    function updateCarousel() {
      var step = stepWidth();
      baseX = -(currentSlide * step);
      currentX = baseX;
      track.style.transition = 'transform 0.4s ease-in-out';
      track.style.transform = 'translateX(' + baseX + 'px)';
    }

    function goNext() {
      currentSlide = currentSlide < maxSlide ? currentSlide + 1 : 0;
      updateCarousel();
    }

    function goPrev() {
      currentSlide = currentSlide > 0 ? currentSlide - 1 : maxSlide;
      updateCarousel();
    }

    nextBtn.addEventListener('click', goNext);
    prevBtn.addEventListener('click', goPrev);
    window.addEventListener('resize', updateCarousel);

    track.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (hasDragged) {
          e.preventDefault();
          e.stopPropagation();
        }
        hasDragged = false;
      });
    });

    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      hasDragged = false;
      startX = e.clientX;
      baseX = -(currentSlide * stepWidth());
      currentX = baseX;
      pointerId = e.pointerId;
      track.style.transition = 'none';
      try { wrapper.setPointerCapture(e.pointerId); } catch (_) {}
    }

    function onPointerMove(e) {
      if (!isDragging || (pointerId != null && e.pointerId !== pointerId)) return;
      var diff = e.clientX - startX;
      if (Math.abs(diff) > 12) hasDragged = true;
      currentX = baseX + diff;
      track.style.transform = 'translateX(' + currentX + 'px)';
    }

    function onPointerUp(e) {
      if (!isDragging || (pointerId != null && e.pointerId !== pointerId)) return;
      isDragging = false;
      pointerId = null;
      var movedBy = currentX - baseX;
      if (movedBy < -40) {
        goNext();
      } else if (movedBy > 40) {
        goPrev();
      } else {
        updateCarousel();
      }
    }

    wrapper.style.touchAction = 'pan-y';
    wrapper.style.cursor = 'grab';
    wrapper.addEventListener('pointerdown', onPointerDown);
    wrapper.addEventListener('pointermove', onPointerMove);
    wrapper.addEventListener('pointerup', onPointerUp);
    wrapper.addEventListener('pointercancel', onPointerUp);
    wrapper.addEventListener('pointerleave', function (e) {
      if (isDragging) onPointerUp(e);
    });
  }"""

FILES = [
    "datalogic.js",
    "honeywell.js",
    "hid.js",
    "imou.js",
    "ruijie.js",
    "topaz.js",
    "zebra.js",
    "elo.js",
    "zkteco.js",
]


def main() -> None:
    for name in FILES:
        path = ROOT / "assets" / "js" / name
        text = path.read_text(encoding="utf-8")
        if OLD not in text:
            print(f"{name}: pattern not found")
            continue
        path.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")
        print(f"{name}: swipe added")

    # bump html js versions
    import re

    for name in [
        "datalogic",
        "honeywell",
        "hid",
        "imou",
        "ruijie",
        "topaz",
        "zebra",
        "elo",
        "zkteco",
    ]:
        html = ROOT / f"{name}.html"
        t = html.read_text(encoding="utf-8")
        t2, n = re.subn(
            rf"(assets/js/{re.escape(name)}\.js\?v=)(\d+)",
            lambda m: f"{m.group(1)}{int(m.group(2)) + 1}",
            t,
            count=1,
        )
        if n:
            html.write_text(t2, encoding="utf-8")
            print(f"{name}.html: version bumped")


if __name__ == "__main__":
    main()
