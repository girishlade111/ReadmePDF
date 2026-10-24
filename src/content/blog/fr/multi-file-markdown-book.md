---
title: "Créer un livre Markdown multi-fichiers et l'exporter en PDF"
description: "Rassemblez la documentation d'un dépôt en un livre structuré avec couverture, sommaire, impression globale et téléchargement ZIP par chapitre."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Documentation", "Book", "PDF", "Workflow"]
locale: "fr"
translationKey: "multi-file-markdown-book"
---

Un fichier README unique est une excellente vitrine, mais un support inadapté pour un manuel complet. Dès que la documentation aborde l'installation, la configuration et le dépannage, un README interminable devient fastidieux à consulter et pénible à imprimer.

md2pdf intègre un atelier de création de livres conçu pour cette échelle de contenu. Renseignez un dépôt public, sélectionnez les fichiers Markdown, organisez l'ordre des chapitres, générez couverture et sommaire, puis imprimez l'ouvrage complet ou téléchargez une archive ZIP de PDFs individuels.

Ce guide expose la préparation d'un dépôt et les réglages du livre. Pour un document unique, consultez [Comment convertir un README GitHub en PDF](/blog/github-readme-to-pdf/).

## Quand préférer un livre à un simple README

Optez pour le livre lorsque la documentation s'articule naturellement en chapitres distincts :

- **Documentation produit** segmentée en guides de démarrage, concepts et références d'API.
- **Supports de formation** composés de modules ou cours hebdomadaires.
- **Dossiers d'exploitation (runbooks)** dédiés à chaque service ou procédure d'incident.
- **Dossiers de version** regroupant notes de version, guides de migration et historique.

Le format livre est superflu pour les notes très courtes ou les fichiers éphémères.

Le flux repose sur des dépôts **publics**. Les dépôts privés ne sont pas accessibles sans jeton d'authentification.

## Ce qu'accomplit le scanner de dépôt

À partir de l'URL du dépôt, l'explorateur analyse l'arborescence Git via l'API GitHub et construit un arbre de sélection doté de cases à cocher hiérarchiques.

Le scanner applique des plafonds stricts pour préserver les performances :

- Jusqu'à **30 fichiers** par livre.
- Limite de **750 Ko par fichier**.
- Plafond global de **6 Mo** de Markdown.
- Délai d'attente de **20 secondes** pour la récupération des fichiers.
- Budget alloué de **60 requêtes** à l'API GitHub.

```text
docs/
├── 00-introduction.md
├── 01-installation.md
├── 02-configuration.md
├── 03-operations.md
└── 04-troubleshooting.md
```

Exemple d'arborescence efficace :

Les préfixes numériques clarifient immédiatement l'ordonnancement de lecture.

## Sélectionner et ordonner les chapitres

Cochez les fichiers dans l'arbre puis ajustez la séquence. Les nouveaux fichiers s'ajoutent à la fin. Utilisez les commandes monter, descendre et supprimer.

Recommandations d'agencement :

1. **Limitez-vous à l'essentiel.** Un livre de 10 à 15 chapitres reste aisé à relire.
2. **Placez l'introduction en tête.** Les prérequis doivent précéder les démarches d'installation.
3. **Conservez la référence à la fin.** Annexes et tables d'API se placent en queue d'ouvrage.
4. **Ne dupliquez pas le README.** Clarifiez si le README sert d'introduction ou de synthèse générale.
5. **Supprimez les fichiers superflus.** Écartez les journaux bruts qui alourdissent le document.

L'ordre affiché dans l'éditeur régit fidèlement la pagination du PDF et la structure du ZIP.

## Préparer les documents sources

Le moteur traite chaque fichier comme un chapitre autonome et insère un titre déduit du fichier ou de son chemin.

Exemple d'ouverture de chapitre :

```markdown
# Installation

This chapter assumes a supported Node.js version and a local clone.
```

Si chaque fichier s'ouvre par un H1, le livre bénéficie d'une découpe harmonieuse.

Vérifications recommandées :

- **Liens internes.** Les liens relatifs entre chapitres doivent désigner des fichiers inclus dans le livre.
- **Médias.** Les images relatives sont pointées vers GitHub au moment de l'extraction.
- **Tableaux larges.** Consultez [Tableaux Markdown en PDF](/blog/markdown-tables-to-pdf/) pour éviter les débordements.
- **Titres équivoques.** Donnez des intitulés distincts pour préserver la clarté de la table des matières.

## Composer la couverture et la table des matières

L'outil vous permet de définir titre, sous-titre et mentions d'édition. Ces éléments renseignent immédiatement la portée du manuel et sa version.

La table des matières compile automatiquement les chapitres et sous-titres retenus. Toute retouche ultérieure des textes signale le document comme à reconstruire.

## Imprimer ou exporter l'ouvrage

Deux modes de sortie s'offrent à vous :

- **Impression globale.** Envoie l'intégralité du recueil (couverture, sommaire et chapitres) vers l'impression système.
- **Archive ZIP.** Génère un fichier ZIP contenant un PDF dédié pour chaque chapitre sélectionné.

Le fichier ZIP est nommé `md2pdf-{owner}-{repo}-{sha8}.zip` avec des noms de fichiers normalisés en Unicode.

## Limites, pannes et reprise

En cas de quota d'API GitHub dépassé, ciblez directement des sous-dossiers spécifiques. Les images inaccessibles sont remplacées par des balises neutres sans interrompre la génération.

Pour explorer nos présentations graphiques, reportez-vous au [Guide des thèmes d'impression](/blog/readme-pdf-print-themes/).
