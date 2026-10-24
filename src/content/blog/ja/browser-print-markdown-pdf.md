---
title: "完璧なMarkdown PDFを出力するためのブラウザ印刷設定術"
description: "ブラウザ印刷ダイアログの完全攻略ガイド：用紙サイズ、余白、背景のグラフィック、ヘッダー・フッターの非表示化と改ページ制御。"
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Print","Browser","CSS","PDF"]
locale: "ja"
translationKey: "browser-print-markdown-pdf"
---

ブラウザ上でどれほど美しく整えられたMarkdown文書であっても、印刷ダイアログの設定を誤ると無残な仕上がりになってしまいます。余白に意図しないURLや日付が印字されたり、コード枠の背景色が消えたり、余白が極端に狭くなる現象の多くは、Markdownの記述ではなくブラウザ標準の印刷設定に起因します。

md2pdfはCSSメディアクエリ（`@media print`）とブラウザの印刷機能を連携させて動作します。印刷ボタンを押すと専用スタイルシートが適用され、ツールバーを隠し、文書を抽出してページ分割を制御します。しかし、用紙サイズや背景色、ヘッダーの有無を決める最終権限は印刷ダイアログを操作するユーザー側にあります。

本ガイドでは、Chrome、Firefox、Safari、Edgeにおいて最高品質のPDFを出力するための設定手順を解説します。事前にデザインテーマを調整したい場合は、[md2pdf印刷テーマガイド](/ja/blog/readme-pdf-print-themes/)をご覧ください。

## Why browser print dialogs require careful configuration

ブラウザの初期設定はWebページの閲覧画面をそのまま印刷することを想定しているため、用紙の四隅に日付、ページタイトル、Webアドレスを自動挿入してしまいます。公的な仕様書や納品書にこれらの情報が残っていると不体裁です。

さらに、多くのブラウザはインク節約のために「背景のグラフィック」をデフォルトで無効化しています。技術文書で背景印刷をオフにすると、コードハイライトの背景や表の見出し網掛けが消失し、可読性が著しく損なわれます。

これらのチェック項目を正しく切り替えるだけで、粗雑なWebプリントが洗練された出版品質のPDFへと生まれ変わります。

## Essential print settings: Paper size, margins, and scaling

印刷ダイアログが表示されたら、まず以下の基本項目を確認してください。

- **送信先**: **PDFに保存**（またはMicrosoft Print to PDF）を選択します。
- **用紙サイズ**: 用途に合わせて**A4**（国際標準）または**レター**（北米標準）を指定します。
- **向き**: 通常のドキュメントは**縦（Portrait）**のままにします。横幅の広い表が多い場合のみ**横（Landscape）**を検討します。
- **余白**: **既定（Default）**または**なし（None）**を選択します。md2pdfのCSS内に適切な余白が定義されているため、「最小」を選ぶと文字が用紙の端に寄りすぎることがあります。
- **倍率**: **100%（標準）**を維持します。90%未満に縮小すると文字の鮮明さが失われます。

## Enabling background graphics for theme fidelity

最も重要なチェックボックスが**背景のグラフィック**です。

```text
[x] Background graphics (Chrome, Edge, Opera)
[x] Print Backgrounds (Firefox)
[x] Print backgrounds (Safari)
```

この項目にチェックを入れることで以下の効果が得られます。

- コードブロックの背景色および構文ハイライトが鮮明に出力されます。
- テーブルの縞模様（ゼブラストライプ）や見出しセルの装飾が正しく維持されます。
- 注意書きボックス（Callout）の識別枠や背景アクセントが保持されます。
- 各テーマ（BusinessやAcademicなど）独自の境界線装飾が紙面に反映されます。

この設定を忘れると、すべてのコード枠が透明背景となり、本文との境界が判別しづらくなります。

## Suppressing unwanted browser headers and footers

初期状態では、ブラウザによって以下の文字情報が付加されます。

- ヘッダー部: ページタイトルおよび現在の日付。
- フッター部: Webアドレス（URL）および汎用のページ番号（例: "1/4"）。

印刷画面の詳細設定で、**ヘッダーとフッター**のチェックを外してください。

```text
[ ] Headers and footers (Uncheck to remove browser URL and date)
```

このチェックを外すことで、ブラウザによるURLや日付の印字が消え、md2pdf本来の美しいページレイアウトが保たれます。

## Page-break control across headings, tables, and code

md2pdfには、ページまたぎによる不自然な分断を防ぐCSS改ページルールが組み込まれています。

```css
h1, h2, h3 { break-after: avoid; }
pre, table, figure { break-inside: avoid; }
```

- **孤立見出しの防止**: 見出しがページの最下行に1行だけ取り残されるのを防ぎ、自動的に次ページ先頭へ送られます。
- **コードブロックの保護**: 枠内のコードが単一ページに収まる限り、ページをまたいで分断されないよう制御されます。
- **テーブル行の安定**: データ行が改ページ線上で上下に泣き別れになる現象を抑えます。

## Browser-specific printing quirks and fixes

- **Google Chrome / Microsoft Edge**: 最も安定したベクターPDFが得られます。「背景のグラフィック」をONにし、「ヘッダーとフッター」をOFFにしてください。
- **Mozilla Firefox**: 既定余白がやや狭めに適用される傾向があります。文字切れが起きる場合は余白を「既定」にしてください。
- **Apple Safari**: 印刷シートの「詳細を表示」をクリックして「背景をプリント」のチェックボックスを表示させてください。

印刷設定をマスターし、[md2pdf](/#converter)で理想通りの美しいPDFを書き出しましょう。
