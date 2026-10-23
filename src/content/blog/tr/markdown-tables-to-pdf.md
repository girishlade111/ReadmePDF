---
title: "Markdown Tablolarını PDF'e Dönüştürmek: Geniş Tabloları Sayfaya Sığdırmak"
description: "PDF dışa aktarımında bozulmayan GitHub uyumlu Markdown tabloları için pratik bir rehber: sütun planlama, hizalama, hücre uzunluğu, sayfalama ve baskı kontrolleri."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Tables", "PDF", "Layout"]
locale: "tr"
translationKey: "markdown-tables-to-pdf"
---

Teknik dokümantasyonda okuyucuların ilk aradığı şeylerden biri tablodur. Markdown bir PDF'e dönüştüğünde ilk bozulan şeylerden biri de odur. Geniş bir tarayıcı penceresinde sorunsuz görünen sütunlar A4'te sıkışır, uzun hücre metni ızgarayı kenar boşluğunun dışına iter ve satırlar sayfalar arasında öyle bölünür ki başlık satırı anlamsızlaşır.

md2pdf, GitHub uyumlu Markdown tablolarını işler ve sonucu bir baskı stil sayfasına ya da kitap dışa aktarımlarında bir A4 PDF işleyicisine gönderir. Araç makul bir tabloyu okunabilir tutabilir, ancak yoktan yer yaratamaz. İşin büyük kısmı Markdown kaynağında olur: doğru sütunları seçmek, hücreleri kısa tutmak ve neyin tabloya ait olduğuna karar vermek.

Bu rehber önce bu kaynak düzeyindeki işi, ardından kalan sorunları yakalayan baskı kontrollerini ele alır. Dönüştürme iş akışının tamamı için [GitHub README'sini PDF'e dönüştürme](/blog/github-readme-to-pdf/) rehberine bakın.

## Tablolar baskı sırasında neden bozulur

Tarayıcıdaki bir tablo esnektir. Kabını taşabilir, metni küçültebilir veya okuyucunun yana kaydırmasına izin verebilir. Basılı bir sayfanın ise sabit bir genişliği vardır ve kaydırma çubuğu yoktur. İçerik sayfadan geniş olduğunda bir şeyden taviz vermek gerekir: işleyici tabloyu kırpabilir, okunamayacak kadar küçültebilir ya da önizlemeye artık benzemeyen bir yerleşime zorlayabilir.

Üç alışkanlık bu durumu daha da kötüleştirir:

- **Çok fazla sütun.** Sekiz dar sütun, veri teknik olarak eksiksiz olsa bile dört daha geniş sütundan daha zor okunur.
- **Hücre içindeki paragraflar.** Üç cümle içeren bir hücre, göz gezdirilebilir bir tabloyu bir metin duvarına çevirir.
- **Sınırsız kod veya URL.** Tek bir uzun belirteç, koca bir sütunun minimum genişliğini belirleyebilir.

Çözüm daha küçük bir yazı tipi değildir. Çözüm, daha az iş yapan bir tablodur.

## Sığan bir tabloyla başlayın

Kullanışlı bir tablonun tek bir amacı ve az sayıda sütunu vardır. Aşağıdaki örnek, her CSS özelliğini belgelemeye çalışmadan baskı temalarını karşılaştırır:

```markdown
| Setting | Clean | Business | Academic |
| --- | :--- | :--- | ---: |
| Body type | Sans | Serif | Justified serif |
| Best for | Specs | Reports | Course readers |
| Tone | Neutral | Formal | Editorial |
```

Bu tablo A4 ve Letter boyutlarına rahatça sığar. Hücreler kısa olduğu için çeviriye de dayanır. Hizalama işaretleri isteğe bağlıdır, ancak kaynağı göz gezdirerek okumayı kolaylaştırır: sola hizalama için `:---`, ortalamak için `:---:`, sağa hizalı sayılar için `---:`.

Hizalamayı süsleme değil anlam için kullanın. Sayılar sağa hizalıyken, kısa etiketler sola hizalıyken daha iyi okunur. Ortalama nadiren gerekir ve bir sütunu taramayı zorlaştırabilir.

## Sütunları veriye göre değil soruya göre seçin

Bir sütun eklemeden önce tablonun hangi soruya yanıt verdiğini sorun. Bir geçiş tablosu "ne değişiyor ve bu konuda ne yapmalıyım?" sorusunu yanıtlayabilir. Bu üç sütun üretir: öğe, değişiklik ve eylem. On iki alanlı bir veritabanı dökümü PDF için tablo değildir; olsa olsa veri dökümüdür.

İyi bir sınav, başlık satırını sesli okumaktır. Başlıklar tutarlı bir cümle veya karşılaştırma oluşturmuyorsa tablo büyük olasılıkla fazla yük taşıyordur. Tabloyu bölün ya da ayrıntıyı düz metne taşıyın.

Geniş referans verileri için bunun yerine iki sütunlu bir tanım listesi düşünün:

```markdown
| Field | Meaning |
| --- | --- |
| `owner` | GitHub user or organization |
| `repo` | Repository name without the host |
| `ref` | Branch, tag, or commit SHA |
```

