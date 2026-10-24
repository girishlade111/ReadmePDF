---
title: "Blocos de código Markdown em PDF: limites, linhas e quebras"
description: "Como escrever código delimitado legível em PDF: tags de linguagem, largura de linha, quebras manuais, temas e verificação antes de imprimir."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Code", "PDF", "Layout"]
locale: "pt"
translationKey: "markdown-code-blocks-to-pdf"
---

O código é a parte de um documento Markdown que mais frequentemente parece perfeita na tela e falha no papel. Uma linha que cabe em um monitor amplo pode ultrapassar a margem de uma página A4. Um bloco delimitado pode cair no final de uma página com duas linhas de um lado e o restante na seguinte.

O md2pdf renderiza código delimitado como texto pré-formatado dentro do layout de impressão. Ele não adiciona realce de sintaxe colorido nem quebra o código fonte automaticamente para forçar o encaixe na página, pois alterar o código pode mudar seu significado. A abordagem prática é preparar o código-fonte para que seja lido claramente sem transformações.

Este guia aborda blocos delimitados, tags de linguagem, comprimento de linha, temas e verificações essenciais antes de exportar o PDF. Para o fluxo completo, consulte [Como converter um README do GitHub para PDF](/blog/github-readme-to-pdf/).

## O que o conversor faz com blocos delimitados

O GitHub Flavored Markdown suporta blocos de código delimitados por três ou mais crases ou tis. O md2pdf analisa esses delimitadores, preserva o texto com precisão e o renderiza em um elemento `<pre><code>`. A tag de linguagem é mantida como classe CSS, mas o renderizador atual não aplica temas de realce colorido.

Isso implica duas características:

- Recuos, linhas em branco e pontuações sobrevivem exatamente como foram digitados.
- O resultado visual é texto monoespaçado com o fundo e a borda do tema escolhido, sem realces coloridos.

Se um documento depende de cores para explicar uma comparação (diff), adicione uma legenda curta ou use marcadores `+` e `-`. Não presuma que o leitor distinguirá cores em uma impressão física.

## Use blocos delimitados em vez de recuo

O recuo de quatro espaços também cria blocos de código em Markdown, mas os delimitadores são muito mais fáceis de controlar. Eles definem início e término explicitamente, aceitam tags de linguagem e não falham se uma linha interna for recuada.

Um bloco delimitado simples:

```bash
npm install
npm run build
npm test
```

Use um delimitador mais longo do que qualquer sequência de crases dentro do código. Se o trecho contiver três crases, abra e feche com quatro.

Evite mesclar tabulações e espaços no mesmo bloco. O renderizador preserva fielmente o texto, e um recuo inconsistente parecerá um defeito.

## Identifique a linguagem mesmo sem realce de sintaxe

A tag de linguagem continua sendo valiosa mesmo sem cores. Ela documenta a linguagem pretendida, auxilia editores e ferramentas de análise, e sinaliza claramente aos tradutores que o conteúdo do bloco não deve ser alterado.

Tags comuns incluem `bash`, `js`, `ts`, `json`, `yaml`, `python`, `html`, `css`, `sql` e `text`. Use `text` para saídas de terminal, registros e estruturas de pastas.

Não marque um bloco com determinada linguagem apenas porque um analisador a reconhece. Identifique o que o conteúdo realmente é.

## Mantenha as linhas dentro da largura imprimível

A falha de impressão mais comum é uma linha de código mais larga do que a página. No navegador, o bloco pode rolar lateralmente, mas no papel não há barras de rolagem, cortando a linha ou reduzindo o bloco.

Para formatos A4 ou Carta, um limite prático gira em torno de 80 a 90 caracteres por linha, mantendo a leitura monoespaçada agradável.

Quando uma linha for muito longa, ajuste o código-fonte em vez da escala de impressão:

```js
const message = buildMessage({ owner, repo, branch, path });
```

Essa linha permanece legível. Se o objeto tivesse mais propriedades, distribua-as em várias linhas:

```js
const message = buildMessage({
  owner,
  repo,
  branch,
  path,
});
```

Para comandos de shell use barras invertidas de continuação ou variáveis. Para URLs extensas, reserve uma linha própria.

## Defina como lidar com saídas e logs

Logs e saídas de terminal costumam ser mais largos que o código e contêm carimbos de data/hora ou caminhos que não podem ser quebrados arbitrariamente.

Estratégias eficazes para impressão:

- **Reduza a saída.** Exiba apenas as linhas pertinentes e utilize reticências na explicação.
- **Divida a transcrição.** Separe o comando e sua resposta em blocos distintos.
- **Use tabelas para dados estruturados.** Tabelas frequentemente imprimem melhor que blocos extensos de texto puro.
- **Reduza o tamanho da fonte apenas em último caso.** Mudar o tema impacta o documento inteiro.

Não cole um log de 200 linhas em um PDF a menos que o log seja o próprio documento.

## Combine o tratamento de código com o tema

Os quatro temas tratam o código de maneira distinta. Clean adota fundo claro e tipografia neutra. Business usa um bloco mais escuro que contrasta com o corpo serifado. Academic mantém o código discreto. Dark adapta-se para impressão com tintas claras e fundo legível.

Duas orientações práticas:

1. **Verifique o contraste no tema escolhido.** Um bloco que funciona em Clean pode parecer pesado em Business ou apagado em Academic.
2. **Ative os gráficos de plano de fundo ao imprimir.** Sem eles, o fundo do código desaparece e o bloco depende apenas da borda.

Se o documento contém muito código, Clean costuma ser a melhor escolha. Para um comparativo detalhado, consulte [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/).

## Revise a página impressa

Abra o PDF gerado e avalie cada bloco de código:

- **Linhas cortadas.** Inspecione a margem direita para garantir que nenhum comando foi truncado.
- **Blocos órfãos.** Evite que um bloco inicie com uma única linha no rodapé da página.
- **Recuos irregulares.** Confirme a consistência entre espaços e tabulações.
- **Linhas em branco mantidas.** Garanta que os espaçamentos lógicos foram preservados.
- **Contraste legível.** Teste em escala de cinza caso o documento venha a ser fotocopiado.
- **Tags no texto.** Se a linguagem for relevante para o leitor, mencione-a na explicação.

Um teste em outro navegador é recomendado antes de ampla distribuição.

O código é a seção de um documento com maior probabilidade de ser copiada. Mantenha-o enxuto, exato e contido na página. Para mais detalhes sobre a privacidade no navegador, veja [Markdown para PDF no navegador](/blog/browser-only-markdown-to-pdf/).
