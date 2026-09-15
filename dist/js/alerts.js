/**
 * Avisos emergentes ("popups"), equivalentes a los modales de
 * alerta/aviso del proyecto Flask original (includes/_messages.html),
 * adaptados a un sitio estático: aquí no hay mensajes flash del
 * servidor, así que cualquier página los dispara desde JS con
 * fioShowAlert(message, category).
 */
function fioEnsureAlertModal() {
  const existing = document.getElementById('fio-alert-modal');
  if (existing) return existing;
  const wrap = document.createElement('div');
  wrap.id = 'fio-alert-modal';
  wrap.className = 'fio-modal-backdrop';
  wrap.style.display = 'none';
  wrap.innerHTML = `
    <div class="fio-modal">
      <div class="fio-modal-header">
        <h3 id="fio-alert-modal-title">Aviso</h3>
        <button type="button" class="fio-modal-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="fio-modal-body" id="fio-alert-modal-body"></div>
      <div class="fio-modal-footer">
        <button type="button" class="fio-btn fio-modal-ok" style="background-color: var(--fio-blue); color: var(--fio-white) !important; border-color: var(--fio-blue);">Entendido</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const modal = wrap.querySelector('.fio-modal');
  const body = wrap.querySelector('#fio-alert-modal-body');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'fio-alert-modal-title');
  modal.setAttribute('aria-describedby', 'fio-alert-modal-body');

  let previouslyFocused = null;
  const close = () => {
    wrap.style.display = 'none';
    document.removeEventListener('keydown', onKeydown);
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
  };
  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  wrap.querySelector('.fio-modal-close').addEventListener('click', close);
  wrap.querySelector('.fio-modal-ok').addEventListener('click', close);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });

  wrap._fioOpen = (message, color) => {
    previouslyFocused = document.activeElement;
    body.textContent = '';
    const paragraph = document.createElement('p');
    paragraph.style.cssText = `color:${color}; margin:0; white-space:pre-wrap;`;
    paragraph.textContent = String(message ?? '');
    body.appendChild(paragraph);
    wrap.style.display = 'flex';
    document.addEventListener('keydown', onKeydown);
    wrap.querySelector('.fio-modal-ok').focus();
  };
  return wrap;
}

/**
 * category: 'danger' | 'warning' | 'info' (afecta solo al color del texto).
 */
function fioShowAlert(message, category) {
  const wrap = fioEnsureAlertModal();
  const color = category === 'danger' ? '#a33' : (category === 'warning' ? '#8a6d1a' : 'var(--fio-text)');
  wrap._fioOpen(message, color);
}

/**
 * Aviso breve, no bloqueante ("toast"), para confirmaciones rápidas
 * como "prompt copiado al portapapeles".
 */
function fioShowToast(message) {
  let toast = document.getElementById('fio-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fio-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

/**
 * Banner de consentimiento de privacidad. Analytics no se carga hasta que
 * la persona acepta expresamente; rechazarlo también queda guardado.
 */
function fioMaybeShowPrivacyBanner() {
  if (document.body.dataset.noAnalytics === 'true') return;
  const consent = localStorage.getItem('fio-analytics-consent');
  if (consent) {
    if (consent === 'accepted') fioLoadAnalytics();
    return;
  }
  const banner = document.createElement('div');
  banner.className = 'fio-privacy-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-modal', 'true');
  banner.setAttribute('aria-labelledby', 'fio-privacy-banner-title');
  banner.innerHTML = `
    <div class="fio-privacy-banner-icon" aria-hidden="true">&#128274;</div>
    <h2 id="fio-privacy-banner-title" data-i18n="privacy_banner_title">Privacidad y Analytics</h2>
    <p data-i18n="privacy_banner_text">Usamos Google Analytics solo si lo aceptas, para conocer qué páginas se consultan. Puedes aceptar o rechazarlo.</p>
    <div class="fio-privacy-banner-actions">
      <a href="privacidad.html" data-i18n="privacy_banner_link">Más información</a>
      <button type="button" class="fio-ghost-btn" data-consent="rejected" data-i18n="privacy_banner_reject">Rechazar</button>
      <button type="button" class="fio-btn" style="background-color: var(--fio-blue); color: var(--fio-white) !important; border-color: var(--fio-blue);" data-consent="accepted" data-i18n="privacy_banner_accept">Aceptar</button>
    </div>`;
  document.body.appendChild(banner);
  document.querySelectorAll('body > *:not(.fio-privacy-banner)').forEach((node) => {
    node.setAttribute('aria-hidden', 'true');
    node.inert = true;
  });
  banner.querySelector('[data-consent="accepted"]').focus();
  banner.querySelectorAll('[data-consent]').forEach((button) => button.addEventListener('click', () => {
    const selectedConsent = button.dataset.consent;
    localStorage.setItem('fio-analytics-consent', selectedConsent);
    if (selectedConsent === 'accepted') fioLoadAnalytics();
    document.querySelectorAll('body > *:not(.fio-privacy-banner)').forEach((node) => {
      node.removeAttribute('aria-hidden');
      node.inert = false;
    });
    banner.remove();
  }));
  if (window.fioSetLang) {
    // re-aplica traducciones a los nodos recién insertados
    document.dispatchEvent(new CustomEvent('fio-lang-changed'));
    const lang = (window.fioCurrentLang && fioCurrentLang()) || 'es';
    fioSetLang(lang);
  }
}

function fioLoadAnalytics() {
  if (window.gtag || document.querySelector('script[data-fio-analytics]')) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-KCR6M3P1WH', { anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-KCR6M3P1WH';
  script.dataset.fioAnalytics = 'true';
  document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
  fioMaybeShowPrivacyBanner();
});
