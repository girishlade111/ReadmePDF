---
title: "Como configurar a impressão do navegador para gerar PDFs perfeitos"
description: "Guia completo de configurações de impressão do navegador para Markdown: margens, formatos de folha, gráficos de fundo e quebras de página."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Print","Browser","CSS","PDF"]
locale: "pt"
translationKey: "browser-print-markdown-pdf"
---

Um documento Markdown diagramado com perfeição na tela do navegador ainda pode sair da impressora com aspecto descuidado se o diálogo de impressão estiver mal configurado. Datas indesejadas no rodapé, blocos de código cortados ao meio, fundos suprimidos ou margens desajustadas raramente decorrem do texto em si; são fruto dos padrões do navegador, criados para páginas web comuns e não para publicações editoriais.

O md2pdf alia consultas de mídia CSS (`@media print`) ao motor nativo de impressão do seu navegador. Ao clicar no botão de imprimir, as folhas de estilo dedicadas assumem o controle, ocultando a barra de navegação, isolando o texto e organizando as páginas. Contudo, a palavra final sobre margens, formato de folha e preservação de cores cabe a você dentro da janela de impressão.

Este guia orienta como calibrar as opções no Chrome, Firefox, Safari e Edge para obter a máxima fidelidade. Para ajustar os temas previamente, leia o [Guia de temas de impressão do md2pdf](/pt/blog/readme-pdf-print-themes/).

## Why browser print dialogs require careful configuration

O padrão dos navegadores supõe que você deseja uma cópia simples de um site da web, carimbando automaticamente a data, o título da aba e o endereço URL nas bordas. Em propostas comerciais ou documentos técnicos, esses elementos depreciam a apresentação.

Além disso, os navegadores desativam por padrão os fundos coloridos para poupar tinta em impressoras convencionais. Em um documento técnico, omitir os gráficos de fundo apaga o contraste dos blocos de código, as faixas zebradas das tabelas e os quadros de alerta, prejudicando drasticamente a legibilidade.

Aprender a ajustar essas opções eleva uma simples impressão para o patamar de um PDF de padrão gráfico.

## Essential print settings: Paper size, margins, and scaling

Ao abrir o diálogo de impressão, confira estas opções essenciais:

- **Destino**: Selecione **Salvar como PDF** (ou Microsoft Print to PDF).
- **Tamanho do Papel**: Escolha **A4** (padrão internacional) ou **Carta** (padrão norte-americano) conforme o público-alvo.
- **Orientação**: Mantenha **Retrato (Portrait)** para texto corrido. Use **Paisagem (Landscape)** apenas se o documento tiver tabelas muito largas.
- **Margens**: Escolha **Padrão** ou **Nenhuma**. Como o md2pdf já incorpora margens internas ideais em CSS, escolher margens mínimas pode colar o texto na borda do papel.
- **Escala**: Deixe em **100% (Padrão)**. Evite reduzir para menos de 90% para não perder nitidez de leitura.

## Enabling background graphics for theme fidelity

A opção mais importante em toda a janela de impressão é **Gráficos de segundo plano** (Background graphics):

```text
[x] Background graphics (Chrome, Edge, Opera)
[x] Print Backgrounds (Firefox)
[x] Print backgrounds (Safari)
```

Ao marcar essa opção:

- O fundo escuro ou cinza dos blocos de código e o realce de sintaxe saem nítidos.
- O contraste zebrado e os cabeçalhos de tabelas continuam destacados.
- Caixas de aviso e notas retêm seus contornos e tons de fundo.
- Os detalhes do tema escolhido (como divisórias do tema Business ou bordas do Academic) são preservados.

Se esquecer de marcar essa caixa, todos os blocos de código serão impressos em fundo branco transparente, dificultando a distinção do texto normal.

## Suppressing unwanted browser headers and footers

Por padrão, os navegadores imprimem carimbos próprios:

- Cabeçalho: Título da aba e data atual.
- Rodapé: URL completa da página e número de página genérico (ex.: "1/4").

Na janela de impressão, desmarque a opção **Cabeçalhos e rodapés**:

```text
[ ] Headers and footers (Uncheck to remove browser URL and date)
```

Desmarcar essa caixa elimina URLs e carimbos de data desnecessários, permitindo que a numeração de páginas elegante do md2pdf brilhe com exclusividade.

## Page-break control across headings, tables, and code

O md2pdf inclui regras automáticas de CSS para quebras de página que evitam divisões indesejadas:

```css
h1, h2, h3 { break-after: avoid; }
pre, table, figure { break-inside: avoid; }
```

- **Proteção contra títulos órfãos**: Títulos nunca ficam isolados na última linha da folha; são empurrados para a página seguinte com seu primeiro parágrafo.
- **Integridade de blocos de código**: Trechos de código evitam ser divididos ao meio, salvo se ultrapassarem a altura total da folha.
- **Estabilidade de tabelas**: Linhas de dados evitam ser fatiadas pela linha de dobra da página.

## Browser-specific printing quirks and fixes

- **Google Chrome e Edge**: Oferecem a renderização vetorial mais precisa. Lembre-se de ativar "Gráficos de segundo plano" e desativar "Cabeçalhos e rodapés".
- **Mozilla Firefox**: Costuma aplicar margens um pouco mais estreitas. Mantenha as margens no modo "Padrão" caso perceba texto rente à borda.
- **Apple Safari**: Clique em "Mostrar detalhes" para revelar a caixa "Imprimir fundos".

Ajuste as opções de impressão e produza PDFs impecáveis pelo [md2pdf](/#converter).
