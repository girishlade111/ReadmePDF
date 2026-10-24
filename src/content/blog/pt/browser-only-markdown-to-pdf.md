---
title: "Markdown para PDF no navegador: o que permanece no seu dispositivo"
description: "Como funciona a conversão local, quais requisições o md2pdf realiza e o que verificar antes de exportar Markdown confidencial ou interno."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Privacy", "Browser", "PDF", "Security"]
locale: "pt"
translationKey: "browser-only-markdown-to-pdf"
---

'Executado no seu navegador' é uma afirmação valiosa, mas não representa uma declaração completa de privacidade. Um navegador pode ler um arquivo local sem fazer upload e, ao mesmo tempo, solicitar dezenas de imagens remotas durante a pré-visualização.

O md2pdf é um site estático sem backend de aplicação. O processamento de Markdown, a higienização, o sumário, a pré-visualização e a paginação de livros são executados no dispositivo do visitante. Isso elimina a necessidade de envio para servidores externos, embora não torne o documento invisível para a rede.

Para o fluxo geral de conversão, veja [Como converter um README do GitHub para PDF](/blog/github-readme-to-pdf/). Para livros de múltiplos arquivos, consulte [Construir um livro Markdown com múltiplos arquivos](/blog/multi-file-markdown-book/).

## O que significa exatamente 'apenas no navegador'

No md2pdf, apenas no navegador significa que não existe um renderizador no servidor. O site é composto por HTML, CSS e JavaScript estáticos. Ao colar texto, ele permanece na memória da aba. Ao selecionar um arquivo, a File API do navegador o lê localmente sem qualquer envio para endpoints remotos.

Isso não significa que a página funcione de forma isolada e offline. O carregamento inicial baixa os arquivos do site e a importação do GitHub faz requisições anônimas à API pública do GitHub.

O compromisso é direto e transparente: **seu texto Markdown não é enviado à LadeStack, não há contas de usuário nem banco de dados de documentos no servidor.**

## O pipeline passo a passo

Um documento passa pelas seguintes etapas:

```text
source  ->  parse  ->  resolve  ->  render  ->  sanitize  ->  preview  ->  print
```

1. **Origem.** Leitura de texto colado, arquivo local ou README público do GitHub.
2. **Análise.** O markdown-it interpreta tabelas GFM, listas de tarefas e blocos de código.
3. **Resolução.** Para repositórios, imagens relativas apontam para raw.githubusercontent.com.
4. **Renderização.** Os dados estruturados são transformados em HTML.
5. **Higienização.** O DOMPurify elimina elementos inseguros (`script`, `iframe` etc.).
6. **Pré-visualização.** O HTML limpo é exibido com âncoras de títulos e sumário opcional.
7. **Saída.** Acionamento da impressão do navegador ou empacotamento em ZIP com pdf-lib.

Todas as fases após a leitura inicial acontecem no seu dispositivo.

## O que sai do navegador

Para arquivos locais ou texto colado, o md2pdf não transmite o conteúdo do documento para a internet, pois a aplicação não tem endpoints receptores.

Existem requisições normais durante o uso:

- **Recursos do site.** Download do HTML, CSS, fontes e scripts do provedor de hospedagem.
- **Importação do GitHub.** Chamadas anônimas à API do GitHub para obter o README e suas imagens.
- **Imagens remotas no seu Markdown.** Se o documento tiver links de imagens externas, o navegador as requisitará para exibi-las na pré-visualização.

Se o arquivo contiver `![dashboard](https://internal.example.test/chart.png)`, o texto permanece local, mas a requisição da imagem vai para o servidor remoto.

Links comuns só disparam requisições ao serem clicados, mas mídias embutidas são baixadas na renderização.

## Arquivos locais e Markdown colado

Os fluxos de trabalho locais oferecem a máxima privacidade:

- **Colar texto.** O conteúdo não sai da aba, a não ser que inclua imagens externas.
- **Arquivo local.** Processado na memória do navegador com limite de 2 MB sem envios externos.
- **Exemplo pronto.** O modelo padrão vem no pacote estático do site, sem requisições adicionais.

Caminhos relativos de imagens locais não carregarão sem um repositório de base. Utilize URLs absolutas ou aceite o ícone de imagem indisponível.

Para uma exportação totalmente desconectada, remova imagens externas antes de imprimir.

## Imagens remotas e links continuam sendo requisições de rede

O processamento no navegador resguarda o **texto do documento**, mas não intercepta **os recursos externos que o documento referencia**.

Veja o exemplo abaixo:

```markdown
![Architecture](./docs/architecture.png)

See the [operations guide](https://example.test/ops).
```

Na importação do GitHub, caminhos de imagens são convertidos para o host de conteúdo cru do GitHub. Em texto colado, URLs absolutas são requisitadas diretamente aos servidores de origem.

Antes de exportar documentos confidenciais, busque no texto por:

- Endereços de imagens com `http://` e `https://`
- Tags HTML `<img>`
- Folhas de estilo ou fontes externas
- Imagens em formato Data URI (não geram tráfego de rede adicional)

O DOMPurify remove scripts perigosos, mas preserva imagens normais por integrarem a documentação.

## Limites do GitHub e tratamento de falhas

A importação do GitHub lê dados públicos de forma anônima e possui limites de segurança:

- Tempo limite de **15 segundos** para chamadas de API.
- Tempo limite de **20 segundos** para obtenção de capítulos.
- Janela de **25 segundos** para varredura de repositórios.
- Fallback automático para download direto de conteúdo cru se a API for limitada.
- Imagens indisponíveis são substituídas por marcadores sem travar a exportação.

## Lista prática de privacidade

Antes de imprimir ou exportar relatórios confidenciais, revise:

- O documento não contém URLs de imagens apontando para servidores internos protegidos.
- O repositório público inserido está correto.
- Não foram deixadas chaves, senhas ou tokens privados no corpo do texto.
- A pré-visualização foi inspecionada antes de abrir a janela de impressão.
- A operação foi concluída no seu dispositivo sem o envio de arquivos para a nuvem.

Para orientações de estilo, confira [Temas de Impressão no md2pdf](/blog/readme-pdf-print-themes/).
