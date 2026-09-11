![Logo FIO](./site/assets/img/logo.png)
# Catálogo de la Biblioteca FIO — cómo actualizarlo

Este repositorio publica automáticamente el catálogo de la Biblioteca de
la Fundación Infante de Orleans como una página web pública. **No hace
falta saber programar ni usar la terminal** para mantenerlo al día: todo
se hace subiendo el Excel actualizado a través de la propia web de
GitHub.

> **Estado actual (fase 1):** por ahora este es el **único**
> repositorio, y es **público** — cualquiera puede ver su contenido,
> incluido el historial de commits. Por eso `data/indice_general.xlsx`
> está de momento **vacío** (solo tiene las cabeceras de columnas, sin
> ningún libro real): el Excel maestro con los datos reales de la
> biblioteca se subirá más adelante a un **segundo repositorio,
> privado**, cuando esté listo. No subas aquí ningún Excel con datos
> reales de socios, préstamos o donantes mientras este repositorio siga
> siendo público.

> **Sobre la licencia:** que el repositorio sea público no significa
> que sea de código abierto. El código de este proyecto es propiedad
> de la Fundación Infante de Orleans y su uso está restringido — ver
> [`LICENSE.md`](./LICENSE.md). Sí puedes consultar y compartir
> libremente (sin fines comerciales) lo que ves publicado en
> **biblioteca.fio.es**.

---

## 1. Cómo actualizar el catálogo (lo que harás normalmente)

1. Entra en el repositorio en GitHub, con tu usuario habitual.
2. Ve a la carpeta `data/`.
3. Haz clic en el fichero `indice_general.xlsx`.
4. Pulsa el botón con el icono de lápiz (**"Edit"** o, si prefieres subir
   directamente el nuevo fichero, usa el botón **"Add file" → "Upload
   files"** desde la propia carpeta `data/` y arrastra tu Excel
   actualizado, sustituyendo al anterior).
5. Baja hasta el final de la página. Ahí verás un cuadro para describir
   el cambio ("Commit changes"). Puedes escribir algo simple como
   *"Actualización del inventario — agosto 2026"*.
6. Asegúrate de que está marcada la opción **"Commit directly to the
   main branch"** (suele venir así por defecto).
7. Pulsa el botón verde **"Commit changes"** (o "Propose changes" y
   luego confirma, según la pantalla).

Y ya está. **No hace falta hacer nada más.**

### ¿Qué pasa automáticamente después?

En cuanto subes el Excel, GitHub lanza solo un proceso (se llama
"workflow" o "Action") que:

1. Lee tu Excel.
2. Genera el catálogo público (la web, los ficheros MARC21/MARCXML y el
   buscador).
3. Comprueba automáticamente que ningún dato interno (notas del
   donante, estado de conservación detallado, etc.) se haya colado en lo
   público. Si algo fallara aquí, el proceso se detiene solo y **no
   publica nada** — la web seguiría mostrando la versión anterior, sin
   errores visibles para el público.
4. Publica la web actualizada.

Todo el proceso tarda normalmente entre 1 y 3 minutos. Puedes ver si ha
terminado (y si ha ido bien) en la pestaña **"Actions"** del
repositorio: un círculo verde con un check significa que todo ha ido
bien; una cruz roja significa que algo ha fallado y la web **no** se ha
actualizado (revisa el mensaje de error, normalmente indica qué
columna del Excel ha dado problemas).

---

## 2. Cómo marcar un libro como digitalizado

No hace falta tocar el Excel maestro para esto. Hay un fichero aparte,
**`data/digitalizados.json`**, pensado justo para esto — se edita
igual que el Excel (botón de lápiz o "Upload files" desde la web de
GitHub) y dispara la misma regeneración automática.

Formato: una línea por libro, con su "Clave" (columna A del Excel,
p. ej. `LB0001`) a la izquierda y el enlace público a la copia digital
a la derecha:

