---
title: "GitHub README'sini PDF'ye Dönüştürme (Ücretsiz, Giriş Yok)"
description: "Herkese açık bir GitHub README'sini ReadmePDF ile hesap açmadan, yükleme yapmadan ve sunucu tarafı işleyici olmadan temiz, yazdırmaya hazır bir PDF'ye dönüştürme rehberi."
pubDate: 2026-09-18
updatedDate: 2026-10-21
author: "Girish Lade"
tags: ["GitHub", "README", "PDF", "Tutorial"]
featured: true
locale: "tr"
translationKey: "github-readme-to-pdf"
---

Bir README tarayıcı için yazılır: kaydırılır, dışarıya bağlantı verir ve okuyucunun depoda dolaşabildiğini varsayar. Dokümantasyonu bir müşteriye göndermeniz, bir ödeve eklemeniz, bir sürümü arşivlemeniz veya depoyu klonlamayacak birine iletmeniz gerektiği anda, her yere ulaşan format PDF'tir.

Bir GitHub sayfasını doğrudan yazdırmak genellikle dağınık bir sonuç verir. Site gezintisi, yan çubuklar ve alt bilgi de işin içine karışır. Geniş kod blokları kesilir. Göreli görseller bozulur çünkü tarayıcı artık depo kökünü esas almaz. Uzun tablolar sayfalar arasında garip biçimde bölünür. ReadmePDF tam olarak bu sorunları, sizden hesap oluşturmanızı veya kaynak dosyanızı bir sunucuya yüklemenizi istemeden çözmek için var.

Bu rehber, bir depo URL'si yapıştırmaktan dışa aktarılan PDF'yi kontrol etmeye kadar tüm iş akışını adım adım anlatır ve aracın her adımda ne yaptığını açıklar.

## Tarayıcının Yazdır düğmesi neden yeterli değil

GitHub'ın web arayüzü bir baskı stil sayfası değil, bir web uygulamasıdır. Bir depo sayfasında `Ctrl+P` tuşlarına bastığınızda tarayıcı tüm sayfayı yazdırmaya çalışır: üst bilgi, dosya ağacı, “Hakkında” yan çubuğu, geri bildirim bileşenleri ve düzende ne varsa. Bunların bir kısmı özel bir baskı stil sayfasıyla gizlenebilir, ancak GitHub'ın işaretlemesini dışarıdan değiştiremezsiniz.

Yinelenen üç sorun daha var:

- **Göreli görsel yolları.** `![diagram](docs/architecture.png)` yazan bir README GitHub'da çalışır çünkü görsel depoya göre çözümlenir. Yazdırılan tarayıcı sayfasında güvenilir bir depo bağlamı yoktur, bu yüzden görsel kaybolabilir.
- **Geniş kod ve tablolar.** Kod blokları ve karşılaştırma tabloları basılı bir sayfadan geniştir. Baskıya özel kurallar olmadan ya okunamayacak kadar küçülür ya da kesilir.
- **Sayfalanma.** Başlıklar, kod blokları ve tablo satırları garip kesintilerden kaçınmalıdır. Ham bir tarayıcı baskısı bunu nadiren iyi yönetir.

ReadmePDF README'nin ham Markdown'unu getirir, depoya göreli URL'leri çözümler, GitHub tarzı Markdown'u işler, sonucu temizler ve tarayıcının yazdırma iletişim kutusu açılmadan önce bir baskı stil sayfası uygular. Çıktı yine tarayıcınızın yerleşik “PDF olarak kaydet” motoru tarafından üretilir, ancak aldığı belge çoktan temizlenmiştir.

## ReadmePDF neleri değiştirir

Dönüştürme hattı tamamen tarayıcıda çalışır. Pratikte:

1. Herkese açık bir GitHub depo URL'si, yerel bir Markdown dosyası veya yapıştırılmış Markdown sağlarsınız.
2. Bir depo için uygulama varsayılan dalı bulur ve `.github/` içindeki dosyalar dahil olmak üzere bir dizi yaygın README dosya adını dener.
3. Göreli görsel yollar `raw.githubusercontent.com` adresine, belge bağlantıları ise GitHub blob görünümüne yeniden yazılır.
4. Markdown, GFM desteğiyle işlenir: tablolar, görev listeleri, üstü çizili metin, çitlenmiş kod ve otomatik bağlantılandırma.
5. HTML, önizlemeye ulaşmadan önce DOMPurify ile temizlenir.
6. Belgede en az üç başlık olduğunda bir içindekiler tablosu oluşturulur.
7. Seçtiğiniz temanın baskı stil sayfası uygulanır ve tarayıcı yazdırma iletişim kutusunu açar.

