---
title: "Résolution des images relatives et des liens Markdown pour l’export PDF"
description: "Découvrez comment md2pdf résout les chemins relatifs d’images et les liens entre documents pour intégrer des visuels nets et des renvois PDF interactifs."
pubDate: 2026-03-24
tags: ["markdown","images","links","pdf"]
locale: "fr"
translationKey: "markdown-relative-images-links-pdf"
---

Dans les dépôts de code, les fichiers Markdown exploitent massivement les chemins relatifs. Les schémas d'architecture se trouvent dans `./assets/diagram.png`, les captures d'écran dans `../images/screen.jpg` et les liens pointent vers `./getting-started.md`. Sans prise en compte de l'arborescence, les images ne s'affichent pas et les liens deviennent inopérants. Avec [md2pdf](/#converter), les chemins relatifs sont résolus et intégrés avec une parfaite fidélité.

Cet article explique comment md2pdf analyse les chemins relatifs, télécharge les illustrations dans le navigateur et convertit les liens entre fichiers en ancres internes au PDF.

## Le problème des chemins relatifs en Markdown statique

Les fichiers Markdown sont conçus pour fonctionner au sein d'une arborescence locale ou sur l'interface GitHub :

- **Images manquantes** : Un appel comme `![Architecture](images/arch.png)` échoue s'il est extrait hors de son dossier d'origine.
- **Liens rompus** : Les renvois vers des guides voisins (`[Installation](setup.md)`) deviennent inactifs lors d'une simple conversion en PDF.
- **Remontée de répertoires** : Les chemins contenant `../` exigent un calcul de chemin relatif rigoureux par rapport à la racine.

```text
Relative Path Resolution Matrix:
Base Document:  docs/guides/installation.md
Image Path:     ../assets/diagram.png
Resolved Asset: docs/assets/diagram.png (Fetched & Inlined)

Link Path:      ./configuration.md
Resolved Link:  Internal PDF Anchor -> Chapter: Configuration
```

## Récupération des images depuis GitHub

Lors de l'importation de documents depuis GitHub, md2pdf mémorise le niveau de sous-dossier de chaque fichier :

1. **Normalisation des chemins** : Les expressions relatives telles que `../../images/flow.png` sont recalculées en fonction de l'emplacement du fichier en cours.
2. **Téléchargement direct** : md2pdf interroge le réseau de distribution de GitHub pour récupérer les fichiers d'images bruts.
3. **Conversion en mémoire** : L'image est convertie sous forme de tampon binaire puis intégrée dans le flux PDF par le moteur `pdf-lib`.
4. **Formats supportés** : Les formats courants (PNG, JPEG, WebP, SVG) sont traités avec un respect scrupuleux des proportions originales.

## Conversion des liens en signets internes interactifs

Les manuels techniques s'appuient sur un réseau dense de renvois entre chapitres :

- **Repérage des liens locaux** : md2pdf cible les liens pointant vers des fichiers `.md` et les confronte à la liste des documents sélectionnés.
- **Création d'ancres internes** : Si le fichier ciblé fait partie de la compilation en cours, md2pdf remplace le lien par un renvoi interne au PDF.
- **Redirection web sécurisée** : Si le document lié n'a pas été retenu dans la sélection, le lien bascule vers la page web du fichier sur GitHub.

## Prise en charge des fichiers locaux et de leurs images

Pour vos fichiers Markdown stockés sur votre poste de travail, md2pdf gère le téléversement simultané des textes et de leurs illustrations :

Dans l'explorateur de fichiers, sélectionnez conjointement votre document Markdown et son dossier d'images. md2pdf effectue la correspondance des noms directement en mémoire, vous permettant d'obtenir un PDF illustré sans héberger vos images en ligne.

## Des documents PDF complets, illustrés et navigables

La bonne résolution des images et des liens préserve l'intégrité de vos publications. En compilant vos guides avec md2pdf, vos diagrammes conservent une netteté remarquable et les renvois entre sections facilitent une lecture interactive et agréable.
