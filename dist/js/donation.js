/**
 * Formulario de donación de libros (donaciones.html).
 *
 * Igual que el de contacto.html (ver js/contact.js): sin backend, solo
 * compone un mailto: con los datos que la persona ha escrito y abre su
 * cliente de correo, dirigido a fioteca@fio.es.
 */
function fioDonation() {
  return {
    recipient: 'fioteca@fio.es',
    name: '',
    email: '',
    items: '',
    quantity: '',
    digitalCopyInterest: false,
    comments: '',

    mailtoHref() {
      const lines = [];
      if (this.name.trim()) lines.push(`Nombre: ${this.name.trim()}`);
      if (this.email.trim()) lines.push(`Correo de contacto: ${this.email.trim()}`);
      if (this.quantity.trim()) lines.push(`Cantidad aproximada de libros: ${this.quantity.trim()}`);
      lines.push('');
      lines.push('Títulos / autores / descripción de las obras:');
      lines.push(this.items.trim() || '(sin especificar)');
      if (this.comments.trim()) {
        lines.push('');
        lines.push('Comentarios adicionales:');
        lines.push(this.comments.trim());
      }
      lines.push('');
      lines.push(
        this.digitalCopyInterest
          ? 'Sí, me interesa recibir copia digital si la obra donada es elegible.'
          : 'No me interesa recibir copia digital.'
      );

      const params = new URLSearchParams();
      params.set('subject', '[DONACION DE LIBROS]');
      params.set('body', lines.join('\n'));
      return `mailto:${this.recipient}?${params.toString().replace(/\+/g, '%20')}`;
    },

    send() {
      window.location.href = this.mailtoHref();
    },
  };
}

// Alpine (build CSP) no evalúa expresiones arbitrarias: x-data solo puede
// referenciar componentes registrados explícitamente vía Alpine.data().
// Sin este registro, Alpine lanza "Undefined variable: <nombre>" y la
// página queda inaccesible (main con aria-hidden/inert).
document.addEventListener('alpine:init', () => {
  Alpine.data('fioDonation', fioDonation);
});