Hiçbir dosya yüklenmez. Dışarı giden tek istekler, istediğiniz herkese açık deponun anonim olarak okunması ve varsayılan dalı bulmak için yapılan GitHub API çağrısıdır. Özel depolar bu sürümde desteklenmez.

## Başlamadan önce

Gerekenler:

- **Herkese açık** bir GitHub deposu, yerel bir Markdown dosyası veya yapıştırabileceğiniz bir Markdown bloğu.
- Modern bir tarayıcı. Chrome, Edge, Firefox ve Safari'nin tümü yazdırma iletişim kutularında “PDF olarak kaydet”i destekler.
- Kısa bir belge için yaklaşık iki dakika; PDF'yi sayfa sayfa incelemeyi planlıyorsanız daha fazlası.

Depo özelse getirme başarısız olur. Elle yedek yol yine de çalışır: README metnini kopyalayın, düzenleyiciye yapıştırın ve mutlak görsel URL'leri kullanın.

## Adım 1: Araca bir depo verin

Dönüştürücüyü açın ve depo URL'sini **GitHub depo URL'si** alanına yapıştırın. ReadmePDF standart URL'den fazlasını kabul eder:

```text
https://github.com/owner/repo
https://github.com/owner/repo.git
github.com/owner/repo
owner/repo
https://github.com/owner/repo/tree/main/docs
https://github.com/owner/repo/blob/main/README.md
```

Bunların tümü aynı `owner/repo` çiftine çözümlenir. Protokolsüz URL'ler ve `owner/repo` kısayolu, bir terminalden veya sohbet mesajından kopyalarken işinize yarar. Ek yol parçaları kolaylık olsun diye kabul edilir ama yok sayılır: uygulama yine URL'de gösterilen iç içe dosyayı değil, deponun varsayılan daldaki kök README'sini okur. İhtiyacınız olan iç içe dosyaysa Markdown'unu doğrudan yapıştırın.

**Getir** düğmesine basın veya `Enter` tuşuna basın. Alan boşsa uygulama sessizce hiçbir şey yapmamak yerine ne beklediğini söyler.

## Adım 2: README'yi getirmesine ve çözümlemesine izin verin

Uygulama önce GitHub API'den deponun varsayılan dalını ister. Ardından o dala karşı bir README dosya adları listesi dener; yaygın büyük/küçük harf varyantları ve `.github/README.md` konumu da buna dahildir. API hız sınırına takılırsa ham getirme yine de devam edebilir; geçici bir API arızasının iş akışını her zaman bitirmemesinin nedeni budur.

Markdown geldiğinde önizleme güncellenir. Bu, üç şeyi kontrol etme anıdır:

- **Görseller.** Depoya göreli görseller görünmelidir. Görünmüyorsa özel bir varlığa, var olmayan bir yola veya sıcak bağlantıyı engelleyen mutlak bir URL'ye işaret ediyor olabilir.
- **Kod blokları.** Dil etiketi taşıyan kod çitleri kod olarak işlenir. Çok geniş satırlar önizlemede kaydırılır, ancak yine de baskı kontrolü gerekir.
- **Bağlantılar.** Belge bağlantıları PDF'de anlamlı kalmaları için GitHub blob görünümüne yeniden yazılır. Dış bağlantılar önizlemede yeni sekmede açılır.

Bir görsel başarısız olursa ReadmePDF onu bozuk olarak işaretler ve devam eder. Bir rozet kullanılamadığı için dışa aktarma başarısız olmaz. Bu bilinçli bir tercihtir: eksik bir rozet genellikle belgenin geri kalanından daha az önemlidir.

## Adım 3: Belgeye uygun bir tema seçin

Dört baskı teması vardır:

- **Clean** varsayılandır. Nötr sans-serif yazı tipi kullanır ve şartnameler, teknik README'ler ve kodu yoğun belgeler için en güvenli seçimdir.
- **Business** serif yazı tipi ve koyu bir kod bloğu kullanır. Raporlara, tekliflere ve müşteriye yönelik teslimlere uygundur.
- **Academic** iki yana yaslanmış serif sayfalar ve hafif bir kod görünümü kullanır. Uzun metinler, ders okuma dosyaları ve makale benzeri başvurular için tasarlanmıştır.
- **Dark** ekran öncelikli bir temadır. Önizleme rahat okuma için koyudur ve baskı stil sayfası PDF okunaklı kalsın diye açık mürekkep ile açık kod arka planlarını zorlar.

Daha ayrıntılı bir karşılaştırma için [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/) sayfasına bakın. Çoğu ilk dışa aktarma için Clean ile başlayın ve yalnızca belgenin net bir hedef kitle beklentisi varsa tema değiştirin.

