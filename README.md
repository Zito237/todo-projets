# INF563 — To-Do par projets : TDD, BDD et intégration continue

Application web de gestion de tâches rangées par projets, sauvegardées dans
l'**IndexedDB** du navigateur, et testée selon la séance 9 du cours :
**TDD** pour la logique, **BDD** (Gherkin + Cucumber) pour le comportement dans le
navigateur, **pipeline GitHub Actions** déclenché à chaque `push`.

## Fonctionnalités

- Créer des projets (nom obligatoire, unique sans tenir compte de la casse, liste triée).
- Ajouter une tâche dans un projet : titre obligatoire (120 caractères au plus), échéance facultative.
- Modifier une tâche (titre, échéance), annuler une modification.
- Marquer une tâche terminée ; les tâches à faire restent en haut.
- Les données sont conservées après rechargement ou fermeture de la page (IndexedDB).

## Lancer l'application

```bash
npm install
npm run serve          # puis ouvrir http://localhost:8080
```

IndexedDB et les modules JavaScript exigent une adresse `http://` : ouvrir
`index.html` par double-clic (`file://`) ne fonctionne pas.

## Lancer les tests

| Commande | Ce qu'elle lance | Prérequis |
| --- | --- | --- |
| `npm test` | 42 tests TDD (Vitest), en moins d'une seconde | Node.js 20+ |
| `npm run test:couverture` | idem + rapport de couverture dans `coverage/` | Node.js 20+ |
| `cd bdd && mvn verify` | 15 scénarios BDD dans un vrai Chrome | Java 17+, Maven, Chrome |
| `cd bdd && mvn verify -Dheadless=false` | idem, en voyant le navigateur | idem |
| `cd bdd && mvn verify -Dcucumber.filter.tags="@persistance"` | un sous-ensemble par tag | idem |

Rapport BDD : `bdd/target/cucumber-rapport.html` (capture d'écran jointe en cas d'échec).
On lance bien `mvn verify` et non `mvn test` : les scénarios sont des tests `*IT`
exécutés par **Failsafe**, qui ne fait échouer le build qu'en phase `verify`.

## Organisation : la pyramide des tests

| Niveau | Fichiers | Outil | Doublures | Nombre |
| --- | --- | --- | --- | --- |
| Unitaire (règles et service) | `web/test/service.*.test.js` | Vitest | fake `DepotMemoire`, horloge fixe, identifiants séquentiels | 31 |
| Intégration de composants (dépôt + API IndexedDB) | `web/test/depot.contrat.test.js` | Vitest + fake-indexeddb | implémentation IndexedDB en mémoire | 11 |
| Système / acceptation (appli dans Chrome) | `bdd/src/test/resources/features/*.feature` | Cucumber + Selenium | aucune : vrai navigateur, vraie IndexedDB | 15 scénarios |

Beaucoup de tests rapides en bas, peu de tests lents en haut. Un défaut de règle
(une borne à 120 caractères mal codée) est détecté par Vitest en quelques
millisecondes, sans ouvrir de navigateur.

```
todo-projets/
├── web/                         l'application
│   ├── index.html, styles.css
│   ├── app.js                   interface (DOM) : aucune règle métier
│   ├── src/
│   │   ├── regles.js            règles pures : titre, échéance, nom de projet
│   │   ├── service.js           TodoService : dépôt, horloge et générateur d'id injectés
│   │   └── depot-indexeddb.js   persistance IndexedDB
│   └── test/                    tests TDD (Vitest)
│       └── doublures/           fake DepotMemoire, horloges fixes
├── bdd/                         scénarios BDD (projet Maven)
│   ├── pom.xml                  Cucumber, Selenium, Failsafe
│   └── src/test/
│       ├── java/cm/inf563/todo/bdd/
│       │   ├── TodoBddIT.java   lanceur (suffixe IT -> Failsafe)
│       │   ├── steps/           définitions d'étapes @Soit / @Quand / @Alors
│       │   ├── pages/           Page Object PageTodo
│       │   └── support/         hooks, serveur HTTP intégré au JDK
│       └── resources/features/gestion_taches.feature
└── .github/workflows/ci.yml     pipeline déclenché à chaque push
```

