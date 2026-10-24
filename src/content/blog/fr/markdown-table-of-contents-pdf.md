---
title: "Sommaire Markdown en PDF : structurer pour une impression limpide"
description: "Comment md2pdf construit le sommaire, quand l'activer et comment hiérarchiser vos titres pour obtenir un document PDF clair et navigable."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Navigation", "PDF", "Layout"]
locale: "fr"
translationKey: "markdown-table-of-contents-pdf"
---

Une table des matières n'est pas un simple ornement. Dès qu'un document compte plus de quelques pages, elle fait toute la différence entre un lecteur qui trouve immédiatement sa section et un utilisateur contraint de faire défiler tout le PDF.

md2pdf génère un sommaire automatique pour les documents uniques et assemble une table des matières complète pour les livres multi-chapitres. Ce guide détaille leur fonctionnement, la bonne hiérarchie des titres et les cas où il est préférable de désactiver le sommaire.

Pour la conversion standard, consultez [Comment convertir un README GitHub en PDF](/blog/github-readme-to-pdf/). Pour les livres multi-documents, voir [Créer un livre Markdown multi-fichiers](/blog/multi-file-markdown-book/).

## Ce qu'est réellement la table des matières

Dans l'aperçu d'un document simple, le sommaire est un bloc HTML inséré en amont du texte Markdown. Il liste les titres sous forme de liens hypertextes qui fonctionnent dans le navigateur et demeurent généralement cliquables dans le PDF selon les paramètres du moteur d'impression.

Il ne s'agit pas du volet de signets natif du lecteur PDF. Ces signets dépendent des moteurs d'impression des systèmes d'exploitation.

Dans le mode livre, le sommaire constitue une page entière du document imprimé, calculée à partir des chapitres sélectionnés.

## Comment md2pdf le construit

Le sommaire est extrait dynamiquement de l'arborescence Markdown analysée :

- Le document doit comporter au moins **trois titres**.
- Les niveaux de **H1 à H4** sont pris en compte.
- Les identifiants d'ancres sont générés sans collision.
- Le bouton bascule commande simultanément l'aperçu et l'impression finale.

```markdown
# Project handbook

## Installation

### Requirements

## Configuration

### Environment variables

## Troubleshooting
```

Exemple d'arborescence type :

Ce document comportant six titres, la table des matières s'affiche immédiatement en respectant l'indentation hiérarchique.

## Rédigez des titres explicites et concis

Un titre doit à la fois expliciter le paragraphe et constituer une ligne de sommaire intelligible en elle-même.

```text
Vague:  ## Overview
Useful: ## Configure GitHub access
Vague:  ## Errors
Useful: ## Recover from a failed export
```

Privilégiez les termes précis :

La version précise indique clairement le sujet traité. Évitez les titres trop longs qui reviennent à la ligne et n'utilisez pas de titres H2 pour de simples mises en garde visuelles.

## Démarrez les grandes sections au niveau H2

Le H1 doit être réservé au titre du document. Structurer les sections en H2 apporte trois bénéfices majeurs :

1. **Un niveau racine net.** Le document forme une unité cohérente.
2. **Une imbrication naturelle.** H3 et H4 s'organisent harmonieusement.
3. **Une échelle typographique équilibrée.**

Si vos fichiers sources débutent tous par un H1, le mode livre est plus approprié qu'un document isolé.

## Gérez doublons, annexes et documents volumineux

Bien que le système gère techniquement les doublons d'ancres, des libellés identiques perturbent la lecture. Différenciez vos titres dans le document source.

Dans les documents très denses, veillez à ne pas saturer le sommaire de sous-titres H4 mineurs si cela étire le sommaire sur plusieurs pages.

Pour les annexes, donnez un nom complet explicite tel que `## Annexe A : Limites d'export`.

## Décidez quand le conserver

Le sommaire est indispensable sur les manuels, les spécifications techniques et les rapports. Il devient superflu sur les documents d'une à deux pages ou les notes de synthèse courtes.

## Vérifiez le rendu du sommaire sur le PDF

Ouvrez le PDF final et vérifiez la réactivité des liens ainsi que l'élégance de la pagination. Pour peaufiner vos tableaux, consultez [Tableaux Markdown en PDF](/blog/markdown-tables-to-pdf/).
