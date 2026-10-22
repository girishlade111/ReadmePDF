---
title: "Comment convertir un README GitHub en PDF (gratuit, sans compte)"
description: "Un guide pas à pas pour transformer un README GitHub public en PDF propre et prêt à imprimer avec ReadmePDF — sans compte, sans envoi et sans rendu côté serveur."
pubDate: 2026-09-18
updatedDate: 2026-10-21
author: "Girish Lade"
tags: ["GitHub", "README", "PDF", "Tutorial"]
featured: true
locale: "fr"
translationKey: "github-readme-to-pdf"
---

Un README est écrit pour un navigateur : il défile, renvoie vers d’autres pages et suppose que le lecteur peut cliquer dans le dépôt. Dès qu’il s’agit d’envoyer une documentation à un client, de la joindre à un devoir, d’archiver une version ou de la confier à quelqu’un qui ne clonera pas le dépôt, le PDF est le format qui voyage.

Imprimer directement une page GitHub produit généralement un désordre. La navigation du site, les barres latérales et le pied de page suivent. Les blocs de code larges sont coupés. Les images relatives ne s’affichent plus, car le navigateur ne lit plus depuis la racine du dépôt. Les tableaux longs se scindent mal entre les pages. ReadmePDF existe pour résoudre précisément ces problèmes, sans vous demander de créer un compte ni d’envoyer votre fichier source à un serveur.

Ce guide déroule l’ensemble du processus, depuis le collage d’une URL de dépôt jusqu’à la vérification du PDF exporté, et explique ce que fait l’outil à chaque étape.

## Pourquoi le bouton Imprimer du navigateur ne suffit pas

L’interface web de GitHub est une application web, pas une feuille de style d’impression. Quand vous appuyez sur `Ctrl+P` sur la page d’un dépôt, le navigateur tente d’imprimer toute la page : l’en-tête, l’arborescence des fichiers, la barre latérale « À propos », les widgets de retour et tout ce qui se trouve dans la mise en page. Une partie peut être masquée avec une feuille de style d’impression personnalisée, mais vous ne pouvez pas modifier le balisage de GitHub depuis l’extérieur.

Trois autres problèmes reviennent régulièrement :

- **Chemins d’images relatifs.** Un README qui contient `![diagram](docs/architecture.png)` fonctionne sur GitHub parce que l’image est résolue par rapport au dépôt. Une page de navigateur imprimée n’a pas de contexte de dépôt fiable : l’image peut donc disparaître.
- **Code et tableaux larges.** Les blocs de code et les tableaux comparatifs sont plus larges qu’une page imprimée. Sans règles spécifiques à l’impression, ils sont soit réduits à une taille illisible, soit tronqués.
- **Pagination.** Les titres, les blocs de code et les lignes de tableau doivent éviter les coupures malheureuses. Une impression brute du navigateur y parvient rarement.

ReadmePDF récupère le Markdown brut du README, résout les URL relatives au dépôt, effectue le rendu du Markdown compatible GitHub, assainit le résultat et applique une feuille de style d’impression avant l’ouverture de la boîte de dialogue d’impression. La sortie est toujours produite par le moteur « Enregistrer au format PDF » natif de votre navigateur, mais le document qu’il reçoit est déjà nettoyé.

## Ce que ReadmePDF change

Le pipeline de conversion s’exécute entièrement dans le navigateur. Concrètement :

1. Vous fournissez l’URL d’un dépôt GitHub public, un fichier Markdown local ou du Markdown collé.
2. Pour un dépôt, l’application découvre la branche par défaut et essaie une série de noms de fichiers README courants, y compris les fichiers situés dans `.github/`.
3. Les chemins d’images relatifs sont réécrits vers `raw.githubusercontent.com`, et les liens de documents vers la vue blob de GitHub.
4. Le Markdown est rendu avec la prise en charge de GFM : tableaux, listes de tâches, texte barré, blocs de code délimités et liens automatiques.
5. Le HTML est assaini par DOMPurify avant d’atteindre l’aperçu.
6. Une table des matières est générée lorsque le document comporte au moins trois titres.
7. La feuille de style d’impression du thème choisi est appliquée, et le navigateur ouvre sa boîte de dialogue d’impression.

