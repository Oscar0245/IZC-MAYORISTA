"""Descarga fichas/detalles de productos SAT."""
#!/usr/bin/env python3
"""Scrapea descripciones y fichas de productos SAT desde https://satpcs.com/sp/"""
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
CATALOG = FILES / "catalogo.json"
DETAILS = FILES / "product_details.json"
CACHE = FILES / "_satpcs_url_cache.json"
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "es-CO,es;q=0.9",
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.read().decode("utf-8", "replace")


def abs_url(url: str) -> str:
    href = (url or "").strip()
    if not href:
        return ""
    href = unescape(href).replace("\\/", "/")
    if href.startswith("//"):
        return "https:" + href
    if href.startswith("/"):
        return "https://satpcs.com" + href
    if href.startswith("http"):
        return href
    return "https://satpcs.com/" + href.lstrip("./")


def strip_tags(html: str) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", " ", html or "", flags=re.I | re.S)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return unescape(re.sub(r"\s+", " ", text)).strip()


def page_has_sku(html: str, sku: str) -> bool:
    return bool(re.search(rf'itemprop="sku">\s*{re.escape(sku)}\s*<', html, re.I))


def find_product_url(sku: str, name: str, cache: dict[str, str]) -> str | None:
    cached = cache.get(sku)
    if cached:
        return cached
    if sku in cache and cache[sku] == "":
        return None

    queries = [sku]
    tokens = re.findall(r"\b([A-Z]{1,5}\d{2,}[A-Z0-9\-]*)\b", name or "", flags=re.I)
    for t in tokens[:2]:
        if t.upper() not in {q.upper() for q in queries}:
            queries.append(t)

    # Solo coincidencias explícitas de SKU (evita falsos positivos con SKUs cortos)
    sku_in_card = [
        re.compile(rf'itemprop="sku">\s*{re.escape(sku)}\s*<', re.I),
        re.compile(rf"Sku:\s*{re.escape(sku)}\b", re.I),
        re.compile(rf'data-product-sku="{re.escape(sku)}"', re.I),
    ]

    for q in queries:
        url = "https://satpcs.com/sp/catalogsearch/result/?q=" + urllib.parse.quote(q)
        try:
            html = fetch(url)
        except Exception:
            continue
        blocks = re.split(r'<li[^>]*class="[^"]*product-item[^"]*"', html, flags=re.I)
        for block in blocks[1:]:
            if not any(p.search(block) for p in sku_in_card):
                continue
            href_m = re.search(r'href="(https://satpcs\.com/sp/[^"]+\.html)"', block, re.I)
            if not href_m:
                href_m = re.search(r'href="(/sp/[^"]+\.html)"', block, re.I)
            if not href_m:
                continue
            href = abs_url(href_m.group(1))
            if "catalogsearch" in href:
                continue
            cache[sku] = href
            return href
        time.sleep(0.08)

    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    if slug:
        guess = f"https://satpcs.com/sp/{slug}.html"
        try:
            html = fetch(guess)
            if page_has_sku(html, sku):
                cache[sku] = guess
                return guess
        except Exception:
            pass

    cache[sku] = ""
    return None


def parse_images(html: str) -> list[dict]:
    images: list[dict] = []
    seen: set[str] = set()

    for full, img, thumb in re.findall(
        r'"full"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"img"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"thumb"\s*:\s*"((?:\\.|[^"\\])*)"',
        html,
    ):
        full_u = abs_url(full.encode().decode("unicode_escape") if "\\u" in full else full.replace("\\/", "/"))
        img_u = abs_url(img.replace("\\/", "/"))
        thumb_u = abs_url(thumb.replace("\\/", "/"))
        # safer unescape
        full_u = abs_url(full.replace("\\/", "/").replace("\\u0026", "&"))
        img_u = abs_url(img.replace("\\/", "/").replace("\\u0026", "&"))
        thumb_u = abs_url(thumb.replace("\\/", "/").replace("\\u0026", "&"))
        key = full_u or img_u
        if not key or key in seen:
            continue
        if not any(x in key.lower() for x in [".jpg", ".jpeg", ".png", ".webp", ".gif"]):
            continue
        seen.add(key)
        images.append({"full": full_u, "img": img_u or full_u, "thumb": thumb_u or img_u or full_u})

    if images:
        return images

    for src in re.findall(r'"image"\s*:\s*"((?:\\.|[^"\\])*)"', html):
        u = abs_url(src.replace("\\/", "/"))
        if u and u not in seen and any(x in u.lower() for x in [".jpg", ".jpeg", ".png", ".webp"]):
            seen.add(u)
            images.append({"full": u, "img": u, "thumb": u})

    m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html, re.I)
    if m:
        u = abs_url(m.group(1))
        if u and u not in seen:
            seen.add(u)
            images.append({"full": u, "img": u, "thumb": u})

    return images


def parse_resumen(html: str) -> tuple[str, str]:
    m = re.search(r'id="short_description_content"[^>]*>(.*?)</div>', html, re.I | re.S)
    if not m:
        m = re.search(r'itemprop="description"[^>]*>(.*?)</div>', html, re.I | re.S)
    if not m:
        return "", ""
    raw = re.sub(r"<style[^>]*>.*?</style>", "", m.group(1), flags=re.I | re.S)
    raw = re.sub(r"<script[^>]*>.*?</script>", "", raw, flags=re.I | re.S)
    parts = re.findall(r"<p\b[^>]*>.*?</p>", raw, flags=re.I | re.S)
    keep: list[str] = []
    for p in parts:
        text = strip_tags(p)
        if len(text) < 5:
            continue
        keep.append(f"<p>{text}</p>")
        if len(keep) >= 5:
            break
    if not keep:
        text = strip_tags(raw)
        if not text:
            return "", ""
        return f"<p>{text}</p>", text
    html_out = "\n".join(keep)
    return html_out, strip_tags(html_out)


