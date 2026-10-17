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

    // Groq (respuesta directa en la página, con clave de API del propio usuario).
    groqOpen: false,
    groqKey: '',
    groqModel: 'llama-3.3-70b-versatile',
    groqLoading: false,
    groqAnswer: '',
    groqError: '',
    _historyTimer: null,

    // Resultado de la búsqueda. Antes era un getter (`get results()`) que
    // Alpine reevaluaba desde cero —contador, lista vacía, x-for— cada vez
    // que se leía en la plantilla, varias veces por cada tecla pulsada.
    // Ahora es un array normal, recalculado explícitamente por
    // _recomputeResults().
    results: [],
    _queryDebounceTimer: null,

    async init() {
      this._applyUrlState();
      this._loadGroqPrefs();
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

    _buildParams() {
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
      return params;
    },

    _syncUrlState() {
      const query = this._buildParams().toString();
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

    // --- Historial de búsquedas (ver fio-ux.js) -----------------------------
    // Texto legible de la búsqueda actual: la consulta general más los
    // valores de los filtros avanzados que estén rellenos.
    _historyLabel() {
      return [
        this.q, this.fTitle, this.fAuthor, this.fReference, this.fTopic,
        this.fSubtopic, this.fPublisher, this.fLanguage, this.fSeries,
        this.fIsbn,
        this.fYearFrom ? '≥ ' + this.fYearFrom : '',
        this.fYearTo ? '≤ ' + this.fYearTo : '',
        this.fDigitizedOnly ? fioT('filter_digitized_only') : '',
      ].map(v => String(v || '').trim()).filter(Boolean).join(' · ');
    },

    _recordHistory() {
      if (typeof window.fioRecordSearch !== 'function') return;
      const query = this._buildParams().toString();
      if (!query) return;
      window.fioRecordSearch('buscar.html?' + query, this._historyLabel());
    },

    submitSearch() {
      clearTimeout(this._queryDebounceTimer);
      clearTimeout(this._historyTimer);
      this.hasSearched = true;
      this._recomputeResults();
      this._syncUrlState();
      this._recordHistory();
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
          // La búsqueda instantánea no se guarda en cada tecla: solo si la
          // persona se detiene un momento (1,5 s) con al menos 3 caracteres.
          clearTimeout(this._historyTimer);
          if (this.q.trim().length >= 3) {
            this._historyTimer = setTimeout(() => this._recordHistory(), 1500);
          }
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
        `2. ${origin}data/catalog-lite.json — el catálogo completo en formato ligero, en JSON.\n\n` +
        `Con esa información, recomiéndame libros del catálogo (con título exacto, autor y ` +
        `referencia tal como aparecen en catalog-lite.json) que encajen con lo que busco. ` +
        `Si necesitas datos que no estén ahí, consulta catalog-index.json y las partes del catálogo ` +
        `completo antes de responder:\n\n` +
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
        claude: 'https://claude.ai/new?q=' + encoded,
        copilot: 'https://copilot.microsoft.com/?q=' + encoded,
        mistral: 'https://chat.mistral.ai/chat?q=' + encoded,
      };
      const url = urls[service];
      if (url) window.open(url, '_blank', 'noopener');
    },

    // --- Groq: respuesta directa en la página ------------------------------
    // A diferencia del resto de asistentes (que se abren en su web y leen el
    // catálogo por URL), la API de Groq no navega por internet. Por eso aquí
    // se preseleccionan en el navegador los libros que mejor encajan con la
    // pregunta y se envían solo esos (no el catálogo entero) junto a ella.
    // La clave de API es la de la propia persona y solo se guarda en este
    // navegador (localStorage); nunca pasa por servidores de la Fundación.
    _loadGroqPrefs() {
      try {
        this.groqKey = localStorage.getItem('fio-groq-key-v1') || '';
        this.groqModel = localStorage.getItem('fio-groq-model-v1') || this.groqModel;
      } catch (err) { /* storage bloqueado: se usa solo en memoria */ }
    },

    get groqHasKey() { return !!this.groqKey.trim(); },
    get groqNoKey() { return !this.groqKey.trim(); },
    get groqShowAnswer() { return !!this.groqAnswer; },
    get groqShowError() { return !!this.groqError; },
    get groqIdle() { return !this.groqLoading; },

    openGroq() {
      this.groqOpen = true;
      this.groqError = '';
    },

    closeGroq() {
      this.groqOpen = false;
    },

    saveGroqKey() {
      try {
        localStorage.setItem('fio-groq-key-v1', this.groqKey.trim());
        localStorage.setItem('fio-groq-model-v1', (this.groqModel || '').trim());
      } catch (err) { /* ignorado */ }
      fioShowToast(fioT('groq_key_saved'));
    },

    forgetGroqKey() {
      this.groqKey = '';
      try { localStorage.removeItem('fio-groq-key-v1'); } catch (err) { /* ignorado */ }
      fioShowToast(fioT('groq_key_removed'));
    },

    // Libros del catálogo que mejor encajan con el texto de la pregunta.
    _groqCandidates(limit) {
      const stop = new Set(['sobre', 'para', 'como', 'libro', 'libros', 'quiero', 'busco', 'buscar',
        'with', 'about', 'books', 'book', 'looking', 'that', 'the', 'and', 'por', 'una', 'uno',
        'los', 'las', 'del', 'que', 'con', 'publicado', 'publicados', 'antes', 'despues']);
      const terms = fioTokenize(this.aiWhat)
        .filter(t => t.length >= 3 && !stop.has(t))
        .map(t => (t.length > 4 ? t.replace(/(es|s)$/, '') : t));
      if (!terms.length) return [];
      const scored = [];
      for (const book of this.catalog) {
        const hay = fioNormalizeKey(fioBookSearchableText(book));
        let score = 0;
        for (const t of terms) if (hay.includes(t)) score += 1;
        if (score > 0) scored.push({ book, score });
      }
      scored.sort((a, b) => b.score - a.score || String(a.book.title).localeCompare(String(b.book.title), 'es'));
      return scored.slice(0, limit).map(x => x.book);
    },

    async askGroq() {
      this.groqError = '';
      this.groqAnswer = '';
      const key = this.groqKey.trim();
      const question = this.aiWhat.trim();
      if (!key) { this.groqError = fioT('groq_need_key'); return; }
      if (!question) { this.groqError = fioT('groq_need_question'); return; }

      const picks = this._groqCandidates(40);
      const list = picks.length
        ? picks.map(b => `- [${b.reference || 's/ref'}] ${b.title}` +
            `${b.author ? ' — ' + b.author : ''}` +
            `${b.publication_year ? ' (' + b.publication_year + ')' : ''}` +
            `${b.topic ? ' · ' + b.topic : ''}`).join('\n')
        : '(ningún libro del catálogo coincide con las palabras de la pregunta)';

      const messages = [
        {
          role: 'system',
          content: 'Eres el asistente de la Biblioteca de la Fundación Infante de Orleans (FIO), ' +
            'especializada en aviación e historia aeronáutica. Responde en el mismo idioma que la pregunta, ' +
            'de forma breve. Recomienda ÚNICAMENTE libros de la lista que se te da, citando título exacto, ' +
            'autor y referencia tal como aparecen. Si ninguno encaja, dilo claramente sin inventar títulos.',
        },
        { role: 'user', content: `Pregunta: ${question}\n\nLibros candidatos del catálogo:\n${list}` },
      ];

      this.groqLoading = true;
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
          body: JSON.stringify({
            model: (this.groqModel || '').trim() || 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.3,
            max_tokens: 900,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const detail = (data && data.error && data.error.message) || ('HTTP ' + response.status);
          throw new Error(detail);
        }
        this.groqAnswer = (data.choices && data.choices[0] && data.choices[0].message &&
          data.choices[0].message.content || '').trim();
        if (!this.groqAnswer) throw new Error('respuesta vacía');
      } catch (err) {
        console.error(err);
        this.groqError = fioT('groq_error') + ': ' + (err && err.message ? err.message : err);
      } finally {
        this.groqLoading = false;
      }
    },
  };
}

/** Coincidencia parcial e insensible a mayúsculas/acentos para un campo suelto del formulario. */
function fioFieldMatches(value, needle) {
  if (!value) return false;
  return fioNormalizeKey(value).includes(fioNormalizeKey(needle));
}

// Alpine (build CSP) no evalúa expresiones arbitrarias: x-data solo puede
// referenciar componentes registrados explícitamente vía Alpine.data().
// Sin este registro, Alpine lanza "Undefined variable: <nombre>" y la
// página queda inaccesible (main con aria-hidden/inert).
document.addEventListener('alpine:init', () => {
  Alpine.data('fioSearch', fioSearch);
});
