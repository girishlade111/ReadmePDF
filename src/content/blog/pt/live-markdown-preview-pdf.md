---
title: "Inspeção de Markdown em tempo real com pré-visualização para PDF"
description: "Como a pré-visualização ao vivo do md2pdf renderiza Markdown estilo GitHub, sanitiza HTML, isola estilos de impressão e reflete ajustes na hora."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Preview","HTML","Security"]
locale: "pt"
translationKey: "live-markdown-preview-pdf"
---

Exportar um PDF sem conferência visual prévia é uma fonte garantida de retrabalho. Você ajusta a largura de uma tabela, clica em exportar, aguarda a geração, abre o arquivo e descobre que um título ficou isolado no rodapé da página três. Repetir esse ciclo a cada parágrafo editado desperdiça tempo precioso.

O md2pdf elimina essa lentidão com um painel de visualização em tempo real sincronizado. Conforme você digita, cola ou importa o texto, a janela ao lado processa o layout aplicando diretamente as folhas de estilo de impressão. A disposição, tipografia e margens exibidas na tela refletem fielmente o resultado do PDF impresso.

Este guia aborda o funcionamento do mecanismo de renderização, os filtros de segurança do DOMPurify e como validar o layout antes do envio para a impressora. Para técnicas de digitação, leia o [Guia de edição e colagem rápida de Markdown](/pt/blog/markdown-editor-paste-pdf/).

## Why live preview matters for print-bound documents

Navegadores de internet e motores de impressão de PDF tratam o CSS sob perspectivas distintas. A tela do computador rola verticalmente sem limites, enquanto uma folha de papel possui dimensões físicas fixas:

- **Controle de quebra de página**: Tabelas, ilustrações e trechos de código precisam respeitar a altura útil de cada folha.
- **Legibilidade tipográfica**: A hierarquia de fontes precisa manter nitidez mesmo na resolução de 300 DPI típica da impressão.
- **Limites de margem**: Elementos que ultrapassam as bordas da página não criam barras de rolagem; são simplesmente cortados.

Dispor de uma pré-visualização com simulação de impressão permite identificar falhas de enquadramento antes de abrir o diálogo do sistema.

## How the client-side preview pipeline renders Markdown

A esteira de renderização do md2pdf converte Markdown em nós DOM prontos para visualização em milissegundos:

```javascript
const rawHtml = markdownParser.render(markdownSource);
const cleanHtml = DOMPurify.sanitize(rawHtml, sanitizeConfig);
previewElement.innerHTML = cleanHtml;
applyHeadingAnchors(previewElement);
```

O analisador segue rigorosamente as especificações CommonMark e GitHub-Flavored Markdown (GFM), suportando tachado, links automáticos, caixas de seleção de tarefas e realce de código.

## HTML sanitization and safety filters

Ao colar textos de repositórios públicos ou fontes de terceiros, a segurança do navegador é fundamental. Como o Markdown aceita código HTML direto, scripts maliciosos poderiam ser injetados.

O md2pdf aplica o filtro DOMPurify em todas as cadeias de texto com critérios rigorosos:

- **Remoção de tags perigosas**: Tags como `<script>`, `<iframe>`, `<object>` e `<form>` são bloqueadas e expurgadas.
- **Limpeza de atributos**: Eventos JavaScript como `onclick` e `onload` são removidos sem exceção.
- **Verificação de links**: Links que iniciam com `javascript:` ou `data:text/html` são desarmados.
- **Tags de formatação autorizadas**: Apenas tags seguras de formatação (`<b>`, `<code>`, `<table>`, `<img>`) são mantidas.

Toda essa higienização ocorre dentro do seu navegador antes que qualquer elemento seja injetado no documento de visualização.

## Previewing print themes and theme transitions

O md2pdf oferece quatro temas dedicados de impressão: Clean, Business, Academic e Dark. A troca de tema na barra superior altera instantaneamente as classes CSS da tela:

- **Clean**: Tipografia contemporânea, clara e arejada com fontes de sistema sem serifa.
- **Business**: Estrutura corporativa com divisórias marcadas e bordas sutis.
- **Academic**: Diagramação formal com serifa, seções numeradas e espaçamento compacto.
- **Dark**: Modo escuro confortável para visualização na tela que se converte em fundo branco ao imprimir para poupar tinta.

Para conferir o comportamento de cada tema em detalhes, veja o [Guia de temas de impressão do md2pdf](/pt/blog/readme-pdf-print-themes/).

## Differences between screen preview and print output

Embora a pré-visualização seja muito fiel, existem particularidades entre a tela do monitor e a folha de papel:

- **Largura de visualização**: A pré-visualização se ajusta à janela do navegador, enquanto a impressão é travada em padrões fixos como A4 ou Carta.
- **Corte de páginas**: A tela apresenta um fluxo contínuo, mas a impressora fatia o documento obedecendo à propriedade CSS `break-inside: avoid`.
- **Reprodução de cores**: Tons RGB na tela podem sair ligeiramente mais escuros na impressão física devido à dispersão do toner.

## Diagnosing preview rendering glitches

- **A pré-visualização parou de atualizar**: Verifique se não há tags HTML não fechadas ou imagens gigantes em Base64 travando o navegador.
- **Tabelas ultrapassando a margem**: Se a tabela for larga demais, siga as orientações de [Tabelas Markdown para PDF](/pt/blog/markdown-tables-to-pdf/) para ajustar colunas.
- **Imagens ausentes**: Certifique-se de usar URLs absolutas em HTTPS ou recorra ao [Importador de README do GitHub](/pt/blog/github-readme-to-pdf/) para caminhos relativos.

Monitore seus documentos em tempo real e imprima PDFs com precisão pelo [md2pdf](/#converter).
