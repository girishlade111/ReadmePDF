---
title: "Clean mi Business mı Academic mi Dark mı: Hangi md2pdf Temasını Kullanmalısınız?"
description: "md2pdf'nin dört baskı temasının pratik karşılaştırması — tipografi, kod blokları, tablolar ve her birinin uygun olduğu belgeler."
pubDate: 2026-10-14
author: "Girish Lade"
tags: ["Themes", "Design", "PDF"]
locale: "tr"
translationKey: "readme-pdf-print-themes"
---

md2pdf'deki tema seçici küçük bir tercih gibi görünür: dışa aktarma düğmesinin üstünde dört radyo düğmesi. Oysa pratikte, kimse içeriğe ulaşmadan önce belgenin nasıl okunacağını değiştirir. Academic ile yazdırılan bir şartname makale gibi görünür. Clean ile yazdırılan bir müşteri teklifi depo dökümü gibi durur. Doğru tema, okuyucunun beklentileriyle eşleşen temadır.

Dört tema da aynı Markdown'u işler. Yazı tipi ailesi, hizalama, kod görünümü, tablo stili, bağlantı rengi ve başlıklara ekledikleri görsel yapı miktarı bakımından farklılaşırlar. Hiçbiri filigran, kapak sayfası veya logo eklemez. İçerik sizin kalır.

## Temalar renk değişimi değil, baskı stil sayfalarıdır

Her tema, önizleme sayfasına uygulanan ve baskı çıktısına taşınan bir CSS kuralı kümesidir. Bu, temanın şunları etkilediği anlamına gelir:

- Başlıklar, gövde metni, tablolar ve kod için kullanılan yazı tipi.
- Gövde metninin sola yaslı mı yoksa iki yana yaslı mı olduğu.
- Başlık çizgilerinin rengi ve kalınlığı.
- Kod bloğu ve satır içi kod arka planları.
- Tablo başlığı dolguları ve kenarlık renkleri.
- Önizlemede ve PDF'nin koruduğu yerlerde dışa aktarılan dosyada bağlantı rengi.

Baskı stil sayfası ayrıca sayfalanma ipuçlarını da yönetir: kod blokları, tablolar, alıntı blokları ve görseller mümkün olduğunca ortadan bölünmekten kaçınır, başlıklar sayfanın altında tek başına kalmaz.

Karşılaştırmadan önce pratik bir not: kod bloğu dolgularının ve tablo başlığı renklerinin korunmasını istiyorsanız tarayıcınızın yazdırma iletişim kutusunda **Arka plan grafikleri**ni etkinleştirin. Bu olmadan PDF yine okunabilir, ancak Business ve Dark yapılarının bir kısmını kaybeder. Tercih uygulamada değil, yazdırma iletişim kutusundadır.

## Clean: teknik belgeler için varsayılan

Clean, nötr seçenektir. Belgenin tamamında arayüzün sans-serif yığınını kullanır; beyaz üzerine koyu gri metin ve açık gri kod arka planı vardır. Başlıklar ince bir çizgiyle ayrılır ve bağlantılar ürünün başka yerlerindeki mavi-turkuaz rengini kullanır.

**Şunlar için en iyi sonucu verir:**

- Depo README'leri ve teknik şartnameler.
- Dahili mühendislik dokümantasyonu.
- Kodu yoğun el broşürleri ve runbook'lar.
- Ekranda kâğıttaki kadar sık okunacak belgeler.
- Nötrlüğün ciladan daha önemli olduğu denetim anlık görüntüleri.

**Şunlara dikkat edin:**

- Çok uzun metinler yavan hissettirebilir. Clean verimlidir, sıcak değildir.
- Açık kod arka planı baskıda arka plan grafiklerine bağlıdır. Devre dışıysa kod blokları yine okunur, ancak gövde metninden görsel ayrımını kaybeder.
- Küçük baskı boyutlarında sans-serif gövde metni, uzun okumalar için seriften daha az rahat olabilir.

Clean en güvenli varsayılandır çünkü bir ton dayatmaz. Bir README'yi başka bir mühendis için dışa aktarıyorsanız buradan başlayın.

