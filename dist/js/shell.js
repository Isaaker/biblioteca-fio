/**
 * Cabecera y pie de página como componente único, en vez de HTML
 * duplicado a mano en cada página.
 *
 * Por qué existe este fichero: antes, cada una de las 10 páginas del
 * sitio tenía su propia copia pegada del <header> y del <footer>. Con
 * el tiempo eso se desincronizó (una página se quedó sin el menú de
 * navegación, otra sin cargar los mismos scripts que las demás — el
 * botón de modo oscuro, por ejemplo, solo aparecía en las páginas que
 * SÍ cargaban fio-ux.js). Con este fichero hay un solo sitio donde se
 * define cómo son la cabecera y el pie: cualquier cambio futuro (un
 * enlace nuevo en el menú, un texto del pie) se hace aquí UNA vez y se
 * aplica automáticamente a las 10 páginas.
 *
 * Cada página solo necesita:
 *   <div id="fio-header-mount"></div>   (donde debe ir la cabecera)
 *   ...contenido de la página...
 *   <div id="fio-footer-mount"></div>   (donde debe ir el pie)
 *   <script src="js/shell.js"></script> (en cualquier punto posterior)
 *
 * El elemento activo del menú se calcula solo, a partir del nombre del
 * fichero actual — así tampoco hace falta marcarlo a mano en cada
 * página ni arriesgarse a que quede desactualizado.
 */
