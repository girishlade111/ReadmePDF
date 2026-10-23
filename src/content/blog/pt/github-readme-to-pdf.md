---
title: "Como converter um README do GitHub em PDF (grátis, sem login)"
description: "Guia passo a passo para transformar um README público do GitHub em um PDF limpo e pronto para imprimir com o md2pdf — sem conta, sem envio e sem renderizador no servidor."
pubDate: 2026-09-18
updatedDate: 2026-10-21
author: "Girish Lade"
tags: ["GitHub", "README", "PDF", "Tutorial"]
featured: true
locale: "pt"
translationKey: "github-readme-to-pdf"
---

Um README é escrito para o navegador: ele rola, aponta para fora e pressupõe que o leitor possa clicar pelo repositório. No momento em que você precisa enviar a documentação a um cliente, anexá-la a um trabalho, arquivar uma versão ou entregá-la a alguém que não vai clonar o repositório, o PDF é o formato que circula.

Imprimir uma página do GitHub diretamente costuma produzir uma bagunça. A navegação do site, as barras laterais e o rodapé vão junto. Blocos de código largos são cortados. Imagens relativas quebram porque o navegador não está mais lendo a partir da raiz do repositório. Tabelas longas se dividem de forma desajeitada entre as páginas. O md2pdf existe para resolver esses problemas específicos sem pedir que você crie uma conta ou envie seu arquivo-fonte para um servidor.

Este guia percorre o fluxo completo, de colar a URL de um repositório à conferência do PDF exportado, e explica o que a ferramenta faz em cada etapa.

## Por que o botão Imprimir do navegador não basta

A interface web do GitHub é um aplicativo web, não uma folha de estilos de impressão. Quando você pressiona `Ctrl+P` em uma página de repositório, o navegador tenta imprimir a página inteira: o cabeçalho, a árvore de arquivos, a barra lateral “Sobre”, os widgets de feedback e tudo o mais que estiver no layout. Parte disso pode ser ocultada com uma folha de estilos de impressão personalizada, mas você não pode alterar a marcação do GitHub de fora.

Há outros três problemas recorrentes:

- **Caminhos de imagem relativos.** Um README com `![diagram](docs/architecture.png)` funciona no GitHub porque a imagem é resolvida em relação ao repositório. Uma página impressa do navegador não tem contexto confiável de repositório, então a imagem pode desaparecer.
- **Código e tabelas largos.** Blocos de código e tabelas comparativas são mais largos que uma página impressa. Sem regras específicas de impressão, eles encolhem até ficarem ilegíveis ou são cortados.
- **Paginação.** Títulos, blocos de código e linhas de tabela precisam evitar quebras desajeitadas. A impressão bruta do navegador raramente lida bem com isso.

O md2pdf busca o Markdown bruto do README, resolve URLs relativas ao repositório, renderiza Markdown com sabor do GitHub, sanitiza o resultado e aplica uma folha de estilos de impressão antes de abrir a caixa de diálogo de impressão do navegador. A saída continua sendo produzida pelo mecanismo nativo “Salvar como PDF” do navegador, mas o documento que ele recebe já está limpo.

## O que o md2pdf muda

O pipeline de conversão roda inteiramente no navegador. Na prática:

1. Você fornece a URL de um repositório público do GitHub, um arquivo Markdown local ou Markdown colado.
2. Para um repositório, o aplicativo descobre a branch padrão e tenta um conjunto de nomes comuns de README, incluindo arquivos dentro de `.github/`.
3. Caminhos de imagem relativos são reescritos para `raw.githubusercontent.com`, e links de documento são reescritos para a visualização blob do GitHub.
4. O Markdown é renderizado com suporte a GFM: tabelas, listas de tarefas, tachado, código delimitado e links automáticos.
5. O HTML é sanitizado com DOMPurify antes de chegar à pré-visualização.
6. Um índice é gerado quando o documento tem pelo menos três títulos.
7. A folha de estilos de impressão do tema escolhido é aplicada, e o navegador abre sua caixa de diálogo de impressão.

Nenhum arquivo é enviado. As únicas requisições de saída são leituras anônimas do repositório público que você solicitou, além da chamada à API do GitHub usada para descobrir a branch padrão. Repositórios privados não são compatíveis nesta versão.

## Antes de começar

Você precisa de:

- Um repositório do GitHub **público**, ou um arquivo Markdown local, ou um bloco de Markdown para colar.
- Um navegador moderno. Chrome, Edge, Firefox e Safari têm suporte a “Salvar como PDF” em suas caixas de diálogo de impressão.
- Cerca de dois minutos para um documento curto, e mais tempo se você pretende revisar o PDF página por página.

Se o repositório for privado, a busca falhará. O recurso manual continua funcionando: copie o texto do README, cole no editor e use URLs absolutas de imagem.

## Etapa 1: informe um repositório à ferramenta

Abra o conversor e cole a URL do repositório no campo **URL do repositório no GitHub**. O md2pdf aceita mais do que a URL canônica:

```text
https://github.com/owner/repo
https://github.com/owner/repo.git
github.com/owner/repo
owner/repo
https://github.com/owner/repo/tree/main/docs
https://github.com/owner/repo/blob/main/README.md
```

