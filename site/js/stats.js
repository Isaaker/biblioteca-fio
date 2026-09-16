/**
 * Estadísticas públicas del catálogo (estadisticas.html).
 *
 * Todo se calcula en el navegador a partir de catalog.json — no hay
 * ningún endpoint ni base de datos detrás. Con el tamaño actual del
 * catálogo de la Biblioteca FIO esto es instantáneo.
 */
function fioStats() {
  return {
    loading: true,
    error: '',
    total: 0,
    totalTopics: 0,
    totalLanguages: 0,
    byTopic: [],
    byLanguage: [],
    byDecade: [],
    byAuthor: [],
    byPublisher: [],
    bySpeciality: [],
    digitizedCount: 0,
    isbnCount: 0,
    seriesCount: 0,
    avgPages: 0,

    async init() {
      try {
        const payload = await window.fioFetchCatalog?.();
        if (!payload || !Array.isArray(payload.records)) {
          throw new Error('El catálogo no tiene registros válidos.');
        }
        const records = payload.records;
        this.total = records.length;

        const topicCounts = this._countBy(records, b => b.topic);
        this.totalTopics = Object.keys(topicCounts).length;
        this.byTopic = this._topN(topicCounts, 10);

        const languageCounts = this._countByMulti(records, b => b.language);
        this.totalLanguages = Object.keys(languageCounts).length;
        this.byLanguage = this._topN(languageCounts, 8);
        this.byAuthor = this._topN(this._countByMulti(records, b => b.author), 10);
        this.byPublisher = this._topN(this._countBy(records, b => b.publisher), 10);
        this.bySpeciality = this._topN(this._countBy(records, b => b.speciality), 10);

        const decadeCounts = this._countBy(records, b => {
          if (!b.publication_year) return null;
          const decade = Math.floor(b.publication_year / 10) * 10;
          return decade + 's';
        });
        this.byDecade = Object.entries(decadeCounts)
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
          .map(([label, count]) => ({ label, count }));

        this.digitizedCount = records.filter(b => b.is_digitized).length;
        this.isbnCount = records.filter(b => b.isbn).length;
        this.seriesCount = records.filter(b => b.series).length;

        const withPages = records.filter(b => b.num_pages);
        this.avgPages = withPages.length
          ? Math.round(withPages.reduce((sum, b) => sum + b.num_pages, 0) / withPages.length)
          : 0;
      } catch (err) {
        this.error = err && err.message ? err.message : 'No se pudo cargar el catálogo.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    get isbnPercent() { return this.total ? Math.round((this.isbnCount / this.total) * 100) : 0; },
    get seriesPercent() { return this.total ? Math.round((this.seriesCount / this.total) * 100) : 0; },

    _countBy(records, keyFn) {
      const counts = {};
      records.forEach(r => {
        const key = keyFn(r);
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    },

    // Como _countBy, pero para campos que pueden traer varios valores
    // separados por "/" (autor, idioma): cada valor cuenta por
    // separado, en vez de contar "Inglés / Español" como si fuera un
    // único idioma distinto de "Inglés" y de "Español".
    _countByMulti(records, keyFn) {
      const counts = {};
      records.forEach(r => {
        fioSplitMultiValues(keyFn(r)).forEach(value => {
          counts[value] = (counts[value] || 0) + 1;
        });
      });
      return counts;
    },

    _topN(counts, n) {
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([label, count]) => ({ label, count }));
    },

    barWidth(count, list) {
      const max = Math.max(...list.map(x => x.count), 1);
      return Math.round((count / max) * 100) + '%';
    },

    get digitizedPercent() {
      if (!this.total) return 0;
      return Math.round((this.digitizedCount / this.total) * 100);
    },
  };
}

// Alpine (build CSP) no evalúa expresiones arbitrarias: x-data solo puede
// referenciar componentes registrados explícitamente vía Alpine.data().
// Sin este registro, Alpine lanza "Undefined variable: <nombre>" y la
// página queda inaccesible (main con aria-hidden/inert).
document.addEventListener('alpine:init', () => {
  Alpine.data('fioStats', fioStats);
});
