# Fix featured brands carousel: taps navigate; only real swipes drag.
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

OLD = """    track.querySelectorAll('a').forEach(function (link) {
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

NEW = """    var DRAG_THRESHOLD = 40;

    track.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (hasDragged) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    });

    function onPointerDown(e) {
      if (e.target.closest && e.target.closest('.arrow-btn')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      hasDragged = false;
      startX = e.clientX;
      baseX = -(currentSlide * stepWidth());
      currentX = baseX;
      pointerId = e.pointerId;
    }

    function onPointerMove(e) {
      if (!isDragging || (pointerId != null && e.pointerId !== pointerId)) return;
      var diff = e.clientX - startX;

      if (!hasDragged && Math.abs(diff) > DRAG_THRESHOLD) {
        hasDragged = true;
        track.style.transition = 'none';
        try { wrapper.setPointerCapture(e.pointerId); } catch (_) {}
      }

      if (!hasDragged) return;
      currentX = baseX + diff;
      track.style.transform = 'translateX(' + currentX + 'px)';
    }

    function onPointerUp(e) {
      if (!isDragging || (pointerId != null && e.pointerId !== pointerId)) return;
      isDragging = false;
      pointerId = null;
      var movedBy = currentX - baseX;

      if (hasDragged) {
        if (movedBy < -DRAG_THRESHOLD) {
          goNext();
        } else if (movedBy > DRAG_THRESHOLD) {
          goPrev();
        } else {
          updateCarousel();
        }
        setTimeout(function () { hasDragged = false; }, 0);
        return;
      }

      updateCarousel();
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var link = el && el.closest ? el.closest('a') : null;
      if (link && track.contains(link) && link.href) {
        window.location.href = link.href;
      }
    }

    wrapper.style.touchAction = 'pan-y';
    wrapper.style.cursor = 'grab';
    wrapper.addEventListener('pointerdown', onPointerDown);
    wrapper.addEventListener('pointermove', onPointerMove);
    wrapper.addEventListener('pointerup', onPointerUp);
    wrapper.addEventListener('pointercancel', onPointerUp);
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
        print(f"{name}: fixed")

    brands = [n.replace(".js", "") for n in FILES]
    for name in brands:
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
            print(f"{name}.html: bumped")


if __name__ == "__main__":
    main()
