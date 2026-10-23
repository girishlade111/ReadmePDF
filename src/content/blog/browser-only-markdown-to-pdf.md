---
title: "Browser-Only Markdown to PDF: What Stays on Your Device"
description: "How client-side conversion works, which requests md2pdf makes, and what to check before exporting sensitive or internal Markdown."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Privacy", "Browser", "PDF", "Security"]
locale: "en"
translationKey: "browser-only-markdown-to-pdf"
---

"Runs in your browser" is a useful claim, but it is not a complete privacy statement. A browser can read a local file without uploading it, and it can also request a dozen remote images the moment a document is previewed. The difference matters when the Markdown contains internal notes, customer names, or material that has not been published.

md2pdf is a static site with no application backend. Markdown parsing, sanitization, table-of-contents generation, preview, print, and book PDF layout all run on the visitor's device. That removes the upload step that a hosted converter would require, but it does not make every document invisible to the network. This guide explains the boundary precisely.

For the conversion workflow itself, see [How to convert a GitHub README to PDF](/blog/github-readme-to-pdf/). For assembling multiple chapters, see [Build a multi-file Markdown book](/blog/multi-file-markdown-book/).

## What "browser-only" means here

In md2pdf, browser-only means there is no server-side renderer in the product. The site is static HTML, CSS, and JavaScript. When you paste Markdown, the text stays in the page's memory. When you upload a file, the browser reads it through the File API; the file is not posted to an endpoint. When you print, the browser's own print engine produces the PDF. When you export a book, the layout and ZIP packaging run in the same tab.

It does not mean the page is offline. The first load fetches the site's assets, and a GitHub import makes network requests to GitHub. It also does not mean that every URL inside the Markdown is inert. A remote image is still a remote image.

The practical promise is narrower and more honest: **your Markdown is not uploaded to LadeStack, and there is no conversion account or server-side document store.**

## The pipeline, step by step

A single document moves through the following stages:

```text
source  ->  parse  ->  resolve  ->  render  ->  sanitize  ->  preview  ->  print
```

1. **Source.** The app reads pasted text, a local file, or a public README fetched from GitHub.
2. **Parse.** markdown-it parses GitHub-flavored Markdown, including tables, task lists, strikethrough, and fenced code.
3. **Resolve.** For a repository source, relative image paths are rewritten to `raw.githubusercontent.com`, and relative document links are rewritten to the GitHub blob view.
4. **Render.** The parsed tokens become HTML.
5. **Sanitize.** DOMPurify removes dangerous elements and attributes before the HTML reaches the preview. If the sanitizer cannot load, the preview stops rather than rendering unsanitized markup.
6. **Preview.** The cleaned HTML is inserted into the page, with heading IDs and an optional table of contents.
7. **Output.** The single-document path calls the browser print dialog. The book path can also lay out an A4 PDF with pdf-lib and package per-chapter PDFs into a ZIP.

Every stage after the source read happens locally. The only server involved is the static host that delivered the page.

## What leaves the browser

For a local file or pasted Markdown, md2pdf itself sends no document content anywhere. The page does not have an API endpoint to receive it.

There are still network requests in normal use:

- **Site assets.** The HTML, CSS, JavaScript, fonts, and images that make up the site are fetched from its host.
- **A public GitHub import.** The app calls the GitHub API to discover the default branch, then requests the README and its images from GitHub. Those requests are anonymous and limited to the public repository you named.
- **Remote assets in your Markdown.** If the document references an image on another host, the browser will request that image when it renders the preview. This is true for pasted Markdown and for uploaded files.

That last point deserves emphasis. A Markdown file can look self-contained while containing `![dashboard](https://internal.example.test/chart.png)`. The text is local, but the image request is not. If the host is reachable from your network, the preview may contact it.

Links are different: a normal link is not requested until the reader clicks it. Images, iframes, and other embedded resources are requested during rendering. md2pdf removes iframes and similar embedding elements during sanitization, but ordinary images remain part of the document.

## Local files and pasted Markdown

The local workflows are the simplest to reason about:

- **Paste.** The text never leaves the tab unless the Markdown itself contains remote resources.
- **Upload.** The browser reads the file locally. The app enforces a 2 MB limit for a single Markdown file. The file is not posted to a server.
- **Sample.** The bundled sample is part of the site; loading it makes no document-specific request.

A local image referenced with a relative path will not resolve in paste or upload mode, because there is no repository base to resolve it against. Use an absolute URL, or accept the broken-image placeholder. For a repository import, relative paths are rewritten before rendering.

If you need a fully offline export, remove or replace remote images first. A document with no remote resources can be previewed and printed without any document-specific network traffic after the page has loaded.

## Remote images and links are still requests

This is the part most "client-side" claims omit. Browser-only processing protects the **document text** from being uploaded. It does not automatically protect the **resources the document points to**.

A simple example:

```markdown
![Architecture](./docs/architecture.png)

See the [operations guide](https://example.test/ops).
```

In a repository import, the image path is rewritten to the repository's raw content host, so the browser requests it from GitHub. The link is not fetched during rendering; it becomes an annotation the reader can click later. In pasted Markdown, the relative image has no base and will not resolve, while an absolute image URL would be requested directly from its host.

Before exporting sensitive material, search the source for:

- `http://` and `https://` image URLs,
- HTML `<img>` tags,
- linked stylesheets or fonts,
- embedded data URIs that may be large but do not create a network request.

The sanitizer strips scripts, styles, iframes, objects, embeds, forms, base, link, and meta elements. It does not strip every remote image, because images are a legitimate part of documentation. The choice to keep or remove them belongs to the document author.

## GitHub fetch limits and failure modes

A GitHub import is a read of public content, not an authenticated integration. The app does not ask for a token, and it cannot read a private repository. The fetch path has bounded behavior:

- The API request has a **15-second** timeout.
- The book content fetch has a **20-second** timeout.
- Repository discovery has a **25-second** budget.
- A rate-limited API can still fall back to raw content fetches in some cases.
- Missing images become placeholders rather than failing the whole document.

When a fetch fails, the app keeps the editor state so you can switch to paste or upload without losing your work. That fallback is also the privacy-safe path for private material: copy the Markdown you are authorized to use, remove remote resources if needed, and convert it locally.

Do not paste credentials, private keys, or customer data into a public issue when reporting a problem. Use the contact route on the About page for anything sensitive.

## A practical privacy checklist

Before you export a document that contains internal or personal information:

1. **Decide whether the source is public.** If it is private, do not use the GitHub fetch. Use a local file or paste.
2. **Search for remote images.** Replace them with local files or remove them. A broken-image placeholder is safer than an unexpected request.
3. **Check embedded HTML.** Raw HTML is sanitized, but links and images can still point outside.
4. **Remove secrets from the source.** The converter does not redact content. A PDF is a copy that can be forwarded.
5. **Use the browser print preview.** Confirm what will be printed before saving, especially if the document has task lists or hidden sections.
6. **Name the file deliberately.** A descriptive file name is part of the document's privacy boundary when it is shared.
7. **Remember the PDF is the artifact.** Once saved, it can be copied, indexed, and forwarded. Client-side conversion does not add DRM or access control.

Browser-only conversion is a meaningful improvement over uploading a document to an unknown service. It is not a guarantee that nothing touches the network. Treat the source, the embedded resources, and the final PDF as three separate things to review.

md2pdf is free to use and built by Girish Lade at LadeStack. The product does not require an account, and there is no server-side document store to delete afterward. For the ownership and contact details, see the [About page](/about/).