## Business: raporlar, teklifler ve müşteriye yönelik teslimler

Business, belgeyi daha resmi bir tona taşır. Baştan sona serif yazı tipi, daha kalın çizgili lacivert başlıklar, koyu bir kod bloğu ve hafif renkli bir tablo başlığı kullanır. Sonuç README'den çok rapor gibi okunur; hedef kitle bir müşteri, bir yönetici veya çok disiplinli bir paydaş olduğunda tam olarak istenen de budur.

**Şunlar için en iyi sonucu verir:**

- Müşteri teslimleri ve proje genel bakışları.
- Teklifler, iş tanımları ve raporlar.
- Tasarımı ön planda olması gereken atölye broşürleri.
- Portföy ekleri ve başvuru örnekleri.
- Diyagramların ve tabloların metin kadar ağırlık taşıdığı belgeler.

**Şunlara dikkat edin:**

- Koyu kod bloğu güçlü bir görsel öğedir. Çok sayıda kısa kod parçacığı içeren bir belge çizgili görünmeye başlayabilir.
- Serif yazı tipi ve iki yana yakın aralık, uzun URL'leri ve kod tanımlayıcılarını öne çıkarır. Kod satırlarını kısa tutun.
- Burada arka plan grafikleri önemlidir. Bunlar olmadan koyu kod bloğu düz bir bloğa dönüşür ve tablo başlığı renk tonunu kaybeder.
- Business düzenlemenin yerini tutmaz. Business ile yazdırılan ham bir değişiklik günlüğü yine ham bir değişiklik günlüğü gibi okunur.

Dış belgeler için Business genellikle daha iyi bir ilk izlenimdir. PDF'nin sonradan akla gelmiş bir eklenti olarak değil, bir okuyucu için hazırlandığını gösterir.

## Academic: uzun metinler ve ders materyali

Academic, serif bir yazı tipi, iki yana yaslı gövde metni ve daha sıcak, daha açık bir kod görünümü kullanır. Başlıklar sola yaslı kalır, böylece paragraflar iki yana yaslıyken bile yapı taranabilir olur. Genel etki, ürün sayfasından çok ders okuma dosyasına veya makaleye yakındır.

**Şunlar için en iyi sonucu verir:**

- Ders paketleri, okuma dosyaları ve ders notları.
- Makaleler ve araştırma yazıları.
- Az kod bloğu içeren uzun dokümantasyon.
- Hibe başvuruları ve akademik portföyler.
- Okuyucunun taramak yerine sürekli okumayı beklediği her belge.

**Şunlara dikkat edin:**

- İki yana yaslı metin, uzun URL'ler, kod tanımlayıcıları ve teknik terimler çevresinde geniş boşluklar oluşturabilir. Uzun bağlantıları referans tarzı bağlantılara bölün veya bir listeye taşıyın.
- Kod blokları okunabilir ama Business'a göre görsel olarak daha sessizdir. Bu bilinçlidir: Academic kodu ana olay değil, destekleyici malzeme olarak varsayar.
- Tablolar çok sütunluysa A4'te sıkışabilir. Sütun sayısını azaltın veya ayrıntıyı metne taşıyın.
- Academic hızlı bir kurulum kılavuzu için uygun değildir. Format “bunu baştan sona okuyun” der ve bir runbook genellikle taranır.

Belgede kaynakça benzeri bir bölüm varsa Academic'in tipografisi onu evinde hissettirir. Uygulama atıfları biçimlendirmez, bu nedenle referanslar bölümünü Markdown'da tutun.

## Dark: ekran öncelikli inceleme, baskıya güvenli çıktı

Dark, diğerlerinden ayrılır. Önce rahat ekran okuması için tasarlanmıştır: koyu lacivert arka plan, açık metin ve daha parlak bir bağlantı rengi. Yazdırdığınızda baskı stil sayfası beyaz arka planı, siyah metni, siyah bağlantıları ve açık kod bloklarını zorlar. PDF koyu ekran temasını kâğıda taşımaz.

**Şunlar için en iyi sonucu verir:**

