---
title: "PDF İçin Markdown İçindekiler Tablosu: Kusursuz Baskı Düzeni"
description: "md2pdf'in içindekiler tablosunu nasıl oluşturduğu, ne zaman kullanılması gerektiği ve PDF belgelerinde gezinmeyi kolaylaştıran başlık hiyerarşisi rehberi."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Navigation", "PDF", "Layout"]
locale: "tr"
translationKey: "markdown-table-of-contents-pdf"
---

İçindekiler tablosu görsel bir detay değildir. Birkaç sayfayı aşan bir belgede okuyucunun aradığı konuyu doğrudan bulabilmesi ile tüm belgeyi taramak zorunda kalması arasındaki farkı belirler.

md2pdf, tek belgeler için otomatik içindekiler tablosu üretir ve çok bölümlü kitaplar için kapsamlı bir fihrist derler. Bu rehber her iki özelliğin nasıl çalıştığını, başlıkların nasıl yapılandırılması gerektiğini ve tablonun ne zaman kapatılacağını açıklar.

Temel dönüştürme adımları için [GitHub README Dosyasını PDF'ye Dönüştürme](/blog/github-readme-to-pdf/) rehberine, kitap dizgisi için [Çok Dosyalı Markdown Kitabı Oluşturma](/blog/multi-file-markdown-book/) rehberine bakın.

## İçindekiler Tablosunun Gerçek Yapısı

Tek belge önizlemesinde içindekiler tablosu, metnin üst kısmına eklenen bir HTML gezinti bloğudur. Başlıkları bağlantı olarak listeler ve sistem yazdırma ayarlarına bağlı olarak PDF içinde tıklanabilir durumda kalabilir.

Bu özellik PDF okuyucuların kenar çubuğu yer imlerinden (bookmarks) farklıdır. Kenar çubuğu imleri tarayıcının yazdırma motoruna bağlıdır.

Kitap iş akışında içindekiler tablosu, seçilen bölümler ve başlıklardan derlenerek belgenin resmi bir sayfası olarak basılır.

## md2pdf İçindekiler Tablosunu Nasıl Üretir

Tek belgenin içindekiler tablosu belirli kurallara göre otomatik derlenir:

- Belgede en az **üç başlık** bulunmalıdır.
- **H1 ile H4 arasındaki** tüm başlıklar listeye dahil edilir.
- Başlık bağlantıları çakışmaları önlemek için tekilleştirilir.
- Arayüzdeki anahtar hem önizlemeyi hem de baskı çıktısını aynı anda denetler.

```markdown
# Project handbook

## Installation

### Requirements

## Configuration

### Environment variables

## Troubleshooting
```

Örnek bir başlık dizilimi:

Bu belgede altı başlık bulunduğu için H1 belge adı, H2 ana konular ve H3 alt başlıklar olacak şekilde hiyerarşik bir içindekiler tablosu oluşturulur.

## Dizin Maddesi Olarak Anlamlı Başlıklar Yazın

Bir başlık hem ilgili bölümün amacını açıklamalı hem de içindekiler tablosunda tek başına anlamlı bir satır oluşturmalıdır.

```text
Vague:  ## Overview
Useful: ## Configure GitHub access
Vague:  ## Errors
Useful: ## Recover from a failed export
```

Belirgin isim ve fiiller tercih edin:

Açıklayıcı başlıklar okuyucunun konuyu aramadan anlamasını sağlar. Başlıkları tek satıra sığacak uzunlukta tutun ve sadece vurgu amacıyla başlık açmaktan kaçının.

## Ana Bölümlere H2 ile Başlayın

Belge adını H1 olarak tutup gövde bölümlerine H2 ile başlamak üç önemli avantaj sağlar:

1. **Net bir çatı oluşur.** H1 tüm belgeyi temsil eder.
2. **Alt bölümler doğal sıralanır.** H3 ve H4 başlıklar H2 altına düzenli oturur.
3. **Baskı stilleri tutarlı kalır.** Sayfanın kopuk belgelerden oluşmuş hissi vermesi engellenir.

Dosyalarınız zaten H1 ile başlıyorsa kitap iş akışı daha uygun bir seçenektir.

## Mükerrer Başlıklar, Ekler ve Uzun Belgeler

Bağlantı çakışmaları önlense bile aynı ada sahip başlıklar dizinde kafa karışıklığı yaratır. Kaynak metinde başlıkları özelleştirin.

Çok sayıda H4 içeren devasa belgelerde tablonun birkaç sayfaya taşmasını önlemek için ayrıntıları metin içine aktarıp dizinde H2 ve H3 başlıkları öne çıkarın.

Ekleri numaralandırırken `## Ek A: Dışa Aktarma Sınırları` şeklinde açıklayıcı yazın.

## Tabloyu Ne Zaman Kullanmalı

Kılavuzlar, teknik şartnameler ve uzun raporlar için içindekiler tablosu vazgeçilmezdir. 1-2 sayfalık kısa duyurular veya notlarda ise tabloyu kapatmak sayfayı sadeleştirir.

## Oluşturulan PDF İçindeki Tabloyu İnceleyin

PDF dosyasını açarak bağlantıların doğru kayıp kaymadığını ve sayfa geçişlerinin düzenini denetleyin. Tablo biçimlendirmeleri için [Markdown Tablolarını PDF'ye Dönüştürme](/blog/markdown-tables-to-pdf/) rehberine göz atabilirsiniz.
