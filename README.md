![Logo de la Fundación Infante de Orleans](./site/assets/img/logo.png)

[![Generar y publicar catálogo](https://github.com/isaaker/biblioteca-fio/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/isaaker/biblioteca-fio/actions/workflows/build-and-deploy.yml)
[![Mozilla Observatory](https://img.shields.io/mozilla-observatory/grade/biblioteca.fio.es?label=Mozilla%20Observatory)](https://observatory.mozilla.org/analyze/biblioteca.fio.es)

# Catálogo de la Biblioteca — Fundación Infante de Orleans

Este repositorio contiene el código fuente del catálogo público de la
Biblioteca de la [Fundación Infante de Orleans](https://fio.es) (FIO),
publicado en **[biblioteca.fio.es](https://biblioteca.fio.es)**.

Es un catálogo bibliográfico de consulta, centrado en aviación e
historia aeronáutica española, mantenido por voluntarios de la
Fundación. Está disponible en español e inglés.

## Estado actual

Este sitio se está terminando de preparar. El Excel maestro con el
inventario real del fondo bibliográfico se gestiona de forma separada
y no forma parte de este repositorio público.

## Licencia

Este repositorio es público para que pueda consultarse, pero **no es
de código abierto**: el uso del código fuente está reservado a la
Fundación Infante de Orleans y a sus voluntarios autorizados. El
contenido publicado en **biblioteca.fio.es** puede consultarse y
compartirse libremente, sin fines comerciales y siempre que se obtenga
de ese dominio. Condiciones completas en [`LICENSE.md`](./LICENSE.md).

## Contacto

Para cualquier consulta sobre la biblioteca o su catálogo, contacta a
través de [biblioteca.fio.es](https://biblioteca.fio.es) o de
[fio.es](https://fio.es). Para reportar un problema de seguridad, ver
[`SECURITY.md`](./SECURITY.md).

## Blog

Las entradas del blog se escriben en Markdown en `data/blog/`.
Cada fichero comienza con metadatos `title`, `date` (formato `AAAA-MM-DD`)
y `category` (`noticias` o `resenas`), delimitados por `---`. El campo
`slug` es opcional; si no se indica, se usa el nombre del fichero. Para
enlazar una entrada a una ficha del catálogo, añade una línea
`OBRA_DESTACADA:LB0808` al cuerpo. El build valida la referencia y crea
un banner con enlace a la ficha.

Ejemplo de entrada:

```markdown
---
title: Una reseña de ejemplo
date: 2026-10-30
category: resenas
---

Texto de la reseña.

OBRA_DESTACADA:LB0808
```

El blog genera páginas por entrada y categoría, un RSS general y feeds
para cada categoría. La obra del mes rota automáticamente por los IDs del
catálogo; para fijarla manualmente, cambia `book_of_month` en
`data/blog/config.json` por una referencia del catálogo. Déjalo en
`null` para volver a la rotación automática. El build programado del
primer día de cada mes actualiza la selección automática. Ejecuta el
build habitual para publicar las entradas y aplicar los cambios.

---

Creado con ❤️ por Carlos Chevallier e Isaac Hernán, voluntarios de la
Fundación Infante de Orleans.