Todas essas formas levam ao mesmo par `owner/repo`. URLs sem protocolo e a forma abreviada `owner/repo` são úteis quando você copia de um terminal ou de uma mensagem de chat. Segmentos extras de caminho são aceitos por conveniência, mas ignorados: o aplicativo ainda lê o README da raiz do repositório na branch padrão, não o arquivo aninhado mostrado na URL. Se o arquivo aninhado for o que você precisa, cole o Markdown dele diretamente.

Pressione **Buscar** ou tecle `Enter`. Se o campo estiver vazio, o aplicativo informa o que espera em vez de não fazer nada silenciosamente.

## Etapa 2: deixe-o buscar e resolver o README

O aplicativo primeiro pergunta à API do GitHub qual é a branch padrão do repositório. Em seguida, tenta uma lista de nomes de README nessa branch, incluindo variações comuns de maiúsculas/minúsculas e o local `.github/README.md`. Se a API estiver com limite de requisições, a busca bruta ainda pode continuar, e é por isso que uma falha temporária da API nem sempre encerra o fluxo.

Quando o Markdown chega, a pré-visualização é atualizada. É o momento de verificar três coisas:

- **Imagens.** Imagens relativas ao repositório devem aparecer. Se alguma não aparecer, ela pode apontar para um ativo privado, para um caminho que não existe ou para uma URL absoluta que bloqueia hotlinking.
- **Blocos de código.** Blocos com linguagem indicada são renderizados como código. Linhas muito largas terão rolagem na pré-visualização, mas ainda precisam de uma conferência na impressão.
- **Links.** Links de documento são reescritos para a visualização blob do GitHub para continuarem significativos no PDF. Links externos abrem em uma nova aba na pré-visualização.

Se uma imagem falhar, o md2pdf a marca como quebrada e segue em frente. A exportação não falha porque um badge está indisponível. Isso é intencional: um badge ausente costuma ser menos importante que o restante do documento.

## Etapa 3: escolha um tema que combine com o documento

Há quatro temas de impressão:

- **Clean** é o padrão. Usa tipografia sem serifa neutra e é a escolha mais segura para especificações, READMEs técnicos e documentos com muito código.
- **Business** usa tipografia com serifa e um bloco de código escuro. Combina com relatórios, propostas e entregas para clientes.
- **Academic** usa páginas justificadas com serifa e um tratamento claro para código. Foi pensado para textos longos, apostilas de curso e submissões no estilo de artigos.
- **Dark** é um tema pensado para a tela. A pré-visualização é escura para uma leitura confortável, e a folha de estilos de impressão força tinta clara e fundos claros de código para que o PDF continue legível.

Para uma comparação mais detalhada, veja [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/). Na maioria das primeiras exportações, comece com Clean e só troque se o documento tiver uma expectativa clara de público.

## Etapa 4: decida se o índice ajuda

O índice automático vem ativado por padrão e é gerado quando o documento tem três ou mais títulos. Ele usa slugs de título estáveis e exclusivos, então as entradas levam às seções corretas na pré-visualização.

Mantenha-o quando:

- O documento tiver mais de algumas páginas.
- O leitor precisar saltar para uma seção específica.
- Você estiver entregando o PDF a alguém que talvez imprima apenas parte dele.

Desative-o quando:

- O README for curto e o bloco de índice adicionar mais ruído do que navegação.
- O documento já tiver um índice escrito à mão.
- Você estiver produzindo um folheto de uma página.

O botão afeta a pré-visualização e a saída de impressão. Não há uma configuração separada só para o PDF.

## Etapa 5: imprima em PDF com as configurações certas

Clique em **Baixar / Imprimir PDF** no painel de pré-visualização ao vivo. O aplicativo chama a caixa de diálogo de impressão do navegador. Nela:

1. Defina **Destino** como **Salvar como PDF** (ou o equivalente no seu navegador).
2. Escolha **A4** ou **Letter** de acordo com a região do destinatário.
3. Deixe **Margens** no padrão, a menos que você tenha um padrão visual da empresa. A folha de estilos de impressão já define as margens da página.
4. Mantenha **Escala** em 100% na primeira tentativa. Se uma tabela larga ou um bloco de código for cortado, reduza ligeiramente a escala em vez de diminuir a fonte no código-fonte.
5. Ative **Gráficos de plano de fundo** se o navegador oferecer a opção. Os detalhes do tema, os fundos dos blocos de código e o preenchimento do cabeçalho das tabelas dependem das cores de fundo. Sem eles, o PDF continua legível, mas Business e Dark perdem parte de sua estrutura visual.
6. Desative **Cabeçalhos e rodapés** do navegador, a menos que você queira especificamente a URL e os números de página. Eles não fazem parte do design do documento.
7. Salve o arquivo com um nome descritivo, por exemplo `owner-repo-readme-2026-10.pdf`.

Os rótulos exatos variam conforme o navegador. No Chrome e no Edge, os gráficos de plano de fundo ficam em “Mais configurações”. No Firefox, procure “Imprimir planos de fundo”. O Safari expõe menos controles; confira a pré-visualização antes de salvar.

