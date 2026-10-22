---
title: "Cómo convertir un README de GitHub a PDF (gratis, sin registro)"
description: "Guía paso a paso para convertir un README público de GitHub en un PDF limpio y listo para imprimir con ReadmePDF: sin cuenta, sin subidas y sin renderizador en el servidor."
pubDate: 2026-09-18
updatedDate: 2026-10-21
author: "Girish Lade"
tags: ["GitHub", "README", "PDF", "Tutorial"]
featured: true
locale: "es"
translationKey: "github-readme-to-pdf"
---

Un README está escrito para un navegador: se desplaza, enlaza hacia fuera y da por hecho que quien lo lee puede hacer clic por el repositorio. En el momento en que necesitas enviar documentación a un cliente, adjuntarla a un trabajo, archivar una versión o entregársela a alguien que no va a clonar el repositorio, el PDF es el formato que viaja.

Imprimir directamente una página de GitHub suele producir un desastre. La navegación del sitio, las barras laterales y el pie de página se cuelan. Los bloques de código anchos se cortan. Las imágenes relativas se rompen porque el navegador ya no lee desde la raíz del repositorio. Las tablas largas se parten de forma torpe entre páginas. ReadmePDF existe para resolver esos problemas concretos sin pedirte que crees una cuenta ni que subas tu archivo fuente a un servidor.

Esta guía recorre el flujo completo, desde pegar la URL de un repositorio hasta revisar el PDF exportado, y explica qué hace la herramienta en cada paso.

## Por qué el botón Imprimir del navegador no basta

La interfaz web de GitHub es una aplicación web, no una hoja de estilos de impresión. Cuando pulsas `Ctrl+P` en una página de repositorio, el navegador intenta imprimir la página entera: el encabezado, el árbol de archivos, la barra lateral «Acerca de», los widgets de comentarios y todo lo demás que haya en el diseño. Parte de eso se puede ocultar con una hoja de estilos de impresión personalizada, pero no puedes cambiar el marcado de GitHub desde fuera.

Hay otros tres problemas recurrentes:

- **Rutas de imagen relativas.** Un README que dice `![diagram](docs/architecture.png)` funciona en GitHub porque la imagen se resuelve contra el repositorio. Una página de navegador impresa no tiene un contexto de repositorio fiable, así que la imagen puede desaparecer.
- **Código y tablas anchos.** Los bloques de código y las tablas comparativas son más anchos que una página impresa. Sin reglas específicas de impresión, o se reducen hasta tamaños ilegibles o se recortan.
- **Paginación.** Los encabezados, los bloques de código y las filas de tabla deben evitar saltos torpes. Una impresión directa del navegador rara vez lo resuelve bien.

ReadmePDF obtiene el Markdown sin procesar del README, resuelve las URL relativas al repositorio, renderiza Markdown al estilo GitHub, sanea el resultado y aplica una hoja de estilos de impresión antes de que se abra el diálogo de impresión del navegador. La salida la sigue generando el motor nativo «Guardar como PDF» del navegador, pero el documento que recibe ya está limpio.

## Qué cambia ReadmePDF

El proceso de conversión se ejecuta por completo en el navegador. En la práctica:

1. Proporcionas la URL de un repositorio público de GitHub, un archivo Markdown local o Markdown pegado.
2. En el caso de un repositorio, la aplicación descubre la rama predeterminada y prueba un conjunto de nombres de README habituales, incluidos los archivos dentro de `.github/`.
3. Las rutas de imagen relativas se reescriben a `raw.githubusercontent.com`, y los enlaces del documento se reescriben a la vista blob de GitHub.
4. El Markdown se renderiza con compatibilidad GFM: tablas, listas de tareas, tachado, código delimitado y enlaces automáticos.
5. El HTML se sanea con DOMPurify antes de llegar a la vista previa.
6. Se genera una tabla de contenidos cuando el documento tiene al menos tres encabezados.
7. Se aplica la hoja de estilos de impresión del tema elegido y el navegador abre su diálogo de impresión.

