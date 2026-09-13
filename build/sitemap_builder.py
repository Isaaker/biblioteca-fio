"""
Genera site/sitemap.xml: las páginas estáticas del sitio más una URL
por cada ficha de libro (libro.html?id=N).

Nota sobre SEO de libro.html: al ser una página que carga sus datos por
JavaScript (fetch a site/data/books/<id>.json), un rastreador que no
ejecute JS no vería el título ni la descripción reales de cada libro.
Incluirla igualmente en el sitemap ayuda (Google sí ejecuta JS al
rastrear, aunque más despacio y sin garantías), pero la mejora de fondo
—si en el futuro se quiere que cada libro tenga su propio <title> y
<meta description> ya en el HTML servido, sin depender de JS— pasaría
por pre-renderizar una copia estática de libro.html por cada id en el
propio build (fuera del alcance de este cambio).
"""
from __future__ import annotations

from datetime import date

SITE_URL = "https://biblioteca.fio.es"

# (ruta, prioridad, frecuencia de cambio)
STATIC_PAGES = [
    ("index.html", "1.0", "weekly"),
    ("catalogo.html", "0.9", "daily"),
    ("buscar.html", "0.8", "monthly"),
    ("escanear.html", "0.5", "monthly"),
    ("estadisticas.html", "0.6", "weekly"),
    ("eventos.html", "0.6", "weekly"),
    ("linea-tiempo.html", "0.6", "monthly"),
    ("gracias.html", "0.5", "monthly"),
    ("donaciones.html", "0.6", "monthly"),
    ("contacto.html", "0.5", "monthly"),
    ("interoperabilidad.html", "0.4", "monthly"),
    ("acceso-copias-digitales.html", "0.3", "monthly"),
    ("privacidad.html", "0.2", "yearly"),
]


def build_sitemap_xml(public_records: list[dict]) -> str:
    today = date.today().isoformat()
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']

    for path, priority, changefreq in STATIC_PAGES:
        lines.append(
            f"  <url>\n"
            f"    <loc>{SITE_URL}/{path}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )

    for record in public_records:
        book_id = record.get("id")
        if book_id is None:
            continue
        lines.append(
            f"  <url>\n"
            f"    <loc>{SITE_URL}/libro.html?id={book_id}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>yearly</changefreq>\n"
            f"    <priority>0.4</priority>\n"
            f"  </url>"
        )

    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def write_sitemap(public_records: list[dict], output_path: str) -> int:
    """Escribe el sitemap en `output_path`. Devuelve el nº total de URLs."""
    xml = build_sitemap_xml(public_records)
    with open(output_path, "w", encoding="utf-8") as fh:
        fh.write(xml)
    return len(STATIC_PAGES) + len(public_records)
