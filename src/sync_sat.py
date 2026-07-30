#!/usr/bin/env python3
"""Scrape productos SAT desde izc.com.co e intégralos al catálogo local."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ROOT / "assets" / "files"
IMG_DIR = ROOT / "assets" / "imgmarcas"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

BRAND = {
    "id": "sat",
    "name": "SAT",
    "page": "sat.html",
    "keywords": ["sat", "satpcs", "sat pcs"],
    "brandLogo": "SAT.png",
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.read().decode("utf-8", "replace")


def download(url: str, dest: Path) -> bool:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=90) as resp:
            dest.write_bytes(resp.read())
        return True
    except Exception as exc:
        print("download fail", url, exc)
        return False


def classify(name: str) -> tuple[str, str | None, list[str]]:
    n = name.lower()
    subtypes: list[str] = []

    def hit(*words: str) -> bool:
        return any(w in n for w in words)

    if hit("lector", "escáner", "escaner", "scanner", "código de barras", "codigo de barras"):
        tipo = "lectores"
        if hit("inalámbr", "inalambr", "wireless", "bluetooth"):
            sub = "lectores-inalambricos"
        elif hit("mesa", "omnidirecc", "orbit", "presentación", "presentacion"):
            sub = "lectores-de-mesa"
        elif hit("empotr", "fijo", "bióptico", "bioptic", "magellan"):
            sub = "lectores-empotrables"
        else:
            sub = "lectores-de-mano"
        subtypes.append(sub)
        if hit("balanza"):
            subtypes.append("balanzas")
        return tipo, sub, subtypes

    if hit("impresora") and hit("carnet", "pvc", "tarjeta"):
        return "impresoras-carnet", "impresoras-carnet", ["impresoras-carnet"]
    if hit("impresora") and hit("manilla", "wrist"):
        return "impresoras-manillas", "impresoras-manillas", ["impresoras-manillas"]
    if hit("impresora") and hit("etiqueta", "térmica", "termica", "transferencia", "ribbon"):
        tipo = "impresoras"
        if hit("industrial"):
            sub = "impresoras-industriales"
        elif hit("semi"):
            sub = "impresoras-semi-industriales"
        else:
            sub = "impresoras-escritorio"
        return tipo, sub, [sub]
    if hit("impresora") and hit("térmica", "termica", "pos", "ticket", "recibo"):
        return "impresoras", "impresoras-escritorio", ["impresoras-escritorio"]

    if hit("monitor") and hit("touch", "táctil", "tactil"):
        return "monitores-touch", "monitores-touch", ["monitores-touch"]
    if hit("all in one", "todo en uno", "aio", "equipo") and hit("pos", "punto de venta"):
        return "equipos-pos", "equipos-pos", ["equipos-pos"]
    if hit("mini pc", "minipc"):
        return "mini-pc", "mini-pc", ["mini-pc"]
    if hit("cajón", "cajon", "monedero", "cash drawer"):
        return "cajones", "cajones", ["cajones"]
    if hit("balanza", "báscula", "bascula"):
        return "balanzas", "balanzas", ["balanzas"]
    if hit("digitaliz", "firma", "signature"):
        return "digitalizadores", "digitalizadores", ["digitalizadores"]
    if hit("tarjeta", "magnetic", "msr") and hit("lector"):
        return "tarjetas", "lectores-tarjetas", ["lectores-tarjetas"]
    if hit("ups", "regulador", "bater"):
        return "energia", "energia", ["energia"]
    if hit("cable", "utp", "fibra", "patch", "conector", "adaptador enfrentador"):
        return "cables", "cables", ["cables"]
    if hit("grabador") and hit("nvr", "ip"):
        return "grabadores", "grabadores-ip", ["grabadores-ip"]
    if hit("grabador", "xvr", "dvr", "5en1", "5 en 1"):
        return "grabadores", "grabadores-analogo", ["grabadores-analogo"]
    if hit(
        "video power",
        "splitter",
        "fuente alimentacion",
        "fuente alimentación",
        "fuente centralizada",
        "adaptador sat ps",
        "bornera cctv",
    ) or (hit("adaptador") and hit("12vdc", "12v")):
        return "camaras", "accesorios-cctv", ["accesorios-cctv"]
    if hit("cámara", "camara", "cctv", "videovigil"):
        return "seguridad", "seguridad", ["seguridad"]
    if hit("control de acceso", "cerradura", "chapa", "botón de salida", "boton de salida", "torniquete"):
        return "control", "control", ["control"]
    if hit("consumible", "ribbon", "ribbon", "etiqueta", "rollo"):
        return "consumibles", "consumibles", ["consumibles"]

    return "otros", None, []


def parse_products(html: str) -> list[dict]:
    products: list[dict] = []
    # Magento product cards
    blocks = re.split(r'<li[^>]*class="[^"]*product-item[^"]*"', html, flags=re.I)
    for block in blocks[1:]:
        sku_m = re.search(r"Sku:\s*([0-9]+(?:-[0-9]+)*)", block, re.I)
        if not sku_m:
            continue
        sku_raw = sku_m.group(1).strip()
        # Prefer first concrete SKU if range-like display
        sku = sku_raw.split("-")[0].strip() if "-" in sku_raw and len(sku_raw.split("-")[0]) >= 3 else sku_raw

        name_m = re.search(
            r'product-item-link[^>]*>(.*?)</a>',
            block,
            re.I | re.S,
        )
        if not name_m:
            name_m = re.search(r'product-item-name[^>]*>.*?<a[^>]*>(.*?)</a>', block, re.I | re.S)
        name = re.sub(r"<[^>]+>", "", name_m.group(1) if name_m else "").strip()
        name = unescape(re.sub(r"\s+", " ", name))
        if not name:
            continue

        href_m = re.search(r'href="(https?://izc\.com\.co/es/[^"]+\.html)"', block, re.I)
        if not href_m:
            href_m = re.search(r'href="(/es/[^"]+\.html)"', block, re.I)
        url = href_m.group(1) if href_m else ""
        if url.startswith("/"):
            url = "https://izc.com.co" + url

        img_m = re.search(r'<img[^>]+src="([^"]+)"', block, re.I)
        img = img_m.group(1) if img_m else ""
        if img.startswith("//"):
            img = "https:" + img
        elif img.startswith("/"):
            img = "https://izc.com.co" + img

        tipo, sub, subtypes = classify(name)
        products.append(
            {
                "sku": sku,
                "skuDisplay": sku_raw,
                "name": name,
                "brand": "sat",
                "brandName": "SAT",
                "brandLogo": "SAT.png",
                "brandPage": "sat.html",
                "img": img,
                "url": url,
                "category": tipo,
                "type": tipo,
                "subtype": sub,
                "subtypes": subtypes,
            }
        )
    return products


def total_from_html(html: str) -> int | None:
    m = re.search(r"Artículos\s+\d+-\d+\s+de\s+(\d+)", html, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"Items\s+\d+\s+to\s+\d+\s+of\s+(\d+)", html, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r'data-product-count="(\d+)"', html, re.I)
    if m:
        return int(m.group(1))
    return None


def scrape_brand_listing() -> list[dict]:
    base = "https://izc.com.co/es/brand/sat"
    # Also try product_list_limit
    first = fetch(base + "?product_list_limit=36")
    total = total_from_html(first) or 0
    print("page1 total hint", total, "items", first.lower().count("product-item"))
    Path(FILES / "_sat_page1.html").write_text(first[:50000], encoding="utf-8")

    by_sku: dict[str, dict] = {}
    for p in parse_products(first):
        by_sku[p["sku"]] = p

    # Guess pages
    per_page = max(len(by_sku), 1)
    pages = max(1, (total + per_page - 1) // per_page) if total else 40
    pages = min(pages, 80)

    for page in range(2, pages + 1):
        url = f"{base}?p={page}&product_list_limit=36"
        try:
            html = fetch(url)
        except Exception as exc:
            print("page fail", page, exc)
            break
        items = parse_products(html)
        if not items:
            print("empty page", page)
            break
        new = 0
        for p in items:
            if p["sku"] not in by_sku:
                by_sku[p["sku"]] = p
                new += 1
        print(f"page {page}: +{new} (total {len(by_sku)})")
        if new == 0:
            break
        time.sleep(0.35)

    # Fallback: search brand-filtered if few products
    if len(by_sku) < 50:
        print("fallback search q=SAT brand filter...")
        for page in range(1, 30):
            q = urllib.parse.urlencode({"q": "SAT", "product_list_limit": 36, "p": page})
            url = f"https://izc.com.co/es/catalogsearch/result/?{q}"
            try:
                html = fetch(url)
            except Exception as exc:
                print("search fail", page, exc)
                break
            items = [p for p in parse_products(html) if re.search(r"\bsat\b", p["name"], re.I)]
            if not items:
                break
            new = 0
            for p in items:
                if p["sku"] not in by_sku:
                    by_sku[p["sku"]] = p
                    new += 1
            print(f"search page {page}: +{new} (total {len(by_sku)})")
            if new == 0:
                break
            time.sleep(0.35)

    return list(by_sku.values())


def slugify(text: str) -> str:
    t = text.lower().strip()
    t = re.sub(r"[áàä]", "a", t)
    t = re.sub(r"[éèë]", "e", t)
    t = re.sub(r"[íìï]", "i", t)
    t = re.sub(r"[óòö]", "o", t)
    t = re.sub(r"[úùü]", "u", t)
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t or "opcion"


def scrape_filters(products: list[dict]) -> dict:
    html = fetch("https://izc.com.co/es/brand/sat")
    groups = []
    # Magento filter options
    for m in re.finditer(
        r'<dt[^>]*class="[^"]*filter-options-title[^"]*"[^>]*>(.*?)</dt>\s*<dd[^>]*class="[^"]*filter-options-content[^"]*"[^>]*>(.*?)</dd>',
        html,
        re.I | re.S,
    ):
        title = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        content = m.group(2)
        options = []
        for om in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', content, re.I | re.S):
            url = unescape(om.group(1))
            label_html = om.group(2)
            label = re.sub(r"<[^>]+>", "", label_html)
            label = unescape(re.sub(r"\s+", " ", label)).strip()
            count_m = re.search(r"\((\d+)\)\s*$", label)
            count = int(count_m.group(1)) if count_m else 0
            if count_m:
                label = label[: count_m.start()].strip()
            if not label:
                continue
            # Match local SKUs by fetching option page is heavy; leave empty skus for now
            # We'll fill by scraping option pages briefly for first N options
            options.append(
                {
                    "label": label,
                    "slug": slugify(label),
                    "url": url if url.startswith("http") else "https://izc.com.co" + url,
                    "count": count,
                    "skus": [],
                }
            )
        if title and options:
            groups.append({"title": title, "slug": slugify(title), "options": options})

    # Fill SKUs for each option (limited concurrency sequential)
    sku_re = re.compile(r"Sku:\s*([0-9]+)", re.I)
    local = {p["sku"] for p in products}
    for g in groups:
        for opt in g["options"]:
            try:
                page = fetch(opt["url"] + ("&" if "?" in opt["url"] else "?") + "product_list_limit=100")
                skus = []
                for sm in sku_re.finditer(page):
                    sku = sm.group(1)
                    if sku in local and sku not in skus:
                        skus.append(sku)
                # also paginate a bit
                for pnum in range(2, 6):
                    if len(skus) >= opt["count"] > 0:
                        break
                    u = opt["url"] + ("&" if "?" in opt["url"] else "?") + f"p={pnum}&product_list_limit=100"
                    try:
                        page2 = fetch(u)
                    except Exception:
                        break
                    before = len(skus)
                    for sm in sku_re.finditer(page2):
                        sku = sm.group(1)
                        if sku in local and sku not in skus:
                            skus.append(sku)
                    if len(skus) == before:
                        break
                    time.sleep(0.2)
                opt["skus"] = skus
                print(f"filter {g['slug']}/{opt['slug']}: {len(skus)} skus")
                time.sleep(0.25)
            except Exception as exc:
                print("filter fail", opt["label"], exc)

    return {
        "brand": "sat",
        "source": "https://izc.com.co/es/brand/sat",
        "groups": groups,
    }


def ensure_logo() -> None:
    dest = IMG_DIR / "SAT.png"
    if dest.exists() and dest.stat().st_size > 1000:
        print("logo exists", dest)
        return
    html = fetch("https://izc.com.co/es/brand/sat")
    # brand logo candidates
    candidates = re.findall(r'<img[^>]+src="([^"]*sat[^"]*\.(?:png|jpg|webp|svg))"', html, re.I)
    candidates += re.findall(r'(https://izc\.com\.co/pub/media/[^"\']+sat[^"\']+\.(?:png|jpg|webp))', html, re.I)
    for c in candidates:
        url = c
        if url.startswith("//"):
            url = "https:" + url
        elif url.startswith("/"):
            url = "https://izc.com.co" + url
        if download(url, dest):
            print("logo saved from", url)
            return
    # fallback placeholder: copy Zebra and rename? better create simple text PNG later
    print("WARNING: no logo found; pages will use onerror fallback")


def merge_into_catalog(products: list[dict]) -> None:
    catalog_path = FILES / "catalogo.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

    brands = catalog.get("brands") or []
    brands = [b for b in brands if b.get("id") != "sat"]
    brands.append(
        {
            "id": "sat",
            "name": "SAT",
            "page": "sat.html",
            "keywords": ["sat", "satpcs"],
        }
    )
    brands.sort(key=lambda b: b["name"].lower())
    catalog["brands"] = brands

    existing = catalog.get("products") or []
    existing = [p for p in existing if p.get("brand") != "sat"]
    # Normalize product fields for catalog (drop url/skuDisplay extras ok to keep)
    clean = []
    for p in products:
        clean.append(
            {
                "sku": p["sku"],
                "name": p["name"],
                "brand": "sat",
                "brandName": "SAT",
                "brandLogo": "SAT.png",
                "brandPage": "sat.html",
                "img": p.get("img") or "",
                "category": p.get("category") or "otros",
                "type": p.get("type") or "otros",
                "subtype": p.get("subtype"),
                "subtypes": p.get("subtypes") or [],
            }
        )
    catalog["products"] = existing + clean
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("catalog products", len(catalog["products"]), "sat", len(clean))

    bp_path = FILES / "brand_products.json"
    bp = json.loads(bp_path.read_text(encoding="utf-8")) if bp_path.exists() else {}
    bp["sat"] = clean
    bp_path.write_text(json.dumps(bp, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ensure_logo()
    products = scrape_brand_listing()
    print("SAT products scraped:", len(products))
    if not products:
        raise SystemExit("No SAT products found")
    merge_into_catalog(products)
    print("Scraping filters...")
    filters = scrape_filters(products)
    bf_path = FILES / "brand_filters.json"
    bf = json.loads(bf_path.read_text(encoding="utf-8")) if bf_path.exists() else {}
    bf["sat"] = filters
    bf_path.write_text(json.dumps(bf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("filters groups", len(filters.get("groups") or []))


if __name__ == "__main__":
    main()
