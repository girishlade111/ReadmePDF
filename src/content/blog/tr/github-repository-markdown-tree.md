---
title: "Çok Dosyalı Markdown PDF Dışa Aktarımı İçin GitHub Ağacını Keşfetme"
description: "GitHub depo dizin ağacını keşfetmeyi, klasörlerdeki Markdown dosyalarını filtrelemeyi ve belgeleri düzenli PDF formatına dönüştürmeyi öğrenin."
pubDate: 2026-03-24
tags: ["github","markdown","pdf","documentation"]
locale: "tr"
translationKey: "github-repository-markdown-tree"
---

Büyük açık kaynaklı depolar genellikle belgelerini iç içe geçmiş onlarca dizine dağıtır. Her Markdown dosyasını manuel olarak bulmak, indirmek ve PDF formatına dönüştürmek saatler alabilir. [md2pdf](/#converter) ile depo dosya ağacını doğrudan tarayıcınızda inceleyebilir ve yalnızca ihtiyacınız olan bölümleri seçebilirsiniz.

Bu kılavuz, md2pdf aracının depo ağaçlarını nasıl ayrıştırdığını, çok düzeyli klasör yapılarında nasıl gezindiğini ve teknik dokümanları PDF üretimine nasıl hazırladığını açıklamaktadır.

## GitHub Depo Ağacı Ayrıştırması Nasıl Çalışır?

md2pdf arayüzüne genel bir depo bağlantısı girdiğinizde, istemci Git ağacı meta verilerini almak için doğrudan GitHub genel API'sini sorgular. Deponun tüm kaynak kod arşivini indirmek yerine yalnızca dosya gezgini oluşturmak için gereken hafif yapısal veriler alınır.

Listelenen tüm dosyalar `.md`, `.markdown`, `.mdown` ve `.mkd` gibi desteklenen Markdown uzantılarına göre taranır. Belge harici kodlar ve varlıklar ağaçtan ayıklanarak sade ve odaklanmış bir teknik kılavuz listesi sunulur.

```bash
# Expected GitHub repository tree representation
docs/
├── architecture/
│   ├── overview.md
│   └── data-flow.md
├── guides/
│   ├── getting-started.md
│   └── deployment.md
└── api-reference.md
```

## İç İçe Klasörlerde ve Dosya Hiyerarşilerinde Gezinme

Gelişmiş yazılım projeleri teknik kılavuzlarını işlevsel klasörlere böler. md2pdf, sayfadan ayrılmadan alt dizinleri inceleyebileceğiniz genişletilebilir bir klasör ağacı sunar.

1. **Düğümleri Genişletme ve Daraltma**: İçeriği göstermek veya gizlemek için klasör adlarına tıklayın. Hiyerarşi düzeni korunur.
2. **Açık Göreli Yollar**: Gezgin tam göreli yolları göstererek her belgenin projedeki konumunu netleştirir.
3. **Dosya Doğrulama**: Dönüştürme işlemine başlamadan önce hedef dosyaların mevcut olduğunu kolayca teyit edin.

## Farklı Dizinlerdeki Markdown Dosyalarını Seçme

Depodaki her dosyayı dönüştürmek zorunda değilsiniz. md2pdf dosya seçimi üzerinde tam denetim sağlar:

- **Nokta Atışı Seçim**: Özel bir el kitabı oluşturmak için farklı dizinlerdeki belirli dosyaları işaretleyin.
- **Klasör Düzeyinde Seçim**: Bir klasörün onay kutusuna tıklayarak altındaki tüm Markdown belgelerini tek hamlede seçin veya kaldırın.
- **Dizinler Arası Birleştirme**: `docs/`, `tutorials/` ve kök dizindeki `README.md` dosyasını tek bir tutarlı belgede buluşturun.

## İstemci Taraflı Güvenlik ve API Hız Sınırı Optimizasyonu

Tüm ağaç sorguları ve belge indirme işlemleri kullanıcının tarayıcısında gerçekleşir. Kişisel erişim belirteçleri veya depo içerikleri hiçbir zaman harici uygulama sunucularına aktarılmaz.

GitHub API, kimliği doğrulanmamış oturumlarda IP başına saatlik 60 istek sınırı uygular. md2pdf, özyinelemeli Git ağacı sorguları kullanarak istek sayısını en aza indirir ve büyük depolarda dahi akıcı bir deneyim sunar.

## Seçilen Ağacı PDF Formatına Dönüştürme

İstediğiniz Markdown belgelerini seçtikten sonra derleme düğmesine tıklayın. Belgelerinizi tek bir ZIP arşivi içinde ayrı PDF dosyaları olarak alabilir veya içindekiler tablosu ve sayfa numaraları bulunan birleşik bir PDF kitap olarak dışa aktarabilirsiniz.
