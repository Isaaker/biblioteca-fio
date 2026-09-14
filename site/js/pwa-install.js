/**
 * PWA Install Banner
 * 
 * Muestra un banner para instalar la aplicación web progresiva en iOS, Android,
 * Windows, macOS, etc. Se oculta tras la primera interacción del usuario.
 */
(function () {
  let deferredPrompt = null;
  const bannerEl = document.getElementById('fio-pwa-banner');
  const installBtn = document.getElementById('fio-pwa-install');
  const dismissBtn = document.getElementById('fio-pwa-dismiss');

  if (!bannerEl || !installBtn || !dismissBtn) return;

  // Captura el evento beforeinstallprompt para mostrar el banner
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    bannerEl.style.display = 'flex';
  });

  // Botón "Instalar"
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Instalación ${outcome}`);
    deferredPrompt = null;
    bannerEl.style.display = 'none';
  });

  // Botón "Ahora no"
  dismissBtn.addEventListener('click', () => {
    bannerEl.style.display = 'none';
    // Guardar en sessionStorage para no mostrar de nuevo en esta sesión
    sessionStorage.setItem('fio-pwa-banner-dismissed', 'true');
  });

  // Si ya se cerró en esta sesión, no mostrar
  if (sessionStorage.getItem('fio-pwa-banner-dismissed')) {
    bannerEl.style.display = 'none';
  }

  // En navegadores sin soporte de beforeinstallprompt (como desktop), mostrar aviso alternativo
  // después de 2 segundos (solo si no está oculto)
  setTimeout(() => {
    if (bannerEl.style.display !== 'none' && !deferredPrompt && !sessionStorage.getItem('fio-pwa-banner-dismissed')) {
      // Mostrar información sobre cómo instalar manualmente
      console.log('PWA disponible: usa el menú del navegador para instalar esta app.');
    }
  }, 2000);
})();