## Adım 4: İçindekiler tablosunun yardımcı olup olmadığına karar verin

Otomatik içindekiler varsayılan olarak açıktır ve belgede üç veya daha fazla başlık olduğunda oluşturulur. Kararlı ve benzersiz başlık kısa adları kullanır, böylece girişler önizlemede doğru bölümlere bağlanır.

Şu durumlarda açık bırakın:

- Belge birkaç sayfadan uzunsa.
- Okuyucunun belirli bir bölüme atlaması gerekiyorsa.
- PDF'yi yalnızca bir kısmını yazdıracak birine veriyorsanız.

Şu durumlarda kapatın:

- README kısaysa ve içindekiler bloğu gezinmeden çok gürültü ekliyorsa.
- Belgede zaten elle yazılmış bir içindekiler tablosu varsa.
- Tek sayfalık bir el broşürü hazırlıyorsanız.

Bu anahtar hem önizlemeyi hem de baskı çıktısını etkiler. Yalnızca PDF'ye özel ayrı bir ayar yoktur.

## Adım 5: Doğru ayarlarla PDF olarak yazdırın

Canlı Önizleme panelinde **PDF indir / Yazdır** düğmesine tıklayın. Uygulama tarayıcının yazdırma iletişim kutusunu açar. İletişim kutusunda:

1. **Hedef**i **PDF olarak kaydet** (veya tarayıcınızdaki eşdeğeri) olarak ayarlayın.
2. Alıcının bölgesine uyacak şekilde **A4** veya **Letter** seçin.
3. Kurumsal bir stiliniz yoksa **Kenar boşlukları**nı varsayılanda bırakın. Baskı stil sayfası sayfa kenar boşluklarını zaten ayarlar.
4. İlk denemede **Ölçek**i %100'de tutun. Geniş bir tablo veya kod bloğu kesilirse kaynaktaki yazı tipini küçültmek yerine ölçeği biraz azaltın.
5. Tarayıcınız sunuyorsa **Arka plan grafikleri**ni etkinleştirin. Tema vurguları, kod bloğu arka planları ve tablo başlığı dolguları arka plan renklerine bağlıdır. Bunlar olmadan PDF yine okunabilir, ancak Business ve Dark görsel yapılarının bir kısmını kaybeder.
6. URL ve sayfa numaralarını özellikle istemiyorsanız tarayıcının **Üst bilgiler ve alt bilgiler**ini kapatın. Bunlar belge tasarımının parçası değildir.
7. Dosyayı açıklayıcı bir adla kaydedin, örneğin `owner-repo-readme-2026-10.pdf`.

Etiketler tarayıcıya göre değişir. Chrome ve Edge'de arka plan grafikleri “Diğer ayarlar” altındadır. Firefox'ta “Arka planları yazdır”ı arayın. Safari daha az denetim sunar; kaydetmeden önce önizlemeyi kontrol edin.

## Adım 6: Göndermeden önce PDF'yi kontrol edin

Kaydedilen PDF'yi açın ve baskının ortaya çıkardığı sorunları tarayın:

- **Sayfa sonları.** Bir başlık sayfanın altında tek başına kalmamalıdır. Kod blokları, tablolar ve görseller ortadan bölünmemelidir.
- **Geniş içerik.** Uzun kod satırları ve tablolar en yaygın taşma nedenleridir. Kesiliyorlarsa kaynaktaki satırları kısaltın veya baskı ölçeğini azaltın.
- **Bağlantılar.** PDF'de birkaç bağlantıya tıklayın. GitHub blob bağlantıları doğru dosya görünümünü açmalıdır.
- **Görseller.** Diyagramların ve rozetlerin korunduğunu doğrulayın. Eksik özel bir varlık PDF'de kendiliğinden düzelmez.
- **Üst veri.** Belge başlığı ve yazarı, özel bir PDF üst veri formundan değil, README'den ve tarayıcının yazdırma üst veri ayarlarından gelir. Dosyayı açık bir adla adlandırın.
- **Okunabilirlik.** Bir sayfayı %100'de yazdırın ve gövde metninin rahat olduğunu kontrol edin. Academic'in iki yana yaslı metni ve Business'ın serif yazı tipi kâğıtta ekrandakinden farklı görünebilir.

## Getirme başarısız olduğunda

Uygulama, getirme hatalarını eyleme dönüştürülebilir mesajlara eşler. Yaygın durumlar:

