@echo off
REM Instala el autoarranque de IZC al iniciar Windows (servidor + navegador).
cd /d "%~dp0"

echo Instalando auto-inicio de IZC al iniciar Windows...
echo - Servidor en http://127.0.0.1:8080
echo - Navegador con la tienda
echo.

wscript //nologo "%~dp0ABRIR.vbs"

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
copy /Y "%~dp0ABRIR.vbs" "%STARTUP%\IZC_ABRIR.vbs" >nul
if errorlevel 1 (
  echo ERROR: no se pudo copiar al inicio de Windows.
  pause
  exit /b 1
)

if exist "%STARTUP%\IZC_Servidor.vbs" (
  del "%STARTUP%\IZC_Servidor.vbs" >nul
  echo Se reemplazo el auto-inicio anterior del solo-servidor.
)

echo.
echo Listo.
echo - IZC se abrira solo al encender el PC / iniciar sesion
echo - Tambien puedes abrirlo cuando quieras con tools\ABRIR.bat
echo.
pause
