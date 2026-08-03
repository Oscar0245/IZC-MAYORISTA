@echo off
REM Instala el autoarranque del servidor IZC al iniciar Windows.
cd /d "%~dp0"

echo Instalando servidor IZC automatico al iniciar Windows...
wscript //nologo "%~dp0INICIAR_SERVIDOR.vbs"

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
copy /Y "%~dp0INICIAR_SERVIDOR.vbs" "%STARTUP%\IZC_Servidor.vbs" >nul
if errorlevel 1 (
  echo ERROR: no se pudo copiar al inicio de Windows.
  pause
  exit /b 1
)

echo Listo.
echo - Servidor activo ahora en segundo plano (http://127.0.0.1:8080)
echo - Se iniciara solo al encender el PC / iniciar sesion
echo.
echo Abre el sitio con tools\ABRIR.bat o http://127.0.0.1:8080
pause
