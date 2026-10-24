---
title: "Çok Dosyalı Markdown Kitabı Oluşturma ve PDF ZIP İndirme"
description: "Depo belgelerini kapak sayfası, içindekiler tablosu, bütünleşik baskı ve bölüm bazlı PDF ZIP indirme özellikleri bulunan bir kitaba dönüştürün."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Documentation", "Book", "PDF", "Workflow"]
locale: "tr"
translationKey: "multi-file-markdown-book"
---

Tek bir README dosyası harika bir karşılama sayfasıdır ancak kapsamlı bir kılavuz için yetersizdir. Kurulum, yapılandırma, operasyon ve sorun giderme bölümleri eklendikçe devasa bir README hem okunması hem de elle basılması imkansız hale gelir.

md2pdf, bu tür belgeler için özel bir 'dokümantasyon kitabı' iş akışı sunar. Genel bir depo adresi girin, Markdown dosyalarını seçip sıralayın, kapak ve fihrist ekleyin, ardından tüm kitabı yazdırın veya bölümleri ayrı ayrı PDF olarak bir ZIP arşivinde indirin. Tüm işlemler cihazınızda çalışır, sunucuya hiçbir dosya yüklenmez.

Bu rehber kitap modunun kullanımını açıklar. Tek belge ihtiyacınız varsa [GitHub README Dosyasını PDF'ye Dönüştürme](/blog/github-readme-to-pdf/) rehberiyle başlayın.

## Tek README Yerine Kitap Formatının Tercih Edileceği Durumlar

Belgeleriniz doğal bölümlere ayrılmışsa ve okuyucunun bölümler arasında kolayca gezinmesi gerekiyorsa kitap iş akışını seçin:

- Kurulum, mimari ve referans sayfaları ayrılmış **ürün dokümantasyonları**.
- Haftalık ders notlarından derlenen **eğitim kitapçıkları**.
- Her operasyonun ayrı dosyada tutulduğu **çalışma kılavuzları (runbooks)**.
- Sürüm notları, yükseltme adımları ve geçiş rehberini birleştiren **yayın belgeleri**.

Çok kısa ve sürekli değişen metinler için tek belge modu daha pratiktir.

Bu akış **genel (public)** depolar için geçerlidir. Özel depolar tarayıcıdan doğrudan okunamadığı için desteklenmez.

## Depo Tarayıcısının Görevleri ve Güvenlik Limitleri

Bir depo adresi girdiğinizde gezgin, GitHub Git Trees API üzerinden dizini okur ve aranabilir bir dosya ağacı oluşturur. Klasör kutucukları 3 aşamalı seçim sunar.

Tarayıcı performansını korumak için tarayıcıda kesin sınırlar uygulanır:

- Kitap başına en fazla **30 dosya**.
- Dosya başına en fazla **750 KB**.
- Toplamda en fazla **6 MB** Markdown.
- Dosya içeriği alımında **20 saniye** zaman aşımı.
- Ana tarama için en fazla **60 GitHub API isteği** bütçesi.

```text
docs/
├── 00-introduction.md
├── 01-installation.md
├── 02-configuration.md
├── 03-operations.md
└── 04-troubleshooting.md
```

Örnek klasör yapısı:

Sayısal önekler zorunlu değildir ancak okuma sırasını depoda açıkça göstererek sıralama işlemini hızlandırır.

## Bölümleri Seçme ve Sıralama

Ağaçtan dosyaları seçin ve bölüm listesini inceleyin. Yeni seçilen dosyalar sona eklenir. Yukarı, aşağı ve sil butonlarıyla sırayı belirleyin.

Pratik sıralama ipuçları:

1. **Öz bir liste seçin.** 30 dosya sınırı bulunsa da 10-15 bölümlük bir kitap en rahat okunan formattır.
2. **Girişi öne alın.** Genel kavramlar kuruluma öncülük etmelidir.
3. **Referansları sona bırakın.** Ekler ve API tabloları en sonda olmalıdır.
4. **README çakışmasını önleyin.** README'yi eklerseniz giriş mi yoksa özet mi olduğuna karar verin.
5. **Otomatik üretim dosyalarını çıkarın.** Gereksiz logları temizleyin.

Editördeki sıra hem basılı PDF'e hem de ZIP arşivindeki dosya yollarına doğrudan yansır.

## Kaynak Dosyaları Hazırlama

Kitap motoru her dosyayı bağımsız bir bölüm kabul eder ve dosya adından türetilen bir bölüm başlığı ekler.

Örnek bir bölüm açılışı:

```markdown
# Installation

This chapter assumes a supported Node.js version and a local clone.
```

Her dosya H1 ile başlarsa kitapta bölüm sınırları son derece belirgin olur.

Dikkat edilecek noktalar:

- **Göreli bağlantılar.** Bölümler arasındaki bağlantılar seçilen dosyaları işaret etmelidir.
- **Resimler.** Göreli resimler GitHub üzerinden çözümlenir.
- **Geniş tablolar.** Genişlik ayarı için [Markdown Tablolarını PDF'ye Dönüştürme](/blog/markdown-tables-to-pdf/) rehberine bakın.
- **Mükerrer başlıklar.** Fihristte karışıklığı önlemek için başlıklara ayırt edici kelimeler ekleyin.

## Kapak ve İçindekiler Tablosu Tasarımı

Editörden başlık, alt başlık ve kapak metni tanımlayabilirsiniz. Belgenin amacını, hedef kitlesini ve sürümünü açıkça belirtin.

Fihrist seçilen bölümler ve başlıklardan otomatik üretilir. Kapak veya başlıklar değiştiğinde kitap yeniden derleme uyarısı vererek tutarsızlığı önler.

## Kitabı Yazdırma ve ZIP Formatında İndirme

İki dışa aktarma seçeneği bulunur:

- **Bütünleşik Kitap Yazdırma.** Kapak, fihrist ve tüm bölümleri tarayıcının yazdırma penceresine aktarır.
- **ZIP Olarak İndirme.** Seçilen her bölümü bağımsız bir A4 PDF olarak üretir ve ZIP arşivinde toplar.

ZIP arşivi `md2pdf-{owner}-{repo}-{sha8}.zip` şeklinde adlandırılır ve Unicode karakterleri korur.

## Limitler, Hatalar ve Sorun Giderme

GitHub istek sınırına ulaşırsanız sıfırlanma süresini bekleyin ya da doğrudan ilgili alt klasörün adresini girin. Eksik resimler yerine yer tutucu konularak işlem tamamlanır.

Baskı stilleri için [Baskı Temaları Kılavuzu](/blog/readme-pdf-print-themes/) içeriğine göz atabilirsiniz.
