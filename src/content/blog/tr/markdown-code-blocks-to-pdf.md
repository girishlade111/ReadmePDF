---
title: "PDF'te Markdown Kod Blokları: Çitler, Uzun Satırlar ve Sayfa Sonları"
description: "Dil etiketleri, satır genişliği, elle sarma, tema seçimi ve baskı incelemesi dahil olmak üzere PDF'te okunabilir kalan çitli kodun nasıl yazılacağı."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Code", "PDF", "Layout"]
locale: "tr"
translationKey: "markdown-code-blocks-to-pdf"
---

Kod, bir Markdown belgesinin ekranda iyi görünüp kâğıtta en sık dağılan yeridir. Geniş bir monitöre sığan bir satır A4 sayfanın sağ kenar boşluğunu aşabilir. Çitli bir blok sayfanın altına düşüp iki satırı bir sayfada, kalanı öbür sayfada bırakabilir. Dil etiketi olmayan bir blok ise yanındakinden farklı görünebilir.

md2pdf, çitli kodu baskı yerleşiminin içinde önceden biçimlendirilmiş metin olarak işler. Sözdizimi vurgusu eklemez ve kaynak kodunu sayfaya sığacak şekilde yeniden akıtmaz. Bu bilinçli bir sınırlamadır: kodu sığdırmak için değiştirmek anlamını değiştirebilir. Pratik yaklaşım, kaynağı basılı blok dönüştürme olmadan okunabilir olacak şekilde hazırlamaktır.

Bu rehber çitli blokları, dil etiketlerini, satır uzunluğunu, temaları ve PDF'i göndermeden önce sorunları yakalayan kontrolleri ele alır. Uçtan uca iş akışı için [GitHub README'sini PDF'e dönüştürme](/blog/github-readme-to-pdf/) rehberiyle başlayın.

## Dönüştürücü bir çitle ne yapar

GitHub uyumlu Markdown, üç veya daha fazla ters tırnak ya da tilde ile sınırlanan çitli kod bloklarını destekler. md2pdf bu çitleri ayrıştırır, metni tam olarak korur ve bir `<pre><code>` öğesi içinde işler. Açılış çitinden sonraki dil etiketi sınıf adı olarak tutulur, ancak mevcut işleyici bir sözdizimi vurgulama teması uygulamaz.

Bu iki şey anlamına gelir:

- Girinti, boş satırlar ve noktalama korunur.
- Görsel sonuç, renkli belirteçler değil, temanın kod arka planı ve kenarlığıyla eş aralıklı metindir.

Bir belge bir diff'i açıklamak için renge dayanıyorsa kısa bir başlık ekleyin veya kaynakta `+` ve `-` işaretlerini kullanın. Okuyucunun basılı bir kopyada yeşili kırmızıdan ayırt edebileceğini varsaymayın.

## Girinti değil çitli bloklar kullanın

Dört boşluklu girinti de Markdown'da kod bloğu oluşturur, ancak çitleri denetlemek daha kolaydır. Başlangıcı ve bitişi açık hale getirirler, dil etiketi desteklerler ve blok içindeki bir satır girintili olduğunda bozulmazlar.

Basit bir çitli blok:

```bash
npm install
npm run build
npm test
```

İçerikteki herhangi bir ters tırnak dizisinden daha uzun bir çit kullanın. Kod üçlü ters tırnak içeriyorsa dörtlü ile açıp kapatın. Bu özellikle Markdown'ın kendisi hakkındaki dokümantasyon için geçerlidir; çit örneğin bir parçası olabilir.

Blok içinde sekmeleri ve boşlukları karıştırmaktan kaçının. İşleyici yazdığınızı korur ve tutarsız girinti, kod doğru olsa bile hata gibi görünür.

## Vurgulama olmasa da dili etiketleyin

Sözdizimi vurgusu olmadığında bile dil etiketi yararlıdır. Amaçlanan dili belgeler, editörlere ve linter'lara yardımcı olur ve çevirmenlere bloğun çevrilmemesi gerektiğine dair net bir işaret verir. Ayrıca kaynağı aramayı kolaylaştırır.

Yaygın etiketler `bash`, `js`, `ts`, `json`, `yaml`, `python`, `html`, `css`, `sql` ve `text`'tir. Çıktı, günlükler, dizin ağaçları ve programlama dili olmayan her şey için `text` kullanın. Kısa bir parçacık için etiketsiz düz bir çit kabul edilebilir, ancak okuyucunun kopyalayabileceği her şey için etiket daha iyidir.

Bir bloğu yalnızca vurgulayıcı tanıdığı için bir dille etiketlemeyin. İçeriğin gerçekte ne olduğunu etiketleyin. İstem ve çıktı içeren bir kabuk dökümü, istem komutun parçası değilse `bash` değil `text`'tir.

## Satırları yazdırılabilir bir genişlikte tutun

En yaygın baskı hatası, sayfadan geniş bir kod satırıdır. Tarayıcı önizlemesinde blok yatay kaydırılabilir. Kâğıtta kaydırma çubuğu yoktur; bu yüzden satır kırpılır ya da bloğun tamamı küçülür.

Her yazı tipi ve sayfa boyutu için işleyen tek bir karakter sınırı yoktur, ancak A4 veya Letter için pratik bir hedef yaklaşık 80 ila 90 karakterdir. Bu, klasik terminal genişliğine yakındır; çünkü eş aralıklı metni okumayı rahat tutar.

