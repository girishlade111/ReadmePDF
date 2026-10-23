---
title: "Clean, Business, Academic o Dark: ¿qué tema de md2pdf te conviene?"
description: "Una comparación práctica de los cuatro temas de impresión de md2pdf: tipografía, bloques de código, tablas y los documentos a los que se adapta cada uno."
pubDate: 2026-10-14
author: "Girish Lade"
tags: ["Themes", "Design", "PDF"]
locale: "es"
translationKey: "readme-pdf-print-themes"
---

El selector de temas de md2pdf parece una decisión pequeña: cuatro botones de opción encima del botón de exportar. En la práctica, cambia cómo se lee el documento antes de que nadie llegue al contenido. Una especificación impresa en Academic parece un artículo. Una propuesta de cliente impresa en Clean parece un volcado de repositorio. El tema correcto es el que encaja con las expectativas de quien lo lee.

Los cuatro temas renderizan el mismo Markdown. Se diferencian en la familia tipográfica, la alineación, el tratamiento del código, el estilo de las tablas, el color de los enlaces y la cantidad de estructura visual que añaden a los encabezados. Ninguno añade marca de agua, portada ni logotipo. El contenido sigue siendo tuyo.

## Los temas son hojas de estilos de impresión, no cambios de color

Cada tema es un conjunto de reglas CSS que se aplican a la hoja de la vista previa y pasan a la salida impresa. Eso significa que el tema afecta a:

- La fuente usada en encabezados, cuerpo de texto, tablas y código.
- Si el cuerpo de texto está alineado a la izquierda o justificado.
- El color y el grosor de las líneas de los encabezados.
- Los fondos de los bloques de código y del código en línea.
- Los rellenos de las cabeceras de tabla y los colores de los bordes.
- El color de los enlaces en la vista previa y, cuando el PDF lo conserva, en el archivo exportado.

La hoja de estilos de impresión también gestiona las indicaciones de paginación: los bloques de código, las tablas, las citas y las imágenes evitan partirse por la mitad cuando es posible, y los encabezados evitan quedarse aislados al final de una página.

Una nota práctica antes de compararlos: activa **Gráficos de fondo** en el diálogo de impresión del navegador si quieres que sobrevivan los rellenos de los bloques de código y los colores de las cabeceras de tabla. Sin eso, el PDF sigue siendo legible, pero Business y Dark pierden parte de su estructura. La elección está en el diálogo de impresión, no en la aplicación.

## Clean: el predeterminado para documentos técnicos

Clean es la opción neutra. Usa la pila sans serif de la interfaz para todo el documento, con texto gris oscuro sobre blanco y un fondo de código gris claro. Los encabezados se separan con una línea fina, y los enlaces usan el mismo azul verdoso que se emplea en el resto del producto.

**Funciona mejor para:**

- READMEs de repositorio y especificaciones técnicas.
- Documentación interna de ingeniería.
- Folletos y runbooks con mucho código.
- Documentos que se leerán tanto en pantalla como en papel.
- Instantáneas de auditoría donde la neutralidad importa más que el acabado.

**Ojo con:**

- La prosa muy larga puede resultar plana. Clean es eficaz, no cálido.
- El fondo de código claro depende de los gráficos de fondo al imprimir. Si están desactivados, los bloques de código se siguen leyendo, pero pierden la separación visual del cuerpo de texto.
- El cuerpo de texto sans serif en tamaños de impresión pequeños puede resultar menos cómodo que una serif para lecturas largas.

Clean es el predeterminado más seguro porque no impone un tono. Si exportas un README para otro ingeniero, empieza por aquí.

## Business: informes, propuestas y entregas a clientes

Business lleva el documento a un registro más formal. Usa tipografía serif en todo, encabezados azul marino con una línea más gruesa, un bloque de código oscuro y una cabecera de tabla tintada. El resultado se lee más como un informe que como un README, que es justo lo que se busca cuando el público es un cliente, un responsable o una parte interesada de otra área.

**Funciona mejor para:**

- Entregas a clientes y resúmenes de proyecto.
- Propuestas, declaraciones de trabajo e informes.
- Folletos de taller que deberían parecer diseñados.
- Anexos de portafolio y muestras de candidatura.
- Documentos donde los diagramas y las tablas pesan tanto como la prosa.

**Ojo con:**

- El bloque de código oscuro es un elemento visual potente. Un documento con muchos fragmentos de código cortos puede empezar a parecer rayado.
- La tipografía serif y el espaciado casi justificado hacen que las URL largas y los identificadores de código destaquen. Mantén las líneas de código cortas.
- Los gráficos de fondo importan aquí. Sin ellos, el bloque de código oscuro se convierte en un bloque plano y la cabecera de tabla pierde su tinte.
- Business no sustituye a la edición. Un registro de cambios sin pulir en Business sigue leyéndose como un registro de cambios sin pulir.

