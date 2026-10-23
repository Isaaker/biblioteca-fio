#!/usr/bin/env python3
"""Construye localmente el sitio estático de Biblioteca FIO.

Replica los pasos relevantes de .github/workflows/build-and-deploy.yml:
1. Ejecuta build/generate_catalog.py.
2. Prepara una copia limpia de site/ en una carpeta temporal.
3. Impide publicar cualquier fichero .xlsx dentro del sitio generado.
4. Sustituye dist/ solo después de que todas las comprobaciones pasen.

Uso habitual:
    python scripts/build_local.py

Instalar dependencias dentro de un entorno virtual:
    python scripts/build_local.py --install-deps

Solo para una primera publicación intencionadamente vacía:
    python scripts/build_local.py --allow-empty-catalog
"""
from __future__ import annotations

import argparse
import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent  # este script vive en scripts/; la raíz del repo es su carpeta padre
REQUIREMENTS = SCRIPT_DIR / "requirements-local-build.txt"
GENERATOR = ROOT / "build" / "generate_catalog.py"
SITE = ROOT / "site"
DIST = ROOT / "dist"
REQUIRED_MODULES = ("openpyxl", "pymarc")


def log(message: str = "") -> None:
    print(message, flush=True)


def run_command(command: list[str], *, env: dict[str, str] | None = None) -> int:
    """Ejecuta un comando mostrando su salida en tiempo real."""
    try:
        completed = subprocess.run(command, cwd=ROOT, env=env, check=False)
    except OSError as exc:
        log(f"ERROR: no se pudo ejecutar {command[0]!r}: {exc}")
        return 1
    return completed.returncode


def missing_dependencies() -> list[str]:
    return [name for name in REQUIRED_MODULES if importlib.util.find_spec(name) is None]


def ensure_dependencies(install: bool) -> bool:
    if not REQUIREMENTS.is_file():
        log(f"ERROR: no se encuentra el fichero de dependencias: {REQUIREMENTS}")
        return False

    if install:
        log("\n[1/4] Instalando dependencias de scripts/requirements-local-build.txt...")
        code = run_command([
            sys.executable, "-m", "pip", "install", "-r", str(REQUIREMENTS)
        ])
        if code != 0:
            log("ERROR: falló la instalación de dependencias.")
            return False
    else:
        log("\n[1/4] Comprobando dependencias de Python...")

    missing = missing_dependencies()
    if missing:
        names = ", ".join(missing)
        log(f"ERROR: faltan dependencias de Python: {names}")
        log("Activa tu entorno virtual y ejecuta:")
        log("  python -m pip install -r scripts/requirements-local-build.txt")
        log("O vuelve a ejecutar este script con --install-deps.")
        return False
    return True


def find_xlsx_files(folder: Path) -> list[Path]:
    return sorted(
        path for path in folder.rglob("*")
        if path.is_file() and path.suffix.lower() == ".xlsx"
    )


def replace_dist_atomically(staged_dist: Path) -> None:
    """Reemplaza dist/ solo después de que el nuevo sitio esté validado.

    Conserva la versión anterior de dist/ si falla el cambio de nombre.
    Las carpetas temporales están dentro del repositorio para que el cambio
    de nombre ocurra en el mismo sistema de archivos.
    """
    backup: Path | None = None

    if DIST.exists():
        backup = ROOT / f".dist-backup-{uuid.uuid4().hex}"
        os.replace(DIST, backup)

    try:
        os.replace(staged_dist, DIST)
    except OSError:
        if backup is not None and backup.exists() and not DIST.exists():
            os.replace(backup, DIST)
        raise
    else:
        if backup is not None and backup.exists():
            shutil.rmtree(backup)


def build(args: argparse.Namespace) -> int:
    if sys.version_info < (3, 10):
        log("ERROR: se necesita Python 3.10 o superior; el workflow de GitHub usa Python 3.12.")
        return 2

    if not GENERATOR.is_file() or not SITE.is_dir():
        log("ERROR: este script debe estar en la carpeta scripts/ del repositorio Biblioteca FIO.")
        log(f"Se esperaba el generador en: {GENERATOR}")
        return 2

    log("Biblioteca FIO — build local")
    log(f"Raíz: {ROOT}")
    log(f"Python: {sys.version.split()[0]} ({sys.executable})")

    if not ensure_dependencies(args.install_deps):
        return 2

    log("\n[2/4] Generando catálogo, índices y exportaciones MARC...")
    env = os.environ.copy()
    # Replica el comportamiento predeterminado de GitHub Actions: un catálogo
    # vacío bloquea el build salvo que se habilite expresamente.
    env["ALLOW_EMPTY_CATALOG"] = "1" if args.allow_empty_catalog else "0"
    code = run_command([sys.executable, str(GENERATOR)], env=env)
    if code != 0:
        log("\nERROR: falló la generación del catálogo. No se ha sustituido dist/.")
        return code or 1

    stage_parent: Path | None = None
    try:
        log("\n[3/4] Preparando carpeta publicable desde site/...")
        stage_parent = Path(tempfile.mkdtemp(prefix=".dist-build-", dir=ROOT))
        staged_dist = stage_parent / "dist"
        shutil.copytree(SITE, staged_dist)

        if not (staged_dist / "index.html").is_file():
            log("ERROR: site/index.html no existe; se cancela el build.")
            return 1

        xlsx_files = find_xlsx_files(staged_dist)
        if xlsx_files:
            log("ERROR: se han encontrado ficheros .xlsx dentro de la salida publicable:")
            for path in xlsx_files:
                log(f"  - {path.relative_to(staged_dist)}")
            log("No se ha sustituido dist/. El Excel maestro no debe publicarse.")
            return 1
        log("OK: no hay ningún fichero .xlsx en la salida publicable.")

        log("\n[4/4] Actualizando dist/...")
        replace_dist_atomically(staged_dist)
    except OSError as exc:
        log(f"ERROR preparando o actualizando dist/: {exc}")
        return 1
    finally:
        if stage_parent is not None and stage_parent.exists():
            shutil.rmtree(stage_parent, ignore_errors=True)

    log("\nBUILD COMPLETADO")
    log(f"Salida: {DIST}")
    log("Para probar la web localmente, ejecuta:")
    log("  python -m http.server 8000 --directory dist")
    log("Y abre http://localhost:8000")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Construye localmente Biblioteca FIO y valida la carpeta dist/."
    )
    parser.add_argument(
        "--install-deps",
        action="store_true",
        help="instala scripts/requirements-local-build.txt usando el Python que ejecuta este script",
    )
    parser.add_argument(
        "--allow-empty-catalog",
        action="store_true",
        help="permite generar un catálogo con cero libros (solo para el arranque inicial)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(build(parse_args()))
