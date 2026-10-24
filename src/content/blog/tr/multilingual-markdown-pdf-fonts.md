---
title: "Markdown PDF Belgelerine Çok Dilli Yazı Tipleri Gömme ve Karakter Koruma"
description: "md2pdf ile fontkit ve pdf-lib kullanarak CJK karakterleri, Kiril alfabesi ve Türkçe harfleri eksiksiz gösteren yazı tiplerini PDF içine gömmeyi öğrenin."
pubDate: 2026-03-24
tags: ["markdown","fonts","multilingual","pdf"]
locale: "tr"
translationKey: "multilingual-markdown-pdf-fonts"
---

Temel Markdown dönüştürücülerindeki en büyük kusurlardan biri, çok dilli metinleri işlerken yazı tiplerinin bozulmasıdır. Bir PDF motoru yazı tipi gömme desteği olmadan Çince, Japonca, Korece (CJK), Kiril veya aksanlı Latin harfleriyle karşılaştığında ekranda "tofu" adı verilen boş kareler çıkar. [md2pdf](/#converter) içindeki tam Unicode yazı tipi gömme mimarisi, uluslararası teknik belgelerin tüm cihazlarda kusursuz görünmesini sağlar.

Bu makalede, `pdf-lib` ve `@pdf-lib/fontkit` ile tarayıcıda yazı tipi gömme mekanizması, glif yönetimi ve karakter bozulmalarını önleme yöntemleri anlatılmaktadır.

## Taşınabilir Belgelerde Unicode Tipografi Zorlukları

Standart PDF özellikleri yalnızca temel ASCII ve Batı Avrupa karakterlerini destekleyen 14 çekirdek yazı tipini (Helvetica, Times vb.) içerir.

- **Tofu Sorunu**: Tanımlanmamış Unicode kod noktaları boş kare kutular (□) olarak ekrana gelir.
- **CJK Karakterlerinin Hacmi**: Doğu Asya alfabeleri on binlerce karakter barındırdığından yazı tiplerinin optimize edilerek gömülmesi şarttır.
- **Türkçe Harfler ve Aksanlar**: Türkçedeki noktalı/noktasız harfler (ç, ğ, ı, ö, ş, ü) ve Kiril alfabeleri doğru kod sayfası desteğine ihtiyaç duyar.

```text
Multilingual Glyph Coverage in md2pdf:
- Latin & Extended Latin: English, Spanish, French, Portuguese, Turkish
- Cyrillic Alphabets:     Russian, Ukrainian, Bulgarian
- East Asian Ideographs:  Simplified Chinese (简体中文), Japanese (日本語)
- Hangul Syllables:       Korean (한국어)
```

## @pdf-lib/fontkit ile Yüksek Performanslı Yazı Tipi Gömme

md2pdf, TrueType (TTF) ve OpenType (OTF) yazı tipi tablolarını doğrudan tarayıcınızda ayrıştırmak için `@pdf-lib/fontkit` kütüphanesini kullanır:

1. **İstemcide Yazı Tipi İndirme**: Noto Sans, Source Han Sans ve Roboto Mono gibi açık kaynaklı kaliteli fontlar belge diline göre belleğe alınır.
2. **Karakter Eşleştirme**: `fontkit` metindeki her Unicode karakterini tarayarak font tablosundaki tam vektör çizimiyle eşleştirir.
3. **PDF İçine Vektör Kaydı**: `pdf-lib` bu vektörleri PDF dosyasının içine gömer ve belgeyi tamamen bağımsız bir hale getirir.

## Desteklenen Dokuz Dilde Kusursuz Tipografi

md2pdf desteklediği dokuz dilde yüksek standartta tipografik çıktı sunar:

- **Türkçe**: Noktalı ve noktasız "i" harfleri (`İ` / `i`, `I` / `ı`) ve özel harfler (ç, ğ, ö, ş, ü) bozulmadan net şekilde basılır.
- **İngilizce, İspanyolca, Fransızca, Portekizce**: Aksan işaretleri ve özel karakterler doğru aralıklarla dizilir.
- **Rusça (Kiril)**: Latin başlıklarla görsel uyum sağlayan dengeli Kiril yazı tipi dengesi.
- **Japonca, Çince ve Korece**: Karmaşık ideogramlar ve Hangıl heceleri dengeli boşluklarla yüksek çözünürlükte işlenir.

## Cihazdan Bağımsız Taşınabilirlik

Yazı tipi çizimleri doğrudan PDF ikili verisine gömüldüğünden:

Oluşturulan belge, okuyucunun bilgisayarında veya telefonunda ilgili Asya ya da Kiril fontları yüklü olmasa dahi her ekranda ilk hazırlandığı mükemmellikte açılır.

## md2pdf ile Çok Dilli Belgeler Oluşturma

İster Japonca bir API kılavuzu, ister Rusça bir mimari rehber veya Türkçe bir teknik doküman hazırlayın; md2pdf tipografi işlemlerini kendiliğinden halleder. Metninizi aktarın ve karakter kaybı yaşamadan profesyonel bir PDF çıktısı alın.
