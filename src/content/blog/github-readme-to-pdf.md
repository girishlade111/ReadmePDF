---
title: "How to Convert a GitHub README to PDF (Free, No Login)"
description: "A step-by-step guide to turning a public GitHub README into a clean, print-ready PDF with ReadmePDF — no account, no upload, and no server-side renderer."
pubDate: 2026-09-18
updatedDate: 2026-10-21
author: "Girish Lade"
tags: ["GitHub", "README", "PDF", "Tutorial"]
featured: true
locale: "en"
translationKey: "github-readme-to-pdf"
---

A README is written for a browser: it scrolls, it links out, and it assumes the reader can click around the repository. The moment you need to send documentation to a client, attach it to an assignment, archive a release, or hand it to someone who will not clone the repo, a PDF is the format that travels.

Printing a GitHub page directly usually produces a mess. The site navigation, sidebars, and footer come along for the ride. Wide code blocks are cut off. Relative images break because the browser is no longer reading from the repository root. Long tables split awkwardly across pages. ReadmePDF exists to solve those specific problems without asking you to create an account or upload your source file to a server.

This guide walks through the full workflow, from pasting a repository URL to checking the exported PDF, and explains what the tool is doing at each step.

## Why the browser's Print button is not enough

GitHub's web interface is a web app, not a print stylesheet. When you press `Ctrl+P` on a repository page, the browser tries to print the entire page: the header, the file tree, the "About" sidebar, the feedback widgets, and whatever else happens to be in the layout. Some of that can be hidden with a custom print stylesheet, but you cannot change GitHub's markup from the outside.

There are three other recurring problems:

- **Relative image paths.** A README that says `![diagram](docs/architecture.png)` works on GitHub because the image is resolved against the repository. A printed browser page has no reliable repository context, so the image may disappear.
- **Wide code and tables.** Code blocks and comparison tables are wider than a printed page. Without print-specific rules, they either shrink to unreadable sizes or get clipped.
- **Pagination.** Headings, code blocks, and table rows need to avoid awkward breaks. A raw browser print rarely handles that well.

ReadmePDF fetches the README's raw Markdown, resolves repository-relative URLs, renders GitHub-flavored Markdown, sanitizes the result, and applies a print stylesheet before the browser's print dialog opens. The output is still produced by your browser's native "Save as PDF" engine, but the document it receives is already cleaned up.

## What ReadmePDF changes

The conversion pipeline runs entirely in the browser. In practical terms:

1. You provide a public GitHub repository URL, a local Markdown file, or pasted Markdown.
2. For a repository, the app discovers the default branch and tries a set of common README filenames, including files inside `.github/`.
3. Relative image paths are rewritten to `raw.githubusercontent.com`, and document links are rewritten to the GitHub blob view.
4. The Markdown is rendered with GFM support: tables, task lists, strikethrough, fenced code, and automatic linking.
5. The HTML is sanitized with DOMPurify before it reaches the preview.
6. A table of contents is generated when the document has at least three headings.
7. The print stylesheet for your chosen theme is applied, and the browser opens its print dialog.

No file is uploaded. The only outbound requests are anonymous reads of the public repository you asked for, plus the GitHub API call used to discover the default branch. Private repositories are not supported in this version.

## Before you start

You need:

- A **public** GitHub repository, or a local Markdown file, or a block of Markdown you can paste.
- A modern browser. Chrome, Edge, Firefox, and Safari all support "Save as PDF" in their print dialogs.
- About two minutes for a short document, longer if you plan to review the PDF page by page.

If the repository is private, the fetch will fail. The manual fallback still works: copy the README text, paste it into the editor, and use absolute image URLs.

## Step 1: Give the tool a repository

Open the converter and paste the repository URL into the **GitHub repo URL** field. ReadmePDF accepts more than the canonical URL:

```text
https://github.com/owner/repo
https://github.com/owner/repo.git
github.com/owner/repo
owner/repo
https://github.com/owner/repo/tree/main/docs
https://github.com/owner/repo/blob/main/README.md
```

All of those resolve to the same `owner/repo` pair. Protocol-less URLs and the `owner/repo` shorthand are convenient when you are copying from a terminal or a chat message. Extra path segments are accepted for convenience, but they are ignored: the app still reads the repository's root-level README on the default branch, not the nested file shown in the URL. If the nested file is the one you need, paste its Markdown directly.

Press **Fetch** or hit `Enter`. If the field is empty, the app tells you what it expects instead of silently doing nothing.

## Step 2: Let it fetch and resolve the README

The app first asks the GitHub API for the repository's default branch. It then tries a list of README filenames against that branch, including common case variants and the `.github/README.md` location. If the API is rate-limited, the raw fetch can still continue, which is why a temporary API failure does not always end the workflow.

Once the Markdown arrives, the preview updates. This is the point to check three things:

- **Images.** Repository-relative images should appear. If one does not, it may point to a private asset, a path that does not exist, or an absolute URL that blocks hotlinking.
- **Code blocks.** Language-tagged fences render as code. Very wide lines will scroll in the preview, but they still need a print check.
- **Links.** Document links are rewritten to the GitHub blob view so they remain meaningful in the PDF. External links open in a new tab in the preview.

If an image fails, ReadmePDF marks it as broken and keeps going. The export does not fail because one badge is unavailable. That is deliberate: a missing badge is usually less important than the rest of the document.

## Step 3: Pick a theme that matches the document

There are four print themes:

- **Clean** is the default. It uses neutral sans-serif type and is the safest choice for specifications, technical READMEs, and code-heavy documents.
- **Business** uses serif type and a dark code block. It suits reports, proposals, and client-facing handoffs.
- **Academic** uses justified serif pages with a light code treatment. It is built for long-form prose, course readers, and paper-like submissions.
- **Dark** is a screen-first theme. The preview is dark for comfortable reading, and the print stylesheet forces light ink and light code backgrounds so the PDF stays legible.

