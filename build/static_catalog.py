"""
Genera site/catalogo-completo.html: una versión del catálogo en HTML
puro, SIN JavaScript.

Por qué existe: el catálogo interactivo (catalogo.html, buscar.html...)
necesita JavaScript para cargar los datos, y eso no es evitable. Pero
una página que dependa por completo de JS no es accesible para quien
navega sin él (lectores de texto, navegadores antiguos, rastreadores
sencillos, WCAG 1.0 punto 6.3). Esta página es el «equivalente
alternativo»: mismos libros, ordenados por letra del título, legibles
con cualquier navegador. Se enlaza desde javascript_disabled.html y
desde el pie de página.

Solo usa campos de config.PUBLIC_FIELDS (los mismos que catalog.json).
"""
from __future__ import annotations

import html
import unicodedata

SITE_URL = "https://biblioteca.fio.es"

CSS = """
:root{color-scheme:light dark;--fg:#1b1b1b;--bg:#fff;--blue:#202d58;--muted:#555;--line:#d9dde8}
@media (prefers-color-scheme:dark){:root{--fg:#eee;--bg:#14182b;--blue:#9db3ff;--muted:#b7bdd1;--line:#33406b}}
*{box-sizing:border-box}
body{margin:0;font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:var(--fg);background:var(--bg)}
header,main,footer{max-width:960px;margin:0 auto;padding:16px 20px}
header{border-bottom:2px solid var(--blue)}
a{color:var(--blue)}
a:focus-visible{outline:3px solid #175cd3;outline-offset:2px}
h1{color:var(--blue);margin:.4em 0}
h2{color:var(--blue);border-bottom:1px solid var(--line);padding-bottom:4px;margin-top:2em}
.az{display:flex;flex-wrap:wrap;gap:6px;padding:0;list-style:none}
.az a{display:inline-block;min-width:34px;min-height:34px;padding:5px 8px;text-align:center;border:1px solid var(--line);border-radius:6px;text-decoration:none}
ul.books{padding-left:0;list-style:none}
ul.books li{padding:8px 0;border-bottom:1px solid var(--line)}
.meta{color:var(--muted);font-size:.92rem}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:var(--bg);padding:6px}
"""


def _letter(title: str) -> str:
    base = unicodedata.normalize("NFD", (title or "").strip())
    base = "".join(c for c in base if unicodedata.category(c) != "Mn")
    for ch in base:
        if ch.isalnum():
            ch = ch.upper()
            return ch if ch.isalpha() else "0-9"
    return "#"


def _sort_key(record: dict):
    t = unicodedata.normalize("NFD", (record.get("title") or "").lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def _entry(r: dict) -> str:
    e = html.escape
    title = e(str(r.get("title") or "(sin título)"))
    if r.get("subtitle"):
        title += ": " + e(str(r["subtitle"]))
    parts = []
    if r.get("author"):
        parts.append(e(str(r["author"])))
    pub = ", ".join(e(str(r[k])) for k in ("place", "publisher", "publication_year") if r.get(k))
    if pub:
        parts.append(pub)
    if r.get("edition"):
        parts.append(e(str(r["edition"])))
    meta = []
    if r.get("language"):
        meta.append(e(str(r["language"])))
    if r.get("topic"):
        meta.append(e(str(r["topic"])))
    if r.get("isbn"):
        meta.append("ISBN " + e(str(r["isbn"])))
    if r.get("reference"):
        meta.append("Ref. " + e(str(r["reference"])))
    out = f"<li><strong>{title}</strong>"
    if parts:
        out += "<br>" + " — ".join(parts)
    if meta:
        out += '<br><span class="meta">' + " · ".join(meta) + "</span>"
    return out + "</li>"


def build_static_catalog_html(public_records: list[dict]) -> str:
    groups: dict[str, list[dict]] = {}
    for r in sorted(public_records, key=_sort_key):
        groups.setdefault(_letter(r.get("title", "")), []).append(r)
    letters = sorted(groups, key=lambda x: (x == "#", x))

    nav = "".join(f'<li><a href="#l-{html.escape(l)}">{html.escape(l)}</a></li>' for l in letters)
    body = []
    for l in letters:
        items = "\n".join(_entry(r) for r in groups[l])
        body.append(f'<h2 id="l-{html.escape(l)}">{html.escape(l)}</h2>\n<ul class="books">\n{items}\n</ul>')
    if not body:
        body.append("<p>El catálogo está vacío en este momento. / The catalogue is currently empty.</p>")

    total = len(public_records)
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catálogo completo en HTML — Biblioteca FIO</title>
<meta name="description" content="Listado completo, sin JavaScript, de los {total} libros de la Biblioteca de la Fundación Infante de Orleans, ordenados por título.">
<link rel="canonical" href="{SITE_URL}/catalogo-completo.html">
<link rel="icon" href="assets/img/favicons/apple-touch-icon.png">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'self'; form-action 'none'">
<style>{CSS}</style>
</head>
<body>
<a class="skip" href="#contenido">Saltar al contenido</a>
<header>
<p><a href="index.html">Biblioteca — Fundación Infante de Orleans</a> · <a href="catalogo.html">Catálogo interactivo (requiere JavaScript)</a></p>
</header>
<main id="contenido">
<h1>Catálogo completo (versión sin JavaScript)</h1>
<p>Listado de {total} libros ordenados alfabéticamente por título. Para filtrar y buscar usa el <a href="catalogo.html">catálogo interactivo</a>. También puedes descargar el catálogo en formato <a href="data/catalogo.mrc">MARC21</a> o <a href="data/catalogo_marcxml.xml">MARCXML</a>.</p>
<p lang="en">Full list of {total} books sorted by title. This page works without JavaScript; the interactive catalogue adds search and filters.</p>
<nav aria-label="Índice alfabético / Alphabetical index"><ul class="az">{nav}</ul></nav>
{chr(10).join(body)}
</main>
<footer>
<p><a href="privacidad.html">Política de privacidad</a> · <a href="contacto.html">Contacto</a></p>
</footer>
</body>
</html>
"""


def write_static_catalog(public_records: list[dict], output_path: str) -> int:
    with open(output_path, "w", encoding="utf-8") as fh:
        fh.write(build_static_catalog_html(public_records))
    return len(public_records)
