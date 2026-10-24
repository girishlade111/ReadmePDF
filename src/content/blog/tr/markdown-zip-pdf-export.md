---
title: "Markdown Dosyalarını Bağımsız PDF Olarak Tek Bir ZIP Arşivinde İndirme"
description: "md2pdf ile çok sayıda Markdown dosyasını bağımsız PDF belgelerine dönüştürmeyi ve bunları tarayıcıda üretilen tek bir ZIP arşiviyle indirmeyi öğrenin."
pubDate: 2026-03-24
tags: ["markdown","zip","pdf","export"]
locale: "tr"
translationKey: "markdown-zip-pdf-export"
---

Tüm belgeleri tek bir birleşik kitap haline getirmek genel okuma için harika olsa da, pek çok iş akışı her kılavuz veya şartname için bağımsız PDF belgeleri gerektirir. Onlarca PDF dosyasını tek tek indirmek indirme klasörünü doldurur ve tarayıcının indirme uyarılarını tetikler. [md2pdf](/#converter) ile birden fazla Markdown dosyasını bağımsız PDF belgelerine dönüştürebilir ve bunları tek bir düzenli ZIP arşivi olarak indirebilirsiniz.

Bu rehber, toplu PDF üretim mekanizmasını, JSZip ile istemci tarafında sıkıştırma sürecini ve modüler dışa aktarım seçeneklerini açıklamaktadır.

## Ne Zaman Birleşik Kitap Yerine Bağımsız PDF Tercih Edilmelidir?

Her iki derleme modu da farklı dağıtım ihtiyaçlarına yanıt verir:

- **Modüler Paylaşım**: Tüm proje belgelerini paylaşmak yerine müşterilere veya ekip üyelerine yalnızca ilgili kılavuzları iletme imkanı sağlar.
- **Mikro Dokümantasyon**: Bağımsız API uç noktası yönergeleri veya sürüm notları ayrı dosyalar halinde daha kolay arşivlenir.
- **Tarayıcı İndirme Engellerini Aşma**: Belgeleri tek bir ZIP arşivi içinde sunmak tarayıcıların çoklu dosya indirme kısıtlamalarını engeller.

```text
Export Modes in md2pdf:
Mode A (Consolidated Book):
- Multi-chapter single PDF (e.g., project-documentation.pdf)
- Unified Table of Contents & continuous page numbering

Mode B (ZIP Archive Bundle):
- project-docs-bundle.zip
  ├── 01-getting-started.pdf
  ├── 02-architecture.pdf
  └── 03-api-reference.pdf
```

## JSZip ile Tarayıcı İçi ZIP Arşivi Oluşturma

md2pdf, sunucu iletişimine ihtiyaç duymadan doğrudan tarayıcınızda arşiv oluşturmak için güvenilir `JSZip` kütüphanesini kullanır:

1. **Sıralı İşleme**: Seçilen her Markdown belgesi, `pdf-lib` motoru aracılığıyla bağımsız bir PDF ikili arabelleğine dönüştürülür.
2. **Düzenli Dosya Adlandırma**: Üretilen PDF belgeleri orijinal Markdown dosya adlarından veya ana başlıklardan türetilen temiz adlar alır.
3. **Bellek İçi Sıkıştırma**: Her PDF belgesinin çizimi biter bitmez ikili verisi bellekteki ZIP akışına eklenir.
4. **Tek Tıkla İndirme**: Tüm belgeler hazırlandığında oluşturulan ZIP arşivi tek bir indirme işlemiyle kullanıcıya ulaştırılır.

## ZIP Arşivinde Klasör Hiyerarşisini Koruma

Çok katmanlı depolardan belge aktarırken md2pdf klasör düzenini ZIP arşivinin içinde koruma seçeneği sunar:

- **Hiyerarşik Düzen**: `docs/api/endpoints.md` konumundaki bir dosya, ZIP içinde de `docs/api/endpoints.pdf` yolunda saklanır.
- **Düz Klasör Yapısı**: İsteğe bağlı olarak tüm belgeler isim çakışmaları önlenerek tek bir klasörde düz olarak toplanabilir.

## İstemci Taraflı Bellek Yönetimi ve Performans

Onlarca yüksek çözünürlüklü PDF belgesini arka arkaya işlemek doğru yönetilmediğinde tarayıcı belleğini tüketebilir.

md2pdf toplu işlemleri sıralı dilimler halinde yürütür ve her belgenin ardından geçici DOM düğümlerini ve resim arabelleklerini temizler. Çöp toplayıcı dostu bu mimari, yüzlerce sayfalık projelerde dahi tarayıcı sekmesinin kilitlenmesini önler.

## md2pdf ile ZIP Paketini Dışa Aktarma

ZIP paketi oluşturmak için dosya listesinden istediğiniz Markdown belgelerini seçin, çıktı modunu "Bağımsız PDF'ler (ZIP)" olarak ayarlayın ve dışa aktar düğmesine basın. Birkaç saniye içinde tüm belgeleriniz paylaşıma hazır bir ZIP arşivi olarak indirilecektir.
