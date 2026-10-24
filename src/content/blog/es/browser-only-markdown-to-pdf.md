---
title: "Markdown a PDF en el navegador: qué permanece en su dispositivo"
description: "Cómo funciona la conversión local, qué peticiones realiza md2pdf y qué revisar antes de exportar Markdown confidencial o interno."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Privacy", "Browser", "PDF", "Security"]
locale: "es"
translationKey: "browser-only-markdown-to-pdf"
---

'Se ejecuta en su navegador' es una afirmación valiosa, pero no constituye una declaración de privacidad completa. Un navegador puede leer un archivo local sin subirlo y, al mismo tiempo, solicitar imágenes remotas en cuanto se genera la vista previa.

md2pdf es un sitio estático sin servidor de aplicaciones. El análisis de Markdown, la sanitización, la tabla de contenido, la vista previa y la maquetación se ejecutan en el dispositivo del visitante. Esto elimina el paso de subida a servidores externos, aunque no vuelve invisible el documento en la red. Esta guía define los límites con precisión.

Para el flujo de trabajo general, consulte [Cómo convertir un README de GitHub a PDF](/blog/github-readme-to-pdf/). Para libros con varios archivos, vea [Crear un libro Markdown con varios archivos](/blog/multi-file-markdown-book/).

## Qué significa exactamente 'solo en el navegador'

En md2pdf, 'solo en el navegador' significa que no existe un motor de renderizado en el servidor. El sitio consta de HTML, CSS y JavaScript estáticos. Al pegar texto, este reside en la memoria de la pestaña. Al subir un archivo, la API File del navegador lo lee localmente sin publicarlo en ningún extremo.

Esto no implica que la página funcione sin conexión. La carga inicial descarga los recursos del sitio y la importación de GitHub realiza peticiones anónimas a GitHub.

El compromiso es estricto y transparente: **su texto Markdown no se sube a LadeStack, y no existen cuentas de usuario ni bases de datos de documentos en el servidor.**

## El proceso paso a paso

Un documento atraviesa las siguientes etapas:

```text
source  ->  parse  ->  resolve  ->  render  ->  sanitize  ->  preview  ->  print
```

1. **Origen.** Se lee texto pegado, un archivo local o un README público de GitHub.
2. **Análisis.** markdown-it procesa sintaxis GFM: tablas, listas de tareas y código.
3. **Resolución.** En repositorios, las imágenes relativas apuntan a `raw.githubusercontent.com` y los enlaces a vistas blob.
4. **Renderizado.** Las estructuras analizadas se convierten en HTML.
5. **Sanitización.** DOMPurify suprime elementos peligrosos (`script`, `iframe`, `style`).
6. **Vista previa.** El HTML limpio se inserta con identificadores de sección y tabla de contenido opcional.
7. **Salida.** Se invoca la impresión nativa o se empaqueta en ZIP con pdf-lib.

Toda fase posterior a la lectura inicial ocurre localmente.

## Qué información sale del navegador

Para archivos locales o texto pegado, md2pdf no transmite el contenido del documento. La plataforma carece de endpoints receptores.

Existen peticiones de red normales en el uso cotidiano:

- **Recursos del sitio.** Descarga de HTML, CSS, fuentes y scripts del host.
- **Importación de GitHub.** Consultas anónimas a la API de GitHub para obtener el README y sus imágenes públicas.
- **Recursos remotos en su Markdown.** Si el documento incluye imágenes externas, el navegador las solicitará al generar la vista previa.

Si su archivo contiene `![dashboard](https://internal.example.test/chart.png)`, el texto es local pero la solicitud de imagen viaja hacia el servidor remoto.

Los enlaces simples solo se consultan al hacer clic. Los recursos multimedia incrustados se descargan durante el renderizado.

## Archivos locales y Markdown pegado

Los flujos de trabajo locales ofrecen las máximas garantías de privacidad:

- **Pegar texto.** El contenido no sale de la pestaña a menos que incluya imágenes externas.
- **Subir archivo.** Se procesa en memoria con un límite de 2 MB sin transmisiones de red.
- **Ejemplo.** El texto de prueba forma parte del paquete estático del sitio.

Las imágenes con rutas relativas locales no se resolverán en modo subida por carecer de repositorio base. Utilice URLs absolutas o acepte el indicador de imagen no disponible.

Para una exportación completamente aislada, elimine las imágenes remotas antes de imprimir.

## Las imágenes remotas y enlaces siguen siendo peticiones de red

El procesamiento en el navegador protege el **texto del documento**, pero no los **recursos a los que este apunta**.

Observe este ejemplo:

```markdown
![Architecture](./docs/architecture.png)

See the [operations guide](https://example.test/ops).
```

En una importación de GitHub la ruta se reescribe hacia el host de contenido sin procesar. En texto pegado, una URL absoluta se solicita a su servidor.

Antes de exportar material sensible, revise el documento en busca de:

- Enlaces de imagen `http://` y `https://`
- Etiquetas HTML `<img>`
- Hojas de estilo o fuentes vinculadas
- Imágenes codificadas en data URIs (no generan tráfico de red adicional)

DOMPurify elimina scripts e iframes, pero conserva imágenes legítimas por ser parte integral de la documentación.

## Límites de consulta a GitHub y tolerancia a fallos

La importación de GitHub lee contenido público sin autenticación ni tokens. Posee límites seguros:

- Tiempo de espera de **15 segundos** para llamadas a la API.
- Tiempo de espera de **20 segundos** para la descarga de capítulos.
- Presupuesto de **25 segundos** para el escaneo de directorios.
- En caso de límite de tasa en la API, recurre a descargas directas de contenido sin procesar.
- Las imágenes inaccesibles muestran un aviso sin abortar la generación del documento.

## Lista práctica de verificación de privacidad

Antes de convertir documentos internos o confidenciales, verifique:

- El documento no contiene URLs de imágenes que apunten a servidores internos protegidos.
- Las rutas relativas de imágenes corresponden a un repositorio público conocido.
- No se introducen tokens o claves privadas en el cuerpo del texto.
- Ha revisado la vista previa antes de iniciar el diálogo de impresión del sistema.
- Ha verificado que la exportación final no requiere servicios externos adicionales.

Para más detalles sobre los temas de presentación, consulte [Temas de impresión en md2pdf](/blog/readme-pdf-print-themes/).
