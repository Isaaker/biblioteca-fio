"""
Genera, además del catalog.json completo (para el frontend), un juego
de ficheros pensados específicamente para que un asistente de IA (o
cualquier script) pueda descargar y procesar el catálogo sin toparse
con límites de tamaño de descarga o de contexto:

  - data/catalog.json           el catálogo COMPLETO, minificado (sin
                                 indentado: mismo contenido que antes,
                                 pero bastantes menos bytes). Lo sigue
                                 usando el frontend tal cual.
  - data/catalog-lite.json      igual que el anterior pero solo con
                                 los campos imprescindibles para
                                 recomendar libros (título, autor,
                                 tema, año, idioma, referencia, ISBN,
                                 digitalización) — mucho más ligero,
                                 pensado como primera opción para IA.
  - data/catalog-part-N.json    el catálogo completo troceado en
                                 partes de ~500 libros cada una, para
                                 herramientas con un límite de tamaño
                                 de descarga por fichero.
  - data/catalog-index.json     manifiesto: cuántas partes hay, cuántos
                                 libros por parte y el tamaño aproximado
                                 de cada fichero, para que un asistente
                                 pueda decidir qué descargar primero.

Por qué hacía falta: con ~3.500 libros, catalog.json con indentado
ocupa más de 2 MB — algunas herramientas de IA fallan al descargar o
procesar un fichero de ese tamaño de una sola vez. Minificar ya reduce
bastante; catalog-lite.json y el troceado son la solución real para
las herramientas más limitadas.
"""
from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone

RECORDS_PER_PART = 500

LITE_FIELDS = [
    "id", "reference", "title", "author", "topic", "subtopic",
    "publication_year", "language", "isbn", "is_digitized", "digital_link",
]


def _generated_at() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_full_catalog_minified(public_records: list[dict], path: str) -> int:
    """Escribe catalog.json minificado (sin indentado). Devuelve el
    tamaño en bytes del fichero escrito."""
    payload = {
        "generated_at": _generated_at(),
        "record_count": len(public_records),
        "records": public_records,
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path)


def write_lite_catalog(public_records: list[dict], path: str) -> int:
    lite_records = [
        {field: record.get(field) for field in LITE_FIELDS}
        for record in public_records
    ]
    payload = {
        "generated_at": _generated_at(),
        "record_count": len(lite_records),
        "note": "Versión reducida de catalog.json, solo con los campos esenciales. "
                "Para el registro completo de un libro, usa data/catalog.json o "
                "data/catalog-part-N.json (ver data/catalog-index.json).",
        "records": lite_records,
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path)


def write_chunked_catalog(public_records: list[dict], data_dir: str) -> list[dict]:
    """Escribe data/catalog-part-1.json, -2.json, etc. Devuelve la lista
    de metadatos de cada parte (para el índice)."""
    total = len(public_records)
    total_parts = max(1, math.ceil(total / RECORDS_PER_PART))
    parts_meta = []

    for part_num in range(1, total_parts + 1):
        start = (part_num - 1) * RECORDS_PER_PART
        end = min(start + RECORDS_PER_PART, total)
        chunk = public_records[start:end]

        part_path = os.path.join(data_dir, f"catalog-part-{part_num}.json")
        payload = {
            "generated_at": _generated_at(),
            "part": part_num,
            "total_parts": total_parts,
            "record_range": [start + 1, end],  # 1-indexado, inclusive, para humanos
            "record_count": len(chunk),
            "records": chunk,
        }
        with open(part_path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))

        parts_meta.append({
            "part": part_num,
            "file": f"catalog-part-{part_num}.json",
            "record_count": len(chunk),
            "record_range": [start + 1, end],
            "size_bytes": os.path.getsize(part_path),
        })

    # Limpia partes antiguas que hayan sobrado si el catálogo ha
    # encogido desde el build anterior (p. ej. de 8 partes a 6).
    part_num = total_parts + 1
    while True:
        leftover = os.path.join(data_dir, f"catalog-part-{part_num}.json")
        if not os.path.isfile(leftover):
            break
        os.remove(leftover)
        part_num += 1

    return parts_meta


def write_catalog_index(parts_meta: list[dict], full_size: int, lite_size: int, path: str) -> None:
    payload = {
        "generated_at": _generated_at(),
        "note": "Manifiesto para asistentes de IA y scripts: qué ficheros del "
                "catálogo existen y cuánto pesa cada uno, para elegir cuál "
                "descargar según los límites de la herramienta. Ver también /llm.txt.",
        "files": {
            "catalog_full": {"file": "catalog.json", "size_bytes": full_size,
                              "description": "Catálogo completo, un único fichero."},
            "catalog_lite": {"file": "catalog-lite.json", "size_bytes": lite_size,
                              "description": "Catálogo completo pero solo con los campos "
                                              "esenciales (título, autor, tema, año, idioma, "
                                              "ISBN, referencia, digitalización). Recomendado "
                                              "como primera opción para asistentes de IA."},
            "catalog_parts": parts_meta,
        },
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