No se sube ningún archivo. Las únicas solicitudes salientes son lecturas anónimas del repositorio público que has solicitado, más la llamada a la API de GitHub para descubrir la rama predeterminada. Los repositorios privados no son compatibles en esta versión.

## Antes de empezar

Necesitas:

- Un repositorio de GitHub **público**, o un archivo Markdown local, o un bloque de Markdown que puedas pegar.
- Un navegador moderno. Chrome, Edge, Firefox y Safari admiten «Guardar como PDF» en sus diálogos de impresión.
- Unos dos minutos para un documento corto, y más si piensas revisar el PDF página a página.

Si el repositorio es privado, la obtención fallará. El método manual sigue funcionando: copia el texto del README, pégalo en el editor y usa URL de imagen absolutas.

## Paso 1: dale un repositorio a la herramienta

Abre el convertidor y pega la URL del repositorio en el campo **URL del repositorio de GitHub**. ReadmePDF acepta más que la URL canónica:

```text
https://github.com/owner/repo
https://github.com/owner/repo.git
github.com/owner/repo
owner/repo
https://github.com/owner/repo/tree/main/docs
https://github.com/owner/repo/blob/main/README.md
```

Todas ellas se resuelven al mismo par `owner/repo`. Las URL sin protocolo y la forma abreviada `owner/repo` resultan cómodas cuando copias desde un terminal o un mensaje de chat. Los segmentos de ruta adicionales se aceptan por comodidad, pero se ignoran: la aplicación sigue leyendo el README de la raíz del repositorio en la rama predeterminada, no el archivo anidado que muestra la URL. Si el archivo anidado es el que necesitas, pega su Markdown directamente.

Pulsa **Obtener** o presiona `Enter`. Si el campo está vacío, la aplicación te dice qué espera en lugar de no hacer nada en silencio.

## Paso 2: deja que obtenga y resuelva el README

La aplicación pregunta primero a la API de GitHub por la rama predeterminada del repositorio. Después prueba una lista de nombres de README en esa rama, incluidas las variantes de mayúsculas habituales y la ubicación `.github/README.md`. Si la API alcanza su límite de solicitudes, la obtención directa todavía puede continuar; por eso un fallo temporal de la API no siempre termina el flujo.

Cuando llega el Markdown, la vista previa se actualiza. Este es el momento de comprobar tres cosas:

- **Imágenes.** Las imágenes relativas al repositorio deberían aparecer. Si alguna no lo hace, puede apuntar a un recurso privado, a una ruta que no existe o a una URL absoluta que bloquee el enlace directo.
- **Bloques de código.** Los bloques delimitados con una etiqueta de lenguaje se renderizan como código. Las líneas muy anchas se desplazarán en la vista previa, pero aún necesitan una comprobación en impresión.
- **Enlaces.** Los enlaces del documento se reescriben a la vista blob de GitHub para que sigan teniendo sentido en el PDF. Los enlaces externos se abren en una pestaña nueva en la vista previa.

Si una imagen falla, ReadmePDF la marca como rota y continúa. La exportación no falla porque una insignia no esté disponible. Es deliberado: una insignia que falta suele importar menos que el resto del documento.

## Paso 3: elige un tema que encaje con el documento

Hay cuatro temas de impresión:

- **Clean** es el predeterminado. Usa tipografía sans serif neutra y es la opción más segura para especificaciones, READMEs técnicos y documentos con mucho código.
- **Business** usa tipografía serif y un bloque de código oscuro. Encaja en informes, propuestas y entregas a clientes.
- **Academic** usa páginas serif justificadas con un tratamiento de código ligero. Está pensado para prosa extensa, lecturas de curso y entregas con aspecto de artículo.
- **Dark** es un tema pensado para pantalla. La vista previa es oscura para leer con comodidad, y la hoja de estilos de impresión fuerza tinta clara y fondos de código claros para que el PDF siga siendo legible.

