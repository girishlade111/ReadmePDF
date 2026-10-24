---
title: "Incorporando Fontes Unicode Multilíngues em PDFs Markdown sem Tofu"
description: "Aprenda como o md2pdf incorpora fontes Unicode via fontkit e pdf-lib para renderizar caracteres CJK, cirílico, turco e acentos sem glifos corrompidos."
pubDate: 2026-03-24
tags: ["markdown","fonts","multilingual","pdf"]
locale: "pt"
translationKey: "multilingual-markdown-pdf-fonts"
---

Uma falha constante em conversores simples de Markdown para PDF é a perda de caracteres ao processar idiomas internacionais. Quando o leitor de PDF encontra caracteres em chinês, japonês, coreano (CJK), cirílico ou termos com acentuação gráfica sem as fontes embutidas, exibe caixas retangulares vazias conhecidas como "tofu". No [md2pdf](/#converter), a incorporação completa de fontes Unicode garante que sua documentação seja apresentada com extrema clareza em qualquer tela.

Este artigo explica o funcionamento da inclusão de fontes no navegador com `pdf-lib` e `@pdf-lib/fontkit`, a otimização de subconjuntos de glifos e a eliminação definitiva de caracteres quebrados.

## As barreiras tipográficas do Unicode em documentos PDF

O padrão PDF original define apenas 14 fontes básicas (como Helvetica e Times), restritas ao alfabeto latino sem suporte amplo a caracteres internacionais.

- **O fenômeno do "tofu"**: Caracteres sem correspondência na fonte padrão viram caixas vazias (□), prejudicando a leitura técnica.
- **O desafio dos alfabetos CJK**: As línguas do Leste Asiático reúnem dezenas de milhares de ideogramas, exigindo um mecanismo inteligente de empacotamento vetorial.
- **Diacríticos e acentuação**: Alfabetos como o turco (ç, ğ, ı, ö, ş, ü) e o cirílico eslavo demandam suporte tipográfico preciso para assegurar a legibilidade.

```text
Multilingual Glyph Coverage in md2pdf:
- Latin & Extended Latin: English, Spanish, French, Portuguese, Turkish
- Cyrillic Alphabets:     Russian, Ukrainian, Bulgarian
- East Asian Ideographs:  Simplified Chinese (简体中文), Japanese (日本語)
- Hangul Syllables:       Korean (한국어)
```

## Processamento de alta fidelidade com @pdf-lib/fontkit

O md2pdf utiliza a biblioteca `@pdf-lib/fontkit` para interpretar tabelas de fontes TrueType (TTF) e OpenType (OTF) dentro do seu próprio navegador:

1. **Carga no navegador**: Tipografias de alta qualidade (como Noto Sans, Source Han Sans e Roboto Mono) são obtidas sob demanda com base no idioma do documento.
2. **Mapeamento de glifos**: O motor `fontkit` inspeciona os pontos de código Unicode no Markdown e localiza seu traçado vetorial exato na fonte.
3. **Inclusão na estrutura binária**: O `pdf-lib` grava as curvas vetoriais no PDF, tornando-o totalmente autossuficiente.

## Suporte tipográfico nativo para todos os nove idiomas

O md2pdf garante excelência gráfica em todas as nove línguas atendidas pela plataforma:

- **Português, espanhol, francês e inglês**: Tipografia ocidental refinada, com suporte a acentos agudos, circunflexos, graves, tis e cedilhas.
- **Turco**: Renderização impecável do "i" com ponto e sem ponto (`İ` / `i`, `I` / `ı`) e consoantes sonoras especiais.
- **Russo (Cirílico)**: Caracteres cirílicos com excelente proporção visual e harmonia com títulos em latim.
- **Japonês, chinês e coreano**: Cobertura abrangente para kanjis, hanzi e sílabas hangul com espaçamento regular.

## Autonomia e portabilidade para leitura offline

Como os desenhos vetoriais dos caracteres estão fisicamente integrados ao arquivo PDF:

O documento resultante pode ser aberto em qualquer computador, tablet ou celular com a certeza de que a apresentação visual será exatamente a mesma planejada por você, dispensando a instalação de fontes adicionais no aparelho do leitor.

## Produzindo documentações internacionais no md2pdf

Seja para compilar uma documentação técnica em japonês, um guia de infraestrutura em russo ou relatórios em português, o md2pdf gerencia a tipografia com precisão automática. Importe seus textos e gere arquivos PDF com fidelidade visual absoluta.