For a deeper comparison, see [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/). For most first-time exports, start with Clean and only switch if the document has a clear audience expectation.

## Step 4: Decide whether the table of contents helps

The auto table of contents is enabled by default and generated when the document has three or more headings. It uses stable, unique heading slugs, so the entries link to the right sections in the preview.

Keep it when:

- The document is longer than a few pages.
- The reader needs to jump to a specific section.
- You are handing the PDF to someone who may print only part of it.

Turn it off when:

- The README is short and the contents block adds more noise than navigation.
- The document already has a hand-written table of contents.
- You are producing a one-page handout.

The toggle affects the preview and the print output. There is no separate PDF-only setting.

## Step 5: Print to PDF with the right settings

Click **Download / Print PDF** in the Live Preview panel. The app calls the browser's print dialog. In the dialog:

1. Set **Destination** to **Save as PDF** (or the equivalent in your browser).
2. Choose **A4** or **Letter** to match the recipient's region.
3. Leave **Margins** at the default unless you have a house style. The print stylesheet already sets page margins.
4. Keep **Scale** at 100% for the first attempt. If a wide table or code block is clipped, reduce the scale slightly rather than shrinking the font in the source.
5. Enable **Background graphics** if your browser offers it. Theme accents, code block backgrounds, and table header fills depend on background colors. Without them, the PDF is still readable, but Business and Dark lose some of their visual structure.
6. Turn off browser **Headers and footers** unless you specifically want the URL and page numbers. They are not part of the document design.
7. Save the file with a descriptive name, for example `owner-repo-readme-2026-10.pdf`.

The exact labels vary by browser. In Chrome and Edge, background graphics live under "More settings". In Firefox, look for "Print backgrounds". Safari exposes fewer controls; check the preview before saving.

## Step 6: Check the PDF before you send it

Open the saved PDF and scan for the problems that print exposes:

- **Page breaks.** A heading should not sit alone at the bottom of a page. Code blocks, tables, and images should not be split in the middle.
- **Wide content.** Long code lines and tables are the most common overflow culprits. If they are clipped, shorten the lines in the source or reduce the print scale.
- **Links.** Click a few links in the PDF. GitHub blob links should open the correct file view.
- **Images.** Confirm that diagrams and badges survived. A missing private asset will not fix itself in the PDF.
- **Metadata.** The document title and author come from the README and the browser's print metadata settings, not from a dedicated PDF metadata form. Name the file clearly.
- **Readability.** Print a page at 100% and check that the body text is comfortable. Academic's justified text and Business's serif type can look different on paper than on screen.

## When the fetch fails

The app maps fetch failures to actionable messages. The common cases:

| What you see | What it usually means | What to do |
| --- | --- | --- |
| Repo not found or private | The URL is wrong, or the repository requires authentication | Check the URL; paste the Markdown manually if the repo is private |
| No README found | The repository has no README on the default branch, `main`, or `master` | Upload the file or paste the Markdown |
| GitHub rate limit hit | Too many unauthenticated API requests | Wait about a minute and retry; the raw fetch may still work |
| Fetch failed or timed out | Network problem, or the request exceeded the 15-second timeout | Retry; the manual paste path still works |

If the fetch fails, the editor keeps whatever you have already typed. You can switch to paste or upload mode without losing the page.

## Paste or upload instead

The GitHub fetch is convenient, but it is not the only way in. The converter also supports:

- **Uploading** a `.md`, `.markdown`, or `.txt` file up to 2 MB.
- **Pasting** Markdown directly into the editor. The preview re-renders after a short debounce as you type.
- **Loading the sample** to see how tables, task lists, and code blocks are handled.

One caveat: relative image paths only resolve when a repository was fetched first. Uploaded or pasted Markdown has no repository base, so use absolute image URLs in that mode. Everything else — headings, tables, code, task lists — works the same way.

## Five source-level fixes that improve every export

The PDF is only as good as the Markdown it starts from. These changes pay off immediately:

1. **Use a real heading hierarchy.** Start sections at `##`, use `###` for subsections, and avoid skipping levels. The table of contents and the print stylesheet both depend on structure.
2. **Give images useful alt text.** It is good for accessibility, and it gives the PDF a readable fallback when an image cannot load.
3. **Fence code with a language.** Language-tagged blocks render more predictably than indented code, especially when lines are long.
4. **Keep tables narrow.** A table with eight columns will not fit on A4 without shrinking. Move detail into prose or split the table.
5. **Prefer relative paths for repository assets.** ReadmePDF rewrites them correctly. Absolute links to a local machine or a private bucket will not survive the trip.

## Privacy: what leaves your browser

ReadmePDF does not upload your Markdown. Rendering, sanitization, table-of-contents generation, and PDF export all happen locally. For a repository fetch, the only outbound requests are anonymous reads against GitHub for the public README and its images. There are no accounts, no cookies, and no analytics attached to the conversion.

That matters when the document contains internal notes, customer names, or unreleased plans. You can paste sensitive Markdown and export it without sending the text to a third-party conversion service. The same is true for local files: the file is read by your browser, not uploaded.

## The short version

Paste a public repository URL, press Fetch, confirm the preview, choose a theme, leave the table of contents on for long documents, and print to PDF with background graphics enabled. Check page breaks and wide code blocks before you send the file. If the fetch fails, paste or upload the Markdown and continue.

The whole workflow is designed to be boring: no account, no queue, no upload, no server-side renderer. Just a README, a print stylesheet, and a PDF you can hand to someone.
