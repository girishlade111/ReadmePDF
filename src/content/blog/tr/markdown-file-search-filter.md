---
title: "Büyük Belge Ağaçlarında Markdown Dosyalarını Arama ve Filtreleme"
description: "md2pdf içindeki gerçek zamanlı arama ve yol filtreleme özellikleriyle yüzlerce Markdown dosyası arasından istediklerinizi seçip PDF üretmeyi öğrenin."
pubDate: 2026-03-24
tags: ["markdown","search","pdf","documentation"]
locale: "tr"
translationKey: "markdown-file-search-filter"
---

Kapsamlı yazılım depolarında veya geniş dokümantasyon merkezlerinde, yüzlerce Markdown dosyası derin alt klasörlere yayılmış olabilir. İlgili kılavuzları bulmak için klasörleri tek tek elle açmak hem yorucu hem de zaman alıcıdır. [md2pdf](/#converter) bünyesindeki gerçek zamanlı arama ve yol filtreleme yetenekleri, aradığınız belgeleri milisaniyeler içinde bulmanızı sağlar.

Bu makalede, md2pdf istemci taraflı arama mekanizmasının nasıl çalıştığı, dosya yolu eşleştirme kuralları ve filtrelenmiş belgelerin PDF ortamına nasıl aktarıldığı ele alınmaktadır.

## Geniş Dokümantasyon Ağaçlarında Gezinmenin Zorlukları

Modern yazılım projeleri API referanslarını, başlangıç kılavuzlarını ve mimari dokümanları tek bir depoda toplama eğilimindedir.

- **Yüksek Dosya Sayısı**: Büyük sistemler onlarca alt dizinde 300'den fazla Markdown dosyası barındırabilir.
- **Derin Klasör Hiyerarşisi**: Belgeler genellikle dört veya beş kademe derindeki klasörlere yerleştirilir.
- **Yinelenen Dosya Adları**: Farklı klasörlerde `index.md` veya `overview.md` gibi aynı isimde dosyalar bulunması tam yol bilgisi olmadan karışıklığa yol açar.

```text
Search Query Example: "auth/jwt"
Matches:
- docs/services/auth/jwt-validation.md
- guides/security/auth/jwt-tokens.md
Excluded:
- docs/services/billing/invoices.md
```

## Tarayıcı İçi Gerçek Zamanlı Arama Mekanizması

md2pdf arama filtresi, dosya ağacı yüklendiğinde bellekte oluşturulan hafif bir dizin üzerinden tamamen tarayıcınızda çalışır.

Arama kutusuna karakter yazdığınız anda:

1. **Anında Değerlendirme**: Ağ trafiği veya sayfa yenilemesi olmadan sonuçlar anında listelenir.
2. **Yol ve Dosya Adı Eşleşmesi**: Arama filtresi hem dosya adını hem de üst dizin yolunu değerlendirir; örneğin `api/v2` sorgusu bu klasördeki tüm kılavuzları filtreler.
3. **Otomatik Düğüm Genişletme**: Eşleşen dosyaların bulunduğu klasörler otomatik açılırken eşleşmeyenler gizlenir.

## Filtrelenmiş Dosyaları Kolayca Seçme

Belgeleri bulduktan sonra dışa aktarma listesine eklemek de oldukça pratiktir:

- **Toplu Seçim**: Filtrelenmiş ve ekranda görünen tüm dosyaları tek bir kutuyu işaretleyerek seçebilirsiniz.
- **Hassas İnceleme**: İstemediğiniz tamamlayıcı notların işaretini filtre listesinden kolayca kaldırabilirsiniz.
- **Aramayı Temizleme**: Arama kutusunu temizlediğinizde tüm ağaç tekrar görünür ve filtreleme sırasında yaptığınız seçimler korunur.

## Büyük Dokümantasyon Depolarında Yüksek Performans

md2pdf, optimize edilmiş dizinleme ve sanal DOM güncellemeleri sayesinde binlerce dosya içeren depolarda bile kesintisiz bir arama hızı sunar.

Arama sırasında sadece yol dizgileri bellekte işlendiğinden sistem kaynakları korunur ve tarayıcı gücü doğrudan PDF dizgileme işlemlerine ayrılır.

## Filtrelenmiş Belge Grubunu PDF Olarak Dışa Aktarma

Arama sonucunda istediğiniz Markdown belgelerini seçtikten sonra derleme adımına geçebilirsiniz. Belgeleri içindekiler tablosu barındıran tek bir PDF kitap olarak derleyebilir ya da bağımsız PDF'lerden oluşan bir ZIP paketi halinde indirebilirsiniz.
