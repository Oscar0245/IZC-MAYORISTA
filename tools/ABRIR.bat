@echo off
cd /d "%~dp0.."
rem Arranca vigilancia de precios en segundo plano (si no está ya)
wscript //nologo "%~dp0INICIAR_VIGILANCIA.vbs"
start "" "%CD%\index.html"
