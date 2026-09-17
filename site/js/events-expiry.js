/**
 * Ordena las tarjetas de evento (.fio-event-card[data-event-date]) por
 * fecha ascendente y oculta las que ya han pasado. Si no queda ningún
 * evento manual visible, muestra el aviso de "no hay eventos" (a menos
 * que events-recurring.js añada su propia tarjeta después).
 *
 * Solo actúa sobre tarjetas con data-event-date; la tarjeta del evento
 * recurrente (generada por events-recurring.js) no lleva ese atributo
 * y se gestiona a sí misma.
 */
(function () {
  function run() {
    var list = document.getElementById('fio-events-list');
    if (!list) return;

    var cards = Array.prototype.slice.call(
      list.querySelectorAll('.fio-event-card[data-event-date]')
    );

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ordena por fecha ascendente.
    cards.sort(function (a, b) {
      return new Date(a.dataset.eventDate) - new Date(b.dataset.eventDate);
    });
    cards.forEach(function (card) {
      list.insertBefore(card, list.querySelector('.fio-empty') || null);
    });

    // Oculta las que ya pasaron.
    var visibleCount = 0;
    cards.forEach(function (card) {
      var eventDate = new Date(card.dataset.eventDate);
      if (isNaN(eventDate.getTime())) {
        visibleCount++;
        return;
      }
      eventDate.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        card.style.display = 'none';
      } else {
        card.style.display = '';
        visibleCount++;
      }
    });

    var emptyMsg = list.querySelector('.fio-empty');
    if (emptyMsg && visibleCount === 0) {
      // Deja que events-recurring.js decida si oculta esto de nuevo
      // cuando añada su propia tarjeta (se ejecuta después).
      emptyMsg.style.display = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
