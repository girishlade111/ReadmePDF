---
title: "Selección de carpetas de tres estados para compilar libros Markdown en PDF"
description: "Aprenda cómo los controles de tres estados y la selección por carpetas en md2pdf facilitan la compilación de documentación Markdown en libros PDF."
pubDate: 2026-03-24
tags: ["markdown","pdf","book","documentation"]
locale: "es"
translationKey: "markdown-folder-selection-book"
---

Al transformar documentación distribuida en múltiples carpetas en un libro PDF unificado, marcar o desmarcar decenas de archivos individuales a mano resulta ineficiente. Los usuarios necesitan activar o desactivar directorios completos con un solo clic sin perder el control granular sobre capítulos concretos. En [md2pdf](/#converter), las casillas de verificación de tres estados hacen que ensamblar manuales técnicos sea intuitivo y seguro.

Esta guía explica el funcionamiento de las casillas por directorio, el significado de los estados visuales y cómo compilar árboles Markdown en volúmenes PDF estructurados.

## Comprensión de los tres estados de las casillas de directorio

En la gestión de archivos jerárquicos, un modelo binario de marcado/desmarcado no puede representar selecciones parciales. md2pdf incorpora el modelo estándar de tres estados:

1. **Marcado (Todo seleccionado)**: Todos los archivos Markdown de la carpeta y sus subdirectorios están incluidos para la exportación.
2. **Indeterminado / Parcial (Selección mixta)**: Algunos archivos de la carpeta están marcados y otros han sido excluidos.
3. **Desmarcado (Ninguno seleccionado)**: Ningún archivo de este directorio o sus subcarpetas formará parte de la exportación.

```text
Tri-State Folder Hierarchy:
[-] docs/guides/             (Indeterminate: partially selected)
    [x] getting-started.md   (Selected)
    [ ] advanced-config.md   (Excluded)
[x] docs/api/                (Checked: all files selected)
    [x] endpoints.md         (Selected)
    [x] authentication.md    (Selected)
```

## Lógica de propagación en cascada

Al hacer clic en la casilla de una carpeta, el sistema propaga la acción automáticamente a través del árbol:

- **Propagación hacia abajo**: Al marcar una carpeta desmarcada, todos sus archivos y subcarpetas quedan marcados. Al pulsar sobre una carpeta marcada o indeterminada, todos sus descendientes se desmarcan de inmediato.
- **Propagación hacia arriba**: Al modificar un archivo secundario, se recalcula el estado de sus carpetas antecesoras hasta la raíz. Si se marcan todos los archivos hermanos, el directorio principal pasa automáticamente al estado marcado.
- **Información visual inmediata**: El indicador de guión señala al instante que una carpeta contiene selecciones parciales sin necesidad de desplegarla.

## Elaboración de manuales técnicos personalizados

Los controles de tres estados facilitan la composición de manuales especializados en cuestión de segundos:

- **Guías por módulo**: Seleccione únicamente las carpetas `api/` y `sdk/` para confeccionar un manual de desarrollo externo, excluyendo las guías internas de `admin/`.
- **Informes de auditoría**: Marque toda la carpeta de normativas, desactive borradores preliminares y genere un PDF oficial listo para revisión.
- **Manuales de incorporación**: Una el `README.md` principal con una selección de tutoriales introductorios de `tutorials/getting-started/`.

## Mantenimiento de la jerarquía durante la compilación a PDF

Al compilar las carpetas seleccionadas en un libro PDF, md2pdf conserva la coherencia lógica en la maquetación final:

- **Índice anidado**: Las carpetas actúan como secciones principales y los archivos Markdown individuales se convierten en capítulos correlativos.
- **Numeración continua**: El PDF resultante incluye números de página secuenciales a lo largo de todo el documento.
- **Saltos de sección limpios**: Se insertan saltos de página entre archivos para asegurar un acabado editorial impecable.

## Exportación de su libro a PDF

Una vez definida la selección de carpetas, pulse el botón de compilación. Su selección personalizada se procesará en un libro PDF de máxima calidad tipográfica y enlaces internos navegables.
