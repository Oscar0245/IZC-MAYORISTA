"""Genera o actualiza la página HTML/CSS/JS de SAT."""
#!/usr/bin/env python3
"""Crea sat.html/css/js desde plantilla topaz y actualiza marcas."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DESC = """      <section class="brand-description">
        <h2>IZC es un distribuidor mayorista autorizado de la marca SAT PCS en Colombia</h2>
        <p>SAT PCS es una marca de tecnología enfocada en impulsar el sector productivo con soluciones para punto de venta POS, seguridad electrónica, señalización digital, energía, cableado estructurado, videovigilancia, marcación, etiquetado y movilidad.</p>
        <p>En IZC Mayorista encontrarás su portafolio de equipos todo en uno, impresoras térmicas, lectores, monitores touch, UPS, cables, consumibles y más, pensados para hacer los negocios más dinámicos, eficientes y seguros.</p>
        <h3 class="slogan">¡La elección es clara!</h3>
      </section>"""

SORT_OPTIONS = """          <select id="sortSelect">
            <option value="all">Todas las Categorías</option>
            <option value="equipos-pos">Equipos POS</option>
            <option value="lectores">Lectores</option>
            <option value="impresoras">Impresoras</option>
            <option value="monitores-touch">Monitores Touch</option>
            <option value="mini-pc">Mini PC</option>
            <option value="cajones">Cajones</option>
            <option value="balanzas">Balanzas</option>
            <option value="energia">Energía / UPS</option>
            <option value="cables">Cables</option>
            <option value="seguridad">Seguridad</option>
            <option value="control">Control de acceso</option>
            <option value="consumibles">Consumibles</option>
            <option value="otros">Otros</option>
          </select>"""


def main() -> None:
    html = (ROOT / "topaz.html").read_text(encoding="utf-8")
    html = html.replace("Topaz", "SAT")
    html = html.replace("topaz", "sat")
    html = html.replace("TOPAZ", "SAT")
    # restore accidental replacements inside common words if any
    html = html.replace('data-brand="sat"', 'data-brand="sat"')
    # banner: use brand image from IZC if available; logo local
    html = html.replace(
        "https://izc.com.co/pub/media/webp_image/codazon_cache/brand/1200x/codazon/brand/banner_marca/Topaz.webp",
        "https://izc.com.co/pub/media/codazon_cache/brand/1200x/codazon/brand/SAT-PCS.jpg",
    )
    # if previous replace already changed Topaz.webp path wrongly
    html = html.replace(
        "https://izc.com.co/pub/media/webp_image/codazon_cache/brand/1200x/codazon/brand/banner_marca/SAT.webp",
        "https://izc.com.co/pub/media/codazon_cache/brand/1200x/codazon/brand/SAT-PCS.jpg",
    )

    import re

    html = re.sub(
        r'<section class="brand-description">.*?</section>',
        DESC,
        html,
        count=1,
        flags=re.S,
    )
    html = re.sub(
        r'<select id="sortSelect">.*?</select>',
        SORT_OPTIONS,
        html,
        count=1,
        flags=re.S,
    )
    html = html.replace(
        '<span class="item-count" id="itemCountDisplay">5 artículos</span>',
        '<span class="item-count" id="itemCountDisplay">358 artículos</span>',
    )
    html = html.replace(
        "No se encontraron productos disponibles para esta categoría en la marca Datalogic.",
        "No se encontraron productos disponibles para esta categoría en la marca SAT.",
    )
    # Add SAT into featured brands second slide
    if 'href="sat.html"' not in html.split("brand-slide")[2] if "brand-slide" in html else True:
        html = html.replace(
            '<a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>',
            '<a href="zebra.html" class="brand-item"><img src="assets/imgmarcas/Zebra.png" alt="Zebra"></a>\n'
            '                <a href="sat.html" class="brand-item"><img src="assets/imgmarcas/SAT.png" alt="SAT"></a>',
            1,
        )

    (ROOT / "sat.html").write_text(html, encoding="utf-8")
    shutil.copyfile(ROOT / "assets/css/topaz.css", ROOT / "assets/css/sat.css")
    shutil.copyfile(ROOT / "assets/js/topaz.js", ROOT / "assets/js/sat.js")

    # marcas.html
    marcas = (ROOT / "marcas.html").read_text(encoding="utf-8")
    if "sat.html" not in marcas:
        card = """            <li class="brand-card">
              <a href="sat.html"><img src="assets/imgmarcas/SAT.png" alt="SAT" class="brand-logo"></a>
            </li>
"""
        marcas = marcas.replace(
            """            <li class="brand-card">
              <a href="ruijie.html"><img src="assets/imgmarcas/Ruijie.png" alt="Ruijie" class="brand-logo"></a>
            </li>""",
            """            <li class="brand-card">
              <a href="ruijie.html"><img src="assets/imgmarcas/Ruijie.png" alt="Ruijie" class="brand-logo"></a>
            </li>
"""
            + card,
        )
        (ROOT / "marcas.html").write_text(marcas, encoding="utf-8")

    # public copies
    public = ROOT / "public"
    if public.exists():
        shutil.copyfile(ROOT / "sat.html", public / "sat.html")
        shutil.copyfile(ROOT / "assets/css/sat.css", public / "assets/css/sat.css")
        shutil.copyfile(ROOT / "assets/js/sat.js", public / "assets/js/sat.js")
        shutil.copyfile(ROOT / "assets/imgmarcas/SAT.png", public / "assets/imgmarcas/SAT.png")
        shutil.copyfile(ROOT / "marcas.html", public / "marcas.html")

    print("created sat.html / sat.css / sat.js and updated marcas.html")


if __name__ == "__main__":
    main()
