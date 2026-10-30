"""Build static blog pages and RSS feeds from Markdown source posts."""
from __future__ import annotations

import html
import json
import re
from datetime import date, datetime, time, timezone
from pathlib import Path
from xml.etree import ElementTree

import mistune

SITE_URL = "https://biblioteca.fio.es"
CATEGORIES = {
    "noticias": ("Noticias", "News"),
    "resenas": ("Reseñas", "Reviews"),
}
FRONT_MATTER = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n?(.*)\Z", re.DOTALL)
FEATURED_BOOK = re.compile(r"(?m)^\s*OBRA_DESTACADA:([A-Za-z0-9._-]+)\s*$")
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
RESERVED_SLUGS = {"index", *CATEGORIES}


class BlogBuildError(ValueError):
    """Raised when blog source content cannot be published safely."""


def _parse_post(path: Path) -> dict:
    source = path.read_text(encoding="utf-8")
    match = FRONT_MATTER.match(source)
    if not match:
        raise BlogBuildError(f"{path}: falta la cabecera Markdown delimitada por ---")

    metadata: dict[str, str] = {}
    for line in match.group(1).splitlines():
        key, separator, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if not separator or key not in {"title", "date", "category", "slug"} or not value:
            raise BlogBuildError(f"{path}: metadato no válido: {line!r}")
        if key in metadata:
            raise BlogBuildError(f"{path}: metadato duplicado: {key}")
        if value.startswith('"') and value.endswith('"'):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as exc:
                raise BlogBuildError(f"{path}: valor entre comillas no válido para {key}") from exc
        elif value.startswith("'") and value.endswith("'"):
            value = value[1:-1].replace("''", "'")
        metadata[key] = value

    for required in ("title", "date", "category"):
        if not metadata.get(required):
            raise BlogBuildError(f"{path}: falta el metadato obligatorio {required}")
    try:
        published = date.fromisoformat(metadata["date"])
    except ValueError as exc:
        raise BlogBuildError(f"{path}: date debe tener formato AAAA-MM-DD") from exc

    category = metadata["category"].lower()
    if category not in CATEGORIES:
        raise BlogBuildError(
            f"{path}: category debe ser 'noticias' o 'resenas'"
        )

    slug = metadata.get("slug", path.stem.lower())
    if not SLUG.fullmatch(slug):
        raise BlogBuildError(f"{path}: slug solo puede contener letras ASCII, números y guiones")
    if slug in RESERVED_SLUGS:
        raise BlogBuildError(f"{path}: slug reservado por una página del blog: {slug}")

    markers = list(FEATURED_BOOK.finditer(match.group(2)))
    if len(markers) > 1:
        raise BlogBuildError(f"{path}: solo se permite una marca OBRA_DESTACADA por entrada")
    body = FEATURED_BOOK.sub("", match.group(2)).strip()
    markdown = mistune.create_markdown(escape=True)
    rendered = markdown(body)
    summary_source = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", body)
    summary_source = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", summary_source)
    summary_source = re.sub(r"[#>*_`~]", "", summary_source)
    summary = " ".join(summary_source.split())

    return {
        "title": metadata["title"],
        "date": published,
        "category": category,
        "slug": slug,
        "html": rendered,
        "summary": summary[:240],
        "featured_reference": markers[0].group(1).upper() if markers else None,
    }


def _book_index(records: list[dict]) -> dict[str, dict]:
    result = {}
    for book in records:
        reference = str(book.get("reference") or "").strip().upper()
        if reference in result:
            raise BlogBuildError(f"Referencia duplicada en el catálogo: {reference}")
        if reference:
            result[reference] = book
    return result


def _book_of_month(records: list[dict], books: dict[str, dict], config_path: Path, today: date) -> dict | None:
    if not records:
        return None
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise BlogBuildError(f"No se pudo leer la configuración del blog {config_path}: {exc}") from exc
    if not isinstance(config, dict) or set(config) != {"book_of_month"}:
        raise BlogBuildError(
            f"{config_path}: se espera un objeto JSON con el único campo 'book_of_month'"
        )

    manual_reference = config["book_of_month"]
    if manual_reference is not None:
        if not isinstance(manual_reference, str) or not manual_reference.strip():
            raise BlogBuildError(f"{config_path}: book_of_month debe ser null o una referencia")
        reference = manual_reference.strip().upper()
        if reference not in books:
            raise BlogBuildError(
                f"{config_path}: la referencia de book_of_month no existe en el catálogo: {reference}"
            )
        return books[reference]

    ordered = sorted(records, key=lambda record: int(record["id"]))
    month_number = (today.year - 2000) * 12 + today.month - 1
    return ordered[month_number % len(ordered)]


