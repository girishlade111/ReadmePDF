---
title: "Tarayıcı Tabanlı Markdown - PDF: Cihazınızda Kalanlar"
description: "İstemci tarafı dönüştürmenin çalışma mantığı, md2pdf tarafından yapılan ağ istekleri ve gizli Markdown belgelerini dışa aktarmadan önce bilinmesi gerekenler."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Privacy", "Browser", "PDF", "Security"]
locale: "tr"
translationKey: "browser-only-markdown-to-pdf"
---

'Tarayıcınızda çalışır' ifadesi önemli bir avantajdır ancak tek başına eksiksiz bir gizlilik taahhüdü değildir. Bir tarayıcı yerel bir dosyayı sunucuya yüklemeden okuyabilir ancak önizleme sırasında harici görseller için ağ istekleri de yapabilir.

md2pdf, uygulama sunucusu bulunmayan statik bir web sitesidir. Markdown ayrıştırma, zararlı kod temizleme (sanitization), içindekiler tablosu oluşturma, önizleme, yazdırma ve PDF kitap dizgisi tamamen kullanıcının cihazında çalışır. Bu yapı belgelerin sunucuya yüklenmesini engeller ancak belgeyi ağdan tamamen yalıtmaz.

Dönüştürme adımları için [GitHub README Dosyasını PDF'ye Dönüştürme](/blog/github-readme-to-pdf/) rehberine, çok bölümlü kitap oluşturma için [Çok Dosyalı Markdown Kitabı Oluşturma](/blog/multi-file-markdown-book/) rehberine göz atın.

## Buradaki 'Yalnızca Tarayıcıda' İfadesinin Anlamı

md2pdf için yalnızca tarayıcıda çalışmak, sunucu tarafında bir dönüştürme motoru bulunmaması demektir. Site statik HTML, CSS ve JavaScript'ten ibarettir. Metin yapıştırdığınızda veriler sekmenin belleğinde kalır. Dosya yüklediğinizde tarayıcının File API'si dosyayı yerel olarak okur ve hiçbir sunucuya göndermez.

Bu durum sitenin tamamen çevrimdışı çalıştığı anlamına gelmez. İlk açılışta site varlıkları indirilir ve GitHub aktarımında GitHub API'sine genel istekler gönderilir.

Taahhüdümüz son derece nettir: **Markdown metniniz LadeStack sunucularına yüklenmez; kullanıcı hesabı veya sunucu tarafında saklanan belge veritabanı yoktur.**

## Adım Adım Dönüştürme Hattı

Bir belge şu aşamalardan geçer:

```text
source  ->  parse  ->  resolve  ->  render  ->  sanitize  ->  preview  ->  print
```

1. **Kaynak.** Yapıştırılan metin, yerel dosya veya GitHub genel README belgesi okunur.
2. **Ayrıştırma.** markdown-it tabloları, görev listelerini ve kod bloklarını ayrıştırır.
3. **Yol Çözümleme.** Depo kaynaklarında göreli resim yolları raw.githubusercontent.com adresine yönlendirilir.
4. **Oluşturma.** Ayrıştırılan yapılar HTML'e dönüştürülür.
5. **Temizleme.** DOMPurify zararlı öğeleri (`script`, `iframe` vb.) ayıklar.
6. **Önizleme.** Güvenli HTML, başlık bağlantıları ve isteğe bağlı içindekiler tablosuyla ekrana yerleştirilir.
7. **Çıktı.** Tarayıcının yazdırma penceresi çağrılır veya pdf-lib ile ZIP dosyası paketlenir.

Kaynak okunduktan sonraki tüm adımlar cihazınızda yerel olarak gerçekleşir.

## Tarayıcı Dışına Çıkan Veriler Nelerdir

Yerel dosyalar veya yapıştırılan metinler için md2pdf belge içeriğini asla dışarı göndermez çünkü sitede bunu alacak bir arka uç yoktur.

Olağan kullanımda gerçekleşen ağ istekleri şunlardır:

- **Site Varlıkları.** Sayfanın görüntülenmesi için gereken HTML, CSS, yazı tipi ve betikler.
- **Genel GitHub Aktarımı.** Belirtilen genel depodan README ve resimleri almak için yapılan anonim istekler.
- **Markdown İçindeki Harici Varlıklar.** Belgeniz başka sunucularda barındırılan resim bağlantıları içeriyorsa tarayıcı önizleme için bu resimleri talep eder.

Örneğin metinde `![dashboard](https://internal.example.test/chart.png)` yer alıyorsa, metin yerel kalsa bile resim isteği hedef sunucuya iletilir.

Bağlantılara tıklanmadıkça istek yapılmaz ancak gömülü resimler sayfa oluşurken otomatik olarak indirilir.

## Yerel Dosyalar ve Yapıştırılan Metinler

Yerel çalışma yöntemleri en yüksek gizliliği sunar:

- **Yapıştırma.** Harici resimler bulunmadığı sürece metin sekme dışına çıkmaz.
- **Dosya Yükleme.** 2 MB sınırında tarayıcı belleğine alınır, sunucuya aktarılmaz.
- **Örnek Metin.** Sitede hazır bulunan statik örnek kullanılır, ek ağ isteği oluşturmaz.

Yerel dosyalardaki göreli resim yolları depo temeli olmadığından görüntülenemez. Mutlak URL kullanmalı veya resim yer tutucusunu kabul etmelisiniz.

Tamamen yalıtılmış bir çıktı için yazdırmadan önce harici resimleri kaldırın.

## Harici Görseller ve Bağlantılar Ağ İsteği Oluşturmaya Devam Eder

İstemci tarafında işleme **belge metnini** korur ancak **belgenin işaret ettiği harici kaynakları** otomatik olarak engellemez.

Şu örneği inceleyelim:

```markdown
![Architecture](./docs/architecture.png)

See the [operations guide](https://example.test/ops).
```

GitHub aktarımında resim yolu doğrudan GitHub'ın ham içerik sunucusuna yönlendirilir. Yapıştırılan metindeki mutlak adresler ise doğrudan kaynak sunucudan istenir.

Gizli belgeleri dışa aktarmadan önce metinde şunları arayın:

- `http://` ve `https://` ile başlayan resim adresleri
- HTML `<img>` etiketleri
- Harici stil ve yazı tipi bağlantıları
- Ağ trafiği oluşturmayan Data URI resimleri

DOMPurify zararlı betikleri temizler ancak belgenin parçası olan normal görselleri korur.

## GitHub İstek Sınırları ve Hata Yönetimi

GitHub aktarımı genel içeriğin kimlik doğrulamasız okunmasıdır ve güvenli sınırlar içerir:

- API istekleri için **15 saniye** zaman aşımı.
- Bölüm içerik alımı için **20 saniye** zaman aşımı.
- Dizin taraması için **25 saniye** bütçe.
- API sınırı aşıldığında doğrudan ham içerik indirmeye geçiş.
- Ulaşılamayan görseller yerine yer tutucu eklenerek belgenin kesintisiz oluşturulması.

## Pratik Gizlilik Kontrol Listesi

Kurumsal veya gizli Markdown belgelerini PDF'ye dönüştürmeden önce kontrol edin:

- Şirket içi korumalı sunuculara işaret eden harici resim bağlantısı bulunmadığından emin olun.
- Genel depo adresinin doğruluğunu kontrol edin.
- Belgede şifre, gizli anahtar veya API anahtarı bulunmadığından emin olun.
- Yazdırma penceresini açmadan önce önizlemeyi dikkatlice inceleyin.
- Dışa aktarmanın üçüncü taraf bulut hizmetlerine ihtiyaç duymadığını doğrulayın.

Farklı tema tercihleri için [Baskı Temaları Rehberi](/blog/readme-pdf-print-themes/) içeriğine göz atabilirsiniz.
