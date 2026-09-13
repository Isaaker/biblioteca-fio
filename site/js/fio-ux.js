(function () {
  const FIO_THEME_KEY = 'fio-theme-v1';
  const FIO_CONTRAST_KEY = 'fio-contrast-v1';
  const FIO_FAVORITES_KEY = 'fio-favorites-v1';

  function fioReadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function fioWriteJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Ignorado si storage está bloqueado.
    }
  }

  function fioGetFavorites() {
    return fioReadJSON(FIO_FAVORITES_KEY, {});
  }

  function fioIsFavorite(id) {
    return !!fioGetFavorites()[String(id)];
  }

  function fioToggleFavorite(book) {
    const favorites = fioGetFavorites();
    const idKey = String(book.id);
    if (favorites[idKey]) {
      delete favorites[idKey];
    } else {
      favorites[idKey] = {
        id: book.id,
        title: book.title,
        author: book.author,
        reference: book.reference,
        topic: book.topic,
        publication_year: book.publication_year,
        isbn: book.isbn,
      };
    }
    fioWriteJSON(FIO_FAVORITES_KEY, favorites);
    document.dispatchEvent(new CustomEvent('fio:favorites-changed'));
    return Object.keys(favorites).length;
  }

  async function fioFetchCatalog() {
    const candidates = [
      'data/catalog.json',
      './data/catalog.json',
      '../data/catalog.json',
      'site/data/catalog.json',
      'dist/data/catalog.json',
    ];

    let lastError = null;
    for (const candidate of candidates) {
      try {
        // Sin 'no-store': catalog.json solo cambia en cada build, así
        // que el navegador puede reutilizar la copia en caché al
        // navegar entre catálogo/buscador/estadísticas en la misma
        // visita, en vez de volver a descargar ~1-2 MB cada vez.
        const res = await fetch(candidate);
        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status} for ${candidate}`);
          continue;
        }
        return await res.json();
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('No se pudo cargar el catálogo.');
  }

  function fioIcon(name, label) {
    return `<span class="fio-icon" aria-hidden="true">${name}</span><span class="fio-icon-label">${label}</span>`;
  }

  function fioApplyTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.body.dataset.theme = next;
    localStorage.setItem(FIO_THEME_KEY, next);
    const toggle = document.querySelector('.fio-theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(next === 'dark'));
      toggle.innerHTML = next === 'dark'
        ? fioIcon('light_mode', 'Claro')
        : fioIcon('dark_mode', 'Oscuro');
    }
  }

  function fioToggleTheme() {
    const current = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
    fioApplyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function fioApplyContrast(state) {
    const next = state === 'on' ? 'on' : 'off';
    document.body.dataset.contrast = next;
    localStorage.setItem(FIO_CONTRAST_KEY, next);
    const toggle = document.querySelector('.fio-contrast-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(next === 'on'));
      toggle.innerHTML = fioIcon('contrast', next === 'on' ? 'Contraste: ON' : 'Alto contraste');
    }
  }

  function fioToggleContrast() {
    const current = document.body.dataset.contrast === 'on' ? 'on' : 'off';
    fioApplyContrast(current === 'on' ? 'off' : 'on');
  }

  function fioBuildCitation(book, style) {
    if (!book) return '';
    const title = book.title || 'Sin título';
    const author = book.author || 'Autor desconocido';
    const year = book.publication_year || 's.f.';
    const publisher = book.publisher || 'Editorial no indicada';

    if (style === 'chicago') {
      return `${author}. ${title}. ${publisher}, ${year}.`;
    }

    return `${author}. (${year}). ${title}. ${publisher}.`;
  }

  async function fioOpenLibrarySearch(query, limit = 6) {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,cover_i,isbn&limit=${limit}`;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return [];
      const payload = await res.json();
      return (payload.docs || []).slice(0, limit);
    } catch (err) {
      return [];
    }
  }

  function fioOpenLibraryCoverFor(doc) {
    const isbn = doc.isbn && doc.isbn[0];
    if (doc.cover_i) {
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    }
    if (isbn) {
      return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    }
    return '';
  }

  async function fioGetOpenLibrarySynopsis(book) {
    try {
      const queries = [
        book.title,
        `${book.title} ${book.author}`.trim(),
      ].filter(Boolean);

      for (const query of queries) {
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3`;
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) continue;
        const payload = await res.json();
        const docs = payload.docs || [];

        for (const doc of docs) {
          if (doc.first_publish_year && Math.abs(doc.first_publish_year - (book.publication_year || 0)) > 5) {
            continue;
          }
          
          if (doc.description) {
            const desc = typeof doc.description === 'string' ? doc.description : (doc.description.value || '');
            return desc.substring(0, 500);
          }

          if (doc.first_sentence && doc.first_sentence[0]) {
            return doc.first_sentence[0].substring(0, 300);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching Open Library synopsis:', err);
    }
    return '';
  }

  function fioIsSameBook(left, right) {
    if (!left || !right) return false;
    const leftId = String(left.id ?? '');
    const rightId = String(right.id ?? '');
    if (leftId && rightId && leftId === rightId) return true;
    const leftKey = `${(left.reference || '').trim()}|${(left.title || '').trim().toLowerCase()}|${(left.author || '').trim().toLowerCase()}`;
    const rightKey = `${(right.reference || '').trim()}|${(right.title || '').trim().toLowerCase()}|${(right.author || '').trim().toLowerCase()}`;
    return leftKey && rightKey && leftKey === rightKey;
  }

  async function fioGetSuggestionsForBook(book, records, limit = 6) {
    const seen = new Set([String(book.id)]);
    const suggestions = [];

    const localMatches = (records || []).filter((item) => {
      if (fioIsSameBook(item, book)) return false;
      const sameTopic = !!(item.topic && book.topic && item.topic === book.topic);
      const sameAuthor = !!(item.author && book.author && item.author === book.author);
      return sameTopic || sameAuthor;
    }).slice(0, 3);

    localMatches.forEach((item) => {
      if (!seen.has(String(item.id))) {
        seen.add(String(item.id));
        suggestions.push({
          id: item.id,
          title: item.title,
          author: item.author,
          reference: item.reference,
          cover: '',
          year: item.publication_year,
          source: 'local',
        });
      }
    });

    const baseQueries = [];
    if (book.title) baseQueries.push(book.title);
    if (book.author) baseQueries.push(`${book.title || ''} ${book.author}`.trim());
    if (book.topic) baseQueries.push(`${book.topic} ${book.author || ''}`.trim());

    for (const q of baseQueries) {
      if (!q) continue;
      const docs = await fioOpenLibrarySearch(q, 4);
      for (const doc of docs) {
        const docId = doc.key ? doc.key.replace('/works/', '') : null;
        if (!docId && !doc.title) continue;
        const candidate = {
          id: docId || String(doc.title + (doc.author_name || []).join('')),
          title: doc.title || book.title,
          author: (doc.author_name || []).join(', '),
          reference: '',
          year: '',
          cover: fioOpenLibraryCoverFor(doc),
          source: 'openlibrary',
        };
        if (!seen.has(String(candidate.id))) {
          seen.add(String(candidate.id));
          suggestions.push(candidate);
        }
        if (suggestions.length >= limit) break;
      }
      if (suggestions.length >= limit) break;
    }

    while (suggestions.length < limit) {
      const fallback = (records || []).find((item) => !seen.has(String(item.id)) && !fioIsSameBook(item, book));
      if (!fallback) break;
      seen.add(String(fallback.id));
      suggestions.push({
        id: fallback.id,
        title: fallback.title,
        author: fallback.author,
        reference: fallback.reference,
        cover: '',
        year: fallback.publication_year,
        source: 'local',
      });
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Sugerencias adicionales desde Open Library, para ampliar los
   * relacionados que ya vienen precalculados en el propio JSON del
   * libro (ver build/book_files.py). A diferencia de la función
   * anterior, esta lanza las búsquedas EN PARALELO (Promise.all) en
   * vez de una detrás de otra, y no necesita el catálogo completo:
   * solo el libro actual.
   */
  async function fioGetOpenLibrarySuggestions(book, limit = 6) {
    if (limit <= 0) return [];
    const seen = new Set([String(book.id)]);

    const baseQueries = [];
    if (book.title) baseQueries.push(book.title);
    if (book.author) baseQueries.push(`${book.title || ''} ${book.author}`.trim());
    if (book.topic) baseQueries.push(`${book.topic} ${book.author || ''}`.trim());

    const results = await Promise.all(
      baseQueries.filter(Boolean).map(q => fioOpenLibrarySearch(q, 4))
    );

    const suggestions = [];
    for (const docs of results) {
      for (const doc of docs) {
        const docId = doc.key ? doc.key.replace('/works/', '') : null;
        if (!docId && !doc.title) continue;
        const candidateId = docId || String(doc.title + (doc.author_name || []).join(''));
        if (seen.has(String(candidateId))) continue;
        seen.add(String(candidateId));
        suggestions.push({
          id: candidateId,
          title: doc.title || book.title,
          author: (doc.author_name || []).join(', '),
          reference: '',
          publication_year: '',
          cover: fioOpenLibraryCoverFor(doc),
          source: 'openlibrary',
        });
        if (suggestions.length >= limit) break;
      }
      if (suggestions.length >= limit) break;
    }

    return suggestions;
  }

  function fioRefreshFavoritesBadge() {
    const badge = document.querySelector('.fio-favorites-count');
    if (!badge) return;
    const count = Object.keys(fioGetFavorites()).length;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  function fioFavoriteCoverNode(item) {
    const cover = document.createElement('div');
    cover.className = 'fio-favorites-cover';
    const placeholder = () => {
      cover.innerHTML = typeof fioPlaceholderCoverSvg === 'function'
        ? fioPlaceholderCoverSvg(item.title)
        : '';
    };
    placeholder();
    if (typeof fioResolveCover === 'function') {
      fioResolveCover(item).then((url) => {
        if (!url) return;
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.loading = 'lazy';
        cover.innerHTML = '';
        cover.appendChild(img);
      }).catch(() => { /* se queda el placeholder */ });
    }
    return cover;
  }

  function fioRenderFavoritesList(listEl) {
    const lang = typeof fioCurrentLang === 'function' ? fioCurrentLang() : 'es';
    const t = (key, fallback) => (typeof fioT === 'function' && fioT(key)) || fallback;
    const favorites = fioGetFavorites();
    const items = Object.keys(favorites).map((id) => favorites[id]);

    listEl.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'fio-favorites-empty';
      empty.textContent = t('favorites_empty', lang === 'en'
        ? "You haven't saved any books as favourites yet. Tap the star on a book's page to add it here."
        : 'Aún no has guardado ningún libro como favorito. Pulsa la estrella en la ficha de un libro para añadirlo aquí.');
      listEl.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'fio-favorites-item';

      row.appendChild(fioFavoriteCoverNode(item));

      const info = document.createElement('div');
      info.className = 'fio-favorites-info';
      const title = document.createElement('span');
      title.className = 'fio-favorites-title';
      title.textContent = item.title || (lang === 'en' ? 'Untitled' : 'Sin título');
      const ref = document.createElement('span');
      ref.className = 'fio-favorites-ref';
      ref.textContent = item.reference || t('favorites_no_reference', lang === 'en' ? 'No reference' : 'Sin referencia');
      info.appendChild(title);
      info.appendChild(ref);
      row.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'fio-favorites-actions';

      const openBtn = document.createElement('a');
      openBtn.className = 'fio-favorites-icon-btn';
      openBtn.href = `libro.html?id=${encodeURIComponent(item.id)}`;
      openBtn.setAttribute('aria-label', t('favorites_open', lang === 'en' ? 'Open book' : 'Abrir ficha'));
      openBtn.title = t('favorites_open', lang === 'en' ? 'Open book' : 'Abrir ficha');
      openBtn.innerHTML = '<span class="fio-icon" aria-hidden="true">arrow_forward</span>';
      actions.appendChild(openBtn);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'fio-favorites-icon-btn fio-favorites-remove';
      removeBtn.setAttribute('aria-label', t('favorites_remove', lang === 'en' ? 'Remove from favourites' : 'Quitar de favoritos'));
      removeBtn.title = t('favorites_remove', lang === 'en' ? 'Remove from favourites' : 'Quitar de favoritos');
      removeBtn.innerHTML = '<span class="fio-icon" aria-hidden="true">delete</span>';
      removeBtn.addEventListener('click', () => {
        fioToggleFavorite(item);
        fioRenderFavoritesList(listEl);
      });
      actions.appendChild(removeBtn);

      row.appendChild(actions);
      listEl.appendChild(row);
    });
  }

  function fioOpenFavoritesModal() {
    if (document.querySelector('.fio-favorites-modal')) return;
    const lang = typeof fioCurrentLang === 'function' ? fioCurrentLang() : 'es';
    const t = (key, fallback) => (typeof fioT === 'function' && fioT(key)) || fallback;

    const wrap = document.createElement('div');
    wrap.className = 'fio-modal-backdrop fio-favorites-modal';
    wrap.innerHTML = `
      <div class="fio-modal">
        <div class="fio-modal-header">
          <h3>${t('favorites_title', lang === 'en' ? 'My favourites' : 'Mis favoritos')}</h3>
          <button type="button" class="fio-modal-close" aria-label="${t('favorites_close', lang === 'en' ? 'Close' : 'Cerrar')}">&times;</button>
        </div>
        <div class="fio-modal-body">
          <div class="fio-favorites-list"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    fioRenderFavoritesList(wrap.querySelector('.fio-favorites-list'));

    const close = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('fio:favorites-changed', onChange);
    };
    const onKeydown = (event) => { if (event.key === 'Escape') close(); };
    const onChange = () => fioRenderFavoritesList(wrap.querySelector('.fio-favorites-list'));

    wrap.querySelector('.fio-modal-close').addEventListener('click', close);
    wrap.addEventListener('click', (event) => { if (event.target === wrap) close(); });
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('fio:favorites-changed', onChange);
  }

  function fioInjectGlobalUX() {
    const headerRight = document.querySelector('.fio-header-right');
    if (!headerRight) return;

    if (document.querySelector('.fio-theme-toggle')) {
      document.querySelector('.fio-theme-toggle').remove();
    }
    if (document.querySelector('.fio-contrast-toggle')) {
      document.querySelector('.fio-contrast-toggle').remove();
    }
    if (document.querySelector('.fio-favorites-trigger')) {
      document.querySelector('.fio-favorites-trigger').remove();
    }

    if (!document.querySelector('.fio-theme-toggle')) {
      const themeBtn = document.createElement('button');
      themeBtn.type = 'button';
      themeBtn.className = 'fio-theme-toggle';
      themeBtn.setAttribute('aria-label', 'Cambiar tema');
      themeBtn.setAttribute('title', 'Cambiar tema');
      themeBtn.addEventListener('click', fioToggleTheme);
      headerRight.appendChild(themeBtn);
    }

    if (!document.querySelector('.fio-contrast-toggle')) {
      const contrastBtn = document.createElement('button');
      contrastBtn.type = 'button';
      contrastBtn.className = 'fio-theme-toggle fio-contrast-toggle';
      contrastBtn.setAttribute('aria-label', 'Alto contraste');
      contrastBtn.setAttribute('title', 'Alto contraste');
      contrastBtn.addEventListener('click', fioToggleContrast);
      headerRight.appendChild(contrastBtn);
    }

    if (!document.querySelector('.fio-favorites-trigger')) {
      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = 'fio-favorites-trigger';
      favBtn.setAttribute('title', 'Mis favoritos');
      favBtn.innerHTML = fioIcon('star', 'Favoritos') + '<span class="fio-favorites-count" hidden></span>';
      favBtn.addEventListener('click', fioOpenFavoritesModal);
      headerRight.appendChild(favBtn);
    }
    fioRefreshFavoritesBadge();

    const currentTheme = localStorage.getItem(FIO_THEME_KEY) === 'dark' ? 'dark' : 'light';
    fioApplyTheme(currentTheme);

    const currentContrast = localStorage.getItem(FIO_CONTRAST_KEY) === 'on' ? 'on' : 'off';
    fioApplyContrast(currentContrast);

    const main = document.querySelector('main#main-content');
    if (main && !document.querySelector('.fio-breadcrumbs')) {
      const crumbs = document.createElement('nav');
      crumbs.className = 'fio-breadcrumbs';
      const pathname = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
      const map = {
        'index.html': 'Inicio',
        'catalogo.html': 'Catálogo',
        'buscar.html': 'Buscar',
        'escanear.html': 'Escanear',
        'estadisticas.html': 'Estadísticas',
        'eventos.html': 'Eventos',
        'libro.html': 'Detalle del libro',
        'privacidad.html': 'Privacidad',
        'acceso-copias-digitales.html': 'Acceso restringido',
        'interoperabilidad.html': 'Interoperabilidad',
        'contacto.html': 'Contacto',
        'linea-tiempo.html': 'Línea del tiempo',
        'gracias.html': 'Colabora',
        'donaciones.html': 'Donar libros',
      };
      crumbs.innerHTML = `<a href="index.html">Inicio</a> / <span>${map[pathname] || 'Página'}</span>`;
      main.insertBefore(crumbs, main.firstChild);
    }
  }

  function fioInitKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      const tag = document.activeElement && document.activeElement.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        const searchInput = document.querySelector('#f-q, #s-q');
        if (searchInput) searchInput.focus();
      }
      if (event.key.toLowerCase() === 'd' && !isTyping && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        fioToggleTheme();
      }
      if (event.key.toLowerCase() === 'k' && !isTyping && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        fioToggleContrast();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    fioInjectGlobalUX();
    fioInitKeyboardShortcuts();
  });
  document.addEventListener('fio:favorites-changed', fioRefreshFavoritesBadge);

  window.fioToggleTheme = fioToggleTheme;
  window.fioToggleContrast = fioToggleContrast;
  window.fioBuildCitation = fioBuildCitation;
  window.fioFetchCatalog = fioFetchCatalog;
  window.fioGetSuggestionsForBook = fioGetSuggestionsForBook;
  window.fioGetOpenLibrarySuggestions = fioGetOpenLibrarySuggestions;
  window.fioToggleFavorite = fioToggleFavorite;
  window.fioIsFavorite = fioIsFavorite;
  window.fioGetFavorites = fioGetFavorites;
  window.fioGetOpenLibrarySynopsis = fioGetOpenLibrarySynopsis;
})();
