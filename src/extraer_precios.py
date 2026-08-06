"""Extrae precios USD (columna BM) por SKU (columna Stone / A) desde
lista-precios-izc.xlsb y guarda assets/files/precios.json.

Actualización automática (recomendado):
  Al abrir una página vía XAMPP, precios.php detecta si el Excel es más nuevo
  y ejecuta este script solo cuando hace falta.

Manual:
  python src/extraer_precios.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
RUTA_EXCEL = BASE_DIR / "assets" / "files" / "lista-precios-izc.xlsb"
RUTA_JSON = BASE_DIR / "assets" / "files" / "precios.json"
RUTA_PRODUCTOS_JSON = BASE_DIR / "assets" / "files" / "productos.json"

STONE_COL = 0
NAME_COL = 2
USD_COL = 64  # Columna BM
START_ROW = 3


def limpiar_sku(valor) -> str | None:
    if pd.isna(valor):
        return None
    sku = str(valor).strip()
    if sku.endswith(".0"):
        sku = sku[:-2]
    return sku or None


def limpiar_precio(valor) -> float | None:
    if pd.isna(valor):
        return None
    if isinstance(valor, (int, float)):
        return float(valor) if valor > 0 else None
    try:
        texto = str(valor).replace("$", "").replace(" ", "").strip()
        if "," in texto and "." in texto:
            texto = texto.replace(".", "").replace(",", ".")
        elif "," in texto:
            texto = texto.replace(",", ".")
        numero = float(texto)
    except ValueError:
        return None
    return numero if numero > 0 else None


def extraer_precios_stone_usd() -> dict[str, float]:
    if not RUTA_EXCEL.exists():
        raise FileNotFoundError(f"No se encontro el Excel en {RUTA_EXCEL}")

    df = pd.read_excel(RUTA_EXCEL, engine="pyxlsb", header=None)
    mapa_precios: dict[str, float] = {}

    for i in range(START_ROW, len(df)):
        fila = df.iloc[i]
        sku = limpiar_sku(fila[STONE_COL])
        precio = limpiar_precio(fila[USD_COL]) if len(fila) > USD_COL else None
        if not sku or precio is None:
            continue

        mapa_precios[sku] = precio
        sku_sin_ceros = sku.lstrip("0")
        if sku_sin_ceros:
            mapa_precios[sku_sin_ceros] = precio

    return mapa_precios


def extraer_nombres_stone() -> dict[str, str]:
    if not RUTA_EXCEL.exists():
        raise FileNotFoundError(f"No se encontro el Excel en {RUTA_EXCEL}")

    df = pd.read_excel(RUTA_EXCEL, engine="pyxlsb", header=None)
    mapa_nombres: dict[str, str] = {}

    for i in range(START_ROW, len(df)):
        fila = df.iloc[i]
        sku = limpiar_sku(fila[STONE_COL])
        if not sku or len(fila) <= NAME_COL:
            continue
        nombre = fila[NAME_COL]
        if pd.isna(nombre):
            continue
        texto = str(nombre).strip()
        if not texto:
            continue

        mapa_nombres[sku] = texto
        sku_sin_ceros = sku.lstrip("0")
        if sku_sin_ceros:
            mapa_nombres[sku_sin_ceros] = texto

    return mapa_nombres


def guardar_precios(mapa: dict[str, float]) -> None:
    RUTA_JSON.parent.mkdir(parents=True, exist_ok=True)
    RUTA_JSON.write_text(
        json.dumps(mapa, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def guardar_productos(mapa: dict[str, str]) -> None:
    RUTA_PRODUCTOS_JSON.parent.mkdir(parents=True, exist_ok=True)
    RUTA_PRODUCTOS_JSON.write_text(
        json.dumps(mapa, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    print(f"Leyendo Excel: {RUTA_EXCEL}")
    precios = extraer_precios_stone_usd()
    productos = extraer_nombres_stone()
    guardar_precios(precios)
    guardar_productos(productos)
    print(f"Listo: {len(precios)} precios -> {RUTA_JSON}")
    print(f"Listo: {len(productos)} nombres -> {RUTA_PRODUCTOS_JSON}")
    for sku in ("4031", "6513", "4041", "13"):
        if sku in precios:
            print(f"  {sku}: ${precios[sku]:.2f}")
        if sku in productos:
            print(f"  {sku}: {productos[sku][:60]}...")
