---
title: "Dominar los ajustes de impresión del navegador para PDF impecables"
description: "Guía exhaustiva de configuración de impresión en el navegador para Markdown: márgenes, tamaños de hoja, gráficos de fondo y encabezados."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Print","Browser","CSS","PDF"]
locale: "es"
translationKey: "browser-print-markdown-pdf"
---

Un documento Markdown perfectamente renderizado en su navegador puede salir del proceso de impresión con un aspecto deficiente si el cuadro de diálogo del navegador no está bien configurado. Fechas no deseadas en el margen, bloques de código partidos, fondos omitidos o márgenes desajustados rara vez se deben al Markdown en sí; provienen de los ajustes predeterminados del navegador, pensados para páginas web generales y no para publicaciones formales.

md2pdf combina consultas de medios CSS (`@media print`) con el motor de impresión nativo de su navegador. Al pulsar el botón de imprimir, el navegador aplica nuestras hojas de estilo, oculta la barra de navegación, aísla el contenido y organiza las páginas. No obstante, el control final sobre los márgenes, el tamaño del papel y los fondos de color sigue estando en sus manos dentro del diálogo de impresión.

Esta guía enseña a configurar las opciones de impresión en Chrome, Firefox, Safari y Edge para obtener la máxima fidelidad. Para ajustar los estilos visuales previamente, consulte la [Guía de temas de impresión de md2pdf](/es/blog/readme-pdf-print-themes/).

## Why browser print dialogs require careful configuration

La impresión habitual del navegador asume que desea una captura simple de una página web, estampando de forma automática la fecha, el título y la URL en los bordes. En una especificación técnica o una propuesta comercial, estos detalles deslucen el resultado.

Además, los navegadores desactivan por defecto los fondos de color para economizar tinta. En un documento técnico, desactivar los gráficos de fondo elimina el sombreado de los bloques de código, el contraste de los encabezados de tabla y los cuadros de notas, perjudicando gravemente la legibilidad.

Aprender a activar y desactivar estas opciones transforma una impresión web descuidada en un documento PDF de calidad profesional.

## Essential print settings: Paper size, margins, and scaling

Al abrirse el panel de impresión de su sistema, revise estas opciones fundamentales:

- **Destino**: Seleccione **Guardar como PDF** (o Microsoft Print to PDF).
- **Tamaño de papel**: Elija **A4** (estándar internacional) o **Carta** (estándar norteamericano) según su destinatario.
- **Orientación**: Conserve **Vertical** para texto regular. Emplee **Horizontal** únicamente en documentos con tablas de datos muy anchas.
- **Márgenes**: Elija **Predeterminado** o **Ninguno**. Como md2pdf ya incluye márgenes internos precisos por CSS, aplicar márgenes mínimos puede acercar el texto peligrosamente al filo de la hoja.
- **Escala**: Mantenga el valor al **100%** (Predeterminado). Evite reducirlo por debajo del 90% para no mermar la claridad tipográfica.

## Enabling background graphics for theme fidelity

La casilla más importante de la ventana de impresión es **Gráficos de fondo**:

```text
[x] Background graphics (Chrome, Edge, Opera)
[x] Print Backgrounds (Firefox)
[x] Print backgrounds (Safari)
```

Al marcar esta opción:

- Los fondos y resaltados sintácticos de los bloques de código se imprimen con total nitidez.
- Las franjas alternas y cabeceras de las tablas conservan su contraste visual.
- Los distintivos y recuadros de advertencia mantienen su jerarquía.
- Los acentos decorativos del tema elegido (como los filetes de Business o Academic) se respetan.

Si olvida esta casilla, todos los bloques de código se imprimirán sobre fondo blanco transparente, dificultando su diferenciación del texto general.

## Suppressing unwanted browser headers and footers

De forma predeterminada, los navegadores añaden sus propios datos marginales:

- Encabezado: Título de la pestaña y fecha del día.
- Pie de página: Dirección URL completa y número de hoja genérico (ej. "1/4").

En su ventana de impresión, desmarque **Encabezados y pies de página**:

```text
[ ] Headers and footers (Uncheck to remove browser URL and date)
```

Desmarcar esta casilla permite que la numeración propia de md2pdf se aplique limpiamente sin interferencias de fechas ni direcciones web externas.

## Page-break control across headings, tables, and code

md2pdf incorpora reglas CSS de salto de página automáticas para evitar divisiones incómodas:

```css
h1, h2, h3 { break-after: avoid; }
pre, table, figure { break-inside: avoid; }
```

- **Prevención de encabezados huérfanos**: Los títulos nunca quedarán aislados en la última línea de una hoja; saltarán automáticamente a la siguiente junto con su primer párrafo.
- **Integridad de bloques de código**: Se evita que los bloques se corten por la mitad, salvo que un único fragmento supere la altura de la página.
- **Filas de tablas**: Las filas de datos evitan partirse a mitad de frase entre dos hojas.

## Browser-specific printing quirks and fixes

- **Google Chrome y Edge**: Ofrecen la salida vectorial más consistente. Cerciórese de activar "Gráficos de fondo" y desactivar "Encabezados y pies de página".
- **Mozilla Firefox**: Puede aplicar márgenes sutilmente más ajustados. Seleccione márgenes "Predeterminados" si nota que el texto roza el borde.
- **Apple Safari**: Haga clic en "Mostrar detalles" para revelar la casilla "Imprimir fondos".

Ajuste las opciones de impresión y obtenga documentos intachables mediante [md2pdf](/#converter).