Bir satır çok uzadığında baskı ölçeğini değil kaynağı değiştirin:

```js
const message = buildMessage({ owner, repo, branch, path });
```

Bu satır okunabilir. Nesnenin sekiz özelliği daha olsaydı satırları bölerdiniz:

```js
const message = buildMessage({
  owner,
  repo,
  branch,
  path,
});
```

Kabuk komutları için ters eğik çizgiyle devam veya bir değişken kullanın. Uzun URL'ler için URL'yi kendi satırına koyun veya bir bağlantı referansı kullanın. JSON için biçimlendiricinin nesneyi sarmasına izin verin. Amaç her durumda aynıdır: yatay kaydırmaya bağlı hiçbir satır olmaması.

## Çıktı ve günlükleri nasıl ele alacağınıza karar verin

Günlükler ve komut çıktıları genellikle kaynak koddan daha geniştir. Ayrıca metni değiştirmeden sarılamayan zaman damgaları, yollar ve tanımlayıcılar içerirler.

Baskıda işe yarayan seçenekler:

- **Çıktıyı kısaltın.** İlgili satırları gösterin ve üç noktayı kod bloğunun içine değil düz metne ekleyin.
- **Dökümü bölün.** Komutu bir bloğa, önemli çıktıyı başka bir bloğa koyun ve aralarına bir cümle ekleyin.
- **Yapılandırılmış çıktı için tablo kullanın.** Çıktı gerçekten satır ve sütunlardansa tablo, eş aralıklı bir bloktan daha iyi basılabilir.
- **Yazı tipi boyutunu yalnızca son çare olarak küçültün.** Tema değişiklikleri belgenin tamamını etkiler ve minik kod, daha kısa bir örnekten daha zor okunur.

Günlük belgenin kendisi değilse 200 satırlık bir günlüğü PDF'e yapıştırmayın. Günlüğün tamamına ihtiyaç duyan okuyucu depoyu kullanabilir; PDF sinyali göstermelidir.

## Kod işlemesini temayla eşleştirin

Dört baskı teması kodu farklı ele alır. Clean açık bir kod arka planı ve nötr yazı tipi kullanır. Business, serif gövdesiyle kontrast oluşturan daha koyu bir kod bloğu kullanır. Academic kodu açık ve düz metne göre ikincil tutar. Dark, ekran öncelikli bir temadır ve baskı stil sayfası açık mürekkep ile açık kod arka planını zorunlu kılar.

İki pratik sonuç:

1. **Kontrastı gerçek temada kontrol edin.** Clean'de iyi görünen bir kod bloğu Business'ta ağır, Academic'te fazla soluk hissedilebilir.
2. **Yazdırırken arka plan grafiklerini etkinleştirin.** Aksi halde kod arka planı kaybolur ve blok kenarlığına dayanır. Metin yine okunur, ancak görsel ayrım zayıflar.

Belge ağırlıklı olarak koddan oluşuyorsa Clean genellikle en güvenli seçimdir. Birkaç parçacık içeren bir rapor ise Business işe yarayabilir, ancak parçacıkları kısa tutun. Tam karşılaştırma için [Clean mı Business mı Academic mi Dark mı](/blog/readme-pdf-print-themes/) sayfasına bakın.

## Basılı sayfayı inceleyin

Kaydedilen PDF'i açın ve yalnızca ilkini değil her kod bloğunu inceleyin. Şunlara bakın:

- **Kırpılmış satırlar.** Sağ kenara yakınlaştırın. Bir belirtecin ortasında biten satır, bloğun çok geniş olduğunun işaretidir.
- **Yalnız kalan çitler.** Bir blok, sayfanın altında tek satırla başlamamalıdır. Başlıyorsa önüne bir cümle ekleyin veya çevresindeki içeriği ayarlayın.
- **Bozuk girinti.** Sekmeler ve boşluklar tutarlı görünmelidir. Karışık girintili kopyalanmış bir blok, işleyici değil kaynak sorunudur.
- **Kaybolan boş satırlar.** Bir blok içindeki boş satırlar anlamlıdır. PDF'in bunları koruduğunu doğrulayın.
- **Okunamayan kontrast.** Belge fotokopi edilebilirse bir sayfayı gri tonlamalı yazdırın.
- **Başlıklardaki dil etiketleri.** Etiket okuyucu için önemliyse düz metinde dilden söz edin. Etiketin kendisi bir etiket olarak gösterilmez.

Belge geniş kitlelere dağıtılacaksa farklı bir tarayıcıyla son bir kontrol yararlıdır. HTML aynı olsa bile baskı motorları sayfa sonlarını ve arka plan grafiklerini farklı ele alır.

Kod blokları, bir Markdown belgesinin başka bir araca kopyalanma olasılığı en yüksek parçasıdır. Onları kısa, doğru ve sayfanın içinde tutun. PDF'in bir IDE'yi yeniden üretmesi gerekmez; okuyucunun parçacığı anlamasına ve yeniden kullanmasına izin vermesi gerekir. Dönüştürme sırasında nelerin yerelde kaldığı hakkında daha fazlası için [Tarayıcıda kalan Markdown'dan PDF'e](/blog/browser-only-markdown-to-pdf/) sayfasına bakın.
