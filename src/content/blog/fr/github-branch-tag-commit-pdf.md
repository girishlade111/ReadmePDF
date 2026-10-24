---
title: "Cibler branches, tags et commits GitHub pour des PDF Markdown versionnés"
description: "Apprenez à cibler une branche Git, un tag de version ou un commit SHA précis lors de l’import Markdown dans md2pdf pour générer des PDF conformes."
pubDate: 2026-03-24
tags: ["github","git","markdown","pdf"]
locale: "fr"
translationKey: "github-branch-tag-commit-pdf"
---

La documentation logicielle évolue avec chaque nouvelle version. Si vous exportez un guide technique depuis la branche par défaut, vous risquez d'y inclure des fonctionnalités non déployées ou des modifications d'API en cours de développement. Avec [md2pdf](/#converter), vous pouvez caler votre export documentaire sur des branches Git précises, des tags de version ou des commits immuables.

Ce tutoriel détaille le fonctionnement du ciblage de références Git, le choix de la bonne référence et la création de manuels PDF fidèles à l'état de votre code.

## Pourquoi le ciblage de références Git est essentiel

Lors de la rédaction de manuels destinés à des environnements d'entreprise ou à des versions avec support étendu (LTS), la documentation doit correspondre rigoureusement au logiciel installé.

- **Exactitude opérationnelle** : Le guide PDF reflète uniquement les points d'entrée d'API actifs en production et exclut les tests instables.
- **Conformité et traçabilité** : Lors des audits de sécurité, une documentation extraite d'un commit immuable constitue une preuve objective de l'état du système.
- **Pérennité des archives** : Générez à tout moment la documentation des versions antérieures sans avoir à cloner l'historique complet sur votre poste local.

```text
Supported Git Reference Types:
- Branch:  refs/heads/v2.1-maintenance
- Tag:     refs/tags/v2.1.0-lts
- Commit:  7f2b9a1d4e8c3b0f5a6d7e8c9b0a1f2e3d4c5b6a
```

## Utiliser les tags de version pour des manuels stables

Les tags de version marquent des jalons éprouvés dans le cycle de vie du projet. Dans md2pdf, spécifier une URL avec un tag ou le sélectionner dans le menu déroulant déclenche la récupération des fichiers à cet instant précis.

1. **Détection des versions** : Lors de l'analyse du dépôt, md2pdf extrait l'ensemble des tags disponibles (par exemple `v1.4.0`, `v2.0.0-rc1`).
2. **Capture instantanée** : Les guides techniques récupérés reflètent exactement le code de cette version officielle.
3. **Mentions de version** : Faites figurer le nom du tag sur la page de couverture pour permettre aux équipes de situer immédiatement le périmètre du document.

## Exploiter les branches de maintenance

Lorsque des correctifs sont apportés à des versions précédentes, ces révisions sont souvent intégrées dans des branches de maintenance dédiées.

En ciblant une branche telle que `support/3.x` ou `v1-stable`, md2pdf télécharge la documentation à jour de cette série. Cela vous permet d'obtenir les derniers correctifs sans intégrer les chantiers expérimentaux de la branche principale.

## Exports infalsifiables grâce aux commits SHA

Pour une reproductibilité totale, rien ne surpasse un hash de commit Git de 40 caractères. Contrairement aux branches ou aux tags réassignables, un commit est gravé de manière immuable.

En renseignant un SHA de commit dans md2pdf, l'arborescence Git est reconstituée à cet instant précis. Même si la branche venait à disparaître, votre fichier PDF conservera fidèlement l'état vérifié des guides techniques.

## Étapes pour configurer vos références Git dans md2pdf

La configuration d'une référence Git dans md2pdf s'effectue en quelques clics :

1. Collez l'URL de votre dépôt dans le champ prévu à cet effet.
2. Ouvrez le sélecteur de références pour visualiser les branches et tags accessibles.
3. Sélectionnez le tag ou la branche de votre choix, ou collez directement un hash de commit.
4. Parcourez l'arborescence et compilez vos fichiers Markdown dans un document PDF de qualité professionnelle.
