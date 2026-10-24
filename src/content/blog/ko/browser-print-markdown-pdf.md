---
title: "완벽한 마크다운 PDF 출력을 위한 브라우저 인쇄 설정 완성 가이드"
description: "브라우저 인쇄 모달 완벽 설정법: 용지 규격, 여백, 배경 그래픽 활성화, 머리글/바닥글 제거 및 자동 페이지 나눔 최적화."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Print","Browser","CSS","PDF"]
locale: "ko"
translationKey: "browser-print-markdown-pdf"
---

화면에서 아무리 완벽하게 조판된 마크다운 문서라도 브라우저 인쇄 대화상자 설정을 잘못 건드리면 엉망으로 출력될 수 있습니다. 여백에 원치 않는 접속 URL이나 날짜가 찍히거나, 코드 블록 배경색이 증발하거나, 여백이 뒤틀리는 문제는 마크다운 본문이 아니라 일반 웹페이지 출력용 브라우저 기본값 때문에 발생합니다.

md2pdf는 CSS 인쇄 미디어 쿼리(`@media print`)와 브라우저 내장 인쇄 엔진을 유기적으로 결합하여 동작합니다. 인쇄 버튼을 누르면 인쇄용 스타일이 작동하여 상단 툴바를 숨기고 본문을 격리하여 페이지를 나눕니다. 그러나 용지 크기, 여백 폭, 배경색 포함 여부는 사용자가 시스템 인쇄창에서 직접 지정해야 합니다.

본 가이드에서는 Chrome, Firefox, Safari, Edge에서 최고 품질의 PDF를 얻기 위한 인쇄 옵션 구성법을 설명합니다. 서식 스타일을 먼저 다듬으려면 [md2pdf 인쇄 테마 안내서](/ko/blog/readme-pdf-print-themes/)를 참고하세요.

## Why browser print dialogs require careful configuration

브라우저의 기본 인쇄 설정은 웹 화면의 단순 캡처를 전제로 하므로 모서리마다 페이지 제목, 현재 일자, 사이트 주소를 강제로 삽입합니다. 공식 기술 제안서나 클라이언트 납품 문서에 이런 웹 정보가 남아 있으면 신뢰도가 떨어집니다.

또한 잉크 절약을 위해 '배경 그래픽' 옵션이 기본적으로 꺼져 있는 경우가 많습니다. 기술 문서에서 배경 그래픽이 해제되면 코드 블록의 음영, 표 헤더의 채우기 색상, 주의 상자 테두리가 사라져 가독성이 심각하게 훼손됩니다.

이러한 설정 항목들의 기능을 파악하고 올바르게 지정하면 일반 웹 출력을 출판물 수준의 PDF로 바꿀 수 있습니다.

## Essential print settings: Paper size, margins, and scaling

인쇄 설정 화면이 나타나면 가장 먼저 아래 항목들을 지정하세요:

- **대상(프린터)**: **PDF로 저장** (또는 Microsoft Print to PDF)을 선택합니다.
- **용지 크기**: 국내 및 국제 표준인 **A4** 또는 북미 표준인 **Letter**를 목적에 맞게 설정합니다.
- **방향**: 일반 문서는 **세로(Portrait)**를 유지합니다. 폭이 매우 넓은 대형 표가 포함된 경우에만 **가로(Landscape)**를 고려합니다.
- **여백**: **기본값** 또는 **없음**을 선택합니다. md2pdf CSS 내부에 정밀한 인쇄 안쪽 여백이 지정되어 있으므로 '최소'를 선택하면 글자가 용지 끝에 너무 바짝 붙을 수 있습니다.
- **배율**: **100%(기본값)**를 유지합니다. 90% 미만으로 축소하면 글꼴 획이 뭉개질 수 있습니다.

## Enabling background graphics for theme fidelity

인쇄 창에서 가장 중요한 체크 항목은 **배경 그래픽**입니다:

```text
[x] Background graphics (Chrome, Edge, Opera)
[x] Print Backgrounds (Firefox)
[x] Print backgrounds (Safari)
```

이 항목을 활성화해야 다음과 같은 서식이 보존됩니다:

- 코드 블록의 어두운 배경색과 문법 강조 색상이 온전하게 인쇄됩니다.
- 표 헤더 영역의 음영 및 지브라 패턴 행이 선명하게 유지됩니다.
- 주의 및 강조 상자(Callout)의 고유 테두리와 배경 톤이 보존됩니다.
- Business 테마의 정돈된 구분선이나 Academic 테마의 격식 있는 테두리가 인쇄물에 반영됩니다.

이 설정을 놓치면 모든 코드 블록이 투명한 흰색 배경으로 인쇄되어 본문과의 경계가 흐려집니다.

## Suppressing unwanted browser headers and footers

초기 상태의 브라우저는 용지 여백에 임의의 메타데이터를 인쇄합니다:

- 머리글: 웹 탭 제목 및 현재 날짜.
- 바닥글: 웹페이지 전체 URL 및 단순 페이지 번호(예: "1/4").

인쇄 모달의 추가 설정에서 **머리글 및 바닥글** 체크를 해제하십시오:

```text
[ ] Headers and footers (Uncheck to remove browser URL and date)
```

체크를 풀면 브라우저가 임의로 찍는 URL과 날짜가 사라지고, md2pdf가 제공하는 깔끔한 페이지 번호만 단정하게 표시됩니다.

## Page-break control across headings, tables, and code

md2pdf에는 어색한 페이지 분할을 차단하는 인쇄 전용 CSS 규칙이 내장되어 있습니다:

```css
h1, h2, h3 { break-after: avoid; }
pre, table, figure { break-inside: avoid; }
```

- **고립된 제목 방지**: 제목이 페이지 맨 마지막 줄에 혼자 남겨지지 않도록 바로 다음 문단과 함께 다음 페이지 상단으로 자동 이동합니다.
- **코드 블록 보호**: 코드 블록 전체가 단일 페이지 높이를 넘지 않는 한 블록 중간이 잘려 분할되는 현상을 억제합니다.
- **표 행의 안정성**: 데이터 행이 페이지 경계선에 걸려 텍스트 상하가 쪼개지는 현상을 방지합니다.

## Browser-specific printing quirks and fixes

- **Google Chrome 및 Microsoft Edge**: 가장 신뢰도 높은 벡터 PDF 품질을 제공합니다. '배경 그래픽'을 켜고 '머리글 및 바닥글'을 끄는 것을 잊지 마세요.
- **Mozilla Firefox**: 여백이 상대적으로 좁게 잡히는 경향이 있습니다. 글자 잘림이 생기면 여백을 '기본값'으로 설정하십시오.
- **Apple Safari**: 인쇄 대화상자에서 '세부사항 보기'를 클릭해야 '배경 인쇄' 체크박스가 나타납니다.

최적의 브라우저 인쇄 옵션을 적용하여 [md2pdf](/#converter)에서 깔끔한 PDF를 생성해 보세요.
