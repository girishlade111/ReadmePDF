---
title: "Özel PDF Kitaplar İçin Markdown Bölümlerini Sıralama ve Yeniden Düzenleme"
description: "md2pdf içindeki bölüm sıralama araçlarını kullanarak çok dosyalı Markdown belgelerini mantıksal bir okuma akışına sokup PDF kitaba dönüştürün."
pubDate: 2026-03-24
tags: ["markdown","pdf","book","documentation"]
locale: "tr"
translationKey: "chapter-sequencing-reordering-pdf"
---

Birden fazla Markdown belgesini tek bir PDF kitapta birleştirirken, ham alfabetik dosya sıralaması nadiren ideal bir okuma düzeni sunar. Giriş kılavuzları ayrıntılı teknik özelliklerden önce gelmeli, kurulum adımları sorun giderme eklerinden önde yer almalıdır. [md2pdf](/#converter) bünyesindeki bölüm sıralama kontrolleri, seçilen belgeleri kolayca yeniden düzenlemenizi sağlar.

Bu kılavuz, bölüm sıralama mekanizmasını, belge hiyerarşisi yönetimini ve yayın kalitesinde PDF kitapların nasıl derlendiğini ele almaktadır.

## Teknik Derlemelerde Belge Sıralaması Neden Önemlidir?

Yazılım depolarındaki dosya adları, okuyucunun pedagojik ihtiyaçlarından ziyade geliştirici alışkanlıklarını yansıtır.

- **Doğrusal Olmayan Dosya Adları**: `getting-started.md` ve `architecture.md` gibi belgeler alfabetik dizilimde mantıksal sırasını kaybeder.
- **Anlatım Bütünlüğü**: Teknik dokümantasyon aşamalı bir ilerleme gerektirir: giriş, önkoşullar, kurulum, temel ilkeler ve API referansı.
- **İçindekiler Uyumu**: Oluşturulan PDF belgesinin içindekiler tablosu doğrudan ayarladığınız bölüm sıralamasını takip eder.

```text
Optimized Chapter Order Example:
01. README.md              -> Title & Introduction
02. docs/install.md        -> Prerequisites & Setup
03. docs/quickstart.md     -> First Hands-on Tutorial
04. docs/architecture.md   -> Internal Architecture
05. docs/api-reference.md  -> Complete API Specifications
```

## md2pdf İçindeki Etkileşimli Sıralama Kontrolleri

md2pdf, derleme öncesinde belgelerin yerini ayarlamanız için pratik denetimler sunar:

1. **Yukarı ve Aşağı Taşıma**: Tek bir tıklamayla seçilen bölümleri kuyrukta ileriye veya geriye taşıyın.
2. **Kuyruk Görünümü**: Belgelerin birleştirileceği kesin sıralama listesini her zaman net şekilde görün.
3. **Sıfırlama ve Otomatik Dizilim**: Gerektiğinde deponun orijinal sıralamasına dönün veya alfabetik dizilimi uygulayın.

## Bölümler Arasında Hiyerarşi Kurma

md2pdf birden fazla dosyayı birleştirirken başlık düzeylerini standartlaştırarak düzenli bir yapı kurar:

- **Bölüm Başlıkları**: Her dosyanın en üst düzey başlığı, ana içindekiler tablosunda bağımsız bir bölüm başlığı haline gelir.
- **Alt Başlıklar**: Dosya içindeki H2 ve H3 başlıkları bölüm altındaki alt başlıklara dönüşerek PDF yer imlerine işlenir.
- **Temiz Sayfa Sonları**: Bölümler arasına otomatik sayfa sonları eklenerek içeriğin birbirine girmesi engellenir.

## Bölümler Arası Göreli Bağlantıları Koruma

Çok dosyalı projelerde dokümanlar birbirlerine sıklıkla `[Yapılandırma](config.md)` gibi göreli yollarla bağlantı verir.

md2pdf derleme anında bu göreli yolları PDF içi hedeflere dönüştürür. Böylece okuyucu 1. Bölümdeki bir bağlantıya tıkladığında doğrudan 4. Bölüme atlayabilir.

## Sıralanmış PDF Kitabınızı Derleme

Bölümleri istediğiniz okuma akışına yerleştirdikten sonra derleme düğmesine tıklayın. md2pdf dosyaları tarayıcı belleğinde birleştirir, dengeli tipografi ve kesintisiz sayfa numaraları uygulayarak profesyonel bir PDF kitap oluşturur.