## TDD : l'historique Git montre le cycle rouge, vert, refactor

```
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

Chaque commit `test(rouge)` a été vérifié en échec, chaque commit `feat(vert)` et
`refactor` en succès. Le test de contrat joue la **même** batterie sur le fake et sur
le vrai dépôt IndexedDB : il garantit que le fake utilisé par les tests unitaires ne
ment pas.

## BDD : la spécification exécutable

`gestion_taches.feature` est écrit en Gherkin français (`# language: fr`) :
Fonctionnalité avec son récit « Afin de / En tant que / Je veux », un **Contexte**
commun, des scénarios Soit / Quand / Alors (le schéma AAA) et un **Plan du
scénario** avec Exemples pour les valeurs limites du titre (1, 120 et 121
caractères). Tags : `@projet`, `@ajout`, `@modification`, `@persistance`,
`@negatif`, `@limite`.

Choix pour des scénarios **reproductibles** (tests instables, séance 9) :
- un Chrome neuf par scénario, donc une IndexedDB vide : aucun scénario ne dépend d'un autre ;
- aucune pause `Thread.sleep` : le test attend que l'application signale la fin
  de son rendu (`data-rendu` sur `<body>`), avec un délai maximal de 10 s ;
- langue et taille d'écran fixées ; les dates sont fixées en ISO plutôt que tapées,
  car la saisie d'un `<input type="date">` change selon la langue du navigateur ;
- l'application est servie par un serveur HTTP intégré au JDK, sur un port libre.

## Intégration continue : les tests à chaque push

Le fichier `.github/workflows/ci.yml` se déclenche à chaque `push` (toutes les
branches) et à chaque pull request :

1. job **tdd** : `npm ci`, puis `npm run test:couverture`, rapport de couverture publié ;
2. job **bdd**, seulement si le premier est vert : JDK 21 Temurin avec cache Maven,
   puis `mvn -B verify`, rapports Cucumber et Failsafe publiés même en cas d'échec (`if: always()`).

Pour l'activer :

```bash
git remote add origin https://github.com/<votre-compte>/todo-projets.git
git push -u origin main
```

Puis ouvrir l'onglet **Actions** du dépôt. Pour que le pipeline soit contraignant,
ajouter une règle de protection de la branche `main` (*Settings > Branches*) qui
exige le statut vert des deux jobs avant toute fusion.

## Lacunes de spécification rencontrées

Écrire les tests a obligé à trancher des points que l'énoncé ne précise pas. Ces
choix doivent être validés avec le « client » :

1. **Unicité des noms de projet.** La casse est ignorée (« Maison » = « MAISON »),
   mais les accents comptent (« Ecole » et « école » sont deux projets différents).
2. **Doublons de tâches.** Deux tâches de même titre sont acceptées dans un même projet.
3. **Longueur maximale du titre.** 120 caractères est un choix de notre part, compté
   en unités JavaScript : un émoji compte pour 2.
4. **Échéance passée.** Une date déjà dépassée est acceptée, et aucune tâche n'est signalée en retard.
5. **Fuseau de l'échéance.** L'échéance est une date calendaire sans heure. « En retard »
   dépendra du fuseau du navigateur si la règle est ajoutée.
6. **Ordre d'affichage.** À faire d'abord, puis par date de création. Un tri par échéance reste à décider.
7. **Suppression.** Supprimer une tâche ou un projet n'est pas demandé. Que deviennent
   les tâches d'un projet supprimé ?
8. **Portée des données.** IndexedDB est propre à un navigateur : rien n'est partagé entre
   appareils, et effacer les données du navigateur efface les tâches.