def _book_banner(book: dict, base: str, label_es: str = "Obra destacada", label_en: str = "Featured book") -> str:
    title = html.escape(str(book.get("title") or "Sin título"))
    author = html.escape(str(book.get("author") or ""))
    book_url = f"{base}libro.html?id={int(book['id'])}"
    author_html = f'<span class="blog-book-author">{author}</span>' if author else ""
    return (
        f'<a class="blog-book-banner" href="{html.escape(book_url, quote=True)}">'
        f'<span class="lang-es" lang="es">{label_es}</span>'
        f'<span class="lang-en" lang="en">{label_en}</span>'
        f'<strong>{title}</strong>{author_html}</a>'
    )


def _post_card(post: dict, books: dict[str, dict]) -> str:
    category_es, category_en = CATEGORIES[post["category"]]
    parts = [
        '<article class="blog-post-card">',
        f'<p class="blog-post-meta"><time datetime="{post["date"].isoformat()}">{post["date"].isoformat()}</time>'
        f' · <span class="lang-es" lang="es">{category_es}</span>'
        f'<span class="lang-en" lang="en">{category_en}</span></p>',
        f'<h2><a href="{html.escape(post["slug"], quote=True)}.html">{html.escape(post["title"])}</a></h2>',
    ]
    if post["summary"]:
        parts.append(f'<p>{html.escape(post["summary"])}</p>')
    if post["featured_reference"]:
        parts.append(_book_banner(books[post["featured_reference"]], "../"))
    parts.append("</article>")
    return "\n".join(parts)


def _render_page(title: str, description: str, body: str, *, page_path: str, feeds: list[str] | None = None) -> str:
    base = "../"
    canonical = f"{SITE_URL}/{page_path}"
    feed_links = "\n".join(
        f'<link rel="alternate" type="application/rss+xml" title="Biblioteca FIO — {html.escape(feed["title"])}" href="{html.escape(feed["href"], quote=True)}">'
        for feed in feeds or []
    )
    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)} — Biblioteca FIO</title>
  <meta name="description" content="{html.escape(description, quote=True)}">
  <link rel="canonical" href="{html.escape(canonical, quote=True)}">
  <link rel="manifest" href="{base}manifest.json">
  <link rel="icon" href="{base}assets/img/favicons/apple-touch-icon.png">
  <link rel="stylesheet" href="{base}css/styles.css">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' mailto:; object-src 'none'">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Abel&amp;family=Material+Symbols+Outlined:opsz,wght@20..48,400&amp;display=swap" media="print" data-async-css>
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Abel&amp;family=Material+Symbols+Outlined:opsz,wght@20..48,400&amp;display=swap"></noscript>
  {feed_links}
</head>
<body>
  <a class="skip-link" href="#main-content">Saltar al contenido</a>
  <div id="fio-header-mount"></div>
  <main id="main-content" class="fio-prose blog-page">
    {body}
  </main>
  <div id="fio-footer-mount"></div>
  <script defer src="{base}js/shell.js"></script>
  <script defer src="{base}js/i18n.js"></script>
  <script defer src="{base}js/fio-ux.js"></script>
