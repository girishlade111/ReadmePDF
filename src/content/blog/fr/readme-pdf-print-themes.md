---
title: "Clean, Business, Academic ou Dark : quel thème md2pdf choisir ?"
description: "Comparaison pratique des quatre thèmes d’impression de md2pdf — typographie, blocs de code, tableaux et documents auxquels chacun convient."
pubDate: 2026-10-14
author: "Girish Lade"
tags: ["Themes", "Design", "PDF"]
locale: "fr"
translationKey: "readme-pdf-print-themes"
---

Le sélecteur de thème de md2pdf ressemble à un petit choix : quatre boutons radio au-dessus du bouton d’export. En pratique, il change la façon dont le document se lit avant même que quiconque atteigne le contenu. Une spécification imprimée en Academic ressemble à un article scientifique. Une proposition client imprimée en Clean ressemble à un export de dépôt. Le bon thème est celui qui correspond aux attentes du lecteur.

Les quatre thèmes rendent le même Markdown. Ils diffèrent par la famille typographique, l’alignement, le traitement du code, le style des tableaux, la couleur des liens et la structure visuelle ajoutée aux titres. Aucun n’ajoute de filigrane, de page de couverture ou de logo. Le contenu reste le vôtre.

## Les thèmes sont des feuilles de style d’impression, pas des changements de couleurs

Chaque thème est un ensemble de règles CSS appliquées à la feuille d’aperçu et reportées dans la sortie imprimée. Le thème influe donc sur :

- La police utilisée pour les titres, le texte courant, les tableaux et le code.
- L’alignement à gauche ou justifié du texte courant.
- La couleur et l’épaisseur des filets sous les titres.
- Les fonds des blocs de code et du code en ligne.
- Les fonds d’en-tête et les couleurs de bordure des tableaux.
- La couleur des liens dans l’aperçu et, lorsque le PDF la conserve, dans le fichier exporté.

La feuille de style d’impression gère aussi les indications de pagination : les blocs de code, les tableaux, les citations et les images évitent autant que possible d’être coupés au milieu, et les titres ne restent pas isolés en bas de page.

Une remarque pratique avant de les comparer : activez **Graphiques d’arrière-plan** dans la boîte de dialogue d’impression de votre navigateur si vous voulez conserver les fonds des blocs de code et les couleurs d’en-tête des tableaux. Sans cela, le PDF reste lisible, mais Business et Dark perdent une partie de leur structure. Le choix se fait dans la boîte de dialogue d’impression, pas dans l’application.

## Clean : le choix par défaut des documents techniques

Clean est l’option neutre. Il utilise la pile sans empattement de l’interface pour tout le document, avec un texte gris foncé sur blanc et un fond de code gris clair. Les titres sont séparés par un filet fin, et les liens reprennent le bleu-vert utilisé ailleurs dans le produit.

**Il convient surtout à :**

- README de dépôts et spécifications techniques.
- Documentation d’ingénierie interne.
- Supports et runbooks riches en code.
- Documents qui seront lus à l’écran aussi souvent que sur papier.
- Instantanés d’audit où la neutralité compte plus que le poli.

**Points de vigilance :**

- Un texte très long peut paraître plat. Clean est efficace, pas chaleureux.
- Le fond de code clair dépend des graphiques d’arrière-plan à l’impression. S’ils sont désactivés, les blocs de code restent lisibles, mais perdent leur séparation visuelle avec le texte courant.
- Un texte courant sans empattement, à petite taille d’impression, peut être moins confortable qu’un texte à empattements sur une longue lecture.

Clean est le choix par défaut le plus sûr parce qu’il n’impose pas de ton. Si vous exportez un README pour un autre ingénieur, commencez ici.

## Business : rapports, propositions et transmissions clients

Business fait passer le document dans un registre plus formel. Il utilise une typographie à empattements de bout en bout, des titres bleu marine avec un filet plus épais, un bloc de code sombre et un en-tête de tableau teinté. Le résultat se lit davantage comme un rapport que comme un README, ce qui est précisément l’objectif lorsque le public est un client, un manager ou une partie prenante transversale.

**Il convient surtout à :**

- Transmissions clients et présentations de projet.
- Propositions, énoncés des travaux et rapports.
- Supports d’atelier qui doivent avoir l’air conçus.
- Pièces jointes de portfolio et exemples de candidature.
- Documents où les schémas et les tableaux pèsent autant que le texte.

**Points de vigilance :**

- Le bloc de code sombre est un élément visuel fort. Un document comportant de nombreux petits extraits de code peut finir par paraître rayé.
- La typographie à empattements et l’espacement quasi justifié font ressortir les URL longues et les identifiants de code. Gardez les lignes de code courtes.
- Les graphiques d’arrière-plan comptent ici. Sans eux, le bloc de code sombre devient un bloc uni et l’en-tête de tableau perd sa teinte.
- Business ne remplace pas le travail éditorial. Un journal des modifications brut en Business reste un journal des modifications brut.

