"""
Convierte los registros crudos del Excel (con TODOS los campos, incluidos
los internos) en los registros públicos que se sirven en catalog.json.

Este es el único sitio del proyecto donde se decide, campo a campo, qué
pasa de "lo que hay en el Excel" a "lo que ve cualquier visitante de
internet". Cualquier cambio en qué se publica debe pasar por aquí (y por
config.PUBLIC_FIELDS).
"""
from __future__ import annotations


def build_public_record(raw: dict, numeric_id: int) -> dict:
    """A partir de un registro crudo (ver excel_reader.read_inventory),
    devuelve el diccionario público equivalente: exactamente los campos
    de config.PUBLIC_FIELDS, ninguno más."""
    return {
        "id": numeric_id,
        "reference": raw.get("reference"),
        "title": raw.get("title"),
        "subtitle": raw.get("subtitle"),
        "author": raw.get("author"),
        "edition": raw.get("edition"),
        "place": raw.get("place"),
        "publisher": raw.get("publisher"),
        "publication_year": raw.get("publication_year"),
        "topic": raw.get("topic"),
        "subtopic": raw.get("subtopic"),
        "speciality": raw.get("speciality"),
        "specifications": raw.get("specifications"),
        "language": raw.get("language"),
        "num_pages": raw.get("num_pages"),
        "illustrations": raw.get("illustrations"),
        "size_cm": raw.get("size_cm"),
        "series": raw.get("series"),
        "isbn": raw.get("isbn"),
        "is_digitized": bool(raw.get("is_digitized")),
        "digital_link": raw.get("digital_link"),
    }


def build_catalog(raw_inventory: list[dict]) -> list[dict]:
    return [
        build_public_record(raw, numeric_id=i + 1)
        for i, raw in enumerate(raw_inventory)
    ]
