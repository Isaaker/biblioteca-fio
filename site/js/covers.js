/**
 * Portadas de libro, resueltas en el propio navegador del visitante —
 * no hay servidor ni clave de API. Se consulta, en este orden, hasta
 * que una fuente encuentra algo:
 *
 *   1. Open Library Covers, por ISBN (una sola petición de imagen,
 *      con ?default=false para que devuelva 404 si no hay portada
 *      real en vez de un icono gris).
 *   2. Google Books, por ISBN.
 *   3. Google Books, por título + autor (para libros sin ISBN, o
 *      cuyo ISBN no está en ninguna de las dos bases anteriores).
 *   4. Si nada de lo anterior encuentra nada: un SVG generado en el
 *      momento con las iniciales del título sobre un color derivado
 *      del propio título (siempre el mismo color para el mismo
 *      libro), igual que hacía el proyecto original en el servidor.
 *
 * El resultado se guarda en localStorage (no cambia con el tiempo)
 * para no repetir peticiones cada vez que se recarga una página.
 */
const FIO_COVER_CACHE_KEY = 'fio-covers-v1';
const FIO_COVER_PALETTE = [
  ['#202d58', '#2f3f7a'],
  ['#1f4a4a', '#2f6b6b'],
  ['#3d2b56', '#5a3f7a'],
  ['#4a2e1f', '#7a4f2f'],
  ['#1f3d4a', '#2f5a7a'],
];

function _fioCoverCache() {
  try {
    return JSON.parse(localStorage.getItem(FIO_COVER_CACHE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function _fioCoverCacheSet(key, value) {
  try {
    const cache = _fioCoverCache();
    cache[key] = value;
    localStorage.setItem(FIO_COVER_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    // localStorage lleno o deshabilitado: no pasa nada, simplemente
    // se volverá a resolver la próxima vez.
  }
}

function fioPlaceholderCoverSvg(title) {
  const cleanTitle = (title || '').trim() || 'Libro';
  const initial = cleanTitle.charAt(0).toUpperCase();

  let hash = 0;
  for (let i = 0; i < cleanTitle.length; i++) {
    hash = (hash * 31 + cleanTitle.charCodeAt(i)) >>> 0;
  }
  const [bg, accent] = FIO_COVER_PALETTE[hash % FIO_COVER_PALETTE.length];
  const width = 140, height = 200;
  const spine = Math.max(Math.floor(width / 14), 6);
  const escapeSvgText = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const escaped = escapeSvgText(cleanTitle);
  const safeInitial = escapeSvgText(initial);

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="Portada no disponible: ${escaped}">` +
    `<rect width="${width}" height="${height}" rx="8" fill="${bg}"/>` +
    `<rect width="${spine}" height="${height}" fill="${accent}"/>` +
    `<text x="${width / 2 + spine / 2}" y="${height / 2}" ` +
    `font-family="Georgia, 'Times New Roman', serif" font-size="${Math.floor(height * 0.32)}" ` +
    `font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">` +
    `${safeInitial}</text></svg>`;
}

function _fioCleanIsbn(isbn) {
  if (!isbn) return null;
  const cleaned = isbn.replace(/[^0-9Xx]/g, '');
  return cleaned || null;
}

function _fioImageLoads(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 1 && img.naturalHeight > 1);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function _fioGoogleBooksCover(query) {
  try {
    const res = await fetch('https://www.googleapis.com/books/v1/volumes?q=' + encodeURIComponent(query) + '&maxResults=1');
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items && data.items[0];
    const links = item && item.volumeInfo && item.volumeInfo.imageLinks;
    if (!links) return null;
    const url = links.thumbnail || links.smallThumbnail;
    return url ? url.replace(/^http:/, 'https:') : null;
  } catch (err) {
    return null;
  }
}

/**
 * Resuelve la portada de un libro. Devuelve una URL de imagen, o null
 * si no se ha encontrado ninguna (en cuyo caso conviene mostrar
 * fioPlaceholderCoverSvg(book.title)).
 */
async function fioResolveCover(book) {
  const cacheKey = 'id:' + book.id;
  const cache = _fioCoverCache();
  if (cache[cacheKey] !== undefined) return cache[cacheKey];

  const isbn = _fioCleanIsbn(book.isbn);
  let found = null;

  if (isbn) {
    const olUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
    if (await _fioImageLoads(olUrl)) {
      found = olUrl;
    }
  }

  if (!found && isbn) {
    found = await _fioGoogleBooksCover('isbn:' + isbn);
  }

  if (!found) {
    const parts = ['intitle:' + book.title];
    if (book.author) parts.push('inauthor:' + book.author.split(/[\/,]/)[0].trim());
    found = await _fioGoogleBooksCover(parts.join('+'));
  }

  _fioCoverCacheSet(cacheKey, found);
  return found;
}

/**
 * Engancha la resolución de portadas a un conjunto de elementos <img
 * data-cover-for="ID"> ya presentes en la página, cargándolas solo
 * cuando entran en el viewport (para no lanzar cientos de peticiones
 * de golpe en catálogos grandes).
 */
function fioLazyLoadCovers(container, booksById) {
  const targets = container.querySelectorAll('img[data-cover-for]');
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(async (entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      obs.unobserve(img);
      const id = img.getAttribute('data-cover-for');
      const book = booksById.get(String(id));
      if (!book || img.dataset.coverResolved) return;
      img.dataset.coverResolved = '1';
      const url = await fioResolveCover(book);
      if (url) {
        img.src = url;
      } else {
        img.outerHTML = `<span class="fio-cover-placeholder">${fioPlaceholderCoverSvg(book.title)}</span>`;
      }
    });
  }, { rootMargin: '200px' });

  targets.forEach(img => observer.observe(img));
  return observer;
}
