---
title: "Sumário Markdown para PDF: estrutura e navegação na impressão"
description: "Como o md2pdf constrói o sumário, quando mantê-lo ativo e como a hierarquia de títulos torna o documento PDF fácil de consultar e navegar."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Navigation", "PDF", "Layout"]
locale: "pt"
translationKey: "markdown-table-of-contents-pdf"
---

Um sumário não é um acessório visual. Em documentos que ultrapassam algumas páginas, ele estabelece a diferença entre um leitor que acessa a seção procurada de imediato e outro forçado a rolar o PDF inteiro.

O md2pdf cria sumários automáticos para documentos individuais e compila uma tabela de conteúdos completa para livros com múltiplos capítulos. Este guia explica a lógica de geração, a organização dos níveis de títulos e em quais ocasiões convém desativá-lo.

Para o fluxo padrão, veja [Como converter um README do GitHub para PDF](/blog/github-readme-to-pdf/). Para projetos com múltiplos arquivos, consulte [Construir um livro Markdown com múltiplos arquivos](/blog/multi-file-markdown-book/).

## O que o sumário realmente representa

Na visualização de um documento único, o sumário é um bloco de navegação HTML posicionado antes do corpo do texto. Ele lista os títulos em forma de links internos funcionais tanto no navegador quanto no PDF final impresso.

Ele não se confunde com o painel lateral de marcadores de um leitor de PDF, cuja geração decorre das capacidades do motor de impressão do sistema operacional.

No modo de livro, o sumário constitui uma página formal do documento impresso, calculada a partir de todos os capítulos selecionados.

## Como o md2pdf constrói o sumário

O sumário é estruturado a partir do Markdown processado seguindo critérios objetivos:

- O documento precisa conter no mínimo **três títulos**.
- São catalogados títulos de **H1 a H4**.
- Os identificadores de âncoras são normalizados para evitar duplicidades.
- O botão seletor na tela atua de forma unificada na pré-visualização e no PDF impresso.

```markdown
# Project handbook

## Installation

### Requirements

## Configuration

### Environment variables

## Troubleshooting
```

Estrutura típica de títulos:

Havendo seis títulos no total, o sumário surge automaticamente com recuos proporcionais a cada nível hierárquico.

## Redija títulos que funcionem como itens de sumário

Um título cumpre duas funções: apresentar o tema da seção e compor uma linha inteligível no índice. Títulos vagos empobrecem a navegação.

```text
Vague:  ## Overview
Useful: ## Configure GitHub access
Vague:  ## Errors
Useful: ## Recover from a failed export
```

Dê preferência a termos diretos e específicos:

Títulos precisos adiantam o conteúdo sem exigir a leitura prévia do capítulo. Mantenha os títulos curtos para evitar quebras de linha e evite criar títulos para meros avisos em destaque.

## Inicie as seções primárias em H2

Definir o título do documento como único H1 e iniciar os tópicos em H2 traz três vantagens fundamentais:

1. **Estrutura de topo inequívoca.** O H1 designa a obra integral.
2. **Subordinação lógica.** H3 e H4 alinham-se de maneira natural.
3. **Escala tipográfica estável.** Evita a sensação de fragmentos soltos na impressão.

Se os arquivos já usam H1 em cada capítulo, a modalidade de livro é mais indicada.

## Títulos duplicados, apêndices e documentos extensos

Embora o sistema trate conflitos técnicos de âncoras, termos idênticos deixam o sumário ambíguo. Enriqueça o texto no código-fonte com qualificadores específicos.

Em documentos muito volumosos repletos de H4, avalie se cada detalhe merece constar no índice, evitando que o sumário ocupe mais de uma folha inteira.

Para apêndices, use designações completas como `## Apêndice A: Limites de exportação`.

## Critérios para manter ou ocultar o sumário

Mantenha o sumário ativo em apostilas, relatórios extensos e especificações de software. Desative-o em comunicados curtos de uma ou duas páginas ou notas rápidas.

## Confira o sumário no arquivo PDF gerado

Abra o arquivo final e valide o funcionamento dos links internos e a quebra de páginas. Para formatar tabelas perfeitamente, consulte [Tabelas Markdown em PDF](/blog/markdown-tables-to-pdf/).
