---
title: "Construir um livro Markdown com múltiplos arquivos e exportar para PDF"
description: "Converta a documentação de um repositório em um livro organizado com capa, sumário, impressão unificada e download de PDFs em ZIP."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Documentation", "Book", "PDF", "Workflow"]
locale: "pt"
translationKey: "multi-file-markdown-book"
---

Um único README é um excelente cartão de visitas, mas inadequado para um manual completo. Conforme a documentação se expande para instalação, configuração, operação e suporte, um README imenso se torna cansativo para ler e impossível de paginar manualmente.

O md2pdf conta com um fluxo de documentação em livro projetado sob medida. Indique um repositório público, selecione os arquivos Markdown desejados, ordene os capítulos, acrescente capa e sumário e imprima o volume encadernado ou baixe um arquivo ZIP com um PDF individual para cada capítulo. Tudo no seu navegador sem enviar arquivos a servidores.

Este guia ensina a operar o construtor de livros e estruturar seu repositório. Para exportar um único arquivo, veja [Como converter um README do GitHub para PDF](/blog/github-readme-to-pdf/).

## Quando optar por um livro em vez de um único README

A modalidade de livro é indicada quando a documentação possui capítulos autônomos e o leitor precisa transitar com clareza entre eles:

- **Documentação de produtos** dividida entre guias de introdução, conceitos fundamentais e APIs.
- **Apostilas educacionais** integradas a partir de anotações e exercícios.
- **Guias operacionais (runbooks)** com um arquivo específico para cada serviço.
- **Compilados de lançamento** que reúnem changelog, guia de migração e notas de versão.

O formato de livro é desnecessário para comunicados rápidos ou notas efêmeras.

O fluxo requer que o repositório seja **público**. Repositórios privados não podem ser lidos sem autenticação.

## O que o scanner do repositório executa

A partir da URL do repositório, o explorador lê a árvore do Git por meio da API do GitHub e cria uma visualização hierárquica navegável.

Limites explícitos de segurança mantêm o navegador ágil:

- Até **30 arquivos** por livro.
- Até **750 KB por arquivo**.
- Até **6 MB** de Markdown no total.
- Tempo limite de **20 segundos** para obtenção de conteúdo.
- Orçamento de **60 requisições** à API do GitHub.

```text
docs/
├── 00-introduction.md
├── 01-installation.md
├── 02-configuration.md
├── 03-operations.md
└── 04-troubleshooting.md
```

Estrutura recomendada de pastas:

Prefixos numéricos não são obrigatórios, mas evidenciam a sequência lógica de leitura.

## Seleção e ordenação dos capítulos

Marque os arquivos na árvore e avalie a lista de capítulos. Novos itens entram no fim da fila. Use os botões de mover para cima, para baixo e remover.

Boas práticas de organização:

1. **Mantenha o foco.** Embora o teto seja de 30 capítulos, volumes com 10 a 15 capítulos são muito mais práticos.
2. **Introdução no início.** Conceitos básicos antecedem a instalação.
3. **Referências no final.** Glossários e tabelas técnicas ficam melhor no encerramento.
4. **Evite duplicar o README.** Defina se o README funciona como introdução ou resumo.
5. **Remova arquivos gerados.** Registros de log desnecessários devem ser excluídos.

A sequência fixada no editor rege a paginação do PDF final e as pastas da pasta compactada ZIP.

## Preparação dos arquivos Markdown originais

O renderizador considera cada arquivo como um capítulo independente, gerando um cabeçalho baseado no nome do arquivo.

Exemplo de abertura de capítulo:

```markdown
# Installation

This chapter assumes a supported Node.js version and a local clone.
```

Se cada documento começar com H1, o livro apresentará limites de capítulos claros e destacados.

Pontos de conferência:

- **Links relativos.** Conexões entre capítulos devem apontar para documentos inclusos no livro.
- **Imagens.** Caminhos relativos de imagens são resolvidos automaticamente via GitHub.
- **Tabelas largas.** Consulte [Tabelas Markdown em PDF](/blog/markdown-tables-to-pdf/) para harmonizar o tamanho.
- **Títulos redundantes.** Crie títulos únicos para garantir um sumário compreensível.

## Montagem da capa e do sumário geral

É possível configurar título, subtítulo e notas de capa no editor, comunicando com clareza o objetivo da obra, o público-alvo e a versão.

O sumário é construído automaticamente com base nos capítulos e subtítulos selecionados. Modificações exigem reconstrução para assegurar total sincronia.

## Impressão do livro e exportação em ZIP

Você conta com dois caminhos de exportação:

- **Imprimir livro encadernado.** Envia o conjunto (capa, sumário e capítulos) para o diálogo de impressão do navegador.
- **Download em ZIP.** Compila cada capítulo individualmente em um PDF próprio e entrega uma pasta ZIP.

O arquivo ZIP é batizado como `md2pdf-{owner}-{repo}-{sha8}.zip` com caracteres normalizados em Unicode.

## Limites, contingências e recuperação

Se o limite da API do GitHub for atingido, aguarde a liberação ou insira URLs de pastas específicas. Imagens indisponíveis são sinalizadas sem abortar o processo.

Para orientações visuais, consulte o [Guia de Temas de Impressão](/blog/readme-pdf-print-themes/).
