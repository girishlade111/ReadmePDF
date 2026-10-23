---
title: "Clean vs Business vs Academic vs Dark: qual tema do md2pdf usar?"
description: "Uma comparação prática dos quatro temas de impressão do md2pdf — tipografia, blocos de código, tabelas e os documentos ideais para cada um."
pubDate: 2026-10-14
author: "Girish Lade"
tags: ["Themes", "Design", "PDF"]
locale: "pt"
translationKey: "readme-pdf-print-themes"
---

O seletor de temas do md2pdf parece uma escolha pequena: quatro botões de opção acima do botão de exportar. Na prática, ele muda a forma como o documento é lido antes mesmo de alguém chegar ao conteúdo. Uma especificação impressa em Academic parece um artigo. Uma proposta de cliente impressa em Clean parece um despejo de repositório. O tema certo é o que corresponde às expectativas do leitor.

Os quatro temas renderizam o mesmo Markdown. Eles diferem na família tipográfica, no alinhamento, no tratamento do código, no estilo das tabelas, na cor dos links e na quantidade de estrutura visual que acrescentam aos títulos. Nenhum deles adiciona marca-d'água, capa ou logotipo. O conteúdo continua sendo seu.

## Temas são folhas de estilos de impressão, não trocas de cor

Cada tema é um conjunto de regras CSS aplicadas à folha de pré-visualização e levadas para a saída de impressão. Isso significa que o tema afeta:

- A fonte usada em títulos, texto corrido, tabelas e código.
- Se o texto corrido é alinhado à esquerda ou justificado.
- A cor e o peso das linhas dos títulos.
- Os fundos de blocos de código e de código em linha.
- O preenchimento do cabeçalho das tabelas e as cores das bordas.
- A cor dos links na pré-visualização e, quando o PDF a preserva, no arquivo exportado.

A folha de estilos de impressão também cuida das indicações de paginação: blocos de código, tabelas, citações e imagens evitam quebras ao meio quando possível, e os títulos evitam ficar isolados no fim de uma página.

Uma observação prática antes de compará-los: ative **Gráficos de plano de fundo** na caixa de diálogo de impressão do navegador se quiser que os preenchimentos dos blocos de código e as cores do cabeçalho das tabelas sobrevivam. Sem isso, o PDF continua legível, mas Business e Dark perdem parte de sua estrutura. A escolha fica na caixa de diálogo de impressão, não no aplicativo.

## Clean: o padrão para documentos técnicos

Clean é a opção neutra. Usa a pilha sem serifa da interface em todo o documento, com texto cinza-escuro sobre branco e um fundo cinza-claro para o código. Os títulos são separados por uma linha fina, e os links usam o mesmo azul-petróleo usado no restante do produto.

**Funciona melhor para:**

- READMEs de repositório e especificações técnicas.
- Documentação interna de engenharia.
- Folhetos e runbooks com muito código.
- Documentos que serão lidos na tela com a mesma frequência que no papel.
- Registros de auditoria em que a neutralidade importa mais que o acabamento.

**Fique atento a:**

- Textos muito longos podem parecer sem vida. Clean é eficiente, não acolhedor.
- O fundo claro do código depende dos gráficos de plano de fundo na impressão. Se estiverem desativados, os blocos de código continuam legíveis, mas perdem a separação visual do texto corrido.
- Texto corrido sem serifa em tamanhos pequenos de impressão pode ser menos confortável que uma serifa em leituras longas.

Clean é o padrão mais seguro porque não impõe um tom. Se você está exportando um README para outro engenheiro, comece por ele.

## Business: relatórios, propostas e entregas para clientes

Business leva o documento a um registro mais formal. Usa tipografia com serifa em todo o texto, títulos em azul-marinho com uma linha mais pesada, um bloco de código escuro e um cabeçalho de tabela com tom. O resultado parece mais um relatório que um README, o que é exatamente o ponto quando o público é um cliente, um gestor ou uma parte interessada de outra área.

**Funciona melhor para:**

- Entregas a clientes e visões gerais de projetos.
- Propostas, declarações de escopo e relatórios.
- Folhetos de workshop que devem parecer projetados.
- Anexos de portfólio e amostras de candidatura.
- Documentos em que diagramas e tabelas pesam tanto quanto o texto.

**Fique atento a:**