Para una comparación más detallada, consulta [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/). Para la mayoría de las primeras exportaciones, empieza con Clean y cambia solo si el documento tiene una expectativa clara por parte del público.

## Paso 4: decide si la tabla de contenidos ayuda

La tabla de contenidos automática está activada de forma predeterminada y se genera cuando el documento tiene tres o más encabezados. Usa identificadores de encabezado estables y únicos, de modo que las entradas enlacen a las secciones correctas en la vista previa.

Consérvala cuando:

- El documento tiene más de unas pocas páginas.
- Quien lo lee necesita saltar a una sección concreta.
- Vas a entregar el PDF a alguien que quizá imprima solo una parte.

Desactívala cuando:

- El README es corto y el bloque de contenido añade más ruido que navegación.
- El documento ya tiene una tabla de contenidos escrita a mano.
- Vas a producir un folleto de una sola página.

El interruptor afecta a la vista previa y a la salida impresa. No hay un ajuste independiente solo para el PDF.

## Paso 5: imprime a PDF con los ajustes correctos

Haz clic en **Descargar / Imprimir PDF** en el panel Vista previa en vivo. La aplicación abre el diálogo de impresión del navegador. En el diálogo:

1. Establece **Destino** en **Guardar como PDF** (o el equivalente en tu navegador).
2. Elige **A4** o **Carta** según la región de quien lo reciba.
3. Deja **Márgenes** en el valor predeterminado salvo que tengas un estilo corporativo. La hoja de estilos de impresión ya define los márgenes de página.
4. Mantén la **Escala** al 100 % en el primer intento. Si una tabla o un bloque de código ancho se corta, reduce un poco la escala en lugar de disminuir la fuente en el origen.
5. Activa **Gráficos de fondo** si tu navegador lo ofrece. Los acentos del tema, los fondos de los bloques de código y los rellenos de las cabeceras de tabla dependen de los colores de fondo. Sin ellos, el PDF sigue siendo legible, pero Business y Dark pierden parte de su estructura visual.
6. Desactiva los **Encabezados y pies de página** del navegador salvo que quieras específicamente la URL y los números de página. No forman parte del diseño del documento.
7. Guarda el archivo con un nombre descriptivo, por ejemplo `owner-repo-readme-2026-10.pdf`.

Las etiquetas exactas varían según el navegador. En Chrome y Edge, los gráficos de fondo están en «Más ajustes». En Firefox, busca «Imprimir fondos». Safari ofrece menos controles; revisa la vista previa antes de guardar.

## Paso 6: revisa el PDF antes de enviarlo

Abre el PDF guardado y busca los problemas que revela la impresión:

- **Saltos de página.** Un encabezado no debería quedar solo al final de una página. Los bloques de código, las tablas y las imágenes no deberían partirse por la mitad.
- **Contenido ancho.** Las líneas de código largas y las tablas son las causas más habituales de desbordamiento. Si se cortan, acorta las líneas en el origen o reduce la escala de impresión.
- **Enlaces.** Haz clic en algunos enlaces del PDF. Los enlaces blob de GitHub deberían abrir la vista correcta del archivo.
- **Imágenes.** Confirma que los diagramas y las insignias han sobrevivido. Un recurso privado que falta no se arreglará solo en el PDF.
- **Metadatos.** El título y el autor del documento provienen del README y de los ajustes de metadatos de impresión del navegador, no de un formulario específico de metadatos del PDF. Ponle al archivo un nombre claro.
- **Legibilidad.** Imprime una página al 100 % y comprueba que el cuerpo de texto resulta cómodo. El texto justificado de Academic y la tipografía serif de Business pueden verse distintos en papel que en pantalla.

## Cuando falla la obtención

La aplicación traduce los fallos de obtención en mensajes que permiten actuar. Los casos habituales:

