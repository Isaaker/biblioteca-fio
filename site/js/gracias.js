/**
 * Página de agradecimientos (gracias.html): carga los nombres desde
 * data/agradecimientos.json (fichero editable a mano, sin build ni
 * programación — ver el "_comentario" de ese fichero).
 *
 * La animación de aparición (frase, motivos, nombres) es solo CSS
 * (ver .fio-thanks-* en css/styles.css), con --i como índice de orden
 * para escalonar el retraso de cada elemento. Todo el texto y los
 * nombres están en el DOM desde el principio: quien use un lector de
 * pantalla, o tenga activado "reducir movimiento" en su sistema
 * (ver la regla @media prefers-reduced-motion en css/styles.css),
 * los recibe todos de inmediato, sin tener que esperar a que termine
 * ninguna animación.
 */
function fioGracias() {
  return {
    loading: true,
    donantes: [],
    voluntarios: [],

    async init() {
      try {
        const res = await fetch('data/agradecimientos.json');
        if (!res.ok) throw new Error('No se pudo cargar agradecimientos.json');
        const data = await res.json();
        this.donantes = Array.isArray(data.donantes) ? data.donantes : [];
        this.voluntarios = Array.isArray(data.voluntarios) ? data.voluntarios : [];
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
  };
}
