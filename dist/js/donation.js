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
    memberNumber: '',
    error: '',
    items: '',
    quantity: '',
    digitalCopyInterest: false,
    comments: '',

    mailtoHref() {
      const t = (key) => window.fioT ? window.fioT(key) : key;
      const lines = [
        `${t('donation_mail_name')}: ${this.name.trim()}`,
        `${t('donation_mail_email')}: ${this.email.trim()}`,
      ];
      if (this.memberNumber.trim()) lines.push(`${t('donation_mail_member')}: ${this.memberNumber.trim()}`);
      if (this.quantity.trim()) lines.push(`${t('donation_mail_quantity')}: ${this.quantity.trim()}`);
      lines.push('', `${t('donation_mail_items')}:`, this.items.trim() || t('donation_mail_unspecified'));
      if (this.comments.trim()) lines.push('', `${t('donation_mail_comments')}:`, this.comments.trim());
      lines.push('', t(this.digitalCopyInterest ? 'donation_mail_digital_yes' : 'donation_mail_digital_no'));

      const params = new URLSearchParams();
      params.set('subject', t('donation_mail_subject'));
      params.set('body', lines.join('\n'));
      return `mailto:${this.recipient}?${params.toString().replace(/\+/g, '%20')}`;
    },

    // Nombre y correo son obligatorios (el número de socio no).
    validate() {
      const t = (k) => (window.fioT && window.fioT(k)) || k;
      let key = '';
      let field = '';
      if (!this.name.trim()) { key = 'form_error_name'; field = 'd-name'; }
      else if (!this.email.trim()) { key = 'form_error_email'; field = 'd-email'; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) { key = 'form_error_email_invalid'; field = 'd-email'; }
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
  Alpine.data('fioDonation', fioDonation);
});
