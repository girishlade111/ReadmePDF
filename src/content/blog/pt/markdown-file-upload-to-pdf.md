---
title: "Como enviar arquivos Markdown locais e convertê-los em PDF no navegador"
description: "Guia prático para converter arquivos .md locais em PDF sem envio para servidores: arraste e solte, limites de arquivo, codificação e privacidade."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Upload","PDF","Security"]
locale: "pt"
translationKey: "markdown-file-upload-to-pdf"
---

Converter um arquivo Markdown local para PDF não deveria exigir o envio de documentação confidencial para servidores de terceiros. A maioria dos conversores online transmite seus arquivos para um backend, onde o conteúdo é processado e armazenado.

O md2pdf utiliza a API nativa `FileReader` do navegador. Ao selecionar um arquivo `.md` local ou arrastá-lo para a interface, o texto é lido diretamente na memória do navegador. Nada sai do seu computador, garantindo sigilo total para especificações técnicas, propostas e anotações.

Este guia explica os formatos de arquivo compatíveis, limites de tamanho, padrões de codificação e como resolver falhas de carregamento. Se você prefere colar texto diretamente, confira o [guia de edição e colagem rápida de Markdown](/pt/blog/markdown-editor-paste-pdf/).

## How local file uploads work in md2pdf

O fluxo de carregamento de arquivos no md2pdf é totalmente executado no lado do cliente. A seleção do arquivo dispara o evento `change` do navegador, processando os dados localmente:

```javascript
const reader = new FileReader();
reader.onload = (e) => {
  const markdownText = e.target.result;
  renderMarkdownToPreview(markdownText);
};
reader.readAsText(file, 'UTF-8');
```

O texto interpretado preenche imediatamente o editor e é renderizado no painel de visualização dinâmica. Como nenhuma requisição HTTP POST é enviada para qualquer API, o conversor funciona perfeitamente mesmo sem conexão à internet.

## Supported file types and extension rules

O md2pdf reconhece as seguintes extensões de texto simples:

- `.md` — Formato padrão do Markdown.
- `.markdown` — Extensão explícita do Markdown.
- `.txt` — Arquivos de texto contendo sintaxe Markdown.

Arquivos em formatos binários (como `.docx`, `.rtf` ou arquivos `.pdf` prontos) são recusados. Se a documentação estiver no Word ou em HTML, converta-a para Markdown padrão antes de abrir no md2pdf.

## Client-side size limits and encoding

Para manter a interface estável e rápida, o md2pdf estabelece limites técnicos claros:

- **Tamanho máximo por arquivo**: 2 MB de texto simples em UTF-8.
- **Codificação de caracteres**: UTF-8 sem BOM (Byte Order Mark).
- **Quebras de linha**: Normalização automática entre CRLF (`\r\n`) e LF (`\n`).

Um arquivo Markdown de 2 MB abriga cerca de 300.000 palavras, capacidade mais do que suficiente para relatórios extensos. Para arquivos maiores, divida o conteúdo ou utilize o [compilador de livros Markdown multi-arquivos](/pt/blog/multi-file-markdown-book/).

## Step-by-step: Uploading and printing a local Markdown file

Siga este passo a passo para transformar seu arquivo local em um PDF profissional:

1. Acesse a página inicial do md2pdf e localize a barra de ferramentas do conversor.
2. Clique em **Enviar Markdown** ou arraste o arquivo `.md` diretamente para o editor.
3. Confira se o texto foi carregado no editor e renderizado corretamente na pré-visualização.
4. Escolha o tema de impressão desejado: Clean, Business, Academic ou Dark.
5. Ative o **Sumário (TOC)** se o documento contiver três ou mais títulos.
6. Clique em **Imprimir / Salvar como PDF** para abrir a janela de impressão do navegador.
7. Defina o destino como **Salvar como PDF**, revise as margens e confirme o salvamento.

Para instruções completas sobre o diálogo de impressão, leia [Configurações ideais de impressão do navegador para Markdown em PDF](/pt/blog/browser-print-markdown-pdf/).

## Handling missing relative assets in local files

Ao carregar um único arquivo local, o isolamento de segurança do navegador impede o acesso a imagens locais referenciadas por caminhos relativos (como `![Arquitetura](./images/arch.png)`).

Para garantir que suas imagens apareçam no PDF:

- Hospede as imagens em um servidor HTTPS seguro e utilize endereços web absolutos.
- Incorpore imagens diretamente no Markdown usando dados Base64 (Data URI).
- Caso o projeto esteja no GitHub, use o [importador de README do GitHub](/pt/blog/github-readme-to-pdf/).

## Common upload errors and troubleshooting

- **Caracteres corrompidos**: Se acentos ou caracteres especiais virarem interrogações, salve novamente o arquivo como UTF-8 sem BOM em seu editor.
- **Lentidão ao abrir**: Documentos com SVGs muito extensos ou tabelas aninhadas complexas podem atrasar a renderização. Isole ou simplifique esses trechos.
- **Arquivo recusado**: Certifique-se de que a extensão seja `.md` ou `.txt`. Arquivos binários renomeados serão rejeitados pelo analisador.

Converta seus arquivos Markdown locais com total privacidade e precisão usando o [md2pdf](/#converter) agora mesmo.
