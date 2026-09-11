/**
 * Avisos emergentes ("popups"), equivalentes a los modales de
 * alerta/aviso del proyecto Flask original (includes/_messages.html),
 * adaptados a un sitio estático: aquí no hay mensajes flash del
 * servidor, así que cualquier página los dispara desde JS con
 * fioShowAlert(message, category).
 */
function fioEnsureAlertModal() {
  if (document.getElementById('fio-alert-modal')) return;
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

  const close = () => { wrap.style.display = 'none'; };
  wrap.querySelector('.fio-modal-close').addEventListener('click', close);
  wrap.querySelector('.fio-modal-ok').addEventListener('click', close);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
}

/**
 * category: 'danger' | 'warning' | 'info' (afecta solo al color del texto).
 */
function fioShowAlert(message, category) {
  fioEnsureAlertModal();
  const wrap = document.getElementById('fio-alert-modal');
  const body = document.getElementById('fio-alert-modal-body');
  const color = category === 'danger' ? '#a33' : (category === 'warning' ? '#8a6d1a' : 'var(--fio-text)');
  body.innerHTML = `<p style="color:${color}; margin:0;">${message}</p>`;
  wrap.style.display = 'flex';
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
 * Banner de aviso de privacidad en la primera visita (equivalente
 * simplificado, para un sitio sin cuentas ni cookies de analítica, al
 * antiguo aviso legal del proyecto Flask). Se recuerda con
 * localStorage para no repetirlo en cada página.
 */
function fioMaybeShowPrivacyBanner() {
  if (localStorage.getItem('fio-privacy-ack') === '1') return;
  const banner = document.createElement('div');
  banner.className = 'fio-privacy-banner';
  banner.innerHTML = `
    <p data-i18n="privacy_banner_text">Esta web no usa cookies de analítica ni publicidad. Solo guarda en tu propio dispositivo tu idioma preferido y, si usas el escáner, las portadas ya consultadas — nada se envía a nuestros servidores.</p>
    <div class="fio-privacy-banner-actions">
      <a href="privacidad.html" data-i18n="privacy_banner_link">Más información</a>
      <button type="button" class="fio-btn" style="background-color: var(--fio-blue); color: var(--fio-white) !important; border-color: var(--fio-blue);" data-i18n="privacy_banner_ok">Entendido</button>
    </div>`;
  document.body.appendChild(banner);
  banner.querySelector('button').addEventListener('click', () => {
    localStorage.setItem('fio-privacy-ack', '1');
    banner.remove();
  });
  if (window.fioSetLang) {
    // re-aplica traducciones a los nodos recién insertados
    document.dispatchEvent(new CustomEvent('fio-lang-changed'));
    const lang = (window.fioCurrentLang && fioCurrentLang()) || 'es';
    fioSetLang(lang);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fioMaybeShowPrivacyBanner();
});