Aucun fichier n’est envoyé. Les seules requêtes sortantes sont des lectures anonymes du dépôt public demandé, plus l’appel à l’API GitHub utilisé pour découvrir la branche par défaut. Les dépôts privés ne sont pas pris en charge dans cette version.

## Avant de commencer

Il vous faut :

- Un dépôt GitHub **public**, ou un fichier Markdown local, ou un bloc de Markdown à coller.
- Un navigateur moderne. Chrome, Edge, Firefox et Safari prennent tous en charge « Enregistrer au format PDF » dans leur boîte de dialogue d’impression.
- Environ deux minutes pour un document court, davantage si vous comptez relire le PDF page par page.

Si le dépôt est privé, la récupération échouera. Le repli manuel fonctionne toujours : copiez le texte du README, collez-le dans l’éditeur et utilisez des URL d’images absolues.

## Étape 1 : fournir un dépôt à l’outil

Ouvrez le convertisseur et collez l’URL du dépôt dans le champ **URL du dépôt GitHub**. ReadmePDF accepte plus que l’URL canonique :

```text
https://github.com/owner/repo
https://github.com/owner/repo.git
github.com/owner/repo
owner/repo
https://github.com/owner/repo/tree/main/docs
https://github.com/owner/repo/blob/main/README.md
```

Toutes ces formes renvoient à la même paire `owner/repo`. Les URL sans protocole et la forme abrégée `owner/repo` sont pratiques lorsque vous copiez depuis un terminal ou un message. Les segments de chemin supplémentaires sont acceptés par commodité, mais ignorés : l’application lit toujours le README à la racine du dépôt sur la branche par défaut, et non le fichier imbriqué affiché dans l’URL. Si c’est ce fichier imbriqué qu’il vous faut, collez directement son Markdown.

Appuyez sur **Récupérer** ou sur `Enter`. Si le champ est vide, l’application vous indique ce qu’elle attend au lieu de ne rien faire.

## Étape 2 : laisser récupérer et résoudre le README

L’application demande d’abord à l’API GitHub la branche par défaut du dépôt. Elle essaie ensuite une liste de noms de fichiers README sur cette branche, y compris des variantes de casse courantes et l’emplacement `.github/README.md`. Si l’API est limitée en débit, la récupération brute peut se poursuivre, ce qui explique qu’une défaillance temporaire de l’API ne mette pas toujours fin au processus.

Une fois le Markdown reçu, l’aperçu se met à jour. C’est le moment de vérifier trois points :

- **Images.** Les images relatives au dépôt doivent apparaître. Si l’une manque, elle renvoie peut-être vers une ressource privée, un chemin inexistant ou une URL absolue qui bloque le hotlinking.
- **Blocs de code.** Les blocs délimités avec un langage sont rendus comme du code. Les lignes très larges défilent dans l’aperçu, mais méritent tout de même une vérification à l’impression.
- **Liens.** Les liens de documents sont réécrits vers la vue blob de GitHub afin de rester significatifs dans le PDF. Les liens externes s’ouvrent dans un nouvel onglet dans l’aperçu.

Si une image échoue, ReadmePDF la marque comme cassée et poursuit. L’export n’échoue pas parce qu’un badge est indisponible. C’est volontaire : un badge manquant est généralement moins important que le reste du document.

## Étape 3 : choisir un thème adapté au document

Il existe quatre thèmes d’impression :

- **Clean** est le thème par défaut. Il utilise une typographie sans empattement neutre et constitue le choix le plus sûr pour les spécifications, les README techniques et les documents riches en code.
- **Business** associe une typographie à empattements et un bloc de code sombre. Il convient aux rapports, aux propositions et aux transmissions destinées aux clients.
- **Academic** propose des pages à empattements justifiées avec un traitement discret du code. Il est conçu pour les textes longs, les supports de cours et les soumissions de type universitaire.
- **Dark** est un thème pensé pour l’écran. L’aperçu est sombre pour une lecture confortable, et la feuille de style d’impression impose une encre claire et des fonds de code clairs pour que le PDF reste lisible.

