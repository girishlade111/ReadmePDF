---
title: "Inspecter son Markdown en temps réel avec l'aperçu dynamique PDF"
description: "Comment l'aperçu direct de md2pdf affiche le Markdown GitHub, assainit le HTML, isole les styles d'impression et valide la mise en page instantanément."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Preview","HTML","Security"]
locale: "fr"
translationKey: "live-markdown-preview-pdf"
---

Exporter un document PDF sans retour visuel immédiat est source d'erreurs permanentes. Vous modifiez la largeur d'une colonne, déclenchez l'export, ouvrez le lecteur externe et constatez avec agacement qu'un titre de section se retrouve isolé au bas de la page 3. Répéter cette vérification à chaque paragraphe fait perdre un temps précieux.

md2pdf élimine cette contrainte grâce à un volet d'aperçu dynamique synchronisé. Pendant que vous saisissez, collez ou importez vos notes, la fenêtre de droite génère le rendu final en y appliquant fidèlement les feuilles de style d'impression. Les polices, interlignes et marges visibles à l'écran correspondent exactement au PDF produit.

Ce guide détaille le fonctionnement du moteur d'aperçu, la sécurisation par DOMPurify et la vérification visuelle avant tirage. Pour optimiser la saisie directe, consultez [Coller et éditer du Markdown pour le PDF](/fr/blog/markdown-editor-paste-pdf/).

## Why live preview matters for print-bound documents

Les navigateurs web et les moteurs d'impression PDF traitent les règles CSS selon des contraintes différentes. Un affichage web défile sans fin, alors qu'un document imprimé est soumis à des limites physiques strictes :

- **Ruptures de pages** : Les tableaux, images et blocs de code doivent respecter la hauteur utile de chaque feuille.
- **Lisibilité typographique** : Les proportions des titres et du corps de texte doivent rester nettes à 300 DPI.
- **Marges infranchissables** : Les éléments qui dépassent des marges ne créent pas d'ascenseur de défilement ; ils sont coupés au massicot.

Profiter d'un aperçu temps réel appliquant les styles d'impression permet de rectifier les incohérences avant d'afficher le dialogue d'impression.

## How the client-side preview pipeline renders Markdown

Le pipeline d'affichage de md2pdf transforme la source Markdown en arborescence DOM en quelques millisecondes :

```javascript
const rawHtml = markdownParser.render(markdownSource);
const cleanHtml = DOMPurify.sanitize(rawHtml, sanitizeConfig);
previewElement.innerHTML = cleanHtml;
applyHeadingAnchors(previewElement);
```

Le moteur respecte scrupuleusement les normes CommonMark et GitHub-Flavored Markdown, prenant en charge le texte barré, la détection d'URL, les listes de tâches et la coloration syntaxique.

## HTML sanitization and safety filters

Lors de l'utilisation de textes issus de dépôts tiers ou de copier-coller externes, la sécurité est une priorité absolue. Markdown autorisant le balisage HTML direct, des attaquants pourraient tenter d'injecter des failles XSS.

md2pdf applique le filtre DOMPurify à chaque chaîne générée selon un protocole strict :

- **Suppression des balises critiques** : Les balises `<script>`, `<iframe>`, `<object>` et `<form>` sont éliminées.
- **Purge des attributs** : Les gestionnaires d'événements `onclick` ou `onload` sont systématiquement nettoyés.
- **Filtrage des protocoles** : Les liens formulés en `javascript:` ou `data:text/html` sont neutralisés.
- **Balises autorisées** : Seuls les éléments sûrs utiles à la mise en page (`<b>`, `<code>`, `<table>`, `<img>`) sont conservés.

Cette désinfection s'exécute intégralement dans votre navigateur avant d'injecter le moindre nœud dans l'aperçu.

## Previewing print themes and theme transitions

md2pdf met à votre disposition quatre thèmes d'impression : Clean, Business, Academic et Dark. Sélectionner un thème dans la barre d'outils met immédiatement à jour les styles du volet d'aperçu :

- **Clean** : Typographie contemporaine et aérée reposant sur les polices sans empattement du système.
- **Business** : Présentation technique formelle dotée de séparateurs nets et d'encadrements discrets.
- **Academic** : Mise en page classique avec empattements, sections numérotées et interligne optimisé.
- **Dark** : Palette sombre confortable pour l'écran qui bascule automatiquement sur fond blanc économe en encre lors de l'impression.

Pour comparer en détail la typographie de ces thèmes, consultez le [Guide des thèmes d'impression md2pdf](/fr/blog/readme-pdf-print-themes/).

## Differences between screen preview and print output

Bien que l'aperçu simule la sortie finale avec une grande fidélité, quelques écarts physiques subsistent :

- **Largeur d'affichage** : L'aperçu s'adapte à la largeur de votre navigateur, tandis que le PDF est figé aux formats A4 ou Letter.
- **Coupures de pages** : L'écran propose une lecture continue, alors que l'imprimante découpe les feuilles selon la consigne CSS `break-inside: avoid`.
- **Rendu colorimétrique** : Les couleurs RVB du moniteur peuvent paraître légèrement plus denses une fois couchées sur papier par le toner.

## Diagnosing preview rendering glitches

- **L'aperçu ne s'actualise plus** : Vérifiez l'absence de balises HTML orphelines ou d'images Base64 démesurées.
- **Tableaux qui débordent** : Si un tableau très large dépasse, reportez-vous au [guide des tableaux Markdown vers PDF](/fr/blog/markdown-tables-to-pdf/) pour adapter les colonnes.
- **Images manquantes** : Assurez-vous d'utiliser des adresses HTTPS absolues ou servez-vous de l'[importateur de README GitHub](/fr/blog/github-readme-to-pdf/).

Validez votre mise en page en direct et exportez des documents irréprochables avec [md2pdf](/#converter).
