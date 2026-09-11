#!/bin/bash
# Lanzador del catálogo portable de la Biblioteca FIO para Mac y Linux.
#
# En Mac: doble clic para ejecutar. La primera vez, macOS puede pedir
# confirmación (Ajustes del Sistema > Privacidad y seguridad > "Abrir
# de todos modos"), porque es un script descargado de fuera del App
# Store; es normal y solo hay que aceptarlo una vez.
#
# En Linux: si el doble clic no lo ejecuta, márcalo como ejecutable
# con: chmod +x EJECUTAR_CATALOGO_FIO.command
# y luego ejecútalo desde una terminal con: ./EJECUTAR_CATALOGO_FIO.command

cd "$(dirname "$0")"

echo "============================================================"
echo " Catálogo de la Biblioteca FIO — modo portable"
echo "============================================================"
echo ""

if command -v python3 >/dev/null 2>&1; then
    python3 servidor.py
elif command -v python >/dev/null 2>&1; then
    python servidor.py
else
    echo "No se ha encontrado Python 3 instalado en este ordenador."
    echo ""
    echo "En Mac, instala Python desde https://www.python.org/downloads/"
    echo "En Linux, instálalo con el gestor de paquetes de tu distribución"
    echo "(por ejemplo: sudo apt install python3)."
    echo ""
    echo "Alternativa sin instalar nada: abre la carpeta 'dist' y arrastra"
    echo "el archivo 'index.html' a una ventana de Firefox."
    echo ""
    read -p "Pulsa Enter para salir..."
fi
