---
title: "Subir archivos Markdown locales y convertirlos a PDF en el navegador"
description: "Cómo subir y convertir archivos .md locales a PDF sin enviarlos a un servidor: arrastrar y soltar, límites de tamaño, codificación y procesamiento."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Upload","PDF","Security"]
locale: "es"
translationKey: "markdown-file-upload-to-pdf"
---

Subir un archivo Markdown local no debería exigir el envío de documentación confidencial a un servidor externo. La mayoría de los convertidores de PDF en línea le piden que suba sus archivos a su backend, donde su texto se procesa, almacena y potencialmente se retiene.

md2pdf utiliza la API nativa `FileReader` del navegador. Cuando selecciona un archivo `.md` local o lo arrastra a la interfaz, el contenido se lee directamente en la memoria del navegador. Nada sale de su dispositivo, lo que lo hace seguro para especificaciones confidenciales, propuestas de clientes y notas internas.

Esta guía explica los formatos de archivo compatibles, los límites de tamaño, las expectativas de codificación de caracteres y cómo solucionar problemas de subida. Si prefiere pegar texto directamente, consulte [Pegar y editar Markdown para generar PDF rápidamente](/es/blog/markdown-editor-paste-pdf/).

## How local file uploads work in md2pdf

El proceso de subida en md2pdf se ejecuta estrictamente en el cliente. La selección de archivos activa un evento `change` en el navegador que procesa el flujo de archivos localmente:

```javascript
const reader = new FileReader();
reader.onload = (e) => {
  const markdownText = e.target.result;
  renderMarkdownToPreview(markdownText);
};
reader.readAsText(file, 'UTF-8');
```

El texto analizado puebla de inmediato el panel de edición y se procesa en la vista previa interactiva. Dado que no se envía ninguna solicitud HTTP POST a ningún extremo de API, la conversión funciona sin problemas incluso cuando su equipo está desconectado de Internet.

## Supported file types and extension rules

md2pdf reconoce las extensiones de Markdown de texto plano más comunes:

- `.md` — Formato estándar de Markdown.
- `.markdown` — Extensión explícita de Markdown.
- `.txt` — Archivos de texto sin formato con sintaxis de Markdown.

Se rechazan los archivos con formatos binarios (como `.docx`, `.rtf` o `.pdf` precompilados). Si tiene documentación en formato HTML o Word, conviértala a Markdown estándar antes de abrirla en md2pdf.

## Client-side size limits and encoding

Para mantener la respuesta del navegador ágil, md2pdf aplica límites de procesamiento razonables:

- **Tamaño máximo por archivo**: 2 MB de texto plano en formato UTF-8.
- **Codificación de caracteres**: UTF-8 sin BOM (Byte Order Mark).
- **Finales de línea**: Normaliza automáticamente tanto CRLF (`\r\n`) como LF (`\n`).

Un archivo Markdown de 2 MB contiene aproximadamente 300.000 palabras, mucho más que la mayoría de los manuales técnicos. Si un archivo supera los 2 MB, la interfaz muestra un aviso recomendando dividir el documento o utilizar el [Creador de libros Markdown multiarchivo](/es/blog/multi-file-markdown-book/).

## Step-by-step: Uploading and printing a local Markdown file

Siga estos pasos para convertir un documento local en un PDF impecable:

1. Abra la página principal de md2pdf y localice la barra de herramientas del conversor.
2. Haga clic en **Subir Markdown** o arrastre y suelte su archivo `.md` directamente sobre el editor.
3. Verifique que el contenido aparezca en el editor y se procese en la ventana de vista previa.
4. Elija su tema de impresión favorito: Clean, Business, Academic o Dark.
5. Active el **Índice de contenidos** si su documento contiene tres o más encabezados.
6. Haga clic en **Imprimir / Guardar como PDF** para abrir el cuadro de diálogo de impresión.
7. Seleccione **Guardar como PDF** como destino, compruebe los márgenes y guarde.

Para conocer la configuración detallada del cuadro de diálogo de impresión, consulte [Dominar los ajustes de impresión del navegador para PDF](/es/blog/browser-print-markdown-pdf/).

## Handling missing relative assets in local files

Al cargar un solo archivo Markdown local, el navegador no puede acceder a los enlaces relativos a imágenes locales (como `![Arquitectura](./images/arch.png)`) debido a las restricciones de seguridad del sistema de archivos.

Para asegurarse de que las imágenes se muestren en su PDF:

- Aloje las imágenes en un servidor HTTPS seguro o en un repositorio y use direcciones web absolutas.
- Utilice URI de datos en Base64 directamente en su Markdown para imágenes integradas.
- Si sus imágenes residen en un repositorio de GitHub, utilice el [Importador de README de GitHub](/es/blog/github-readme-to-pdf/) en lugar de la subida local.

## Common upload errors and troubleshooting

- **Problemas de codificación**: Si los caracteres especiales aparecen como signos de interrogación, guarde nuevamente su archivo con codificación UTF-8 explícita.
- **Bloqueo con archivos pesados**: Los documentos con cadenas SVG gigantescas o tablas anidadas complejas pueden ralentizar la interfaz. Elimine SVG incrustados o divida capítulos.
- **Archivo no admitido**: Asegúrese de que la extensión sea `.md` o `.txt`. Los archivos binarios renombrados generarán un error en el analizador.

Suba sus documentos Markdown locales con total seguridad utilizando [md2pdf](/#converter) hoy mismo.
