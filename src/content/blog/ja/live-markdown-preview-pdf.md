---
title: "リアルタイムプレビューによるMarkdownの表示確認とPDF出力"
description: "md2pdfのリアルタイムプレビュー機能：GitHub準拠Markdownの描画、HTMLサニタイズ、印刷スタイルの即時反映とレイアウト検証。"
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Preview","HTML","Security"]
locale: "ja"
translationKey: "live-markdown-preview-pdf"
---

事前のプレビュー確認なしにPDFを出力するのは、当てずっぽうの作業になりがちです。表の幅を調整して出力し、外部ビューアで確認すると、見出しがページの最下部にポツンと取り残されていることがよくあります。この修正ループを繰り返すのは大きな時間の無駄です。

md2pdfは、左右に並んだリアルタイムプレビュー画面によってこの課題を解決します。文字を入力、貼り付け、あるいはインポートすると、印刷用CSSが適用された整形済みドキュメントが即座に描画されます。画面上で確認したフォント、余白、見出し配置が、そのまま印刷用PDFに反映されます。

本ガイドでは、プレビュー処理の仕組み、DOMPurifyによる安全性確保、印刷前のレイアウト検証手順を解説します。テキスト編集の基本については[Markdown貼り付け・編集ガイド](/ja/blog/markdown-editor-paste-pdf/)も併せてご覧ください。

## Why live preview matters for print-bound documents

一般的なWebブラウザとPDF印刷エンジンとでは、CSSの解釈が異なります。通常の画面は縦に無限スクロールしますが、印刷物には物理的なページの境界が存在します。

- **改ページの制約**: 表、画像、コードブロックは各ページの高さに収まる必要があります。
- **フォントの視認性**: 印刷解像度（300 DPI）において、見出しや本文のサイズが読みやすく保たれているか確認が必要です。
- **印刷余白の境界**: 余白を超えた要素はスクロールできず、単純に切り落とされてしまいます。

印刷専用CSSを適用したリアルタイムプレビューを見ることで、印刷ダイアログを開く前にレイアウトの崩れを素早く発見できます。

## How the client-side preview pipeline renders Markdown

md2pdfの描画処理は、わずか数ミリ秒でMarkdown文字列をDOM要素へ変換します。

```javascript
const rawHtml = markdownParser.render(markdownSource);
const cleanHtml = DOMPurify.sanitize(rawHtml, sanitizeConfig);
previewElement.innerHTML = cleanHtml;
applyHeadingAnchors(previewElement);
```

パーサーはCommonMarkおよびGitHub-Flavored Markdown仕様に準拠しており、取り消し線、自動リンク、タスクリスト、構文ハイライト付きコードブロックを忠実に描画します。

## HTML sanitization and safety filters

外部のリポジトリや信頼できないソースからMarkdownを取り込む場合、セキュリティの確保は不可欠です。Markdownには生のHTMLタグを記述できるため、XSSなどの脆弱性に注意する必要があります。

md2pdfでは、変換されたすべてのHTML文字列をDOMPurifyによって厳格にサニタイズしています。

- **危険なタグの排除**: `<script>`、`<iframe>`、`<object>`、`<form>`タグは完全に除去されます。
- **属性のクリーンアップ**: `onclick`や`onload`といったJavaScriptイベントハンドラは自動削除されます。
- **プロトコルの検証**: `javascript:`や`data:text/html`などの不正なリンクは無効化されます。
- **許可されたタグ**: 書式設定に必要な安全なタグ（`<b>`、`<code>`、`<table>`、`<img>`など）のみが残されます。

このサニタイズ処理は、プレビュー画面に要素が挿入される前にすべてブラウザ内で完結します。

## Previewing print themes and theme transitions

md2pdfには、Clean、Business、Academic、Darkの4種類の印刷テーマが用意されています。ツールバーでテーマを切り替えると、プレビュー画面のCSSクラスが即座に変更されます。

- **Clean**: システムフォントを活かした明快でモダンなサンセリフ書体。
- **Business**: 明瞭な罫線と区切り線を備えた実用的なテクニカル文書向け。
- **Academic**: 番号付き見出しと適度な行間を持つ、伝統的なセリフ体レイアウト。
- **Dark**: 画面上では目に優しいダークモード表示となり、印刷時には自動的にインクを節約する白背景へ変換。

各テーマのフォントや余白設定の詳細は、[md2pdf印刷テーマ徹底解説](/ja/blog/readme-pdf-print-themes/)をご参照ください。

## Differences between screen preview and print output

画面プレビューは印刷結果を忠実に再現しますが、ディスプレイと実際の紙面にはわずかな違いがあります。

- **表示幅の差**: プレビューはブラウザのウィンドウ幅に合わせて伸縮しますが、印刷時はA4やLetterなどの固定用紙サイズに固定されます。
- **改ページの分割**: プレビューは1つの連続した画面ですが、印刷エンジンはCSSの`break-inside: avoid`に従って物理ページに分割します。
- **カラーバランス**: ディスプレイのRGB発色に比べ、紙へのトナーやインク出力はわずかに落ち着いた濃い色合いになる傾向があります。

## Diagnosing preview rendering glitches

- **プレビューが更新されない**: 閉じられていないHTMLタグや極端に巨大なインライン画像データがないか確認してください。
- **表が横にはみ出す**: 列数が多い幅広の表は、[MarkdownテーブルのPDF出力術](/ja/blog/markdown-tables-to-pdf/)を参考に幅を調整してください。
- **画像が表示されない**: 画像リンクがHTTPSの絶対URLになっているか確認するか、[GitHub READMEインポート機能](/ja/blog/github-readme-to-pdf/)でリポジトリ内画像を自動解決してください。

リアルタイムプレビューを活用し、意図通りの綺麗なPDFを[md2pdf](/#converter)で手軽に作成しましょう。
