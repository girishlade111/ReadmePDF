---
title: "Maîtriser les paramètres d'impression du navigateur pour des PDF parfaits"
description: "Guide exhaustif des options d'impression du navigateur pour Markdown : marges, formats de papier, graphiques d'arrière-plan et gestion des sauts de page."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Print","Browser","CSS","PDF"]
locale: "fr"
translationKey: "browser-print-markdown-pdf"
---

Un document Markdown remarquablement mis en page dans votre navigateur peut ressortir dégradé si la boîte de dialogue d'impression est mal paramétrée. Dates indésirables en marge, blocs de code tronqués, arrière-plans disparus ou marges déformées sont rarement le fait du Markdown lui-même ; ils découlent des profils par défaut des navigateurs, conçus pour imprimer des pages web ordinaires et non des publications formelles.

md2pdf combine les requêtes média CSS (`@media print`) avec le moteur d'impression natif de votre navigateur. Lors du clic sur imprimer, les feuilles de style dédiées s'appliquent pour masquer la barre d'outils, isoler le texte et paginer le contenu. Toutefois, le contrôle final sur les marges, le format du papier et la restitution des couleurs d'arrière-plan vous revient dans la fenêtre d'impression.

Ce guide vous apprend à configurer Chrome, Firefox, Safari et Edge pour une fidélité optimale. Pour prévisualiser les styles en amont, consultez le [Guide des thèmes d'impression md2pdf](/fr/blog/readme-pdf-print-themes/).

## Why browser print dialogs require careful configuration

L'impression par défaut des navigateurs suppose que vous souhaitez une simple capture d'une page web, estampillant d'office la date, le titre de l'onglet et l'adresse URL dans les marges. Sur un document technique ou un contrat, ces mentions parasites altèrent la crédibilité de la présentation.

De plus, les navigateurs désactivent par défaut les couleurs d'arrière-plan afin d'économiser l'encre des imprimantes de bureau. Dans un document technique, désactiver les graphiques d'arrière-plan supprime le contraste des blocs de code, l'ombrage des en-têtes de tableaux et les encadrés d'avertissement.

Maîtriser ces quelques réglages transforme une simple impression en un document PDF de qualité professionnelle.

## Essential print settings: Paper size, margins, and scaling

À l'ouverture du panneau d'impression de votre système, ajustez ces options fondamentales :

- **Destination** : Sélectionnez **Enregistrer au format PDF** (ou Microsoft Print to PDF).
- **Format de papier** : Choisissez **A4** (norme internationale) ou **Lettre** (norme nord-américaine) selon vos destinataires.
- **Orientation** : Conservez **Portrait** pour le texte courant. N'utilisez **Paysage** que pour les documents contenant de très larges tableaux.
- **Marges** : Optez pour **Par défaut** ou **Aucune**. md2pdf intégrant déjà des marges intérieures équilibrées en CSS, choisir des marges minimales risquerait de coller le texte au bord de la feuille.
- **Échelle** : Laissez la valeur sur **100 % (Par défaut)**. Évitez de descendre sous les 90 % pour préserver la netteté des polices.

## Enabling background graphics for theme fidelity

L'option la plus cruciale de la fenêtre d'impression est **Graphiques d'arrière-plan** :

```text
[x] Background graphics (Chrome, Edge, Opera)
[x] Print Backgrounds (Firefox)
[x] Print backgrounds (Safari)
```

En cochant cette case :

- Le fond sombre ou grisé des blocs de code ainsi que la coloration syntaxique sont préservés.
- Les lignes alternées et les en-têtes des tableaux conservent leur contraste.
- Les encadrés d'information et badges d'avertissement gardent leur visibilité.
- Les lignes de séparation des thèmes choisis (comme le thème Business ou Academic) sont imprimées fidèlement.

Sans cette case cochée, tous les blocs de code apparaîtront sur fond blanc transparent, rendant la lecture pénible.

## Suppressing unwanted browser headers and footers

Par défaut, les navigateurs incrustent leurs propres métadonnées :

- En-tête : Titre de l'onglet et date du jour.
- Pied de page : URL complète et numéro de page générique (ex. : « 1/4 »).

Dans la boîte d'impression, décochez **En-têtes et pieds de page** :

```text
[ ] Headers and footers (Uncheck to remove browser URL and date)
```

Décocher cette case permet d'effacer les adresses web superflues et d'afficher uniquement la numérotation soignée fournie par md2pdf.

## Page-break control across headings, tables, and code

md2pdf intègre des règles CSS automatiques de coupure pour éviter les scissions maladroites :

```css
h1, h2, h3 { break-after: avoid; }
pre, table, figure { break-inside: avoid; }
```

- **Protection des titres orphelins** : Les titres ne restent jamais isolés au bas d'une page ; ils basculent automatiquement en haut de la page suivante avec leur paragraphe.
- **Intégrité du code** : Les blocs de code évitent d'être coupés en deux feuilles, sauf si un bloc unique dépasse la hauteur totale d'une page.
- **Lignes de tableaux** : Les lignes de données ne sont pas découpées à mi-hauteur sur la pliure de la page.

## Browser-specific printing quirks and fixes

- **Google Chrome et Edge** : Assurent le rendu vectoriel le plus stable. Activez « Graphiques d'arrière-plan » et désactivez « En-têtes et pieds de page ».
- **Mozilla Firefox** : Peut appliquer des marges par défaut un peu plus étroites. Choisissez les marges « Par défaut » en cas de texte rogné.
- **Apple Safari** : Cliquez sur « Afficher les détails » pour faire apparaître la case « Imprimer les arrière-plans ».

Réglez vos options d'impression et produisez des PDF soignés grâce à [md2pdf](/#converter).
