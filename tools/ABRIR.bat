@echo off
REM Abre IZC en el navegador; el servidor se inicia solo si hace falta.
cd /d "%~dp0.."

if exist "%~dp0INICIAR_VIGILANCIA.vbs" (
  wscript //nologo "%~dp0INICIAR_VIGILANCIA.vbs"
)

wscript //nologo "%~dp0INICIAR_SERVIDOR.vbs"

REM Esperar un momento a que responda
set /a _n=0
:wait
set /a _n+=1
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080/data/usuarios.json -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL%==0 goto :open
if %_n% GEQ 8 goto :open
timeout /t 1 /nobreak >nul
goto :wait

:open
start "" "http://127.0.0.1:8080/index.html"