```json
{
  "LB0001": "https://drive.google.com/drive/folders/...",
  "LB0234": "https://otra-copia-digital.example.com/libro.pdf"
}
```

- El **último** libro de la lista no lleva coma al final (es la
  sintaxis normal de JSON); si no estás segura/o, copia una línea que
  ya exista y solo cambia la clave y el enlace.
- No hace falta ordenar los libros ni tocar nada más del fichero.
- Si te equivocas al escribir una clave (p. ej. `LB00001` en vez de
  `LB0001`), el workflow **no falla** — pero te avisa en la pestaña
  "Actions" con un aviso amarillo indicando qué clave no ha
  encontrado, para que la corrijas.
- Un libro puede tener enlace de digitalización tanto por este fichero
  como por las columnas "Digitalizado" / "Enlace copia digital" del
  Excel (si las usas): si aparece en ambos sitios, gana el valor de
  `data/digitalizados.json`.

---

## 3. La primera vez: activar la publicación (solo una vez)

Tienes dos formas de publicar la web, y puedes usar una o las dos a la
vez (por ejemplo, GitHub Pages como principal y Cloudflare Pages como
respaldo, o al revés). En ambos casos el proceso de actualización del
día a día (sección 1) es exactamente el mismo: solo subes el Excel.

### Opción A: GitHub Pages (dominio: biblioteca.fio.es)

Este repositorio ya incluye todo lo necesario para publicar en GitHub
Pages con el dominio propio **biblioteca.fio.es**: el workflow
`build-and-deploy.yml` construye el sitio y lo despliega
automáticamente en cada cambio, y hay un fichero `site/CNAME` (se
copia solo a `dist/`) con ese dominio ya escrito dentro.

Pasos para activarlo (solo hace falta hacerlo una vez):

1. Entra en **Settings** (Configuración) del repositorio.
2. En el menú de la izquierda, entra en **Pages**.
3. En "Build and deployment" → "Source", elige **"GitHub Actions"**
   (no "Deploy from a branch").
4. Guarda. La primera vez que se ejecute el workflow (por ejemplo, si
   subes cualquier cambio pequeño, o lo lanzas a mano desde la pestaña
   "Actions" → "Generar y publicar catálogo" → "Run workflow"), GitHub
   Pages quedará activado.
5. Sigue bajando en esa misma pantalla de **Pages** hasta "Custom
   domain" y escribe `biblioteca.fio.es` (si no aparece ya solo, al
   detectar el fichero `CNAME`). GitHub te pedirá esperar a que la
   propiedad del dominio se compruebe por DNS.
