"""
Configuración del generador estático del catálogo de la Biblioteca FIO.

Aquí se decide, en un único sitio, qué campos del Excel maestro son
públicos y cuáles son de gestión interna. Si mañana añades una columna
nueva al Excel y no sabes si debe publicarse, este es el fichero que hay
que tocar — no el script principal.
"""
from __future__ import annotations

# --- Origen de datos -------------------------------------------------------

# Ruta (relativa a la raíz del repo) del Excel maestro. El workflow de
# GitHub Actions sube el fichero a esta ruta antes de ejecutar el build.
EXCEL_PATH = "data/indice_general.xlsx"

# Nombre de la hoja del Excel que contiene el inventario y fila en la que
# está la cabecera (igual que en la app Flask original, library/excel_import.py).
SHEET_NAME = "Indice General"
HEADER_ROW = 2
FIRST_DATA_ROW = 3

# --- Salidas -----------------------------------------------------------

CATALOG_JSON_PATH = "site/data/catalog.json"
MARC_BINARY_PATH = "site/data/catalogo.mrc"
MARC_XML_PATH = "site/data/catalogo_marcxml.xml"

# Un fichero JSON diminuto por libro (site/data/books/<id>.json), con el
# registro público completo de ESE libro y sus relacionados ya calculados.
# Existe para que libro.html no tenga que descargar catalog.json entero
# (que crece con todo el catálogo) solo para mostrar una ficha.
BOOKS_DIR = "site/data/books"

# Índice referencia -> id, diminuto, para resolver enlaces ?ref=XXXX sin
# tener que descargar el catálogo completo.
REF_INDEX_PATH = "site/data/ref-index.json"

# --- Campos internos (NUNCA deben acabar en una salida pública) -----------
#
# Estos son los nombres de campo *internos* (los mismos que usa
# library/models.py en la app Flask), no las cabeceras literales del
# Excel. El mapeo Excel -> campo interno está en excel_reader.py.
#
# Si añades un campo nuevo al Excel que sea sensible (por ejemplo, un
# nuevo campo de valoración económica o datos de un donante), añádelo
# aquí Y quita su lectura de excel_reader.py, o el sanity-check de
# safety_check.py hará fallar el build igualmente como red de seguridad.
INTERNAL_FIELDS = {
    "status",              # Vigente/Histórico (gestión interna)
    "notes",               # Observaciones internas
    "repeated_copy_of",    # "Repe 1": referencia del ejemplar duplicado
    "donated_by",          # Donante
    "measurements",        # Medidas físicas detalladas (gestión)
    "shelf_location",      # Signatura final / ubicación física en el Archivo
}

# --- Campos públicos ---------------------------------------------------
#
# Lista explícita (positiva) de campos que SÍ se publican en catalog.json.
# Se usa como segunda barrera además de INTERNAL_FIELDS: solo se publica
# lo que está aquí, nunca "todo lo que no esté prohibido".
PUBLIC_FIELDS = [
    "id",
    "reference",
    "title",
    "subtitle",
    "author",
    "edition",
    "place",
    "publisher",
    "publication_year",
    "topic",
    "subtopic",
    "speciality",
    "specifications",
    "language",
    "num_pages",
    "illustrations",
    "size_cm",
    "series",
    "isbn",
    "is_digitized",
    "digital_link",
]

# Columnas del Excel que jamás deben leerse ni pasar por el generador
# (aunque tampoco pertenezcan a INTERNAL_FIELDS, por si el Excel trae
# columnas extra que no están mapeadas). El sanity-check busca estos
# textos (insensible a mayúsculas) en el contenido serializado de las
# salidas públicas como salvaguarda final.
FORBIDDEN_TEXT_MARKERS_ENV = "FORBIDDEN_MARKERS"  # opcional, ver safety_check.py
