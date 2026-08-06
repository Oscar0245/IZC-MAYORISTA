# Point brand-page price loaders at IZCPrices (supports COP for etiquetas/ribbons).
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

OLD = """      if (!mapaPrecios) return;

      document.querySelectorAll('.product-card, .product-carddatalogic').forEach(tarjeta => {
        const skuElem = tarjeta.querySelector('.sku');
        const priceElem = tarjeta.querySelector('.price');
        if (!skuElem || !priceElem) return;

        const skuTexto = skuElem.textContent.replace(/\\D/g, '').trim();
        if (!skuTexto) return;

        let precioUSD = mapaPrecios[skuTexto];
        if (precioUSD == null) {
          const skuSinCeros = skuTexto.replace(/^0+/, '');
          precioUSD = mapaPrecios[skuSinCeros];
        }

        if (precioUSD != null) {
          priceElem.textContent = `$ ${Number(precioUSD).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`;
        }
      });"""

NEW = """      if (!mapaPrecios) return;

      if (window.IZCPrices && typeof window.IZCPrices.apply === 'function') {
        window.IZCPrices.apply();
        return;
      }

      function formatEntry(entry) {
        if (entry == null) return null;
        if (typeof entry === 'object' && entry.currency === 'COP') {
          return '$ ' + Math.round(Number(entry.amount)).toLocaleString('es-CO') + ' COP';
        }
        var amount = typeof entry === 'object' ? entry.amount : entry;
        if (amount == null) return null;
        return '$ ' + Number(amount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }

      document.querySelectorAll('.product-card, .product-carddatalogic').forEach(tarjeta => {
        const skuElem = tarjeta.querySelector('.sku');
        const priceElem = tarjeta.querySelector('.price');
        if (!skuElem || !priceElem) return;

        const skuTexto = skuElem.textContent.replace(/\\D/g, '').trim();
        if (!skuTexto) return;

        let entry = mapaPrecios[skuTexto];
        if (entry == null) {
          const skuSinCeros = skuTexto.replace(/^0+/, '');
          entry = mapaPrecios[skuSinCeros];
        }

        const text = formatEntry(entry);
        if (text) priceElem.textContent = text;
      });"""

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
    "sat.js",
]


def main() -> None:
    for name in FILES:
        path = ROOT / "assets" / "js" / name
        text = path.read_text(encoding="utf-8")
        if OLD not in text:
            print(f"{name}: pattern not found")
            continue
        path.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")
        print(f"{name}: patched")

    # producto.js / brand_catalog if they format USD only
    for name in ("producto.js", "brand_catalog.js"):
        path = ROOT / "assets" / "js" / name
        text = path.read_text(encoding="utf-8")
        if "toLocaleString('en-US'" in text and "IZCPrices" in text:
            print(f"{name}: uses IZCPrices already / check manually")
        elif "currency === 'COP'" in text:
            print(f"{name}: already COP-aware")
        else:
            print(f"{name}: needs review")


if __name__ == "__main__":
    main()
