---
title: "Inspeccionar Markdown en tiempo real con vista previa interactiva de PDF"
description: "Cómo la vista previa de md2pdf renderiza Markdown estilo GitHub, desinfecta HTML, aísla estilos de impresión y refleja cambios al instante."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Preview","HTML","Security"]
locale: "es"
translationKey: "live-markdown-preview-pdf"
---

Exportar un archivo PDF a ciegas es una pérdida constante de tiempo. Modifica una columna de una tabla, pulsa exportar, espera a que termine el proceso, abre el visor externo y comprueba con frustración que un encabezado ha quedado aislado al final de la página tres. Repetir ese ciclo para cada párrafo retrasa cualquier entrega.

md2pdf resuelve este problema mediante un panel de vista previa interactivo a doble columna. Conforme escribe, pega o importa contenido, la ventana de previsualización procesa el resultado aplicando de inmediato las hojas de estilo de impresión. Lo que inspecciona en pantalla coincide fielmente con las proporciones, fuentes y márgenes del PDF final.

Esta guía examina cómo opera el motor de vista previa, cómo DOMPurify neutraliza posibles riesgos de seguridad y cómo verificar la preparación del documento antes de imprimir. Para técnicas de redacción rápida, consulte [Pegar y editar Markdown para generar PDF](/es/blog/markdown-editor-paste-pdf/).

## Why live preview matters for print-bound documents

Los navegadores web y los motores de impresión PDF interpretan las reglas de diseño CSS bajo criterios distintos. Una ventana de navegador fluye de forma continua, pero un documento impreso tiene límites físicos estrictos:

- **Restricciones de salto de página**: Las tablas, imágenes y bloques de código deben respetar la altura de cada hoja.
- **Fidelidad tipográfica**: La escala jerárquica debe conservar una legibilidad impecable a resoluciones de impresión de 300 ppp.
- **Límites de márgenes**: Los elementos que superan los márgenes se recortan en papel en lugar de habilitar barras de desplazamiento.

Disponer de una vista previa en vivo que simule el diseño impreso permite corregir desajustes visuales antes de abrir el diálogo de impresión del sistema.

## How the client-side preview pipeline renders Markdown

El proceso de renderizado en md2pdf transforma la sintaxis Markdown en nodos DOM listos para imprimir en pocos milisegundos:

```javascript
const rawHtml = markdownParser.render(markdownSource);
const cleanHtml = DOMPurify.sanitize(rawHtml, sanitizeConfig);
previewElement.innerHTML = cleanHtml;
applyHeadingAnchors(previewElement);
```

El analizador sigue al pie de la letra las especificaciones CommonMark y GitHub-Flavored Markdown, admitiendo tachados, enlaces automáticos, listas de tareas anidadas y bloques de código con sintaxis resaltada.

## HTML sanitization and safety filters

Al pegar código Markdown de fuentes desconocidas o repositorios públicos de GitHub, la seguridad es un factor crítico. Dado que Markdown permite etiquetas HTML sin procesar, podrían colarse vectores de ataque XSS.

md2pdf somete cada cadena generada al filtro de DOMPurify bajo reglas estrictas:

- **Etiquetas eliminadas**: Se bloquean y eliminan `<script>`, `<iframe>`, `<object>` y `<form>`.
- **Limpieza de atributos**: Se suprimen `onclick`, `onload` y cualquier controlador de eventos JavaScript.
- **Control de protocolos**: Se rechazan enlaces con esquemas `javascript:` o `data:text/html`.
- **Marcado autorizado**: Solo se conservan etiquetas de formato seguro (como `<b>`, `<code>`, `<table>`, `<img>`) con atributos verificados.

Toda esta desinfección ocurre en su navegador antes de insertar los elementos en el documento de vista previa.

## Previewing print themes and theme transitions

md2pdf ofrece cuatro temas de impresión: Clean, Business, Academic y Dark. Al cambiar de tema en la barra superior, las clases CSS de la vista previa se actualizan al instante:

- **Clean**: Tipografía moderna y equilibrada con fuentes de sistema sin remates.
- **Business**: Estructura técnica corporativa con bordes discretos y encabezados delimitados.
- **Academic**: Tipografía formal con serifa, numeración clara y espaciado compacto.
- **Dark**: Modo oscuro de alto contraste que se transforma automáticamente en un diseño claro apto para tinta al imprimir.

Para conocer en detalle la tipografía de cada estilo, consulte la [Guía de temas de impresión de md2pdf](/es/blog/readme-pdf-print-themes/).

## Differences between screen preview and print output

Aunque la vista previa imita con gran fidelidad la salida en papel, existen pequeñas particularidades entre su monitor y las hojas físicas:

- **Ancho del visor**: La vista previa se adapta al tamaño de la ventana de su navegador, mientras que la impresión se ajusta a tamaños estandarizados (A4, Carta, Oficio).
- **Cortes de página**: La pantalla muestra un flujo vertical continuo, mientras que el motor de impresión divide el texto aplicando la regla CSS `break-inside: avoid`.
- **Calibración de color**: Los tonos RGB de la pantalla pueden mostrarse sutilmente más oscuros al plasmarse en tóner o tinta física.

## Diagnosing preview rendering glitches

- **La vista previa no responde**: Compruebe si existen etiquetas HTML sin cerrar o cadenas URI de datos gigantescas que demoren la renderización.
- **Tablas que desbordan el margen**: Si una tabla muy ancha excede el ancho visual, consulte [Tablas Markdown en PDF](/es/blog/markdown-tables-to-pdf/) para aplicar estrategias de ajuste.
- **Imágenes no visibles**: Asegúrese de que las URL apunten a servidores HTTPS accesibles o use el [Importador de README de GitHub](/es/blog/github-readme-to-pdf/) para resolver rutas relativas.

Inspeccione sus documentos en tiempo real y expórtelos con total seguridad en [md2pdf](/#converter).
