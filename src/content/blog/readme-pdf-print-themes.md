---
title: "Clean vs Business vs Academic vs Dark: Which ReadmePDF Theme Should You Use?"
description: "A practical comparison of ReadmePDF's four print themes — typography, code blocks, tables, and the documents each one suits."
pubDate: 2026-10-14
author: "Girish Lade"
tags: ["Themes", "Design", "PDF"]
---

The theme picker in ReadmePDF looks like a small choice: four radio buttons above the export button. In practice, it changes how the document reads before anyone gets to the content. A specification printed in Academic looks like a paper. A client proposal printed in Clean looks like a repository dump. The right theme is the one that matches the reader's expectations.

All four themes render the same Markdown. They differ in type family, alignment, code treatment, table styling, link color, and how much visual structure they add to headings. None of them adds a watermark, a cover page, or a logo. The content stays yours.

## Themes are print stylesheets, not color swaps

Each theme is a set of CSS rules applied to the preview sheet and carried into the print output. That means the theme affects:

- The font used for headings, body copy, tables, and code.
- Whether body text is left-aligned or justified.
- The color and weight of heading rules.
- Code block and inline code backgrounds.
- Table header fills and border colors.
- Link color in the preview and, where the PDF preserves it, in the exported file.

The print stylesheet also handles pagination hints: code blocks, tables, blockquotes, and images avoid breaking in the middle where possible, and headings avoid being stranded at the bottom of a page.

One practical note before comparing them: enable **Background graphics** in your browser's print dialog if you want code block fills and table header colors to survive. Without it, the PDF is still readable, but Business and Dark lose some of their structure. The choice is in the print dialog, not in the app.

## Clean: the default for technical documents

Clean is the neutral option. It uses the interface's sans-serif stack for the whole document, with dark gray text on white and a light gray code background. Headings are separated by a thin rule, and links use the same blue-teal used elsewhere in the product.

**It works best for:**

- Repository READMEs and technical specs.
- Internal engineering documentation.
- Code-heavy handouts and runbooks.
- Documents that will be read on screen as often as on paper.
- Audit snapshots where neutrality matters more than polish.

**Watch out for:**

- Very long prose can feel flat. Clean is efficient, not warm.
- The light code background depends on background graphics in print. If it is disabled, code blocks still read, but they lose the visual separation from body text.
- Sans-serif body text at small print sizes can be less comfortable than a serif for long reads.

Clean is the safest default because it does not impose a tone. If you are exporting a README for another engineer, start here.

## Business: reports, proposals, and client-facing handoffs

Business moves the document into a more formal register. It uses serif type throughout, navy headings with a heavier rule, a dark code block, and a tinted table header. The result reads more like a report than a README, which is exactly the point when the audience is a client, a manager, or a cross-functional stakeholder.

**It works best for:**

- Client handoffs and project overviews.
- Proposals, statements of work, and reports.
- Workshop handouts that should look designed.
- Portfolio attachments and application samples.
- Documents where diagrams and tables carry as much weight as prose.

**Watch out for:**

- The dark code block is a strong visual element. A document with many short code snippets can start to look striped.
- Serif type and justified-ish spacing make long URLs and code identifiers stand out. Keep code lines short.
- Background graphics matter here. Without them, the dark code block becomes a plain block and the table header loses its tint.
- Business is not a substitute for editing. A raw changelog in Business still reads like a raw changelog.

For external documents, Business is usually the better first impression. It signals that the PDF was prepared for a reader, not exported as an afterthought.

## Academic: long-form prose and course material

Academic uses a serif face, justified body text, and a warmer, lighter code treatment. Headings stay left-aligned so the structure remains scannable even when the paragraphs are justified. The overall effect is closer to a course reader or a paper than a product page.

**It works best for:**

- Course packs, reading packets, and lecture notes.
- Papers and research write-ups.
- Long-form documentation with few code blocks.
- Grant applications and academic portfolios.
- Any document where the reader expects to read continuously rather than scan.

**Watch out for:**

- Justified text can create wide gaps around long URLs, code identifiers, and technical terms. Break long links into reference-style links or move them into a list.
- Code blocks are readable but visually quieter than in Business. That is intentional: Academic assumes code is supporting material, not the main event.
- Tables can become cramped on A4 if they have many columns. Reduce the column count or move detail into prose.
- Academic is a poor fit for a quick setup guide. The format says "read this end to end", and a runbook is usually scanned.

If the document has a bibliography-like section, Academic's typography makes it feel at home. The app does not format citations, so keep the references section in the Markdown.

## Dark: screen-first review, print-safe output

Dark is the odd one out. It is designed for comfortable on-screen reading first: dark navy background, light text, and a brighter link color. When you print, the print stylesheet forces a white background, black text, black links, and light code blocks. The PDF does not carry the dark screen theme onto paper.

**It works best for:**

