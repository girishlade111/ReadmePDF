/**
 * Localized content for the About page.
 *
 * The dictionary files hold short UI strings. The About page needs structured,
 * longer-form copy, so it lives here as one object per locale. Keeping it out
 * of the flat dictionaries avoids turning every paragraph into a key while
 * still giving the page a single, testable source of truth.
 *
 * Claims on this page are limited to capabilities that exist in the product.
 * There are no invented metrics, awards, or testimonials.
 */

/** @typedef {import('./config.js').Locale} Locale */

/** @type {Record<Locale, any>} */
export const ABOUT_CONTENT = {
  en: {
    kicker: 'About md2pdf',
    heroTitle: 'A small tool for a document that has to travel.',
    heroLead:
      'md2pdf turns Markdown into a print-ready PDF in your browser. It is built by Girish Lade, owned by LadeStack, and free to use.',
    storyTitle: 'The story',
    storyP1:
      'md2pdf began with a familiar problem: documentation that lived comfortably on a screen but fell apart the moment it needed to be sent, archived, or printed.',
    storyP2:
      'Markdown is portable until the destination expects a PDF. Browser print dialogs preserve the page, not the document: navigation leaks in, relative images break, wide code blocks are clipped, and tables split in awkward places. Desktop converters solve some of that, but they usually ask for an install, an account, or a server-side upload.',
    storyP3:
      'md2pdf takes a narrower route. It reads the Markdown, resolves repository-relative assets, renders GitHub-flavoured Markdown in the browser, sanitizes the result, applies a print stylesheet, and hands the document to the browser’s own PDF engine. The source never leaves the device unless the user asks md2pdf to fetch a public README.',
    missionTitle: 'Mission',
    missionBody:
      'Make a clean PDF from Markdown available to anyone with a browser, without an account, a subscription, or an upload. Keep the conversion understandable: the user should be able to see the document, choose a theme, and know exactly what will be printed.',
    visionTitle: 'Vision',
    visionBody:
      'A web where ordinary documents do not require a proprietary desktop application or a conversion service to become portable. Markdown is already readable, diffable, and durable; the PDF should be a faithful exit, not a second silo.',
    founderTitle: 'The maker',
    founderName: 'Girish Lade',
    founderRole: 'Creator of md2pdf · LadeStack',
    founderP1:
      'Girish Lade builds md2pdf at LadeStack. He works on the converter, the print themes, the documentation book workflow, and the localized editions of this site.',
    founderP2:
      'The project is intentionally small and self-contained: a static Astro front end, browser-only conversion code, and a test suite that checks the output rather than promising it.',
    founderNote:
      'This page reserves the portrait slot for an authentic photograph. Until one is added, the component shows a branded monogram rather than a generated or stock image.',
    approachTitle: 'How the product is built',
    approachItems: [
      {
        title: 'Browser-first',
        body: 'Markdown parsing, sanitization, table-of-contents generation, print layout, and PDF assembly all run on the visitor’s device. The site is static; there is no application backend.',
      },
      {
        title: 'Small, explicit limits',
        body: 'Single files are capped at 2 MB. A documentation book can hold up to 30 Markdown files, with a 750 KB per-file limit, a 6 MB total, and a bounded number of API requests.',
      },
      {
        title: 'Print is the output',
        body: 'The final PDF comes from the browser’s native print engine. md2pdf supplies the cleaned document and the print stylesheet; it does not pretend to be a PDF rendering engine.',
      },
      {
        title: 'Nine languages',
        body: 'The interface, guides, and About page are published in English, Spanish, Japanese, Korean, Simplified Chinese, Russian, Turkish, French, and Brazilian Portuguese.',
      },
    ],
    achievementsTitle: 'Achievements, stated plainly',
    achievementsLead: 'These are shipped capabilities, not roadmap promises.',
    achievements: [
      'Public GitHub README import with default-branch discovery and repository-relative image and link rewriting.',
      'Paste, upload, and sample workflows for Markdown, including GitHub-flavoured tables, task lists, and fenced code.',
      'Four print themes: Clean, Business, Academic, and Dark.',
      'An automatic table of contents for documents with three or more headings.',
      'A multi-file documentation book with a cover, ordered chapters, searchable selection, and print isolation.',
      'Per-chapter PDF export and ZIP downloads with bounded size and file-count limits.',
      'Nine localized editions of the interface, articles, and About page.',
      'No account, no upload for local or pasted Markdown, and no server-side renderer.',
    ],
    usefulnessTitle: 'Who it is for',
    usefulnessBody: 'md2pdf is useful when the document matters more than the toolchain.',
    usefulnessItems: [
      {
        title: 'Students and teachers',
        body: 'Turn course notes, assignments, and reading packs into a PDF that can be submitted or printed.',
      },
      {
        title: 'Developers and technical writers',
        body: 'Export a README, an RFC, or a set of documentation chapters without installing a converter.',
      },
      {
        title: 'Consultants and small teams',
        body: 'Hand a client a clean document without sending the Markdown to a third-party service.',
      },
      {
        title: 'Archivists',
        body: 'Keep a readable, paginated copy of documentation that may change or disappear upstream.',
      },
    ],
    privacyTitle: 'Privacy',
    privacyBody:
      'Local files and pasted Markdown are read in the browser and are not uploaded. A public GitHub fetch makes anonymous requests to GitHub for the README and its images; private repositories are not supported. There are no accounts and no conversion analytics attached to the document.',
    accessibilityTitle: 'Accessibility',
    accessibilityBody:
      'Pages use semantic landmarks, labeled controls, visible focus styles, and a language switcher that preserves the current path. Motion is limited and respects reduced-motion preferences. The print stylesheet keeps headings with their content and avoids breaking code blocks, tables, and images across pages where possible. Accessibility is treated as ongoing work, not a one-time claim.',
    ownershipTitle: 'Ownership',
    ownershipBody:
      'md2pdf is a LadeStack product. LadeStack owns the product name, the site, and the published editions. The source repository is public at github.com/girishlade111/ReadmePDF; the repository keeps its original name while the product is md2pdf. md2pdf is free to use.',
    contactTitle: 'Contact',
    contactBody:
      'Questions, corrections, and accessibility reports are welcome. Email is the most reliable route; GitHub issues are public and searchable.',
    contactEmailLabel: 'Email',
    contactGithubLabel: 'GitHub',
    contactLinkedinLabel: 'LinkedIn',
    contactWebsiteLabel: 'LadeStack',
    ctaTitle: 'Put a document in, get a PDF out.',
    ctaBody:
      'No account. No upload for local files. Start with the sample, paste your own Markdown, or fetch a public README.',
    ctaButton: 'Open the converter',
  },

  es: {
    kicker: 'Acerca de md2pdf',
    heroTitle: 'Una herramienta pequeña para un documento que tiene que viajar.',
    heroLead:
      'md2pdf convierte Markdown en un PDF listo para imprimir desde el navegador. Lo creó Girish Lade, es propiedad de LadeStack y es gratis.',
    storyTitle: 'La historia',
    storyP1:
      'md2pdf nació de un problema conocido: documentación que se lee bien en pantalla pero se rompe en cuanto hay que enviarla, archivarla o imprimirla.',
    storyP2:
      'Markdown es portátil hasta que el destino exige un PDF. El diálogo de impresión del navegador conserva la página, no el documento: se cuela la navegación, fallan las imágenes relativas, se recortan los bloques de código anchos y las tablas se parten en lugares incómodos. Los conversores de escritorio resuelven parte de eso, pero suelen pedir una instalación, una cuenta o una subida al servidor.',
    storyP3:
      'md2pdf toma una ruta más estrecha. Lee el Markdown, resuelve los recursos relativos al repositorio, renderiza Markdown al estilo GitHub en el navegador, sanea el resultado, aplica una hoja de estilos de impresión y entrega el documento al motor PDF del propio navegador. El origen no sale del dispositivo salvo que el usuario pida a md2pdf que descargue un README público.',
    missionTitle: 'Misión',
    missionBody:
      'Poner un PDF limpio a partir de Markdown al alcance de cualquiera con un navegador, sin cuenta, suscripción ni subida. Mantener la conversión comprensible: la persona debe poder ver el documento, elegir un tema y saber exactamente qué se va a imprimir.',
    visionTitle: 'Visión',
    visionBody:
      'Una web donde los documentos corrientes no necesiten una aplicación de escritorio propietaria ni un servicio de conversión para volverse portátiles. Markdown ya es legible, comparable y duradero; el PDF debería ser una salida fiel, no otro silo.',
    founderTitle: 'El creador',
    founderName: 'Girish Lade',
    founderRole: 'Creador de md2pdf · LadeStack',
    founderP1:
      'Girish Lade desarrolla md2pdf en LadeStack. Trabaja en el conversor, los temas de impresión, el flujo del libro de documentación y las ediciones localizadas de este sitio.',
    founderP2:
      'El proyecto es deliberadamente pequeño y autónomo: un frontend estático en Astro, código de conversión que solo se ejecuta en el navegador y una suite de pruebas que comprueba el resultado en lugar de prometerlo.',
    founderNote:
      'Esta página reserva el espacio del retrato para una fotografía auténtica. Hasta que se añada, el componente muestra un monograma de marca en lugar de una imagen generada o de stock.',
    approachTitle: 'Cómo está construido el producto',
    approachItems: [
      {
        title: 'Primero el navegador',
        body: 'El análisis de Markdown, el saneamiento, la generación del índice, la maquetación de impresión y el ensamblado del PDF se ejecutan en el dispositivo del visitante. El sitio es estático; no hay backend de aplicación.',
      },
      {
        title: 'Límites pequeños y explícitos',
        body: 'Los archivos individuales tienen un límite de 2 MB. Un libro de documentación admite hasta 30 archivos Markdown, con 750 KB por archivo, 6 MB en total y un número acotado de solicitudes a la API.',
      },
      {
        title: 'La impresión es la salida',
        body: 'El PDF final lo produce el motor de impresión nativo del navegador. md2pdf entrega el documento limpio y la hoja de estilos de impresión; no finge ser un motor de renderizado PDF.',
      },
      {
        title: 'Nueve idiomas',
        body: 'La interfaz, las guías y esta página se publican en inglés, español, japonés, coreano, chino simplificado, ruso, turco, francés y portugués de Brasil.',
      },
    ],
    achievementsTitle: 'Logros, sin adornos',
    achievementsLead: 'Son capacidades ya publicadas, no promesas de hoja de ruta.',
    achievements: [
      'Importación de README públicos de GitHub con detección de la rama predeterminada y reescritura de imágenes y enlaces relativos al repositorio.',
      'Flujos de pegado, carga y muestra para Markdown, con tablas al estilo GitHub, listas de tareas y código delimitado.',
      'Cuatro temas de impresión: Clean, Business, Academic y Dark.',
      'Índice automático para documentos con tres o más encabezados.',
      'Libro de documentación con varios archivos, portada, capítulos ordenados, selección con búsqueda y aislamiento de impresión.',
      'Exportación de un PDF por capítulo y descargas ZIP con límites de tamaño y número de archivos.',
      'Nueve ediciones localizadas de la interfaz, los artículos y la página Acerca de.',
      'Sin cuenta, sin subida para Markdown local o pegado y sin renderizador en el servidor.',
    ],
    usefulnessTitle: 'Para quién es',
    usefulnessBody: 'md2pdf sirve cuando el documento importa más que la cadena de herramientas.',
    usefulnessItems: [
      {
        title: 'Estudiantes y docentes',
        body: 'Convierte apuntes, trabajos y lecturas en un PDF que se pueda entregar o imprimir.',
      },
      {
        title: 'Desarrolladores y redactores técnicos',
        body: 'Exporta un README, un RFC o varios capítulos de documentación sin instalar un conversor.',
      },
      {
        title: 'Consultores y equipos pequeños',
        body: 'Entrega un documento limpio al cliente sin enviar el Markdown a un servicio de terceros.',
      },
      {
        title: 'Archivistas',
        body: 'Conserva una copia legible y paginada de documentación que puede cambiar o desaparecer en su origen.',
      },
    ],
    privacyTitle: 'Privacidad',
    privacyBody:
      'Los archivos locales y el Markdown pegado se leen en el navegador y no se suben. Una descarga de GitHub hace solicitudes anónimas a GitHub para el README y sus imágenes; los repositorios privados no son compatibles. No hay cuentas ni analítica de conversión asociada al documento.',
    accessibilityTitle: 'Accesibilidad',
    accessibilityBody:
      'Las páginas usan regiones semánticas, controles etiquetados, estilos de foco visibles y un selector de idioma que conserva la ruta actual. El movimiento es limitado y respeta la preferencia de movimiento reducido. La hoja de impresión mantiene los encabezados con su contenido y evita, cuando es posible, partir bloques de código, tablas e imágenes entre páginas. La accesibilidad se trata como trabajo continuo, no como una afirmación única.',
    ownershipTitle: 'Propiedad',
    ownershipBody:
      'md2pdf es un producto de LadeStack. LadeStack es propietaria del nombre del producto, del sitio y de las ediciones publicadas. El repositorio de código es público en github.com/girishlade111/ReadmePDF; el repositorio conserva su nombre original mientras el producto es md2pdf. md2pdf es gratis.',
    contactTitle: 'Contacto',
    contactBody:
      'Las preguntas, correcciones e informes de accesibilidad son bienvenidos. El correo es la vía más fiable; los issues de GitHub son públicos y se pueden buscar.',
    contactEmailLabel: 'Correo',
    contactGithubLabel: 'GitHub',
    contactLinkedinLabel: 'LinkedIn',
    contactWebsiteLabel: 'LadeStack',
    ctaTitle: 'Pon un documento, obtén un PDF.',
    ctaBody:
      'Sin cuenta. Sin subida para archivos locales. Empieza con la muestra, pega tu Markdown o descarga un README público.',
    ctaButton: 'Abrir el conversor',
  },

  ja: {
    kicker: 'md2pdf について',
    heroTitle: '持ち出さなければならない文書のための、小さな道具。',
    heroLead:
      'md2pdf は Markdown をブラウザだけで印刷向け PDF に変換します。Girish Lade が制作し、LadeStack が所有する、無料で使えるツールです。',
    storyTitle: '成り立ち',
    storyP1:
      'md2pdf はよくある問題から始まりました。画面では快適に読める文書が、送信・保存・印刷の段階で崩れてしまうという問題です。',
    storyP2:
      'Markdown は、送り先が PDF を求めるまでは可搬です。ブラウザの印刷ダイアログはページを残しますが、文書は残しません。ナビゲーションが混ざり、相対画像が壊れ、横長のコードブロックが切れ、表が不自然な位置で分割されます。デスクトップの変換ツールは一部を解決しますが、多くの場合インストール、アカウント、サーバーへのアップロードを求めます。',
    storyP3:
      'md2pdf はもっと狭い道を選びます。Markdown を読み、リポジトリからの相対パスを解決し、GitHub 風の Markdown をブラウザで描画し、結果を無害化し、印刷用スタイルを適用して、ブラウザ自身の PDF エンジンに渡します。公開 README の取得を指示しない限り、原本が端末の外に出ることはありません。',
    missionTitle: 'ミッション',
    missionBody:
      'ブラウザさえあれば、アカウントも購読もアップロードもなしに、Markdown からきれいな PDF を作れるようにする。変換を理解可能に保つ。文書を見て、テーマを選び、何が印刷されるのかを正確に知れるようにする。',
    visionTitle: 'ビジョン',
    visionBody:
      '普通の文書を可搬にするために、専用のデスクトップアプリや変換サービスを必要としないウェブ。Markdown はすでに読めて、差分が取れて、長持ちします。PDF は忠実な出口であるべきで、もう一つの囲い込みであってはなりません。',
    founderTitle: '作り手',
    founderName: 'Girish Lade',
    founderRole: 'md2pdf 作者 · LadeStack',
    founderP1:
      'Girish Lade は LadeStack で md2pdf を開発しています。コンバーター、印刷テーマ、文書ブックのワークフロー、このサイトの各言語版を担当しています。',
    founderP2:
      'プロジェクトは意図的に小さく自己完結しています。静的な Astro フロントエンド、ブラウザだけで動く変換コード、そして約束ではなく出力を検証するテストスイートです。',
    founderNote:
      'このページの肖像欄は本人の写真のために空けています。追加されるまでは、生成画像やストック写真ではなく、ブランドのモノグラムを表示します。',
    approachTitle: '製品の作り',
    approachItems: [
      {
        title: 'ブラウザ優先',
        body: 'Markdown の解析、無害化、目次の生成、印刷レイアウト、PDF の組み立てはすべて訪問者の端末で実行されます。サイトは静的で、アプリケーション用のバックエンドはありません。',
      },
      {
        title: '小さく明示的な上限',
        body: '単一ファイルは 2 MB まで。文書ブックは最大 30 個の Markdown ファイル、1 ファイル 750 KB、合計 6 MB、API リクエスト数にも上限があります。',
      },
      {
        title: '出力は印刷',
        body: '最終的な PDF はブラウザ本来の印刷エンジンが生成します。md2pdf は整えた文書と印刷用スタイルを渡すのであって、PDF レンダリングエンジンのふりはしません。',
      },
      {
        title: '9 言語',
        body: 'インターフェース、ガイド、このページは英語、スペイン語、日本語、韓国語、簡体字中国語、ロシア語、トルコ語、フランス語、ブラジルポルトガル語で公開されています。',
      },
    ],
    achievementsTitle: '実績を、飾らずに',
    achievementsLead: 'ロードマップの約束ではなく、すでに提供している機能です。',
    achievements: [
      '公開 GitHub README の取り込み。既定ブランチの検出と、リポジトリ相対の画像・リンクの書き換えに対応。',
      '貼り付け、アップロード、サンプルの各ワークフロー。GitHub 風の表、タスクリスト、フェンス付きコードに対応。',
      '4 つの印刷テーマ: Clean、Business、Academic、Dark。',
      '3 つ以上の見出しがある文書の自動目次。',
      '表紙、順序付き章、検索できる選択、印刷の分離を備えた複数ファイルの文書ブック。',
      '章ごとの PDF 書き出しと、サイズ・ファイル数に上限のある ZIP ダウンロード。',
      'インターフェース、記事、このページの 9 言語版。',
      'アカウント不要、ローカルまたは貼り付けた Markdown のアップロードなし、サーバー側レンダラーなし。',
    ],
    usefulnessTitle: '誰のためか',
    usefulnessBody: 'md2pdf は、ツールチェーンよりも文書が重要なときに役立ちます。',
    usefulnessItems: [
      {
        title: '学生と教員',
        body: '講義ノート、課題、読書資料を、提出または印刷できる PDF にします。',
      },
      {
        title: '開発者とテクニカルライター',
        body: 'コンバーターをインストールせずに、README、RFC、文書の章を書き出せます。',
      },
      {
        title: 'コンサルタントと小さなチーム',
        body: 'Markdown を第三者サービスに送らず、整った文書を顧客に渡せます。',
      },
      {
        title: 'アーキビスト',
        body: '上流で変更・消失するかもしれない文書の、読めてページ付けされた写しを残せます。',
      },
    ],
    privacyTitle: 'プライバシー',
    privacyBody:
      'ローカルファイルと貼り付けた Markdown はブラウザで読み取られ、アップロードされません。公開 GitHub の取得では、README と画像のために GitHub へ匿名リクエストを送ります。非公開リポジトリには対応していません。アカウントはなく、文書に結び付いた変換分析もありません。',
    accessibilityTitle: 'アクセシビリティ',
    accessibilityBody:
      'ページは意味のあるランドマーク、ラベルの付いた操作要素、視認できるフォーカス、現在のパスを保つ言語切り替えを使います。動きは控えめで、動きを減らす設定を尊重します。印刷用スタイルは見出しを本文と一緒に保ち、可能な範囲でコードブロック、表、画像がページをまたいで分割されないようにします。アクセシビリティは一度きりの主張ではなく、継続的な取り組みとして扱います。',
    ownershipTitle: '所有',
    ownershipBody:
      'md2pdf は LadeStack の製品です。製品名、サイト、公開されている各言語版は LadeStack に帰属します。ソースリポジトリは github.com/girishlade111/ReadmePDF で公開されています。製品名が md2pdf でも、リポジトリは元の名前のままです。md2pdf は無料で使えます。',
    contactTitle: '連絡先',
    contactBody:
      '質問、訂正、アクセシビリティの報告を歓迎します。最も確実なのはメールです。GitHub の issue は公開され、検索できます。',
    contactEmailLabel: 'メール',
    contactGithubLabel: 'GitHub',
    contactLinkedinLabel: 'LinkedIn',
    contactWebsiteLabel: 'LadeStack',
    ctaTitle: '文書を入れて、PDF を出す。',
    ctaBody:
      'アカウント不要。ローカルファイルのアップロードなし。サンプルから始めるか、自分の Markdown を貼り付けるか、公開 README を取得してください。',
    ctaButton: 'コンバーターを開く',
  },

  ko: {
    kicker: 'md2pdf 소개',
    heroTitle: '반드시 밖으로 나가야 하는 문서를 위한 작은 도구.',
    heroLead:
      'md2pdf는 Markdown을 브라우저에서 인쇄용 PDF로 바꿉니다. Girish Lade가 만들고 LadeStack이 소유하며, 무료로 사용할 수 있습니다.',
    storyTitle: '이야기',
    storyP1:
      'md2pdf는 익숙한 문제에서 시작했습니다. 화면에서는 편하게 읽히지만 보내거나 보관하거나 인쇄하는 순간 무너지는 문서 말입니다.',
    storyP2:
      'Markdown은 목적지가 PDF를 요구하기 전까지는 이식성이 좋습니다. 브라우저 인쇄 대화상자는 페이지는 보존하지만 문서는 보존하지 않습니다. 사이트 탐색이 섞이고, 상대 경로 이미지가 깨지고, 넓은 코드 블록이 잘리고, 표가 어색한 곳에서 나뉩니다. 데스크톱 변환기는 일부를 해결하지만 보통 설치, 계정, 서버 업로드를 요구합니다.',
    storyP3:
      'md2pdf는 더 좁은 길을 택합니다. Markdown을 읽고, 저장소 기준 상대 자산을 해석하고, GitHub 스타일 Markdown을 브라우저에서 렌더링하고, 결과를 정리하고, 인쇄 스타일을 적용한 뒤 브라우저 자체 PDF 엔진에 넘깁니다. 사용자가 공개 README를 가져오라고 요청하지 않는 한 원본은 기기를 떠나지 않습니다.',
    missionTitle: '미션',
    missionBody:
      '브라우저만 있으면 누구나 계정, 구독, 업로드 없이 Markdown에서 깔끔한 PDF를 만들 수 있게 합니다. 변환 과정을 이해 가능하게 유지합니다. 사용자는 문서를 보고, 테마를 고르고, 무엇이 인쇄될지 정확히 알 수 있어야 합니다.',
    visionTitle: '비전',
    visionBody:
      '평범한 문서를 이식 가능하게 만들기 위해 독점 데스크톱 앱이나 변환 서비스가 필요 없는 웹. Markdown은 이미 읽을 수 있고, 차이를 비교할 수 있고, 오래갑니다. PDF는 충실한 출구여야 하며 또 다른 사일로가 되어서는 안 됩니다.',
    founderTitle: '만든 사람',
    founderName: 'Girish Lade',
    founderRole: 'md2pdf 제작자 · LadeStack',
    founderP1:
      'Girish Lade는 LadeStack에서 md2pdf를 만듭니다. 변환기, 인쇄 테마, 문서 책 워크플로, 이 사이트의 번역판을 작업합니다.',
    founderP2:
      '이 프로젝트는 의도적으로 작고 자립적입니다. 정적 Astro 프런트엔드, 브라우저에서만 동작하는 변환 코드, 그리고 약속이 아니라 결과를 확인하는 테스트 모음입니다.',
    founderNote:
      '이 페이지의 초상 자리는 실제 사진을 위해 비워 두었습니다. 사진이 추가되기 전까지는 생성 이미지나 스톡 사진 대신 브랜드 모노그램을 표시합니다.',
    approachTitle: '제품을 만드는 방식',
    approachItems: [
      {
        title: '브라우저 우선',
        body: 'Markdown 파싱, 정리, 목차 생성, 인쇄 레이아웃, PDF 조립은 모두 방문자의 기기에서 실행됩니다. 사이트는 정적이며 애플리케이션 백엔드가 없습니다.',
      },
      {
        title: '작고 명확한 한도',
        body: '단일 파일은 2 MB까지입니다. 문서 책은 최대 30개 Markdown 파일, 파일당 750 KB, 총 6 MB, 제한된 수의 API 요청을 지원합니다.',
      },
      {
        title: '출력은 인쇄',
        body: '최종 PDF는 브라우저의 기본 인쇄 엔진이 만듭니다. md2pdf는 정리된 문서와 인쇄 스타일을 제공할 뿐, PDF 렌더링 엔진인 척하지 않습니다.',
      },
      {
        title: '아홉 개 언어',
        body: '인터페이스, 가이드, 이 페이지는 영어, 스페인어, 일본어, 한국어, 중국어 간체, 러시아어, 터키어, 프랑스어, 브라질 포르투갈어로 제공됩니다.',
      },
    ],
    achievementsTitle: '성과를 있는 그대로',
    achievementsLead: '로드맵 약속이 아니라 이미 제공 중인 기능입니다.',
    achievements: [
      '공개 GitHub README 가져오기, 기본 브랜치 탐색, 저장소 기준 이미지와 링크 재작성.',
      'Markdown 붙여넣기, 업로드, 샘플 워크플로. GitHub 스타일 표, 작업 목록, 펜스 코드 지원.',
      '네 가지 인쇄 테마: Clean, Business, Academic, Dark.',
      '세 개 이상의 제목이 있는 문서를 위한 자동 목차.',
      '표지, 순서가 있는 장, 검색 가능한 선택, 인쇄 분리를 갖춘 다중 파일 문서 책.',
      '장별 PDF 내보내기와 크기 및 파일 수 한도가 있는 ZIP 다운로드.',
      '인터페이스, 기사, 이 페이지의 아홉 개 번역판.',
      '계정 없음, 로컬 또는 붙여넣은 Markdown 업로드 없음, 서버 측 렌더러 없음.',
    ],
    usefulnessTitle: '누구를 위한가',
    usefulnessBody: 'md2pdf는 도구 체인보다 문서가 중요할 때 유용합니다.',
    usefulnessItems: [
      {
        title: '학생과 교사',
        body: '강의 노트, 과제, 읽기 자료를 제출하거나 인쇄할 수 있는 PDF로 만듭니다.',
      },
      {
        title: '개발자와 기술 작가',
        body: '변환기를 설치하지 않고 README, RFC, 문서 장을 내보냅니다.',
      },
      {
        title: '컨설턴트와 소규모 팀',
        body: 'Markdown을 제3자 서비스로 보내지 않고 깔끔한 문서를 고객에게 전달합니다.',
      },
      {
        title: '아키비스트',
        body: '원본에서 바뀌거나 사라질 수 있는 문서의 읽기 쉽고 페이지가 나뉜 사본을 보관합니다.',
      },
    ],
    privacyTitle: '개인정보',
    privacyBody:
      '로컬 파일과 붙여넣은 Markdown은 브라우저에서 읽히며 업로드되지 않습니다. 공개 GitHub 가져오기는 README와 이미지를 위해 GitHub에 익명 요청을 보냅니다. 비공개 저장소는 지원하지 않습니다. 계정이 없고 문서에 연결된 변환 분석도 없습니다.',
    accessibilityTitle: '접근성',
    accessibilityBody:
      '페이지는 의미 있는 랜드마크, 레이블이 있는 컨트롤, 보이는 포커스 스타일, 현재 경로를 유지하는 언어 전환기를 사용합니다. 움직임은 절제되어 있으며 동작 줄이기 설정을 존중합니다. 인쇄 스타일은 제목을 내용과 함께 유지하고 가능한 범위에서 코드 블록, 표, 이미지가 페이지를 넘어 나뉘지 않게 합니다. 접근성은 일회성 주장이 아니라 계속하는 작업으로 다룹니다.',
    ownershipTitle: '소유',
    ownershipBody:
      'md2pdf는 LadeStack 제품입니다. 제품 이름, 사이트, 공개된 번역판은 LadeStack에 속합니다. 소스 저장소는 github.com/girishlade111/ReadmePDF에 공개되어 있습니다. 제품 이름이 md2pdf여도 저장소는 원래 이름을 유지합니다. md2pdf는 무료로 사용할 수 있습니다.',
    contactTitle: '연락',
    contactBody:
      '질문, 수정, 접근성 보고를 환영합니다. 가장 확실한 방법은 이메일입니다. GitHub 이슈는 공개되어 있고 검색할 수 있습니다.',
    contactEmailLabel: '이메일',
    contactGithubLabel: 'GitHub',
    contactLinkedinLabel: 'LinkedIn',
    contactWebsiteLabel: 'LadeStack',
    ctaTitle: '문서를 넣고 PDF를 꺼내세요.',
    ctaBody:
      '계정 없음. 로컬 파일 업로드 없음. 샘플로 시작하거나, Markdown을 붙여넣거나, 공개 README를 가져오세요.',
    ctaButton: '변환기 열기',
  },

  zh: {
    kicker: '关于 md2pdf',
    heroTitle: '为必须离开屏幕的文档准备的小工具。',
    heroLead:
      'md2pdf 在浏览器中把 Markdown 变成可打印的 PDF。它由 Girish Lade 构建，归 LadeStack 所有，可免费使用。',
    storyTitle: '缘起',
    storyP1:
      'md2pdf 始于一个常见问题：文档在屏幕上读起来很舒服，但一到发送、归档或打印的时候就会散架。',
    storyP2:
      'Markdown 一直很便携，直到对方要求 PDF。浏览器的打印对话框保留的是页面，不是文档：导航会混进来，相对图片会失效，宽代码块会被裁掉，表格会在尴尬的位置断开。桌面转换器能解决一部分问题，但通常要求安装、注册账号或上传到服务器。',
    storyP3:
      'md2pdf 选择了一条更窄的路。它读取 Markdown，解析仓库相对资源，在浏览器中渲染 GitHub 风格 Markdown，清理结果，应用打印样式，然后交给浏览器自己的 PDF 引擎。除非用户要求获取公开 README，源文件不会离开设备。',
    missionTitle: '使命',
    missionBody:
      '让任何有浏览器的人都能把 Markdown 变成干净的 PDF，无需账号、订阅或上传。让转换过程保持可理解：用户应该能看到文档、选择主题，并清楚知道将要打印什么。',
    visionTitle: '愿景',
    visionBody:
      '一个普通文档不需要专有桌面应用或转换服务就能便携的 web。Markdown 已经可读、可比较、可长期保存；PDF 应该是忠实的出口，而不是另一个封闭空间。',
    founderTitle: '制作者',
    founderName: 'Girish Lade',
    founderRole: 'md2pdf 创作者 · LadeStack',
    founderP1:
      'Girish Lade 在 LadeStack 构建 md2pdf。他负责转换器、打印主题、文档书籍流程以及本站的多语言版本。',
    founderP2:
      '这个项目刻意保持小而自足：静态 Astro 前端、仅在浏览器中运行的转换代码，以及验证输出而不是承诺输出的测试套件。',
    founderNote:
      '本页的肖像位置留给真实照片。在添加照片之前，组件显示品牌字母组合，而不是生成图片或图库照片。',
    approachTitle: '产品如何构建',
    approachItems: [
      {
        title: '浏览器优先',
        body: 'Markdown 解析、清理、目录生成、打印布局和 PDF 组装都在访客设备上运行。站点是静态的，没有应用后端。',
      },
      {
        title: '小而明确的限制',
        body: '单个文件上限 2 MB。文档书籍最多 30 个 Markdown 文件，单文件 750 KB，总计 6 MB，API 请求数量也有上限。',
      },
      {
        title: '打印就是输出',
        body: '最终 PDF 来自浏览器原生打印引擎。md2pdf 提供清理后的文档和打印样式，并不假装自己是 PDF 渲染引擎。',
      },
      {
        title: '九种语言',
        body: '界面、指南和本页提供英语、西班牙语、日语、韩语、简体中文、俄语、土耳其语、法语和巴西葡萄牙语版本。',
      },
    ],
    achievementsTitle: '如实说明的成果',
    achievementsLead: '这些是已经交付的能力，不是路线图承诺。',
    achievements: [
      '导入公开 GitHub README，自动发现默认分支，并重写仓库相对的图片和链接。',
      'Markdown 粘贴、上传和示例流程，支持 GitHub 风格表格、任务列表和围栏代码。',
      '四种打印主题：Clean、Business、Academic 和 Dark。',
      '为三个或更多标题的文档自动生成目录。',
      '多文件文档书籍，包含封面、有序章节、可搜索选择和打印隔离。',
      '逐章 PDF 导出和 ZIP 下载，带文件大小与数量限制。',
      '界面、文章和本页的九种本地化版本。',
      '无需账号，本地或粘贴的 Markdown 不会上传，也没有服务器端渲染器。',
    ],
    usefulnessTitle: '适合谁',
    usefulnessBody: '当文档比工具链更重要时，md2pdf 就有用。',
    usefulnessItems: [
      {
        title: '学生和教师',
        body: '把课程笔记、作业和阅读材料变成可提交或打印的 PDF。',
      },
      {
        title: '开发者和技术写作者',
        body: '无需安装转换器，就能导出 README、RFC 或一组文档章节。',
      },
      {
        title: '顾问和小团队',
        body: '不必把 Markdown 发给第三方服务，就能把干净文档交给客户。',
      },
      {
        title: '归档人员',
        body: '为可能在上游变化或消失的文档保留一份可读、分页的副本。',
      },
    ],
    privacyTitle: '隐私',
    privacyBody:
      '本地文件和粘贴的 Markdown 在浏览器中读取，不会上传。获取公开 GitHub 内容时，会为 README 及其图片向 GitHub 发出匿名请求；不支持私有仓库。没有账号，也没有与文档关联的转换分析。',
    accessibilityTitle: '无障碍',
    accessibilityBody:
      '页面使用语义化地标、带标签的控件、可见的焦点样式，以及能保留当前路径的语言切换器。动效有限，并尊重减少动态效果的偏好。打印样式让标题与内容保持在一起，并尽可能避免代码块、表格和图片跨页断开。无障碍被视为持续工作，而不是一次性声明。',
    ownershipTitle: '归属',
    ownershipBody:
      'md2pdf 是 LadeStack 的产品。产品名称、站点和已发布的各语言版本归 LadeStack 所有。源代码仓库公开在 github.com/girishlade111/ReadmePDF；产品名为 md2pdf，仓库保留原名。md2pdf 可免费使用。',
    contactTitle: '联系',
    contactBody:
      '欢迎提出问题、更正和无障碍报告。电子邮件最可靠；GitHub issue 是公开且可搜索的。',
    contactEmailLabel: '电子邮件',
    contactGithubLabel: 'GitHub',
    contactLinkedinLabel: 'LinkedIn',
    contactWebsiteLabel: 'LadeStack',
    ctaTitle: '放入文档，取出 PDF。',
    ctaBody:
      '无需账号。本地文件不会上传。从示例开始，粘贴自己的 Markdown，或获取公开 README。',
    ctaButton: '打开转换器',
  },

  ru: {
    kicker: 'О md2pdf',
    heroTitle: 'Небольшой инструмент для документа, которому нужно уехать.',
    heroLead:
      'md2pdf превращает Markdown в готовый к печати PDF прямо в браузере. Его создал Girish Lade, им владеет LadeStack, и им можно пользоваться бесплатно.',
    storyTitle: 'История',
    storyP1:
      'md2pdf начался с знакомой проблемы: документация удобно читается на экране, но рассыпается, как только её нужно отправить, заархивировать или напечатать.',
    storyP2:
      'Markdown переносим, пока получателю не нужен PDF. Диалог печати браузера сохраняет страницу, а не документ: в него попадает навигация, ломаются относительные изображения, широкие блоки кода обрезаются, а таблицы разрываются в неудобных местах. Настольные конвертеры решают часть этого, но обычно требуют установки, учётной записи или загрузки на сервер.',
    storyP3:
      'md2pdf выбирает более узкий путь. Он читает Markdown, разрешает пути относительно репозитория, отрисовывает Markdown в стиле GitHub в браузере, очищает результат, применяет стили печати и передаёт документ встроенному PDF-движку браузера. Исходник не покидает устройство, если только пользователь не попросит загрузить публичный README.',
    missionTitle: 'Миссия',
    missionBody:
      'Сделать чистый PDF из Markdown доступным каждому, у кого есть браузер, без учётной записи, подписки и загрузки. Сохранить конвертацию понятной: человек должен видеть документ, выбирать тему и точно знать, что будет напечатано.',
    visionTitle: 'Видение',
    visionBody:
      'Веб, в котором обычным документам не нужны проприетарное настольное приложение или сервис конвертации, чтобы стать переносимыми. Markdown уже читаем, сравним и долговечен; PDF должен быть честным выходом, а не вторым хранилищем.',
    founderTitle: 'Создатель',
    founderName: 'Girish Lade',
    founderRole: 'Создатель md2pdf · LadeStack',
    founderP1:
      'Girish Lade разрабатывает md2pdf в LadeStack. Он работает над конвертером, темами печати, сценарием книги документации и локализованными версиями этого сайта.',
    founderP2:
      'Проект намеренно небольшой и самодостаточный: статический фронтенд на Astro, код конвертации только для браузера и набор тестов, который проверяет результат, а не обещает его.',
    founderNote:
      'Место для портрета на этой странице зарезервировано для подлинной фотографии. Пока её нет, компонент показывает фирменный монограмм, а не сгенерированное или стоковое изображение.',
    approachTitle: 'Как устроен продукт',
    approachItems: [
      {
        title: 'Сначала браузер',
        body: 'Разбор Markdown, очистка, создание оглавления, печатная вёрстка и сборка PDF выполняются на устройстве посетителя. Сайт статический; серверного приложения нет.',
      },
      {
        title: 'Небольшие явные лимиты',
        body: 'Один файл — до 2 МБ. Книга документации вмещает до 30 файлов Markdown, по 750 КБ на файл, 6 МБ всего, с ограниченным числом запросов к API.',
      },
      {
        title: 'Вывод — печать',
        body: 'Итоговый PDF создаёт встроенный движок печати браузера. md2pdf передаёт очищенный документ и стили печати и не притворяется движком рендеринга PDF.',
      },
      {
        title: 'Девять языков',
        body: 'Интерфейс, руководства и эта страница опубликованы на английском, испанском, японском, корейском, упрощённом китайском, русском, турецком, французском и бразильском португальском.',
      },
    ],
    achievementsTitle: 'Достижения без прикрас',
    achievementsLead: 'Это уже выпущенные возможности, а не обещания из плана.',
    achievements: [
      'Импорт публичных README с GitHub с определением ветки по умолчанию и переписыванием относительных изображений и ссылок.',
      'Сценарии вставки, загрузки и примера для Markdown, включая таблицы в стиле GitHub, списки задач и блоки кода.',
      'Четыре темы печати: Clean, Business, Academic и Dark.',
      'Автоматическое оглавление для документов с тремя и более заголовками.',
      'Книга документации из нескольких файлов с обложкой, упорядоченными главами, поиском по выбору и изоляцией печати.',
      'Экспорт PDF по главам и ZIP-архивы с ограничениями по размеру и числу файлов.',
      'Девять локализованных версий интерфейса, статей и этой страницы.',
      'Без учётной записи, без загрузки локального или вставленного Markdown и без серверного рендерера.',
    ],
    usefulnessTitle: 'Для кого',
    usefulnessBody: 'md2pdf полезен, когда документ важнее инструментов.',
    usefulnessItems: [
      {
        title: 'Студенты и преподаватели',
        body: 'Превращайте конспекты, задания и материалы для чтения в PDF, который можно сдать или напечатать.',
      },
      {
        title: 'Разработчики и технические писатели',
        body: 'Экспортируйте README, RFC или главы документации, не устанавливая конвертер.',
      },
      {
        title: 'Консультанты и небольшие команды',
        body: 'Передавайте клиенту аккуратный документ, не отправляя Markdown стороннему сервису.',
      },
      {
        title: 'Архивисты',
        body: 'Сохраняйте читаемую постраничную копию документации, которая может измениться или исчезнуть у источника.',
      },
    ],
    privacyTitle: 'Приватность',
    privacyBody:
      'Локальные файлы и вставленный Markdown читаются в браузере и не загружаются. При получении публичного GitHub-репозитория отправляются анонимные запросы к GitHub за README и изображениями; приватные репозитории не поддерживаются. Учётных записей нет, аналитика конвертации к документу не привязана.',
    accessibilityTitle: 'Доступность',
    accessibilityBody:
      'Страницы используют смысловые ориентиры, подписанные элементы управления, видимый фокус и переключатель языка, сохраняющий текущий путь. Анимация ограничена и учитывает предпочтение уменьшенного движения. Стили печати удерживают заголовки с содержимым и по возможности не разрывают блоки кода, таблицы и изображения между страницами. Доступность — постоянная работа, а не разовое заявление.',
    ownershipTitle: 'Права',
    ownershipBody:
      'md2pdf — продукт LadeStack. LadeStack владеет названием продукта, сайтом и опубликованными версиями. Репозиторий с исходным кодом открыт на github.com/girishlade111/ReadmePDF; репозиторий сохраняет первоначальное имя, хотя продукт называется md2pdf. md2pdf можно использовать бесплатно.',
    contactTitle: 'Контакты',
    contactBody:
      'Вопросы, исправления и сообщения о доступности приветствуются. Надёжнее всего электронная почта; issues на GitHub публичны и доступны для поиска.',
    contactEmailLabel: 'Почта',
    contactGithubLabel: 'GitHub',
    contactLinkedinLabel: 'LinkedIn',
    contactWebsiteLabel: 'LadeStack',
    ctaTitle: 'Документ на входе, PDF на выходе.',
    ctaBody:
      'Без учётной записи. Локальные файлы не загружаются. Начните с примера, вставьте свой Markdown или загрузите публичный README.',
    ctaButton: 'Открыть конвертер',
  },

  tr: {
    kicker: 'md2pdf hakkında',
    heroTitle: 'Yola çıkması gereken bir belge için küçük bir araç.',
    heroLead:
      'md2pdf, Markdown’ı tarayıcınızda baskıya hazır PDF’e dönüştürür. Girish Lade tarafından geliştirilir, LadeStack’e aittir ve ücretsizdir.',
    storyTitle: 'Hikâye',
    storyP1:
      'md2pdf tanıdık bir sorunla başladı: ekranda rahatça okunan, ama gönderilmesi, arşivlenmesi veya yazdırılması gerektiği anda dağılan belgeler.',
    storyP2:
      'Markdown, hedef PDF istemediği sürece taşınabilirdir. Tarayıcı yazdırma iletişim kutusu belgeyi değil sayfayı korur: gezinme karışır, göreli görseller kırılır, geniş kod blokları kesilir ve tablolar can sıkıcı yerlerde bölünür. Masaüstü dönüştürücüler bunun bir kısmını çözer, ama genellikle kurulum, hesap veya sunucuya yükleme ister.',
    storyP3:
      'md2pdf daha dar bir yol seçer. Markdown’ı okur, depoya göreli varlıkları çözer, GitHub tarzı Markdown’ı tarayıcıda işler, sonucu temizler, baskı stilini uygular ve belgeyi tarayıcının kendi PDF motoruna verir. Kullanıcı genel bir README getirmesini istemedikçe kaynak cihazdan çıkmaz.',
    missionTitle: 'Misyon',
    missionBody:
      'Tarayıcısı olan herkesin Markdown’dan temiz bir PDF üretmesini sağlamak; hesap, abonelik veya yükleme olmadan. Dönüşümü anlaşılır tutmak: kullanıcı belgeyi görmeli, tema seçmeli ve tam olarak neyin yazdırılacağını bilmelidir.',
    visionTitle: 'Vizyon',
    visionBody:
      'Sıradan belgelerin taşınabilir olmak için tescilli bir masaüstü uygulamasına veya dönüştürme hizmetine ihtiyaç duymadığı bir web. Markdown zaten okunabilir, karşılaştırılabilir ve dayanıklıdır; PDF sadık bir çıkış olmalı, ikinci bir kapanmış alan değil.',
    founderTitle: 'Yapımcı',
    founderName: 'Girish Lade',
    founderRole: 'md2pdf yaratıcısı · LadeStack',
    founderP1:
      'Girish Lade, md2pdf’yi LadeStack’te geliştirir. Dönüştürücü, baskı temaları, belge kitabı akışı ve bu sitenin yerelleştirilmiş sürümleri üzerinde çalışır.',
    founderP2:
      'Proje bilinçli olarak küçük ve kendi kendine yeterlidir: statik bir Astro ön ucu, yalnızca tarayıcıda çalışan dönüştürme kodu ve çıktıyı vaat etmek yerine denetleyen bir test paketi.',
    founderNote:
      'Bu sayfadaki portre alanı gerçek bir fotoğraf için ayrılmıştır. Fotoğraf eklenene kadar bileşen, üretilmiş veya stok görsel yerine markalı bir monogram gösterir.',
    approachTitle: 'Ürün nasıl kuruldu',
    approachItems: [
      {
        title: 'Önce tarayıcı',
        body: 'Markdown ayrıştırma, temizleme, içindekiler üretimi, baskı düzeni ve PDF birleştirme ziyaretçinin cihazında çalışır. Site statiktir; uygulama arka ucu yoktur.',
      },
      {
        title: 'Küçük ve açık sınırlar',
        body: 'Tek dosyalar 2 MB ile sınırlıdır. Bir belge kitabı en fazla 30 Markdown dosyası, dosya başına 750 KB, toplam 6 MB ve sınırlı sayıda API isteği barındırır.',
      },
      {
        title: 'Çıktı baskıdır',
        body: 'Son PDF’i tarayıcının yerleşik baskı motoru üretir. md2pdf temizlenmiş belgeyi ve baskı stilini sağlar; PDF işleme motoru olduğunu iddia etmez.',
      },
      {
        title: 'Dokuz dil',
        body: 'Arayüz, rehberler ve bu sayfa İngilizce, İspanyolca, Japonca, Korece, Basitleştirilmiş Çince, Rusça, Türkçe, Fransızca ve Brezilya Portekizcesi olarak yayımlanır.',
      },
    ],
    achievementsTitle: 'Olduğu gibi başarılar',
    achievementsLead: 'Bunlar yol haritası vaatleri değil, yayımlanmış yeteneklerdir.',
    achievements: [
      'Genel GitHub README içe aktarma, varsayılan dal keşfi ve depoya göreli görsel ve bağlantı yeniden yazma.',
      'Markdown için yapıştırma, yükleme ve örnek akışları; GitHub tarzı tablolar, görev listeleri ve kod blokları.',
      'Dört baskı teması: Clean, Business, Academic ve Dark.',
      'Üç veya daha fazla başlığı olan belgeler için otomatik içindekiler.',
      'Kapak, sıralı bölümler, aranabilir seçim ve baskı yalıtımı olan çok dosyalı belge kitabı.',
      'Bölüm başına PDF dışa aktarma ve boyut ile dosya sayısı sınırlı ZIP indirmeleri.',
      'Arayüzün, makalelerin ve bu sayfanın dokuz yerelleştirilmiş sürümü.',
      'Hesap yok, yerel veya yapıştırılmış Markdown yüklemesi yok, sunucu tarafı işleyici yok.',
    ],
    usefulnessTitle: 'Kimin için',
    usefulnessBody: 'md2pdf, araç zincirinden çok belge önemli olduğunda işe yarar.',
    usefulnessItems: [
      {
        title: 'Öğrenciler ve öğretmenler',
        body: 'Ders notlarını, ödevleri ve okuma paketlerini teslim edilebilir veya yazdırılabilir PDF’e dönüştürün.',
      },
      {
        title: 'Geliştiriciler ve teknik yazarlar',
        body: 'Dönüştürücü kurmadan README, RFC veya belge bölümlerini dışa aktarın.',
      },
      {
        title: 'Danışmanlar ve küçük ekipler',
        body: 'Markdown’ı üçüncü taraf hizmete göndermeden müşteriye temiz bir belge verin.',
      },
      {
        title: 'Arşivciler',
        body: 'Kaynağında değişebilecek veya kaybolabilecek belgelerin okunabilir, sayfalanmış kopyasını saklayın.',
      },
    ],
    privacyTitle: 'Gizlilik',
    privacyBody:
      'Yerel dosyalar ve yapıştırılan Markdown tarayıcıda okunur ve yüklenmez. Genel GitHub getirmesi, README ve görselleri için GitHub’a anonim istekler yapar; özel depolar desteklenmez. Hesap yoktur ve belgeye bağlı dönüştürme analitiği yoktur.',
    accessibilityTitle: 'Erişilebilirlik',
    accessibilityBody:
      'Sayfalar anlamsal bölgeler, etiketli kontroller, görünür odak stilleri ve geçerli yolu koruyan bir dil değiştirici kullanır. Hareket sınırlıdır ve azaltılmış hareket tercihine uyar. Baskı stili başlıkları içerikleriyle tutar ve mümkün olduğunca kod bloklarının, tabloların ve görsellerin sayfalar arasında bölünmesini önler. Erişilebilirlik tek seferlik bir iddia değil, süren bir çalışma olarak ele alınır.',
    ownershipTitle: 'Sahiplik',
    ownershipBody:
      'md2pdf bir LadeStack ürünüdür. Ürün adı, site ve yayımlanan sürümler LadeStack’e aittir. Kaynak deposu github.com/girishlade111/ReadmePDF adresinde herkese açıktır; ürünün adı md2pdf olsa da depo özgün adını korur. md2pdf ücretsizdir.',
    contactTitle: 'İletişim',
    contactBody:
      'Sorular, düzeltmeler ve erişilebilirlik bildirimleri memnuniyetle karşılanır. En güvenilir yol e-postadır; GitHub issue’ları herkese açık ve aranabilir.',
    contactEmailLabel: 'E-posta',
    contactGithubLabel: 'GitHub',
    contactLinkedinLabel: 'LinkedIn',
    contactWebsiteLabel: 'LadeStack',
    ctaTitle: 'Belgeyi koyun, PDF’i alın.',
    ctaBody:
      'Hesap yok. Yerel dosyalar yüklenmez. Örnekle başlayın, kendi Markdown’ınızı yapıştırın veya genel bir README getirin.',
    ctaButton: 'Dönüştürücüyü aç',
  },

  fr: {
    kicker: 'À propos de md2pdf',
    heroTitle: 'Un petit outil pour un document qui doit voyager.',
    heroLead:
      'md2pdf transforme du Markdown en PDF prêt à imprimer dans votre navigateur. Il est créé par Girish Lade, appartient à LadeStack et reste gratuit.',
    storyTitle: 'L’histoire',
    storyP1:
      'md2pdf est né d’un problème courant : une documentation confortable à l’écran qui se désagrège dès qu’il faut l’envoyer, l’archiver ou l’imprimer.',
    storyP2:
      'Markdown est portable jusqu’au moment où le destinataire exige un PDF. La boîte d’impression du navigateur conserve la page, pas le document : la navigation s’invite, les images relatives cassent, les blocs de code larges sont coupés et les tableaux se scindent aux mauvais endroits. Les convertisseurs de bureau règlent une partie du problème, mais demandent souvent une installation, un compte ou un envoi vers un serveur.',
    storyP3:
      'md2pdf choisit une voie plus étroite. Il lit le Markdown, résout les ressources relatives au dépôt, rend le Markdown de style GitHub dans le navigateur, assainit le résultat, applique une feuille de style d’impression et confie le document au moteur PDF natif du navigateur. La source ne quitte l’appareil que si l’utilisateur demande à md2pdf de récupérer un README public.',
    missionTitle: 'Mission',
    missionBody:
      'Rendre la production d’un PDF propre à partir de Markdown accessible à toute personne disposant d’un navigateur, sans compte, abonnement ni envoi de fichier. Garder la conversion compréhensible : voir le document, choisir un thème et savoir exactement ce qui sera imprimé.',
    visionTitle: 'Vision',
    visionBody:
      'Un web où les documents ordinaires n’ont pas besoin d’une application de bureau propriétaire ni d’un service de conversion pour devenir portables. Markdown est déjà lisible, comparable et durable ; le PDF doit être une sortie fidèle, pas un second silo.',
    founderTitle: 'Le créateur',
    founderName: 'Girish Lade',
    founderRole: 'Créateur de md2pdf · LadeStack',
    founderP1:
      'Girish Lade développe md2pdf chez LadeStack. Il travaille sur le convertisseur, les thèmes d’impression, le parcours du livre de documentation et les éditions localisées de ce site.',
    founderP2:
      'Le projet est volontairement petit et autonome : un frontend Astro statique, du code de conversion uniquement côté navigateur et une suite de tests qui vérifie la sortie plutôt que de la promettre.',
    founderNote:
      'Cet emplacement de portrait est réservé à une photographie authentique. Tant qu’elle n’est pas ajoutée, le composant affiche un monogramme de marque plutôt qu’une image générée ou de stock.',
    approachTitle: 'Comment le produit est construit',
    approachItems: [
      {
        title: 'Le navigateur d’abord',
        body: 'L’analyse du Markdown, l’assainissement, la génération du sommaire, la mise en page d’impression et l’assemblage du PDF s’exécutent sur l’appareil du visiteur. Le site est statique ; il n’y a pas de backend applicatif.',
      },
      {
        title: 'Des limites petites et explicites',
        body: 'Les fichiers simples sont limités à 2 Mo. Un livre de documentation accepte jusqu’à 30 fichiers Markdown, 750 Ko par fichier, 6 Mo au total et un nombre borné de requêtes API.',
      },
      {
        title: 'L’impression est la sortie',
        body: 'Le PDF final provient du moteur d’impression natif du navigateur. md2pdf fournit le document nettoyé et la feuille de style d’impression ; il ne prétend pas être un moteur de rendu PDF.',
      },
      {
        title: 'Neuf langues',
        body: 'L’interface, les guides et cette page sont publiés en anglais, espagnol, japonais, coréen, chinois simplifié, russe, turc, français et portugais du Brésil.',
      },
    ],
    achievementsTitle: 'Des acquis, sans emphase',
    achievementsLead: 'Ce sont des capacités livrées, pas des promesses de feuille de route.',
    achievements: [
      'Import de README GitHub publics avec découverte de la branche par défaut et réécriture des images et liens relatifs au dépôt.',
      'Parcours de collage, d’envoi et d’exemple pour Markdown, avec tableaux de style GitHub, listes de tâches et blocs de code.',
      'Quatre thèmes d’impression : Clean, Business, Academic et Dark.',
      'Un sommaire automatique pour les documents comptant trois titres ou plus.',
      'Un livre de documentation multi-fichiers avec couverture, chapitres ordonnés, sélection recherchable et isolation d’impression.',
      'Export PDF chapitre par chapitre et téléchargements ZIP avec limites de taille et de nombre de fichiers.',
      'Neuf éditions localisées de l’interface, des articles et de cette page.',
      'Aucun compte, aucun envoi pour le Markdown local ou collé et aucun moteur de rendu côté serveur.',
    ],
    usefulnessTitle: 'Pour qui',
    usefulnessBody: 'md2pdf est utile quand le document compte plus que la chaîne d’outils.',
    usefulnessItems: [
      {
        title: 'Étudiants et enseignants',
        body: 'Transformez notes de cours, devoirs et dossiers de lecture en PDF à rendre ou à imprimer.',
      },
      {
        title: 'Développeurs et rédacteurs techniques',
        body: 'Exportez un README, une RFC ou des chapitres de documentation sans installer de convertisseur.',
      },
      {
        title: 'Consultants et petites équipes',
        body: 'Remettez un document propre à un client sans envoyer le Markdown à un service tiers.',
      },
      {
        title: 'Archivistes',
        body: 'Conservez une copie lisible et paginée d’une documentation susceptible de changer ou de disparaître en amont.',
      },
    ],
    privacyTitle: 'Confidentialité',
    privacyBody:
      'Les fichiers locaux et le Markdown collé sont lus dans le navigateur et ne sont pas envoyés. La récupération d’un dépôt GitHub public envoie des requêtes anonymes à GitHub pour le README et ses images ; les dépôts privés ne sont pas pris en charge. Il n’y a ni compte ni analyse de conversion liée au document.',
    accessibilityTitle: 'Accessibilité',
    accessibilityBody:
      'Les pages utilisent des repères sémantiques, des contrôles étiquetés, des styles de focus visibles et un sélecteur de langue qui conserve le chemin courant. Les animations sont limitées et respectent la préférence de mouvement réduit. La feuille d’impression garde les titres avec leur contenu et évite autant que possible de couper blocs de code, tableaux et images entre les pages. L’accessibilité est un travail continu, pas une affirmation ponctuelle.',
    ownershipTitle: 'Propriété',
    ownershipBody:
      'md2pdf est un produit LadeStack. LadeStack possède le nom du produit, le site et les éditions publiées. Le dépôt source est public à l’adresse github.com/girishlade111/ReadmePDF ; le dépôt garde son nom d’origine alors que le produit s’appelle md2pdf. md2pdf est gratuit.',
    contactTitle: 'Contact',
    contactBody:
      'Les questions, corrections et signalements d’accessibilité sont bienvenus. L’e-mail est la voie la plus fiable ; les issues GitHub sont publiques et consultables.',
    contactEmailLabel: 'E-mail',
    contactGithubLabel: 'GitHub',
    contactLinkedinLabel: 'LinkedIn',
    contactWebsiteLabel: 'LadeStack',
    ctaTitle: 'Un document entre, un PDF sort.',
    ctaBody:
      'Sans compte. Aucun envoi pour les fichiers locaux. Partez de l’exemple, collez votre Markdown ou récupérez un README public.',
    ctaButton: 'Ouvrir le convertisseur',
  },

  pt: {
    kicker: 'Sobre o md2pdf',
    heroTitle: 'Uma ferramenta pequena para um documento que precisa viajar.',
    heroLead:
      'O md2pdf transforma Markdown em PDF pronto para impressão no seu navegador. É criado por Girish Lade, pertence à LadeStack e é gratuito.',
    storyTitle: 'A história',
    storyP1:
      'O md2pdf começou com um problema comum: documentação confortável na tela, mas que se desfaz no momento em que precisa ser enviada, arquivada ou impressa.',
    storyP2:
      'Markdown é portátil até o destino exigir um PDF. A caixa de impressão do navegador preserva a página, não o documento: a navegação entra junto, imagens relativas quebram, blocos de código largos são cortados e tabelas se dividem em pontos incômodos. Conversores de desktop resolvem parte disso, mas costumam pedir instalação, conta ou envio para um servidor.',
    storyP3:
      'O md2pdf escolhe um caminho mais estreito. Ele lê o Markdown, resolve recursos relativos ao repositório, renderiza Markdown no estilo GitHub no navegador, sanitiza o resultado, aplica uma folha de estilos de impressão e entrega o documento ao motor de PDF nativo do navegador. A fonte não sai do dispositivo, a menos que a pessoa peça ao md2pdf para buscar um README público.',
    missionTitle: 'Missão',
    missionBody:
      'Tornar um PDF limpo a partir de Markdown disponível para qualquer pessoa com um navegador, sem conta, assinatura ou upload. Manter a conversão compreensível: a pessoa deve ver o documento, escolher um tema e saber exatamente o que será impresso.',
    visionTitle: 'Visão',
    visionBody:
      'Uma web em que documentos comuns não precisem de um aplicativo de desktop proprietário ou de um serviço de conversão para se tornarem portáteis. Markdown já é legível, comparável e durável; o PDF deve ser uma saída fiel, não outro silo.',
    founderTitle: 'O criador',
    founderName: 'Girish Lade',
    founderRole: 'Criador do md2pdf · LadeStack',
    founderP1:
      'Girish Lade desenvolve o md2pdf na LadeStack. Ele trabalha no conversor, nos temas de impressão, no fluxo do livro de documentação e nas edições localizadas deste site.',
    founderP2:
      'O projeto é intencionalmente pequeno e autossuficiente: um frontend Astro estático, código de conversão apenas no navegador e uma suíte de testes que verifica a saída em vez de prometê-la.',
    founderNote:
      'Este espaço de retrato é reservado para uma fotografia autêntica. Até que ela seja adicionada, o componente mostra um monograma da marca em vez de uma imagem gerada ou de banco de imagens.',
    approachTitle: 'Como o produto é construído',
    approachItems: [
      {
        title: 'O navegador primeiro',
        body: 'Análise de Markdown, sanitização, geração de sumário, layout de impressão e montagem do PDF rodam no dispositivo do visitante. O site é estático; não há backend de aplicação.',
      },
      {
        title: 'Limites pequenos e explícitos',
        body: 'Arquivos individuais têm limite de 2 MB. Um livro de documentação aceita até 30 arquivos Markdown, 750 KB por arquivo, 6 MB no total e um número limitado de requisições à API.',
      },
      {
        title: 'A impressão é a saída',
        body: 'O PDF final vem do motor de impressão nativo do navegador. O md2pdf fornece o documento limpo e a folha de estilos de impressão; não finge ser um motor de renderização de PDF.',
      },
      {
        title: 'Nove idiomas',
        body: 'A interface, os guias e esta página são publicados em inglês, espanhol, japonês, coreano, chinês simplificado, russo, turco, francês e português do Brasil.',
      },
    ],
    achievementsTitle: 'Conquistas, sem enfeite',
    achievementsLead: 'São recursos já entregues, não promessas de roadmap.',
    achievements: [
      'Importação de README público do GitHub com descoberta do branch padrão e reescrita de imagens e links relativos ao repositório.',
      'Fluxos de colar, enviar e usar o exemplo para Markdown, com tabelas no estilo GitHub, listas de tarefas e blocos de código.',
      'Quatro temas de impressão: Clean, Business, Academic e Dark.',
      'Sumário automático para documentos com três ou mais títulos.',
      'Livro de documentação com vários arquivos, capa, capítulos ordenados, seleção pesquisável e isolamento de impressão.',
      'Exportação de PDF por capítulo e downloads ZIP com limites de tamanho e quantidade de arquivos.',
      'Nove edições localizadas da interface, dos artigos e desta página.',
      'Sem conta, sem upload para Markdown local ou colado e sem renderizador no servidor.',
    ],
    usefulnessTitle: 'Para quem é',
    usefulnessBody: 'O md2pdf é útil quando o documento importa mais que a cadeia de ferramentas.',
    usefulnessItems: [
      {
        title: 'Estudantes e professores',
        body: 'Transforme notas de aula, trabalhos e materiais de leitura em PDF para entregar ou imprimir.',
      },
      {
        title: 'Desenvolvedores e redatores técnicos',
        body: 'Exporte um README, uma RFC ou capítulos de documentação sem instalar um conversor.',
      },
      {
        title: 'Consultores e equipes pequenas',
        body: 'Entregue um documento limpo ao cliente sem enviar o Markdown a um serviço de terceiros.',
      },
      {
        title: 'Arquivistas',
        body: 'Guarde uma cópia legível e paginada de documentação que pode mudar ou desaparecer na origem.',
      },
    ],
    privacyTitle: 'Privacidade',
    privacyBody:
      'Arquivos locais e Markdown colado são lidos no navegador e não são enviados. A busca de um GitHub público faz requisições anônimas ao GitHub para o README e suas imagens; repositórios privados não são suportados. Não há contas nem análise de conversão ligada ao documento.',
    accessibilityTitle: 'Acessibilidade',
    accessibilityBody:
      'As páginas usam marcos semânticos, controles rotulados, estilos de foco visíveis e um seletor de idioma que preserva o caminho atual. O movimento é limitado e respeita a preferência de movimento reduzido. A folha de impressão mantém títulos junto ao conteúdo e evita, quando possível, dividir blocos de código, tabelas e imagens entre páginas. Acessibilidade é tratada como trabalho contínuo, não como uma afirmação única.',
    ownershipTitle: 'Propriedade',
    ownershipBody:
      'O md2pdf é um produto da LadeStack. A LadeStack é proprietária do nome do produto, do site e das edições publicadas. O repositório de código é público em github.com/girishlade111/ReadmePDF; o repositório mantém o nome original enquanto o produto é md2pdf. O md2pdf é gratuito.',
    contactTitle: 'Contato',
    contactBody:
      'Perguntas, correções e relatos de acessibilidade são bem-vindos. O e-mail é o caminho mais confiável; as issues do GitHub são públicas e pesquisáveis.',
    contactEmailLabel: 'E-mail',
    contactGithubLabel: 'GitHub',
    contactLinkedinLabel: 'LinkedIn',
    contactWebsiteLabel: 'LadeStack',
    ctaTitle: 'Coloque um documento, receba um PDF.',
    ctaBody:
      'Sem conta. Sem upload para arquivos locais. Comece pelo exemplo, cole seu Markdown ou busque um README público.',
    ctaButton: 'Abrir o conversor',
  },
};

/** @param {Locale} locale */
export function aboutContent(locale) {
  return ABOUT_CONTENT[locale] ?? ABOUT_CONTENT.en;
}

/** Display e-mail address used on the About page and in the footer. */
export const CONTACT_EMAIL = 'admin@ladestack.in';
export const CONTACT_GITHUB = 'https://github.com/girishlade111';
export const CONTACT_LINKEDIN = 'https://www.linkedin.com/in/girish-lade/';
export const CONTACT_WEBSITE = 'https://ladestack.in';
