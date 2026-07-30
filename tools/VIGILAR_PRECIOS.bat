@echo off
cd /d "%~dp0.."
title IZC - Vigilancia de precios
echo Actualizacion automatica de precios (sin XAMPP)
echo.
python src\vigilar_precios.py
if errorlevel 1 (
  echo.
  echo ERROR: no se pudo ejecutar Python.
  echo Instala Python y las dependencias: pip install pandas pyxlsb
  pause
)
