---
title: "Sélection de dossiers à trois états pour compiler des livres Markdown en PDF"
description: "Apprenez comment les cases à cocher à trois états de md2pdf simplifient la compilation de dossiers Markdown en un livre PDF structuré."
pubDate: 2026-03-24
tags: ["markdown","pdf","book","documentation"]
locale: "fr"
translationKey: "markdown-folder-selection-book"
---

Lorsqu'il s'agit de rassembler des documents répartis dans plusieurs dossiers au sein d'un livre PDF unique, sélectionner individuellement des dizaines de fichiers est fastidieux. Les utilisateurs doivent pouvoir activer ou désactiver des dossiers complets d'un seul clic, tout en conservant une finesse de réglage sur chaque chapitre. Dans [md2pdf](/#converter), les cases à trois états simplifient l'assemblage de manuels techniques sur mesure.

Ce tutoriel détaille le principe des cases à cocher par dossier, l'interprétation des états visuels et la méthode pour compiler des arborescences Markdown en volumes PDF harmonieux.

## Comprendre les trois états des cases de dossiers

Dans une structure de fichiers imbriquée, une simple alternative cochée/décochée ne peut pas rendre compte d'une sélection partielle. md2pdf adopte le modèle standard à trois états :

1. **Coché (Tous sélectionnés)** : L'ensemble des fichiers Markdown du dossier et de ses sous-répertoires est inclus dans l'export.
2. **Indéterminé / Partiel (Sélection mixte)** : Certains fichiers du dossier sont sélectionnés, tandis que d'autres sont écartés.
3. **Décoché (Aucun sélectionné)** : Aucun document de ce répertoire ou de ses sous-dossiers ne sera exporté.

```text
Tri-State Folder Hierarchy:
[-] docs/guides/             (Indeterminate: partially selected)
    [x] getting-started.md   (Selected)
    [ ] advanced-config.md   (Excluded)
[x] docs/api/                (Checked: all files selected)
    [x] endpoints.md         (Selected)
    [x] authentication.md    (Selected)
```

## Mécanique de cascade ascendante et descendante

Cliquer sur la case d'un dossier active une cascade logique à travers l'arborescence :

- **Propagation descendante** : Cocher un dossier non sélectionné sélectionne l'ensemble de ses fichiers et sous-dossiers. Cliquer sur un dossier coché ou indéterminé décoche l'ensemble de ses éléments dépendants.
- **Propagation ascendante** : Modifier l'état d'un fichier enfant recalcule automatiquement le statut des dossiers parents jusqu'à la racine. Dès que tous les fichiers frères sont cochés, le dossier parent bascule en sélection complète.
- **Indication visuelle immédiate** : Le symbole tiret (-) signale sans équivoque qu'un dossier contient des sélections hétérogènes, évitant d'avoir à déplier son contenu pour le vérifier.

## Composition de manuels techniques thématiques

Les commandes à trois états permettent d'élaborer des publications spécialisées en un instant :

- **Guides thématiques pour développeurs** : Cochez uniquement les répertoires `api/` et `sdk/` pour produire un manuel externe, en écartant les procédures internes `admin/`.
- **Rapports d'audit et de conformité** : Sélectionnez le répertoire des normes, décochez les brouillons de travail et générez un PDF officiel pour validation.
- **Manuels d'accueil pour nouveaux arrivants** : Combinez le `README.md` initial avec les modules d'initiation du dossier `tutorials/getting-started/`.

## Préservation de la hiérarchie lors de la compilation PDF

Lorsque vos dossiers sélectionnés sont fusionnés au sein d'un même volume PDF, md2pdf maintient une structure éditoriale soignée :

- **Sommaire dynamique hiérarchisé** : Les dossiers forment les grandes sections du livre, tandis que chaque fichier Markdown devient un chapitre structuré.
- **Pagination continue** : Le document PDF adopte une numérotation séquentielle et ininterrompue sur l'intégralité des chapitres réunis.
- **Sauts de page harmonieux** : Des sauts de page automatiques sont intercalés entre les documents pour garantir une mise en page digne d'un manuel imprimé.

## Exporter votre livre sur mesure en PDF

Dès que vos sélections de dossiers sont arrêtées, cliquez sur le bouton de compilation. Votre sélection de guides techniques sera transformée en un livre PDF élégant, doté d'une typographie nette et d'une navigation interne réactive.