Para documentos externos, Business suele causar mejor primera impresión. Indica que el PDF se preparó para un lector, no que se exportó como algo secundario.

## Academic: prosa extensa y material de curso

Academic usa una tipografía serif, cuerpo de texto justificado y un tratamiento de código más cálido y claro. Los encabezados se mantienen alineados a la izquierda para que la estructura siga siendo fácil de escanear aunque los párrafos estén justificados. El efecto general se acerca más a una lectura de curso o a un artículo que a una página de producto.

**Funciona mejor para:**

- Dosieres de curso, paquetes de lectura y apuntes de clase.
- Artículos y trabajos de investigación.
- Documentación extensa con pocos bloques de código.
- Solicitudes de subvención y portafolios académicos.
- Cualquier documento que el lector espere leer de forma continua en lugar de escanear.

**Ojo con:**

- El texto justificado puede crear huecos amplios alrededor de URL largas, identificadores de código y términos técnicos. Divide los enlaces largos en enlaces de estilo referencia o llévalos a una lista.
- Los bloques de código son legibles, pero visualmente más discretos que en Business. Es intencionado: Academic da por hecho que el código es material de apoyo, no el protagonista.
- Las tablas pueden quedar apretadas en A4 si tienen muchas columnas. Reduce el número de columnas o lleva el detalle a la prosa.
- Academic encaja mal en una guía de configuración rápida. El formato dice «léelo de principio a fin», y un runbook suele escanearse.

Si el documento tiene una sección tipo bibliografía, la tipografía de Academic la hace sentirse en casa. La aplicación no da formato a las citas, así que mantén la sección de referencias en el Markdown.

## Dark: revisión en pantalla con salida segura para imprimir

Dark es la excepción. Está diseñado primero para una lectura cómoda en pantalla: fondo azul marino oscuro, texto claro y un color de enlace más brillante. Al imprimir, la hoja de estilos de impresión fuerza fondo blanco, texto negro, enlaces negros y bloques de código claros. El PDF no traslada el tema oscuro de pantalla al papel.

**Funciona mejor para:**

- Revisar un README largo en pantalla antes de exportarlo.
- Leer por la noche o con poca luz.
- Comprobar cómo se lee el documento sin el ruido visual de una página blanca.
- Producir un PDF para un equipo que prefiere herramientas en modo oscuro.

**Ojo con:**

- Lo que ves en pantalla no es lo que obtienes en el PDF. Abre siempre el archivo exportado para confirmar el tratamiento claro de impresión.
- Dark no es un tema de marca para documentos externos. Un cliente espera que el PDF coincida con la salida impresa, no con la vista previa.
- Si tu navegador está configurado para imprimir fondos, la hoja de estilos de impresión sigue anulando las superficies oscuras, pero los bloques de código pueden necesitar una comprobación visual.
- El contraste en pantalla del tema puede ocultar una estructura de origen débil. Un documento con encabezados saltados sigue pareciendo atmosférico; no queda mejor organizado.

Piensa en Dark como un modo de lectura con una salida segura para imprimir, no como una cuarta identidad visual para el documento final.

## Comparación en paralelo

| | Clean | Business | Academic | Dark |
| --- | --- | --- | --- | --- |
| Tipo de cuerpo | Sans serif | Serif | Serif, justificado | Sans serif en pantalla; claro al imprimir |
| Tratamiento de encabezados | Línea fina | Línea azul marino | Serif alineada a la izquierda | Línea clara sobre oscuro; segura al imprimir |
| Bloques de código | Gris claro | Azul marino oscuro | Claro y cálido | Oscuro en pantalla; claro al imprimir |
| Cabeceras de tabla | Neutras | Azul tintado | Neutras | Oscuras en pantalla; claras al imprimir |
| Color de enlaces | Azul verdoso | Azul | Negro | Azul brillante en pantalla; negro al imprimir |
| Público ideal | Ingenieros | Clientes, responsables | Académicos, estudiantes | El autor, en pantalla |
| Documento ideal | Especificación, README, runbook | Informe, propuesta, folleto | Artículo, dosier de curso | Copia de revisión |

La tabla es un punto de partida, no una regla. Un cliente técnico puede preferir Clean. Un equipo de ingeniería con sensibilidad por el diseño puede preferir Business. La función del documento importa más que su categoría.

## Cómo interactúa el tema con el resto de la exportación

