---
title: "Markdown PDF Kitapları Derlemek İçin Üç Durumlu Klasör Seçimi"
description: "md2pdf içindeki üç durumlu onay kutuları ve klasör düzeyinde seçimle çok dizinli Markdown belgelerini tek bir PDF kitaba dönüştürmeyi öğrenin."
pubDate: 2026-03-24
tags: ["markdown","pdf","book","documentation"]
locale: "tr"
translationKey: "markdown-folder-selection-book"
---

Farklı klasörlere dağılmış belgeleri tek bir PDF kitapta birleştirirken onlarca dosyayı tek tek elle seçmek son derece verimsizdir. Kullanıcılar klasörleri tek bir tıklamayla açıp kapatabilmeli, aynı zamanda bağımsız bölümler üzerindeki denetimini koruyabilmelidir. [md2pdf](/#converter) bünyesindeki üç durumlu (Tri-State) klasör onay kutuları, teknik kılavuzların derlenmesini kolay ve güvenilir hale getirir.

Bu rehber, dizin onay kutularının nasıl çalıştığını, üç durumlu göstergelerin anlamını ve çok klasörlü Markdown yapılarının düzenli PDF kitaplara nasıl dönüştürüldüğünü açıklamaktadır.

## Dizin Onay Kutularının Üç Durumunu Anlama

Hiyerarşik dosya sistemlerinde basit bir açık/kapalı modeli kısmi seçimleri doğru yansıtamaz. md2pdf standart üç durumlu onay kutusu modelini uygular:

1. **İşaretli (Tümü Seçili)**: Klasördeki ve tüm alt dizinlerindeki Markdown dosyalarının tamamı dışa aktarma için seçilmiştir.
2. **Belirsiz / Kısmi (Bir Kısmı Seçili)**: Klasördeki belgelerin bir kısmı seçilmiş, bir kısmı ise hariç bırakılmıştır.
3. **İşaretsiz (Hiçbiri Seçili Değil)**: Bu dizindeki veya alt klasörlerindeki hiçbir dosya dışa aktarmaya dahil edilmeyecektir.

```text
Tri-State Folder Hierarchy:
[-] docs/guides/             (Indeterminate: partially selected)
    [x] getting-started.md   (Selected)
    [ ] advanced-config.md   (Excluded)
[x] docs/api/                (Checked: all files selected)
    [x] endpoints.md         (Selected)
    [x] authentication.md    (Selected)
```

## Kademeli Seçim Mantığı

Bir klasör onay kutusuna tıklandığında ağaç boyunca otomatik bir kademeli güncelleme gerçekleşir:

- **Aşağı Doğru Yayılma**: Seçili olmayan bir klasöre tıklandığında altındaki tüm dosyalar ve klasörler seçili hale gelir. Seçili veya kısmi durumdaki bir klasöre tıklandığında altındaki tüm seçimler anında kaldırılır.
- **Yukarı Doğru Güncelleme**: Bir alt dosyanın seçimi değiştirildiğinde üst klasörlerin durumu kök dizine kadar yeniden hesaplanır. Bir klasörün tüm alt dosyaları seçildiğinde üst klasör otomatik olarak tam seçili duruma geçer.
- **Anlaşılır Görsel Bildirim**: Kısa çizgi (-) simgesi, klasörü açmaya gerek kalmadan içinde kısmi seçimler bulunduğunu hemen bildirir.

## İhtiyaca Özel Teknik Kılavuzlar Oluşturma

Üç durumlu klasör denetimleri saniyeler içinde amaca özel teknik dokümanlar hazırlamanızı sağlar:

- **Modüle Özel El Kitapları**: Yalnızca `api/` ve `sdk/` klasörlerini seçerek geliştirici kılavuzu oluşturabilir, şirket içi `admin/` belgelerini dışarıda bırakabilirsiniz.
- **Denetim Belgeleri**: Tüm mevzuat klasörünü seçip taslak halindeki notları ayıklayarak resmi denetim PDF'leri hazırlayabilirsiniz.
- **Eğitim Materyalleri**: Kök dizindeki `README.md` ile `tutorials/getting-started/` altındaki başlangıç kılavuzlarını birleştirerek yeni çalışanlar için rehber oluşturabilirsiniz.

## PDF Derleme Sırasında Yapıyı Koruma

Seçilen klasörler birleştirilmiş bir PDF kitaba dönüştürüldüğünde md2pdf belge hiyerarşisini korur:

- **Hiyerarşik İçindekiler Tablosu**: Klasörler ana bölümlere, bağımsız Markdown dosyaları ise alt başlıklara dönüşür.
- **Kesintisiz Sayfa Numaralandırması**: Birleştirilen tüm belgeler boyunca düzenli ve sıralı sayfa numaraları atanır.
- **Sayfa Sonu Düzeni**: Dosyalar arasına otomatik sayfa sonları eklenerek yayın standartlarında temiz bir görünüm elde edilir.

## Derlenen Kitabınızı PDF Olarak Dışa Aktarma

Klasör seçimlerinizi tamamladıktan sonra derleme düğmesine tıklayın. Seçtiğiniz Markdown belgeleri, net yazı tipleri ve tıklanabilir içindekiler tablosuyla profesyonel bir PDF kitaba dönüştürülecektir.
