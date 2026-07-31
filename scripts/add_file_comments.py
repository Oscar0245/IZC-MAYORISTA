"""One-shot: prepend short purpose comments to non-HTML source files."""
from pathlib import Path

ROOT = Path(r"C:\IZC")

COMMENTS = {
    # CSS
    "assets/css/index.css": "Estilos globales del sitio (header, nav, flyer, productos compartidos).",
    "assets/css/marcas.css": "Estilos de la página de listado de marcas.",
    "assets/css/buscar.css": "Estilos de la página de búsqueda de productos.",
    "assets/css/producto.css": "Estilos de la ficha de detalle de un producto.",
    "assets/css/sat.css": "Estilos específicos de la página de marca SAT.",
    "assets/css/datalogic.css": "Estilos específicos de la página de marca Datalogic.",
    "assets/css/elo.css": "Estilos específicos de la página de marca Elo.",
    "assets/css/hid.css": "Estilos específicos de la página de marca HID.",
    "assets/css/honeywell.css": "Estilos específicos de la página de marca Honeywell.",
    "assets/css/imou.css": "Estilos específicos de la página de marca IMOU.",
    "assets/css/ruijie.css": "Estilos específicos de la página de marca Ruijie.",
    "assets/css/topaz.css": "Estilos específicos de la página de marca Topaz.",
    "assets/css/zebra.css": "Estilos específicos de la página de marca Zebra.",
    "assets/css/zkteco.css": "Estilos específicos de la página de marca ZKTeco.",
    # JS app
    "assets/js/index.js": "Lógica del home: flyer de categorías y menú del buscador.",
    "assets/js/marcas.js": "Lógica de la página de marcas (flyer y carrusel).",
    "assets/js/buscar.js": "Filtra y muestra productos en la página de búsqueda.",
    "assets/js/search.js": "Buscador del header: sugiere y redirige resultados.",
    "assets/js/brand_catalog.js": "Carga el catálogo de cada marca y aplica filtros/categorías.",
    "assets/js/data-loader.js": "Carga JSON también en file:// usando archivos .data.js.",
    "assets/js/prices.js": "Aplica precios USD a las tarjetas de productos.",
    "assets/js/producto.js": "Muestra la ficha detallada de un producto por SKU.",
    "assets/js/favoritos.js": "Lista los productos guardados en favoritos.",
    "assets/js/wishlist.js": "Guarda/quita favoritos y actualiza el corazón del header.",
    "assets/js/sat.js": "Interacciones UI de la página SAT (filtros laterales, carrusel).",
    "assets/js/datalogic.js": "Interacciones UI de la página Datalogic.",
    "assets/js/elo.js": "Interacciones UI de la página Elo.",
    "assets/js/hid.js": "Interacciones UI de la página HID.",
    "assets/js/honeywell.js": "Interacciones UI de la página Honeywell.",
    "assets/js/imou.js": "Interacciones UI de la página IMOU.",
    "assets/js/ruijie.js": "Interacciones UI de la página Ruijie.",
    "assets/js/topaz.js": "Interacciones UI de la página Topaz.",
    "assets/js/zebra.js": "Interacciones UI de la página Zebra.",
    "assets/js/zkteco.js": "Interacciones UI de la página ZKTeco.",
    # data.js siblings
    "assets/files/catalogo.data.js": "Catálogo embebido para cargar productos sin servidor HTTP.",
    "assets/files/precios.data.js": "Precios embebidos para file:// / GitHub Pages.",
    "assets/files/brand_filters.data.js": "Filtros laterales de marcas embebidos (offline).",
    "assets/files/brand_products.data.js": "Productos por marca embebidos (offline).",
    "assets/files/categoria_skus.data.js": "SKUs por categoría embebidos (offline).",
    "assets/files/product_details.data.js": "Detalles de productos embebidos (offline).",
    # Python
    "src/extraer_precios.py": "Lee la lista de precios Excel y genera precios.json / .data.js.",
    "src/vigilar_precios.py": "Vigila cambios en el Excel y regenera precios automáticamente.",
    "src/generate_data_js.py": "Convierte los JSON del catálogo a archivos .data.js offline.",
    "src/inject_data_loader.py": "Inserta data-loader.js en las páginas HTML del sitio.",
    "src/ensure_prices_script.py": "Asegura que el script de precios esté en las páginas.",
    "src/sync_sat.py": "Sincroniza productos SAT desde izc.com.co al catálogo.",
    "src/sync_sat_details.py": "Descarga fichas/detalles de productos SAT.",
    "src/sync_sat_details_pass2.py": "Segunda pasada para completar detalles SAT faltantes.",
    "src/fix_sat_catalog.py": "Corrige/normaliza datos del catálogo SAT.",
    "src/create_sat_page.py": "Genera o actualiza la página HTML/CSS/JS de SAT.",
    "src/probe_satpcs.py": "Prueba/explora el sitio satpcs.com al scrapear SAT.",
    "src/probe_satpcs_fields.py": "Inspecciona campos de producto en satpcs.com.",
    "src/probe_satpcs_fields2.py": "Segunda inspección de campos en satpcs.com.",
    "src/probe_satpcs_product.py": "Prueba el scrape de un producto SAT concreto.",
    "src/probe_list_sku.py": "Lista/prueba SKUs durante el scrape SAT.",
    "src/test_sat_details.py": "Prueba unitaria/manual de detalles SAT.",
    "scripts/bump_index_assets.py": "Sube la versión ?v= de index.css/js en los HTML.",
    # tools
    "tools/ABRIR.bat": "Abre el sitio local (index.html) desde la carpeta tools.",
    "tools/ACTUALIZAR_PRECIOS.bat": "Ejecuta la extracción de precios desde el Excel.",
    "tools/VIGILAR_PRECIOS.bat": "Inicia el vigilante automático de precios.",
    "tools/INSTALAR_AUTO_PRECIOS.bat": "Instala la tarea/autoarranque del vigilante de precios.",
    "tools/INICIAR_VIGILANCIA.vbs": "Lanza el vigilante de precios en segundo plano (sin ventana).",
}


