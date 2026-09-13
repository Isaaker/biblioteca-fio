/**
 * Exportación de resultados de búsqueda a ficheros descargables, sin
 * backend: todo ocurre en el navegador a partir de los mismos objetos
 * de libro que ya se muestran en pantalla (data/catalog.json).
 *
 * Se usa desde site/js/search.js (botones "Exportar a CSV" / "Exportar
 * a BibTeX" de buscar.html), pero las funciones son genéricas: reciben
 * la lista de libros a exportar y no dependen de Alpine ni de ningún
 * estado de página.
 */
(function () {
  /** Fuerza la descarga de un Blob de texto con el nombre indicado. */
  function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revocar en el siguiente ciclo, para no cortar la descarga en
    // navegadores que resuelven el enlace de forma asíncrona.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function timestampForFilename() {
    return new Date().toISOString().slice(0, 10);
  }

  // --- CSV ------------------------------------------------------------------

  const CSV_COLUMNS = [
    ['reference', 'Referencia'],
    ['title', 'Título'],
    ['author', 'Autor'],
    ['publisher', 'Editorial'],
    ['publication_year', 'Año'],
    ['topic', 'Tema'],
    ['subtopic', 'Subtema'],
    ['language', 'Idioma'],
    ['series', 'Serie'],
    ['isbn', 'ISBN'],
    ['is_digitized', 'Digitalizado'],
    ['digital_link', 'Enlace copia digital'],
  ];

  /** Escapa un valor para una celda CSV (RFC 4180: comillas dobladas, entre comillas si hace falta). */
  function csvEscapeCell(value) {
    const text = value === null || value === undefined ? '' : String(value);
    if (/[",\n;]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function booksToCsv(books) {
    const header = CSV_COLUMNS.map(([, label]) => csvEscapeCell(label)).join(',');
    const rows = books.map((book) =>
      CSV_COLUMNS.map(([field]) => {
        const raw = book[field];
        if (field === 'is_digitized') return raw ? 'Sí' : 'No';
        return csvEscapeCell(raw);
      }).join(',')
    );
    // BOM UTF-8 al principio: sin esto, Excel en Windows interpreta el
    // fichero como Latin-1 y rompe los acentos/eñes al abrirlo.
    return '\uFEFF' + [header, ...rows].join('\r\n');
  }

  function exportBooksCsv(books, filenamePrefix) {
    if (!Array.isArray(books) || books.length === 0) return;
    const csv = booksToCsv(books);
    downloadTextFile(`${filenamePrefix}-${timestampForFilename()}.csv`, csv, 'text/csv');
  }

  // --- BibTeX -----------------------------------------------------------------

  /**
   * Genera una clave BibTeX razonable a partir de autor + año + título
   * (p. ej. "garcia2019alas"), sin garantizar unicidad estricta más
   * allá de un sufijo numérico si dos claves coinciden.
   */
  function bibtexKey(book, usedKeys) {
    const authorPart = fioNormalizeKey((book.author || 'anon').split(/[,/]| y | and /i)[0])
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20) || 'anon';
    const yearPart = book.publication_year ? String(book.publication_year) : 's-f';
    const titlePart = fioNormalizeKey(book.title || '')
      .split(' ')
      .filter(Boolean)[0] || 'obra';

    let base = `${authorPart}${yearPart}${titlePart}`.replace(/[^a-z0-9]/g, '');
    let key = base;
    let suffix = 1;
    while (usedKeys.has(key)) {
      key = `${base}${suffix}`;
      suffix += 1;
    }
    usedKeys.add(key);
    return key;
  }

  /** Escapa caracteres especiales de BibTeX en un valor de campo. */
  function bibtexEscape(value) {
    return String(value ?? '').replace(/[{}]/g, '');
  }

  function bookToBibtexEntry(book, usedKeys) {
    const key = bibtexKey(book, usedKeys);
    const fields = [];

    fields.push(['title', book.title]);
    if (book.author) fields.push(['author', book.author]);
    if (book.publisher) fields.push(['publisher', book.publisher]);
    if (book.publication_year) fields.push(['year', book.publication_year]);
    if (book.series) fields.push(['series', book.series]);
    if (book.isbn) fields.push(['isbn', book.isbn]);
    if (book.language) fields.push(['language', book.language]);
    if (book.reference) fields.push(['note', `Referencia Biblioteca FIO: ${book.reference}`]);
    fields.push(['address', 'Madrid, España']);

    const body = fields
      .map(([field, value]) => `  ${field} = {${bibtexEscape(value)}}`)
      .join(',\n');

    return `@book{${key},\n${body}\n}`;
  }

  function booksToBibtex(books) {
    const usedKeys = new Set();
    return books.map((book) => bookToBibtexEntry(book, usedKeys)).join('\n\n') + '\n';
  }

  function exportBooksBibtex(books, filenamePrefix) {
    if (!Array.isArray(books) || books.length === 0) return;
    const bibtex = booksToBibtex(books);
    downloadTextFile(`${filenamePrefix}-${timestampForFilename()}.bib`, bibtex, 'application/x-bibtex');
  }

  window.fioExportBooksCsv = exportBooksCsv;
  window.fioExportBooksBibtex = exportBooksBibtex;
})();
