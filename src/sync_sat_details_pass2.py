#!/usr/bin/env python3
"""Segunda pasada: productos SAT sin detalle, buscando por nombre en satpcs.com."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
from pathlib import Path

from sync_sat_details import (
    CACHE,
    CATALOG,
    DETAILS,
    abs_url,
    fetch,
    page_has_sku,
    parse_product,
    strip_tags,
)


def name_candidates(name: str) -> list[str]:
    n = re.sub(r"\s+", " ", name or "").strip()
    out = [n]
    # sin prefijos genéricos
    cleaned = re.sub(
        r"^(Adaptador|Cable|Impresora|Lector|Balanza|Monitor|Ups|Equipo|Equipos)\s+",
        "",
        n,
        flags=re.I,
    ).strip()
    if cleaned and cleaned not in out:
        out.append(cleaned)
    # modelo tokens
    tokens = re.findall(r"\b([A-Z]{1,6}\d{2,}[A-Z0-9\-]*)\b", n, flags=re.I)
    for t in tokens[:3]:
        q = f"SAT {t}"
        if q not in out:
            out.append(q)
        if t not in out:
            out.append(t)
    return out


def find_by_name(sku: str, name: str) -> str | None:
    for q in name_candidates(name):
        url = "https://satpcs.com/sp/catalogsearch/result/?q=" + urllib.parse.quote(q)
        try:
            html = fetch(url)
        except Exception:
            continue
        blocks = re.split(r'<li[^>]*class="[^"]*product-item[^"]*"', html, flags=re.I)
        hrefs = []
        for block in blocks[1:]:
            href_m = re.search(r'href="(https://satpcs\.com/sp/[^"]+\.html)"', block, re.I)
            if not href_m:
                href_m = re.search(r'href="(/sp/[^"]+\.html)"', block, re.I)
            if not href_m:
                continue
            href = abs_url(href_m.group(1))
            if "catalogsearch" in href:
                continue
            if href not in hrefs:
                hrefs.append(href)
        for href in hrefs[:8]:
            try:
                page = fetch(href)
            except Exception:
                continue
            if page_has_sku(page, sku):
                return href
            time.sleep(0.05)
        time.sleep(0.1)

    # slug guess variants
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    guesses = [base]
    if not base.startswith("sat-"):
        guesses.append("sat-" + base)
    for slug in guesses:
        guess = f"https://satpcs.com/sp/{slug}.html"
        try:
            page = fetch(guess)
            if page_has_sku(page, sku):
                return guess
        except Exception:
            pass
    return None


def main() -> None:
    import sys

    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    sat = [p for p in catalog.get("products") or [] if p.get("brand") == "sat"]
    details = json.loads(DETAILS.read_text(encoding="utf-8"))
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    missing = [
        p
        for p in sat
        if not (
            details.get(str(p["sku"]), {}).get("source") == "satpcs.com"
            and (
                details[str(p["sku"])].get("resumenText")
                or details[str(p["sku"])].get("descriptionHtml")
                or details[str(p["sku"])].get("attributes")
            )
        )
    ]
    print(f"Missing SAT details: {len(missing)}", flush=True)
    ok = fail = 0
    for i, product in enumerate(missing, 1):
        sku = str(product["sku"])
        name = product.get("name") or ""
        try:
            url = find_by_name(sku, name)
            if not url:
                fail += 1
                print(f"[{i}/{len(missing)}] FAIL {sku} {name[:55]}", flush=True)
                cache[sku] = ""
                continue
            detail = parse_product(fetch(url), url, sku, name)
            if not detail["images"] and product.get("img"):
                img = product["img"]
                detail["images"] = [{"full": img, "img": img, "thumb": img}]
            details[sku] = detail
            cache[sku] = url
            ok += 1
            print(
                f"[{i}/{len(missing)}] OK {sku} resumen={bool(detail['resumenText'])} "
                f"attrs={len(detail['attributes'])} ficha={len(detail['ficha'])}",
                flush=True,
            )
        except Exception as exc:
            fail += 1
            print(f"[{i}/{len(missing)}] ERR {sku}: {exc}", flush=True)
        if i % 8 == 0:
            DETAILS.write_text(json.dumps(details, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
        time.sleep(0.2)

    DETAILS.write_text(json.dumps(details, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Done pass2. ok={ok} fail={fail}", flush=True)


if __name__ == "__main__":
    main()
