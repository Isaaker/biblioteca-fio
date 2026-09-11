#!/usr/bin/env python3
"""
Servidor local mínimo para el Catálogo de la Biblioteca FIO en modo portable.

Este script NO necesita instalar nada aparte de tener Python (que ya
viene instalado por defecto en Mac y en la mayoría de Linux; en Windows
hay que instalarlo una vez desde python.org, marcando la casilla
"Add python.exe to PATH").

Qué hace:
  1. Busca un puerto libre en el ordenador (para no chocar con otros programas).
  2. Levanta un servidor web muy simple que sirve los ficheros de la
     carpeta "dist/" (el propio catálogo) en http://localhost:PUERTO
  3. Abre automáticamente esa dirección en el navegador por defecto.
  4. Se queda funcionando hasta que cierres esta ventana (Ctrl+C también
     lo detiene).

No enruta nada a internet: solo sirve archivos que ya están en el
pendrive, en tu propio ordenador (localhost = tu propia máquina).
"""

import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser

# Carpeta donde están los ficheros del sitio (dist/), relativa a este script.
CARPETA_SITIO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


def puerto_libre():
    """Pide al sistema operativo un puerto libre cualquiera."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main():
    if not os.path.isdir(CARPETA_SITIO):
        print(f"ERROR: no encuentro la carpeta '{CARPETA_SITIO}'.")
        print("Este script debe estar en la misma carpeta que 'dist/'.")
        input("Pulsa Enter para salir...")
        sys.exit(1)

    os.chdir(CARPETA_SITIO)

    puerto = puerto_libre()
    handler = http.server.SimpleHTTPRequestHandler

    # allow_reuse_address evita el típico "Address already in use" si
    # se relanza el script justo después de cerrarlo.
    class Servidor(socketserver.TCPServer):
        allow_reuse_address = True

    httpd = Servidor(("127.0.0.1", puerto), handler)

    url = f"http://127.0.0.1:{puerto}/"
    print("=" * 60)
    print(" Catálogo de la Biblioteca FIO — modo portable")
    print("=" * 60)
    print(f" Sirviendo en: {url}")
    print(" Deja esta ventana abierta mientras uses el catálogo.")
    print(" Para cerrar: pulsa Ctrl+C o cierra esta ventana.")
    print("=" * 60)

    # Abrir el navegador un poco después de arrancar, en otro hilo,
    # para no bloquear el arranque del servidor.
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nCerrando servidor. ¡Hasta luego!")
        httpd.shutdown()


if __name__ == "__main__":
    main()
