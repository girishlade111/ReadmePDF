---
title: "Sürümlü Markdown PDF Üretimi İçin GitHub Dal, Etiket ve İşleme Sabitleme"
description: "md2pdf ile GitHub depolarından Markdown içe aktarırken belirli Git dallarını, etiketleri veya commit SHA kodlarını sabitleyerek sürümlü PDF oluşturmayı öğrenin."
pubDate: 2026-03-24
tags: ["github","git","markdown","pdf"]
locale: "tr"
translationKey: "github-branch-tag-commit-pdf"
---

Yazılım belgeleri her yeni sürümde güncellenir. Bir deponun varsayılan dalındaki teknik belgeleri doğrudan dışa aktarırsanız, henüz yayınlanmamış özellikleri veya uyumsuz API değişikliklerini istemeden dahil edebilirsiniz. [md2pdf](/#converter) ile belgenizi belirli Git dallarına, sürüm etiketlerine veya sabit commit kodlarına sabitleyebilirsiniz.

Bu eğitim yazısı, Git referans sabitleme mekanizmasını, uygun referans türünün nasıl seçileceğini ve sürüme sadık PDF kılavuzlarının nasıl üretileceğini açıklamaktadır.

## Teknik Dokümantasyonda Git Referans Sabitleme Neden Önemlidir?

Kurumsal dağıtımlar veya uzun süreli destek (LTS) sürümleri için kullanım kılavuzları hazırlarken, belgenin kurulu yazılım sürümüyle birebir örtüşmesi gerekir.

- **Canlı Ortam Doğruluğu**: PDF kılavuzun henüz geliştirilmekte olan özellikleri değil, üretim ortamında aktif API uç noktalarını açıklamasını sağlar.
- **Denetim ve Uyumluluk**: Yasal denetimlerde sabit bir commit özetinden oluşturulan belgeler, sistemin durumunu kanıtlayan değişmez bir delil niteliği taşır.
- **Geçmiş Sürümleri Koruma**: Yerel diske eski depo sürümlerini klonlamaya gerek kalmadan önceki sürümlere ait kılavuzları dilediğiniz zaman yeniden üretebilirsiniz.

```text
Supported Git Reference Types:
- Branch:  refs/heads/v2.1-maintenance
- Tag:     refs/tags/v2.1.0-lts
- Commit:  7f2b9a1d4e8c3b0f5a6d7e8c9b0a1f2e3d4c5b6a
```

## Üretim Kılavuzları İçin Sürüm Etiketlerini (Tags) Kullanma

Sürüm etiketleri, bir projenin kararlı kilometre taşlarını temsil eder. md2pdf içinde etiketli bir depo adresi girdiğinizde veya menüden seçim yaptığınızda, dosyalar tam olarak o etiketin anlık görüntüsünden alınır.

1. **Etiket Keşfi**: Bir depo incelendiğinde md2pdf mevcut anlamsal sürüm etiketlerini (ör. `v1.4.0`, `v2.0.0-rc1`) otomatik olarak listeler.
2. **Anlık Görüntü Çekme**: Etiket referansı altındaki tüm dosyalar o sürüm anındaki durumu birebir yansıtır.
3. **Sürüm Başlıkları**: Belgenin kapağında veya üstbilgisinde etiket adını belirterek okuyucuların sürüm kapsamını hemen görmesini sağlayın.

## Bakım Dallarını Hedefleme

Ekipler geçmiş sürümlere yönelik hata düzeltmeleri yayınladığında, güncellenen belgeler genellikle özel bakım dallarına işlenir.

`support/3.x` veya `v1-stable` gibi bir dal adı belirterek, md2pdf aracının en güncel düzeltmeleri bu hattan almasını sağlayabilirsiniz. Böylece ana daldaki kararsız kodlardan etkilenmeden doğru yönergeler elde edersiniz.

## Commit SHA ile Değişmez Dışa Aktarımlar

Belgelerin kusursuz biçimde tekrarlanabilirliği için 40 karakterlik Git commit SHA kodu en güvenilir yöntemdir. Dallar veya değiştirilebilir etiketlerin aksine, commit özetleri matematiksel olarak sabittir.

md2pdf içinde bir commit SHA kodu belirttiğinizde, Git ağacı projenin o anki durumundan okunur. İleride dal silinse dahi, dışa aktarılan PDF belgeniz doğrulanmış durumun değişmez bir kaydı olarak kalır.

## md2pdf İçinde Adım Adım Referans Değiştirme

md2pdf arayüzünde Git referansı ayarlamak son derece pratiktir:

1. Depo bağlantınızı ilgili kutuya yapıştırın.
2. Referans seçici açılır menüsünden mevcut dal ve etiketleri inceleyin.
3. İlgili etiketi veya dalı seçin ya da doğrudan bir commit SHA kodu yapıştırın.
4. Dosya ağacını kontrol ederek sürümü sabitlenmiş teknik belgelerinizi PDF formatında derleyin.
