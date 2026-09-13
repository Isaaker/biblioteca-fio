/**
 * i18n mínimo para el sitio estático de la Biblioteca FIO.
 *
 * Sin frameworks ni build de traducción: un diccionario por idioma y una
 * función que sustituye el texto de cualquier elemento con
 * `data-i18n="clave"` (o `data-i18n-attr="placeholder:clave"` para
 * atributos). El idioma se decide así, en este orden:
 *   1. Si el visitante ya eligió idioma antes (localStorage), se respeta.
 *   2. Si no, se detecta por el idioma del navegador (`navigator.language`).
 *   3. Si no se reconoce ninguno de los dos, español por defecto.
 */
const FIO_I18N_STORAGE_KEY = 'fio-lang';
const FIO_SUPPORTED_LANGS = ['es', 'en'];

const FIO_DICT = {
  es: {
    site_title: 'Biblioteca — Fundación Infante de Orleans',
    site_tagline: 'Catálogo público de la biblioteca',
    nav_home: 'Inicio',
    nav_catalog: 'Catálogo',
    nav_search: 'Buscar',
    nav_scan: 'Escanear',
    nav_stats: 'Estadísticas',
    nav_events: 'Eventos',
    nav_contact: 'Contacto',

    // Landing
    hero_title: 'Biblioteca Fundación Infante de Orleans',
    hero_lead: 'Consulta el catálogo de nuestra biblioteca especializada en aviación e historia aeronáutica: libros, revistas y publicaciones sobre la aviación histórica española.',
    hero_cta_catalog: 'Ver catálogo',
    hero_cta_search: 'Buscar un libro',

    featured_book_title: 'Libro del mes',
    featured_book_cta: 'Ver ficha completa',

    stat_total_books: 'libros catalogados',
    stat_topics: 'temas distintos',
    stat_languages: 'idiomas',
    stat_digitized: 'libros digitalizados',

    feature_catalog_title: 'Catálogo abierto',
    feature_catalog_body: 'Explora el fondo bibliográfico de la Fundación sin necesidad de registro: títulos, autores, editoriales y materias.',
    feature_search_title: 'Buscador',
    feature_search_body: 'Filtra por autor, tema, año o busca texto libre para encontrar rápidamente la obra que buscas dentro de nuestra biblioteca.',

    visit_title: 'Visítanos',
    visit_address_label: 'Dirección',
    visit_address_body: 'Carretera de la Fortuna, 14, Edificio Real Aeroclub<br>28054 Cuatro Vientos, Madrid',
    visit_hours_label: 'Horario de apertura',
    visit_hours_body: 'Lunes, miércoles y viernes, de 10:30 a 13:30.',
    // visit_hours_sunday: retirado de momento (ver site/index.html) — se puede
    // volver a añadir en index.html y aquí cuando se retome el horario de domingos.
    visit_hours_note: 'Fuera de ese horario, contacta con los voluntarios en',
    visit_loan_label: 'Consulta y préstamo',
    visit_loan_body: 'La biblioteca está abierta al público en general para consultas in situ. Los socios y socias de la FIO pueden llevarse libros en préstamo, durante un máximo de 15 días, siempre que el ejemplar sea posterior a 1950 (los más antiguos solo pueden consultarse en sala).',
    visit_catalog_label: 'Catálogo disponible',
    visit_catalog_body: 'volúmenes de temática aeronáutica: libros de consulta, monografías de aviones, manuales técnicos, textos históricos, biografías, novelas y cómics, la mayoría en castellano e inglés.',

    // Catálogo
    search_placeholder: 'Buscar en el catálogo…',
    filter_author: 'Autor',
    filter_topic: 'Tema',
    filter_year: 'Año',
    filter_all: 'Todos',
    filter_digitized_only: 'Solo digitalizados',
    filter_clear: 'Quitar filtros',
    loading: 'Cargando catálogo…',
    load_error: 'No se ha podido cargar el catálogo (data/catalog.json). Comprueba que el sitio se ha generado correctamente.',
    result_count_pre: '',
    result_count_mid: 'libro(s) encontrado(s) de',
    result_count_post: 'en total.',
    no_results: 'Ningún libro coincide con los filtros seleccionados.',
    reference_label: 'Referencia',
    isbn_label: 'ISBN',
    digital_link_label: 'Ver copia digital',
    prev_page: '‹ Anterior',
    next_page: 'Siguiente ›',

    footer_export_marc: 'Exportar catálogo MARC21',
    footer_export_marcxml: 'Exportar MARCXML',
    footer_rss_feed: 'Últimas altas (RSS)',
    footer_timeline: 'Línea del tiempo',
    footer_privacy: 'Política de privacidad',

    // Detalle de libro
    book_details_title: 'Detalles del libro',
    book_not_found: 'No se ha encontrado ningún libro con esos datos.',
    back_to_catalog: '← Volver al catálogo',
    field_reference: 'Referencia',
    field_author: 'Autor(es)',
    field_edition: 'Edición',
    field_publisher: 'Editorial',
    field_place: 'Lugar',
    field_year: 'Año',
    field_topic: 'Tema',
    field_subtopic: 'Subtema',
    field_speciality: 'Especialidad',
    field_specifications: 'Especificaciones',
    field_isbn: 'ISBN',
    field_language: 'Idioma',
    field_pages: 'Nº de páginas',
    field_illustrations: 'Ilustraciones',
    field_size: 'Tamaño',
    field_series: 'Serie / Colección',
    catalog_data_title: 'Datos del catálogo',
    badge_digitized: 'Digitalizado',
    view_digital_copy: 'Ver copia digital',
    related_books_title: 'Libros relacionados',
    related_books_lead: 'Mismo tema o autor que este libro.',

    conservation_notice_title: 'Aviso de conservación',
    conservation_notice_body: 'Este ejemplar es anterior a 1950. Se trata de una obra frágil y su consulta puede estar sujeta a condiciones especiales para garantizar su correcta conservación.',
    conservation_digital_available: 'COPIA DIGITAL DISPONIBLE',
    conservation_digital_body: 'Existe una copia digitalizada disponible para consulta. Esta se ofrece de manera preferente para favorecer la conservación del original si no existe una causa justificada para la consulta del mismo.',
    conservation_physical_only: 'CONSULTA EN FÍSICO — USO DE GUANTES OBLIGATORIO',
    conservation_physical_body: 'Este libro no cuenta con copia digital. Su consulta en físico requiere el uso obligatorio de guantes para conservar correctamente la obra.',
    conservation_more_info: 'Más información',

    // Búsqueda dedicada
    search_title: 'Buscar en el catálogo',
    search_lead: 'Busca por título, autor, tema, editorial, idioma, serie, ISBN o referencia. También puedes usar la búsqueda por escáner.',
    search_scan_cta: 'Buscar con la cámara (código de barras o etiqueta)',

    // Escáner
    scan_title: 'Buscar un libro con la cámara',
    scan_lead: 'Apunta con la cámara al código de barras (ISBN) de la contraportada, o a la etiqueta blanca con la referencia (por ejemplo, "LB0123") del lomo o la primera página.',
    scan_mode_barcode: 'Código de barras',
    scan_mode_label: 'Etiqueta de referencia',
    scan_start: 'Activar cámara',
    scan_stop: 'Detener cámara',
    scan_unsupported_barcode: 'Este navegador no admite lectura de códigos de barras (esto incluye TODOS los navegadores en iPhone/iPad, es una limitación del sistema, no del navegador). Usa el modo "Etiqueta de referencia" o la búsqueda manual de abajo.',
    scan_reading_label: 'Leyendo etiqueta…',
    scan_manual_label: 'O escribe la referencia a mano:',
    scan_manual_placeholder: 'Ej. LB0123',
    scan_manual_go: 'Ir al libro',
    scan_no_match: 'No se ha encontrado ningún libro con ese código o referencia.',
    scan_found: 'Libro encontrado:',
    scan_camera_error: 'No se ha podido acceder a la cámara. Comprueba los permisos del navegador.',
    scan_upload_alt: 'O sube una foto de la etiqueta:',
    scan_view_book: 'Ver ficha del libro',

    // Estadísticas
    stats_title: 'Estadísticas del catálogo',
    stats_lead: 'Cifras generadas automáticamente a partir del catálogo público.',
    stats_by_topic: 'Libros por tema',
    stats_by_language: 'Libros por idioma',
    stats_by_decade: 'Libros por década de publicación',
    stats_digitization: 'Digitalización',
    stats_digitized_of_total: 'digitalizados de',

    // Eventos
    events_title: 'Eventos y actividades',
    events_lead: 'Charlas, jornadas de puertas abiertas y actividades relacionadas con la biblioteca y la Fundación.',
    events_empty: 'No hay eventos programados actualmente. Vuelve a consultar esta página más adelante.',

    timeline_title: 'Línea del tiempo de la aviación española',
    timeline_lead: 'Un recorrido por las grandes etapas de la aviación en España. Cada época enlaza con el catálogo, filtrado por los años de esa etapa, para ver qué libros de la biblioteca hablan de ese momento.',
    timeline_era_cta: 'Ver libros de esta época',
    timeline_era1_title: 'Los pioneros',
    timeline_era1_body: 'Primeros vuelos militares y civiles en España: la creación del Servicio de Aeronáutica Militar y los primeros récords de distancia y altura.',
    timeline_era2_title: 'Marruecos y las grandes travesías',
    timeline_era2_body: 'La aviación en la Guerra del Rif y los grandes raids de la época: el Plus Ultra a Buenos Aires y otras hazañas transoceánicas.',
    timeline_era3_title: 'La II República y la aviación civil',
    timeline_era3_body: 'Expansión de las líneas aéreas comerciales y consolidación de la industria aeronáutica nacional antes de la guerra.',
    timeline_era4_title: 'La Guerra Civil',
    timeline_era4_body: 'La aviación como arma decisiva del conflicto: escuadrillas, aviones extranjeros y la Legión Cóndor.',
    timeline_era5_title: 'Posguerra y aislamiento',
    timeline_era5_body: 'Reconstrucción de la industria aeronáutica española (CASA, Hispano Aviación) en un contexto de aislamiento internacional.',
    timeline_era6_title: 'La era del reactor',
    timeline_era6_body: 'Llegada de los primeros cazas y aviones comerciales a reacción, y la apertura de España al turismo aéreo de masas.',
    timeline_era7_title: 'Modernización e integración internacional',
    timeline_era7_body: 'Entrada en programas europeos como el EF-18 y el Eurofighter, y modernización de la aviación civil y militar española.',
    timeline_era8_title: 'La aviación española actual',
    timeline_era8_body: 'Low cost, nuevas generaciones de cazas, drones y la aviación española del siglo XXI.',
    timeline_note: 'Las fechas de cada etapa son orientativas y se refieren al año de publicación del libro, no al de los hechos que trata.',

    thanks_title: 'Gracias',
    thanks_phrase_intro: 'Simplemente queremos decir ¡Gracias!',
    thanks_reason_1: 'A todos aquellos que habéis depositado vuestra confianza en la fundación para que conservemos vuestros libros.',
    thanks_reason_2: 'A todos aquellos que habéis decidido compartir el conocimiento con los demás.',
    thanks_reason_3: 'A los que habéis decidido apoyar la conservación de la cultura aeronáutica.',
    thanks_reason_4: 'A los que ayudáis a mantener este gran proyecto.',
    thanks_final: '¡Gracias!',
    thanks_donors_title: 'Donantes',
    thanks_donors_lead: 'Personas y familias que han donado libros a nuestra colección a lo largo de los años.',
    thanks_donors_empty: 'Todavía no hay nombres cargados aquí.',
    thanks_volunteers_title: 'Voluntarios',
    thanks_volunteers_lead: 'Personas que han dedicado su tiempo a mantener y hacer crecer la biblioteca.',
    thanks_volunteers_empty: 'Todavía no hay nombres cargados aquí.',
    thanks_missing_name: '¿Has donado o colaborado en la biblioteca y no apareces? Lo sentimos muchísimo, pero es muy difícil llevar un control de todos los donantes y colaboradores. Por favor, no dudes en contactarnos para que incluyamos tu nombre.',
    thanks_missing_name_cta: 'Contactar',
    thanks_help_title: 'La FIO necesita tu ayuda',
    thanks_help_lead: 'Aporta tu grano de arena para conservar la historia aeronáutica.',
    thanks_help_donate: 'Quiero donar un volumen',
    thanks_help_member: 'Quiero hacerme socio',
    thanks_help_volunteer: 'Quiero ser voluntario',
    nav_collaborate: 'Colabora',
    footer_thanks: 'Agradecimientos',

    donation_title: 'Donar libros',
    donation_intro: 'Si has llegado hasta aquí significa que tienes obras que deberían formar parte de nuestra colección. Estaremos encantados de recibirlas, pero antes queremos que tengas en cuenta lo siguiente:',
    donation_collection_size: 'Nuestra colección cuenta con más de 3.500 ejemplares. Dependiendo de la obra o volumen donado, es posible que:',
    donation_point_1: 'Sea destinado a nuestro Archivo Histórico en lugar de a la biblioteca, en caso de que se trate de un manual técnico, documento histórico o revista. De momento, los documentos de archivo son solo de acceso interno de la fundación; queremos que esto cambie, pero de momento no tenemos capacidad para ello.',
    donation_point_2: 'Tenemos muchos libros comunes: si donas algún libro que ya tengamos, es posible que lo almacenemos para poder venderlo y financiar así la compra de otros ejemplares que aún no están en nuestra colección.',
    donation_point_3: 'Los libros que no estén relacionados con temas de aviación, ingeniería o historia, o que simplemente no sean relevantes para nuestra colección, podrán ser también vendidos para financiar la compra de nuevos ejemplares, o donados a otras bibliotecas en las que encajen.',
    donation_point_4: 'Es posible que se te pida firmar un documento de cesión: es una necesidad legal para poder aceptar la donación.',
    donation_transparency: 'Queremos que el proceso sea totalmente transparente; por ello, creemos que es importante compartir esta información contigo.',
    donation_contact_intro: 'Si deseas continuar con el proceso o tienes más dudas, puedes escribirnos a fioteca@fio.es, o para facilitártelo aún más, puedes rellenar este formulario con la información que necesitamos para poder evaluar la donación.',
    donation_form_title: 'Formulario de donación',
    donation_form_name_label: 'Tu nombre (opcional)',
    donation_form_email_label: 'Correo de contacto (opcional)',
    donation_form_quantity_label: 'Cantidad aproximada de libros',
    donation_form_items_label: 'Títulos, autores o descripción de las obras',
    donation_form_items_placeholder: 'Uno por línea, o una descripción general si son muchos…',
    donation_form_comments_label: 'Comentarios adicionales',
    donation_form_digital_copy: 'Me interesaría recibir copia digital, si la obra es elegible',
    donation_form_submit: 'Enviar',
    donation_digital_copy_note: 'Algunos libros podrían ser elegibles para que recibas una copia digital gratuita, de manera que puedas continuar accediendo al libro aunque lo hayas donado (siempre podrás verlo físicamente en la biblioteca; la copia digital es un extra).',
    events_past: 'Eventos pasados',

    access_restricted_title: 'Acceso restringido a copias digitales',
    access_restricted_subtitle: 'Biblioteca — Fundación Infante de Orleans',
    access_restricted_heading: 'Acceso restringido y finalidad de las copias digitales',
    access_restricted_intro: 'Las copias digitales a las que apunta el catálogo de la Biblioteca de la Fundación Infante de Orleans son accesibles únicamente al personal autorizado de la Fundación y están destinadas exclusivamente a la consulta en el ámbito de la propia biblioteca. Estas reproducciones se conservaron y generaron con fines de preservación y de investigación, con el objeto de proteger y facilitar el estudio de los originales, y no deben entenderse como autorizaciones para la redistribución pública de las obras digitalizadas.',
    access_restricted_legal: 'Marco legal',
    access_restricted_legal_text: 'La reproducción de obras protegidas se rige por el Texto Refundido de la Ley de Propiedad Intelectual (Real Decreto Legislativo 1/1996, de 12 de abril). Dicha norma protege los derechos de explotación de los autores, pero contempla excepciones y límites. En particular, el artículo 37 del Texto Refundido permite a determinadas entidades sin ánimo de lucro efectuar reproducciones de obras de sus colecciones con fines de conservación, investigación o preservación, dentro de los requisitos y límites establecidos por la propia ley.',
    access_restricted_conditions: 'Condiciones de uso',
    access_restricted_conditions_1: 'El acceso a las copias digitales señaladas en el catálogo está restringido al personal autorizado de la Fundación y a las consultas in situ en la biblioteca.',
    access_restricted_conditions_2: 'Queda expresamente prohibida la descarga, copia, redistribución o publicación de las reproducciones fuera del marco autorizado por la Fundación.',
    access_restricted_conditions_3: 'Las reproducciones se conservan exclusivamente para garantizar la preservación de los fondos y facilitar la investigación académica y especializada.',
    access_restricted_contact: 'Contacto',
    access_restricted_contact_text: 'Si cree que debería tener acceso autorizado a alguna copia digital por motivos académicos o de investigación, contacte con el servicio de la biblioteca en fioteca@fio.es indicando el identificador de la obra y la finalidad de la solicitud. La Fundación valorará las solicitudes conforme a su normativa interna y a lo establecido en la Ley de Propiedad Intelectual.',
    access_restricted_updated: 'Última actualización: 2026',

    // Filtros avanzados del catálogo
    filter_subtopic: 'Subtema',
    filter_language: 'Idioma',
    filter_sort_by: 'Ordenar por',
    filter_sort_title: 'Título',
    filter_sort_author: 'Autor',
    filter_sort_year: 'Año',
    filter_order_asc: 'Ascendente',
    filter_order_desc: 'Descendente',
    filter_q_placeholder: 'Buscar por título, autor, tema, ISBN…',
    filter_q_help: 'Admite "frases exactas", -excluir, opción1|opción2, y tolera alguna errata.',
    cover_alt: 'Portada de',

    // Búsqueda avanzada
    search_field_general: 'Búsqueda general',
    search_field_title: 'Título',
    search_field_author: 'Autor',
    search_field_reference: 'Referencia',
    search_field_topic: 'Tema',
    search_field_subtopic: 'Subtema',
    search_field_publisher: 'Editorial',
    search_field_language: 'Idioma',
    search_field_series: 'Serie / Colección',
    search_field_isbn: 'ISBN',
    search_field_year_from: 'Año desde',
    search_field_year_to: 'Año hasta',
    search_field_digitized: 'Solo digitalizados',
    search_submit: 'Buscar',
    search_clear: 'Limpiar formulario',
    search_advanced_toggle: 'Búsqueda avanzada',
    search_results_count: 'resultado(s)',
    search_export_csv: 'Exportar a CSV',
    search_export_bibtex: 'Exportar a BibTeX',
    search_no_results: 'No se ha encontrado ningún libro con esos criterios.',
    search_instant_title: 'Búsqueda instantánea de texto libre',
    search_instant_lead: 'Escribe cualquier palabra y verás resultados al momento, sin pulsar "Buscar".',

    // Búsqueda con IA (externalizada)
    ai_search_title: 'Buscar con ayuda de una IA',
    ai_search_lead: 'Si prefieres describir lo que buscas con tus propias palabras ("un libro sobre la guerra civil española y la aviación, publicado antes de 1980"), copia este prompt y pégalo en tu asistente de IA favorito. El asistente leerá el catálogo público y te recomendará libros concretos.',
    ai_search_copy: 'Copiar el prompt',
    ai_search_copied: 'Prompt copiado al portapapeles',
    ai_search_open_with: 'O ábrelo directamente en:',
    ai_search_what_label: 'Qué estás buscando (opcional, para completar el prompt):',
    ai_search_what_placeholder: 'Ej. libros sobre meteorología aeronáutica en español',

    // Privacidad
    privacy_title: 'Política de privacidad',
    privacy_banner_text: 'Esta web no usa cookies de analítica ni publicidad. Solo guarda en tu propio dispositivo tu idioma preferido y, si usas el escáner, las portadas ya consultadas — nada se envía a nuestros servidores.',
    privacy_banner_link: 'Más información',
    privacy_banner_ok: 'Entendido',

    // Estadísticas ampliadas
    stats_by_author: 'Autores con más obras en el catálogo',
    stats_by_publisher: 'Editoriales con más obras en el catálogo',
    stats_by_speciality: 'Libros por especialidad',
    stats_isbn_coverage: 'Libros con ISBN registrado',
    stats_series_count: 'Libros que pertenecen a alguna serie o colección',
    stats_avg_pages: 'Media de páginas por libro',
    stats_summary_title: 'Resumen general',
    footer_connect_library: 'Conecta con la biblioteca',
    footer_access_restricted: 'Acceso restringido',
    footer_privacy_short: 'Privacidad',
    footer_contact: 'Contacto',
    shell_skip_to_content: 'Saltar al contenido',
    interoperability_title: 'Conecta con la biblioteca',

    // Favoritos
    favorites_title: 'Mis favoritos',
    favorites_empty: 'Aún no has guardado ningún libro como favorito. Pulsa la estrella ⭐ en la ficha de un libro para añadirlo aquí.',
    favorites_open: 'Abrir ficha',
    favorites_remove: 'Quitar de favoritos',
    favorites_close: 'Cerrar',
    favorites_no_reference: 'Sin referencia',

    // Contacto
    contact_title: 'Contacto',
    contact_library_title: 'Biblioteca (fioteca)',
    contact_email_label: 'Correo electrónico:',
    contact_address_label: 'Dirección postal:',
    contact_alt_title: 'Contacto alternativo: Oficina de Administración de la FIO',
    contact_phone_label: 'Teléfono:',
    contact_form_title: 'Escríbenos',
    contact_form_subject_label: 'Asunto',
    contact_form_name_label: 'Tu nombre (opcional)',
    contact_form_message_label: 'Mensaje',
    contact_form_message_placeholder: 'Cuéntanos en qué podemos ayudarte…',
    contact_form_submit: 'Enviar',
    contact_subject_visit: 'Solicitar visita',
    contact_subject_loans: 'Préstamos',
    contact_subject_interlibrary: 'Préstamo interbibliotecario',
    contact_subject_catalog: 'Catálogo / una obra concreta',
    contact_subject_digitization: 'Digitalización',
    contact_subject_other: 'Otros',
  },
  en: {
    site_title: 'Library — Infante de Orleans Foundation',
    site_tagline: 'Public library catalogue',
    nav_home: 'Home',
    nav_catalog: 'Catalogue',
    nav_search: 'Search',
    nav_scan: 'Scan',
    nav_stats: 'Statistics',
    nav_events: 'Events',
    nav_contact: 'Contact',

    hero_title: 'Infante de Orleans Foundation Library',
    hero_lead: 'Browse the catalogue of our library, specialised in aviation and aeronautical history: books, magazines and publications on Spanish historical aviation.',
    hero_cta_catalog: 'View catalogue',
    hero_cta_search: 'Search a book',

    featured_book_title: 'Book of the month',
    featured_book_cta: 'View full record',

    stat_total_books: 'catalogued books',
    stat_topics: 'distinct topics',
    stat_languages: 'languages',
    stat_digitized: 'digitised books',

    feature_catalog_title: 'Open catalogue',
    feature_catalog_body: 'Explore the Foundation\'s collection with no registration required: titles, authors, publishers and subjects.',
    feature_search_title: 'Search',
    feature_search_body: 'Filter by author, topic or year, or search free text to quickly find the book you are looking for in our library.',

    visit_title: 'Visit us',
    visit_address_label: 'Address',
    visit_address_body: 'Carretera de la Fortuna, 14, Edificio Real Aeroclub<br>28054 Cuatro Vientos, Madrid, Spain',
    visit_hours_label: 'Opening hours',
    visit_hours_body: 'Mondays, Wednesdays and Fridays, 10:30–13:30.',
    // visit_hours_sunday: removed for now (see site/index.html).
    visit_hours_note: 'Outside those hours, contact the volunteers at',
    visit_loan_label: 'Reading and lending',
    visit_loan_body: 'The library is open to the general public for on-site reading. FIO members can borrow books for up to 15 days, as long as the copy was published after 1950 (older items may only be consulted on site).',
    visit_catalog_label: 'Available catalogue',
    visit_catalog_body: 'volumes on aviation topics: reference books, aircraft monographs, technical manuals, historical texts, biographies, novels and comics, mostly in Spanish and English.',

    search_placeholder: 'Search the catalogue…',
    filter_author: 'Author',
    filter_topic: 'Topic',
    filter_year: 'Year',
    filter_all: 'All',
    filter_digitized_only: 'Digitised only',
    filter_clear: 'Clear filters',
    loading: 'Loading catalogue…',
    load_error: 'The catalogue could not be loaded (data/catalog.json). Check that the site was built correctly.',
    result_count_pre: '',
    result_count_mid: 'book(s) found out of',
    result_count_post: 'in total.',
    no_results: 'No books match the selected filters.',
    reference_label: 'Reference',
    isbn_label: 'ISBN',
    digital_link_label: 'View digital copy',
    prev_page: '‹ Previous',
    next_page: 'Next ›',

    footer_export_marc: 'Export MARC21 catalogue',
    footer_export_marcxml: 'Export MARCXML',
    footer_rss_feed: 'Recent additions (RSS)',
    footer_timeline: 'Timeline',
    footer_privacy: 'Privacy policy',

    // Book details
    book_details_title: 'Book details',
    book_not_found: 'No book was found matching that information.',
    back_to_catalog: '← Back to catalogue',
    field_reference: 'Reference',
    field_author: 'Author(s)',
    field_edition: 'Edition',
    field_publisher: 'Publisher',
    field_place: 'Place',
    field_year: 'Year',
    field_topic: 'Topic',
    field_subtopic: 'Subtopic',
    field_speciality: 'Speciality',
    field_specifications: 'Specifications',
    field_isbn: 'ISBN',
    field_language: 'Language',
    field_pages: 'Pages',
    field_illustrations: 'Illustrations',
    field_size: 'Size',
    field_series: 'Series / Collection',
    catalog_data_title: 'Catalogue data',
    badge_digitized: 'Digitised',
    view_digital_copy: 'View digital copy',
    related_books_title: 'Related books',
    related_books_lead: 'Same topic or author as this book.',

    conservation_notice_title: 'Conservation notice',
    conservation_notice_body: 'This item was published before 1950. It is a fragile work and access to it may be subject to special conditions to ensure its proper conservation.',
    conservation_digital_available: 'DIGITAL COPY AVAILABLE',
    conservation_digital_body: 'A digitised copy is available for consultation. It is offered preferentially to help preserve the original, unless there is a justified reason to consult the original itself.',
    conservation_physical_only: 'PHYSICAL ACCESS ONLY — GLOVES REQUIRED',
    conservation_physical_body: 'This book has no digital copy. Consulting it in person requires the mandatory use of gloves to properly preserve the work.',
    conservation_more_info: 'More information',

    // Dedicated search
    search_title: 'Search the catalogue',
    search_lead: 'Search by title, author, topic, publisher, language, series, ISBN or reference. You can also search with the camera scanner.',
    search_scan_cta: 'Search with the camera (barcode or label)',

    // Scanner
    scan_title: 'Find a book with the camera',
    scan_lead: 'Point the camera at the barcode (ISBN) on the back cover, or at the white reference label (e.g. "LB0123") on the spine or first page.',
    scan_mode_barcode: 'Barcode',
    scan_mode_label: 'Reference label',
    scan_start: 'Turn on camera',
    scan_stop: 'Stop camera',
    scan_unsupported_barcode: "This browser doesn't support barcode scanning (this includes ALL browsers on iPhone/iPad — it's a system limitation, not a browser one). Use \"Reference label\" mode or the manual search below.",
    scan_reading_label: 'Reading label…',
    scan_manual_label: 'Or type the reference by hand:',
    scan_manual_placeholder: 'E.g. LB0123',
    scan_manual_go: 'Go to book',
    scan_no_match: 'No book was found with that code or reference.',
    scan_found: 'Book found:',
    scan_camera_error: 'Could not access the camera. Check your browser permissions.',
    scan_upload_alt: 'Or upload a photo of the label:',
    scan_view_book: 'View book',

    // Statistics
    stats_title: 'Catalogue statistics',
    stats_lead: 'Figures generated automatically from the public catalogue.',
    stats_by_topic: 'Books by topic',
    stats_by_language: 'Books by language',
    stats_by_decade: 'Books by publication decade',
    stats_digitization: 'Digitisation',
    stats_digitized_of_total: 'digitised out of',

    // Events
    events_title: 'Events and activities',
    events_lead: 'Talks, open days and activities related to the library and the Foundation.',
    events_empty: 'No events are currently scheduled. Check back here later.',

    timeline_title: 'Timeline of Spanish aviation',
    timeline_lead: 'A journey through the major stages of aviation in Spain. Each era links to the catalogue, filtered by that period, so you can see which library books cover that moment.',
    timeline_era_cta: 'See books from this era',
    timeline_era1_title: 'The pioneers',
    timeline_era1_body: 'The first military and civil flights in Spain: the creation of the Military Aeronautics Service and the first distance and altitude records.',
    timeline_era2_title: 'Morocco and the great crossings',
    timeline_era2_body: 'Aviation in the Rif War and the great raids of the era: the Plus Ultra flight to Buenos Aires and other transoceanic feats.',
    timeline_era3_title: 'The Second Republic and civil aviation',
    timeline_era3_body: 'Expansion of commercial airlines and consolidation of the national aeronautical industry before the war.',
    timeline_era4_title: 'The Spanish Civil War',
    timeline_era4_body: 'Aviation as a decisive weapon of the conflict: squadrons, foreign aircraft and the Condor Legion.',
    timeline_era5_title: 'Post-war isolation',
    timeline_era5_body: 'Rebuilding the Spanish aeronautical industry (CASA, Hispano Aviación) under international isolation.',
    timeline_era6_title: 'The jet age',
    timeline_era6_body: 'The arrival of the first jet fighters and commercial jets, and the opening of Spain to mass air tourism.',
    timeline_era7_title: 'Modernisation and international integration',
    timeline_era7_body: 'Joining European programmes such as the EF-18 and Eurofighter, and modernising Spanish civil and military aviation.',
    timeline_era8_title: 'Spanish aviation today',
    timeline_era8_body: 'Low-cost airlines, new generations of fighter jets, drones, and 21st-century Spanish aviation.',
    timeline_note: "Era dates are approximate and refer to a book's publication year, not the year of the events it covers.",

    thanks_title: 'Thank you',
    thanks_phrase_intro: 'We simply want to say Thank You!',
    thanks_reason_1: 'To everyone who has trusted the Foundation to preserve your books.',
    thanks_reason_2: 'To everyone who has chosen to share knowledge with others.',
    thanks_reason_3: 'To those who support the preservation of aeronautical culture.',
    thanks_reason_4: 'To those who help keep this great project going.',
    thanks_final: 'Thank you!',
    thanks_donors_title: 'Donors',
    thanks_donors_lead: 'People and families who have donated books to our collection over the years.',
    thanks_donors_empty: 'No names loaded here yet.',
    thanks_volunteers_title: 'Volunteers',
    thanks_volunteers_lead: 'People who have given their time to maintain and grow the library.',
    thanks_volunteers_empty: 'No names loaded here yet.',
    thanks_missing_name: "Have you donated or collaborated with the library and don't see your name? We're really sorry — it's very hard to keep track of every donor and contributor. Please get in touch so we can add your name.",
    thanks_missing_name_cta: 'Get in touch',
    thanks_help_title: 'The FIO needs your help',
    thanks_help_lead: 'Do your bit to help preserve aeronautical history.',
    thanks_help_donate: 'I want to donate a book',
    thanks_help_member: 'I want to become a member',
    thanks_help_volunteer: 'I want to volunteer',
    nav_collaborate: 'Get involved',
    footer_thanks: 'Acknowledgements',

    donation_title: 'Donate books',
    donation_intro: "If you've made it this far, it means you have books that should be part of our collection. We'd be delighted to receive them, but first we'd like you to keep the following in mind:",
    donation_collection_size: 'Our collection has more than 3,500 volumes. Depending on the item or volume donated, it may:',
    donation_point_1: "Be assigned to our Historical Archive rather than the library, if it's a technical manual, historical document or magazine. For now, archive documents are for internal use by the Foundation only; we'd like that to change, but we don't yet have the capacity for it.",
    donation_point_2: 'We already have many common books: if you donate a book we already hold, we may set it aside to sell it and fund the purchase of other titles not yet in our collection.',
    donation_point_3: "Books unrelated to aviation, engineering or history, or simply not relevant to our collection, may also be sold to fund new acquisitions, or donated to other libraries where they'd be a better fit.",
    donation_point_4: 'You may be asked to sign a transfer-of-ownership document: this is a legal requirement for us to accept the donation.',
    donation_transparency: "We want the process to be fully transparent, which is why we think it's important to share this information with you.",
    donation_contact_intro: "If you'd like to go ahead or have further questions, you can email us at fioteca@fio.es, or to make it even easier, you can fill in this form with the information we need to evaluate the donation.",
    donation_form_title: 'Donation form',
    donation_form_name_label: 'Your name (optional)',
    donation_form_email_label: 'Contact email (optional)',
    donation_form_quantity_label: 'Approximate number of books',
    donation_form_items_label: 'Titles, authors or description of the works',
    donation_form_items_placeholder: 'One per line, or a general description if there are many…',
    donation_form_comments_label: 'Additional comments',
    donation_form_digital_copy: "I'd be interested in a digital copy, if the item is eligible",
    donation_form_submit: 'Send',
    donation_digital_copy_note: "Some books may be eligible for a free digital copy, so you can keep accessing the book even after donating it (you'll always be able to see it in person at the library; the digital copy is an extra).",
    events_past: 'Past events',

    access_restricted_title: 'Restricted access to digital copies',
    access_restricted_subtitle: 'Library — Infante de Orleans Foundation',
    access_restricted_heading: 'Restricted access and purpose of digital copies',
    access_restricted_intro: 'The digital copies referenced in the catalogue of the Library of the Infante de Orleans Foundation are accessible only to authorised Foundation personnel and are intended exclusively for consultation within the library itself. These reproductions were preserved and created for conservation and research purposes to protect and facilitate the study of the originals, and they must not be understood as authorisation for the public redistribution of the digitised works.',
    access_restricted_legal: 'Legal framework',
    access_restricted_legal_text: 'The reproduction of protected works is governed by the consolidated text of the Intellectual Property Act (Royal Legislative Decree 1/1996, dated 12 April). This law protects the exploitation rights of authors but also allows for exceptions and limits. In particular, Article 37 of the consolidated text permits certain non-profit entities to make reproductions of works in their collections for conservation, research or preservation, within the requirements and limits established by the law itself.',
    access_restricted_conditions: 'Terms of use',
    access_restricted_conditions_1: 'Access to the digital copies listed in the catalogue is restricted to authorised Foundation staff and to on-site consultation within the library.',
    access_restricted_conditions_2: 'The downloading, copying, redistribution or publication of reproductions outside the authorisation granted by the Foundation is expressly prohibited.',
    access_restricted_conditions_3: 'The reproductions are kept exclusively to guarantee the preservation of the collections and to facilitate specialist academic and research work.',
    access_restricted_contact: 'Contact',
    access_restricted_contact_text: 'If you believe you should have authorised access to a digital copy for academic or research reasons, contact the library service at fioteca@fio.es, stating the work identifier and the purpose of the request. The Foundation will evaluate the request in accordance with its internal rules and the provisions of the Intellectual Property Act.',
    access_restricted_updated: 'Last updated: 2026',

    // Advanced catalogue filters
    filter_subtopic: 'Subtopic',
    filter_language: 'Language',
    filter_sort_by: 'Sort by',
    filter_sort_title: 'Title',
    filter_sort_author: 'Author',
    filter_sort_year: 'Year',
    filter_order_asc: 'Ascending',
    filter_order_desc: 'Descending',
    filter_q_placeholder: 'Search by title, author, topic, ISBN…',
    filter_q_help: 'Supports "exact phrases", -exclude, option1|option2, and tolerates minor typos.',
    cover_alt: 'Cover of',

    // Advanced search
    search_field_general: 'General search',
    search_field_title: 'Title',
    search_field_author: 'Author',
    search_field_reference: 'Reference',
    search_field_topic: 'Topic',
    search_field_subtopic: 'Subtopic',
    search_field_publisher: 'Publisher',
    search_field_language: 'Language',
    search_field_series: 'Series / Collection',
    search_field_isbn: 'ISBN',
    search_field_year_from: 'Year from',
    search_field_year_to: 'Year to',
    search_field_digitized: 'Digitised only',
    search_submit: 'Search',
    search_clear: 'Clear form',
    search_advanced_toggle: 'Advanced search',
    search_results_count: 'result(s)',
    search_export_csv: 'Export to CSV',
    search_export_bibtex: 'Export to BibTeX',
    search_no_results: 'No book was found matching those criteria.',
    search_instant_title: 'Instant free-text search',
    search_instant_lead: 'Type any word and see results instantly, no need to press "Search".',

    // AI-assisted search (externalised)
    ai_search_title: 'Search with AI assistance',
    ai_search_lead: 'If you\'d rather describe what you\'re looking for in your own words ("a book about the Spanish Civil War and aviation, published before 1980"), copy this prompt and paste it into your favourite AI assistant. It will read the public catalogue and recommend specific books.',
    ai_search_copy: 'Copy the prompt',
    ai_search_copied: 'Prompt copied to clipboard',
    ai_search_open_with: 'Or open it directly in:',
    ai_search_what_label: 'What are you looking for (optional, fills in the prompt):',
    ai_search_what_placeholder: 'E.g. books on aeronautical meteorology in Spanish',

    // Privacy
    privacy_title: 'Privacy policy',
    privacy_banner_text: "This website doesn't use analytics or advertising cookies. It only stores your preferred language on your own device and, if you use the scanner, covers already looked up — nothing is sent to our servers.",
    privacy_banner_link: 'More information',
    privacy_banner_ok: 'Got it',

    // Extended statistics
    stats_by_author: 'Authors with most works in the catalogue',
    stats_by_publisher: 'Publishers with most works in the catalogue',
    stats_by_speciality: 'Books by speciality',
    stats_isbn_coverage: 'Books with a registered ISBN',
    stats_series_count: 'Books belonging to a series or collection',
    stats_avg_pages: 'Average pages per book',
    stats_summary_title: 'General summary',
    footer_connect_library: 'Connect with the library',
    footer_access_restricted: 'Restricted access',
    footer_privacy_short: 'Privacy',
    footer_contact: 'Contact',
    shell_skip_to_content: 'Skip to content',
    interoperability_title: 'Connect with the library',

    // Favorites
    favorites_title: 'My favourites',
    favorites_empty: "You haven't saved any books as favourites yet. Tap the ⭐ on a book's page to add it here.",
    favorites_open: 'Open book',
    favorites_remove: 'Remove from favourites',
    favorites_close: 'Close',
    favorites_no_reference: 'No reference',

    // Contact
    contact_title: 'Contact',
    contact_library_title: 'Library (fioteca)',
    contact_email_label: 'Email:',
    contact_address_label: 'Postal address:',
    contact_alt_title: 'Alternative contact: FIO Administration Office',
    contact_phone_label: 'Phone:',
    contact_form_title: 'Write to us',
    contact_form_subject_label: 'Subject',
    contact_form_name_label: 'Your name (optional)',
    contact_form_message_label: 'Message',
    contact_form_message_placeholder: 'Tell us how we can help…',
    contact_form_submit: 'Send',
    contact_subject_visit: 'Request a visit',
    contact_subject_loans: 'Loans',
    contact_subject_interlibrary: 'Inter-library loan',
    contact_subject_catalog: 'Catalogue / a specific item',
    contact_subject_digitization: 'Digitisation',
    contact_subject_other: 'Other',
  },
};

