---
title: "ローカルMarkdownファイルをブラウザ内で安全にPDFへ変換する方法"
description: "ローカルの.mdファイルを外部サーバーに送信することなくPDFに変換する手順：ドラッグ＆ドロップ、制限事項、文字コード、クライアント側処理。"
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Upload","PDF","Security"]
locale: "ja"
translationKey: "markdown-file-upload-to-pdf"
---

ローカルのMarkdownファイルをPDF化する際に、機密文書を外部サーバーに送信する必要はありません。多くのオンライン変換サービスでは、文書がバックエンドにアップロードされ、処理や保存が行われます。

md2pdfはブラウザ標準の`FileReader` APIを採用しています。ローカルの`.md`ファイルを選択するか画面にドラッグ＆ドロップすると、内容はブラウザのメモリ内だけで読み込まれます。端末外部へデータが送信されることはないため、社内仕様書や提案書も安心です。

本ガイドでは、対応拡張子、サイズ制限、文字コード、アップロード時のトラブルシューティングを解説します。テキストを直接貼り付けたい場合は、[Markdownの貼り付けと編集ガイド](/ja/blog/markdown-editor-paste-pdf/)をご覧ください。

## How local file uploads work in md2pdf

md2pdfのファイル読み込み処理は完全にクライアント側で実行されます。ファイルを選択するとブラウザの`change`イベントが発生し、ローカルで処理されます。

```javascript
const reader = new FileReader();
reader.onload = (e) => {
  const markdownText = e.target.result;
  renderMarkdownToPreview(markdownText);
};
reader.readAsText(file, 'UTF-8');
```

解析されたテキストは即座にエディタに反映され、プレビュー画面に描画されます。サーバーへHTTP POST通信を行わないため、オフライン環境でも動作します。

## Supported file types and extension rules

md2pdfは以下の一般的なテキスト拡張子を認識します。

- `.md` — 標準的なMarkdownファイル。
- `.markdown` — 明示的なMarkdown拡張子。
- `.txt` — Markdown構文を含むプレーンテキストファイル。

`.docx`や`.rtf`、既存の`.pdf`などのバイナリファイルはサポート外です。Word形式などの文書は、事前にMarkdown形式へ変換してご利用ください。

## Client-side size limits and encoding

ブラウザの軽快な動作を維持するため、md2pdfには以下の基準が設定されています。

- **ファイルサイズ上限**: UTF-8形式で最大2MB。
- **文字コード**: BOMなしUTF-8（UTF-8 without BOM）。
- **改行コード**: CRLF（`\r\n`）およびLF（`\n`）の双方を自動正規化。

2MBのMarkdownは約30万語に相当し、一般的な技術資料には十分な容量です。2MBを超える場合は、[複数ファイル対応Markdownブック作成ガイド](/ja/blog/multi-file-markdown-book/)の利用をご検討ください。

## Step-by-step: Uploading and printing a local Markdown file

ローカルファイルを綺麗なPDFに変換する手順は次の通りです。

1. md2pdfのトップページにアクセスし、変換ツールバーを確認します。
2. **Markdownをアップロード**をクリックするか、エディタ上に`.md`ファイルを直接ドロップします。
3. エディタにテキストが表示され、右側のプレビューに正しく描画されたことを確認します。
4. お好みの印刷テーマ（Clean、Business、Academic、Dark）を選択します。
5. 見出しが3つ以上ある場合は、必要に応じて**目次（TOC）**を有効化します。
6. **印刷 / PDFとして保存**ボタンを押し、ブラウザの印刷画面を開きます。
7. 送信先を**PDFに保存**に設定し、余白を確認して保存します。

印刷設定の詳細については、[ブラウザ印刷設定の完全ガイド](/ja/blog/browser-print-markdown-pdf/)をご確認ください。

## Handling missing relative assets in local files

単一のローカルファイルを読み込んだ場合、ブラウザのセキュリティ制限により、ローカル相対パス画像（例: `![図](./images/arch.png)`）は読み込めません。

画像をPDFに含めるための対処法：

- 画像をHTTPSサーバーに配置し、絶対Webアドレスで参照する。
- Markdown内にBase64データURIとして画像を直接埋め込む。
- GitHub上にリポジトリがある場合は、[GitHub READMEインポート機能](/ja/blog/github-readme-to-pdf/)を利用する。

## Common upload errors and troubleshooting

- **文字化けが発生する**: 特殊文字が「?」になる場合は、エディタでUTF-8（BOMなし）として再保存してください。
- **表示が重い・フリーズする**: 巨大なインラインSVGや過度に複雑な表があると描画負荷が高くなります。該当部分を分割してください。
- **ファイルが読み込めない**: 拡張子が`.md`または`.txt`であることを確認してください。拡張子を変更しただけのバイナリファイルは拒否されます。

ローカルのMarkdown文書を安全に変換するなら、[md2pdf](/#converter)をお試しください。
