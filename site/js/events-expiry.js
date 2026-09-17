/**
 * Oculta automáticamente las tarjetas de eventos (.fio-event-card) cuya fecha
 * (definida en el <time datetime="YYYY-MM-DD"> de la tarjeta) ya ha pasado.
 * Si no quedan eventos visibles, muestra el mensaje de "no hay eventos".
 */
(function () {
  function hideExpiredEvents() {
    var list = document.getElementById('fio-events-list');
    if (!list) return;

    var cards = list.querySelectorAll('.fio-event-card');
    var emptyMsg = list.querySelector('.fio-empty');

    // Comparamos solo por fecha (sin hora) para no ocultar un evento el mismo día que termina.
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var visibleCount = 0;

    cards.forEach(function (card) {
      var timeEl = card.querySelector('time[datetime]');
      if (!timeEl) {
        // Sin fecha: no la tocamos, se asume vigente.
        visibleCount++;
        return;
      }

      var eventDate = new Date(timeEl.getAttribute('datetime'));
      if (isNaN(eventDate.getTime())) {
        visibleCount++;
        return;
      }
      eventDate.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        card.style.display = 'none';
      } else {
        visibleCount++;
      }
    });

    if (emptyMsg) {
      emptyMsg.style.display = visibleCount === 0 ? '' : 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideExpiredEvents);
  } else {
    hideExpiredEvents();
  }
})();
