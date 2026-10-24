---
title: "Seleção de Pastas em Três Estados para Compilar Livros Markdown em PDF"
description: "Aprenda como os controles de seleção em três estados no md2pdf facilitam a compilação de pastas de Markdown em livros PDF estruturados."
pubDate: 2026-03-24
tags: ["markdown","pdf","book","documentation"]
locale: "pt"
translationKey: "markdown-folder-selection-book"
---

Ao transformar documentações dispersas em várias pastas em um único livro PDF, marcar ou desmarcar dezenas de arquivos manualmente é lento e cansativo. Os desenvolvedores precisam alternar diretórios inteiros com um clique sem perder o controle refinado sobre capítulos isolados. No [md2pdf](/#converter), as caixas de seleção em três estados tornam a montagem de manuais técnicos muito mais prática e organizada.

Este guia detalha o funcionamento dos seletores por pasta, o significado de cada estado visual e como transformar árvores de Markdown em volumes PDF bem diagramados.

## Compreendendo os três estados das caixas de pasta

Em sistemas de arquivos ramificados, uma simples opção binária (marcado/desmarcado) não consegue expressar seleções parciais. O md2pdf adota o modelo clássico de três estados:

1. **Marcado (Todos selecionados)**: Todos os arquivos Markdown da pasta e de seus subdiretórios estão incluídos para exportação.
2. **Indeterminado / Parcial (Seleção mista)**: Alguns arquivos dentro do diretório estão marcados, enquanto outros foram excluídos.
3. **Desmarcado (Nenhum selecionado)**: Nenhum arquivo deste diretório ou de suas subpastas será enviado ao PDF.

```text
Tri-State Folder Hierarchy:
[-] docs/guides/             (Indeterminate: partially selected)
    [x] getting-started.md   (Selected)
    [ ] advanced-config.md   (Excluded)
[x] docs/api/                (Checked: all files selected)
    [x] endpoints.md         (Selected)
    [x] authentication.md    (Selected)
```

## Lógica de propagação em cascata

Ao clicar na caixa de uma pasta, o sistema aciona uma sincronização instantânea em toda a árvore:

- **Propagação para baixo**: Clicar em uma pasta desmarcada marca todos os arquivos e subpastas associados. Clicar em uma pasta já selecionada ou indeterminada desmarca todos os itens filhos imediatamente.
- **Propagação para cima**: Alterar o status de um arquivo individual recalcula automaticamente o estado dos diretórios pais até a raiz. Se todos os arquivos de uma pasta forem marcados, a pasta sobe automaticamente para o estado selecionado.
- **Identificação visual rápida**: O traço (-) indica de forma evidente que a pasta contém seleções parciais, sem que você precise abri-la para conferir.

## Criando manuais técnicos sob medida

Os controles de três estados permitem montar publicações técnicas direcionadas em poucos instantes:

- **Manuais de módulo**: Selecione apenas as pastas `api/` e `sdk/` para produzir um guia para desenvolvedores externos, ignorando roteiros internos de `admin/`.
- **Relatórios de auditoria**: Marque toda a pasta de políticas técnicas, desmarque os rascunhos em andamento e gere um PDF auditável pronto para entrega.
- **Kits de integração (Onboarding)**: Combine o `README.md` da raiz com tutoriais introdutórios da pasta `tutorials/getting-started/` em um único volume.

## Preservação da hierarquia na compilação do PDF

Ao compilar as pastas selecionadas em um único livro PDF, o md2pdf organiza o conteúdo de forma harmoniosa:

- **Sumário hierárquico**: As pastas funcionam como grandes seções ou divisões, enquanto os arquivos Markdown viram capítulos numerados.
- **Numeração contínua de páginas**: O documento resultante recebe uma sequência de páginas ininterrupta ao longo de todos os textos reunidos.
- **Quebras de página limpas**: São inseridas quebras automáticas entre os arquivos para garantir uma estética editorial impecável.

## Exportando seu livro para PDF

Com a seleção das pastas finalizada, clique no botão de compilação. Sua seleção personalizada será processada em um livro PDF de alta resolução, com tipografia nítida e navegação interna completa.