- Dışa aktarmadan önce uzun bir README'yi ekranda incelemek.
- Akşam veya loş ışıkta okuma.
- Belgenin beyaz sayfanın görsel gürültüsü olmadan nasıl okunduğunu kontrol etmek.
- Karanlık mod araçlarını tercih eden bir ekipten PDF üretmek.

**Şunlara dikkat edin:**

- Ekranda gördüğünüz şey, PDF'de elde ettiğiniz şey değildir. Açık baskı görünümünü doğrulamak için dışa aktarılan dosyayı her zaman açın.
- Dark, dış belgeler için bir marka teması değildir. Müşteri, PDF'nin önizlemeyle değil baskı çıktısıyla eşleşmesini bekler.
- Tarayıcınız arka planları yazdıracak şekilde ayarlıysa baskı stil sayfası yine koyu yüzeyleri geçersiz kılar, ancak kod blokları görsel bir kontrol gerektirebilir.
- Temanın ekran kontrastı zayıf kaynak yapısını gizleyebilir. Başlıkları atlanmış bir belge yine karamsar görünür; daha iyi organize olmuş hale gelmez.

Dark'ı son belge için dördüncü bir görsel kimlik değil, baskıya güvenli bir çıkış kapısı olan bir okuma modu olarak düşünün.

## Yan yana karşılaştırma

| | Clean | Business | Academic | Dark |
| --- | --- | --- | --- | --- |
| Gövde yazı tipi | Sans-serif | Serif | Serif, iki yana yaslı | Ekranda sans-serif; baskıda açık |
| Başlık görünümü | İnce çizgi | Lacivert çizgi | Sola yaslı serif | Koyu üzerine açık çizgi; baskıya güvenli |
| Kod blokları | Açık gri | Koyu lacivert | Sıcak açık | Ekranda koyu; baskıda açık |
| Tablo başlıkları | Nötr | Mavi tonlu | Nötr | Ekranda koyu; baskıda açık |
| Bağlantı rengi | Mavi-turkuaz | Mavi | Siyah | Ekranda parlak mavi; baskıda siyah |
| En uygun hedef kitle | Mühendisler | Müşteriler, yöneticiler | Akademisyenler, öğrenciler | Yazar, ekranda |
| En uygun belge | Şartname, README, runbook | Rapor, teklif, broşür | Makale, ders paketi | İnceleme kopyası |

Tablo bir başlangıç noktasıdır, kural değil. Teknik bir müşteri Clean'i tercih edebilir. Tasarım bilinci yüksek bir mühendislik ekibi Business'ı tercih edebilir. Belgenin işi, kategorisinden daha önemlidir.

## Tema dışa aktarmanın geri kalanıyla nasıl etkileşir

Tema, baskı sonucunun yalnızca bir parçasıdır. Şu etkileşimleri kontrol etmeye değer:

**İçindekiler tablosu.** İçindekiler, belgenin yazı tipini ve bağlantı rengini devralır. Business'ta lacivert başlıklar ve mavi bağlantılar ona rapor içindekiler sayfası havası verir. Academic'te makale taslağı gibi okunur. İçindekiler, üç veya daha fazla başlığı olan belgeler için oluşturulur ve belge kısaysa kapatabilirsiniz.

**Kod blokları.** Clean ve Academic açık kod arka planları kullanır; Business koyu bir blok kullanır; Dark ekranda koyu, baskıda açık bir blok kullanır. Renkten daha büyük sorun uzun satırlardır. 120 karakterlik bir satır temadan bağımsız olarak taşar.

**Tablolar.** Business renk tonlu bir başlık ekler; Clean ve Academic nötr kalır. Geniş tablolar en yaygın baskı hatasıdır. Bir tabloda beş veya altıdan fazla sütun varsa, baskı ölçeğini küçültmek yerine tabloyu bölmeyi ya da kaynaktaki yazı tipi boyutunu azaltmayı düşünün.

