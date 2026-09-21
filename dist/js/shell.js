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
    { href: 'contacto.html', key: 'nav_contact', label: 'Contacto' },
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
      <img src="assets/img/logo.png" alt="Logotipo FIO">
      <div>
        <h1 data-i18n="site_title">Biblioteca — Fundación Infante de Orleans</h1>
        <p data-i18n="site_tagline">Catálogo público de la biblioteca</p>
      </div>
      <button type="button" class="fio-nav-toggle" aria-label="Abrir menú" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <div class="fio-header-right">
        <nav class="fio-nav" aria-label="Navegación principal">
          ${navHtml}
        </nav>
        <select class="fio-lang-switch" aria-label="Idioma / Language">
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

    mount.outerHTML = `
  <footer class="fio-footer">
    <div class="fio-footer-links">
      <span>Biblioteca de la Fundación Infante de Orleans</span>
      <span>·</span>
      <a href="data/catalogo.mrc" data-i18n="footer_export_marc">Exportar catálogo MARC21</a>
      <span>·</span>
      <a href="data/catalogo_marcxml.xml" data-i18n="footer_export_marcxml">Exportar MARCXML</a>
      <span>·</span>
      <a href="interoperabilidad.html" data-i18n="footer_connect_library">Conecta con la biblioteca</a>
      <span>·</span>
      <a href="acceso-copias-digitales.html" data-i18n="footer_access_restricted">Acceso restringido</a>
      <span>·</span>
      <a href="colaborar.html" data-i18n="footer_collaborate">Colaborar</a>
      <span>·</span>
      <a href="gracias.html" data-i18n="footer_thanks">Gracias</a>
      <span>·</span>
      <a href="contacto.html" data-i18n="footer_contact">Contacto</a>
      <span>·</span>
      <a href="privacidad.html" data-i18n="footer_privacy">Política de privacidad</a>
    </div>
    <p class="fio-footer-credits">Creado con ❤️ por Carlos Chevallier Marina e Isaac Hernán Martí</p>
  </footer>`;
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