def parse_description(html: str) -> str:
    m = re.search(
        r'class="product attribute description"\s*>\s*<div class="value"[^>]*>(.*?)</div>\s*</div>',
        html,
        re.I | re.S,
    )
    if not m:
        return ""
    block = re.sub(r"<style[^>]*>.*?</style>", "", m.group(1), flags=re.I | re.S)
    return block.strip()


def parse_attributes(html: str) -> list[dict]:
    m = re.search(r'id="product-attribute-specs-table"(.*?)</table>', html, re.I | re.S)
    if not m:
        return []
    rows = []
    for lab, val in re.findall(r"<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>", m.group(1), re.I | re.S):
        label = strip_tags(lab)
        value = strip_tags(val)
        if label and value:
            rows.append({"label": label, "value": value})
    return rows


def classify_doc(url: str, label: str) -> str:
    blob = f"{url} {label}".lower()
    if "calibr" in blob:
        return "Manual de Calibración"
    if "manual" in blob and "usuario" in blob:
        return "Manual de Usuario"
    if "manual" in blob or "guia" in blob or "guía" in blob:
        return "Manual"
    if "driver" in blob or "controlador" in blob:
        return "Driver"
    if "ficha" in blob:
        return "Ficha Técnica"
    if label.strip():
        return label.strip()[:80]
    return "Descarga"


def parse_ficha(html: str, product_name: str) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()

    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.I | re.S):
        links = re.findall(
            r'<a[^>]+href="([^"]+\.(?:pdf|zip|rar|exe)[^"]*)"[^>]*>(.*?)</a>',
            tr,
            re.I | re.S,
        )
        if not links:
            continue
        cells = [strip_tags(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.I | re.S)]
        for href, anchor in links:
            url = abs_url(href)
            if not url or url in seen:
                continue
            seen.add(url)
            tipo = classify_doc(url, strip_tags(anchor))
            modelo = product_name
            for c in cells:
                if re.search(r"sat|\bps\d|\bq\d|\bci\d|\bu\d", c, re.I):
                    modelo = c
                    break
            rows.append({"tipo": tipo, "modelo": modelo, "fichaUrl": url})

    if rows:
        return rows

    for href in re.findall(r'href="([^"]+\.pdf[^"]*)"', html, re.I):
        url = abs_url(href)
        if not url or url in seen:
            continue
        if not any(x in url for x in ("/Descargas/", "/attachments/", "/media/")):
            continue
        seen.add(url)
        rows.append({"tipo": classify_doc(url, ""), "modelo": product_name, "fichaUrl": url})
    return rows


def parse_product(html: str, url: str, sku: str, fallback_name: str) -> dict:
    if not page_has_sku(html, sku):
        raise ValueError(f"SKU {sku} no está en la página")

    name_m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.I | re.S)
    name = strip_tags(name_m.group(1)) if name_m else fallback_name

    if re.search(r"SIN STOCK", html, re.I):
        in_stock, label = False, "SIN STOCK"
    elif re.search(r"EN STOCK", html, re.I):
        in_stock, label = True, "EN STOCK"
    else:
        in_stock, label = False, "SIN STOCK"

    resumen_html, resumen_text = parse_resumen(html)
    return {
        "sku": sku,
        "name": name,
        "url": url,
        "images": parse_images(html),
        "stock": {"inStock": in_stock, "label": label},
        "resumenHtml": resumen_html,
        "resumenText": resumen_text,
        "descriptionHtml": parse_description(html),
        "attributes": parse_attributes(html),
        "ficha": parse_ficha(html, name),
        "source": "satpcs.com",
    }


def main() -> None:
    import sys

    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    sat = [p for p in catalog.get("products") or [] if p.get("brand") == "sat"]
    details = json.loads(DETAILS.read_text(encoding="utf-8")) if DETAILS.exists() else {}
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    ok = fail = skip = 0
    total = len(sat)
    print(f"SAT products to enrich: {total}", flush=True)

    for i, product in enumerate(sat, 1):
        sku = str(product.get("sku") or "").strip()
        name = product.get("name") or ""
        if not sku:
            continue

        existing = details.get(sku)
        if (
            existing
            and existing.get("source") == "satpcs.com"
            and (existing.get("resumenText") or existing.get("descriptionHtml") or existing.get("attributes"))
            and existing.get("images") is not None
            and len(existing.get("images") or []) > 0
        ):
            skip += 1
            continue

        try:
            url = find_product_url(sku, name, cache)
            if not url:
                fail += 1
                print(f"[{i}/{total}] FAIL no url {sku} {name[:50]}", flush=True)
            else:
                detail = parse_product(fetch(url), url, sku, name)
                # fallback image from catalog if gallery empty
                if not detail["images"] and product.get("img"):
                    img = product["img"]
                    detail["images"] = [{"full": img, "img": img, "thumb": img}]
                details[sku] = detail
                ok += 1
                print(
                    f"[{i}/{total}] OK {sku} imgs={len(detail['images'])} "
                    f"attrs={len(detail['attributes'])} ficha={len(detail['ficha'])} "
                    f"resumen={bool(detail['resumenText'])}",
                    flush=True,
                )
        except Exception as exc:
            fail += 1
            print(f"[{i}/{total}] ERR {sku}: {exc}", flush=True)

        if i % 10 == 0:
            DETAILS.write_text(json.dumps(details, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
        time.sleep(0.15)

    DETAILS.write_text(json.dumps(details, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Done. ok={ok} fail={fail} skip={skip} details_total={len(details)}", flush=True)


if __name__ == "__main__":
    main()
