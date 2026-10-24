---
title: "Canlı PDF Önizleme ile Markdown Belgelerini Anında Denetleyin"
description: "md2pdf canlı önizleme motorunun GitHub tarzı Markdown işleme, HTML temizleme ve baskı stillerini yansıtma prensipleri ve denetim ipuçları."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Preview","HTML","Security"]
locale: "tr"
translationKey: "live-markdown-preview-pdf"
---

Görsel bir önizleme olmadan PDF çıktısı almak deneme yanılma ile vakit kaybetmektir. Bir tablonun sütununu daraltıp dışa aktarır, harici görüntüleyiciyi açtığınızda bir başlığın sayfa sonunda tek başına kaldığını görürsünüz. Her paragrafta bu döngüyü tekrarlamak büyük bir zaman israfıdır.

md2pdf, yan yana çalışan gerçek zamanlı bir önizleme paneliyle bu sorunu çözer. Metin yazdıkça, yapıştırdıkça veya içe aktardıkça sağdaki panel baskı CSS stilleri uygulanmış nihai tasarımı anında görüntüler. Ekranda gördüğünüz yazı tipi, kenar boşlukları ve sayfa düzeni yazdırılan PDF ile birebir örtüşür.

Bu rehber, canlı önizleme sisteminin çalışma mantığını, DOMPurify güvenlik katmanını ve baskı öncesi yerleşim kontrollerini ele almaktadır. Hızlı metin düzenleme adımları için [Markdown yapıştırma ve düzenleme rehberini](/tr/blog/markdown-editor-paste-pdf/) inceleyebilirsiniz.

## Why live preview matters for print-bound documents

Web tarayıcıları ile PDF yazdırma motorları CSS yerleşim kurallarını farklı yorumlar. Normal bir web sayfası aşağıya doğru sonsuz akar, oysa baskı belgelerinin katı fiziksel sınırları vardır:

- **Sayfa kesme zorunlulukları**: Tablolar, resimler ve kod blokları sayfa yüksekliğine saygı göstermelidir.
- **Tipografi netliği**: Başlık ve metin boyutları 300 DPI baskı çözünürlüğünde dengeli ve okunabilir kalmalıdır.
- **Kenar boşluğu sınırları**: Kenar boşluklarının dışına taşan unsurlar kaydırma çubuğu oluşturmaz; doğrudan kağıttan kesilir.

Baskı simülasyonlu bir önizleme, sistem yazdırma penceresini açmadan önce yerleşim hatalarını tespit etmenizi sağlar.

## How the client-side preview pipeline renders Markdown

md2pdf üzerindeki işleme hattı Markdown metnini milisaniyeler içinde stil verilmiş DOM düğümlerine dönüştürür:

```javascript
const rawHtml = markdownParser.render(markdownSource);
const cleanHtml = DOMPurify.sanitize(rawHtml, sanitizeConfig);
previewElement.innerHTML = cleanHtml;
applyHeadingAnchors(previewElement);
```

Ayrıştırıcı, CommonMark ve GitHub-Flavored Markdown standartlarına tam uyumludur; üstü çizili metinleri, otomatik bağlantıları, görev listelerini ve sözdizimi vurgulu kodları kusursuz işler.

## HTML sanitization and safety filters

Bilinmeyen kaynaklardan veya açık depolardan Markdown metinleri aktarılırken güvenlik kritik bir unsurdur. Markdown ham HTML kullanımına izin verdiğinden siteler arası betik çalıştırma (XSS) riskleri barındırabilir.

md2pdf oluşturulan her HTML metnini sıkı kurallarla DOMPurify süzgecinden geçirir:

- **Zararlı etiketlerin temizlenmesi**: `<script>`, `<iframe>`, `<object>` ve `<form>` etiketleri anında silinir.
- **Nitelik arındırma**: `onclick`, `onload` gibi JavaScript tetikleyicileri ayıklanır.
- **Protokol denetimi**: `javascript:` veya `data:text/html` ile başlayan bağlantılar geçersiz kılınır.
- **İzin verilen biçimlendirme**: Yalnızca sayfa sunumuna yarayan güvenli etiketler (`<b>`, `<code>`, `<table>`, `<img>`) korunur.

Tüm bu güvenlik taraması önizleme paneline içerik basılmadan önce tarayıcınızda gerçekleşir.

## Previewing print themes and theme transitions

md2pdf dört farklı baskı teması sunar: Clean, Business, Academic ve Dark. Araç çubuğundan tema değiştirdiğinizde önizleme paneli CSS sınıfları anında güncellenir:

- **Clean**: Sistem fontlarını temel alan modern ve sade tasarım.
- **Business**: Belirgin kenarlıklar ve kurumsal bölümler içeren teknik rapor tarzı.
- **Academic**: Numaralandırılmış başlıklar ve sıkı satır aralığı sunan klasik tırnaklı yazı tipi.
- **Dark**: Ekranda gözü yormayan koyu tema, yazdırma anında mürekkep tasarrufu için beyaz zemine döner.

Temaların tipografik detayları için [md2pdf baskı temaları kılavuzunu](/tr/blog/readme-pdf-print-themes/) inceleyebilirsiniz.

## Differences between screen preview and print output

Önizleme baskı sonucunu yüksek doğrulukla yansıtsa da monitör ile kağıt arasında bazı farklar bulunur:

- **Görünüm genişliği**: Önizleme tarayıcı pencerenizin genişliğine göre esner, oysa baskı A4 veya Letter gibi sabit ebatlara kilitlenir.
- **Sayfa bölünmeleri**: Ekranda metin akıcı tek parça görünürken yazıcı motoru CSS `break-inside: avoid` kuralına göre metni sayfalara böler.
- **Renk dengesi**: Ekrandaki parlak RGB renkler kağıt üzerine basıldığında mürekkep özellikleri nedeniyle biraz daha koyu çıkabilir.

## Diagnosing preview rendering glitches

- **Önizleme güncellenmiyor**: Kapatılmamış bir HTML etiketi veya devasa bir Base64 resim olup olmadığını denetleyin.
- **Tabloların kenardan taşması**: Çok sütunlu geniş tablolar için [Markdown tabloları PDF rehberindeki](/tr/blog/markdown-tables-to-pdf/) sütun sarma yöntemlerini uygulayın.
- **Görsellerin görünmemesi**: Bağlantıların HTTPS mutlak adresler olduğundan emin olun veya [GitHub README içe aktarma](/tr/blog/github-readme-to-pdf/) aracını kullanın.

Belgelerinizi gerçek zamanlı kontrol ederek hatasız PDF belgeleri üretmek için [md2pdf](/#converter) aracını kullanın.