Pour une comparaison plus détaillée, voir [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/). Pour la plupart des premiers exports, commencez par Clean et ne changez que si le document répond à une attente claire du public.

## Étape 4 : décider si la table des matières est utile

La table des matières automatique est activée par défaut et générée lorsque le document comporte au moins trois titres. Elle utilise des ancres de titre stables et uniques, de sorte que les entrées renvoient aux bonnes sections dans l’aperçu.

Conservez-la lorsque :

- Le document dépasse quelques pages.
- Le lecteur doit accéder directement à une section précise.
- Vous remettez le PDF à quelqu’un qui n’en imprimera peut-être qu’une partie.

Désactivez-la lorsque :

- Le README est court et le bloc de sommaire ajoute plus de bruit que de navigation.
- Le document possède déjà une table des matières rédigée à la main.
- Vous produisez une fiche d’une seule page.

Le réglage s’applique à l’aperçu et à la sortie imprimée. Il n’existe pas d’option réservée au PDF.

## Étape 5 : imprimer en PDF avec les bons réglages

Cliquez sur **Télécharger / Imprimer le PDF** dans le panneau Aperçu en direct. L’application ouvre la boîte de dialogue d’impression du navigateur. Dans cette fenêtre :

1. Définissez **Destination** sur **Enregistrer au format PDF** (ou l’équivalent dans votre navigateur).
2. Choisissez **A4** ou **Letter** selon la région du destinataire.
3. Laissez **Marges** sur la valeur par défaut, sauf si vous avez une charte maison. La feuille de style d’impression définit déjà les marges de page.
4. Conservez **Échelle** à 100 % pour le premier essai. Si un tableau ou un bloc de code large est tronqué, réduisez légèrement l’échelle plutôt que la taille de police dans la source.
5. Activez **Graphiques d’arrière-plan** si votre navigateur le propose. Les accents du thème, les fonds des blocs de code et les en-têtes de tableau dépendent des couleurs de fond. Sans eux, le PDF reste lisible, mais Business et Dark perdent une partie de leur structure visuelle.
6. Désactivez les **En-têtes et pieds de page** du navigateur, sauf si vous voulez précisément l’URL et les numéros de page. Ils ne font pas partie de la conception du document.
7. Enregistrez le fichier sous un nom descriptif, par exemple `owner-repo-readme-2026-10.pdf`.

Les libellés exacts varient selon le navigateur. Dans Chrome et Edge, les graphiques d’arrière-plan se trouvent sous « Plus de paramètres ». Dans Firefox, cherchez « Imprimer les arrière-plans ». Safari expose moins de contrôles ; vérifiez l’aperçu avant d’enregistrer.

## Étape 6 : vérifier le PDF avant de l’envoyer

Ouvrez le PDF enregistré et recherchez les problèmes que l’impression révèle :

- **Sauts de page.** Un titre ne doit pas rester seul en bas de page. Les blocs de code, les tableaux et les images ne doivent pas être coupés au milieu.
- **Contenu large.** Les longues lignes de code et les tableaux sont les causes d’overflow les plus fréquentes. S’ils sont tronqués, raccourcissez les lignes dans la source ou réduisez l’échelle d’impression.
- **Liens.** Cliquez sur quelques liens dans le PDF. Les liens blob de GitHub doivent ouvrir la bonne vue de fichier.
- **Images.** Vérifiez que les schémas et les badges ont survécu. Une ressource privée manquante ne se réparera pas d’elle-même dans le PDF.
- **Métadonnées.** Le titre et l’auteur du document proviennent du README et des réglages de métadonnées d’impression du navigateur, pas d’un formulaire de métadonnées PDF dédié. Nommez le fichier clairement.
- **Lisibilité.** Imprimez une page à 100 % et vérifiez que le texte courant est confortable. Le texte justifié d’Academic et la typographie à empattements de Business peuvent rendre différemment sur papier qu’à l’écran.

## Quand la récupération échoue

L’application associe les échecs de récupération à des messages exploitables. Les cas courants :

