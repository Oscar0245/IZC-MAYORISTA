#!/usr/bin/env python3
"""Corrige nombres SAT y genera filtros por categoría."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ROOT / "assets" / "files"

TYPE_LABELS = {
    "lectores": "Lectores de Códigos de Barras",
    "impresoras": "Impresoras",
    "equipos-pos": "Equipos POS",
    "monitores-touch": "Monitores Touch",
    "mini-pc": "Mini PC",
    "cajones": "Cajones monederos",
    "balanzas": "Balanzas",
    "cables": "Cables y conectividad",
    "energia": "Energía / UPS",
    "seguridad": "Seguridad electrónica",
    "control": "Control de acceso",
    "consumibles": "Consumibles",
    "otros": "Otros",
}


def clean_name(name: str, sku: str) -> str:
    n = re.sub(r"\s+", " ", str(name or "")).strip()
    n = re.sub(r"^Sku:\s*[0-9]+(?:-[0-9]+)*\s*", "", n, flags=re.I).strip()
    n = re.sub(r"^" + re.escape(sku) + r"\s*[-–:]?\s*", "", n, flags=re.I).strip()
    return n or name


def main() -> None:
    catalog_path = FILES / "catalogo.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    fixed = 0
    for p in catalog.get("products") or []:
        if p.get("brand") != "sat":
            continue
        before = p.get("name") or ""
        after = clean_name(before, str(p.get("sku") or ""))
        if after != before:
            p["name"] = after
            fixed += 1
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    sat = [p for p in catalog["products"] if p.get("brand") == "sat"]
    bp_path = FILES / "brand_products.json"
    bp = json.loads(bp_path.read_text(encoding="utf-8")) if bp_path.exists() else {}
    bp["sat"] = sat
    bp_path.write_text(json.dumps(bp, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    by_type: dict[str, list[str]] = defaultdict(list)
    for p in sat:
        by_type[p.get("type") or "otros"].append(p["sku"])

    options = []
    for tipo, skus in sorted(by_type.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        options.append(
            {
                "label": TYPE_LABELS.get(tipo, tipo),
                "slug": tipo,
                "url": f"sat.html?filtro=categoria:{tipo}",
                "count": len(skus),
                "skus": skus,
            }
        )

    filters = {
        "brand": "sat",
        "source": "https://izc.com.co/es/brand/sat",
        "groups": [
            {
                "title": "Categoría",
                "slug": "categoria",
                "options": options,
            }
        ],
    }
    bf_path = FILES / "brand_filters.json"
    bf = json.loads(bf_path.read_text(encoding="utf-8")) if bf_path.exists() else {}
    bf["sat"] = filters
    bf_path.write_text(json.dumps(bf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"fixed names: {fixed}, sat products: {len(sat)}, categories: {len(options)}")
    print(sat[0]["name"][:100] if sat else "none")


if __name__ == "__main__":
    main()
