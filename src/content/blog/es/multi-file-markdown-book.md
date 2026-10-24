---
title: "Crear un libro Markdown con varios archivos y exportarlo a PDF"
description: "Convierta la documentación de un repositorio en un libro ordenado con portada, tabla de contenido, impresión directa y descarga en ZIP."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Documentation", "Book", "PDF", "Workflow"]
locale: "es"
translationKey: "multi-file-markdown-book"
---

Un único README es una excelente puerta de entrada, pero resulta insuficiente para un manual completo. Cuando la documentación abarca instalación, configuración, operaciones y solución de problemas, un README kilométrico se convierte en un texto tedioso de consultar y muy difícil de paginar a mano.

md2pdf incluye un flujo de trabajo para libros de documentación pensado para esa estructura. Indique un repositorio público, elija los archivos Markdown deseados, organícelos en el orden adecuado, añada portada y tabla de contenido, e imprima el libro consolidado o descargue un archivo ZIP con un PDF por capítulo. Todo el procesamiento se realiza en el navegador sin subir archivos a ningún servidor.

Esta guía detalla el funcionamiento del editor de libros y cómo organizar su repositorio. Si solo necesita un documento individual, comience con [Cómo convertir un README de GitHub a PDF](/blog/github-readme-to-pdf/).

## Cuándo conviene un libro frente a un único README

Utilice la modalidad de libro cuando la documentación se divide naturalmente en capítulos independientes y el lector necesita desplazarse con agilidad entre ellos:

- **Documentación de producto** con secciones separadas de configuración, conceptos y referencia.
- **Manuales académicos** recopilados a partir de notas semanales o módulos.
- **Guías operativas (runbooks)** donde cada servicio posee su propio archivo.
- **Notas de lanzamiento** que aúnan registro de cambios, migración y novedades.

Un libro resulta innecesario para contenidos muy breves o documentos que cambian a cada minuto.

El flujo requiere que el origen sea un repositorio **público**. Los repositorios privados no son accesibles desde el navegador sin autenticación.

## Qué realiza el escáner del repositorio

Al introducir la URL de un repositorio, el explorador lee el árbol de Git mediante la API de GitHub y genera una estructura navegable con casillas de selección jerárquicas (tri-state).

El escáner incorpora límites definidos para garantizar el rendimiento:

- Hasta **30 archivos** por libro.
- Hasta **750 KB por archivo**.
- Hasta **6 MB** de Markdown en total.
- Tiempo de espera de **20 segundos** para la descarga de contenido.
- Un presupuesto máximo de **60 peticiones** a la API de GitHub.

```text
docs/
├── 00-introduction.md
├── 01-installation.md
├── 02-configuration.md
├── 03-operations.md
└── 04-troubleshooting.md
```

Una estructura de directorios recomendada:

Los prefijos numéricos no son obligatorios, pero aclaran la secuencia de lectura y simplifican el orden.

## Selección y ordenación de capítulos

Seleccione los archivos en el árbol y revise la lista de capítulos resultante. Las selecciones nuevas se añaden al final. Utilice los controles de subir, bajar o eliminar para fijar la secuencia deseada.

Pautas prácticas de ordenación:

1. **Seleccione conjuntos comedidos.** Aunque el límite es de 30 capítulos, un libro de 10 a 15 capítulos es mucho más fácil de revisar.
2. **Introducción primero.** Los conceptos generales y requisitos deben preceder a la instalación.
3. **Referencia al final.** Los apéndices y glosarios se ubican mejor al cierre.
4. **Evite duplicar el README.** Si incluye el README como capítulo, defina si es la introducción o un resumen.
5. **Omita archivos generados.** Excluya artefactos temporales que añadan ruido.

El orden fijado en el editor se refleja con exactitud en el PDF impreso y en las carpetas del archivo ZIP.

## Preparación de los archivos fuente

El renderizador trata cada archivo seleccionado como un capítulo independiente, insertando un título de capítulo a partir del nombre del archivo o su ruta.

Un archivo de capítulo puede comenzar con su propio encabezado:

```markdown
# Installation

This chapter assumes a supported Node.js version and a local clone.
```

Si cada archivo inicia con un H1, el libro compiled exhibe límites de capítulo nítidos. Si inician en H2, la estructura se mantiene, pero la jerarquía interna puede parecer menos profunda.

Verificaciones adicionales:

- **Enlaces relativos.** Los vínculos entre capítulos deben apuntar a archivos existentes en el repositorio.
- **Imágenes.** Las imágenes relativas se resuelven contra GitHub durante la descarga.
- **Tablas anchas.** Consulte [Tablas Markdown a PDF](/blog/markdown-tables-to-pdf/) para ajustar el ancho.
- **Encabezados repetidos.** Evite títulos idénticos en distintos capítulos para no confundir el índice.

## Creación de la portada y la tabla de contenido

El editor permite configurar título, subtítulo y texto de portada. Esto responde de inmediato a qué es el documento, para quién está concebido y qué versión describe.

La tabla de contenido se compila automáticamente a partir de los capítulos seleccionados y sus encabezados. Si la portada o los contenidos se modifican, el libro se marca como pendiente de recompilar para evitar discrepancias.

## Impresión y exportación del libro

Dispone de dos modalidades de exportación:

- **Imprimir libro completo.** Envía el conjunto maquetado (portada, sumario y capítulos) al diálogo de impresión del navegador.
- **Exportar ZIP.** Descarga un archivo ZIP que contiene un PDF individual por cada capítulo seleccionado, preservando nombres legibles y rutas seguras.

El ZIP se nombra como `md2pdf-{owner}-{repo}-{sha8}.zip` y garantiza nombres normalizados en Unicode.

## Límites, resolución de incidencias y recuperación

Si el escaneo falla por límites de API de GitHub, espere el restablecimiento de cuota o utilice enlaces directos a carpetas. Si una imagen no carga, se mostrará un aviso sin cancelar la exportación.

Para más detalles sobre temas de maquetación, consulte [Guía de temas de impresión](/blog/readme-pdf-print-themes/).
