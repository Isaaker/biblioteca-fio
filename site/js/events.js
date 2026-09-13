/**
 * Evento recurrente automático: "Exhibición en Vuelo" de la FIO, que se
 * celebra el primer domingo de cada mes salvo enero y agosto.
 *
 * En vez de tener que añadir manualmente una tarjeta de evento cada
 * mes, esta función calcula sola la fecha del PRÓXIMO primer domingo
 * que corresponda (saltándose enero y agosto) a partir de hoy, y
 * genera la tarjeta. Así la página siempre muestra la fecha correcta
 * sin mantenimiento.
 */
(function () {
  const MONTH_ABBR_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const MONTH_ABBR_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const MONTH_NAME_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MONTH_NAME_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Meses excluidos: enero (0) y agosto (7), en índice de JS (0-11).
  const EXCLUDED_MONTHS = [0, 7];

  function firstSundayOf(year, month) {
    const firstWeekday = new Date(year, month, 1).getDay(); // 0 = domingo
    const day = firstWeekday === 0 ? 1 : 1 + (7 - firstWeekday);
    return new Date(year, month, day);
  }

  // Busca, a partir de "from" (incluido), el próximo primer domingo de
  // mes que no caiga en un mes excluido.
  function nextRecurringDate(from) {
    const todayMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    let year = from.getFullYear();
    let month = from.getMonth();

    for (let i = 0; i < 24; i++) { // margen de sobra: 2 años
      if (!EXCLUDED_MONTHS.includes(month)) {
        const candidate = firstSundayOf(year, month);
        if (candidate >= todayMidnight) {
          return candidate;
        }
      }
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
    return null; // no debería ocurrir nunca
  }

  function buildRecurringEventCard(date) {
    const card = document.createElement('div');
    card.className = 'fio-event-card is-recurring';

    const dateBox = document.createElement('div');
    dateBox.className = 'fio-event-date';
    dateBox.innerHTML = `
      <span class="day">${date.getDate()}</span>
      <span class="month">${MONTH_ABBR_ES[date.getMonth()]}</span>`;

    const body = document.createElement('div');
    body.className = 'fio-event-body';
    body.innerHTML = `
      <span class="fio-event-badge">
        <span class="lang-es">Evento recurrente — primer domingo de cada mes (excepto enero y agosto)</span>
        <span class="lang-en">Recurring event — first Sunday of every month (except January and August)</span>
      </span>
      <h3><a href="https://fio.es/exhibicion-de-vuelo/" target="_blank" rel="noopener">Exhibición en Vuelo: Fundación Infante de Orleans</a></h3>
      <p class="fio-book-meta">
        <span class="lang-es">Domingo ${date.getDate()} de ${MONTH_NAME_ES[date.getMonth()]} de ${date.getFullYear()} — Aeródromo de Cuatro Vientos, Madrid.</span>
        <span class="lang-en">Sunday ${date.getDate()} ${MONTH_NAME_EN[date.getMonth()]} ${date.getFullYear()} — Cuatro Vientos aerodrome, Madrid.</span>
      </p>`;

    card.appendChild(dateBox);
    card.appendChild(body);
    return card;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('#fio-events-list');
    if (!section) return;

    const nextDate = nextRecurringDate(new Date());
    if (!nextDate) return;

    const card = buildRecurringEventCard(nextDate);
    const emptyNotice = section.querySelector('.fio-empty');
    if (emptyNotice) {
      section.insertBefore(card, emptyNotice);
      emptyNotice.style.display = 'none';
    } else {
      section.appendChild(card);
    }
  });
})();
