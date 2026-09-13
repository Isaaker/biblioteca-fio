/**
 * Página de detalle de un libro (libro.html).
 *
 * El libro se identifica por la URL: ?id=123 o ?ref=LB0123. A diferencia
 * del resto del sitio, esta página NO descarga catalog.json (que crece
 * con todo el catálogo): descarga solo data/books/<id>.json, un fichero
 * diminuto generado en el build con el registro de ESE libro y sus
 * relacionados ya calculados (ver build/book_files.py). Eso es lo único
 * que hace falta para pintar la ficha, así que la ficha aparece en
 * cuanto llega ese fichero — sin esperar al catálogo completo ni a
 * ninguna API externa.
 *
 * Todo lo demás (portada, sinopsis, sugerencias adicionales de Open
 * Library) se carga DESPUÉS, en segundo plano, sin bloquear lo que ya
 * se ve en pantalla.
 */
function fioBookDetail() {
  return {
    loading: true,
    notFound: false,
    book: null,
    relatedBooks: [],
    shareUrl: '',
    citationStyle: 'apa',
    favoritesEnabled: true,
    synopsis: '',
    synopsisLoading: false,

    async init() {
      try {
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get('id');
        const refParam = params.get('ref');

        let id = idParam;
        if (!id && refParam) {
          id = await this._resolveRefToId(refParam);
        }

        if (!id) {
          this.notFound = true;
          return;
        }

        const payload = await this._fetchBookFile(id);
        if (!payload || !payload.book) {
          this.notFound = true;
          return;
        }

        this.book = payload.book;
        this.relatedBooks = payload.related || [];
        this.shareUrl = window.location.href;
        document.title = this.book.title + ' — ' + fioT('site_title');

        // A partir de aquí ya hay una ficha completa en pantalla.
        // Todo lo que sigue (portada, sinopsis, ampliar relacionados
        // con Open Library) se hace en segundo plano.
        this.loading = false;
        this.$nextTick(() => {
          this._loadCover();
          this._loadSynopsis();
          this._enrichRelatedBooks();
        });
      } catch (err) {
        console.error(err);
        this.notFound = true;
        this.loading = false;
      }
    },

    // Valida `id` y devuelve un entero positivo NUEVO (no la cadena
    // original) apto para construir una URL local segura, o `null` si
    // no es un identificador de libro válido. Ver comentario en
    // _fetchBookFile() sobre por qué esto es distinto de solo probar
    // una expresión regular sobre el valor original.
    _toSafeBookId(id) {
      const parsed = Number.parseInt(String(id), 10);
      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        return null;
      }
      // Reconstruida a partir del número, no del string de la URL.
      return String(parsed);
    },

    async _fetchBookFile(id) {
      // Salvaguarda (CodeQL js/client-side-request-forgery): `id` viene de
      // la URL (?id=...), así que nunca se debe usar tal cual para
      // construir la ruta de fetch() — alguien podría manipular la URL
      // para intentar que el navegador pida un recurso fuera de
      // data/books/ (p. ej. usando "../"). Los identificadores de libro
      // son siempre enteros positivos (ver build/catalog_builder.py).
      //
      // No basta con comprobar el formato del valor original con una
      // expresión regular y seguir usando ESE mismo valor: para que el
      // análisis estático (CodeQL) reconozca que el dato ya no depende
      // de la entrada del usuario, se convierte a un número entero de
      // verdad (Number.isSafeInteger) y se reconstruye la URL a partir
      // de ESE número, nunca a partir de la cadena original tomada de
      // la URL. Si no es un entero positivo válido, se trata igual que
      // "libro no encontrado".
      const safeId = this._toSafeBookId(id);
      if (safeId === null) {
        return null;
      }
      const candidates = [
        `data/books/${safeId}.json`,
        `./data/books/${safeId}.json`,
        `../data/books/${safeId}.json`,
      ];
      let lastError = null;
      for (const candidate of candidates) {
        try {
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
      if (lastError) console.warn(lastError);
      return null;
    },

    async _resolveRefToId(ref) {
      const candidates = [
        'data/ref-index.json',
        './data/ref-index.json',
        '../data/ref-index.json',
      ];
      for (const candidate of candidates) {
        try {
          const res = await fetch(candidate);
          if (!res.ok) continue;
          const index = await res.json();
          const match = Object.keys(index).find(k => k.toLowerCase() === ref.toLowerCase());
          if (match) return index[match];
          return null;
        } catch (err) {
          // probar siguiente candidato
        }
      }
      return null;
    },

    async _loadCover() {
      const img = document.querySelector('img[data-cover-for]');
      if (!img || !this.book) return;
      const url = await fioResolveCover(this.book);
      if (url) {
        img.src = url;
      } else {
        img.outerHTML = `<span class="fio-cover-placeholder">${fioPlaceholderCoverSvg(this.book.title)}</span>`;
      }
    },

    bookSubtitleLine() {
      if (!this.book) return '';
      const parts = [];
      if (this.book.author) parts.push(this.book.author);
      if (this.book.publication_year) parts.push(String(this.book.publication_year));
      return parts.join(' · ');
    },

    // Aviso de conservación: solo para libros anteriores a 1950 (obras
    // frágiles). No depende de si está digitalizado o no; eso solo
    // decide el mensaje de abajo (verde/ámbar).
    needsConservationNotice() {
      return !!(this.book && this.book.publication_year && this.book.publication_year < 1950);
    },

    async _loadSynopsis() {
      if (!this.book) return;
      this.synopsisLoading = true;
      try {
        const syn = await window.fioGetOpenLibrarySynopsis?.(this.book) || '';
        this.synopsis = syn;
      } catch (err) {
        console.warn('Error loading synopsis:', err);
        this.synopsis = '';
      } finally {
        this.synopsisLoading = false;
      }
    },

    /**
     * Los relacionados por tema/autor ya vienen precalculados en el
     * fichero del libro y se ven al instante. Aquí se intenta mejorar
     * esa lista con sugerencias de Open Library, en paralelo (no en
     * serie, como hacía antes) y sin bloquear nada: si tarda o falla,
     * simplemente se quedan los relacionados que ya había.
     */
    async _enrichRelatedBooks() {
      if (!this.book || !window.fioGetOpenLibrarySuggestions) return;
      try {
        const extra = await window.fioGetOpenLibrarySuggestions(this.book, 6 - this.relatedBooks.length);
        if (extra && extra.length) {
          const seen = new Set(this.relatedBooks.map(b => String(b.id)));
          for (const item of extra) {
            if (seen.has(String(item.id))) continue;
            seen.add(String(item.id));
            this.relatedBooks.push(item);
            if (this.relatedBooks.length >= 6) break;
          }
        }
      } catch (err) {
        console.warn('Error enriqueciendo relacionados:', err);
      }
    },

    bookCitation() {
      return window.fioBuildCitation ? window.fioBuildCitation(this.book, this.citationStyle || 'apa') : '';
    },

    copyCitation() {
      if (!this.book) return;
      const text = this.bookCitation();
      if (!navigator.clipboard) {
        window.prompt('Cita bibliográfica:', text);
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        fioShowToast('Cita copiada');
      }).catch(() => {
        window.prompt('Cita bibliográfica:', text);
      });
    },

    toggleFavorite() {
      if (!this.book) return;
      const count = window.fioToggleFavorite ? window.fioToggleFavorite(this.book) : 0;
      this.favoritesEnabled = !!count;
      fioShowToast(count ? 'Añadido a favoritos' : 'Eliminado de favoritos');
    },

    isFavorite() {
      if (!this.book) return false;
      return !!(window.fioIsFavorite && window.fioIsFavorite(this.book.id));
    },

    copyShareLink() {
      if (!this.shareUrl) return;
      navigator.clipboard.writeText(this.shareUrl).then(() => fioShowToast('Enlace copiado')).catch(() => {
        window.prompt('Enlace a la ficha:', this.shareUrl);
      });
    }
  };
}
