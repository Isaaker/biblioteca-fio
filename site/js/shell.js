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
    { href: 'blog/index.html', key: 'nav_blog', label: 'Blog' },
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
        { href: 'catalogo-completo.html', key: 'footer_static_catalog', label: 'Catálogo en HTML (sin JavaScript)' },
        { href: 'mapa-sitio.html', key: 'footer_sitemap', label: 'Mapa del sitio' },
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
        { href: 'accesibilidad.html', key: 'footer_accessibility', label: 'Accesibilidad' },
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
    const inBlog = window.location.pathname.includes('/blog/');
    const prefix = inBlog ? '../' : '';
    const navHtml = NAV_LINKS.map(link => {
      const active = link.href === current || (link.href === 'blog/index.html' && inBlog) ? ' class="active"' : '';
      const currentAttribute = active ? ' aria-current="page"' : '';
      return `<a href="${prefix}${link.href}"${active}${currentAttribute} data-i18n="${link.key}">${link.label}</a>`;
    }).join('\n          ');

    mount.outerHTML = `
  <header class="fio-header">
    <div class="fio-header-inner">
      <img src="assets/img/logo.webp" alt="Logotipo Fundación Infante de Orleans" data-i18n-attr="alt:logo_alt" width="46" height="46">
      <div>
        <p class="fio-site-title" data-i18n="site_title">Biblioteca — Fundación Infante de Orleans</p>
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
      const prefix = window.location.pathname.includes('/blog/') ? '../' : '';
      const links = group.links.map(link =>
        `<a href="${prefix}${link.href}" data-i18n="${link.key}">${link.label}</a>`
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
    <div class="fio-social">
      <a href="https://www.instagram.com/fundacionfio/" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"/><path d="M16 2H8a6 6 0 0 0-6 6v8a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6Zm4.2 14a4.2 4.2 0 0 1-4.2 4.2H8A4.2 4.2 0 0 1 3.8 16V8A4.2 4.2 0 0 1 8 3.8h8A4.2 4.2 0 0 1 20.2 8v8Z"/></svg><span>Instagram</span></a>
      <a href="https://www.facebook.com/FundacionInfantedeOrleans" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.5 22v-8.2h2.8l.5-3.4h-3.3V8.2c0-1 .4-1.7 1.8-1.7h1.6V3.4C16.600 3.300 15.700 3.200 14.700 3.200c-2.600 0-4.300 1.600-4.300 4.400v2.800H7.600v3.400h2.800V22h3.100Z"/></svg><span>Facebook</span></a>
      <a href="https://www.youtube.com/@fiomultimedia5262" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M23 7.2a3 3 0 0 0-2.100-2.100C19 4.600 12 4.600 12 4.600s-7 0-8.900.5A3 3 0 0 0 1 7.200C.5 9.100.5 12 .5 12s0 2.900.5 4.800a3 3 0 0 0 2.100 2.100c1.900.5 8.900.5 8.900.5s7 0 8.900-.5a3 3 0 0 0 2.100-2.100c.5-1.900.5-4.800.5-4.800s0-2.900-.5-4.800ZM9.700 15.500v-7l6 3.500-6 3.500Z"/></svg><span>YouTube</span></a>
      <a href="https://x.com/FIOtuit" rel="noopener noreferrer" aria-label="X (Twitter)"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg><span>X</span></a>
      <a href="https://es.linkedin.com/company/fundaci%C3%B3n-infante-de-orleans" rel="noopener noreferrer" aria-label="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452z"/></svg><span>LinkedIn</span></a>
    </div>
    <p class="fio-wcag"><a href="https://www.w3.org/WAI/WCAG1AA-Conformance"><img src="https://www.w3.org/WAI/wcag1AA.gif" alt="Nivel de conformidad Doble-A, W3C-WAI Pautas de Accesibilidad al Contenido en la Web 1.0 / Level Double-A conformance icon, W3C-WAI Web Content Accessibility Guidelines 1.0" width="88" height="31"></a></p>
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
    banner.hidden = true;
    banner.innerHTML = `
      <p data-i18n="pwa_install_text">¿Quieres acceso rápido a la biblioteca? Instala esta web como aplicación.</p>
      <div class="fio-pwa-banner-actions">
        <button type="button" id="fio-pwa-install" class="fio-btn fio-btn-solid"  data-i18n="pwa_install_button">Instalar</button>
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
      banner.hidden = false;
    });

    installBtn.addEventListener('click', async () => {
      banner.hidden = true;
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });

    dismissBtn.addEventListener('click', () => {
      banner.hidden = true;
      sessionStorage.setItem('fio-pwa-banner-dismissed', 'true');
    });

    window.addEventListener('appinstalled', () => {
      banner.hidden = true;
    });
  }

  // Se ejecuta de inmediato (sin esperar a DOMContentLoaded): así la
  // cabecera y el pie existen ya en el DOM cuando i18n.js procese las
  // traducciones al llegar ese evento, sin parpadeos ni contenido sin
  // traducir visible un instante.
  // Correo de contacto: no aparece en claro en el HTML (lo recogen los
  // bots de spam). Sin JavaScript queda el texto «usuario [arroba] dominio»
  // y el enlace lleva al formulario de contacto.
  function decodeEmails() {
    document.querySelectorAll('a.fio-email[data-user][data-domain]').forEach(a => {
      const addr = a.dataset.user + '@' + a.dataset.domain;
      const subject = a.dataset.subject ? '?subject=' + encodeURIComponent(a.dataset.subject) : '';
      a.setAttribute('href', 'mailto:' + addr + subject);
      a.textContent = addr;
    });
  }

  // Hoja de fuentes de Google cargada sin bloquear el primer renderizado
  // (el <link> llega con media="print" y aquí se pasa a "all").
  document.querySelectorAll('link[data-async-css]').forEach(l => { l.media = 'all'; });

  renderHeader();
  renderFooter();
  renderPwaBanner();
  decodeEmails();
})();
