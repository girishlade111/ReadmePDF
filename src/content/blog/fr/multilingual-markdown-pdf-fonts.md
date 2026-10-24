---
title: "Intégrer des polices Unicode multilingues dans vos PDF Markdown sans tofu"
description: "Apprenez comment md2pdf intègre des polices Unicode via fontkit et pdf-lib pour restituer les idéogrammes CJK, le cyrillique et les accents sans glyphes manquants."
pubDate: 2026-03-24
tags: ["markdown","fonts","multilingual","pdf"]
locale: "fr"
translationKey: "multilingual-markdown-pdf-fonts"
---

Le défaut récurrent des outils de conversion Markdown vers PDF rudimentaires réside dans la dégradation des polices lors du traitement de textes internationaux. Lorsqu'un moteur de rendu rencontre des caractères chinois, japonais, coréens (CJK), du cyrillique ou des signes diacritiques sans incorporation de polices adéquates, il affiche des rectangles vides appelés « tofu ». Grâce à [md2pdf](/#converter), l'incorporation de polices vectorielles Unicode garantit un affichage impeccable sur tous les écrans.

Cet article détaille le fonctionnement de l'intégration des polices dans le navigateur avec `pdf-lib` et `@pdf-lib/fontkit`, l'optimisation des glyphes et la couverture multilingue sans perte de caractères.

## Les obstacles typographiques de l'Unicode en format PDF

Les spécifications standard des fichiers PDF ne prévoient qu'un jeu restreint de 14 polices élémentaires (telles que Helvetica et Times), limitées aux caractères ASCII occidentaux.

- **Le problème du « tofu »** : Les glyphes absents de la police active sont remplacés par de petits carrés vides (□).
- **La complexité des langues CJK** : Les écritures asiatiques comptent des dizaines de milliers d'idéogrammes, imposant une gestion rigoureuse du poids des fichiers.
- **Accents et signes particuliers** : Le turc (ç, ğ, ı, ö, ş, ü) et les alphabets slaves cyrilliques nécessitent une prise en charge typographique précise.

```text
Multilingual Glyph Coverage in md2pdf:
- Latin & Extended Latin: English, Spanish, French, Portuguese, Turkish
- Cyrillic Alphabets:     Russian, Ukrainian, Bulgarian
- East Asian Ideographs:  Simplified Chinese (简体中文), Japanese (日本語)
- Hangul Syllables:       Korean (한국어)
```

## Intégration avancée avec @pdf-lib/fontkit

md2pdf mobilise la bibliothèque `@pdf-lib/fontkit` pour décoder les tables TrueType (TTF) et OpenType (OTF) au sein même de votre navigateur :

1. **Chargement côté client** : Des typographies libres de référence (telles que Noto Sans, Source Han Sans et Roboto Mono) sont téléchargées à la demande selon la langue du texte.
2. **Correspondance vectorielle** : Le moteur `fontkit` parcourt les chaînes Unicode de votre fichier Markdown et associe chaque caractère à son tracé vectoriel exact.
3. **Incorporation dans le fichier** : `pdf-lib` injecte les vecteurs dans la structure binaire du document, garantissant un PDF totalement indépendant.

## Une typographie soignée pour les neuf langues prises en charge

md2pdf propose une prise en charge native pour l'ensemble des neuf langues de la plateforme :

- **Français, anglais, espagnol, portugais** : Typographie latine élégante avec restitution parfaite des accents aigus, graves, circonflexes, cédilles et trémas.
- **Turc** : Affichage fidèle des « i » avec ou sans point (`İ` / `i`, `I` / `ı`) et des consonnes spécifiques.
- **Russe (Cyrillique)** : Des glyphes cyrilliques équilibrés qui s'harmonisent avec le style des titres latins.
- **Japonais, chinois et coréen** : Restitution précise des kanjis, sinogrammes et syllabes hangeul avec un espacement rigoureux.

## Une autonomie totale en lecture hors ligne

Puisque les tracés vectoriels sont gravés au cœur du document PDF :

Le fichier exporté s'affiche de manière identique sur n'importe quel système d'exploitation ou liseuse PDF, sans exiger l'installation préalable de polices asiatiques ou slaves sur la machine du destinataire.

## Produire vos publications multilingues dans md2pdf

Qu'il s'agisse de convertir un guide d'API en japonais, une documentation technique en russe ou un rapport bilingue, md2pdf orchestre la typographie de façon totalement automatisée. Importez vos textes et obtenez un PDF net, dépourvu de la moindre anomalie d'affichage.
