"""
Genera un fichero JSON diminuto por cada libro (site/data/books/<id>.json)
y un índice referencia -> id (site/data/ref-index.json).

Por qué hace falta: libro.html solo necesita UN registro, pero antes
descargaba catalog.json entero (todo el catálogo, cientos de KB y
creciendo) solo para buscar ese registro por id en el cliente. Con
estos ficheros, la ficha de un libro puede cargar en cuanto llega su
propio JSON (unos pocos cientos de bytes), sin esperar al catálogo
completo.

Cada fichero de libro incluye también sus "relacionados" (mismo tema o
autor, calculado aquí en el build, en Python, sobre todo el catálogo)
para que la ficha no tenga que descargar el catálogo completo tampoco
para esa sección.
"""
from __future__ import annotations

import json
import os

RELATED_LIMIT = 6

RELATED_FIELDS = ("id", "title", "author", "reference", "publication_year")


def _related_for(book: dict, all_records: list[dict], limit: int = RELATED_LIMIT) -> list[dict]:
    seen = {book["id"]}
    related: list[dict] = []

    # Primera pasada: mismo tema o mismo autor (igual que hacía antes el
    # cliente en JS, fioGetSuggestionsForBook).
    for item in all_records:
        if item["id"] in seen:
            continue
        same_topic = bool(book.get("topic")) and item.get("topic") == book.get("topic")
        same_author = bool(book.get("author")) and item.get("author") == book.get("author")
        if same_topic or same_author:
            seen.add(item["id"])
            related.append(item)
            if len(related) >= limit:
                break

    # Relleno: si no hay suficientes relacionados por tema/autor, se
    # completa con otros libros cualquiera (mismo comportamiento de
    # respaldo que tenía la versión en JS).
    if len(related) < limit:
        for item in all_records:
            if item["id"] in seen:
                continue
            seen.add(item["id"])
            related.append(item)
            if len(related) >= limit:
                break

    return [{field: r.get(field) for field in RELATED_FIELDS} for r in related]


def write_book_files(public_records: list[dict], books_dir: str) -> int:
    """Escribe site/data/books/<id>.json para cada libro. Devuelve cuántos
    ficheros se han escrito. Borra ficheros de libros que ya no existan
    (p. ej. porque se han eliminado del Excel)."""
    os.makedirs(books_dir, exist_ok=True)

    existing = {f for f in os.listdir(books_dir) if f.endswith(".json")}
    written = set()

    for record in public_records:
        payload = {
            "book": record,
            "related": _related_for(record, public_records),
        }
        filename = f"{record['id']}.json"
        path = os.path.join(books_dir, filename)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
        written.add(filename)

    for stale in existing - written:
        os.remove(os.path.join(books_dir, stale))

    return len(written)


def write_ref_index(public_records: list[dict], path: str) -> int:
    """Escribe site/data/ref-index.json: {referencia: id}, para resolver
    enlaces ?ref=XXXX sin descargar el catálogo completo."""
    index = {
        record["reference"]: record["id"]
        for record in public_records
        if record.get("reference")
    }
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(index, fh, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path)