| Lo que ves | Qué suele significar | Qué hacer |
| --- | --- | --- |
| Repositorio no encontrado o privado | La URL es incorrecta o el repositorio requiere autenticación | Comprueba la URL; pega el Markdown manualmente si el repositorio es privado |
| No se encontró README | El repositorio no tiene README en la rama predeterminada, `main` ni `master` | Sube el archivo o pega el Markdown |
| Límite de solicitudes de GitHub alcanzado | Demasiadas solicitudes a la API sin autenticar | Espera alrededor de un minuto y vuelve a intentarlo; la obtención directa aún puede funcionar |
| La obtención falló o agotó el tiempo | Problema de red, o la solicitud superó el límite de 15 segundos | Vuelve a intentarlo; el método de pegado manual sigue funcionando |

Si la obtención falla, el editor conserva lo que ya hayas escrito. Puedes cambiar al modo de pegado o de subida sin perder la página.

## Pega o sube el archivo en su lugar

Obtener desde GitHub es cómodo, pero no es la única vía de entrada. El convertidor también admite:

- **Subir** un archivo `.md`, `.markdown` o `.txt` de hasta 2 MB.
- **Pegar** Markdown directamente en el editor. La vista previa se vuelve a renderizar tras una breve pausa mientras escribes.
- **Cargar el ejemplo** para ver cómo se tratan las tablas, las listas de tareas y los bloques de código.

Una advertencia: las rutas de imagen relativas solo se resuelven cuando antes se ha obtenido un repositorio. El Markdown subido o pegado no tiene una base de repositorio, así que usa URL de imagen absolutas en ese modo. Todo lo demás —encabezados, tablas, código, listas de tareas— funciona igual.

## Cinco correcciones en el origen que mejoran cualquier exportación

El PDF es tan bueno como el Markdown del que parte. Estos cambios dan resultado de inmediato:

1. **Usa una jerarquía de encabezados real.** Empieza las secciones con `##`, usa `###` para las subsecciones y evita saltarte niveles. Tanto la tabla de contenidos como la hoja de estilos de impresión dependen de la estructura.
2. **Da a las imágenes un texto alternativo útil.** Es bueno para la accesibilidad y le da al PDF un recurso legible cuando una imagen no se puede cargar.
3. **Delimita el código con un lenguaje.** Los bloques con etiqueta de lenguaje se renderizan de forma más predecible que el código indentado, sobre todo cuando las líneas son largas.
4. **Mantén las tablas estrechas.** Una tabla de ocho columnas no cabrá en A4 sin reducirse. Lleva el detalle a la prosa o divide la tabla.
5. **Prefiere rutas relativas para los recursos del repositorio.** ReadmePDF las reescribe correctamente. Los enlaces absolutos a una máquina local o a un bucket privado no sobrevivirán al viaje.

## Privacidad: qué sale de tu navegador

ReadmePDF no sube tu Markdown. El renderizado, el saneado, la generación de la tabla de contenidos y la exportación a PDF ocurren en local. Cuando se obtiene un repositorio, las únicas solicitudes salientes son lecturas anónimas a GitHub del README público y sus imágenes. No hay cuentas, ni cookies, ni analíticas asociadas a la conversión.

Eso importa cuando el documento contiene notas internas, nombres de clientes o planes no publicados. Puedes pegar Markdown sensible y exportarlo sin enviar el texto a un servicio de conversión de terceros. Lo mismo ocurre con los archivos locales: el archivo lo lee tu navegador, no se sube.

## La versión corta

Pega la URL de un repositorio público, pulsa Obtener, confirma la vista previa, elige un tema, deja la tabla de contenidos activada para documentos largos e imprime a PDF con los gráficos de fondo activados. Revisa los saltos de página y los bloques de código anchos antes de enviar el archivo. Si la obtención falla, pega o sube el Markdown y continúa.

Todo el flujo está diseñado para ser aburrido: sin cuenta, sin cola, sin subidas y sin renderizador en el servidor. Solo un README, una hoja de estilos de impresión y un PDF que puedes entregar a alguien.
