# INF563 — To-Do par projets : TDD, BDD, pairwise, oracles et tests à chaque push

Application web de gestion de tâches rangées par projets, sauvegardées dans l'**IndexedDB**
du navigateur, entièrement testée **en JavaScript**. Le projet applique la séance 9 du cours
(niveaux de test, doublures, TDD, BDD avec Gherkin, intégration continue) et les techniques
du devoir sur l'équation du second degré : classes d'équivalence, pairwise, oracles de
référence, réflexif, par homothétie, métamorphiques et différentiel.

## Fonctionnalités

- Créer des projets : nom obligatoire, unique sans tenir compte de la casse, liste triée.
- Ajouter une tâche dans un projet : titre obligatoire (120 caractères au plus), échéance facultative.
- Modifier une tâche : titre, échéance, **projet** (déplacer la tâche) ; annuler une modification.
- Cocher une tâche terminée : les tâches à faire restent en haut.
- Compteur « x à faire sur y » et progression « n % terminé » pour chaque projet.
- Données conservées après rechargement ou fermeture de l'onglet (IndexedDB).

## Démarrer

```bash
npm install            # installe aussi le hook Git pre-push (voir plus bas)
npm run serve          # puis ouvrir http://localhost:8080
```

IndexedDB et les modules JavaScript exigent une adresse `http://` : ouvrir `index.html` par
double-clic (`file://`) ne fonctionne pas.

## Lancer les tests

| Commande | Ce qu'elle lance | Durée |
| --- | --- | --- |
| `npm test` | 396 tests Vitest : TDD, classes, pairwise, oracles | ~1 s |
| `npm run test:couverture` | idem + couverture dans `coverage/` (100 % des lignes de `regles.js` et `service.js`) | ~2 s |
| `npm run test:bdd` | 21 scénarios Gherkin dans Google Chrome | ~15 s |
| `npm run test:bdd:voir` | idem en voyant le navigateur travailler | ~20 s |
| `npm run test:bdd -- --tags @persistance` | un sous-ensemble par tag | |
| `npm run test:mutation` | test de mutation Stryker, rapport dans `reports/mutation/` | ~40 s |
| `npm run test:tout` | Vitest puis Cucumber | ~17 s |