(function () {
  const NAV_LINKS = [
    { href: 'index.html', key: 'nav_home', label: 'Inicio' },
    { href: 'catalogo.html', key: 'nav_catalog', label: 'Catálogo' },
    { href: 'buscar.html', key: 'nav_search', label: 'Buscar' },
    { href: 'escanear.html', key: 'nav_scan', label: 'Escanear' },
    { href: 'estadisticas.html', key: 'nav_stats', label: 'Estadísticas' },
    { href: 'eventos.html', key: 'nav_events', label: 'Eventos' },
    { href: 'colaborar.html', key: 'nav_collaborate', label: 'Colaborar' },
    { href: 'gracias.html', key: 'nav_thanks', label: 'Agradecimientos' },
    { href: 'contacto.html', key: 'nav_contact', label: 'Contacto' },
  ];

  // Enlaces del pie, agrupados en pestañas.
  const FOOTER_GROUPS = [
    {
      id: 'library', key: 'footer_tab_library', label: 'Biblioteca',
      links: [
        { href: 'data/catalogo.mrc', key: 'footer_export_marc', label: 'Exportar catálogo MARC21' },
        { href: 'data/catalogo_marcxml.xml', key: 'footer_export_marcxml', label: 'Exportar MARCXML' },
        { href: 'interoperabilidad.html', key: 'footer_connect_library', label: 'Conecta con la biblioteca' },
      ],
    },
    {
      id: 'foundation', key: 'footer_tab_foundation', label: 'Fundación',
      links: [
        { href: 'colaborar.html', key: 'footer_collaborate', label: 'Colaborar' },
        { href: 'gracias.html', key: 'footer_thanks', label: 'Gracias' },
        { href: 'contacto.html', key: 'footer_contact', label: 'Contacto' },
      ],
    },
    {
      id: 'legal', key: 'footer_tab_legal', label: 'Información legal',
      links: [
        { href: 'acceso-copias-digitales.html', key: 'footer_access_restricted', label: 'Acceso restringido' },
        { href: 'privacidad.html', key: 'footer_privacy', label: 'Política de privacidad' },
      ],
    },
    {
      id: 'admin', key: 'footer_tab_admin', label: 'Administración',
      links: [
        { href: 'acceso-administradores.html', key: 'footer_admin_access', label: 'Acceso de administradores' },
      ],
    },
  ];

  function currentPageFile() {
    let path = window.location.pathname;
    let last = path.substring(path.lastIndexOf('/') + 1);
    if (!last) last = 'index.html'; // "/" o "/subcarpeta/"
    // Cloudflare Pages puede servir URLs "limpias" sin ".html"
    // (p. ej. "/catalogo" en vez de "/catalogo.html"): se normaliza
    // aquí para que la comparación con NAV_LINKS funcione igual con
    // o sin extensión.
    if (!last.endsWith('.html')) last += '.html';
    return last;
  }

  function renderHeader() {
    const mount = document.getElementById('fio-header-mount');
    if (!mount) return;

    const current = currentPageFile();
    const navHtml = NAV_LINKS.map(link => {
      const active = link.href === current ? ' class="active"' : '';
      const currentAttribute = active ? ' aria-current="page"' : '';
      return `<a href="${link.href}"${active}${currentAttribute} data-i18n="${link.key}">${link.label}</a>`;
    }).join('\n          ');

    mount.outerHTML = `
  <header class="fio-header">
    <div class="fio-header-inner">
      <img src="assets/img/logo.png" alt="Logotipo Fundación Infante de Orleans" data-i18n-attr="alt:logo_alt">
      <div>
        <h1 data-i18n="site_title">Biblioteca — Fundación Infante de Orleans</h1>
        <p data-i18n="site_tagline">Catálogo público de la biblioteca</p>
      </div>
      <button type="button" class="fio-nav-toggle" aria-label="Abrir menú" data-i18n-attr="aria-label:nav_menu_open" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <div class="fio-header-right">
        <nav class="fio-nav" aria-label="Navegación principal" data-i18n-attr="aria-label:nav_main_label">
          ${navHtml}
        </nav>
        <select class="fio-lang-switch" aria-label="Idioma / Language" data-i18n-attr="aria-label:language_label">
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>
  </header>`;

    // Menú móvil: el botón hamburguesa muestra/oculta el bloque de
    // navegación + selector de idioma. Se hace aquí, no con Alpine,
    // porque el header ya está montado antes de que Alpine (deferred)
    // llegue a inicializarse, y así el menú funciona igual en páginas
    // que no usan Alpine para nada más (eventos, privacidad...).
    const toggle = document.querySelector('.fio-nav-toggle');
    const headerRight = document.querySelector('.fio-header-right');
    if (toggle && headerRight) {
      toggle.addEventListener('click', () => {
        const isOpen = headerRight.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggle.setAttribute('aria-label', window.fioT ? window.fioT(isOpen ? 'nav_menu_close' : 'nav_menu_open') : (isOpen ? 'Cerrar menú' : 'Abrir menú'));
      });
      // Al navegar a otra página (o volver a pulsar un enlace del
      // propio menú) se cierra solo, para no dejarlo abierto de fondo.
      headerRight.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          headerRight.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  function renderFooter() {
    const mount = document.getElementById('fio-footer-mount');
    if (!mount) return;

    // Los enlaces del pie se agrupan por temas en pestañas (antes eran una
    // única fila de ~10 enlaces). Para añadir un enlace, basta con
    // incluirlo en el grupo que corresponda; para un grupo nuevo, añadir
    // una entrada más a FOOTER_GROUPS.
    const groupsHtml = FOOTER_GROUPS.map((group, index) => {
      const selected = index === 0;
      return `<button type="button" role="tab" class="fio-footer-tab${selected ? ' active' : ''}" id="fio-ftab-${group.id}" aria-controls="fio-fpanel-${group.id}" aria-selected="${selected}" tabindex="${selected ? '0' : '-1'}" data-i18n="${group.key}">${group.label}</button>`;
    }).join('');
    const panelsHtml = FOOTER_GROUPS.map((group, index) => {
      const links = group.links.map(link =>
        `<a href="${link.href}" data-i18n="${link.key}">${link.label}</a>`
      ).join('\n        <span aria-hidden="true">·</span>\n        ');
      return `<div role="tabpanel" class="fio-footer-links" id="fio-fpanel-${group.id}" aria-labelledby="fio-ftab-${group.id}"${index === 0 ? '' : ' hidden'}>
        ${links}
      </div>`;
    }).join('\n      ');

    mount.outerHTML = `
  <footer class="fio-footer">
    <p class="fio-footer-org">Biblioteca de la Fundación Infante de Orleans</p>
    <div class="fio-footer-tabs" role="tablist" aria-label="Enlaces del pie de página" data-i18n-attr="aria-label:footer_tabs_label">${groupsHtml}</div>
    <div class="fio-footer-panels">
      ${panelsHtml}
    </div>
    <p class="fio-footer-credits">Creado con ❤️ por Carlos Chevallier Marina e Isaac Hernán Martí</p>
  </footer>`;

    initFooterTabs();
  }

  // Pestañas accesibles (patrón WAI-ARIA "tabs"): clic, y flechas /
  // Inicio / Fin para moverse entre pestañas con el teclado.
  function initFooterTabs() {
    const tablist = document.querySelector('.fio-footer-tabs');
    if (!tablist) return;
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

    function activate(tab, focus) {
      tabs.forEach(t => {
        const on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(tab, false));
      tab.addEventListener('keydown', (event) => {
        let target = null;
        if (event.key === 'ArrowRight') target = tabs[(i + 1) % tabs.length];
        else if (event.key === 'ArrowLeft') target = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (event.key === 'Home') target = tabs[0];
        else if (event.key === 'End') target = tabs[tabs.length - 1];
        if (target) {
          event.preventDefault();
          activate(target, true);
        }
      });
    });
  }

  /**
   * Banner de instalación como PWA (Android/desktop vía evento nativo
   * `beforeinstallprompt`; en iOS Safari ese evento no existe, así que
   * ahí no se muestra nada — no hay forma fiable de detectar "instalable"
   * sin él, y preferimos no mostrar instrucciones que no aplican).
   * Se crea aquí (no en cada página a mano) para que aparezca en todo
   * el sitio con un único punto de mantenimiento.
   */
  function renderPwaBanner() {
    if (document.getElementById('fio-pwa-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'fio-pwa-banner';
    banner.className = 'fio-pwa-banner';
    banner.style.display = 'none';
    banner.innerHTML = `
      <p data-i18n="pwa_install_text">¿Quieres acceso rápido a la biblioteca? Instala esta web como aplicación.</p>
      <div class="fio-pwa-banner-actions">
        <button type="button" id="fio-pwa-install" class="fio-btn fio-btn-solid" style="background-color: var(--fio-blue); color: var(--fio-white) !important; border-color: var(--fio-blue);" data-i18n="pwa_install_button">Instalar</button>
        <button type="button" id="fio-pwa-dismiss" class="fio-ghost-btn" data-i18n="pwa_dismiss_button">Ahora no</button>
      </div>`;
    document.body.appendChild(banner);

    let deferredPrompt = null;
    const installBtn = banner.querySelector('#fio-pwa-install');
    const dismissBtn = banner.querySelector('#fio-pwa-dismiss');

    if (sessionStorage.getItem('fio-pwa-banner-dismissed')) return;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      banner.style.display = 'flex';
    });

    installBtn.addEventListener('click', async () => {
      banner.style.display = 'none';
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });

    dismissBtn.addEventListener('click', () => {
      banner.style.display = 'none';
      sessionStorage.setItem('fio-pwa-banner-dismissed', 'true');
    });

    window.addEventListener('appinstalled', () => {
      banner.style.display = 'none';
    });
  }

  // Se ejecuta de inmediato (sin esperar a DOMContentLoaded): así la
  // cabecera y el pie existen ya en el DOM cuando i18n.js procese las
  // traducciones al llegar ese evento, sin parpadeos ni contenido sin
  // traducir visible un instante.
  renderHeader();
  renderFooter();
  renderPwaBanner();
})();
