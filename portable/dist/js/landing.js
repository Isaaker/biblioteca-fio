/**
 * Estadísticas rápidas de la portada (nº de libros, temas, idiomas,
 * digitalizados), calculadas en el navegador a partir de catalog.json.
 * No hay backend: es la misma fuente de datos que usa el catálogo.
 */
function fioLanding() {
  return {
    loading: true,
    stats: { total: 0, topics: 0, languages: 0, digitized: 0 },

    async init() {
      try {
        const payload = await window.fioFetchCatalog?.();
        if (!payload || !Array.isArray(payload.records)) {
          throw new Error('El catálogo no tiene registros válidos.');
        }
        const records = payload.records;
        this.stats.total = records.length;
        this.stats.topics = new Set(records.map(b => b.topic).filter(Boolean)).size;
        this.stats.languages = new Set(records.flatMap(b => fioSplitMultiValues(b.language))).size;
        this.stats.digitized = records.filter(b => b.is_digitized).length;
      } catch (err) {
        console.error('No se pudieron calcular las estadísticas del catálogo', err);
      } finally {
        this.loading = false;
      }
    },
  };
}