Pour les documents externes, Business offre généralement la meilleure première impression. Il signale que le PDF a été préparé pour un lecteur, et non exporté après coup.

## Academic : textes longs et supports de cours

Academic utilise une police à empattements, un texte courant justifié et un traitement du code plus chaleureux et plus clair. Les titres restent alignés à gauche pour que la structure demeure repérable même lorsque les paragraphes sont justifiés. L’effet d’ensemble se rapproche davantage d’un support de cours ou d’un article que d’une page produit.

**Il convient surtout à :**

- Dossiers de cours, recueils de lecture et notes de cours.
- Articles et comptes rendus de recherche.
- Documentation longue comportant peu de blocs de code.
- Demandes de subvention et portfolios universitaires.
- Tout document que le lecteur compte lire en continu plutôt que parcourir.

**Points de vigilance :**

- Le texte justifié peut créer de larges blancs autour des URL longues, des identifiants de code et des termes techniques. Transformez les liens longs en liens de type référence ou déplacez-les dans une liste.
- Les blocs de code sont lisibles mais visuellement plus discrets qu’en Business. C’est voulu : Academic considère le code comme un support, pas comme l’élément principal.
- Les tableaux peuvent devenir à l’étroit sur du A4 s’ils comportent beaucoup de colonnes. Réduisez le nombre de colonnes ou déplacez les détails dans le texte.
- Academic convient mal à un guide d’installation rapide. Le format dit « lisez ceci de bout en bout », alors qu’un runbook se parcourt généralement.

Si le document comporte une section de type bibliographie, la typographie d’Academic lui donne naturellement sa place. L’application ne met pas en forme les citations ; conservez donc la section de références dans le Markdown.

## Dark : relecture à l’écran, sortie imprimable

Dark est le cas à part. Il est d’abord conçu pour une lecture confortable à l’écran : fond bleu marine sombre, texte clair et couleur de lien plus vive. À l’impression, la feuille de style impose un fond blanc, un texte noir, des liens noirs et des blocs de code clairs. Le PDF ne reporte pas le thème sombre de l’écran sur le papier.

**Il convient surtout à :**

- La relecture d’un long README à l’écran avant l’export.
- La lecture le soir ou dans une faible lumière.
- Vérifier la lecture du document sans le bruit visuel d’une page blanche.
- Produire un PDF pour une équipe qui préfère les outils en mode sombre.

**Points de vigilance :**

- Ce que vous voyez à l’écran n’est pas ce que vous obtenez dans le PDF. Ouvrez toujours le fichier exporté pour confirmer le traitement clair de l’impression.
- Dark n’est pas un thème de marque pour les documents externes. Un client attend un PDF conforme à la sortie imprimée, pas à l’aperçu.
- Si votre navigateur est réglé pour imprimer les arrière-plans, la feuille de style d’impression neutralise tout de même les surfaces sombres, mais les blocs de code peuvent nécessiter une vérification visuelle.
- Le contraste à l’écran du thème peut masquer une structure de source faible. Un document dont les niveaux de titres sont sautés reste visuellement brouillon ; il ne devient pas mieux organisé.

Considérez Dark comme un mode de lecture doté d’une sortie de secours imprimable, et non comme une quatrième identité visuelle pour le document final.

## Comparaison côte à côte

| | Clean | Business | Academic | Dark |
| --- | --- | --- | --- | --- |
| Type de texte courant | Sans empattement | À empattements | À empattements, justifié | Sans empattement à l’écran ; clair à l’impression |
| Traitement des titres | Filet fin | Filet bleu marine | À empattements, aligné à gauche | Filet clair sur fond sombre ; imprimable |
| Blocs de code | Gris clair | Bleu marine sombre | Clair et chaleureux | Sombres à l’écran ; clairs à l’impression |
| En-têtes de tableau | Neutres | Bleu teinté | Neutres | Sombres à l’écran ; clairs à l’impression |
| Couleur des liens | Bleu-vert | Bleu | Noir | Bleu vif à l’écran ; noir à l’impression |
| Public idéal | Ingénieurs | Clients, managers | Universitaires, étudiants | L’auteur, à l’écran |
| Document idéal | Spécification, README, runbook | Rapport, proposition, support | Article, dossier de cours | Copie de relecture |

Le tableau est un point de départ, pas une règle. Un client technique peut préférer Clean. Une équipe d’ingénierie sensible au design peut préférer Business. La fonction du document compte plus que sa catégorie.

## Comment le thème interagit avec le reste de l’export