- Reviewing a long README on screen before exporting.
- Evening or low-light reading.
- Checking how the document reads without the visual noise of a white page.
- Producing a PDF from a team that prefers dark-mode tools.

**Watch out for:**

- What you see on screen is not what you get in the PDF. Always open the exported file to confirm the light print treatment.
- Dark is not a brand theme for external documents. A client expects the PDF to match the print output, not the preview.
- If your browser is set to print backgrounds, the print stylesheet still overrides the dark surfaces, but code blocks may need a visual check.
- The theme's screen contrast can hide weak source structure. A document with skipped headings still looks moody; it does not become better organized.

Think of Dark as a reading mode with a print-safe escape hatch, not as a fourth visual identity for the final document.

## Side-by-side comparison

| | Clean | Business | Academic | Dark |
| --- | --- | --- | --- | --- |
| Body type | Sans-serif | Serif | Serif, justified | Sans-serif on screen; light print |
| Heading treatment | Thin rule | Navy rule | Left-aligned serif | Light rule on dark; print-safe |
| Code blocks | Light gray | Dark navy | Warm light | Dark on screen; light in print |
| Table headers | Neutral | Tinted blue | Neutral | Dark on screen; light in print |
| Link color | Blue-teal | Blue | Black | Bright blue on screen; black in print |
| Best audience | Engineers | Clients, managers | Academics, students | The author, on screen |
| Best document | Spec, README, runbook | Report, proposal, handout | Paper, course pack | Review copy |

The table is a starting point, not a rule. A technical client may prefer Clean. A design-conscious engineering team may prefer Business. The document's job matters more than its category.

## How the theme interacts with the rest of the export

The theme is only one part of the print result. These interactions are worth checking:

**Table of contents.** The TOC inherits the document's type and link color. In Business, the navy headings and blue links make it feel like a report contents page. In Academic, it reads like a paper outline. The TOC is generated for documents with three or more headings, and you can turn it off if the document is short.

**Code blocks.** Clean and Academic use light code backgrounds; Business uses a dark block; Dark uses a dark block on screen and a light block in print. Long lines are the bigger issue than color. A 120-character line will overflow regardless of theme.

**Tables.** Business adds a tinted header; Clean and Academic stay neutral. Wide tables are the most common print failure. If a table has more than five or six columns, consider splitting it or reducing the font size in the source rather than shrinking the print scale.

**Images and badges.** Themes do not change image rendering, but they change the surrounding whitespace. Business's serif text can make a screenshot feel more like a figure; Clean's sans-serif text makes it feel like documentation. Broken images are marked in the preview and do not abort the export.

**Links.** Clean and Business use blue links; Academic uses black; Dark uses bright blue on screen and black in print. If the PDF will be printed in grayscale, the color difference disappears, so make link text descriptive rather than relying on color.

**Page breaks.** The print stylesheet prevents code blocks, tables, blockquotes, and images from breaking mid-element where possible, and keeps headings with the content that follows. This behavior is shared across themes, but it matters more in Academic, where long prose produces more page transitions.

## Choose in 30 seconds

Use this quick decision path:

1. **Is the reader an engineer who will scan for commands and code?** Choose Clean.
2. **Is the reader a client, manager, or reviewer who expects a report?** Choose Business.
3. **Is the document long-form prose with few code blocks?** Choose Academic.
4. **Are you mainly reading on screen and exporting afterward?** Choose Dark, then check the PDF.
5. **Still unsure?** Choose Clean. It is the least likely to misrepresent the document.

A useful test: export the first two pages in two candidate themes and read them on a phone. The theme that survives a small screen and a quick scan is usually the right one.

## Pre-export checks that matter more than the theme

No theme can fix these:

- **Heading hierarchy.** Use `##` for main sections and `###` for subsections. Skipped levels produce a confusing TOC.
- **Code line length.** Keep lines under roughly 80–90 characters where possible.
- **Table width.** Fewer columns, shorter labels, or a split table.
- **Image paths.** Repository-relative images need a repository fetch; pasted Markdown needs absolute URLs.
- **Confidential text.** The conversion is local, but the PDF can still be forwarded.
- **Page size.** A4 and Letter paginate differently. Choose the one the recipient will print.
- **Background graphics.** Enable it if code block fills and table headers matter to the design.

## The recommendation

For most README exports, **Clean** is the right default. It is neutral, readable, and does not pretend the document is something it is not. Use **Business** when the PDF is a deliverable for someone outside engineering. Use **Academic** when the document is meant to be read as prose. Use **Dark** when you want a comfortable review pass before producing the final light PDF.

The theme is a signal to the reader. Pick the signal that matches the job, then spend the remaining effort on the content: a clear opening, a sensible heading structure, and images that actually resolve. Those choices survive every theme.

For the full export workflow, see [How to Convert a GitHub README to PDF](/blog/github-readme-to-pdf/). For audience-specific preparation, see [7 Practical Use Cases for Turning a README into a PDF](/blog/readme-to-pdf-use-cases/).
