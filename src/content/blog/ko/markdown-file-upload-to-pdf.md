---
title: "로컬 마크다운 파일 업로드 및 브라우저 내 안전한 PDF 변환"
description: "서버 업로드 없이 로컬 .md 파일을 브라우저에서 안전하게 PDF로 변환하는 방법: 파일 한도, 인코딩, 드래그 앤 드롭 및 문제 해결."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Upload","PDF","Security"]
locale: "ko"
translationKey: "markdown-file-upload-to-pdf"
---

로컬 마크다운 문서를 PDF로 변환할 때 기밀 기술 문서를 외부 서버로 전송할 필요는 없습니다. 대다수의 웹 변환기는 문서를 원격 서버로 전송하여 처리하므로 보안 위험이 따릅니다.

md2pdf는 브라우저 고유의 `FileReader` API를 사용합니다. 로컬 `.md` 파일을 선택하거나 브라우저 화면으로 끌어다 놓으면 파일 내용이 기기의 메모리에서 직접 처리됩니다. 외부 네트워크로 전송되지 않으므로 사내 규정이나 프로젝트 사양서도 안심하고 변환할 수 있습니다.

본 가이드에서는 지원 파일 형식, 용량 제한, 문자 인코딩 규칙 및 업로드 문제 해결법을 다룹니다. 텍스트를 바로 붙여넣어 작업하려면 [마크다운 붙여넣기 및 편집 가이드](/ko/blog/markdown-editor-paste-pdf/)를 확인하세요.

## How local file uploads work in md2pdf

md2pdf의 파일 업로드 파이프라인은 전적으로 클라이언트 브라우저에서 작동합니다. 파일 선택 시 트리거되는 `change` 이벤트를 통해 로컬 스트림을 읽습니다:

```javascript
const reader = new FileReader();
reader.onload = (e) => {
  const markdownText = e.target.result;
  renderMarkdownToPreview(markdownText);
};
reader.readAsText(file, 'UTF-8');
```

분석된 텍스트는 즉시 편집기에 입력되고 실시간 미리보기 창에 렌더링됩니다. 외부 서버로 HTTP POST 요청을 보내지 않으므로 인터넷 연결이 끊긴 오프라인 환경에서도 원활하게 작동합니다.

## Supported file types and extension rules

md2pdf는 다음과 같은 일반적인 텍스트 기반 마크다운 확장자를 지원합니다:

- `.md` — 표준 마크다운 파일.
- `.markdown` — 명시적 마크다운 확장자.
- `.txt` — 마크다운 문법을 포함한 일반 텍스트 파일.

`.docx`, `.rtf`, 기존 `.pdf`와 같은 바이너리 파일은 지원되지 않습니다. 워드나 HTML 문서는 사전에 표준 마크다운으로 변환한 뒤 업로드해야 합니다.

## Client-side size limits and encoding

원활한 브라우저 렌더링을 위해 md2pdf는 안전한 처리 한도를 적용합니다:

- **파일당 최대 크기**: UTF-8 일반 텍스트 기준 2MB.
- **문자 인코딩**: BOM 없는 UTF-8(UTF-8 without BOM).
- **줄 바꿈**: CRLF(`\r\n`) 및 LF(`\n`) 자동 정규화.

2MB 마크다운 파일은 약 30만 단어에 해당하는 방대한 분량입니다. 파일 크기가 2MB를 초과하는 경우, 문서를 분할하거나 [다중 파일 마크다운 북 빌더](/ko/blog/multi-file-markdown-book/)를 활용하세요.

## Step-by-step: Uploading and printing a local Markdown file

로컬 문서를 깔끔한 PDF로 인쇄하는 순서는 다음과 같습니다:

1. md2pdf 메인 페이지로 이동하여 변환 툴바를 확인합니다.
2. **마크다운 업로드**를 클릭하거나 `.md` 파일을 편집기 위로 끌어다 놓습니다.
3. 편집기 및 실시간 미리보기 화면에 문서 내용이 정상적으로 표시되는지 확인합니다.
4. 원하는 인쇄 테마(Clean, Business, Academic, Dark)를 선택합니다.
5. 제목이 3개 이상인 문서라면 필요에 따라 **목차(TOC)** 옵션을 활성화합니다.
6. **인쇄 / PDF로 저장** 버튼을 눌러 브라우저 인쇄 대화상자를 엽니다.
7. 대상을 **PDF로 저장**으로 지정하고 여백을 확인한 후 저장합니다.

인쇄 옵션에 관한 상세 설정은 [브라우저 인쇄 설정 완벽 가이드](/ko/blog/browser-print-markdown-pdf/)를 참조하십시오.

## Handling missing relative assets in local files

로컬 마크다운 파일을 단독으로 열면 브라우저의 보안 샌드박스로 인해 로컬 상대 경로 이미지(예: `![구조](./images/arch.png)`)를 직접 읽어올 수 없습니다.

문서 내 이미지를 정상적으로 인쇄하려면:

- 이미지를 보안 HTTPS 서버에 호스팅하고 절대 웹 주소로 연결합니다.
- 마크다운 본문에 Base64 데이터 URI 형태로 이미지를 직접 포함합니다.
- GitHub 리포지토리에 보관된 문서라면 [GitHub README 가져오기](/ko/blog/github-readme-to-pdf/) 기능을 이용합니다.

## Common upload errors and troubleshooting

- **문자 깨짐 현상**: 특수 기호가 물음표로 표시된다면 텍스트 편집기에서 UTF-8 인코딩으로 다시 저장하십시오.
- **렌더링 지연 및 멈춤**: 대용량 인라인 SVG나 과도하게 중첩된 표는 브라우저를 느리게 할 수 있습니다. 해당 요소를 정리하거나 챕터별로 나누세요.
- **지원되지 않는 파일 오류**: 확장자가 `.md` 또는 `.txt`인지 확인하세요. 바이너리 파일의 확장자만 바꾼 파일은 파서에서 거부됩니다.

안전하고 독립적인 문서 변환을 원하신다면 지금 바로 [md2pdf](/#converter)를 경험해 보세요.