def already_commented(text: str, ext: str) -> bool:
    head = text.lstrip("\ufeff")[:200]
    if ext in {".js", ".css"}:
        return head.startswith("/*") and "sirve" in head.lower() or (
            head.startswith("/*") and "Estilos" in head[:120]
        ) or (head.startswith("/*") and ("Lógica" in head[:120] or "Carga" in head[:120] or "Aplica" in head[:120] or "Guarda" in head[:120] or "Lista" in head[:120] or "Muestra" in head[:120] or "Filtra" in head[:120] or "Interacciones" in head[:120] or "Catálogo" in head[:120] or "Precios" in head[:120] or "Filtros" in head[:120] or "Productos" in head[:120] or "SKUs" in head[:120] or "Detalles" in head[:120]))
    if ext == ".py":
        return head.startswith('"""') or head.startswith("# ")
    if ext in {".bat", ".cmd"}:
        return head.upper().startswith("@ECHO") or head.startswith("REM ") or head.startswith("::")
    if ext == ".vbs":
        return head.startswith("'")
    return False


def wrap(comment: str, ext: str) -> str:
    if ext in {".js", ".css"}:
        return f"/* {comment} */\n"
    if ext == ".py":
        return f'"""{comment}"""\n'
    if ext in {".bat", ".cmd"}:
        return f"REM {comment}\n"
    if ext == ".vbs":
        return f"' {comment}\n"
    return f"// {comment}\n"


def main():
    updated = []
    skipped = []
    for rel, comment in COMMENTS.items():
        path = ROOT / rel.replace("/", "\\")
        if not path.exists():
            skipped.append(f"missing {rel}")
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if already_commented(text, path.suffix.lower()):
            skipped.append(f"exists {rel}")
            continue
        # Avoid double-docstring on python that already has module docstring
        if path.suffix.lower() == ".py" and text.lstrip().startswith('"""'):
            skipped.append(f"docstring {rel}")
            continue
        new_text = wrap(comment, path.suffix.lower()) + text
        # Keep BOM-less UTF-8
        path.write_text(new_text, encoding="utf-8", newline="\n")
        updated.append(rel)

    print("updated", len(updated))
    for u in updated:
        print(" ", u)
    print("skipped", len(skipped))
    for s in skipped:
        print(" ", s)


if __name__ == "__main__":
    main()
