#!/usr/bin/env python3
"""
Genera el catálogo público de la Biblioteca FIO a partir del Excel maestro.

Uso:
    python build/generate_catalog.py

Lee data/indice_general.xlsx (ver build/config.py) y genera:
  - site/data/catalog.json       catálogo público en JSON, para el frontend
  - site/data/catalogo.mrc       exportación MARC21 binaria (ISO 2709)
  - site/data/catalogo_marcxml.xml  exportación MARCXML

Antes de terminar, comprueba que ningún dato interno (notas, donante,
signatura, medidas, estado de conservación detallado...) se ha colado en
esas tres salidas. Si detecta algo, termina con exit code 1 y NO deja el
sitio en un estado publicable — el workflow de GitHub Actions no
continuará con el despliegue (ver .github/workflows/build-and-deploy.yml).
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from excel_reader import read_inventory, ExcelReadError
from catalog_builder import build_catalog
from marc21_export import write_marc_collection
from safety_check import check_public_record_keys, check_no_internal_text_leaked, SafetyCheckError
from digitized_overrides import load_digitized_overrides, apply_digitized_overrides, DigitizedFileError
from ai_catalog_formats import (
    write_full_catalog_minified,
    write_lite_catalog,
    write_chunked_catalog,
    write_catalog_index,
)
from book_files import write_book_files, write_ref_index
from sitemap_builder import write_sitemap


def _project_root() -> str:
    # build/generate_catalog.py -> raíz del repo
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _abs(root: str, relative_path: str) -> str:
    return os.path.join(root, relative_path)


def main() -> int:
    root = _project_root()
    excel_path = _abs(root, config.EXCEL_PATH)

    if not os.path.isfile(excel_path):
        print(f"ERROR: no se encuentra el Excel maestro en '{excel_path}'.", file=sys.stderr)
        print(
            "Comprueba que el fichero se ha subido a esa ruta exacta del repositorio "
            "(ver README.md).",
            file=sys.stderr,
        )
        return 1

    print(f"Leyendo inventario desde: {excel_path}")
    try:
        raw_inventory = list(read_inventory(excel_path))
    except ExcelReadError as exc:
        print(f"ERROR al leer el Excel: {exc}", file=sys.stderr)
        return 1

    if not raw_inventory:
        # Salvaguarda: un catálogo con 0 libros casi siempre significa un
        # Excel corrupto, mal subido, o con la hoja/fila de cabecera
        # cambiada por error — publicar eso vaciaría de golpe el catálogo
        # público. Por eso se aborta por defecto. La única excepción
        # deliberada es la variable de entorno ALLOW_EMPTY_CATALOG=1
        # (ver .github/workflows/build-and-deploy.yml, opción manual
        # "Permitir catálogo vacío"), pensada para el arranque inicial del
        # sitio (fase 1: web publicada con el Excel maestro aún vacío,
        # antes de que exista el repositorio privado con datos reales).
        if os.environ.get("ALLOW_EMPTY_CATALOG") == "1":
            print(
                "::warning::El Excel no contiene ningún libro (0 filas con Clave). "
                "Continuando de todos modos porque ALLOW_EMPTY_CATALOG=1 "
                "(pensado solo para el arranque inicial del sitio)."
            )
        else:
            print("ERROR: el Excel se ha leído pero no contiene ningún libro (0 filas con Clave).", file=sys.stderr)
            print(
                "Si esto es intencionado (por ejemplo, primera publicación del sitio "
                "sin datos reales todavía), relanza el workflow a mano desde la pestaña "
                "'Actions' marcando la opción 'Permitir catálogo vacío'.",
                file=sys.stderr,
            )
            return 1

    print(f"  {len(raw_inventory)} libros leídos del Excel.")

    digitized_path = _abs(root, "data/digitalizados.json")
    try:
        overrides = load_digitized_overrides(digitized_path)
    except DigitizedFileError as exc:
        print(f"ERROR en data/digitalizados.json: {exc}", file=sys.stderr)
        return 1

    if overrides:
        not_found = apply_digitized_overrides(raw_inventory, overrides)
        print(f"  {len(overrides)} enlace(s) de digitalización aplicados desde data/digitalizados.json.")
        if not_found:
            print(
                f"::warning::{len(not_found)} referencia(s) de data/digitalizados.json no existen "
                f"en el Excel (revisar posible error tipográfico): {', '.join(not_found)}"
            )

    print("Construyendo registros públicos...")
    public_records = build_catalog(raw_inventory)

    print("Comprobando que ningún registro público contiene campos internos...")
    try:
        for record in public_records:
            check_public_record_keys(record)
    except SafetyCheckError as exc:
        print(f"FALLO DE SEGURIDAD (estructural): {exc}", file=sys.stderr)
        return 1

    catalog_json_path = _abs(root, config.CATALOG_JSON_PATH)
    marc_binary_path = _abs(root, config.MARC_BINARY_PATH)
    marc_xml_path = _abs(root, config.MARC_XML_PATH)

    os.makedirs(os.path.dirname(catalog_json_path), exist_ok=True)
    os.makedirs(os.path.dirname(marc_binary_path), exist_ok=True)
    os.makedirs(os.path.dirname(marc_xml_path), exist_ok=True)

    print(f"Escribiendo {catalog_json_path} (minificado) ...")
    full_size = write_full_catalog_minified(public_records, catalog_json_path)

    lite_path = _abs(root, "site/data/catalog-lite.json")
    print(f"Escribiendo {lite_path} (solo campos esenciales, para IA) ...")
    lite_size = write_lite_catalog(public_records, lite_path)

    data_dir = os.path.dirname(catalog_json_path)
    print(f"Troceando el catálogo en partes de hasta 500 libros dentro de {data_dir} ...")
    parts_meta = write_chunked_catalog(public_records, data_dir)
    print(f"  {len(parts_meta)} parte(s) generada(s).")

    index_path = _abs(root, "site/data/catalog-index.json")
    write_catalog_index(parts_meta, full_size, lite_size, index_path)
    print(f"  Manifiesto escrito en {index_path}.")
    print(f"  Tamaño de catalog.json: {full_size / 1024:.0f} KB | catalog-lite.json: {lite_size / 1024:.0f} KB")

    books_dir = _abs(root, config.BOOKS_DIR)
    print(f"Escribiendo un JSON por libro en {books_dir} (para que libro.html no dependa del catálogo completo) ...")
    book_files_count = write_book_files(public_records, books_dir)
    print(f"  {book_files_count} fichero(s) de libro escrito(s).")

    ref_index_path = _abs(root, config.REF_INDEX_PATH)
    write_ref_index(public_records, ref_index_path)
    print(f"  Índice referencia -> id escrito en {ref_index_path}.")

    print(f"Escribiendo {marc_binary_path} y {marc_xml_path} ...")
    write_marc_collection(public_records, marc_binary_path, marc_xml_path)

    sitemap_path = _abs(root, "site/sitemap.xml")
    sitemap_urls = write_sitemap(public_records, sitemap_path)
    print(f"Sitemap escrito en {sitemap_path} ({sitemap_urls} URLs).")

    print("Comprobando que ningún dato interno se ha filtrado al registro público de cada libro...")
    text_warnings = check_no_internal_text_leaked(raw_inventory, public_records)
    if text_warnings:
        print(f"::warning::Se han encontrado {len(text_warnings)} coincidencia(s) de texto entre "
              f"campos internos y públicos (posibles falsos positivos, no bloquean la publicación):")
        for warning in text_warnings:
            print(f"  - {warning}")
    else:
        print("  Sin avisos.")

    print("OK. Catálogo público generado correctamente:")
    print(f"  - {catalog_json_path}")
    print(f"  - {lite_path}")
    print(f"  - {index_path} (+ {len(parts_meta)} fichero(s) catalog-part-N.json)")
    print(f"  - {books_dir}/ ({book_files_count} ficheros, uno por libro)")
    print(f"  - {ref_index_path}")
    print(f"  - {marc_binary_path}")
    print(f"  - {marc_xml_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
