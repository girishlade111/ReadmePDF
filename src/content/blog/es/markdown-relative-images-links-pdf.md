---
title: "Resolución de imágenes relativas y enlaces Markdown al convertir a PDF"
description: "Aprenda cómo md2pdf resuelve rutas de imágenes relativas y enlaces internos de Markdown para incrustar gráficos y crear saltos interactivos en PDF."
pubDate: 2026-03-24
tags: ["markdown","images","links","pdf"]
locale: "es"
translationKey: "markdown-relative-images-links-pdf"
---

Los archivos Markdown en repositorios de software dependen ampliamente de rutas relativas. Los diagramas se ubican en `./assets/diagram.png`, las capturas en `../images/screen.jpg` y los enlaces apuntan a `./getting-started.md`. Si un conversor no resuelve estas rutas dentro del contexto del proyecto, las imágenes no cargan y los enlaces se rompen. En [md2pdf](/#converter), las rutas relativas se resuelven e incrustan con total precisión.

Este artículo explica cómo md2pdf procesa rutas relativas, recupera imágenes en el navegador y transforma enlaces entre documentos en saltos internos dentro del PDF.

## El problema de las rutas relativas en Markdown

Los archivos Markdown están pensados para convivir con carpetas locales o en la interfaz web de GitHub:

- **Imágenes rotas**: Una referencia relativa como `![Arquitectura](images/arch.png)` falla si se procesa sin el contexto de la carpeta.
- **Enlaces inservibles**: Las llamadas a archivos vecinos (`[Instalación](setup.md)`) quedan inactivas al convertirse a PDF sin un motor de resolución.
- **Navegación entre carpetas superiores**: Las referencias con `../` exigen calcular la posición exacta en el árbol de archivos.

```text
Relative Path Resolution Matrix:
Base Document:  docs/guides/installation.md
Image Path:     ../assets/diagram.png
Resolved Asset: docs/assets/diagram.png (Fetched & Inlined)

Link Path:      ./configuration.md
Resolved Link:  Internal PDF Anchor -> Chapter: Configuration
```

## Recuperación de imágenes desde repositorios de GitHub

Al importar documentación desde GitHub, md2pdf registra la ruta de cada documento Markdown:

1. **Normalización de rutas**: Las rutas relativas como `../../images/flow.png` se calculan a partir del directorio del archivo analizado.
2. **Descarga en el cliente**: md2pdf formula la dirección correspondiente en la red de contenidos de GitHub para obtener la imagen.
3. **Conversión en memoria**: La imagen se descarga en la memoria del navegador, se transforma en búfer binario y se inserta en el PDF mediante `pdf-lib`.
4. **Compatibilidad gráfica**: Se procesan formatos habituales (PNG, JPEG, WebP, SVG) preservando la escala y proporciones originales.

## Transformación de enlaces en destinos internos de PDF

Las bibliotecas técnicas utilizan constantes referencias cruzadas entre sus secciones:

- **Detección de enlaces locales**: md2pdf examina enlaces dirigidos a ficheros `.md` y los compara con la lista de compilación activa.
- **Anclajes internos**: Si el archivo de destino forma parte del libro recopilatorio, md2pdf transforma el enlace en un salto interno del PDF.
- **Alternativa web**: Si el documento vinculado no fue seleccionado para el libro, el enlace se redirige a la vista web del repositorio en GitHub.

## Carga de archivos locales con imágenes vinculadas

Al trabajar con archivos Markdown locales, md2pdf admite la carga conjunta de documentos e imágenes:

Puede seleccionar en su explorador el archivo Markdown junto con su carpeta de imágenes. md2pdf empareja los nombres en memoria, logrando que los gráficos se visualicen correctamente sin necesidad de subirlos a ningún servidor web.

## Generación de PDFs con gráficos y enlaces fiables

Resolver adecuadamente imágenes y enlaces evita páginas vacías y referencias rotas. Al exportar con md2pdf, sus diagramas lucen con máxima nitidez y las referencias cruzadas permiten una navegación ágil en todo el documento.