Bu biçim, her yerel ayar için bir sütun veya her uç durum için bir sütun içeren bir ızgaradan hem yazdırması hem de çevirmesi daha kolaydır.

## Hücreleri kısa ve taranabilir tutun

Tablolar açıklama için değil karşılaştırma içindir. Bir hücre iki kısa cümleden fazlasını gerektiriyorsa açıklamayı tablonun altına taşıyın ve hücrede bir özet bırakın.

Pratik kurallar:

1. **Cümle parçacıkları kullanın.** "Herkese açık bir depo gerektirir" yeterlidir; tam bir paragrafa gerek yoktur.
2. **Birimleri başlığa koyun.** Her satırda "MB" tekrarlamak yerine bir kez `Size (MB)` yazın.
3. **Hücre içinde satır sonlarından kaçının.** GFM `<br>` destekler, ancak zorunlu satır sonu içeren bir hücre nadiren iyi sayfalanır.
4. **Bağlantıları kısa tutun.** Tam bir URL değil, kısa bir etiketi bağlayın. Uzun URL'ler bölünemeyen belirteçlere dönüşür.
5. **Renge güvenmeyin.** Bir PDF siyah beyaz basılabilir ve temalar paleti değiştirir.

Bir hücrede uzun bir komut veya yol bulunmak zorundaysa, onu tablonun altındaki çitli bir kod bloğuna koyun ve adıyla ona atıfta bulunun. Bu, ızgarayı dar tutar.

## Geniş verileri dışa aktarmadan önce ele alın

Bazı tablolar gerçekten geniştir. Sütunları kaldıramadığınızda sayfayla kavga etmek yerine belgenin şeklini değiştirin.

**Kitleye göre bölün.** Operatörler için bir tablo, geliştiriciler için olan tabloyla aynı sütunlara ihtiyaç duymaz.

**Zamana göre bölün.** Yirmi sürüm içeren bir değişiklik günlüğü tablosu, ana sürüm başına bir tabloya dönüşebilir.

**Veriyi transpoze edin.** Çok sayıda öznitelik ve az sayıda öğe varsa öznitelikleri satır, öğeleri sütun olarak listeleyin. Tablo geniş yerine uzun olur ve bu daha iyi sayfalanır.

**Bir listeye geçin.** Hücrelerin çoğu boş veya tekrarlıysa tablo aslında bir listeyi gizliyordur. Alt başlıklarla düz metin genellikle daha anlaşılırdır.

Yeniden yapılandırdıktan sonra kaynağı iki yaygın genişlik suçlusu için tekrar kontrol edin: uzun, bölünmemiş bir URL ve boşluksuz bir kod aralığı. İkisi de bir sütunu sayfadan daha geniş olmaya zorlayabilir.

## Sayfalamayı ve yinelenen başlıkları kontrol edin

Tek sayfaya sığan bir tablo iki sayfaya yayıldığında yine de başarısız olabilir. Başlık satırı yinelenmeli, satırlar hücre ortasında bölünmemeli ve tablo, sayfanın en altında yalnızca bir satır görünür şekilde başlamamalıdır.

Tarayıcının baskı motoru ile kitap PDF işleyicisi sayfalamayı farklı ele alır; bu yüzden varsayımda bulunmak yerine gerçek çıktıyı kontrol edin. Tek belge baskısında yinelenen bir `<thead>` arayın ve tablodan hemen önce sayfa sonlarından kaçının. Kitap dışa aktarımında A4 işleyicisi satırları sırayla yerleştirir; çok uzun bir satır yine de can sıkıcı bir sayfa oluşturabilir.

Bir tablo sayfalara yayılıyorsa üstüne sütunları adlandıran kısa bir başlık ekleyin. Başlık, başlık satırı önceki sayfada kaldığında okuyucuya bağlam verir. Başlığı tablonun içine değil, düz metin olarak tutun.

## Dışa aktarma öncesi kontrol listesi

Yazdırmadan veya dışa aktarmadan önce bu listeyi gözden geçirin:

- Tablonun tek bir amacı var ve en fazla beş veya altı sütunu var.
- Her başlık kısa ve ilgiliyse birimini içeriyor.
- Hücreler paragraf değil parçacık içeriyor.
- Hiçbir hücre tam bir URL veya sayfadan uzun bölünmemiş bir belirteç içermiyor.
- Hizalama her yere değil, sayılara ve kısa etiketlere uygulanmış.
- Tablo birden fazla sayfaya yayılıyorsa bir başlığı var.
- Yalnızca tarayıcı önizlemesini değil, gerçek PDF'i de kontrol ettiniz.

Temaya özgü davranış için [Clean mı Business mı Academic mi Dark mı](/blog/readme-pdf-print-themes/) karşılaştırmasına bakın. Daha dar kenar boşluklarına sahip serif bir tema, varsayılan Clean temasından bir sütun daha az gerektirebilir.

Tabloların güzel olması gerekmez. Tarayıcıdan çıktıktan sonra okunabilir olmaları gerekir. Net bir başlığı olan daha dar ve daha kısa bir tablo, okuyucunun anlamak için yakınlaştırması gereken eksiksiz bir ızgarayı neredeyse her zaman yener.
