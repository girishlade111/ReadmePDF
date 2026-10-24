---
title: "Fijar ramas, etiquetas y commits de GitHub para exportar Markdown a PDF"
description: "Aprenda a seleccionar ramas Git, etiquetas de versión o commits exactos al importar Markdown de GitHub a md2pdf para generar manuales PDF versionados."
pubDate: 2026-03-24
tags: ["github","git","markdown","pdf"]
locale: "es"
translationKey: "github-branch-tag-commit-pdf"
---

La documentación de software evoluciona con cada versión. Si exporta una guía técnica desde la rama principal predeterminada, corre el riesgo de incluir funciones aún no publicadas o cambios incompatibles de API. Con [md2pdf](/#converter), puede vincular la exportación a ramas Git concretas, etiquetas de lanzamiento o identificadores de commit inmutables.

Este tutorial explica el funcionamiento de las referencias Git, cómo elegir la referencia idónea y cómo crear manuales en PDF fieles a cada versión de su software.

## Por qué es fundamental fijar referencias Git en documentación técnica

Al generar manuales para despliegues empresariales o versiones con soporte extendido (LTS), la documentación debe coincidir exactamente con el software en producción.

- **Precisión operativa**: Asegura que el manual en PDF describa los puntos finales de API actualmente activos y no modificaciones experimentales en curso.
- **Auditoría y cumplimiento**: En procesos de certificación formal, la documentación generada desde un commit inmutable constituye una prueba fehaciente del estado del sistema.
- **Conservación histórica**: Permite generar la documentación de versiones anteriores sin necesidad de clonar repositorios completos en su equipo local.

```text
Supported Git Reference Types:
- Branch:  refs/heads/v2.1-maintenance
- Tag:     refs/tags/v2.1.0-lts
- Commit:  7f2b9a1d4e8c3b0f5a6d7e8c9b0a1f2e3d4c5b6a
```

## Uso de etiquetas de lanzamiento para manuales de producción

Las etiquetas (tags) marcan hitos estables en el ciclo de vida de un proyecto. En md2pdf, al introducir una URL con etiqueta o seleccionarla en el menú, la herramienta recupera el contenido exacto de ese hito.

1. **Detección de etiquetas**: Al consultar el repositorio, md2pdf identifica las versiones semánticas disponibles (por ejemplo, `v1.4.0`, `v2.0.0-rc1`).
2. **Descarga de instantáneas**: Cada archivo obtenido bajo dicha referencia refleja el estado inalterado de esa publicación.
3. **Encabezados versionados**: Integre el nombre de la etiqueta en la portada o pie de página para que el lector identifique de inmediato la versión del documento.

## Enfoque en ramas de mantenimiento

Cuando los equipos corrigen errores en versiones previas, los cambios se incorporan frecuentemente en ramas de soporte dedicadas.

Al seleccionar una rama como `support/3.x` o `v1-stable`, md2pdf descarga las revisiones de documentación más recientes de esa línea. Esto garantiza que su equipo reciba instrucciones vigentes sin mezclar código inestable de la rama principal.

## Exportaciones inmutables mediante identificadores de commit (SHA)

Para una reproducibilidad total, nada supera a un hash SHA de 40 caracteres. A diferencia de las ramas o etiquetas reasignables, un commit es matemáticamente inmutable.

Al especificar un SHA de commit en md2pdf, el árbol Git se recupera en ese instante preciso. Incluso si el autor reescribe el historial posteriormente, su PDF exportado preserva un testimonio exacto de ese estado verificado.

## Guía paso a paso para configurar referencias en md2pdf

Configurar una referencia Git en md2pdf es sumamente sencillo:

1. Pegue la dirección del repositorio en el campo correspondiente.
2. Despliegue el selector de referencias para revisar las ramas y etiquetas disponibles.
3. Elija la etiqueta o rama deseada, o pegue un hash de commit directamente en el cuadro de texto.
4. Explore el árbol de archivos y compile sus documentos Markdown en un PDF impecable.
