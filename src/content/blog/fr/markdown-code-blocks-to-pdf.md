---
title: "Blocs de code Markdown en PDF : balises, largeur et sauts de page"
description: "Comment rédiger du code délimité lisible en PDF : balises de langage, largeur de ligne, retours manuels, choix du thème et vérifications avant impression."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Code", "PDF", "Layout"]
locale: "fr"
translationKey: "markdown-code-blocks-to-pdf"
---

Le code est souvent l'élément d'un document Markdown qui paraît parfait à l'écran mais se dégrade sur papier. Une ligne adaptée à un grand moniteur dépasse la marge d'une page A4. Un bloc de code peut se scinder maladroitement en bas de page avec deux lignes orphelines.

md2pdf effectue le rendu du code délimité sous forme de texte préformaté dans la mise en page d'impression. Il n'ajoute pas de coloration syntaxique et ne reformate pas arbitrairement le code source, car modifier du code peut en altérer le sens. L'approche recommandée consiste à préparer le document source afin qu'il reste lisible sans transformation.

Ce guide détaille les blocs délimités, les balises de langage, la gestion de la largeur, les thèmes et les contrôles préalables à l'exportation. Pour la procédure complète, consultez [Comment convertir un README GitHub en PDF](/blog/github-readme-to-pdf/).

## Ce que le convertisseur applique aux blocs de code

GitHub Flavored Markdown prend en charge les blocs de code délimités par au moins trois accents graves (backticks) ou tildes. md2pdf analyse ces blocs, préserve fidèlement le texte et l'intègre dans un élément `<pre><code>`. La balise de langage est conservée comme classe CSS, mais le moteur de rendu n'applique pas de thème de coloration syntaxique.

Cela implique deux réalités :

- L'indentation, les lignes vides et la ponctuation restent rigoureusement intactes.
- Le résultat visuel est un texte à chasse fixe doté de l'arrière-plan et de la bordure du thème, sans coloration des mots-clés.

Si votre document s'appuie sur la couleur pour expliquer un diff, ajoutez une brève légende ou des préfixes `+` et `-`. Ne partez pas du principe que le lecteur distinguera les couleurs sur un tirage papier.

## Privilégiez les blocs délimités à l'indentation

Une indentation de quatre espaces produit également un bloc de code en Markdown, mais les blocs délimités offrent bien plus de contrôle. Ils délimitent clairement le début et la fin, acceptent une balise de langage et ne se brisent pas si une ligne interne est indentée.

Exemple de bloc délimité simple :

```bash
npm install
npm run build
npm test
```

Utilisez un délimiteur plus long que toute séquence d'accents graves présente dans le texte. Si le code contient trois accents graves consécutifs, ouvrez et fermez avec quatre symboles.

Évitez d'entremêler tabulations et espaces. Le moteur de rendu affiche fidèlement vos caractères, et une indentation irrégulière ressemble vite à une anomalie.

## Indiquez le langage même sans coloration

Une balise de langage demeure très utile en l'absence de coloration syntaxique. Elle renseigne le langage ciblé, aide les éditeurs et linters, et indique clairement aux traducteurs que le bloc ne doit pas être altéré.

Les identifiants courants incluent `bash`, `js`, `ts`, `json`, `yaml`, `python`, `html`, `css`, `sql` et `text`. Utilisez `text` pour les sorties de terminal, journaux et structures de répertoires.

Ne renseignez pas une balise simplement parce qu'un analyseur la reconnaît. Désignez ce que le contenu représente réellement.

## Conservez les lignes dans la largeur imprimable

Le problème le plus fréquent à l'impression provient d'une ligne de code plus large que la page. Dans le navigateur, un défilement horizontal apparaît, mais sur papier, la ligne est tronquée ou le bloc rétrécit.

Pour un format A4 ou Letter, visez environ 80 à 90 caractères par ligne. Cela correspond aux normes traditionnelles des terminaux pour une lecture confortable.

Si une ligne est trop longue, réagencez le code source plutôt que de réduire l'échelle d'impression :

```js
const message = buildMessage({ owner, repo, branch, path });
```

Cette ligne reste lisible. Si l'objet comportait davantage de propriétés, scindez-les sur plusieurs lignes :

```js
const message = buildMessage({
  owner,
  repo,
  branch,
  path,
});
```

Pour les commandes de terminal, utilisez des antislashs de continuation ou des variables. Pour les URLs volumineuses, isolez-les sur leur propre ligne.

## Gérez judicieusement les sorties et journaux

Les journaux d'exécution et retours de commandes sont souvent plus larges que le code source et comportent des dates ou chemins incompressibles.

Solutions adaptées à l'impression :

- **Élaguez la sortie.** Conservez les lignes significatives et ajoutez des points de suspension dans le texte explicatif.
- **Scindez la transcription.** Séparez la commande de son résultat en deux blocs distincts.
- **Adoptez un tableau pour les données structurées.** Les colonnes s'impriment souvent mieux qu'un pavé de texte brut.
- **Ne réduisez la taille de police qu'en dernier ressort.** Un changement de thème modifie l'ensemble du document.

N'insérez pas un journal de 200 lignes dans un PDF à moins que ce journal ne constitue l'objet principal du document.

## Harmonisez le code avec le thème choisi

Les quatre thèmes d'impression traitent le code différemment. Clean adopte un fond clair et une typographie neutre. Business emploie un encadré plus contrasté. Academic conserve une mise en forme discrète. Dark est pensé pour l'écran et adapte ses encres à l'impression.

Deux règles pratiques :

1. **Vérifiez le contraste dans le thème sélectionné.** Un bloc parfait dans Clean peut sembler lourd dans Business ou trop pâle dans Academic.
2. **Activez les graphiques d'arrière-plan à l'impression.** Sans cette option, l'arrière-plan disparaît et le bloc ne repose que sur sa bordure.

Si votre document est constitué principalement de code, le thème Clean est le plus équilibré. Pour un comparatif exhaustif, consultez [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/).

## Contrôlez le rendu final sur le PDF

Ouvrez le PDF généré et examinez attentivement chaque bloc de code :

- **Lignes coupées.** Inspectez le bord droit pour vérifier qu'aucun caractère ne manque.
- **Blocs orphelins.** Évitez qu'un bloc ne débute par une seule ligne en bas de page.
- **Indentation brisée.** Assurez-vous de l'homogénéité des espacements.
- **Lignes vides respectées.** Vérifiez que les séparations logiques sont préservées.
- **Contraste suffisant.** Testez une impression en niveaux de gris.
- **Légende explicite.** Si le langage est important pour le lecteur, précisez-le dans le texte.

Un contrôle dans un second navigateur permet de valider les légères variations des moteurs d'impression.

Le code est souvent l'élément le plus recopié d'une documentation. Gardez-le concis et parfaitement cadré dans la page. Pour comprendre ce qui reste local lors de l'export, consultez [Markdown en PDF dans le navigateur](/blog/browser-only-markdown-to-pdf/).
