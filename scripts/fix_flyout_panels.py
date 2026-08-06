# Restore missing Nuestros Productos flyout panels on incomplete brand pages.
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PANEL_IDS = ["pos", "marcacion", "seguridad", "conectividad", "movilidad"]


def extract_div_block(html: str, start: int) -> str:
    """Extract a balanced <div>...</div> starting at start."""
    assert html.startswith("<div", start)
    i = start
    depth = 0
    n = len(html)
    while i < n:
        if html.startswith("<div", i) and (i + 4 >= n or html[i + 4] in " \t\n>"):
            depth += 1
            i = html.find(">", i) + 1
            continue
        if html.startswith("</div>", i):
            depth -= 1
            i += len("</div>")
            if depth == 0:
                return html[start:i]
            continue
        i += 1
    raise RuntimeError("Unbalanced div")


def extract_panels(html: str) -> dict[str, str]:
    panels = {}
    for panel_id in PANEL_IDS:
        marker = f'data-panel="{panel_id}"'
        # find flyout-panel-content with this id
        idx = 0
        while True:
            pos = html.find(marker, idx)
            if pos == -1:
                break
            # walk back to opening div
            div_start = html.rfind("<div", 0, pos)
            snippet = html[div_start : div_start + 80]
            if "flyout-panel-content" in snippet:
                block = extract_div_block(html, div_start)
                block = re.sub(
                    r'class="flyout-panel-content(?: active)?"',
                    'class="flyout-panel-content"',
                    block,
                    count=1,
                )
                panels[panel_id] = block
                break
            idx = pos + 1
    return panels


def build_inner(panels: dict[str, str], active: str) -> str:
    lines = []
    for pid in PANEL_IDS:
        block = panels[pid]
        if pid == active:
            block = block.replace(
                'class="flyout-panel-content"',
                'class="flyout-panel-content active"',
                1,
            )
        # indent each line with 14 spaces to match page formatting
        indented = "\n".join(
            ("              " + line if line.strip() else line)
            for line in block.splitlines()
        )
        lines.append(indented)
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def replace_flyout_panel(html: str, inner: str) -> str:
    start = html.find('<div class="flyout-panel">')
    if start == -1:
        raise RuntimeError("flyout-panel not found")
    # The flyout-panel div contains all panel-content children; extract and replace inner HTML
    block = extract_div_block(html, start)
    new_block = '<div class="flyout-panel">\n' + inner + "            </div>"
    return html.replace(block, new_block, 1)


def count_panels(html: str) -> int:
    return len(re.findall(r'class="flyout-panel-content', html))


def main() -> None:
    source = (ROOT / "datalogic.html").read_text(encoding="utf-8")
    panels = extract_panels(source)
    print("extracted:", {k: len(v) for k, v in panels.items()})
    if set(panels) != set(PANEL_IDS):
        raise SystemExit(f"Missing panels: {set(PANEL_IDS) - set(panels)}")

    for name, active in (("elo", "pos"), ("hid", "seguridad")):
        path = ROOT / f"{name}.html"
        html = path.read_text(encoding="utf-8")
        before = count_panels(html)
        html2 = replace_flyout_panel(html, build_inner(panels, active))
        after = count_panels(html2)
        path.write_text(html2, encoding="utf-8")
        print(f"{name}: {before} -> {after} panels, active={active}")

    print("\n=== Audit all pages with flyout ===")
    for path in sorted(ROOT.glob("*.html")):
        html = path.read_text(encoding="utf-8")
        if "flyout-cat" not in html:
            continue
        cats = re.findall(
            r'class="flyout-cat[^"]*"[^>]*data-panel="([^"]+)"', html
        )
        contents = re.findall(
            r'class="flyout-panel-content[^"]*"[^>]*data-panel="([^"]+)"', html
        )
        missing = [c for c in cats if c not in contents]
        ok = not missing and len(set(contents)) >= 5
        print(
            f"{path.name}: {'OK' if ok else 'FAIL'} cats={cats} panels={contents} missing={missing}"
        )


if __name__ == "__main__":
    main()
