from pathlib import Path
import json
import re
import subprocess
import sys

ROOT = Path(r"C:\xampp1\htdocs\IZC")
BALANZA_SKUS = {"4031", "15361", "10927"}

FLYOUT_RE = re.compile(
    r'\s*<div class="flyout-group">\s*'
    r'<a href="[^"]*balanzas[^"]*" class="flyout-group-title"><span class="icon">⚖</span>Balanzas</a>\s*'
    r"</div>",
    re.IGNORECASE,
)
OPTION_RE = re.compile(r'\s*<option value="balanzas">[^<]*</option>\s*', re.IGNORECASE)
BUSCAR_BLOCK = re.compile(
    r"\s*balanzas:\s*\{\s*label:\s*'Balanzas',\s*keywords:\s*\[[^\]]*\]\s*\},?\n",
    re.MULTILINE,
)
SEARCH_LINE = re.compile(r"\s*balanzas:\s*\[[^\]]*\]\,?\n")


def is_balanza_product(p):
    sku = str(p.get("sku", ""))
    if sku in BALANZA_SKUS:
        return True
    if p.get("type") == "balanzas" or p.get("category") == "balanzas" or p.get("subtype") == "balanzas":
        return True
    name = str(p.get("name", "")).lower()
    return "balanza" in name


def clean_product(p):
    subs = p.get("subtypes")
    if isinstance(subs, list) and "balanzas" in subs:
        p["subtypes"] = [s for s in subs if s != "balanzas"]
    return p


def clean_catalog(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    before = len(data.get("products", []))
    products = []
    removed = []
    for p in data.get("products", []):
        if is_balanza_product(p):
            removed.append(p.get("sku"))
            continue
        products.append(clean_product(p))
    data["products"] = products
    cats = data.get("categories")
    if isinstance(cats, dict) and "balanzas" in cats:
        del cats["balanzas"]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"catalog {path}: {before} -> {len(products)}, removed {removed}")


def clean_brand_products(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    total_rm = 0
    for brand, items in list(data.items()):
        if not isinstance(items, list):
            continue
        kept = []
        for p in items:
            if is_balanza_product(p):
                total_rm += 1
                continue
            kept.append(clean_product(p))
        data[brand] = kept
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"brand_products {path}: removed {total_rm}")


def clean_categoria_skus(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if "balanzas" in data:
        del data["balanzas"]
    for _key, entry in data.items():
        if not isinstance(entry, dict):
            continue
        skus = entry.get("skus")
        if isinstance(skus, list):
            new_skus = [s for s in skus if str(s) not in BALANZA_SKUS]
            if len(new_skus) != len(skus):
                entry["skus"] = new_skus
                entry["count"] = len(new_skus)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"categoria_skus cleaned {path}")


def clean_product_details(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    rm = [k for k in list(data.keys()) if str(k) in BALANZA_SKUS]
    for k in rm:
        del data[k]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"product_details {path}: removed {rm}")


def main():
    html_changed = []
    for html in ROOT.rglob("*.html"):
        if "node_modules" in html.parts:
            continue
        text = html.read_text(encoding="utf-8")
        new = FLYOUT_RE.sub("\n", text)
        new = OPTION_RE.sub("\n", new)
        if new != text:
            html.write_text(new, encoding="utf-8")
            html_changed.append(str(html.relative_to(ROOT)))
    print("HTML updated:", len(html_changed))
    for p in html_changed:
        print(" ", p)

    for rel in ["assets/js/buscar.js", "public/assets/js/buscar.js"]:
        path = ROOT / rel
        if not path.exists():
            continue
        t = path.read_text(encoding="utf-8")
        n = BUSCAR_BLOCK.sub("\n", t)
        if n != t:
            path.write_text(n, encoding="utf-8")
            print("updated", rel)

    for rel in ["assets/js/search.js", "public/assets/js/search.js"]:
        path = ROOT / rel
        if not path.exists():
            continue
        t = path.read_text(encoding="utf-8")
        n = SEARCH_LINE.sub("\n", t)
        if n != t:
            path.write_text(n, encoding="utf-8")
            print("updated", rel)

    for rel in ["assets/js/brand_catalog.js", "public/assets/js/brand_catalog.js"]:
        path = ROOT / rel
        if not path.exists():
            continue
        t = path.read_text(encoding="utf-8")
        n = t.replace("    balanzas: 'Balanzas',\n", "")
        if n != t:
            path.write_text(n, encoding="utf-8")
            print("updated", rel)

    for base in [ROOT / "assets/files", ROOT / "public/assets/files"]:
        if (base / "catalogo.json").exists():
            clean_catalog(base / "catalogo.json")
        if (base / "brand_products.json").exists():
            clean_brand_products(base / "brand_products.json")
        if (base / "categoria_skus.json").exists():
            clean_categoria_skus(base / "categoria_skus.json")
        if (base / "product_details.json").exists():
            clean_product_details(base / "product_details.json")

    gen = ROOT / "src" / "generate_data_js.py"
    if gen.exists():
        print("Running generate_data_js.py...")
        subprocess.check_call([sys.executable, str(gen)], cwd=str(ROOT))
        # mirror data.js into public if separate
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
                print("mirrored", name, "to public")
    else:
        print("No generate_data_js.py")

    left = []
    for p in ROOT.rglob("*"):
        if p.suffix.lower() not in {".html", ".js", ".css", ".json"}:
            continue
        if "node_modules" in p.parts:
            continue
        if p.name == "remove_balanzas.py":
            continue
        try:
            t = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if re.search(r"balanza", t, re.I):
            left.append(str(p.relative_to(ROOT)))
    print("Leftover refs:")
    for x in left:
        print(" ", x)


if __name__ == "__main__":
    main()
