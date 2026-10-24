---
title: "Markdown en PDF dans le navigateur : ce qui reste sur votre appareil"
description: "Comprendre la conversion locale, les requêtes réseau effectuées par md2pdf et les points de contrôle avant d'exporter des documents confidentiels."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Privacy", "Browser", "PDF", "Security"]
locale: "fr"
translationKey: "browser-only-markdown-to-pdf"
---

« Exécuté dans votre navigateur » est un avantage appréciable, mais ne constitue pas une garantie absolue de confidentialité. Un navigateur peut lire un fichier local sans l'envoyer sur le web, tout en sollicitant des images distantes lors de la génération de l'aperçu.

md2pdf est un site entièrement statique sans serveur applicatif. L'analyse syntaxique du Markdown, la désinfection HTML, la création du sommaire, l'aperçu et la mise en page PDF s'exécutent intégralement sur le terminal du visiteur. L'envoi vers un service de conversion tiers est éliminé, mais les appels réseau ne disparaissent pas tous.

Pour la démarche complète, consultez [Comment convertir un README GitHub en PDF](/blog/github-readme-to-pdf/). Pour la création de livres de documentation, reportez-vous à [Créer un livre Markdown multi-fichiers](/blog/multi-file-markdown-book/).

## Ce que signifie exactement « dans le navigateur »

Dans md2pdf, le traitement dans le navigateur signifie qu'aucun moteur de rendu n'opère côté serveur. Le site est constitué de HTML, CSS et JavaScript statiques. Lorsque vous collez du texte, il demeure dans la mémoire vive de l'onglet. Lorsque vous importez un fichier local, l'API File le traite sur votre machine sans jamais le publier.

Cela n'implique pas une absence totale de réseau. Le premier affichage télécharge les fichiers du site, et l'importation GitHub interroge l'API publique de GitHub.

Notre engagement est clair : **votre Markdown n'est jamais téléversé vers LadeStack, et nous n'imposons aucun compte utilisateur ni stockage distant de vos documents.**

## Le pipeline de traitement étape par étape

Chaque document progresse selon les étapes suivantes :

```text
source  ->  parse  ->  resolve  ->  render  ->  sanitize  ->  preview  ->  print
```

1. **Source.** Lecture du texte collé, du fichier local ou du README public sur GitHub.
2. **Analyse.** markdown-it décode la syntaxe GFM (tableaux, listes de tâches, code).
3. **Résolution.** Les images relatives d'un dépôt GitHub sont pointées vers raw.githubusercontent.com.
4. **Rendu.** Les jetons sont traduits en structures HTML.
5. **Désinfection.** DOMPurify élimine toute balise à risque (`script`, `iframe`, etc.).
6. **Aperçu.** Le code HTML assaini est inséré dans la page avec ses ancres de titres et son sommaire.
7. **Exportation.** Appel de la boîte d'impression native ou assemblage en ZIP via pdf-lib.

Toutes les étapes consécutives à la lecture initiale se déroulent sur votre appareil.

## Quelles données quittent le navigateur

Pour un fichier local ou du texte collé, md2pdf ne transmet aucun contenu textuel sur internet : il n'existe aucun serveur d'écoute prévu à cet effet.

Les flux réseau normaux comprennent :

- **Fichiers du site.** Feuilles de style, polices et scripts nécessaires à l'interface.
- **Importation GitHub.** Requêtes anonymes vers l'API GitHub pour récupérer le README et les images associées.
- **Médias distants du Markdown.** Si votre document intègre des images hébergées ailleurs, le navigateur doit les télécharger pour les afficher.

Par exemple, si votre document cite `![dashboard](https://internal.example.test/chart.png)`, le texte demeure local mais l'image sera réclamée au serveur distant.

Les liens textuels ne provoquent aucun trafic avant le clic, tandis que les images sont chargées d'emblée à l'écran.

## Fichiers locaux et texte collé

Les modes locaux garantissent une confidentialité maximale :

- **Coller du texte.** Rien ne quitte l'onglet tant qu'aucune ressource distante n'est appelée.
- **Fichier local.** Lu en mémoire locale dans la limite de 2 Mo sans transfert distant.
- **Exemple intégré.** Issu des données statiques du site sans requête supplémentaire.

Les chemins relatifs d'images locales ne peuvent être résolus sans base de dépôt. Utilisez des adresses absolues ou acceptez l'icône d'image non trouvée.

Pour un export totalement confidentiel, ôtez les images distantes avant d'imprimer.

## Les images et liens distants demeurent des requêtes réseau

L'exécution locale protège le **texte de votre document**, mais ne bloque pas automatiquement **les ressources externes que vous y mentionnez**.

Exemple parlant :

```markdown
![Architecture](./docs/architecture.png)

See the [operations guide](https://example.test/ops).
```

Sur un dépôt GitHub, le lien d'image pointe vers le serveur de contenu brut de GitHub. Pour du texte collé, une URL absolue est demandée au domaine hôte.

Avant de convertir des données sensibles, vérifiez dans le document source :

- Les URLs d'images débutant par `http://` et `https://`
- Les balises `<img>` brutes
- Les polices ou feuilles de style externes
- Les images intégrées en Data URI (sans trafic réseau additionnel)

DOMPurify écarte tout code malveillant tout en autorisant les images standard nécessaires au document.

## Limites GitHub et gestion des incidents

L'importation GitHub constitue une lecture publique anonyme encadrée par des limites sécurisées :

- Délai d'attente de **15 secondes** sur l'API.
- Délai de **20 secondes** pour la récupération des chapitres.
- Budget de **25 secondes** pour l'exploration de l'arborescence.
- Bascule automatique vers le téléchargement direct en cas de quota API atteint.
- Remplacement des images indisponibles par des marqueurs pour éviter tout blocage.

## Liste de contrôle pratique de confidentialité

Avant de convertir des documents sensibles en PDF, assurez-vous que :

- Aucune URL d'image ne pointe vers un serveur d'entreprise interne non protégé.
- Le dépôt GitHub ciblé est bien public et accessible.
- Le corps du texte ne recèle aucun jeton secret ni mot de passe.
- La mise en page a été minutieusement validée dans l'aperçu d'impression.
- La conversion s'est accomplie sans passer par un serveur tiers en ligne.

Pour explorer nos thèmes graphiques, consultez [Guide des thèmes d'impression](/blog/readme-pdf-print-themes/).
