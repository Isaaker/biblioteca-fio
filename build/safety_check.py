"""
Salvaguarda final antes de publicar nada.

Comprueba, de dos formas independientes, que ningún dato interno se ha
colado en las salidas públicas:

1. Estructural: cada diccionario de libro público solo puede tener las
   claves listadas en config.PUBLIC_FIELDS (nunca las de
   config.INTERNAL_FIELDS).
2. De contenido, POR LIBRO, A MODO DE AVISO (no bloquea el build): si
   el texto de un valor interno de un libro (notas, donante,
   signatura...) aparece también en el registro público de ESE MISMO
   libro, se imprime un aviso para revisión humana. Esto puede saltar
   por dos motivos muy distintos:
     a) Un bug real (p. ej. que catalog_builder.py copie por error
        `raw["notes"]` bajo una clave pública) — el motivo que este
        aviso está pensado para detectar.
     b) Una coincidencia de datos completamente legítima: por ejemplo,
        la nota interna de un libro y el nombre de su colección
        pública son, por casualidad, el mismo texto (ha pasado en la
        práctica: nota interna "Biblioteca de Historia" == colección
        pública "Biblioteca de Historia").
   Como no se puede distinguir (a) de (b) automáticamente, este aviso
   NO aborta la publicación — solo la garantía estructural del punto 1
   lo hace. Revisa el aviso en el log de GitHub Actions; si es un caso
   (b), no hay que hacer nada.

MARC21/MARCXML no se comprueban aparte: se generan siempre a partir de
los mismos registros públicos ya validados en el punto 2 (ver
build/marc21_export.py, que solo recibe `public_records`, nunca los
datos internos), así que quedan cubiertos transitivamente.

Si algo falla, se lanza SafetyCheckError y build/generate_catalog.py
termina con exit code distinto de 0: el workflow de GitHub Actions NO
publica el sitio.
"""
from __future__ import annotations

import json

from config import INTERNAL_FIELDS, PUBLIC_FIELDS


class SafetyCheckError(Exception):
    """El build detectó un dato interno en una salida pública."""


def check_public_record_keys(public_record: dict) -> None:
    """Comprueba que un registro público no contenga ninguna clave interna
    ni ninguna clave fuera de la lista blanca PUBLIC_FIELDS."""
    keys = set(public_record.keys())

    leaked = keys & INTERNAL_FIELDS
    if leaked:
        raise SafetyCheckError(
            f"Campo(s) interno(s) presentes en un registro público: {sorted(leaked)} "
            f"(referencia: {public_record.get('reference')!r}). Corrige build/catalog_builder.py."
        )

    unexpected = keys - set(PUBLIC_FIELDS)
    if unexpected:
        raise SafetyCheckError(
            f"Campo(s) no incluidos en config.PUBLIC_FIELDS presentes en un registro público: "
            f"{sorted(unexpected)} (referencia: {public_record.get('reference')!r}). "
            f"Añádelos a PUBLIC_FIELDS si de verdad deben ser públicos, o elimínalos si no."
        )


def check_no_internal_text_leaked(raw_inventory: list[dict], public_records: list[dict]) -> list[str]:
    """Para cada libro, comprueba si alguno de sus propios valores
    internos (notas, donante, medidas, signatura...) aparece también en
    SU PROPIO registro público. Devuelve la lista de avisos encontrados
    (puede estar vacía); NO lanza excepción — ver el porqué en la
    cabecera de este fichero (punto 2): con datos reales, coincidencias
    de texto legítimas entre un campo interno y uno público del mismo
    libro son posibles y no implican una fuga.
    """
    warnings: list[str] = []
    public_by_ref = {r["reference"]: r for r in public_records if r.get("reference")}

    for raw in raw_inventory:
        reference = raw.get("reference")
        public = public_by_ref.get(reference)
        if public is None:
            continue
        public_text = json.dumps(public, ensure_ascii=False)

        for field in INTERNAL_FIELDS:
            value = raw.get(field)
            if value is None:
                continue
            text = str(value).strip()
            # Se ignoran valores muy cortos (< 6 caracteres): dan demasiados
            # falsos positivos incluso comparando dentro del mismo libro
            # (p. ej. una signatura corta que coincida con un fragmento de
            # su propio ISBN).
            if len(text) < 6:
                continue
            if text in public_text:
                warnings.append(
                    f"Aviso: el valor interno del campo '{field}' del libro '{reference}' "
                    f"también aparece en el registro público de ese mismo libro "
                    f"(puede ser una coincidencia legítima — revisar)."
                )

    return warnings

