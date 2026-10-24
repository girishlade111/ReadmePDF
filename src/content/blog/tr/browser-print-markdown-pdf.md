---
title: "Kusursuz Markdown PDF İçin Tarayıcı Yazdırma Ayarları Rehberi"
description: "Markdown yazdırma ayarları rehberi: kenar boşlukları, sayfa boyutları, arka plan grafikleri, üstbilgi ve altbilgileri kaldırma ve sayfa kesmeleri."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Print","Browser","CSS","PDF"]
locale: "tr"
translationKey: "browser-print-markdown-pdf"
---

Tarayıcıda mükemmel biçimlendirilmiş bir Markdown belgesi, yazdırma penceresi ayarları doğru yapılmazsa biçimsiz bir çıktıya dönüşebilir. Kenarlarda çıkan tarihler, kod bloklarının bölünmesi, arka plan renklerinin silinmesi veya orantısız boşluklar Markdown kaynaklı değil, tarayıcının genel web sayfalarına yönelik standart tercihlerinden kaynaklanır.

md2pdf, CSS yazdırma sorgularını (`@media print`) tarayıcınızın yerel yazdırma motoruyla birleştirir. Yazdır düğmesine bastığınızda özel stiller devreye girerek gezinme çubuklarını gizler, içeriği ayıklar ve sayfalandırır. Buna karşın kağıt boyutu, kenar boşlukları ve arka plan renklerinin dahil edilmesi tamamen kullanıcının yazdırma penceresindeki seçimine bağlıdır.

Bu rehber Chrome, Firefox, Safari ve Edge üzerinde en yüksek kalitede PDF elde etmeniz için gerekli ayarları açıklamaktadır. Baskı temalarını önceden incelemek için [md2pdf baskı temaları rehberine](/tr/blog/readme-pdf-print-themes/) göz atabilirsiniz.

## Why browser print dialogs require careful configuration

Tarayıcıların varsayılan yazdırma mekanizması sıradan bir web sitesi çıktısı alacağınızı varsayar ve sayfa köşelerine tarihi, başlığı ve bağlantı adresini ekler. Resmi bir teknik belgede veya müşteri teklifinde bu web ibareleri profesyonellikten uzak bir izlenim bırakır.

Ayrıca tarayıcılar mürekkep tasarrufu gerekçesiyle "Arka plan grafikleri" seçeneğini varsayılan olarak kapalı tutar. Teknik dokümanlarda arka planın kapatılması kod bloklarının gölgesini, tablo başlıklarının zemin rengini ve uyarı kutularını yok ederek okunabilirliği ciddi şekilde düşürür.

Bu ayarları doğru yönetmek sıradan bir web çıktısını yayın kalitesinde bir PDF belgesine dönüştürür.

## Essential print settings: Paper size, margins, and scaling

Yazdırma ekranı açıldığında şu temel seçenekleri kontrol edin:

- **Hedef**: **PDF Olarak Kaydet** (Save as PDF) seçeneğini işaretleyin.
- **Kağıt Boyutu**: İhtiyacınıza göre uluslararası standart olan **A4** veya Kuzey Amerika standardı olan **Letter** seçin.
- **Yön**: Normal belgeler için **Dikey (Portrait)** bırakın. Yalnızca çok sütunlu geniş tablolar ağırlıktaysa **Yatay (Landscape)** kullanın.
- **Kenar Boşlukları**: **Varsayılan** veya **Yok** seçeneğini kullanın. md2pdf CSS dosyalarında hassas iç boşluklar tanımlı olduğundan, minimum kenar seçmek metinleri sayfa kenarına fazla yapıştırabilir.
- **Ölçek**: **%100 (Varsayılan)** olarak koruyun. Yazıların netliğini kaybetmemesi için %90 altına düşmekten kaçının.

## Enabling background graphics for theme fidelity

Yazdırma ekranındaki en hayati kutucuk **Arka plan grafikleri** (Background graphics) seçeneğidir:

```text
[x] Background graphics (Chrome, Edge, Opera)
[x] Print Backgrounds (Firefox)
[x] Print backgrounds (Safari)
```

Bu kutu işaretlendiğinde:

- Kod bloklarının zemin tonları ve sözdizimi renklendirmeleri tam olarak korunur.
- Tablo başlıkları ve satır çizgileri kontrastını kaybetmez.
- Uyarı ve dikkat kutularının belirteç kenarlıkları muhafaza edilir.
- Seçilen temanın özel çizgileri ve ayraçları kağıda aktarılır.

Bu kutuyu işaretlemezseniz kod blokları şeffaf basılır ve gövde metninden ayırt edilmesi zorlaşır.

## Suppressing unwanted browser headers and footers

Tarayıcılar varsayılan olarak şu bilgileri sayfa kenarına iliştirir:

- Üstbilgi: Sayfa başlığı ve yazdırma tarihi.
- Altbilgi: Tam web bağlantı adresi ve sayfa numarası (örneğin "1/4").

Yazdırma ekranında **Üstbilgiler ve altbilgiler** kutucuğunun işaretini kaldırın:

```text
[ ] Headers and footers (Uncheck to remove browser URL and date)
```

Bu işareti kaldırdığınızda tarayıcının eklediği URL ve zaman damgaları silinir, md2pdf tarafından sağlanan temiz sayfa düzeni hakim olur.

## Page-break control across headings, tables, and code

md2pdf garip sayfa bölünmelerini önlemek için otomatik kurallar içerir:

```css
h1, h2, h3 { break-after: avoid; }
pre, table, figure { break-inside: avoid; }
```

- **Yalnız başlıkların önlenmesi**: Başlıklar sayfanın son satırında tek başına bırakılmaz; otomatik olarak takip eden paragrafla birlikte bir sonraki sayfaya aktarılır.
- **Kod bloğu bütünlüğü**: Sayfa boyunu aşmadığı sürece kod bloklarının ortadan ikiye kesilmesi engellenir.
- **Tablo satırları**: Veri satırlarının sayfa sınırında bölünmesi engellenir.

## Browser-specific printing quirks and fixes

- **Google Chrome ve Edge**: En kararlı vektör PDF çıktısını sağlar. "Arka plan grafikleri" kutusunu açıp "Üstbilgi ve altbilgileri" kapatmayı unutmayın.
- **Mozilla Firefox**: Kenar boşluklarını biraz dar uygulama eğilimindedir. Kenar taşması yaşarsanız boşlukları "Varsayılan" yapın.
- **Apple Safari**: Yazdırma penceresinde "Ayrıntıları Göster" seçeneğine tıklayarak "Arka planları yazdır" kutusunu görünür kılın.

Doğru yazdırma ayarlarını uygulayarak [md2pdf](/#converter) ile kusursuz PDF belgeleri oluşturun.
