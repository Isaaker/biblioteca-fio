/**
 * Avisos emergentes configurables desde un fichero JSON
 * (data/popups.json), sin tocar código ni HTML.
 *
 * Pensado para avisos temporales tipo "estamos de obras", "horario
 * especial hoy", "nueva sede", etc. — cosas que alguien sin
 * conocimientos técnicos debería poder activar/editar/desactivar
 * editando solo el JSON desde la web de GitHub, igual que
 * data/digitalizados.json.
 *
 * Formato de cada popup en data/popups.json (ver ese fichero para el
 * ejemplo activo ahora mismo y los comentarios de cada campo):
 *   id        (obligatorio, único, no cambiar una vez publicado)
 *   active    (true/false)
 *   type      "modal" (ventana centrada, bloquea el resto) |
 *             "banner" (franja arriba de la página, no bloquea)
 *   pages     lista de páginas donde debe aparecer (p. ej.
 *             ["index.html"]), o ["*"] para todas
 *   dismiss   "session" (no se repite hasta cerrar el navegador) |
 *             "once"    (no se vuelve a mostrar nunca, aunque
 *                         reabras el navegador) |
 *             "always"  (se muestra en cada visita a la página)
 *   title     { es: "...", en: "..." } (solo se usa en type "modal")
 *   body      { es: "...", en: "..." }
 *   link      opcional: { url: "...", text: { es: "...", en: "..." } }
 *
 * Varios popups pueden estar activos a la vez: se muestran uno detrás
 * de otro (el siguiente aparece al cerrar el anterior), en el orden en
 * que aparecen en el JSON.
 */
(function () {
  const STORAGE_PREFIX = 'fio-popup-dismissed-';

  function currentPageFile() {
    let path = window.location.pathname;
    let last = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    if (!last.endsWith('.html')) last += '.html';
    return last;
  }

  function currentLang() {
    return (window.fioCurrentLang && window.fioCurrentLang()) || 'es';
  }

  function isDismissed(popup) {
    if (popup.dismiss === 'always') return false;
    const key = STORAGE_PREFIX + popup.id;
    const store = popup.dismiss === 'once' ? localStorage : sessionStorage;
    return store.getItem(key) === '1';
  }

  function markDismissed(popup) {
    if (popup.dismiss === 'always') return;
    const key = STORAGE_PREFIX + popup.id;
    const store = popup.dismiss === 'once' ? localStorage : sessionStorage;
    store.setItem(key, '1');
  }

  // El contenido de data/popups.json lo edita a mano cualquier
  // voluntario desde la web de GitHub, sin pasar por revisión de
  // código: nunca se debe volcar tal cual dentro de innerHTML, para
  // que un error de tecleo (o una edición futura poco cuidadosa) no
  // pueda acabar inyectando HTML/JS en la página. Por eso todo texto
  // se escapa aquí antes de insertarse.
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function localizedText(field, lang) {
    if (!field) return '';
    if (typeof field === 'string') return escapeHtml(field); // por si alguien escribe un texto sin es/en
    return escapeHtml(field[lang] || field.es || field.en || '');
  }

  function isSafeLinkUrl(url) {
    try {
      // Relativas (p. ej. "contacto.html") se resuelven contra la
      // página actual; solo se aceptan esquemas http(s), nunca
      // "javascript:" ni similares.
      const resolved = new URL(url, window.location.href);
      return resolved.protocol === 'http:' || resolved.protocol === 'https:';
    } catch (err) {
      return false;
    }
  }

  function buildLinkHtml(popup, lang) {
    if (!popup.link || !popup.link.url || !isSafeLinkUrl(popup.link.url)) return '';
    // El enlace se construye como elemento del DOM (no como HTML en
    // bruto) para que la URL nunca pueda "escapar" del atributo href,
    // y luego se serializa ya escapado.
    const rawText = (popup.link.text && (popup.link.text[lang] || popup.link.text.es || popup.link.text.en)) || popup.link.url;
    const a = document.createElement('a');
    a.href = popup.link.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = rawText;
    return ' ' + a.outerHTML;
  }

  function showModal(popup, lang, onClose) {
    const wrap = document.createElement('div');
    wrap.className = 'fio-modal-backdrop fio-popup-modal';
    wrap.innerHTML = `
      <div class="fio-modal">
        <div class="fio-modal-header">
          <h3>${localizedText(popup.title, lang)}</h3>
          <button type="button" class="fio-modal-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="fio-modal-body">
          <p style="margin:0;">${localizedText(popup.body, lang)}${buildLinkHtml(popup, lang)}</p>
        </div>
        <div class="fio-modal-footer">
          <button type="button" class="fio-btn fio-popup-ok" style="background-color: var(--fio-blue); color: var(--fio-white) !important; border-color: var(--fio-blue);">
            ${lang === 'en' ? 'Got it' : 'Entendido'}
          </button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const close = () => { wrap.remove(); onClose(); };
    wrap.querySelector('.fio-modal-close').addEventListener('click', close);
    wrap.querySelector('.fio-popup-ok').addEventListener('click', close);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  }

  function showBanner(popup, lang, onClose) {
    const banner = document.createElement('div');
    banner.className = 'fio-privacy-banner fio-popup-banner';
    banner.innerHTML = `
      <p style="margin:0;">
        <strong>${localizedText(popup.title, lang)}</strong>
        ${localizedText(popup.body, lang)}${buildLinkHtml(popup, lang)}
      </p>
      <div class="fio-privacy-banner-actions">
        <button type="button" class="fio-btn" style="background-color: var(--fio-blue); color: var(--fio-white) !important; border-color: var(--fio-blue);">
          ${lang === 'en' ? 'Got it' : 'Entendido'}
        </button>
      </div>`;
    document.body.appendChild(banner);
    banner.querySelector('button').addEventListener('click', () => { banner.remove(); onClose(); });
  }

  function showQueue(popups, lang) {
    if (!popups.length) return;
    const [popup, ...rest] = popups;
    const next = () => showQueue(rest, lang);
    if (popup.type === 'banner') {
      showBanner(popup, lang, next);
    } else {
      showModal(popup, lang, next);
    }
    markDismissed(popup);
  }

  async function init() {
    let config;
    try {
      const res = await fetch('data/popups.json');
      if (!res.ok) return;
      config = await res.json();
    } catch (err) {
      return; // sin popups.json (o error de red), la web sigue funcionando igual
    }

    const page = currentPageFile();
    const lang = currentLang();
    const toShow = (config.popups || []).filter((popup) => {
      if (!popup || popup.active !== true) return false;
      const pages = popup.pages || ['*'];
      if (!pages.includes('*') && !pages.includes(page)) return false;
      return !isDismissed(popup);
    });

    showQueue(toShow, lang);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
