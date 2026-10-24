---
title: "Tabla de contenido Markdown para PDF: estructura limpia al imprimir"
description: "Cómo genera md2pdf la tabla de contenido, cuándo mantenerla y cómo organizar los encabezados para que el PDF resulte fácil de navegar y consultar."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Navigation", "PDF", "Layout"]
locale: "es"
translationKey: "markdown-table-of-contents-pdf"
---

Una tabla de contenido no es un elemento decorativo. En documentos que superan varias páginas, marca la diferencia entre un lector que localiza de inmediato la sección deseada y otro obligado a desplazarse por todo el archivo.

md2pdf genera tablas de contenido automáticas para documentos individuales y las compila para libros de múltiples capítulos. Ambas funciones están relacionadas pero poseen objetivos distintos. Esta guía explica su funcionamiento, la jerarquía adecuada de encabezados y cuándo conviene desactivarla.

Para el flujo de impresión general, consulte [Cómo convertir un README de GitHub a PDF](/blog/github-readme-to-pdf/). Para libros con varios archivos, vea [Crear un libro Markdown con varios archivos](/blog/multi-file-markdown-book/).

## Qué es en realidad la tabla de contenido

En la vista previa de un único documento, la tabla de contenido es un bloque de navegación HTML situado antes del cuerpo del Markdown. Enumera los encabezados mediante enlaces internos que funcionan en el navegador y que suelen mantenerse activos en el PDF según la configuración del motor de impresión del sistema.

No equivale a un panel lateral de marcadores de visor PDF. Los esquemas laterales dependen del motor de impresión del navegador. Si requiere marcadores garantizados, verifique el comportamiento de su visor habitual.

En el flujo de libro, el sumario se compila como una página formal del documento a partir de todos los capítulos seleccionados. El editor marca la compilación como desactualizada ante cualquier cambio de portada o títulos.

## Cómo la construye md2pdf

El sumario de un único documento se genera a partir de la estructura del Markdown analizado, siguiendo reglas directas:

- El documento debe contener al menos **tres encabezados**.
- Se incluyen encabezados desde **H1 hasta H4**.
- Los identificadores se normalizan sin duplicados para garantizar enlaces únicos.
- El interruptor en pantalla controla conjuntamente la vista previa y la salida impresa.

```markdown
# Project handbook

## Installation

### Requirements

## Configuration

### Environment variables

## Troubleshooting
```

Un esquema típico estructurado:

Al contar con seis encabezados, el sumario se crea automáticamente reflejando la jerarquía visual con sangrías proporcionales.

## Redacte encabezados que funcionen como entradas de índice

Un encabezado cumple dos funciones: anticipar el contenido de la sección y formar una línea legible en el índice. Un título ambiguo perjudica la navegación.

```text
Vague:  ## Overview
Useful: ## Configure GitHub access
Vague:  ## Errors
Useful: ## Recover from a failed export
```

Prefiera sustantivos y verbos precisos:

La versión descriptiva aclara qué encontrará el lector. Mantenga los títulos lo bastante breves para que no se desborden en varias líneas, y evite emplear encabezados para simples advertencias visuales (utilice negritas o citas).

## Comience las secciones principales en H2

El título general del documento debe ser el único H1. Las secciones mayores deben comenzar en H2, lo cual aporta tres ventajas clave:

1. **Un nivel superior nítido.** El H1 representa la obra y los H2 sus divisiones principales.
2. **Anidamiento natural.** H3 y H4 se subordinan de manera armónica.
3. **Escalado tipográfico uniforme.** Evita que la página parezca una unión desordenada de documentos aislados.

Si su fuente emplea H1 en cada capítulo, la modalidad de libro resulta más adecuada.

## Gestione títulos duplicados, anexos y documentos extensos

Aunque el generador añade sufijos a los enlaces para evitar colisiones técnicas, títulos repetidos confunden al lector. Diferéncielos en el código fuente añadiendo contexto o calificadores.

En textos muy extensos con profusión de H4, valore si cada subsección amerita figurar en el sumario. Si este ocupa más de una página, promueva las partes críticas a H2 o H3 y condense los detalles secundarios.

Para los apéndices, emplee rótulos identificables como `## Apéndice A: Límites de exportación` en lugar de una cifra solitaria.

## Decida cuándo conviene mantenerla

Conserve la tabla de contenido en guías técnicas, especificaciones y manuales de referencia. Desactívela en documentos breves de una o dos páginas, anuncios concisos o textos donde el índice ocupe más espacio que las propias secciones.

## Compruebe el sumario en el PDF generado

Tras guardar el PDF, revise que los enlaces internos salten a la sección correcta, que los textos no queden partidos y que la sangría jerárquica sea clara. Para más recomendaciones sobre código, consulte [Bloques de código Markdown en PDF](/blog/markdown-code-blocks-to-pdf/).