</body>
</html>
"""


def _write_feed(path: Path, title: str, posts: list[dict], books: dict[str, dict]) -> None:
    channel = ElementTree.Element("channel")
    ElementTree.SubElement(channel, "title").text = f"Biblioteca FIO — {title}"
    ElementTree.SubElement(channel, "link").text = f"{SITE_URL}/blog/"
    ElementTree.SubElement(channel, "description").text = title
    ElementTree.SubElement(channel, "language").text = "es"
    for post in posts:
        item = ElementTree.SubElement(channel, "item")
        permalink = f"{SITE_URL}/blog/{post['slug']}.html"
        ElementTree.SubElement(item, "title").text = post["title"]
        ElementTree.SubElement(item, "link").text = permalink
        ElementTree.SubElement(item, "guid", isPermaLink="true").text = permalink
        published = datetime.combine(post["date"], time(12), tzinfo=timezone.utc)
        ElementTree.SubElement(item, "pubDate").text = published.strftime("%a, %d %b %Y %H:%M:%S GMT")
        description = post["summary"]
        if post["featured_reference"]:
            book = books[post["featured_reference"]]
            description += f" · Obra destacada: {book.get('title') or 'Sin título'}"
        ElementTree.SubElement(item, "description").text = description
        ElementTree.SubElement(item, "category").text = post["category"]
    root = ElementTree.Element(
        "rss", version="2.0",
        attrib={"xmlns:atom": "http://www.w3.org/2005/Atom"},
    )
    root.append(channel)
    ElementTree.SubElement(
        channel, "{http://www.w3.org/2005/Atom}link",
        href=f"{SITE_URL}/blog/{path.name}", rel="self", type="application/rss+xml",
    )
    ElementTree.indent(root, space="  ")
    path.write_bytes(
        b'<?xml version="1.0" encoding="UTF-8"?>\n'
        + ElementTree.tostring(root, encoding="utf-8", xml_declaration=False)
        + b"\n"
    )


def build_blog(source_dir: str | Path, output_dir: str | Path, records: list[dict], *, today: date | None = None) -> list[dict]:
    source_dir = Path(source_dir)
    output_dir = Path(output_dir)
    today = today or date.today()
    config_path = source_dir / "config.json"
    posts_dir = source_dir
    posts = [_parse_post(path) for path in sorted(posts_dir.glob("*.md"))]
    posts.sort(key=lambda post: (post["date"], post["slug"]), reverse=True)

    seen_slugs = set()
    books = _book_index(records)
    for post in posts:
        if post["slug"] in seen_slugs:
            raise BlogBuildError(f"Slug de entrada duplicado: {post['slug']}")
        seen_slugs.add(post["slug"])
        reference = post["featured_reference"]
        if reference and reference not in books:
            raise BlogBuildError(
                f"OBRA_DESTACADA:{reference} en {post['slug']} no existe en el catálogo"
            )

    monthly_book = _book_of_month(records, books, config_path, today)
    output_dir.mkdir(parents=True, exist_ok=True)
    for old_file in output_dir.iterdir():
        if old_file.is_file() and old_file.suffix.lower() in {".html", ".xml"}:
            old_file.unlink()

    category_links = """<nav class="blog-categories" aria-label="Categorías del blog">
      <a href="noticias.html"><span class="lang-es" lang="es">Noticias</span><span class="lang-en" lang="en">News</span></a>
      <a href="resenas.html"><span class="lang-es" lang="es">Reseñas</span><span class="lang-en" lang="en">Reviews</span></a>
      <a href="feed.xml">RSS</a>
    </nav>"""

    recent = "\n".join(_post_card(post, books) for post in posts[:10])
    if not recent:
        recent = '<p><span class="lang-es" lang="es">Todavía no hay entradas.</span><span class="lang-en" lang="en">There are no posts yet.</span></p>'
    month_html = _book_banner(monthly_book, "../", "Obra del mes", "Book of the month") if monthly_book else ""
    index_body = f"""
    <h1>Blog</h1>
    {category_links}
    {month_html}
    <section aria-labelledby="blog-recent">
      <h2 id="blog-recent"><span class="lang-es" lang="es">Entradas recientes</span><span class="lang-en" lang="en">Recent posts</span></h2>
      {recent}
    </section>
"""
    feeds = [
        {"href": "feed.xml", "title": "Blog"},
        {"href": "feed-noticias.xml", "title": "Noticias"},
        {"href": "feed-resenas.xml", "title": "Reseñas"},
    ]
    (output_dir / "index.html").write_text(
        _render_page("Blog", "Noticias y reseñas de la Biblioteca FIO.", index_body, page_path="blog/", feeds=feeds),
        encoding="utf-8",
    )

    for category, (label_es, label_en) in CATEGORIES.items():
        category_posts = [post for post in posts if post["category"] == category]
        cards = "\n".join(_post_card(post, books) for post in category_posts)
        if not cards:
            cards = '<p><span class="lang-es" lang="es">Todavía no hay entradas en esta categoría.</span><span class="lang-en" lang="en">There are no posts in this category yet.</span></p>'
        category_body = f"""
    <p><a href="index.html"><span class="lang-es" lang="es">Volver al blog</span><span class="lang-en" lang="en">Back to the blog</span></a></p>
    <h1><span class="lang-es" lang="es">{label_es}</span><span class="lang-en" lang="en">{label_en}</span></h1>
    {cards}
"""
        (output_dir / f"{category}.html").write_text(
            _render_page(f"{label_es} / {label_en}", f"{label_es} y {label_en} del blog de Biblioteca FIO.", category_body, page_path=f"blog/{category}.html", feeds=feeds),
            encoding="utf-8",
        )
        category_feed = "feed-noticias.xml" if category == "noticias" else "feed-resenas.xml"
        _write_feed(output_dir / category_feed, label_es, category_posts, books)

    _write_feed(output_dir / "feed.xml", "Blog", posts, books)

    for post in posts:
        category_es, category_en = CATEGORIES[post["category"]]
        featured = (
            _book_banner(books[post["featured_reference"]], "../")
            if post["featured_reference"] else ""
        )
        post_body = f"""
    <p><a href="index.html"><span class="lang-es" lang="es">Volver al blog</span><span class="lang-en" lang="en">Back to the blog</span></a></p>
    <p class="blog-post-meta"><time datetime="{post["date"].isoformat()}">{post["date"].isoformat()}</time> · <a href="{post["category"]}.html"><span class="lang-es" lang="es">{category_es}</span><span class="lang-en" lang="en">{category_en}</span></a></p>
    <h1>{html.escape(post["title"])}</h1>
    {featured}
    <article class="blog-post-content">{post["html"]}</article>
"""
        (output_dir / f"{post['slug']}.html").write_text(
            _render_page(post["title"], post["summary"], post_body, page_path=f"blog/{post['slug']}.html", feeds=feeds),
            encoding="utf-8",
        )
    return posts