| Ce que vous voyez | Ce que cela signifie généralement | Que faire |
| --- | --- | --- |
| Dépôt introuvable ou privé | L’URL est incorrecte, ou le dépôt exige une authentification | Vérifiez l’URL ; collez le Markdown manuellement si le dépôt est privé |
| Aucun README trouvé | Le dépôt n’a pas de README sur la branche par défaut, `main` ou `master` | Importez le fichier ou collez le Markdown |
| Limite de débit GitHub atteinte | Trop de requêtes API non authentifiées | Attendez environ une minute et réessayez ; la récupération brute peut encore fonctionner |
| Échec ou expiration de la récupération | Problème réseau, ou dépassement du délai de 15 secondes | Réessayez ; le collage manuel reste possible |

Si la récupération échoue, l’éditeur conserve ce que vous avez déjà saisi. Vous pouvez passer au mode collage ou import sans perdre la page.

## Coller ou importer à la place

La récupération GitHub est pratique, mais ce n’est pas la seule entrée possible. Le convertisseur prend aussi en charge :

- **L’import** d’un fichier `.md`, `.markdown` ou `.txt` jusqu’à 2 Mo.
- **Le collage** de Markdown directement dans l’éditeur. L’aperçu est de nouveau rendu après un court délai pendant la frappe.
- **Le chargement de l’exemple** pour voir comment les tableaux, les listes de tâches et les blocs de code sont traités.

Une réserve : les chemins d’images relatifs ne sont résolus que si un dépôt a été récupéré au préalable. Le Markdown importé ou collé n’a pas de dépôt de référence ; utilisez donc des URL d’images absolues dans ce mode. Tout le reste — titres, tableaux, code, listes de tâches — fonctionne de la même manière.

## Cinq corrections à la source qui améliorent chaque export

Le PDF vaut ce que vaut le Markdown de départ. Ces changements portent immédiatement leurs fruits :

1. **Utilisez une vraie hiérarchie de titres.** Commencez les sections avec `##`, utilisez `###` pour les sous-sections et évitez de sauter des niveaux. La table des matières et la feuille de style d’impression dépendent toutes deux de la structure.
2. **Donnez un texte alternatif utile aux images.** C’est bon pour l’accessibilité, et cela offre au PDF un repli lisible lorsqu’une image ne peut pas se charger.
3. **Délimitez le code avec un langage.** Les blocs étiquetés par langage sont rendus de manière plus prévisible que le code indenté, surtout lorsque les lignes sont longues.
4. **Gardez des tableaux étroits.** Un tableau à huit colonnes ne tiendra pas sur du A4 sans réduction. Déplacez les détails dans le texte ou scindez le tableau.
5. **Privilégiez les chemins relatifs pour les ressources du dépôt.** ReadmePDF les réécrit correctement. Les liens absolus vers une machine locale ou un compartiment privé ne survivront pas au voyage.

## Confidentialité : ce qui quitte votre navigateur

ReadmePDF n’envoie pas votre Markdown. Le rendu, l’assainissement, la génération de la table des matières et l’export PDF se font tous localement. Pour la récupération d’un dépôt, les seules requêtes sortantes sont des lectures anonymes sur GitHub du README public et de ses images. Aucun compte, aucun cookie et aucune analytique ne sont associés à la conversion.

Cela compte lorsque le document contient des notes internes, des noms de clients ou des projets non publiés. Vous pouvez coller du Markdown sensible et l’exporter sans envoyer le texte à un service de conversion tiers. Il en va de même pour les fichiers locaux : le fichier est lu par votre navigateur, pas envoyé.

## La version courte

Collez l’URL d’un dépôt public, appuyez sur Récupérer, vérifiez l’aperçu, choisissez un thème, laissez la table des matières active pour les documents longs, puis imprimez en PDF avec les graphiques d’arrière-plan activés. Vérifiez les sauts de page et les blocs de code larges avant d’envoyer le fichier. Si la récupération échoue, collez ou importez le Markdown et poursuivez.

Tout le processus est conçu pour être ennuyeux : pas de compte, pas de file d’attente, pas d’envoi, pas de rendu côté serveur. Juste un README, une feuille de style d’impression et un PDF que vous pouvez remettre à quelqu’un.
