"""
Carga data/digitalizados.json, el fichero donde se marca qué libros
tienen copia digital pública — separado a propósito del Excel maestro,
para que añadir un enlace de digitalización no requiera tocar el
inventario bibliográfico completo.

Formato del fichero (ver data/digitalizados.json para un ejemplo):

    {
      "LB0001": "https://drive.google.com/...",
      "LB0234": "https://..."
    }

La clave es la "referencia" del libro (columna A del Excel, ej.
LB0001) y el valor es el enlace público a la copia digital. Cualquier
clave que empiece por "_" se ignora (para poder dejar un comentario,
como en la plantilla). El fichero es opcional: si no existe, ningún
libro se marca como digitalizado por esta vía (solo por las columnas
Y/Z del Excel, si las usas).
"""
from __future__ import annotations

import json
import os


class DigitizedFileError(Exception):
    """El fichero data/digitalizados.json existe pero no se puede leer."""


def load_digitized_overrides(path: str) -> dict[str, str]:
    """Devuelve {referencia: enlace}. Si el fichero no existe, devuelve
    un diccionario vacío (no es un error: es opcional)."""
    if not os.path.isfile(path):
        return {}

    try:
        with open(path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    except json.JSONDecodeError as exc:
        raise DigitizedFileError(
            f"'{path}' no es un JSON válido: {exc}. Revisa que no falte o sobre alguna coma."
        ) from exc

    if not isinstance(raw, dict):
        raise DigitizedFileError(f"'{path}' debe ser un objeto JSON {{referencia: enlace}}.")

    overrides: dict[str, str] = {}
    for key, value in raw.items():
        if key.startswith("_"):
            continue  # comentarios / metadatos, se ignoran
        if not isinstance(value, str) or not value.strip():
            raise DigitizedFileError(
                f"En '{path}', la referencia '{key}' no tiene un enlace de texto válido."
            )
        overrides[key.strip().upper()] = value.strip()

    return overrides


def apply_digitized_overrides(raw_inventory: list[dict], overrides: dict[str, str]) -> list[str]:
    """Aplica los enlaces de digitalized.json sobre el inventario crudo
    (in-place: modifica is_digitized/digital_link de cada libro que
    coincida). Devuelve la lista de referencias del fichero que no se
    han encontrado en el Excel (probable error tipográfico), para
    avisar sin abortar el build.
    """
    by_reference = {b.get("reference", "").upper(): b for b in raw_inventory}
    not_found = []

    for reference, link in overrides.items():
        book = by_reference.get(reference)
        if book is None:
            not_found.append(reference)
            continue
        book["is_digitized"] = True
        book["digital_link"] = link

    return not_found