function fioDetectLang() {
  const stored = localStorage.getItem(FIO_I18N_STORAGE_KEY);
  if (stored && FIO_SUPPORTED_LANGS.includes(stored)) return stored;

  const nav = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
  if (nav.startsWith('en')) return 'en';
  return 'es';
}

function fioSetLang(lang) {
  if (!FIO_SUPPORTED_LANGS.includes(lang)) lang = 'es';
  localStorage.setItem(FIO_I18N_STORAGE_KEY, lang);
  document.documentElement.setAttribute('lang', lang);

  const dict = FIO_DICT[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    // formato: "atributo1:clave1;atributo2:clave2"
    el.getAttribute('data-i18n-attr').split(';').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s.trim());
      if (attr && dict[key] !== undefined) el.setAttribute(attr, dict[key]);
    });
  });

  document.querySelectorAll('.fio-lang-switch').forEach(sel => { sel.value = lang; });

  document.dispatchEvent(new CustomEvent('fio-lang-changed', { detail: { lang, dict } }));
}

function fioT(key) {
  const lang = localStorage.getItem(FIO_I18N_STORAGE_KEY) || fioDetectLang();
  return (FIO_DICT[lang] && FIO_DICT[lang][key]) || (FIO_DICT.es[key] || key);
}

function fioCurrentLang() {
  return localStorage.getItem(FIO_I18N_STORAGE_KEY) || fioDetectLang();
}

document.addEventListener('DOMContentLoaded', () => {
  fioSetLang(fioDetectLang());
  document.querySelectorAll('.fio-lang-switch').forEach(sel => {
    sel.addEventListener('change', (e) => fioSetLang(e.target.value));
  });
});
