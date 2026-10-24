---
title: "PDF Dönüştürmede Markdown Göreli Resim Yolları ve Bağlantıları Çözme"
description: "md2pdf aracının göreli resim yollarını ve belgeler arası Markdown bağlantılarını çözümleyip yüksek çözünürlüklü grafiklere ve PDF içi bağlantılara dönüştürmesini öğrenin."
pubDate: 2026-03-24
tags: ["markdown","images","links","pdf"]
locale: "tr"
translationKey: "markdown-relative-images-links-pdf"
---

Kaynak kod depolarındaki Markdown belgeleri yoğun şekilde göreli yollara dayanır. Mimari çizimleri `./assets/diagram.png` altında, ekran görüntüleri `../images/screen.jpg` dizininde ve bölümler arası bağlantılar `./getting-started.md` dosyasındadır. Bir dönüştürücü bu yolları depo bağlamında hesaplayamazsa resimler açılmaz ve bağlantılar kopar. [md2pdf](/#converter) ile göreli yollar tarayıcıda çözümlenir ve PDF içine sorunsuz gömülür.

Bu makalede, md2pdf göreli yol ayrıştırma mekanizması, istemci tarafında resim indirme adımları ve yerel bağlantıların PDF içi hedeflere nasıl dönüştürüldüğü açıklanmaktadır.

## Statik Markdown Belgelerinde Göreli Yol Sorunları

Markdown dosyaları yerel dizinler veya GitHub arayüzü ile birlikte çalışacak şekilde tasarlanmıştır:

- **Kırık Resim Simgeleri**: Dizin bağlamı olmadan ayrıştırılan `![Mimari](images/arch.png)` gibi bir ifade resim yükleyemez.
- **Çalışmayan Dosya Bağlantıları**: Komşu dosyalara işaret eden `[Kurulum](setup.md)` bağlantıları PDF formatına geçtiğinde hedefini kaybeder.
- **Üst Dizinleri Aşma**: `../` içeren bağlantılar hedef kaynağı bulmak için ağaç üzerinde matematiksel yol hesabı gerektirir.

```text
Relative Path Resolution Matrix:
Base Document:  docs/guides/installation.md
Image Path:     ../assets/diagram.png
Resolved Asset: docs/assets/diagram.png (Fetched & Inlined)

Link Path:      ./configuration.md
Resolved Link:  Internal PDF Anchor -> Chapter: Configuration
```

## GitHub Depolarından Resim Kaynaklarını Çözümleme

GitHub üzerinden belge aktarırken md2pdf her dosyanın bulunduğu dizin derinliğini izler:

1. **Yol Standartlaştırma**: `../../images/flow.png` gibi yollar işlemdeki dosyanın dizinine göre hesaplanır.
2. **Doğrudan İstemci İndirmesi**: md2pdf, GitHub içerik dağıtım ağındaki ham kaynak bağlantısını oluşturarak resmi tarayıcıya çeker.
3. **Bellekte Dönüştürme**: İndirilen resim ikili arabelleğe dönüştürülür ve `pdf-lib` kütüphanesiyle doğrudan PDF sayfasına gömülür.
4. **Geniş Biçim Desteği**: PNG, JPEG, WebP ve SVG formatları en boy oranı korunarak yerleştirilir.

## Dosya Bağlantılarını PDF İçi Hedeflere Dönüştürme

Teknik belgeler bölümler arasında yoğun çapraz referanslar barındırır:

- **Yerel Bağlantı Tespiti**: md2pdf, `.md` dosyalarını işaret eden bağlantıları tarayarak derleme listesindeki belgelerle eşleştirir.
- **Dahili Hedef Köprüleri**: Hedef dosya derlenen PDF kitabın bir bölümüyse bağlantı PDF içi sayfa atlama hedefine dönüştürülür.
- **Web Yedek Bağlantısı**: Hedef dosya PDF derlemesine dahil edilmediyse bağlantı GitHub üzerindeki web sayfasına yönlendirilir.

## İlişkili Görsellerle Yerel Dosya Yükleme Desteği

md2pdf bilgisayarınızdaki yerel dosyaları dönüştürürken görsel paketleriyle birlikte yüklemeyi destekler:

Dosya seçici üzerinden Markdown belgesini ve ilgili görselleri aynı anda seçebilirsiniz. md2pdf dosya adlarını bellekte eşleştirerek resimlerinizi harici bir sunucuya yüklemeden PDF'e işler.

## Güvenilir Görseller ve Bağlantılarla PDF Üretimi

Resimlerin ve bağlantıların doğru çözümlenmesi boş sayfaları ve çalışmayan referansları ortadan kaldırır. md2pdf ile dışa aktardığınızda çizimler net baskı kalitesinde işlenir ve bölümler arası geçişler akıcı bir şekilde çalışır.
