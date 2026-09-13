/**
 * Página de búsqueda avanzada (buscar.html).
 *
 * Filtra en el navegador contra catalog.json usando el mismo motor de
 * js/search-utils.js (frases exactas, exclusión, OR, tolerancia a
 * erratas) que ya usa el catálogo, pero aquí con un formulario
 * multicampo completo (equivalente al de la antigua vista Flask
 * search_book.html): título, autor, referencia, tema, subtema,
 * editorial, idioma, serie, ISBN, rango de años y digitalizado.
 *
 * La "búsqueda con IA" no llama a ningún modelo desde aquí: genera un
 * prompt lidto para copiar y pegar (o abrir directamente) en el
 * asistente de IA que prefiera cada persona, que a su vez puede leer
 * el catálogo público (catalog.json) y llm.txt para responder.
 */
function fioSearch() {
  return {
    loading: true,
    catalog: [],
    booksById: new Map(),

    q: '',
    fTitle: '', fAuthor: '', fReference: '', fTopic: '', fSubtopic: '',
    fPublisher: '', fLanguage: '', fSeries: '', fIsbn: '',
    fYearFrom: '', fYearTo: '', fDigitizedOnly: false,
    sortBy: 'title', sortOrder: 'asc',
    showAdvanced: false,
    hasSearched: false,

    aiWhat: '',

    // Resultado de la búsqueda. Antes era un getter (`get results()`) que
    // Alpine reevaluaba desde cero —contador, lista vacía, x-for— cada vez
    // que se leía en la plantilla, varias veces por cada tecla pulsada.
    // Ahora es un array normal, recalculado explícitamente por
    // _recomputeResults().
    results: [],
    _queryDebounceTimer: null,

    async init() {
      this._applyUrlState();
      try {
        const payload = await window.fioFetchCatalog?.();
        if (!payload || !Array.isArray(payload.records)) {
          throw new Error('El catálogo no tiene registros válidos.');
        }
        this.catalog = payload.records;
        this.booksById = new Map(this.catalog.map(b => [String(b.id), b]));
        this._recomputeResults();
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
        this.$nextTick(() => this._loadVisibleCovers());
      }
    },

    _applyUrlState() {
      const params = new URLSearchParams(window.location.search);
      this.q = params.get('q') || '';
      this.fTitle = params.get('title') || '';
      this.fAuthor = params.get('author') || '';
      this.fReference = params.get('reference') || '';
      this.fTopic = params.get('topic') || '';
      this.fSubtopic = params.get('subtopic') || '';
      this.fPublisher = params.get('publisher') || '';
      this.fLanguage = params.get('language') || '';
      this.fSeries = params.get('series') || '';
      this.fIsbn = params.get('isbn') || '';
      this.fYearFrom = params.get('year_from') || '';
      this.fYearTo = params.get('year_to') || '';
      this.fDigitizedOnly = params.get('digitized') === '1';
      this.hasSearched = !!(this.q || this._hasAdvancedFilters());
    },

    _syncUrlState() {
      const params = new URLSearchParams();
      if (this.q) params.set('q', this.q);
      if (this.fTitle) params.set('title', this.fTitle);
      if (this.fAuthor) params.set('author', this.fAuthor);
      if (this.fReference) params.set('reference', this.fReference);
      if (this.fTopic) params.set('topic', this.fTopic);
      if (this.fSubtopic) params.set('subtopic', this.fSubtopic);
      if (this.fPublisher) params.set('publisher', this.fPublisher);
      if (this.fLanguage) params.set('language', this.fLanguage);
      if (this.fSeries) params.set('series', this.fSeries);
      if (this.fIsbn) params.set('isbn', this.fIsbn);
      if (this.fYearFrom) params.set('year_from', this.fYearFrom);
      if (this.fYearTo) params.set('year_to', this.fYearTo);
      if (this.fDigitizedOnly) params.set('digitized', '1');
      const query = params.toString();
      const next = query ? `?${query}` : window.location.pathname;
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', next);
      }
    },

    get topicOptions() { return this._sortedUnique(this.catalog.map(b => b.topic)); },
    get languageOptions() { return this._sortedUnique(this.catalog.flatMap(b => fioSplitMultiValues(b.language))); },
    _sortedUnique(values) {
      return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'es'));
    },

    _recomputeResults() {
      if (!this.hasSearched) { this.results = []; return; }
      const parsedQuery = fioParseAdvancedQuery(this.q);

      let list = this.catalog.filter(b => {
        if (!fioQueryIsEmpty(parsedQuery) && !fioTextMatchesQuery(fioBookSearchableText(b), parsedQuery)) return false;
        if (this.fTitle && !fioFieldMatches(b.title, this.fTitle)) return false;
        if (this.fAuthor && !fioFieldMatches(b.author, this.fAuthor)) return false;
        if (this.fReference && !fioFieldMatches(b.reference, this.fReference)) return false;
        if (this.fTopic && b.topic !== this.fTopic) return false;
        if (this.fSubtopic && !fioFieldMatches(b.subtopic, this.fSubtopic)) return false;
        if (this.fPublisher && !fioFieldMatches(b.publisher, this.fPublisher)) return false;
        if (this.fLanguage && !fioSplitMultiValues(b.language).includes(this.fLanguage)) return false;
        if (this.fSeries && !fioFieldMatches(b.series, this.fSeries)) return false;
        if (this.fIsbn && !(b.isbn || '').replace(/[^0-9Xx]/g, '').includes(this.fIsbn.replace(/[^0-9Xx]/g, ''))) return false;
        if (this.fYearFrom && (!b.publication_year || b.publication_year < Number(this.fYearFrom))) return false;
        if (this.fYearTo && (!b.publication_year || b.publication_year > Number(this.fYearTo))) return false;
        if (this.fDigitizedOnly && !b.is_digitized) return false;
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

      this.results = list;
    },

    submitSearch() {
      clearTimeout(this._queryDebounceTimer);
      this.hasSearched = true;
      this._recomputeResults();
      this._syncUrlState();
      this.$nextTick(() => {
        this._loadVisibleCovers();
        this._scrollToResults();
      });
    },

    // La caja de "búsqueda general" es instantánea: en cuanto se escribe
    // algo, se muestran resultados sin esperar a pulsar "Buscar" (esto
    // sustituye al antiguo buscador de texto libre duplicado, que
    // confundía al mostrar dos cuadros de búsqueda distintos en la misma
    // página).
    //
    // Dos cosas se cuidan aquí para que no se note "pillado" al escribir
    // deprisa:
    //   1. El filtrado se espera 250 ms tras la última tecla (debounce),
    //      en vez de repetirse en cada pulsación.
    //   2. Ya NO se hace scroll automático en cada tecla: antes, cada
    //      pulsación desplazaba la página suavemente hacia los
    //      resultados, lo cual competía visualmente con la propia
    //      escritura. El scroll a resultados solo ocurre al pulsar
    //      "Buscar" (submitSearch), que es una acción explícita.
    onGeneralInput() {
      clearTimeout(this._queryDebounceTimer);
      this._queryDebounceTimer = setTimeout(() => {
        if (this.q.trim()) {
          this.hasSearched = true;
          this._recomputeResults();
          this._syncUrlState();
          this.$nextTick(() => this._loadVisibleCovers());
        } else if (!this._hasAdvancedFilters()) {
          this.hasSearched = false;
          this.results = [];
          this._syncUrlState();
        }
      }, 250);
    },

    _scrollToResults() {
      const target = document.querySelector('.fio-search-results, .fio-result-count');
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    _hasAdvancedFilters() {
      return !!(this.fTitle || this.fAuthor || this.fReference || this.fTopic ||
        this.fSubtopic || this.fPublisher || this.fLanguage || this.fSeries ||
        this.fIsbn || this.fYearFrom || this.fYearTo || this.fDigitizedOnly);
    },

    clearForm() {
      clearTimeout(this._queryDebounceTimer);
      this.q = ''; this.fTitle = ''; this.fAuthor = ''; this.fReference = '';
      this.fTopic = ''; this.fSubtopic = ''; this.fPublisher = ''; this.fLanguage = '';
      this.fSeries = ''; this.fIsbn = ''; this.fYearFrom = ''; this.fYearTo = '';
      this.fDigitizedOnly = false; this.sortBy = 'title'; this.sortOrder = 'asc';
      this.hasSearched = false;
      this.results = [];
      this._syncUrlState();
    },

    // --- Exportación de resultados (ver js/export-utils.js) -------------------
    exportResultsCsv() {
      window.fioExportBooksCsv?.(this.results, 'biblioteca-fio-busqueda');
    },

    exportResultsBibtex() {
      window.fioExportBooksBibtex?.(this.results, 'biblioteca-fio-busqueda');
    },


    _loadVisibleCovers() {
      const container = document.querySelector('.fio-search-results');
      if (!container) return;
      fioLazyLoadCovers(container, this.booksById);
    },

    // --- Búsqueda con IA (externalizada) ------------------------------------
    get aiPrompt() {
      const what = this.aiWhat.trim() || '(describe aquí lo que buscas: tema, autor, época, idioma...)';
      const origin = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
      return `Eres un asistente de biblioteca. Tengo acceso al catálogo público de la ` +
        `Biblioteca de la Fundación Infante de Orleans (FIO), especializada en aviación e ` +
        `historia aeronáutica.\n\n` +
        `Antes de responder, lee estas dos URLs (son de acceso público, sin necesidad de ` +
        `autenticación):\n` +
        `1. ${origin}llm.txt — explica cómo está organizado el catálogo.\n` +
        `2. ${origin}data/catalog.json — el catálogo completo, en JSON.\n\n` +
        `Con esa información, recomiéndame libros del catálogo (con título exacto, autor y ` +
        `referencia tal como aparecen en catalog.json) que encajen con lo que busco:\n\n` +
        `${what}`;
    },

    async copyAiPrompt() {
      try {
        await navigator.clipboard.writeText(this.aiPrompt);
        fioShowToast(fioT('ai_search_copied'));
      } catch (err) {
        fioShowAlert(this.aiPrompt, 'info');
      }
    },

    openAiWith(service) {
      const encoded = encodeURIComponent(this.aiPrompt);
      const urls = {
        chatgpt: 'https://chatgpt.com/?q=' + encoded,
        perplexity: 'https://www.perplexity.ai/?q=' + encoded,
        duck: 'https://duck.ai/chat?ia=chat&origin=funnel_home_website&t=h_&kp=1&duckai=1&home=1&prompt=1&chip-select=chat&q=' + encoded,
      };
      const url = urls[service];
      if (url) window.open(url, '_blank', 'noopener');
    },
  };
}

/** Coincidencia parcial e insensible a mayúsculas/acentos para un campo suelto del formulario. */
function fioFieldMatches(value, needle) {
  if (!value) return false;
  return fioNormalizeKey(value).includes(fioNormalizeKey(needle));
}