| Ne görürsünüz | Genellikle ne anlama gelir | Ne yapmalı |
| --- | --- | --- |
| Depo bulunamadı veya özel | URL yanlış ya da depo kimlik doğrulama gerektiriyor | URL'yi kontrol edin; depo özelse Markdown'u elle yapıştırın |
| README bulunamadı | Deponun varsayılan dalında, `main` veya `master` üzerinde README yok | Dosyayı yükleyin veya Markdown'u yapıştırın |
| GitHub hız sınırına ulaşıldı | Çok fazla kimlik doğrulamasız API isteği | Yaklaşık bir dakika bekleyip yeniden deneyin; ham getirme yine de çalışabilir |
| Getirme başarısız oldu veya zaman aşımına uğradı | Ağ sorunu ya da istek 15 saniyelik zaman aşımını aştı | Yeniden deneyin; elle yapıştırma yolu hâlâ çalışır |

Getirme başarısız olursa düzenleyici yazdıklarınızı korur. Sayfayı kaybetmeden yapıştırma veya yükleme moduna geçebilirsiniz.

## Bunun yerine yapıştırın veya yükleyin

GitHub'dan getirme kullanışlıdır, ancak tek giriş yolu değildir. Dönüştürücü ayrıca şunları destekler:

- 2 MB'a kadar bir `.md`, `.markdown` veya `.txt` dosyasını **yükleme**.
- Markdown'u doğrudan düzenleyiciye **yapıştırma**. Önizleme, siz yazarken kısa bir gecikmeden sonra yeniden işlenir.
- Tabloların, görev listelerinin ve kod bloklarının nasıl işlendiğini görmek için **örneği yükleme**.

Bir uyarı: göreli görsel yollar yalnızca önce bir depo getirildiğinde çözümlenir. Yüklenen veya yapıştırılan Markdown'un depo tabanı yoktur, bu modda mutlak görsel URL'leri kullanın. Geri kalan her şey — başlıklar, tablolar, kod, görev listeleri — aynı şekilde çalışır.

## Her dışa aktarmayı iyileştiren beş kaynak düzeyinde düzeltme

PDF, başladığı Markdown kadar iyidir. Bu değişiklikler hemen karşılığını verir:

1. **Gerçek bir başlık hiyerarşisi kullanın.** Bölümlere `##` ile başlayın, alt bölümler için `###` kullanın ve düzey atlamaktan kaçının. Hem içindekiler tablosu hem de baskı stil sayfası yapıya bağlıdır.
2. **Görsellere işe yarar alt metin verin.** Bu hem erişilebilirlik için iyidir hem de bir görsel yüklenemediğinde PDF'ye okunabilir bir yedek sağlar.
3. **Kodu bir dille çitleyin.** Dil etiketli bloklar, özellikle satırlar uzun olduğunda, girintili koddan daha öngörülebilir biçimde işlenir.
4. **Tabloları dar tutun.** Sekiz sütunlu bir tablo küçültülmeden A4'e sığmaz. Ayrıntıları metne taşıyın veya tabloyu bölün.
5. **Depo varlıkları için göreli yolları tercih edin.** ReadmePDF bunları doğru şekilde yeniden yazar. Yerel bir makineye veya özel bir kovaya giden mutlak bağlantılar bu yolculuktan sağ çıkmaz.

## Gizlilik: tarayıcınızdan neler çıkar

ReadmePDF Markdown'unuzu yüklemez. İşleme, temizleme, içindekiler oluşturma ve PDF dışa aktarma tamamen yerel olarak gerçekleşir. Bir depo getirmesinde dışarı giden tek istekler, herkese açık README ve görselleri için GitHub'a yapılan anonim okumalardır. Dönüştürmeye bağlı hesap, çerez veya analitik yoktur.

Bu, belge dahili notlar, müşteri adları veya yayınlanmamış planlar içerdiğinde önemlidir. Hassas Markdown'u yapıştırıp metni üçüncü taraf bir dönüştürme hizmetine göndermeden dışa aktarabilirsiniz. Aynısı yerel dosyalar için de geçerlidir: dosya yüklenmez, tarayıcınız tarafından okunur.

## Kısa özet

Herkese açık bir depo URL'si yapıştırın, Getir'e basın, önizlemeyi doğrulayın, bir tema seçin, uzun belgelerde içindekiler tablosunu açık bırakın ve arka plan grafikleri etkinken PDF olarak yazdırın. Dosyayı göndermeden önce sayfa sonlarını ve geniş kod bloklarını kontrol edin. Getirme başarısız olursa Markdown'u yapıştırın veya yükleyin ve devam edin.

Tüm iş akışı sıkıcı olacak şekilde tasarlandı: hesap yok, kuyruk yok, yükleme yok, sunucu tarafı işleyici yok. Sadece bir README, bir baskı stil sayfası ve birine verebileceğiniz bir PDF.
