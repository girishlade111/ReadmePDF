---
title: "실시간 미리보기로 마크다운 문서를 검수하고 PDF 인쇄하기"
description: "md2pdf의 실시간 미리보기가 GitHub 스타일 마크다운을 렌더링하고 HTML을 정화하며 인쇄 스타일을 반영하는 동작 방식 및 검수 요령."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Preview","HTML","Security"]
locale: "ko"
translationKey: "live-markdown-preview-pdf"
---

미리보기 없이 PDF를 내보내는 것은 결과를 장담할 수 없는 도박과 같습니다. 표 너비를 약간 고치고 출력한 뒤 뷰어를 열어보면 3페이지 하단에 제목만 덩그러니 남는 경우가 허다합니다. 문단을 고칠 때마다 이 과정을 반복하면 막대한 시간이 소모됩니다.

md2pdf는 양방향 분할 창 기반의 실시간 미리보기 기능으로 이 문제를 깔끔하게 해결합니다. 마크다운을 입력, 붙여넣기, 혹은 불러오는 즉시 인쇄 전용 스타일시트가 적용된 서식이 화면에 나타납니다. 화면에서 확인한 글꼴, 여백, 문단 배치가 인쇄물과 정확히 일치합니다.

본 가이드에서는 실시간 렌더링 파이프라인의 구조, DOMPurify 보안 정화 기능, 인쇄 전 사전 검수 체크포인트를 다룹니다. 빠른 편집 요령은 [마크다운 붙여넣기 및 편집 가이드](/ko/blog/markdown-editor-paste-pdf/)를 확인하세요.

## Why live preview matters for print-bound documents

일반 웹 브라우저와 PDF 인쇄 엔진은 CSS 레이아웃 규칙을 서로 다르게 적용합니다. 웹 화면은 세로로 끝없이 이어지지만, 인쇄용 문서는 정해진 규격의 종이로 분할됩니다:

- **페이지 나눔 제약**: 표, 이미지, 코드 블록은 한 페이지의 물리적인 높이 안에 알맞게 배치되어야 합니다.
- **활자 크기 및 가독성**: 인쇄물(300 DPI) 환경에서도 제목과 본문의 비율이 명확하게 구분되어야 합니다.
- **인쇄 여백 경계**: 여백 바깥으로 삐져나간 요소는 스크롤되는 것이 아니라 인쇄물에서 잘려 나갑니다.

인쇄 시뮬레이션 스타일이 적용된 미리보기를 통해 시스템 인쇄창을 띄우기 전에 서식 결함을 바로잡을 수 있습니다.

## How the client-side preview pipeline renders Markdown

md2pdf의 렌더링 파이프라인은 수 밀리초 만에 원문 마크다운을 정돈된 DOM 요소로 변환합니다:

```javascript
const rawHtml = markdownParser.render(markdownSource);
const cleanHtml = DOMPurify.sanitize(rawHtml, sanitizeConfig);
previewElement.innerHTML = cleanHtml;
applyHeadingAnchors(previewElement);
```

파서는 CommonMark 및 GitHub-Flavored Markdown(GFM) 규격을 준수하므로 취소선, 자동 링크 감지, 중첩된 체크박스, 문법 강조 코드 블록을 완벽하게 재현합니다.

## HTML sanitization and safety filters

출처가 불분명한 외부 텍스트나 공개 저장소 문서를 다룰 때는 브라우저 보안이 최우선입니다. 마크다운은 원시 HTML 태그를 허용하므로 크로스 사이트 스크립팅(XSS) 취약점에 노출될 수 있습니다.

md2pdf는 생성된 모든 HTML 문자열을 엄격한 DOMPurify 보안 규칙으로 정화합니다:

- **위험 태그 차단**: `<script>`, `<iframe>`, `<object>`, `<form>` 태그는 즉시 제거됩니다.
- **속성 검사**: `onclick`, `onload` 등 악성 스크립트를 실행할 수 있는 이벤트 핸들러가 걸러집니다.
- **프로토콜 검증**: `javascript:`나 `data:text/html` 형태의 비정상적인 링크는 무효화됩니다.
- **안전한 태그 보존**: `<b>`, `<code>`, `<table>`, `<img>` 등 레이아웃에 필요한 안전한 서식 요소만 남깁니다.

이 모든 정화 작업은 브라우저 메모리 안에서 미리보기 창에 주입되기 전에 완료됩니다.

## Previewing print themes and theme transitions

md2pdf는 Clean, Business, Academic, Dark의 네 가지 인쇄 테마를 제공합니다. 툴바에서 테마를 변경하면 미리보기 창의 CSS 클래스가 즉각 갱신됩니다:

- **Clean**: 시스템 고딕 폰트를 바탕으로 한 현대적이고 깔끔한 기본 서체.
- **Business**: 명확한 구분선과 구조화된 레이아웃을 갖춘 엔지니어링 보고서 스타일.
- **Academic**: 각주와 번호 매기기에 최적화된 고전적인 명조 계열 레이아웃.
- **Dark**: 작업 중 눈의 피로를 덜어주며 인쇄 시에는 잉크 절약을 위해 흰색 배경으로 자동 전환.

테마별 세부 특징은 [md2pdf 인쇄 테마 완벽 분석](/ko/blog/readme-pdf-print-themes/)에서 자세히 살펴볼 수 있습니다.

## Differences between screen preview and print output

미리보기가 실제 인쇄물을 충실하게 모사하지만, 모니터와 물리적 종이 사이에는 약간의 차이가 존재합니다:

- **뷰포트 너비**: 미리보기는 브라우저 창 크기에 따라 반응형으로 늘어나지만, 실제 인쇄는 A4나 Letter 등 정형화된 용지 규격에 고정됩니다.
- **페이지 분할 방식**: 화면은 매끄럽게 이어져 보이지만, 인쇄 엔진은 CSS의 `break-inside: avoid` 규칙에 따라 요소를 분리합니다.
- **색감 표현**: 모니터의 RGB 색상과 종이에 도포되는 프린터 토너 색상은 약간의 명도 차이가 발생할 수 있습니다.

## Diagnosing preview rendering glitches

- **미리보기가 멈추는 경우**: 닫히지 않은 HTML 태그나 용량이 지나치게 큰 인라인 이미지가 없는지 점검하세요.
- **표가 옆으로 잘리는 현상**: 열이 너무 많은 넓은 표는 [마크다운 표 PDF 변환 가이드](/ko/blog/markdown-tables-to-pdf/)를 참고하여 너비를 조정하세요.
- **이미지가 뜨지 않는 오류**: 외부 이미지는 HTTPS 절대 경로를 사용하거나 [GitHub README 가져오기](/ko/blog/github-readme-to-pdf/)를 통해 상대 경로를 자동으로 변환하세요.

실시간으로 문서를 검수하고 [md2pdf](/#converter)를 통해 만족스러운 PDF를 만들어 보세요.
