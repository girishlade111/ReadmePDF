---
title: "Yerel Markdown Dosyalarını Tarayıcıda Güvenle PDF'e Dönüştürün"
description: "Yerel .md dosyalarını sunucuya yüklemeden PDF'e dönüştürme kılavuzu: sürükle-bırak, dosya sınırları, karakter kodlaması ve istemci tarafı işleme."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Upload","PDF","Security"]
locale: "tr"
translationKey: "markdown-file-upload-to-pdf"
---

Yerel bir Markdown belgesini PDF formatına dönüştürmek, hassas teknik dokümanlarınızı yabancı sunuculara göndermenizi gerektirmemelidir. Çoğu çevrimiçi araç dosyalarınızı arka plana yükler ve metninizi depolar.

md2pdf, tarayıcının yerel `FileReader` API'sini kullanır. Yerel bir `.md` dosyası seçtiğinizde veya arayüze sürüklediğinizde, içerik doğrudan tarayıcı belleğine aktarılır. Cihazınızdan hiçbir veri dışarı çıkmaz; şirket içi şartnameler ve özel notlar tamamen güvendedir.

Bu kılavuz desteklenen dosya türlerini, boyut sınırlarını, karakter kodlamasını ve olası sorunların çözümünü açıklamaktadır. Metni doğrudan yapıştırarak çalışmak isterseniz [Markdown yapıştırma ve düzenleme rehberini](/tr/blog/markdown-editor-paste-pdf/) inceleyebilirsiniz.

## How local file uploads work in md2pdf

md2pdf üzerindeki dosya yükleme süreci tamamen istemci tarafında gerçekleşir. Dosya seçildiğinde tarayıcının yerel `change` olayı tetiklenir:

```javascript
const reader = new FileReader();
reader.onload = (e) => {
  const markdownText = e.target.result;
  renderMarkdownToPreview(markdownText);
};
reader.readAsText(file, 'UTF-8');
```

Çözümlenen metin anında düzenleyiciye aktarılır ve sağdaki canlı önizleme panelinde biçimlendirilir. Hiçbir API uç noktasına HTTP POST isteği gönderilmediğinden, internet bağlantınız olmasa bile dönüşüm sorunsuz çalışır.

## Supported file types and extension rules

md2pdf standart düz metin Markdown uzantılarını destekler:

- `.md` — Standart Markdown dosyaları.
- `.markdown` — Açık Markdown uzantısı.
- `.txt` — Markdown sözdizimi içeren düz metin belgeleri.

`.docx`, `.rtf` veya önceden derlenmiş `.pdf` gibi ikili (binary) formatlar reddedilir. Word veya HTML formatındaki dokümanlarınızı md2pdf içine aktarmadan önce standart Markdown'a çevirmelisiniz.

## Client-side size limits and encoding

Tarayıcının hızlı ve kararlı çalışması için md2pdf belirli sınırlar uygular:

- **Dosya başına azami boyut**: 2 MB UTF-8 düz metin.
- **Karakter kodlaması**: BOM içermeyen UTF-8 (UTF-8 without BOM).
- **Satır sonları**: CRLF (`\r\n`) ve LF (`\n`) otomatik olarak standartlaştırılır.

2 MB'lık bir Markdown dosyası yaklaşık 300.000 kelime barındırabilir; bu da teknik kılavuzların büyük çoğunluğu için yeterlidir. Dosyanız 2 MB'ı aşıyorsa [Çoklu dosya Markdown kitap derleyicisini](/tr/blog/multi-file-markdown-book/) kullanabilirsiniz.

## Step-by-step: Uploading and printing a local Markdown file

Yerel bir dosyayı kusursuz bir PDF'e dönüştürmek için şu adımları izleyin:

1. md2pdf ana sayfasını açın ve dönüştürücü araç çubuğunu bulun.
2. **Markdown Yükle** butonuna tıklayın veya `.md` dosyanızı doğrudan düzenleyiciye sürükleyin.
3. İçeriğin düzenleyicide ve canlı önizleme penceresinde doğru görüntülendiğini kontrol edin.
4. İstediğiniz baskı temasını belirleyin: Clean, Business, Academic veya Dark.
5. Belgeniz üç veya daha fazla başlık içeriyorsa **İçindekiler Tablosu (TOC)** seçeneğini açın.
6. Tarayıcı yazdırma ekranını açmak için **Yazdır / PDF Olarak Kaydet** butonuna basın.
7. Hedef olarak **PDF Olarak Kaydet** seçeneğini işaretleyin, kenar boşluklarını kontrol edip kaydedin.

Yazdırma ekranı detayları için [Markdown PDF tarayıcı yazdırma ayarları kılavuzunu](/tr/blog/browser-print-markdown-pdf/) inceleyin.

## Handling missing relative assets in local files

Tek bir yerel Markdown dosyası yüklendiğinde, tarayıcının güvenlik kısıtlamaları nedeniyle yerel görsel bağlantıları (örneğin `![Mimari](./images/arch.png)`) doğrudan okunamaz.

Görsellerin PDF belgenizde görünmesi için:

- Görsellerinizi güvenli bir HTTPS sunucusunda barındırıp mutlak web adresleri verin.
- Markdown metni içerisine Base64 Data URI olarak görselleri doğrudan ekleyin.
- Belgeleriniz bir GitHub deposundaysa [GitHub README içe aktarma aracını](/tr/blog/github-readme-to-pdf/) kullanın.

## Common upload errors and troubleshooting

- **Karakter bozulmaları**: Türkçe karakterler soru işareti şeklinde çıkıyorsa belgenizi UTF-8 (BOM'suz) olarak yeniden kaydedin.
- **Arayüz takılmaları**: Aşırı büyük satır içi SVG'ler veya iç içe karmaşık tablolar önizlemeyi yavaşlatabilir. Bu kısımları sadeleştirin.
- **Desteklenmeyen dosya**: Uzantının `.md` veya `.txt` olduğundan emin olun. Uzantısı elle değiştirilmiş ikili dosyalar reddedilir.

Yerel Markdown belgelerinizi güvenli ve gizlilik odaklı biçimde dönüştürmek için [md2pdf](/#converter) aracını hemen kullanabilirsiniz.
