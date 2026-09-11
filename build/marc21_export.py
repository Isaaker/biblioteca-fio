"""
Exportación MARC21 pública del catálogo, adaptada de library/marc21.py
(proyecto Flask original de la Biblioteca FIO).

Se reutiliza tal cual la lógica de construcción del registro MARC21
(`book_to_marc_record`, mismos tags/subcampos: 001, 020, 041, 100, 245,
250, 264, 300, 490, 650...). Lo único que cambia es la fuente de datos:
en vez de un objeto `Book` de SQLAlchemy, se recibe un diccionario de
libro público (el mismo que se sirve en catalog.json).

Solo se incluyen datos bibliográficos. Nunca la signatura, notas
internas, donante o estado de conservación detallado — igual que en el
proyecto original.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET

from pymarc import Record, Field, Subfield, marcxml


def book_dict_to_marc_record(book: dict) -> Record:
    """Construye un `pymarc.Record` MARC21 a partir de un diccionario de
    libro público (ver build/config.py: PUBLIC_FIELDS)."""
    record = Record(force_utf8=True)
    record.leader = "00000nam a2200000 a 4500"

    record.add_field(Field(tag="001", data=book.get("reference") or str(book.get("id"))))

    language = book.get("language")
    if language:
        # El catálogo guarda el idioma como texto libre normalizado (p.ej.
        # "Español" o "Inglés / Español"), no como código MARC de 3 letras;
        # se incluye igualmente en 041 $a para no perder el dato, tal y
        # como hacía el proyecto original.
        record.add_field(Field(tag="041", indicators=["0", " "], subfields=[Subfield("a", language)]))

    isbn = book.get("isbn")
    if isbn:
        record.add_field(Field(tag="020", indicators=[" ", " "], subfields=[Subfield("a", isbn)]))

    author = book.get("author")
    if author:
        record.add_field(Field(tag="100", indicators=["1", " "], subfields=[Subfield("a", author)]))

    title_subfields = [Subfield("a", book.get("title") or "Sin título")]
    if book.get("subtitle"):
        title_subfields.append(Subfield("b", book["subtitle"]))
    record.add_field(Field(tag="245", indicators=["1", "0"], subfields=title_subfields))

    if book.get("edition"):
        record.add_field(Field(tag="250", indicators=[" ", " "], subfields=[Subfield("a", book["edition"])]))

    pub_subfields = []
    if book.get("place"):
        pub_subfields.append(Subfield("a", book["place"]))
    if book.get("publisher"):
        pub_subfields.append(Subfield("b", book["publisher"]))
    if book.get("publication_year"):
        pub_subfields.append(Subfield("c", str(book["publication_year"])))
    if pub_subfields:
        record.add_field(Field(tag="264", indicators=[" ", "1"], subfields=pub_subfields))

    physical_subfields = []
    if book.get("num_pages"):
        physical_subfields.append(Subfield("a", f"{book['num_pages']} p."))
    if book.get("illustrations"):
        physical_subfields.append(Subfield("b", book["illustrations"]))
    if book.get("size_cm"):
        physical_subfields.append(Subfield("c", f"{book['size_cm']} cm"))
    if physical_subfields:
        record.add_field(Field(tag="300", indicators=[" ", " "], subfields=physical_subfields))

    if book.get("series"):
        record.add_field(Field(tag="490", indicators=["0", " "], subfields=[Subfield("a", book["series"])]))

    for topic_value in (book.get("topic"), book.get("subtopic"), book.get("speciality")):
        if topic_value:
            record.add_field(Field(tag="650", indicators=[" ", "4"], subfields=[Subfield("a", topic_value)]))

    return record


def book_dict_to_marcxml(book: dict) -> bytes:
    return marcxml.record_to_xml(book_dict_to_marc_record(book))


def write_marc_collection(books: list[dict], binary_path: str, xml_path: str) -> None:
    """Escribe el catálogo completo como fichero MARC21 binario (ISO 2709)
    y como MARCXML, con un registro por libro."""
    records = [book_dict_to_marc_record(b) for b in books]

    with open(binary_path, "wb") as fh:
        for record in records:
            fh.write(record.as_marc())

    _write_marcxml_collection(records, xml_path)


def _write_marcxml_collection(records: list[Record], xml_path: str) -> None:
    """Escribe una colección MARCXML válida (<collection> con todos los
    <record>), construida con los nodos que genera pymarc para cada
    registro individual (pymarc no trae en esta versión un "writer" de
    colecciones, así que se ensambla el XML a mano con ElementTree)."""
    collection = ET.Element("collection", {"xmlns": marcxml.MARC_XML_NS})
    for record in records:
        node = marcxml.record_to_xml_node(record, namespace=False)
        collection.append(node)

    tree = ET.ElementTree(collection)
    ET.indent(tree, space="  ")
    tree.write(xml_path, encoding="utf-8", xml_declaration=True)
