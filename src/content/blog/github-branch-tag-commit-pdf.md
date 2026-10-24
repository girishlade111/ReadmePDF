---
title: "Pinning GitHub Branches, Tags, and Commits for Versioned Markdown PDFs"
description: "Learn how to pin specific Git branches, release tags, or exact commit SHAs when importing GitHub Markdown documentation into md2pdf for versioned PDF generation."
pubDate: 2026-03-24
tags: ["github","git","markdown","pdf"]
locale: "en"
translationKey: "github-branch-tag-commit-pdf"
---

Software documentation changes with every release. If you export a technical guide from a repository's default branch, you might capture unreleased features or breaking API modifications. With [md2pdf](/#converter), you can pin your documentation export to specific Git branches, release tags, or immutable commit hashes.

This tutorial explains how Git reference pinning works, how to choose the right reference type, and how to create dependable, version-accurate PDF manuals.

## Why Git Reference Pinning Matters for Technical Documentation

When generating manuals for enterprise deployments or long-term support (LTS) releases, documentation must match the installed software version exactly.

- **Production Accuracy**: Ensure the PDF manual describes the API endpoints currently deployed in production rather than upcoming experimental changes.
- **Audit Trails and Compliance**: When software undergoes regulatory verification, documentation exported from an immutable commit hash provides indisputable proof of functionality.
- **Historical Release Preservation**: Recreate documentation for deprecated software versions without cloning historical Git repositories locally.

```text
Supported Git Reference Types:
- Branch:  refs/heads/v2.1-maintenance
- Tag:     refs/tags/v2.1.0-lts
- Commit:  7f2b9a1d4e8c3b0f5a6d7e8c9b0a1f2e3d4c5b6a
```

## Using Release Tags for Production Manuals

Release tags represent stable checkpoints in a project's lifecycle. In md2pdf, entering a tagged repository URL or selecting a release tag instructs the client to fetch files from that exact tag snapshot.

1. **Tag Discovery**: When querying a repository, md2pdf identifies available semantic version tags (e.g., `v1.4.0`, `v2.0.0-rc1`).
2. **Snapshot Fetching**: Every file fetched under a tag reference corresponds precisely to that release milestone.
3. **Version Headers**: Incorporate the tag name into your document headers or cover page to make document versioning immediately visible to readers.

## Targeting Maintenance Branches

When teams backport bug fixes to older releases, documentation updates often land in dedicated maintenance branches before or between patch releases.

By specifying a branch name such as `support/3.x` or `v1-stable`, md2pdf pulls the latest documentation revisions directly from that branch. This ensures your field engineers receive up-to-date guidance without incorporating unstable work from `main` or `master`.

## Immutable Exports with Commit SHAs

For total reproducibility, nothing compares to an exact 40-character Git commit SHA. Unlike branches or mutable tags, a commit hash is mathematically permanent.

When you specify a commit SHA in md2pdf, the Git tree is retrieved at that exact moment in repository history. Even if the author later rewrites history or deletes the branch, the exported PDF represents an immutable snapshot of that verified state.

## Step-by-Step Reference Switching in md2pdf

Configuring your target reference in md2pdf is straightforward:

1. Paste your repository URL into the repository input field.
2. Open the reference selector dropdown to view available branches and tags.
3. Select an existing tag or branch, or paste an exact commit hash directly into the input.
4. Browse the repository tree and compile your version-locked Markdown documents into a pristine PDF.
