import json
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "build"))

from blog_builder import BlogBuildError, build_blog
from sitemap_builder import build_sitemap_xml


class BlogBuilderTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.source = self.root / "data" / "blog"
        self.output = self.root / "site" / "blog"
        self.source.mkdir(parents=True)
        (self.source / "config.json").write_text(
            json.dumps({"book_of_month": None}), encoding="utf-8"
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def write_post(self, name, title, published, category, body="Texto de prueba."):
        (self.source / name).write_text(
            f"---\ntitle: {title}\ndate: {published}\ncategory: {category}\n---\n{body}\n",
            encoding="utf-8",
        )

    @staticmethod
    def records():
        return [
            {"id": 1, "reference": "LB0808", "title": "Libro Alfa", "author": "Autora"},
            {"id": 2, "reference": "LB0809", "title": "Libro Beta", "author": "Autor"},
        ]

    def test_posts_are_ordered_and_featured_references_link_to_catalogue(self):
        self.write_post(
            "resena.md",
            '"Reseña & análisis"',
            "2026-10-20",
            "resenas",
            "Un **texto** útil.\n\nOBRA_DESTACADA:LB0808\n\n<script>alert(1)</script>",
        )
        self.write_post("noticia.md", "Noticia", "2026-10-29", "noticias")

        posts = build_blog(
            self.source, self.output, self.records(), today=date(2026, 10, 30)
        )

        self.assertEqual(["noticia", "resena"], [post["slug"] for post in posts])
        post_html = (self.output / "resena.html").read_text(encoding="utf-8")
        self.assertIn('href="../libro.html?id=1"', post_html)
        self.assertIn("Libro Alfa", post_html)
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", post_html)
        self.assertNotIn("<script>alert(1)</script>", post_html)
        index_html = (self.output / "index.html").read_text(encoding="utf-8")
        self.assertLess(
            index_html.index('href="noticia.html">Noticia'),
            index_html.index('href="resena.html">Reseña &amp; análisis'),
        )

    def test_book_of_month_rotates_and_can_be_selected_manually(self):
        build_blog(self.source, self.output, self.records(), today=date(2026, 10, 1))
        october = (self.output / "index.html").read_text(encoding="utf-8")
        build_blog(self.source, self.output, self.records(), today=date(2026, 11, 1))
        november = (self.output / "index.html").read_text(encoding="utf-8")
        self.assertNotEqual(
            october.split("Obra del mes", 1)[1].split("</a>", 1)[0],
            november.split("Obra del mes", 1)[1].split("</a>", 1)[0],
        )

        (self.source / "config.json").write_text(
            json.dumps({"book_of_month": "LB0809"}), encoding="utf-8"
        )
        build_blog(self.source, self.output, self.records(), today=date(2026, 10, 1))
        manual = (self.output / "index.html").read_text(encoding="utf-8")
        self.assertIn("Libro Beta", manual)

    def test_category_rss_contains_only_its_category(self):
        self.write_post("news.md", "News", "2026-10-20", "noticias")
        self.write_post("review.md", "Review", "2026-10-21", "resenas")

        build_blog(self.source, self.output, self.records())

        feed = ET.parse(self.output / "feed-noticias.xml")
        titles = [item.findtext("title") for item in feed.findall("./channel/item")]
        self.assertEqual(["News"], titles)
        self.assertTrue((self.output / "feed.xml").is_file())
        self.assertTrue((self.output / "feed-resenas.xml").is_file())

    def test_missing_featured_book_fails_the_build(self):
        self.write_post(
            "bad-reference.md",
            "Invalid reference",
            "2026-10-20",
            "resenas",
            "OBRA_DESTACADA:LB9999",
        )

        with self.assertRaisesRegex(BlogBuildError, "no existe en el catálogo"):
            build_blog(self.source, self.output, self.records())

    def test_sitemap_includes_blog_home_and_posts(self):
        self.write_post("noticia.md", "Noticia", "2026-10-29", "noticias")
        posts = build_blog(self.source, self.output, self.records())

        sitemap = build_sitemap_xml(self.records(), posts)

        self.assertIn("https://biblioteca.fio.es/blog/", sitemap)
        self.assertIn("https://biblioteca.fio.es/blog/noticia.html", sitemap)

    def test_reserved_page_slug_is_rejected(self):
        self.write_post("index.md", "Noticia", "2026-10-29", "noticias")

        with self.assertRaisesRegex(BlogBuildError, "slug reservado"):
            build_blog(self.source, self.output, self.records())


if __name__ == "__main__":
    unittest.main()