- O bloco de código escuro é um elemento visual forte. Um documento com muitos trechos curtos de código pode começar a parecer listrado.
- A tipografia com serifa e o espaçamento quase justificado fazem URLs longas e identificadores de código se destacarem. Mantenha as linhas de código curtas.
- Os gráficos de plano de fundo importam aqui. Sem eles, o bloco de código escuro vira um bloco simples e o cabeçalho da tabela perde o tom.
- Business não substitui a edição. Um changelog bruto em Business continua parecendo um changelog bruto.

Para documentos externos, Business costuma causar a melhor primeira impressão. Ele sinaliza que o PDF foi preparado para um leitor, e não exportado sem cuidado.

## Academic: textos longos e material de curso

Academic usa uma face com serifa, texto corrido justificado e um tratamento de código mais quente e claro. Os títulos permanecem alinhados à esquerda para que a estrutura continue fácil de percorrer mesmo com os parágrafos justificados. O efeito geral fica mais próximo de uma apostila de curso ou de um artigo do que de uma página de produto.

**Funciona melhor para:**

- Apostilas, pacotes de leitura e notas de aula.
- Artigos e relatórios de pesquisa.
- Documentação longa com poucos blocos de código.
- Candidaturas a financiamento e portfólios acadêmicos.
- Qualquer documento em que o leitor espere ler de forma contínua, em vez de apenas percorrer rapidamente.

**Fique atento a:**

- Texto justificado pode criar espaços largos ao redor de URLs longas, identificadores de código e termos técnicos. Quebre links longos em links no estilo de referência ou mova-os para uma lista.
- Os blocos de código são legíveis, mas visualmente mais discretos que em Business. Isso é intencional: Academic assume que o código é material de apoio, não o evento principal.
- As tabelas podem ficar apertadas em A4 se tiverem muitas colunas. Reduza o número de colunas ou passe os detalhes para o texto.
- Academic não combina com um guia de configuração rápida. O formato diz “leia do início ao fim”, e um runbook normalmente é consultado por partes.

Se o documento tiver uma seção parecida com uma bibliografia, a tipografia do Academic a deixa à vontade. O aplicativo não formata citações, então mantenha a seção de referências no Markdown.

## Dark: revisão na tela, saída segura para impressão

Dark é o diferente dos outros. Ele foi projetado primeiro para uma leitura confortável na tela: fundo azul-marinho escuro, texto claro e uma cor de link mais brilhante. Ao imprimir, a folha de estilos de impressão força fundo branco, texto preto, links pretos e blocos de código claros. O PDF não leva o tema escuro da tela para o papel.

**Funciona melhor para:**

- Revisar um README longo na tela antes de exportar.
- Leitura à noite ou com pouca luz.
- Conferir como o documento é lido sem o ruído visual de uma página branca.
- Produzir um PDF a partir de uma equipe que prefere ferramentas em modo escuro.

**Fique atento a:**

- O que você vê na tela não é o que recebe no PDF. Sempre abra o arquivo exportado para confirmar o tratamento claro de impressão.
- Dark não é um tema de marca para documentos externos. Um cliente espera que o PDF corresponda à saída de impressão, não à pré-visualização.
- Se o navegador estiver configurado para imprimir planos de fundo, a folha de estilos de impressão ainda sobrescreve as superfícies escuras, mas os blocos de código podem precisar de uma conferência visual.
- O contraste de tela do tema pode esconder uma estrutura fraca no código-fonte. Um documento com títulos pulados continua com aparência dramática; ele não fica mais bem organizado.

Pense no Dark como um modo de leitura com uma saída segura para impressão, não como uma quarta identidade visual do documento final.

## Comparação lado a lado

| | Clean | Business | Academic | Dark |
| --- | --- | --- | --- | --- |
| Texto corrido | Sem serifa | Com serifa | Com serifa, justificado | Sem serifa na tela; claro na impressão |
| Tratamento dos títulos | Linha fina | Linha azul-marinho | Serifa alinhada à esquerda | Linha clara no escuro; segura para impressão |
| Blocos de código | Cinza-claro | Azul-marinho escuro | Claro e quente | Escuro na tela; claro na impressão |
| Cabeçalhos de tabela | Neutros | Azul com tom | Neutros | Escuros na tela; claros na impressão |
| Cor dos links | Azul-petróleo | Azul | Preto | Azul brilhante na tela; preto na impressão |
| Melhor público | Engenheiros | Clientes, gestores | Acadêmicos, estudantes | O autor, na tela |
| Melhor documento | Especificação, README, runbook | Relatório, proposta, folheto | Artigo, apostila | Cópia para revisão |

A tabela é um ponto de partida, não uma regra. Um cliente técnico pode preferir Clean. Uma equipe de engenharia atenta ao design pode preferir Business. A função do documento importa mais que sua categoria.

