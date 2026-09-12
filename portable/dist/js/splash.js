/**
 * Pantalla de carga (splash screen) que se muestra al lanzar la aplicación.
 * Se oculta automáticamente después de 2.5 segundos o cuando la página está lista.
 */
function fioHideSplash() {
  const splash = document.getElementById('fio-splash');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => {
      splash.style.display = 'none';
    }, 800);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(fioHideSplash, 2500);
});

window.addEventListener('load', () => {
  fioHideSplash();
});