Le thème n’est qu’une partie du résultat imprimé. Ces interactions méritent d’être vérifiées :

**Table des matières.** La table des matières hérite de la typographie et de la couleur des liens du document. En Business, les titres bleu marine et les liens bleus lui donnent l’allure d’un sommaire de rapport. En Academic, elle se lit comme le plan d’un article. Elle est générée pour les documents comportant au moins trois titres, et vous pouvez la désactiver si le document est court.

**Blocs de code.** Clean et Academic utilisent des fonds de code clairs ; Business utilise un bloc sombre ; Dark utilise un bloc sombre à l’écran et un bloc clair à l’impression. Les lignes longues posent un problème plus important que la couleur. Une ligne de 120 caractères débordera quel que soit le thème.

**Tableaux.** Business ajoute un en-tête teinté ; Clean et Academic restent neutres. Les tableaux larges sont la cause d’échec d’impression la plus fréquente. Si un tableau comporte plus de cinq ou six colonnes, envisagez de le scinder ou de réduire la taille de police dans la source plutôt que de réduire l’échelle d’impression.

**Images et badges.** Les thèmes ne modifient pas le rendu des images, mais changent les blancs qui les entourent. Le texte à empattements de Business peut donner à une capture d’écran l’allure d’une figure ; le texte sans empattement de Clean la fait ressembler à de la documentation. Les images cassées sont signalées dans l’aperçu et n’interrompent pas l’export.

**Liens.** Clean et Business utilisent des liens bleus ; Academic utilise du noir ; Dark utilise du bleu vif à l’écran et du noir à l’impression. Si le PDF doit être imprimé en niveaux de gris, la différence de couleur disparaît : privilégiez donc un texte de lien descriptif plutôt que la couleur.

**Sauts de page.** La feuille de style d’impression empêche autant que possible les blocs de code, tableaux, citations et images d’être coupés au milieu d’un élément, et garde les titres avec le contenu qui suit. Ce comportement est commun à tous les thèmes, mais il compte davantage en Academic, où les textes longs produisent plus de transitions de page.

## Choisir en 30 secondes

Utilisez ce parcours de décision rapide :

1. **Le lecteur est-il un ingénieur qui va chercher des commandes et du code ?** Choisissez Clean.
2. **Le lecteur est-il un client, un manager ou un relecteur qui attend un rapport ?** Choisissez Business.
3. **Le document est-il un texte long comportant peu de blocs de code ?** Choisissez Academic.
4. **Lisez-vous surtout à l’écran avant d’exporter ?** Choisissez Dark, puis vérifiez le PDF.
5. **Vous hésitez encore ?** Choisissez Clean. C’est le thème le moins susceptible de trahir le document.

Un test utile : exportez les deux premières pages dans deux thèmes candidats et lisez-les sur un téléphone. Le thème qui survit à un petit écran et à un balayage rapide est généralement le bon.

## Vérifications avant export plus importantes que le thème

Aucun thème ne peut corriger ces points :

- **Hiérarchie des titres.** Utilisez `##` pour les sections principales et `###` pour les sous-sections. Les niveaux sautés produisent une table des matières confuse.
- **Longueur des lignes de code.** Gardez si possible les lignes sous environ 80 à 90 caractères.
- **Largeur des tableaux.** Moins de colonnes, des libellés plus courts ou un tableau scindé.
- **Chemins des images.** Les images relatives au dépôt nécessitent une récupération du dépôt ; le Markdown collé nécessite des URL absolues.
- **Textes confidentiels.** La conversion est locale, mais le PDF peut tout de même être transmis.
- **Format de page.** A4 et Letter paginent différemment. Choisissez celui que le destinataire imprimera.
- **Graphiques d’arrière-plan.** Activez-les si les fonds des blocs de code et les en-têtes de tableau comptent pour la conception.

## La recommandation

Pour la plupart des exports de README, **Clean** est le bon choix par défaut. Il est neutre, lisible et ne prétend pas que le document est autre chose que ce qu’il est. Utilisez **Business** lorsque le PDF est un livrable pour quelqu’un hors de l’ingénierie. Utilisez **Academic** lorsque le document est destiné à être lu comme un texte suivi. Utilisez **Dark** lorsque vous voulez une relecture confortable avant de produire le PDF final en clair.

Le thème est un signal adressé au lecteur. Choisissez le signal qui correspond à la fonction, puis consacrez le reste de l’effort au contenu : une ouverture claire, une structure de titres sensée et des images qui s’affichent vraiment. Ces choix survivent à tous les thèmes.

Pour le processus d’export complet, voir [Comment convertir un README GitHub en PDF](/blog/github-readme-to-pdf/). Pour une préparation adaptée au public, voir [7 cas d’usage concrets pour transformer un README en PDF](/blog/readme-to-pdf-use-cases/).