## Como o tema interage com o restante da exportação

O tema é apenas uma parte do resultado impresso. Vale conferir estas interações:

**Índice.** O índice herda a tipografia e a cor dos links do documento. Em Business, os títulos azul-marinho e os links azuis fazem com que ele pareça a página de sumário de um relatório. Em Academic, ele parece o esboço de um artigo. O índice é gerado para documentos com três ou mais títulos, e você pode desativá-lo se o documento for curto.

**Blocos de código.** Clean e Academic usam fundos claros de código; Business usa um bloco escuro; Dark usa um bloco escuro na tela e um bloco claro na impressão. Linhas longas são um problema maior que a cor. Uma linha de 120 caracteres vai transbordar independentemente do tema.

**Tabelas.** Business acrescenta um cabeçalho com tom; Clean e Academic permanecem neutros. Tabelas largas são a falha de impressão mais comum. Se uma tabela tiver mais de cinco ou seis colunas, considere dividi-la ou reduzir o tamanho da fonte no código-fonte em vez de diminuir a escala de impressão.

**Imagens e badges.** Os temas não alteram a renderização das imagens, mas mudam o espaço em branco ao redor. O texto com serifa do Business pode fazer uma captura de tela parecer mais uma figura; o texto sem serifa do Clean faz com que pareça documentação. Imagens quebradas são marcadas na pré-visualização e não abortam a exportação.

**Links.** Clean e Business usam links azuis; Academic usa preto; Dark usa azul brilhante na tela e preto na impressão. Se o PDF for impresso em escala de cinza, a diferença de cor desaparece, então escreva textos de link descritivos em vez de confiar na cor.

**Quebras de página.** A folha de estilos de impressão impede que blocos de código, tabelas, citações e imagens se quebrem no meio de um elemento quando possível, e mantém os títulos junto ao conteúdo que os segue. Esse comportamento é compartilhado por todos os temas, mas importa mais em Academic, onde textos longos produzem mais transições de página.

## Escolha em 30 segundos

Use este caminho rápido de decisão:

1. **O leitor é um engenheiro que vai procurar comandos e código?** Escolha Clean.
2. **O leitor é um cliente, gestor ou revisor que espera um relatório?** Escolha Business.
3. **O documento é um texto longo com poucos blocos de código?** Escolha Academic.
4. **Você lê principalmente na tela e exporta depois?** Escolha Dark e confira o PDF.
5. **Ainda em dúvida?** Escolha Clean. É o que tem menos chance de representar mal o documento.

Um teste útil: exporte as duas primeiras páginas em dois temas candidatos e leia-as em um celular. O tema que sobrevive a uma tela pequena e a uma leitura rápida costuma ser o certo.

## Verificações antes da exportação que importam mais que o tema

Nenhum tema corrige estes pontos:

- **Hierarquia de títulos.** Use `##` para seções principais e `###` para subseções. Níveis pulados produzem um índice confuso.
- **Comprimento das linhas de código.** Mantenha as linhas com cerca de 80–90 caracteres quando possível.
- **Largura da tabela.** Menos colunas, rótulos mais curtos ou uma tabela dividida.
- **Caminhos de imagem.** Imagens relativas ao repositório exigem uma busca no repositório; Markdown colado exige URLs absolutas.
- **Texto confidencial.** A conversão é local, mas o PDF ainda pode ser encaminhado.
- **Tamanho da página.** A4 e Letter paginam de forma diferente. Escolha o que o destinatário vai imprimir.
- **Gráficos de plano de fundo.** Ative se os preenchimentos dos blocos de código e os cabeçalhos das tabelas forem importantes para o design.

## A recomendação

Para a maioria das exportações de README, **Clean** é o padrão certo. É neutro, legível e não finge que o documento é algo que não é. Use **Business** quando o PDF for uma entrega para alguém fora da engenharia. Use **Academic** quando o documento se destinar a ser lido como texto corrido. Use **Dark** quando quiser uma revisão confortável antes de produzir o PDF final claro.

O tema é um sinal para o leitor. Escolha o sinal que corresponde à tarefa e depois dedique o esforço restante ao conteúdo: uma abertura clara, uma estrutura sensata de títulos e imagens que realmente carreguem. Essas escolhas sobrevivem a qualquer tema.

Para o fluxo completo de exportação, veja [Como converter um README do GitHub em PDF](/blog/github-readme-to-pdf/). Para preparação específica por público, veja [7 casos de uso práticos para transformar um README em PDF](/blog/readme-to-pdf-use-cases/).