6. En el proveedor DNS del dominio `fio.es`, añade un registro **CNAME**
   apuntando `biblioteca` hacia `<tuusuario>.github.io` (o los
   registros **A** que indica la
   [documentación oficial de GitHub Pages](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
   si prefieres usar el dominio raíz en vez de un subdominio). Esto lo
   gestiona quien tenga acceso al DNS de `fio.es`, no hace falta que
   sea quien administra este repositorio.
7. Cuando el DNS propague (puede tardar de minutos a un par de horas),
   activa también en esa pantalla la casilla **"Enforce HTTPS"** en
   cuanto esté disponible (GitHub tarda unos minutos en emitir el
   certificado tras verificar el dominio).

Nota: como este repositorio es **público** (ver aviso al principio de
este documento), GitHub Pages lo publica sin ninguna configuración
adicional de visibilidad — a diferencia de un repo privado, aquí no
hace falta ningún plan de pago para que Pages funcione.

### Opción B: Cloudflare Pages (respaldo opcional)

El repositorio incluye una carpeta **`dist/`** con el sitio **ya
construido** (HTML, CSS, JS y el catálogo en JSON/MARC21, todo listo
para servir tal cual). El workflow de GitHub Actions la mantiene
actualizada automáticamente: cada vez que subes un Excel nuevo, además
de publicar en GitHub Pages, hace un commit actualizando `dist/` en el
propio repositorio. Gracias a eso, Cloudflare Pages no necesita
ejecutar Python — solo sirve la carpeta tal cual está.

Para conectarlo (una sola vez):

1. Entra en el [panel de Cloudflare](https://dash.cloudflare.com/) →
   **Workers & Pages** → **Create application** → pestaña **Pages** →
   **Connect to Git**.
2. Autoriza a Cloudflare a acceder a GitHub y elige este repositorio
   (Cloudflare Pages sí puede conectarse a repositorios **privados**,
   igual que GitHub Pages).
3. En la configuración de build, indica:
   - **Framework preset**: `None`
   - **Build command**: *(déjalo vacío)*
   - **Build output directory**: `dist`
4. Guarda y despliega. Cloudflare te dará una URL pública (algo como
   `https://biblioteca-fio-catalogo.pages.dev`), y a partir de ahí
   desplegará automáticamente cada vez que `dist/` cambie en el
   repositorio (es decir, cada vez que subas un Excel nuevo, con un
   par de minutos de diferencia: primero termina el workflow de
   GitHub Actions, que es quien actualiza `dist/`, y eso dispara a su
   vez el despliegue de Cloudflare).
5. El dominio `biblioteca.fio.es` ya apunta a GitHub Pages (Opción A),
   así que aquí Cloudflare Pages quedaría como respaldo accesible solo
   por su URL `.pages.dev` — un dominio no puede apuntar a la vez a
   GitHub Pages y a Cloudflare Pages. Si en el futuro se prefiere
   Cloudflare como web principal, bastaría con mover el DNS de
   `biblioteca.fio.es` desde la pestaña "Custom domains" de Cloudflare.

**¿Por qué hay una carpeta `dist/` versionada si `site/` ya tiene el
código del sitio?** `site/` es el código *fuente* (las plantillas
HTML, CSS y JS que edita una persona) y `dist/` es el resultado *ya
construido* a partir de ese código más el Excel — con el catálogo en
JSON y el MARC21/MARCXML ya generados. No se
edita `dist/` a mano nunca: se sobrescribe solo en cada build. Si
alguna vez ves un conflicto ahí, lo más sencillo es descartar tus
cambios en `dist/` y dejar que el siguiente build lo regenere.

---

## 4. Estructura del repositorio (para quien quiera entenderla)

```
data/indice_general.xlsx   → el Excel maestro (lo actualizas tú)
build/                      → el script Python que genera el catálogo
site/                       → código FUENTE de la web (HTML/CSS/JS)
dist/                       → sitio YA CONSTRUIDO (lo genera el workflow;
                               no se edita a mano — ver sección 3, Opción B)
.github/workflows/          → la automatización de GitHub Actions
```

No hace falta tocar nada de `build/`, `dist/` ni de `.github/` para el
uso normal — solo `data/indice_general.xlsx` (y, si quieres cambiar
textos, algunas páginas de `site/`, ver más abajo).

### ¿Y la versión portable para pendrive (sin internet)?

Hay un workflow aparte, `.github/workflows/portable-release.yml`, que
**no se ejecuta solo**: hay que lanzarlo a mano desde la pestaña
"Actions" → "Publicar versión portable (pendrive)" → botón "Run
workflow". Genera un ZIP descargable (como "Release" del repositorio)
con la web ya construida más un pequeño servidor local, listo para
llevar en un pendrive y usar en un ordenador sin internet. Se separó
del workflow normal para no crear una Release nueva cada vez que
simplemente se actualiza el Excel — solo se lanza cuando de verdad se
quiere una versión portable nueva.

### ¿Qué columnas del Excel se publican y cuáles no?

Se publican: clave/referencia, título, subtítulo, autor, edición, lugar
y editorial, año, tema/subtema/especialidad, especificaciones, idioma,
páginas, ilustraciones, tamaño, serie, ISBN, y si está digitalizado (con
su enlace, si lo tiene).

**Nunca** se publican: el estado de gestión (vigente/histórico), las
observaciones internas, quién donó el libro, las medidas físicas
detalladas ni la signatura final de ubicación en el Archivo. Esto está
protegido por partida doble: el script solo copia los campos de la
lista blanca, y además hace una comprobación final que aborta la
publicación si detectase cualquiera de esos datos internos en la salida
pública. Si algún día quieres cambiar qué se publica, la lista está en
`build/config.py` (campo `PUBLIC_FIELDS`), pero para eso sí conviene
pedir ayuda a alguien con conocimientos de Python.

### ¿Y si quiero cambiar el texto de la página de inicio o el horario?

El texto de la portada (horario, dirección, textos de bienvenida) está
en `site/index.html`, y su traducción al inglés en
`site/js/i18n.js`. Se puede editar directamente desde la web de GitHub
igual que el Excel (botón de lápiz), sin necesidad de programar — solo
hay que tener cuidado de no borrar por accidente ninguna etiqueta HTML
(el texto que quieras cambiar está siempre entre `>` y `<`).

**Importante**: si editas algo dentro de `site/`, recuerda que esos
cambios no se ven en la web publicada hasta que el workflow los
"compila" a `dist/`. Basta con hacer el commit y esperar 1-3 minutos —
el workflow se dispara solo también cuando cambia algo en `site/`.

### ¿Y los eventos?

`site/eventos.html` está pensado para editarse directamente desde la
web de GitHub, sin programar: cada evento es un bloque que puedes
copiar y pegar, con instrucciones paso a paso escritas como comentario
al principio del propio fichero. Cada evento se escribe en español e
inglés a la vez (dentro de `<span class="lang-es">` y
`<span class="lang-en">`), y la web muestra automáticamente el que
corresponda según el idioma de cada visitante.

CÓMO AÑADIR UN EVENTO NUEVO (sin necesidad de programar):

      1. Busca, más abajo, el bloque de ejemplo <div class="fio-event-card">
         que está comentado (entre <!-- y -->) y cópialo.
      2. Pégalo justo antes del comentario "EVENTOS FUTUROS: añade aquí arriba",
         FUERA del comentario (para que se vea en la web).
      3. Cambia el día y el mes en <div class="day"> y <div class="month">.
      4. Cambia el título y la descripción. Escribe el texto DOS veces:
         una vez dentro de <span class="lang-es">...</span> (español) y
         otra dentro de <span class="lang-en">...</span> (inglés). La web
         muestra automáticamente el que corresponda según el idioma
         elegido por cada visitante — no borres ninguno de los dos.
      5. Borra (o comenta) el párrafo "No hay eventos programados..." que
         hay justo debajo, para que no aparezca a la vez que tu evento.
      6. Cuando el evento ya haya pasado, simplemente añade la clase
         "is-past" al <div class="fio-event-card ..."> (hay un segundo
         ejemplo, ya con esa clase, dentro del mismo bloque comentado).

---

## 5. Todas las páginas de la web

- **Inicio** (`index.html`) — presentación, estadísticas rápidas,
  información institucional (dirección, horario, condiciones de
  préstamo). Editable como se explica arriba.
- **Catálogo** (`catalogo.html`) — listado completo con filtros por
  autor, tema, año y "solo digitalizados".
- **Buscar** (`buscar.html`) — búsqueda avanzada multicampo (título,
  autor, referencia, tema, subtema, editorial, idioma, serie, ISBN,
  rango de años) con tolerancia a erratas, resultados instantáneos, y
  un prompt listo para copiar/pegar en tu asistente de IA favorito.
- **Ficha de libro** (`libro.html?id=123`) — todos los datos de un
  libro concreto, con libros relacionados (mismo tema o autor).
- **Escanear** (`escanear.html`) — busca un libro apuntando la cámara
  del móvil al código de barras (ISBN) o a la etiqueta blanca de
  referencia interna ("LB0123"). Detalles técnicos y limitaciones de
  navegador en la sección 7.
- **Estadísticas** (`estadisticas.html`) — libros por tema, idioma,
  década de publicación, y porcentaje de digitalización.
- **Eventos** (`eventos.html`) — charlas y actividades, editable a
  mano como se explica arriba.

Todas las páginas están disponibles en español e inglés: el idioma se
detecta automáticamente según el navegador de cada visitante, y se
puede cambiar a mano con el desplegable de la cabecera (la elección se
recuerda para la próxima visita).

---

## 6. ¿Qué formatos genera el catálogo?

- **La web pública** (todas las páginas de la sección 5).
- **MARC21** (`catalogo.mrc`) y **MARCXML** (`catalogo_marcxml.xml`):
  descargables desde el pie de página, para quien quiera importar el
  catálogo en otro sistema bibliotecario compatible con MARC21.

---

## 7. El escáner: cómo funciona y sus límites

`escanear.html` funciona enteramente en el navegador del visitante —
no manda ninguna foto a ningún servidor. Tiene dos modos:

- **Código de barras**: usa una función que ya traen algunos
  navegadores (Chrome/Edge en Android, principalmente) para leer
  códigos de barras con la cámara y compararlos con el ISBN de cada
  libro. **No está disponible en Safari (iPhone/iPad) ni en Firefox de
  escritorio** — en esos casos, el propio sitio avisa y ofrece la
  búsqueda manual como alternativa.
- **Etiqueta de referencia** ("LB0123"): usa reconocimiento de texto
  (OCR) sobre la imagen de la cámara o una foto subida a mano, y busca
  el patrón "LB" + número. Es más lento que el código de barras (tarda
  1-2 segundos por intento) y necesita conexión a internet la primera
  vez que se usa en cada visita (descarga el motor de OCR, unos 2 MB).
  Funciona mejor con la etiqueta bien iluminada, enfocada y ocupando
  buena parte del encuadre.

En ambos modos, si la cámara falla o el navegador no es compatible,
siempre queda disponible el cuadro de "escribir la referencia a mano"
como alternativa que funciona en cualquier dispositivo.

---

## 8. Si algo no funciona

- **El workflow falla con un mensaje sobre "campo interno" o "fuga
  detectada"**: significa que la salvaguarda ha hecho justo su trabajo:
  ha detectado que algún dato que no debería publicarse se iba a
  publicar, y ha parado el proceso a tiempo. Revisa el mensaje de error
  en la pestaña "Actions" — indica qué libro y qué campo.
- **El workflow falla con "no se encuentra el Excel"**: comprueba que
  el fichero sigue llamándose exactamente `indice_general.xlsx` y sigue
  estando en la carpeta `data/`.
- **La web se ve pero no aparecen libros nuevos**: comprueba en la
  pestaña "Actions" que el último workflow ha terminado en verde; si
  aún está en amarillo (en marcha), espera un par de minutos y recarga
  la página con Ctrl+F5 (o Cmd+Shift+R en Mac) para forzar que el
  navegador no use una copia antigua guardada en caché.
- **Cloudflare Pages no se actualiza aunque GitHub Actions ya haya
  terminado**: comprueba en la pestaña "Deployments" del proyecto en
  Cloudflare que se ha detectado el commit de `dist/`. Si Cloudflare
  sigue sin reaccionar, revisa en su panel que el repositorio conectado
  y la rama (`main`) son los correctos.

Para cualquier duda técnica sobre el propio script o el workflow,
contacta con quien mantiene la parte técnica del proyecto (ver
`build/config.py` y `.github/workflows/build-and-deploy.yml`).

---

## 8. Licencia

Este repositorio es público para que cualquiera pueda consultarlo,
pero **no es de código abierto**: el uso del código fuente (todo lo
que no sea el sitio ya publicado en biblioteca.fio.es) está reservado
a la Fundación Infante de Orleans y a sus voluntarios autorizados. El
contenido servido en **biblioteca.fio.es** sí puede consultarse y
redistribuirse libremente, siempre sin fines comerciales y siempre que
se obtenga de ese dominio y no por otra vía. Condiciones completas en
[`LICENSE.md`](./LICENSE.md).
