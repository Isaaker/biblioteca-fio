/**
 * Formulario de contacto (contacto.html).
 *
 * No hay backend ni servidor propio, así que este formulario no
 * "envía" nada por sí mismo: solo compone un enlace mailto: con el
 * asunto y el cuerpo ya rellenos a partir de lo que la persona ha
 * escrito, y al pulsar "Enviar" se abre el cliente de correo que
 * tenga configurado (Gmail, Outlook, Apple Mail...), con el mensaje
 * ya listo para revisar y enviar desde ahí. Nada se procesa ni se
 * guarda en ningún sitio nuestro.
 */
function fioContact() {
  return {
    recipient: 'fioteca@fio.es',
    subject: 'SOLICITAR VISITA',
    subjects: [
      { value: 'SOLICITAR VISITA', key: 'contact_subject_visit', fallback: 'Solicitar visita' },
      { value: 'PRESTAMOS', key: 'contact_subject_loans', fallback: 'Préstamos' },
      { value: 'INTERBIBLIOTECAS', key: 'contact_subject_interlibrary', fallback: 'Préstamo interbibliotecario' },
      { value: 'CATALOGO', key: 'contact_subject_catalog', fallback: 'Catálogo / una obra concreta' },
      { value: 'DIGITALIZACION', key: 'contact_subject_digitization', fallback: 'Digitalización' },
      { value: 'OTROS', key: 'contact_subject_other', fallback: 'Otros' },
    ],
    name: '',
    email: '',
    memberNumber: '',
    error: '',
    message: '',

    subjectLabel(entry) {
      return (window.fioT && window.fioT(entry.key)) || entry.fallback;
    },

    // Construye el mailto: a partir de los datos del formulario. Se
    // recalcula cada vez (no se guarda en ningún sitio) y se usa
    // tanto para el botón "Enviar" como, si se quisiera, para
    // depurar el enlace resultante.
    mailtoHref() {
      const subjectLine = `[${this.subject}]`;
      let body = this.message.trim();
      const signature = [`Nombre: ${this.name.trim()}`, `Correo de contacto: ${this.email.trim()}`];
      if (this.memberNumber.trim()) signature.push(`Número de socio: ${this.memberNumber.trim()}`);
      body = body ? `${body}\n\n—\n${signature.join('\n')}` : `—\n${signature.join('\n')}`;
      const params = new URLSearchParams();
      params.set('subject', subjectLine);
      if (body) params.set('body', body);
      // URLSearchParams codifica espacios como "+"; para mailto: es
      // más compatible usar %20, así que se sustituye tras generar
      // la cadena de consulta.
      return `mailto:${this.recipient}?${params.toString().replace(/\+/g, '%20')}`;
    },

    // Nombre y correo son obligatorios (el número de socio no).
    validate() {
      const t = (k) => (window.fioT && window.fioT(k)) || k;
      let key = '';
      let field = '';
      if (!this.name.trim()) { key = 'form_error_name'; field = 'c-name'; }
      else if (!this.email.trim()) { key = 'form_error_email'; field = 'c-email'; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) { key = 'form_error_email_invalid'; field = 'c-email'; }
      this.error = key ? t(key) : '';
      if (key) {
        const el = document.getElementById(field);
        if (el) el.focus();
      }
      return !key;
    },

    send() {
      if (!this.validate()) return;
      window.location.href = this.mailtoHref();
    },
  };
}

// Alpine (build CSP) no evalúa expresiones arbitrarias: x-data solo puede
// referenciar componentes registrados explícitamente vía Alpine.data().
// Sin este registro, Alpine lanza "Undefined variable: <nombre>" y la
// página queda inaccesible (main con aria-hidden/inert).
document.addEventListener('alpine:init', () => {
  Alpine.data('fioContact', fioContact);
});
