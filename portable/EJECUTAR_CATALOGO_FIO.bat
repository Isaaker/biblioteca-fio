@echo off
chcp 65001 >nul
title Catalogo Biblioteca FIO
cd /d "%~dp0"

echo ============================================================
echo  Catalogo de la Biblioteca FIO - modo portable
echo ============================================================
echo.

where python >nul 2>nul
if %errorlevel%==0 (
    python servidor.py
    goto FIN
)

where py >nul 2>nul
if %errorlevel%==0 (
    py servidor.py
    goto FIN
)

echo No se ha encontrado Python instalado en este ordenador.
echo.
echo Para usar el catalogo portable necesitas Python 3 (es gratis):
echo   1. Ve a https://www.python.org/downloads/
echo   2. Descarga e instala la version para Windows.
echo   3. IMPORTANTE: durante la instalacion, marca la casilla
echo      "Add python.exe to PATH" antes de pulsar "Install Now".
echo   4. Cuando termine, vuelve a hacer doble clic en este archivo.
echo.
echo Alternativa sin instalar nada: abre la carpeta "dist" y arrastra
echo el archivo "index.html" a una ventana de Firefox (puede que
echo algunas partes del catalogo no funcionen igual de bien).
echo.
pause

:FIN
