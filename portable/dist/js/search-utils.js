/**
 * Motor de búsqueda avanzada, portado de library/text_utils.py (app
 * Flask original) a JavaScript puro, para poder ejecutarse en el
 * navegador contra catalog.json.
 *
 * Sintaxis soportada en el campo de búsqueda general:
 *   "frase exacta"      -> debe aparecer tal cual (normalizada)
 *   -palabra              -> excluye resultados que la contengan
 *   palabra1|palabra2     -> basta con que aparezca una de las dos
 *   palabra normal         -> debe aparecer (tolera una errata razonable)
 */
function fioStripAccents(text) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function fioNormalizeKey(text) {
  if (!text) return '';
  return fioStripAccents(String(text)).toLowerCase().replace(/\s+/g, ' ').trim();
}

function fioTokenize(text) {
  return fioNormalizeKey(text).split(' ').filter(Boolean);
}

function fioLevenshteinAtMost(a, b, maxDistance) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > maxDistance) return false;

  let previous = [];
  for (let j = 0; j <= b.length; j++) previous.push(j);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > maxDistance) return false;
    previous = current;
  }
  return previous[previous.length - 1] <= maxDistance;
}

/**
 * Un término se trata como "código" (referencia LB0001, ISBN, año,
 * tamaño en cm...) si contiene al menos un dígito. Para estos NO se
 * aplica tolerancia a erratas: un solo dígito de diferencia cambia
 * completamente el significado ("LB1928" y "LB1928" son el mismo
 * libro; "LB1928" y "LB1928" con un dígito cambiado es un libro
 * totalmente distinto, no una errata de tecleo). Antes, con distancia
 * de edición ≤1, buscar "LB1928" también encontraba LB0928, LB1028,
 * LB1128... (todas las referencias a solo un dígito de distancia),
 * inundando los resultados de libros irrelevantes.
 *
 * La tolerancia a erratas solo tiene sentido para palabras (nombres,
 * títulos): ahí sí es habitual una letra de más/menos o cambiada.
 */
function fioLooksLikeCode(token) {
  return /\d/.test(token);
}

function fioFuzzyContains(haystackKey, haystackTokens, needle) {
  if (haystackKey.includes(needle)) return true;
  if (needle.length < 4) return false;
  if (fioLooksLikeCode(needle)) return false;
  const maxDistance = needle.length <= 7 ? 1 : 2;
  for (const tok of haystackTokens) {
    if (fioLooksLikeCode(tok)) continue;
    if (Math.abs(tok.length - needle.length) > maxDistance) continue;
    if (fioLevenshteinAtMost(needle, tok, maxDistance)) return true;
  }
  return false;
}

const FIO_QUERY_TOKEN_RE = /"([^"]+)"|(-?[^\s"]+)/g;

function fioParseAdvancedQuery(raw) {
  const parsed = { phrases: [], exclude: [], required: [], orGroups: [] };
  if (!raw || !raw.trim()) return parsed;

  let match;
  FIO_QUERY_TOKEN_RE.lastIndex = 0;
  while ((match = FIO_QUERY_TOKEN_RE.exec(raw)) !== null) {
    const [, phrase, token] = match;
    if (phrase) {
      const key = fioNormalizeKey(phrase);
      if (key) parsed.phrases.push(key);
      continue;
    }
    if (!token) continue;
    if (token.startsWith('-') && token.length > 1) {
      const key = fioNormalizeKey(token.slice(1));
      if (key) parsed.exclude.push(key);
      continue;
    }
    if (token.includes('|')) {
      const group = token.split('|').map(fioNormalizeKey).filter(Boolean);
      if (group.length === 1) parsed.required.push(group[0]);
      else if (group.length) parsed.orGroups.push(group);
      continue;
    }
    const key = fioNormalizeKey(token);
    if (key) parsed.required.push(key);
  }
  return parsed;
}

function fioQueryIsEmpty(parsed) {
  return !(parsed.phrases.length || parsed.exclude.length || parsed.required.length || parsed.orGroups.length);
}

function fioTextMatchesQuery(haystack, parsed) {
  if (fioQueryIsEmpty(parsed)) return true;
  const haystackKey = fioNormalizeKey(haystack);
  if (!haystackKey) return false;
  const haystackTokens = haystackKey.split(' ');

  for (const phrase of parsed.phrases) {
    if (!haystackKey.includes(phrase)) return false;
  }
  for (const word of parsed.exclude) {
    if (haystackKey.includes(word)) return false;
  }
  for (const word of parsed.required) {
    if (!fioFuzzyContains(haystackKey, haystackTokens, word)) return false;
  }
  for (const group of parsed.orGroups) {
    if (!group.some(word => fioFuzzyContains(haystackKey, haystackTokens, word))) return false;
  }
  return true;
}

/** Texto combinado de un libro sobre el que se aplica la búsqueda general "q". */
function fioBookSearchableText(book) {
  const parts = [
    book.title, book.subtitle, book.author, book.reference, book.topic,
    book.subtopic, book.speciality, book.specifications, book.publisher,
    book.series, book.isbn, book.language, book.place, book.edition,
  ].filter(Boolean);

  // El ISBN se guarda con guiones ("84-87695-18-3"), pero lo habitual
  // es buscarlo tecleando solo los dígitos. Se añade esa variante sin
  // guiones como término adicional para que ambas formas encuentren
  // el libro.
  if (book.isbn) {
    const isbnDigits = String(book.isbn).replace(/[^0-9Xx]/g, '');
    if (isbnDigits) parts.push(isbnDigits);
  }

  return parts.join(' ');
}

/**
 * Algunos campos del Excel meten varios valores en un solo texto,
 * separados por "/" (p. ej. idioma "Inglés / Español", o autoría
 * conjunta "Peter Smith / Isaac Rirneo"). Se muestran siempre unidos
 * tal cual en la ficha del libro — pero para filtros, desplegables,
 * búsqueda por campo exacto y estadísticas, cada valor debe contar
 * por separado (si no, "Inglés / Español" nunca coincidiría con el
 * filtro "Español" ni se contaría como un libro en español en las
 * estadísticas). Esta función hace ese desglose; se usa en catalog.js,
 * search.js y stats.js, nunca para lo que se muestra en pantalla.
 */
function fioSplitMultiValues(value) {
  if (!value) return [];
  return String(value)
    .split('/')
    .map(v => v.trim())
    .filter(Boolean);
}
