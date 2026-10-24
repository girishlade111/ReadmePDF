---
title: "Bloques de código Markdown en PDF: delimitadores, líneas y saltos"
description: "Cómo escribir bloques de código delimitados legibles en PDF: etiquetas de lenguaje, ancho de línea, saltos manuales, temas y revisión previa a la impresión."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Code", "PDF", "Layout"]
locale: "es"
translationKey: "markdown-code-blocks-to-pdf"
---

El código es donde un documento Markdown suele verse bien en pantalla pero se desmorona en papel. Una línea que cabe en un monitor ancho puede rebasar el margen derecho de una página A4. Un bloque delimitado puede quedar al final de una página con dos líneas en un lado y el resto en el siguiente.

md2pdf renderiza código delimitado como texto preformateado dentro del diseño de impresión. No añade resaltado de sintaxis ni ajusta el código fuente automáticamente para forzarlo a la página, ya que alterar el código puede cambiar su significado. El enfoque práctico es preparar el código fuente para que se lea limpiamente sin transformaciones.

Esta guía cubre bloques delimitados, etiquetas de lenguaje, longitud de línea, temas y comprobaciones antes de exportar el PDF. Para el flujo de trabajo completo, consulte [Cómo convertir un README de GitHub a PDF](/blog/github-readme-to-pdf/).

## Qué hace el convertidor con un bloque delimitado

GitHub Flavored Markdown admite bloques de código delimitados por tres o más comillas invertidas o virgulillas. md2pdf analiza esos delimitadores, conserva el texto exacto y lo procesa dentro de un elemento `<pre><code>`. La etiqueta de lenguaje se conserva como clase, pero el renderizador no aplica temas de resaltado con colores.

Esto implica dos aspectos importantes:

- Se conservan la sangría, las líneas en blanco y la puntuación exactamente como se escribieron.
- El resultado visual es texto monoespaciado con el fondo y borde del tema seleccionado, sin colores sintácticos.

Si un documento depende del color para explicar una diferencia (diff), añada una descripción breve o utilice marcadores `+` y `-`. No asuma que el lector distinguirá colores en una copia impresa.

## Use bloques delimitados, no sangría

La sangría de cuatro espacios también genera bloques de código en Markdown, pero los delimitadores son mucho más fáciles de controlar. Definen el inicio y el final explícitamente, admiten etiqueta de lenguaje y no se rompen si una línea interna lleva sangría.

Un bloque delimitado simple:

```bash
npm install
npm run build
npm test
```

Utilice un delimitador más largo que cualquier secuencia de comillas invertidas dentro del código. Si el fragmento incluye tres comillas invertidas, abra y cierre con cuatro. Esto es crucial en documentación sobre Markdown.

Evite mezclar tabulaciones y espacios en el bloque. El renderizador respeta exactamente lo escrito, y una sangría desigual parecerá un error.

## Indique el lenguaje incluso sin resaltado

La etiqueta de lenguaje resulta útil aunque no haya colores sintácticos. Documenta el lenguaje previsto, asiste a editores y herramientas de análisis, y ofrece una señal clara a los traductores de que el contenido no debe traducirse. También facilita las búsquedas.

Las etiquetas habituales son `bash`, `js`, `ts`, `json`, `yaml`, `python`, `html`, `css`, `sql` y `text`. Utilice `text` para salidas de consola, registros, árboles de directorios y contenido sin sintaxis formal.

No asigne una etiqueta solo porque una herramienta la reconozca. Etiquete lo que el contenido realmente representa.

## Mantenga las líneas dentro del ancho imprimible

El fallo más habitual al imprimir es una línea de código más ancha que la página. En el navegador el bloque puede desplazarse horizontalmente, pero en papel no hay barras de desplazamiento, por lo que la línea se corta o el bloque se reduce.

Un objetivo práctico para páginas A4 o Letter suele ser de 80 a 90 caracteres por línea. Mantiene el texto monoespaciado cómodo de leer.

Cuando una línea sea excesivamente larga, modifique el código fuente en lugar de la escala de impresión:

```js
const message = buildMessage({ owner, repo, branch, path });
```

Esa línea resulta legible. Si tuviera más propiedades, distribúyalas en varias líneas:

```js
const message = buildMessage({
  owner,
  repo,
  branch,
  path,
});
```

Para comandos de shell use barras invertidas de continuación o variables. Para URLs extensas colóquelas en su propia línea. El objetivo es evitar líneas dependientes del desplazamiento horizontal.

## Decida cómo gestionar salidas y registros

Los registros y las salidas de consola suelen ser más anchos que el código fuente y contienen marcas de tiempo o rutas que no deben cortarse arbitrariamente.

Opciones recomendadas en impresión:

- **Recorte la salida.** Muestre las líneas relevantes y use puntos suspensivos en el texto explicativo.
- **Divida la transcripción.** Coloque el comando en un bloque y la salida en otro, con una frase intermedia.
- **Use tablas para datos tabulares.** Si la salida contiene filas y columnas, una tabla puede imprimirse mejor.
- **Reduzca el tamaño de fuente solo como último recurso.** Los cambios de tema afectan a todo el documento.

No pegue un registro de 200 líneas en un PDF a menos que el registro sea el documento completo.

## Adapte el tratamiento del código al tema

Los cuatro temas de impresión tratan el código de forma distinta. Clean utiliza fondo claro y tipografía neutra. Business emplea bloques más oscuros que contrastan con su cuerpo serif. Academic mantiene el código ligero. Dark es un tema pensado para pantalla cuya hoja de estilo de impresión fuerza tinta clara y fondo legible.

Dos recomendaciones prácticas:

1. **Verifique el contraste en el tema activo.** Un bloque que funciona en Clean puede resultar pesado en Business o tenue en Academic.
2. **Active los gráficos de fondo al imprimir.** Sin ellos, el fondo del código desaparece y el bloque depende de su borde.

Si el documento consta principalmente de código, Clean suele ser la opción más segura. Para más información, consulte [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/).

## Revise la página impresa

Abra el PDF generado e inspeccione cada bloque de código, no solo el primero. Preste atención a:

- **Líneas cortadas.** Compruebe el margen derecho para asegurarse de que ninguna instrucción queda truncada.
- **Bloques huérfanos.** Evite que un bloque comience con una sola línea al final de una página.
- **Sangría irregular.** Verifique la coherencia entre espacios y tabuladores.
- **Líneas en blanco perdidas.** Asegúrese de que las separaciones lógicas se mantienen.
- **Contraste legible.** Imprima en escala de grises si el documento va a fotocopiarse.
- **Etiquetas de lenguaje en descripciones.** Si el lenguaje es relevante para el lector, menciónelo en el texto.

Una verificación en otro navegador resulta útil para distribuciones amplias.

Los bloques de código son la parte del documento con mayor probabilidad de reutilización. Manténgalos claros, concisos y dentro de la página. Para más detalles sobre el procesamiento local, consulte [Markdown a PDF en el navegador](/blog/browser-only-markdown-to-pdf/).