## Etapa 6: confira o PDF antes de enviar

Abra o PDF salvo e procure os problemas que a impressão revela:

- **Quebras de página.** Um título não deve ficar sozinho no fim de uma página. Blocos de código, tabelas e imagens não devem ser divididos ao meio.
- **Conteúdo largo.** Linhas longas de código e tabelas são os culpados mais comuns por transbordamento. Se estiverem cortadas, encurte as linhas no código-fonte ou reduza a escala de impressão.
- **Links.** Clique em alguns links do PDF. Os links blob do GitHub devem abrir a visualização correta do arquivo.
- **Imagens.** Confirme se diagramas e badges sobreviveram. Um ativo privado ausente não se corrigirá sozinho no PDF.
- **Metadados.** O título e o autor do documento vêm do README e das configurações de metadados de impressão do navegador, não de um formulário dedicado de metadados de PDF. Dê um nome claro ao arquivo.
- **Legibilidade.** Imprima uma página em 100% e verifique se o texto corrido é confortável. O texto justificado do Academic e a tipografia com serifa do Business podem parecer diferentes no papel e na tela.

## Quando a busca falha

O aplicativo converte falhas de busca em mensagens acionáveis. Os casos comuns:

| O que você vê | O que geralmente significa | O que fazer |
| --- | --- | --- |
| Repositório não encontrado ou privado | A URL está errada ou o repositório exige autenticação | Confira a URL; cole o Markdown manualmente se o repositório for privado |
| Nenhum README encontrado | O repositório não tem README na branch padrão, em `main` ou em `master` | Envie o arquivo ou cole o Markdown |
| Limite de requisições do GitHub atingido | Muitas requisições à API não autenticada | Aguarde cerca de um minuto e tente novamente; a busca bruta ainda pode funcionar |
| Falha na busca ou tempo esgotado | Problema de rede ou a requisição excedeu o tempo limite de 15 segundos | Tente novamente; o caminho de colar manualmente continua funcionando |

Se a busca falhar, o editor mantém o que você já digitou. Você pode mudar para o modo de colar ou enviar sem perder a página.

## Cole ou envie em vez de buscar

A busca no GitHub é conveniente, mas não é a única entrada. O conversor também aceita:

- **Enviar** um arquivo `.md`, `.markdown` ou `.txt` de até 2 MB.
- **Colar** Markdown diretamente no editor. A pré-visualização é renderizada novamente após um pequeno atraso enquanto você digita.
- **Carregar o exemplo** para ver como tabelas, listas de tarefas e blocos de código são tratados.

Uma ressalva: caminhos relativos de imagem só são resolvidos quando um repositório foi buscado primeiro. Markdown enviado ou colado não tem uma base de repositório, então use URLs absolutas de imagem nesse modo. Todo o resto — títulos, tabelas, código, listas de tarefas — funciona da mesma forma.

## Cinco ajustes no código-fonte que melhoram toda exportação

O PDF é tão bom quanto o Markdown de origem. Estas mudanças dão retorno imediato:

1. **Use uma hierarquia real de títulos.** Comece as seções em `##`, use `###` para subseções e evite pular níveis. O índice e a folha de estilos de impressão dependem da estrutura.
2. **Dê um texto alternativo útil às imagens.** Isso é bom para acessibilidade e oferece ao PDF uma alternativa legível quando uma imagem não puder carregar.
3. **Delimite o código com uma linguagem.** Blocos com linguagem indicada são renderizados de forma mais previsível que código indentado, especialmente quando as linhas são longas.
4. **Mantenha as tabelas estreitas.** Uma tabela com oito colunas não caberá em A4 sem encolher. Passe os detalhes para o texto ou divida a tabela.
5. **Prefira caminhos relativos para ativos do repositório.** O md2pdf os reescreve corretamente. Links absolutos para uma máquina local ou um bucket privado não sobreviverão à viagem.

## Privacidade: o que sai do seu navegador

O md2pdf não envia seu Markdown. Renderização, sanitização, geração de índice e exportação em PDF acontecem localmente. Em uma busca de repositório, as únicas requisições de saída são leituras anônimas no GitHub do README público e de suas imagens. Não há contas, cookies nem análises vinculadas à conversão.

Isso importa quando o documento contém notas internas, nomes de clientes ou planos não divulgados. Você pode colar Markdown sensível e exportá-lo sem enviar o texto a um serviço de conversão de terceiros. O mesmo vale para arquivos locais: o arquivo é lido pelo seu navegador, não enviado.

## A versão curta

Cole a URL de um repositório público, pressione Buscar, confirme a pré-visualização, escolha um tema, deixe o índice ativado para documentos longos e imprima em PDF com os gráficos de plano de fundo ativados. Confira as quebras de página e os blocos de código largos antes de enviar o arquivo. Se a busca falhar, cole ou envie o Markdown e continue.

Todo o fluxo foi pensado para ser entediante: sem conta, sem fila, sem envio e sem renderizador no servidor. Só um README, uma folha de estilos de impressão e um PDF que você pode entregar a alguém.
