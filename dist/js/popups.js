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
 * de otro (el siguiente aparece al cerrar el anterior), en el orden
 * en que aparecen en el JSON.
 */
(function () {
  const STORAGE_PREFIX = 'fio-popup-dismissed-';

  function currentPageFile() {
    const path = window.location.pathname;
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

  function localizedText(field, lang) {
    if (!field) return '';

    if (typeof field === 'string') {
      return String(field);
    }

    return String(
      field[lang] ||
      field.es ||
      field.en ||
      ''
    );
  }

  function isSafeLinkUrl(url) {
    try {
      // Las URLs relativas se resuelven contra la página actual.
      // Solo se permiten http: y https:, bloqueando javascript:,
      // data:, vbscript: y otros esquemas potencialmente peligrosos.
      const resolved = new URL(url, window.location.href);

      return (
        resolved.protocol === 'http:' ||
        resolved.protocol === 'https:'
      );
    } catch (err) {
      return false;
    }
  }

  function buildLinkElements(popup, lang) {
    // 'links' (lista) es el formato actual; 'link' (uno solo) se sigue
    // soportando por compatibilidad con popups ya publicados.
    const rawLinks = Array.isArray(popup.links) && popup.links.length
      ? popup.links
      : (popup.link ? [popup.link] : []);

    return rawLinks
      .filter((entry) => entry && entry.url && isSafeLinkUrl(entry.url))
      .map((entry) => {
        const rawText = (
          entry.text &&
          (entry.text[lang] || entry.text.es || entry.text.en)
        ) || entry.url;

        const a = document.createElement('a');
        a.href = entry.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = String(rawText);
        return a;
      });
  }

  function buildLinksList(popup, lang) {
    const links = buildLinkElements(popup, lang);
    if (!links.length) return null;

    const list = document.createElement('div');
    list.className = 'fio-popup-links';
    links.forEach((a) => {
      a.className = 'fio-filter-clear fio-popup-link';
      list.appendChild(a);
    });
    return list;
  }

  function createButton(text, className, style) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = className;
    button.textContent = text;

    if (style) {
      button.style.cssText = style;
    }

    return button;
  }

  function showModal(popup, lang, onClose, options) {
    const dismissable = !options || options.dismissable !== false;

    const wrap = document.createElement('div');
    wrap.className = 'fio-modal-backdrop fio-popup-modal';

    const modal = document.createElement('div');
    modal.className = 'fio-modal';

    const header = document.createElement('div');
    header.className = 'fio-modal-header';

    const title = document.createElement('h3');
    title.textContent = localizedText(popup.title, lang);

    header.appendChild(title);

    let closeButton = null;
    if (dismissable) {
      closeButton = createButton('×', 'fio-modal-close', '');
      closeButton.setAttribute('aria-label', lang === 'en' ? 'Close' : 'Cerrar');
      header.appendChild(closeButton);
    }

    const body = document.createElement('div');
    body.className = 'fio-modal-body';

    const paragraph = document.createElement('p');
    paragraph.style.margin = '0';
    paragraph.textContent = localizedText(popup.body, lang);
    body.appendChild(paragraph);

    const linksList = buildLinksList(popup, lang);
    if (linksList) {
      linksList.style.marginTop = '14px';
      body.appendChild(linksList);
    }

    modal.append(header, body);

    let okButton = null;
    if (dismissable) {
      const footer = document.createElement('div');
      footer.className = 'fio-modal-footer';
      okButton = createButton(
        lang === 'en' ? 'Got it' : 'Entendido',
        'fio-btn fio-popup-ok',
        'background-color: var(--fio-blue); color: var(--fio-white) !important; border-color: var(--fio-blue);'
      );
      footer.appendChild(okButton);
      modal.appendChild(footer);
    }

    wrap.appendChild(modal);
    document.body.appendChild(wrap);

    if (!dismissable) {
      // El aviso se muestra porque el catálogo no está disponible: no
      // tiene sentido dejar que la persona lo cierre y se quede
      // mirando una página de catálogo vacía sin saber por qué, así
      // que aquí no hay X, ni botón "Entendido", ni cierre al pulsar
      // fuera del modal.
      return;
    }

    const close = () => {
      wrap.remove();
      onClose();
    };

    closeButton.addEventListener('click', close);
    okButton.addEventListener('click', close);

    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) {
        close();
      }
    });
  }

  function showBanner(popup, lang, onClose) {
    const banner = document.createElement('div');
    banner.className = 'fio-privacy-banner fio-popup-banner';

    const paragraph = document.createElement('p');
    paragraph.style.margin = '0';

    const strong = document.createElement('strong');
    strong.textContent = localizedText(popup.title, lang);

    paragraph.appendChild(strong);
    paragraph.appendChild(document.createTextNode(' '));
    paragraph.appendChild(document.createTextNode(localizedText(popup.body, lang)));

    const linksList = buildLinksList(popup, lang);

    const actions = document.createElement('div');
    actions.className = 'fio-privacy-banner-actions';

    const closeButton = createButton(
      lang === 'en' ? 'Got it' : 'Entendido',
      'fio-btn',
      'background-color: var(--fio-blue); color: var(--fio-white) !important; border-color: var(--fio-blue);'
    );

    actions.appendChild(closeButton);

    banner.appendChild(paragraph);
    if (linksList) banner.appendChild(linksList);
    banner.appendChild(actions);
    document.body.appendChild(banner);

    closeButton.addEventListener('click', () => {
      banner.remove();
      onClose();
    });
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
      // Sin popups.json (o error de red), la web sigue funcionando igual.
      return;
    }

    const page = currentPageFile();
    const lang = currentLang();

    const toShow = (config.popups || []).filter((popup) => {
      if (!popup || popup.active !== true) {
        return false;
      }

      const pages = popup.pages || ['*'];

      if (!pages.includes('*') && !pages.includes(page)) {
        return false;
      }

      return !isDismissed(popup);
    });

    showQueue(toShow, lang);
  }

  // Se llama desde fuera (por ejemplo, js/catalog.js) cuando el catálogo
  // no ha podido cargarse o está vacío: busca el popup indicado en
  // popups.json y lo muestra como modal SIN posibilidad de cerrarlo,
  // pase lo que pase con su 'active', 'pages' o 'dismiss' habituales
  // (esos campos solo gobiernan el aviso "normal" que ve todo el
  // mundo al entrar; este es un aviso de emergencia y siempre debe
  // verse si el catálogo está roto, aunque la persona ya hubiera
  // cerrado el aviso normal antes).
  async function showBlockingPopup(popupId) {
    let config;
    try {
      const res = await fetch('data/popups.json');
      if (!res.ok) return;
      config = await res.json();
    } catch (err) {
      return;
    }

    const popup = (config.popups || []).find((p) => p && p.id === popupId);
    if (!popup) return;

    const lang = currentLang();
    showModal(popup, lang, () => {}, { dismissable: false });
  }

  document.addEventListener('DOMContentLoaded', init);

  window.fioShowBlockingPopup = showBlockingPopup;
})();
