"""
Utilidades de normalización de texto para el catálogo.

El Excel de inventario original mezcla mayúsculas/minúsculas y variantes de
idioma ("Inglés", "Ingles", "ingles", "Ingles / Español"...). Este módulo
centraliza:

  - Comparación insensible a mayúsculas/acentos (para buscador y
    deduplicación de listas de temas/idiomas).
  - Normalización de idiomas a una lista controlada de nombres canónicos,
    soportando varios idiomas en un mismo campo ("Inglés / Español").
  - Coincidencia de nombres de autor independiente del orden ("Nombre
    Apellidos" encuentra igual que "Apellidos Nombre").
"""
from __future__ import annotations

import re
import unicodedata


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize_key(text: str | None) -> str:
    """Clave de comparación insensible a mayúsculas, acentos y espacios extra."""
    if not text:
        return ""
    text = strip_accents(text).lower()
    return re.sub(r"\s+", " ", text).strip()


def tokenize(text: str | None) -> list[str]:
    """Tokeniza para búsquedas "contiene todas las palabras, en cualquier orden"."""
    key = normalize_key(text)
    return [t for t in key.split(" ") if t]


def tokens_match(haystack: str | None, query: str | None) -> bool:
    """True si TODAS las palabras de `query` aparecen en `haystack`, en
    cualquier orden — así "Nombre Apellidos" encuentra a alguien guardado
    como "Apellidos Nombre" y viceversa."""
    query_tokens = tokenize(query)
    if not query_tokens:
        return True
    haystack_key = normalize_key(haystack)
    return all(tok in haystack_key for tok in query_tokens)


# --- Idiomas -----------------------------------------------------------
# Vocabulario controlado de idiomas del catálogo. La clave es la forma
# normalizada (sin acentos, minúscula) de cada variante conocida; el valor
# es el nombre canónico que se muestra y se guarda.
_LANGUAGE_VARIANTS = {
    "espanol": "Español", "castellano": "Español", "es": "Español", "spanish": "Español", "spa": "Español",
    "ingles": "Inglés", "english": "Inglés", "en": "Inglés", "eng": "Inglés",
    "frances": "Francés", "french": "Francés", "fr": "Francés", "fre": "Francés", "fra": "Francés",
    "aleman": "Alemán", "german": "Alemán", "de": "Alemán", "ger": "Alemán", "deu": "Alemán",
    "italiano": "Italiano", "italian": "Italiano", "it": "Italiano", "ita": "Italiano",
    "portugues": "Portugués", "portuguese": "Portugués", "pt": "Portugués", "por": "Portugués",
    "catalan": "Catalán", "ca": "Catalán", "cat": "Catalán",
    "gallego": "Gallego", "gl": "Gallego", "glg": "Gallego",
    "euskera": "Euskera", "vasco": "Euskera", "eu": "Euskera", "eus": "Euskera", "baq": "Euskera",
    "ruso": "Ruso", "russian": "Ruso", "rus": "Ruso",
    "chino": "Chino", "chinese": "Chino", "chi": "Chino", "zho": "Chino",
    "japones": "Japonés", "japanese": "Japonés", "jpn": "Japonés",
    "arabe": "Árabe", "arabic": "Árabe", "ara": "Árabe",
    "latin": "Latín", "lat": "Latín",
    "multiple": "Varios idiomas", "varios": "Varios idiomas", "bilingue": "Varios idiomas", "mul": "Varios idiomas",
}

# Lista de idiomas para poblar el desplegable, en el orden en que se muestran.
LANGUAGE_CHOICES = [
    "Español", "Inglés", "Francés", "Alemán", "Italiano", "Portugués",
    "Catalán", "Gallego", "Euskera", "Ruso", "Chino", "Japonés", "Árabe", "Latín",
]

_LANGUAGE_SPLIT_RE = re.compile(r"\s*(?:/|,|;|\+|&|\by\b)\s*", re.IGNORECASE)
_IGNORED_LANGUAGE_TOKENS = {"und", "undetermined", "desconocido", "n/a", "na", "-"}


def canonical_language(token: str) -> str | None:
    """Devuelve el nombre canónico de un único idioma, o el propio texto
    (con mayúscula inicial) si no está en el vocabulario conocido — así no
    se pierden idiomas menos comunes que no estén en la lista."""
    token = token.strip()
    if not token:
        return None
    key = normalize_key(token)
    if key in _IGNORED_LANGUAGE_TOKENS:
        return None
    if key in _LANGUAGE_VARIANTS:
        return _LANGUAGE_VARIANTS[key]
    return token[:1].upper() + token[1:]


def normalize_language_field(raw: str | None) -> str | None:
    """Normaliza un campo de idioma libre, incluyendo combinaciones tipo
    "Ingles / Español", a una forma canónica: "Inglés / Español"."""
    if not raw or not raw.strip():
        return None
    parts = [p for p in _LANGUAGE_SPLIT_RE.split(raw) if p.strip()]
    seen = []
    for part in parts:
        canon = canonical_language(part)
        if canon and canon not in seen:
            seen.append(canon)
    return " / ".join(seen) if seen else None


def split_language_field(raw: str | None) -> list[str]:
    """Idiomas individuales contenidos en un campo (ya normalizado o no)."""
    normalized = normalize_language_field(raw)
    if not normalized:
        return []
    return [p.strip() for p in normalized.split("/") if p.strip()]


# --- Temas / Subtemas ----------------------------------------------------
def normalize_topic_field(raw: str | None) -> str | None:
    """Limpieza ligera (espacios) preservando la forma del texto: los temas
    son una taxonomía con mayúsculas con significado (p.ej. siglas)."""
    if not raw or not raw.strip():
        return None
    return re.sub(r"\s+", " ", raw).strip()


