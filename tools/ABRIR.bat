@echo off
REM Abre el sitio local (index.html) y arranca la vigilancia de precios.
cd /d "%~dp0.."
rem Arranca vigilancia de precios en segundo plano (si no está ya)
wscript //nologo "%~dp0INICIAR_VIGILANCIA.vbs"
start "" "%CD%\index.html"