**Görseller ve rozetler.** Temalar görsel işlemeyi değiştirmez, ancak çevredeki boşluğu değiştirir. Business'ın serif metni bir ekran görüntüsünü daha çok şekil gibi hissettirebilir; Clean'in sans-serif metni onu dokümantasyon gibi hissettirir. Bozuk görseller önizlemede işaretlenir ve dışa aktarmayı durdurmaz.

**Bağlantılar.** Clean ve Business mavi bağlantılar kullanır; Academic siyah; Dark ekranda parlak mavi, baskıda siyah. PDF gri tonlamalı yazdırılacaksa renk farkı kaybolur, bu yüzden bağlantı metnini renge güvenmek yerine açıklayıcı yapın.

**Sayfa sonları.** Baskı stil sayfası kod bloklarının, tabloların, alıntı bloklarının ve görsellerin mümkün olduğunca öğe ortasında bölünmesini engeller ve başlıkları ardından gelen içerikle birlikte tutar. Bu davranış tüm temalarda ortaktır, ancak uzun metinlerin daha fazla sayfa geçişi ürettiği Academic'te daha çok önem kazanır.

## 30 saniyede seçin

Bu hızlı karar yolunu kullanın:

1. **Okuyucu komutları ve kodu tarayacak bir mühendis mi?** Clean'i seçin.
2. **Okuyucu rapor bekleyen bir müşteri, yönetici veya gözden geçiren mi?** Business'ı seçin.
3. **Belge az kod bloğu içeren uzun bir metin mi?** Academic'i seçin.
4. **Ağırlıklı olarak ekranda mı okuyup ardından dışa mı aktarıyorsunuz?** Dark'ı seçin, sonra PDF'yi kontrol edin.
5. **Hâlâ emin değil misiniz?** Clean'i seçin. Belgeyi yanlış tanıtma olasılığı en düşük olan odur.

İşe yarar bir test: ilk iki sayfayı iki aday temayla dışa aktarın ve bir telefonda okuyun. Küçük bir ekranda ve hızlı bir taramada ayakta kalan tema genellikle doğru olandır.

## Temadan daha önemli olan dışa aktarma öncesi kontroller

Hiçbir tema bunları düzeltemez:

- **Başlık hiyerarşisi.** Ana bölümler için `##`, alt bölümler için `###` kullanın. Atlanan düzeyler kafa karıştırıcı bir içindekiler tablosu üretir.
- **Kod satırı uzunluğu.** Mümkün olduğunca satırları yaklaşık 80–90 karakterin altında tutun.
- **Tablo genişliği.** Daha az sütun, daha kısa etiketler veya bölünmüş bir tablo.
- **Görsel yolları.** Depoya göreli görseller bir depo getirmesi gerektirir; yapıştırılan Markdown mutlak URL'ler gerektirir.
- **Gizli metin.** Dönüştürme yereldir, ancak PDF yine de iletilebilir.
- **Sayfa boyutu.** A4 ve Letter farklı sayfalanır. Alıcının yazdıracağı boyutu seçin.
- **Arka plan grafikleri.** Kod bloğu dolguları ve tablo başlıkları tasarım için önemliyse etkinleştirin.

## Öneri

Çoğu README dışa aktarması için **Clean** doğru varsayılandır. Nötrdür, okunabilir ve belgenin olmadığı bir şeymiş gibi davranmaz. PDF mühendislik dışından biri için teslim edilecek bir ürünse **Business** kullanın. Belgenin metin olarak okunması amaçlanıyorsa **Academic** kullanın. Son açık PDF'yi üretmeden önce rahat bir inceleme turu istiyorsanız **Dark** kullanın.

Tema okuyucuya bir sinyaldir. İşle eşleşen sinyali seçin, kalan çabayı içeriğe ayırın: net bir açılış, mantıklı bir başlık yapısı ve gerçekten çözümlenen görseller. Bu tercihler her temada ayakta kalır.

Tam dışa aktarma iş akışı için [GitHub README'sini PDF'ye Dönüştürme](/blog/github-readme-to-pdf/) rehberine bakın. Hedef kitleye özel hazırlık için [README'yi PDF'ye Dönüştürmenin 7 Pratik Kullanım Senaryosu](/blog/readme-to-pdf-use-cases/) yazısına bakın.