def dedupe_case_insensitive(values: list[str]) -> list[str]:
    """Deduplica una lista de textos ignorando mayúsculas/acentos,
    conservando la primera forma con la que aparece cada uno (ordenada)."""
    seen = {}
    for v in values:
        if not v:
            continue
        key = normalize_key(v)
        if key not in seen:
            seen[key] = v
    return [seen[k] for k in sorted(seen.keys())]


# --- Búsqueda avanzada -----------------------------------------------------
# Sintaxis soportada en el campo de "Búsqueda general" (`q`), inspirada en
# buscadores habituales (Google, Gmail...) para que resulte familiar sin
# necesidad de leer un manual:
#
#   "frase exacta"      -> debe aparecer tal cual (normalizada) en el texto
#   -palabra             -> excluye resultados que contengan esa palabra
#   palabra1|palabra2    -> basta con que aparezca una de las dos (OR)
#   palabra normal       -> debe aparecer (o una muy parecida, ver más abajo)
#
# Los términos sueltos, además, toleran una errata razonable: si la palabra
# exacta no aparece en el texto, se acepta una coincidencia muy cercana
# (distancia de edición pequeña) para no penalizar a quien escribe rápido o
# comete un error tipográfico. Las frases exactas y las exclusiones NO
# toleran erratas (serían ambiguas de por sí).

_QUERY_TOKEN_RE = re.compile(r'"([^"]+)"|(-?[^\s"]+)')


class ParsedQuery:
    """Resultado de `parse_advanced_query`: listas de condiciones a cumplir
    sobre un texto normalizado (ver `text_matches_query`)."""

    __slots__ = ("phrases", "exclude", "required", "or_groups")

    def __init__(self):
        self.phrases: list[str] = []       # todas deben aparecer literalmente
        self.exclude: list[str] = []        # ninguna puede aparecer
        self.required: list[str] = []       # cada una debe aparecer (con tolerancia a erratas)
        self.or_groups: list[list[str]] = []  # de cada grupo, basta una (con tolerancia a erratas)

    def is_empty(self) -> bool:
        return not (self.phrases or self.exclude or self.required or self.or_groups)


def parse_advanced_query(raw: str | None) -> ParsedQuery:
    """Interpreta la sintaxis de búsqueda avanzada descrita arriba."""
    parsed = ParsedQuery()
    if not raw or not raw.strip():
        return parsed

    for match in _QUERY_TOKEN_RE.finditer(raw):
        phrase, token = match.group(1), match.group(2)
        if phrase:
            key = normalize_key(phrase)
            if key:
                parsed.phrases.append(key)
            continue
        if not token:
            continue
        if token.startswith("-") and len(token) > 1:
            key = normalize_key(token[1:])
            if key:
                parsed.exclude.append(key)
            continue
        if "|" in token:
            group = [normalize_key(part) for part in token.split("|") if normalize_key(part)]
            if len(group) == 1:
                parsed.required.append(group[0])
            elif group:
                parsed.or_groups.append(group)
            continue
        key = normalize_key(token)
        if key:
            parsed.required.append(key)

    return parsed


def _fuzzy_contains(haystack_key: str, haystack_tokens: list[str], needle: str) -> bool:
    """True si `needle` aparece como subcadena de `haystack_key`, o si algún
    token de `haystack_tokens` es una errata razonable de `needle` (para
    palabras de al menos 4 letras; las más cortas no toleran erratas porque
    la ambigüedad sería demasiado alta, p.ej. "ars" vs "año").
    """
    if needle in haystack_key:
        return True
    if len(needle) < 4:
        return False
    max_distance = 1 if len(needle) <= 7 else 2
    for tok in haystack_tokens:
        if abs(len(tok) - len(needle)) > max_distance:
            continue
        if _levenshtein_at_most(needle, tok, max_distance):
            return True
    return False


def _levenshtein_at_most(a: str, b: str, max_distance: int) -> bool:
    """Distancia de edición entre `a` y `b`, con corte anticipado en cuanto
    se supera `max_distance` (no hace falta el valor exacto, solo saber si
    está dentro del umbral tolerado)."""
    if a == b:
        return True
    if abs(len(a) - len(b)) > max_distance:
        return False

    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        current = [i] + [0] * len(b)
        row_min = current[0]
        for j, cb in enumerate(b, start=1):
            cost = 0 if ca == cb else 1
            current[j] = min(
                previous[j] + 1,        # borrado
                current[j - 1] + 1,     # inserción
                previous[j - 1] + cost,  # sustitución
            )
            row_min = min(row_min, current[j])
        if row_min > max_distance:
            return False
        previous = current
    return previous[-1] <= max_distance


def text_matches_query(haystack: str | None, parsed: ParsedQuery) -> bool:
    """True si el texto `haystack` cumple todas las condiciones de
    `parsed` (frases exactas, exclusiones, términos obligatorios y grupos
    OR, estos dos últimos con tolerancia a erratas)."""
    if parsed.is_empty():
        return True

    haystack_key = normalize_key(haystack)
    if not haystack_key:
        return False
    haystack_tokens = haystack_key.split(" ")

    for phrase in parsed.phrases:
        if phrase not in haystack_key:
            return False

    for word in parsed.exclude:
        if word in haystack_key:
            return False

    for word in parsed.required:
        if not _fuzzy_contains(haystack_key, haystack_tokens, word):
            return False

    for group in parsed.or_groups:
        if not any(_fuzzy_contains(haystack_key, haystack_tokens, word) for word in group):
            return False

    return True