El tema es solo una parte del resultado impreso. Merece la pena revisar estas interacciones:

**Tabla de contenidos.** La tabla de contenidos hereda la tipografía y el color de enlace del documento. En Business, los encabezados azul marino y los enlaces azules la hacen parecer la página de contenido de un informe. En Academic, se lee como el esquema de un artículo. La tabla se genera para documentos con tres o más encabezados, y puedes desactivarla si el documento es corto.

**Bloques de código.** Clean y Academic usan fondos de código claros; Business usa un bloque oscuro; Dark usa un bloque oscuro en pantalla y uno claro al imprimir. Las líneas largas son un problema mayor que el color. Una línea de 120 caracteres se desbordará independientemente del tema.

**Tablas.** Business añade una cabecera tintada; Clean y Academic se mantienen neutras. Las tablas anchas son el fallo de impresión más habitual. Si una tabla tiene más de cinco o seis columnas, considera dividirla o reducir el tamaño de fuente en el origen en lugar de reducir la escala de impresión.

**Imágenes e insignias.** Los temas no cambian el renderizado de las imágenes, pero sí el espacio en blanco que las rodea. El texto serif de Business puede hacer que una captura de pantalla parezca más una figura; el texto sans serif de Clean la hace parecer documentación. Las imágenes rotas se marcan en la vista previa y no abortan la exportación.

**Enlaces.** Clean y Business usan enlaces azules; Academic usa negro; Dark usa azul brillante en pantalla y negro al imprimir. Si el PDF se va a imprimir en escala de grises, la diferencia de color desaparece, así que haz que el texto de los enlaces sea descriptivo en lugar de confiar en el color.

**Saltos de página.** La hoja de estilos de impresión evita que los bloques de código, las tablas, las citas y las imágenes se rompan a mitad de elemento cuando es posible, y mantiene los encabezados junto al contenido que los sigue. Este comportamiento es común a todos los temas, pero importa más en Academic, donde la prosa larga produce más transiciones de página.

## Elige en 30 segundos

Usa esta ruta de decisión rápida:

1. **¿El lector es un ingeniero que buscará comandos y código?** Elige Clean.
2. **¿El lector es un cliente, un responsable o un revisor que espera un informe?** Elige Business.
3. **¿El documento es prosa extensa con pocos bloques de código?** Elige Academic.
4. **¿Lo vas a leer principalmente en pantalla y exportarás después?** Elige Dark y luego revisa el PDF.
5. **¿Sigues con dudas?** Elige Clean. Es el que menos probabilidades tiene de representar mal el documento.

Una prueba útil: exporta las dos primeras páginas con dos temas candidatos y léelas en un teléfono. El tema que sobrevive a una pantalla pequeña y a un vistazo rápido suele ser el correcto.

## Comprobaciones previas a la exportación que importan más que el tema

Ningún tema puede arreglar esto:

- **Jerarquía de encabezados.** Usa `##` para las secciones principales y `###` para las subsecciones. Los niveles saltados producen una tabla de contenidos confusa.
- **Longitud de las líneas de código.** Mantén las líneas por debajo de unos 80-90 caracteres cuando sea posible.
- **Ancho de las tablas.** Menos columnas, etiquetas más cortas o una tabla dividida.
- **Rutas de imagen.** Las imágenes relativas al repositorio necesitan obtener el repositorio; el Markdown pegado necesita URL absolutas.
- **Texto confidencial.** La conversión es local, pero el PDF todavía se puede reenviar.
- **Tamaño de página.** A4 y Carta paginan de forma distinta. Elige el que vaya a imprimir quien lo reciba.
- **Gráficos de fondo.** Actívalos si los rellenos de los bloques de código y las cabeceras de tabla importan al diseño.

## La recomendación

Para la mayoría de las exportaciones de README, **Clean** es el predeterminado correcto. Es neutro, legible y no finge que el documento es algo que no es. Usa **Business** cuando el PDF sea un entregable para alguien fuera de ingeniería. Usa **Academic** cuando el documento esté pensado para leerse como prosa. Usa **Dark** cuando quieras una revisión cómoda antes de producir el PDF claro definitivo.

El tema es una señal para el lector. Elige la señal que encaje con la tarea y dedica el esfuerzo restante al contenido: una apertura clara, una estructura de encabezados sensata e imágenes que realmente se resuelvan. Esas decisiones sobreviven a todos los temas.

Para el flujo de exportación completo, consulta [Cómo convertir un README de GitHub a PDF](/blog/github-readme-to-pdf/). Para la preparación según el público, consulta [7 casos de uso prácticos para convertir un README en PDF](/blog/readme-to-pdf-use-cases/).
