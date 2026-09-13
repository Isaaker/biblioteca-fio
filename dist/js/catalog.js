/**
 * Catálogo público de la Biblioteca FIO — listado con filtros
 * avanzados (autor, tema, subtema, idioma, año, digitalizado) y
 * búsqueda general con la misma sintaxis que la búsqueda avanzada
 * (ver js/search-utils.js): "frases exactas", -excluir, a|b, erratas.
 *
 * Todo el catálogo vive en memoria (data/catalog.json) y se filtra en
 * el propio navegador: no hay backend ni base de datos.
 */
function fioCatalog() {
  return {
    // --- Estado ---------------------------------------------------------
    loading: true,
    error: null,
    allBooks: [],
    booksById: new Map(),
    generatedAt: null,
    _coverObserver: null,
    _urlSyncTimer: null,
    _queryDebounceTimer: null,

    // Filtros
    q: '',
    filterAuthor: '',
    filterTopic: '',
    filterSubtopic: '',
    filterLanguage: '',
    filterYear: '',
    filterDigitizedOnly: false,
    sortBy: 'title',
    sortOrder: 'asc',

    // Resultado del filtrado. Antes era un getter (`get filteredBooks()`)
    // que Alpine reevaluaba —filtrando los ~3.500 libros otra vez desde
    // cero— cada vez que cualquier parte de la plantilla lo leía
    // (totalPages, pagedBooks, el contador...), varias veces por cada
    // tecla pulsada. Ahora es un array normal que se recalcula una única
    // vez, explícitamente, con _recomputeFilteredBooks().
    filteredBooks: [],

    // Paginación
    page: 1,
    pageSize: 20,

    // --- Ciclo de vida ----------------------------------------------------
    async init() {
      this._applyUrlState();
      try {
        const payload = await window.fioFetchCatalog?.();
        if (!payload || !Array.isArray(payload.records)) {
          throw new Error('El catálogo no tiene registros válidos.');
        }
        this.allBooks = payload.records;
        this.booksById = new Map(this.allBooks.map(b => [String(b.id), b]));
        this.generatedAt = payload.generated_at || null;
        this._recomputeFilteredBooks();
        if (this.allBooks.length === 0) {
          window.fioShowBlockingPopup?.('casi-listos-2026-09');
        }
      } catch (err) {
        this.error = fioT('load_error');
        console.error(err);
        window.fioShowBlockingPopup?.('casi-listos-2026-09');
      } finally {
        this.loading = false;
        this.$nextTick(() => { this._jumpToHashBook(); this._loadVisibleCovers(); });
      }
      window.addEventListener('hashchange', () => this._jumpToHashBook());
    },

    _applyUrlState() {
      const params = new URLSearchParams(window.location.search);
      this.q = params.get('q') || '';
      this.filterAuthor = params.get('author') || '';
      this.filterTopic = params.get('topic') || '';
      this.filterSubtopic = params.get('subtopic') || '';
      this.filterLanguage = params.get('language') || '';
      this.filterYear = params.get('year') || '';
      this.filterDigitizedOnly = params.get('digitized') === '1';
      this.sortBy = params.get('sort') || 'title';
      this.sortOrder = params.get('order') || 'asc';
    },

    _syncUrlState() {
      const params = new URLSearchParams();
      if (this.q) params.set('q', this.q);
      if (this.filterAuthor) params.set('author', this.filterAuthor);
      if (this.filterTopic) params.set('topic', this.filterTopic);
      if (this.filterSubtopic) params.set('subtopic', this.filterSubtopic);
      if (this.filterLanguage) params.set('language', this.filterLanguage);
      if (this.filterYear) params.set('year', this.filterYear);
      if (this.filterDigitizedOnly) params.set('digitized', '1');
      if (this.sortBy && this.sortBy !== 'title') params.set('sort', this.sortBy);
      if (this.sortOrder && this.sortOrder !== 'asc') params.set('order', this.sortOrder);
      const query = params.toString();
      const next = query ? `?${query}` : window.location.pathname;
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', next);
      }
    },

    _jumpToHashBook() {
      const match = /^#book-(\d+)$/.exec(window.location.hash);
      if (!match) return;
      const targetId = Number(match[1]);
      if (!this.allBooks.some(b => b.id === targetId)) return;
      this.resetFilters();
      const index = this.filteredBooks.findIndex(b => b.id === targetId);
      if (index === -1) return;
      this.page = Math.floor(index / this.pageSize) + 1;
      this.$nextTick(() => {
        const el = document.getElementById('book-' + targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.outline = '2px solid var(--fio-blue)';
          setTimeout(() => { el.style.outline = ''; }, 2500);
        }
      });
    },

    // --- Listas para los desplegables de filtro ----------------------------
    // Autor e idioma pueden traer varios valores en un mismo campo
    // ("Inglés / Español", "Peter Smith / Isaac Rirneo"): se desglosan
    // aquí para que cada uno aparezca como una opción propia del
    // desplegable, en vez de como un valor combinado que no coincidiría
    // con ningún libro salvo el que tiene exactamente esa combinación.
    get authorOptions() { return this._sortedUnique(this.allBooks.flatMap(b => fioSplitMultiValues(b.author))); },
    get topicOptions() { return this._sortedUnique(this.allBooks.map(b => b.topic)); },
    get subtopicOptions() { return this._sortedUnique(this.allBooks.map(b => b.subtopic)); },
    get languageOptions() { return this._sortedUnique(this.allBooks.flatMap(b => fioSplitMultiValues(b.language))); },
    get yearOptions() { return this._sortedUnique(this.allBooks.map(b => b.publication_year), true).reverse(); },

    _sortedUnique(values, numeric = false) {
      const set = new Set(values.filter(v => v !== null && v !== undefined && v !== ''));
      const arr = Array.from(set);
      arr.sort(numeric ? (a, b) => a - b : (a, b) => String(a).localeCompare(String(b), 'es'));
      return arr;
    },

    // --- Filtrado ------------------------------------------------------------
    _recomputeFilteredBooks() {
      const parsedQuery = fioParseAdvancedQuery(this.q);
      let list = this.allBooks.filter(b => {
        if (this.filterAuthor && !fioSplitMultiValues(b.author).includes(this.filterAuthor)) return false;
        if (this.filterTopic && b.topic !== this.filterTopic) return false;
        if (this.filterSubtopic && b.subtopic !== this.filterSubtopic) return false;
        if (this.filterLanguage && !fioSplitMultiValues(b.language).includes(this.filterLanguage)) return false;
        if (this.filterYear && String(b.publication_year) !== String(this.filterYear)) return false;
        if (this.filterDigitizedOnly && !b.is_digitized) return false;
        if (!fioQueryIsEmpty(parsedQuery) && !fioTextMatchesQuery(fioBookSearchableText(b), parsedQuery)) return false;
        return true;
      });

      const dir = this.sortOrder === 'desc' ? -1 : 1;
      list.sort((a, b) => {
        let av, bv;
        if (this.sortBy === 'author') { av = a.author || ''; bv = b.author || ''; }
        else if (this.sortBy === 'year') { av = a.publication_year || 0; bv = b.publication_year || 0; }
        else { av = a.title || ''; bv = b.title || ''; }
        if (typeof av === 'string') return av.localeCompare(bv, 'es') * dir;
        return (av - bv) * dir;
      });

      this.filteredBooks = list;
    },

    get totalPages() { return Math.max(1, Math.ceil(this.filteredBooks.length / this.pageSize)); },
    get pagedBooks() {
      const start = (this.page - 1) * this.pageSize;
      return this.filteredBooks.slice(start, start + this.pageSize);
    },
    get pageNumbers() {
      const total = this.totalPages, current = this.page, span = 3;
      const start = Math.max(1, current - span), end = Math.min(total, current + span);
      const numbers = [];
      for (let i = start; i <= end; i++) numbers.push(i);
      return numbers;
    },

    goToPage(n) {
      this.page = Math.min(Math.max(1, n), this.totalPages);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.$nextTick(() => this._loadVisibleCovers());
    },

    resetFilters() {
      this.q = '';
      this.filterAuthor = '';
      this.filterTopic = '';
      this.filterSubtopic = '';
      this.filterLanguage = '';
      this.filterYear = '';
      this.filterDigitizedOnly = false;
      this.sortBy = 'title';
      this.sortOrder = 'asc';
      this.page = 1;
      this._recomputeFilteredBooks();
      this.$nextTick(() => this._loadVisibleCovers());
    },

    // Cambios en desplegables/checkbox (autor, tema, idioma, año,
    // orden...): son eventos poco frecuentes (una selección puntual), así
    // que se aplican al instante, sin debounce, con scroll a resultados.
    onFilterChange() {
      this.page = 1;
      this._recomputeFilteredBooks();
      this._syncUrlState();
      this.$nextTick(() => {
        this._loadVisibleCovers();
        const results = document.querySelector('.fio-book-list');
        if (results) {
          results.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },

    // Caja de búsqueda general: se escribe carácter a carácter, así que
    // aquí SÍ hace falta esperar una pequeña pausa (250 ms) antes de
    // refiltrar. Sin este debounce, cada pulsación repetía el filtrado
    // completo del catálogo y además desplazaba la página con un scroll
    // suave, lo que se notaba como una interfaz "pillada" al escribir
    // deprisa. Tampoco se hace scroll aquí: el cuadro ya está a la vista
    // mientras se escribe, así que mover la página de golpe solo estorba.
    onQueryInput() {
      clearTimeout(this._queryDebounceTimer);
      this._queryDebounceTimer = setTimeout(() => {
        this.page = 1;
        this._recomputeFilteredBooks();
        this._syncUrlState();
        this.$nextTick(() => this._loadVisibleCovers());
      }, 250);
    },

    // --- Portadas --------------------------------------------------------------
    _loadVisibleCovers() {
      const container = document.querySelector('.fio-book-list');
      if (!container) return;
      if (this._coverObserver) this._coverObserver.disconnect();
      this._coverObserver = fioLazyLoadCovers(container, this.booksById);
    },

    // --- Presentación --------------------------------------------------------
    bookSubtitle(b) {
      const parts = [];
      if (b.author) parts.push(b.author);
      if (b.publication_year) parts.push(String(b.publication_year));
      if (b.publisher) parts.push(b.publisher);
      return parts.join(' · ');
    },
  };
}