Prérequis : Node.js 20 ou plus et Google Chrome. Sans Chrome :
`npx playwright install chromium` puis `PW_CHANNEL=chromium npm run test:bdd`.
Rapport BDD : `reports/cucumber/rapport.html` (capture d'écran jointe à chaque échec).

## La pyramide des tests

| Niveau | Fichiers | Outil | Doublures | Tests |
| --- | --- | --- | --- | --- |
| Unitaire (règles et service) | `web/test/service.*`, `classes-*`, `pairwise.*`, `oracle.*` | Vitest | fake `DepotMemoire`, horloge fixe, identifiants séquentiels | 348 |
| Intégration de composants (dépôt + API IndexedDB) | `depot.contrat.test.js`, `oracle.differentiel.test.js` | Vitest + fake-indexeddb | IndexedDB conforme, en mémoire | 11 + 37 |
| Système / acceptation (appli dans le navigateur) | `bdd/features/*.feature` | Cucumber-js + Playwright | aucune : vrai Chrome, vraie IndexedDB | 21 scénarios |

Beaucoup de tests rapides en bas, peu de tests lents en haut. Une borne mal codée est
détectée par Vitest en quelques millisecondes, sans ouvrir de navigateur.

```
todo-projets/
├── web/                              l'application
│   ├── index.html, styles.css
│   ├── app.js                        interface (DOM) : aucune règle métier
│   ├── src/
│   │   ├── regles.js                 règles pures : titre, échéance, nom de projet
│   │   ├── service.js                TodoService : dépôt, horloge et générateur d'id injectés
│   │   └── depot-indexeddb.js        persistance IndexedDB
│   └── test/                         tests Vitest
│       ├── service.*.test.js         TDD : un fichier par fonctionnalité
│       ├── classes-equivalence.test.js
│       ├── pairwise.ajout.test.js, pairwise.modification.test.js
│       ├── oracle.reflexif / homothetie / metamorphique / differentiel .test.js
│       ├── outil.pairwise.test.js    vérifie le générateur pairwise lui-même
│       ├── pairwise/                 générateur pairwise + classes d'équivalence (facteurs.js)
│       ├── oracles/reference.js      oracle de référence (la spécification)
│       └── doublures/                fake DepotMemoire, horloges, mise en place commune
├── bdd/
│   ├── features/gestion_taches.feature   la spécification exécutable (Gherkin français)
│   ├── steps/todo.steps.js               définitions d'étapes
│   └── support/                          monde Cucumber, hooks (serveur, Chrome)
├── .githooks/pre-push                tests lancés avant chaque git push
├── .github/workflows/ci.yml          pipeline lancé à chaque push sur GitHub
├── cucumber.mjs, vitest.config.js, stryker.config.mjs
└── outils/                           serveur web, installation des hooks
```

## 1. TDD : l'historique Git montre le cycle rouge, vert, refactor

```bash
git log --oneline --reverse
```

| Cycle | Rouge (test qui échoue) | Vert (code minimal) | Refactor |
| --- | --- | --- | --- |
| 1 | un projet a un nom obligatoire | création d'un projet | |
| 2 | nom nettoyé, unique, liste triée | `trim`, unicité, tri | règles extraites dans `regles.js` |
| 3 | ajout de tâche : titre, bornes 120/121, échéance | `ajouterTache` | |
| 4 | modification (titre, échéance, projet) | `modifierTache` | contrôles d'existence factorisés |
| 5 | terminer et ordre d'affichage | `basculerTerminee`, tri | |
| 6 | contrat du dépôt + persistance IndexedDB | `DepotIndexedDB` | |
| 7 | statistiques (total, à faire, progression) | `statistiques` | |

Chaque commit `test(rouge)` a été vérifié en échec, chaque commit `feat(vert)` et `refactor`
en succès. Le test de contrat joue la **même** batterie sur le fake et sur le vrai dépôt
IndexedDB : le fake utilisé par les tests unitaires ne ment pas.

## 2. Techniques du devoir sur l'équation du second degré

### Classes d'équivalence et valeurs limites

`web/test/pairwise/facteurs.js` décrit chaque entrée par ses classes, valides et invalides.
Chaque classe porte sa donnée d'entrée **et** ce que la spécification prévoit.

| Entrée | Classes valides | Classes invalides |
| --- | --- | --- |
| Titre | T1 ordinaire, T2 1 caractère, T3 120 caractères, T4 espaces autour | T5 121 caractères, T6 vide, T7 espaces seuls, T8 absent |
| Échéance | E1 absente, E2 vide, E3 ordinaire, E4 29/02/2028, E5 31/12 | E6 29/02/2027, E7 31 avril, E8 JJ/MM/AAAA, E9 mois 13, E10 avec heure, E11 texte avant, E12 année 0050 |
| Projet | P1 existant | P2 inexistant |

`classes-equivalence.test.js` teste une classe à la fois, les autres entrées restant valides :
quand un cas échoue, on sait quelle classe est en cause.

### Pairwise

`web/test/pairwise/pairwise.js` est l'équivalent JavaScript de jenny et du décorateur
`@PairwiseSource`. Il génère un jeu de cas où **chaque paire** de valeurs de deux facteurs
apparaît au moins une fois. Il est déterministe et **refuse de servir un jeu incomplet**.
`outil.pairwise.test.js` vérifie le générateur avant qu'on lui fasse confiance.

| Opération | Facteurs | Produit cartésien | Cas pairwise |
| --- | --- | --- | --- |
| Ajouter une tâche | titre (8) × échéance (12) × projet (2) × contenu du projet (4) | 768 | **96** |
| Modifier une tâche | titre (6) × échéance (6) × projet (4) × tâche de départ (3) | 432 | **36** |
| Composer un projet | à faire (4) × terminées (4) × facteur k (3) × ordre (3) | 144 | **16** |

96 et 36 sont le minimum théorique (produit des deux plus grands facteurs). Comme dans le
devoir Java, **aucun cas n'est écrit à la main** : tous les tests pairwise et oracles tirent
leurs données du générateur.

### Les oracles

| Oracle | Fichier | Relation vérifiée | Cas |
| --- | --- | --- | --- |
| Référence | `pairwise.*.test.js` | résultat = celui que prédit la spécification (`oracles/reference.js`), refus sans écriture partielle | 96 + 36 |
| Implicite | `pairwise.ajout.test.js`, `hooks.js` | toute erreur est une `ErreurValidation` avec un message ; aucune erreur JavaScript dans la page | tous |
| Réflexif | `oracle.reflexif.test.js` | modifier avec ses propres valeurs ne change que `modifieLe` ; cocher deux fois = état initial ; `valider(valider(x)) = valider(x)` | 3 × 13 |
| Homothétie | `oracle.homothetie.test.js` | k fois chaque tâche : compteurs × k, progression inchangée | 16 |
| Métamorphique | `oracle.metamorphique.test.js` | MR1 permuter l'ordre, MR2 déplacer conserve le total, MR3 partition, MR4 renommer, MR5 tout cocher / décocher | 5 × 16 |
| Différentiel | `oracle.differentiel.test.js` | mêmes opérations sur le fake et sur IndexedDB : mêmes états ; relecture après réouverture | 36 + 1 |

**Le cas où l'homothétie n'est pas intéressante**, comme (1, 1e8, 1) pour la formule naïve :
un mutant qui calcule la progression sur les tâches *à faire* au lieu des tâches *terminées*
respecte quand même l'homothétie, car (k·aFaire)/(k·total) = aFaire/total. L'oracle par
homothétie le déclare correct sur les 16 cas ; l'oracle de référence le détecte. À l'inverse,
un mutant qui ne compte que les 10 premières tâches casse l'homothétie et est détecté. Les
deux démonstrations sont des tests exécutés (`pouvoir de détection de l'oracle par homothétie`).

### Test de mutation : juger les tests eux-mêmes

`npm run test:mutation` (Stryker) modifie le code de production et relance Vitest.
Premier passage : **89,6 %** des mutants tués. Les survivants ont révélé de vrais trous :

- les ancres `^` et `$` de l'expression régulière de date pouvaient disparaître : il manquait
  les classes **E10** (date suivie d'une heure) et **E11** (texte avant la date) ;
- le contrôle de l'année pouvait disparaître : il manquait la classe **E12** (année 0050) ;
- le champ en erreur et le message de plusieurs refus n'étaient jamais vérifiés ;
- l'horloge et le générateur d'identifiants par défaut n'étaient jamais exécutés.

Après ajout de ces tests (`service.mutants.test.js`) : **97,2 %** (140 tués sur 144).
Les 4 survivants ont été examinés :

- deux sont **équivalents** : les contrôles du mois et du jour de `validerEcheance` sont
  redondants, car un débordement de jour change toujours de mois ;
- un est **équivalent** : comparer les noms en majuscules plutôt qu'en minuscules ;
- un révèle une **lacune de spécification** (n°1 ci-dessous) : l'ordre de « Ecole » et « école ».

## 3. BDD : la spécification exécutable, en JavaScript

`bdd/features/gestion_taches.feature` est écrit en Gherkin français (`# language: fr`) :

- une Fonctionnalité avec son récit « Afin de / En tant que / Je veux » ;
- un **Contexte** commun ;
- des scénarios Soit / Quand / Alors, c'est-à-dire le schéma AAA ;
- deux **Plans du scénario** avec Exemples : bornes du titre (1, 120, 121) et progression (0, 33, 67, 100 %).

Tags : `@projet`, `@ajout`, `@modification`, `@progression`, `@persistance`, `@negatif`, `@limite`.

Cucumber-js relie chaque phrase type à une définition d'étape (`bdd/steps/todo.steps.js`)
qui pilote un vrai Chrome avec Playwright. Choix pour des scénarios **reproductibles** :

- un contexte de navigation neuf par scénario, donc une IndexedDB vide : aucun scénario ne dépend d'un autre ;
- aucune pause fixe : on attend que l'application signale la fin de son rendu (`data-rendu`), 10 s au plus ;
- langue, fuseau horaire (`Africa/Douala`) et taille d'écran fixés ;
- serveur web démarré sur un port libre, navigateur lancé une seule fois pour la campagne ;
- oracle implicite : un scénario échoue si la page lève une erreur JavaScript.

Les étapes ont été vérifiées en cassant l'application : un déplacement de tâche ignoré et
une progression mal affichée font échouer 6 scénarios, avec capture d'écran au rapport.

## 4. Les tests à chaque push

### Sur le poste : hook `pre-push`

`npm install` exécute le script `prepare`, qui configure Git pour utiliser le dossier
versionné `.githooks/`. Ensuite, chaque `git push` lance d'abord `npm test`, puis
`npm run test:bdd`. **Si un test échoue, le push est annulé.**

Démonstration faite sur une copie du dépôt :

1. Un push avec le code vert est envoyé.
2. On remplace la borne 120 par 119, puis on fait un commit et un push : 32 tests échouent et le push est refusé.
3. Le dépôt distant reste sur le dernier commit vert.

`git push --no-verify` contourne le hook. C'est possible, mais le pipeline GitHub rejouera
de toute façon les tests.

### Sur GitHub : pipeline Actions

`.github/workflows/ci.yml` se déclenche à chaque `push` (toutes les branches), à chaque pull
request, chaque nuit, et à la demande :

1. job **tdd** : `npm ci`, puis `npm run test:couverture`, rapport de couverture publié ;
2. job **bdd**, seulement si le premier est vert : `npm run test:bdd` dans le Chrome du runner,
   rapport Cucumber publié même en cas d'échec (`if: always()`) ;
3. job **mutation**, la nuit ou à la demande seulement : il est trop lent pour chaque push
   (séance 9 : les tests lents vont dans le pipeline de nuit).

Pour l'activer :

```bash
git remote add origin https://github.com/<votre-compte>/todo-projets.git
git push -u origin main         # le hook pre-push s'exécute d'abord
```

Ouvrez ensuite l'onglet **Actions** du dépôt. Pour que le pipeline soit contraignant, ajoutez
une règle de protection de la branche `main` (*Settings > Branches*) qui exige le statut vert
des jobs `tdd` et `bdd` avant toute fusion.

## Lacunes de spécification rencontrées

Écrire les tests a obligé à trancher des points que l'énoncé ne précise pas. Ces choix sont
à valider avec le « client » :

1. **Unicité et ordre des noms de projet.** La casse est ignorée (« Maison » = « MAISON »),
   mais les accents comptent : « Ecole » et « école » sont deux projets différents. Leur ordre
   relatif dans la liste n'est pas spécifié (survivant de mutation).
2. **Priorité des refus.** Quand plusieurs champs sont invalides, quel message afficher ?
   À l'ajout, l'ordre est projet, titre, échéance. À la modification, il est titre, échéance, projet.
3. **Doublons de tâches.** Deux tâches de même titre sont acceptées dans un même projet (classe C4).
4. **Longueur du titre.** 120 caractères, comptés en unités JavaScript : un émoji compte pour 2.
5. **Années anciennes.** « 0050-01-01 » est refusée, car `Date.UTC` lirait 1950. Faut-il fixer une plage d'années ?
6. **Échéance passée.** Une date dépassée est acceptée, et aucune tâche n'est signalée en retard.
7. **Fuseau de l'échéance.** C'est une date calendaire sans heure. Une règle « en retard »
   dépendrait du fuseau du navigateur.
8. **Arrondi de la progression.** On arrondit à l'entier le plus proche : 2 sur 3 donne 67 %.
9. **Suppression.** Supprimer une tâche ou un projet n'est pas demandé. Que deviennent les tâches d'un projet supprimé ?
10. **Portée des données.** IndexedDB est propre à un navigateur : rien n'est partagé entre
    appareils, et effacer les données du navigateur efface les tâches.
