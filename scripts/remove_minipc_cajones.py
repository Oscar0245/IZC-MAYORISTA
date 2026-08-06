from pathlib import Path
import json
import re
import subprocess
import sys

ROOT = Path(r"C:\xampp1\htdocs\IZC")
REMOVE_KEYS = {"mini-pc", "cajones", "minipc"}

FLYOUT_RE = re.compile(
    r'\s*<div class="flyout-group">\s*'
    r'<a href="[^"]*(?:mini-pc|cajones|minipc)[^"]*" class="flyout-group-title">'
    r"<span class=\"icon\">[^<]*</span>(?:Mini PC|Cajones monederos)</a>\s*"
    r"</div>",
    re.IGNORECASE,
)
OPTION_RE = re.compile(
    r'\s*<option value="(?:mini-pc|cajones|minipc)">[^<]*</option>\s*',
    re.IGNORECASE,
)
BUTTON_RE = re.compile(
    r'\s*<button[^>]*(?:mini-pc|cajones|minipc)[^>]*>[^<]*(?:Mini PC|Cajones)[^<]*</button>\s*',
    re.IGNORECASE,
)
SUBTYPE_LINE = re.compile(
    r"\s*'(?:mini-pc|cajones|minipc)':\s*\{[^}]*\},?\n"
)
LABEL_LINE = re.compile(
    r"\s*(?:'mini-pc'|cajones|minipc):\s*'[^']*',\n"
)


def is_target_product(p):
    sku_blob = " ".join(
        [
            str(p.get("type", "")),
            str(p.get("category", "")),
            str(p.get("subtype", "")),
            " ".join(p.get("subtypes") or []),
        ]
    ).lower()
    if any(k in sku_blob.split() or k in sku_blob for k in ("mini-pc", "cajones", "minipc")):
        # exact subtype/type match
        if p.get("type") in REMOVE_KEYS or p.get("category") in REMOVE_KEYS or p.get("subtype") in REMOVE_KEYS:
            return True
        if any(s in REMOVE_KEYS for s in (p.get("subtypes") or [])):
            # only remove if primarily that category
            if p.get("subtype") in REMOVE_KEYS or p.get("type") in REMOVE_KEYS:
                return True
    name = str(p.get("name", "")).lower()
    if "mini pc" in name or "mini-pc" in name:
        return True
    if "cajon" in name and "monedero" in name:
        return True
    if re.search(r"\bcajones?\b", name) and "monedero" in name:
        return True
    return False


def clean_product(p):
    subs = p.get("subtypes")
    if isinstance(subs, list):
        cleaned = [s for s in subs if s not in REMOVE_KEYS]
        if cleaned != subs:
            p["subtypes"] = cleaned
    return p


def clean_json_map(path, top_keys=("mini-pc", "cajones", "minipc")):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    changed = False
    if isinstance(data, dict):
        for key in list(data.keys()):
            if key in top_keys:
                del data[key]
                changed = True
            elif isinstance(data[key], dict):
                # nested subtypes/categories
                for nested in ("subtypes", "categories", "types"):
                    pass
        # clean nested dicts named subtypes/categories at root
        for nested_key in ("subtypes", "categories", "types"):
            nested = data.get(nested_key)
            if isinstance(nested, dict):
                for key in list(nested.keys()):
                    if key in top_keys:
                        del nested[key]
                        changed = True

        # brand_products style: brand -> list
        for brand, items in list(data.items()):
            if not isinstance(items, list):
                continue
            kept = []
            for p in items:
                if is_target_product(p):
                    changed = True
                    continue
                kept.append(clean_product(p))
            data[brand] = kept

        # catalog products list
        if isinstance(data.get("products"), list):
            kept = []
            for p in data["products"]:
                if is_target_product(p):
                    changed = True
                    continue
                kept.append(clean_product(p))
            data["products"] = kept

        # categoria_skus style entries already handled by top key delete

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("cleaned", path)
    else:
        # still rewrite if top keys removed only via nested — already covered
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("rewrote", path)


def clean_js_file(path):
    t = path.read_text(encoding="utf-8")
    n = t
    n = SUBTYPE_LINE.sub("", n)
    n = LABEL_LINE.sub("", n)
    # remove mini pc keyword from equipos keywords
    n = n.replace(", 'mini pc'", "")
    n = n.replace("'mini pc', ", "")
    n = n.replace("'mini pc'", "")
    if n != t:
        path.write_text(n, encoding="utf-8")
        print("updated", path.relative_to(ROOT))


def main():
    html_changed = []
    for html in ROOT.rglob("*.html"):
        if "node_modules" in html.parts:
            continue
        text = html.read_text(encoding="utf-8")
        new = FLYOUT_RE.sub("\n", text)
        new = OPTION_RE.sub("\n", new)
        new = BUTTON_RE.sub("\n", new)
        if new != text:
            html.write_text(new, encoding="utf-8")
            html_changed.append(str(html.relative_to(ROOT)))
    print("HTML updated:", len(html_changed))
    for p in html_changed:
        print(" ", p)

    for rel in [
        "assets/js/buscar.js",
        "public/assets/js/buscar.js",
        "assets/js/brand_catalog.js",
        "public/assets/js/brand_catalog.js",
        "assets/js/search.js",
        "public/assets/js/search.js",
    ]:
        path = ROOT / rel
        if path.exists():
            clean_js_file(path)

    for base in [ROOT / "assets/files", ROOT / "public/assets/files"]:
        for name in [
            "catalogo.json",
            "brand_products.json",
            "categoria_skus.json",
            "product_details.json",
            "brand_filters.json",
        ]:
            path = base / name
            if path.exists():
                clean_json_map(path)

    gen = ROOT / "src" / "generate_data_js.py"
    if gen.exists():
        print("Running generate_data_js.py...")
        subprocess.check_call([sys.executable, str(gen)], cwd=str(ROOT))
        for name in [
            "catalogo.data.js",
            "brand_products.data.js",
            "categoria_skus.data.js",
            "product_details.data.js",
        ]:
            src = ROOT / "assets/files" / name
            dst = ROOT / "public/assets/files" / name
            if src.exists() and dst.parent.exists():
                dst.write_bytes(src.read_bytes())
                print("mirrored", name)

    left = []
    for p in ROOT.rglob("*"):
        if p.suffix.lower() not in {".html", ".js", ".css", ".json"}:
            continue
        if "node_modules" in p.parts or p.name.endswith(".data.js"):
            continue
        if p.name in {"remove_minipc_cajones.py", "remove_balanzas.py"}:
            continue
        try:
            t = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if re.search(r"mini-pc|minipc|cajones monederos|\bcajones\b|Mini PC", t, re.I):
            left.append(str(p.relative_to(ROOT)))
    print("Leftover refs:")
    for x in left:
        print(" ", x)


if __name__ == "__main__":
    main()
