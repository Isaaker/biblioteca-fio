/**
 * Página de agradecimientos (gracias.html). Todo sale de
 * data/agradecimientos.json (editable a mano, sin build; ver su "_comentario").
 *
 * - Donantes: {nombre, donaciones}. Según "niveles" (oro/plata/bronce/base)
 *   el nombre se muestra más grande y con el color del nivel.
 * - Dentro de cada nivel el orden es ALEATORIO en cada visita, para que
 *   nadie quede siempre el primero o el último.
 * - Voluntarios: lista de nombres, también en orden aleatorio.
 *
 * Alpine (build CSP) no evalúa expresiones arbitrarias, así que aquí se
 * precalcula todo (clases, estilos) y en el HTML solo se lee.
 */
function fioShuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fioLang() {
  const l = (document.documentElement.lang || 'es').toLowerCase();
  return l.startsWith('en') ? 'en' : 'es';
}

// Niveles por defecto si el JSON no los define.
const FIO_NIVELES_DEFECTO = [
  { id: 'oro', minimo: 10, etiqueta: { es: 'Donantes de oro', en: 'Gold donors' } },
  { id: 'plata', minimo: 5, etiqueta: { es: 'Donantes de plata', en: 'Silver donors' } },
  { id: 'bronce', minimo: 2, etiqueta: { es: 'Donantes de bronce', en: 'Bronze donors' } },
  { id: 'base', minimo: 1, etiqueta: { es: 'Donantes', en: 'Donors' } },
];

function fioGracias() {
  return {
    loading: true,
    grupos: [],
    voluntarios: [],
    hayDonantes: false,
    hayVoluntarios: false,

    construirGrupos(donantes, niveles) {
      const ordenados = niveles.slice().sort((a, b) => b.minimo - a.minimo);
      const buckets = new Map(ordenados.map(n => [n.id, []]));
      donantes.forEach(d => {
        const item = typeof d === 'string' ? { nombre: d, donaciones: 1 } : d;
        if (!item || !item.nombre) return;
        const n = Number(item.donaciones) || 1;
        const nivel = ordenados.find(x => n >= x.minimo) || ordenados[ordenados.length - 1];
        buckets.get(nivel.id).push(item.nombre);
      });
      const lang = fioLang();
      return ordenados
        .map(n => ({
          id: n.id,
          clase: 'fio-thanks-tier fio-tier-' + n.id,
          etiqueta: (n.etiqueta && (n.etiqueta[lang] || n.etiqueta.es)) || n.id,
          nombres: fioShuffle(buckets.get(n.id)).map(nombre => ({ nombre })),
        }))
        .filter(g => g.nombres.length > 0);
    },

    async init() {
      try {
        const res = await fetch('data/agradecimientos.json');
        if (!res.ok) throw new Error('No se pudo cargar agradecimientos.json');
        const data = await res.json();
        const niveles = Array.isArray(data.niveles) && data.niveles.length ? data.niveles : FIO_NIVELES_DEFECTO;
        this.grupos = this.construirGrupos(Array.isArray(data.donantes) ? data.donantes : [], niveles);
        this.voluntarios = fioShuffle(
          (Array.isArray(data.voluntarios) ? data.voluntarios : [])
            .map(v => (typeof v === 'string' ? v : v && v.nombre))
            .filter(Boolean)
        ).map(nombre => ({ nombre }));
        this.hayDonantes = this.grupos.length > 0;
        this.hayVoluntarios = this.voluntarios.length > 0;
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('fioGracias', fioGracias);
});
