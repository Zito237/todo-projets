# État des tests du projet To-Do par projets (INF563)

Relevé du 13 novembre 2026, sur ce poste (Windows 11, Node 24, Google Chrome).
Toutes les commandes ont été relancées ce jour-là ; les chiffres ci-dessous sont ceux de ces exécutions.

## 1. Résumé

| Niveau | Commande | Résultat | Durée |
| --- | --- | --- | --- |
| Tests unitaires et d'intégration (Vitest) | `npm test` | **1180 réussis sur 1180**, 24 fichiers, 0 échec, 0 ignoré | environ 10 s |
| Couverture de code | `npm run test:couverture` | **99,53 %** des lignes, 99,41 % des branches | environ 15 s |
| Scénarios BDD dans Chrome (Cucumber + Playwright) | `npm run test:bdd` | **59 scénarios réussis sur 59**, 333 étapes sur 333 | 42 s |
| Test de mutation (Stryker) | `npm run test:mutation` | **98,57 %** : 276 mutants détectés sur 280, 4 survivants | environ 2 min |

Tout est vert. Aucun test n'est désactivé ni ignoré.

## 2. Ce qui est testé

L'application permet de créer un compte, de se connecter, puis de gérer des projets et leurs tâches. Les données sont enregistrées dans le navigateur (IndexedDB).

| Fichier de production | Rôle | Couverture des lignes |
| --- | --- | --- |
| `web/src/regles.js` | règles des tâches (titre, échéance, priorité) | 100 % |
| `web/src/service.js` | projets, tâches, statistiques, isolation entre comptes | 100 % |
| `web/src/regles-compte.js` | règles de l'identifiant et du mot de passe | 100 % |
| `web/src/comptes.js` | création de compte et connexion | 100 % |
| `web/src/hachage.js` | empreinte du mot de passe (PBKDF2) | 100 % |
| `web/src/depot-indexeddb.js` | lecture et écriture dans IndexedDB | 98,29 % (lignes 31-32 non couvertes) |

Les lignes 31-32 du dépôt sont le cas « l'ouverture de la base échoue » : il n'est pas provoqué par les tests.

`web/app.js` (l'interface) n'est pas mesuré par la couverture : il est vérifié par les scénarios BDD, qui pilotent un vrai navigateur.

## 3. Tests Vitest : détail par technique du cours

Les 1180 tests se répartissent ainsi :

| Technique | Tests | Part |
| --- | --- | --- |
| TDD (tests unitaires des services) | 87 | 7 % |
| Classes d'équivalence et valeurs limites | 96 | 8 % |
| Pairwise | 368 | 31 % |
| Oracles | 589 | 50 % |
| Contrat des doublures et intégration IndexedDB | 40 | 3 % |
| **Total** | **1180** | |

### 3.1 TDD : 87 tests, tous réussis

Chaque test a été écrit avant le code, vu en échec (rouge), puis le code a été écrit pour le faire passer (vert).

| Fichier (`web/test/`) | Tests | Ce qu'il vérifie |
| --- | --- | --- |
| `service.projets.test.js` | 6 | créer un projet, ordre alphabétique, refus d'un nom déjà pris |
| `service.taches.test.js` | 13 | ajouter une tâche, refus d'un titre vide ou d'une échéance invalide |
| `service.modification.test.js` | 9 | modifier le titre, l'échéance, déplacer vers un autre projet |
| `service.terminer.test.js` | 3 | terminer une tâche, ordre d'affichage |
| `service.statistiques.test.js` | 5 | nombre de tâches et pourcentage de progression |
| `service.suppression.test.js` | 7 | supprimer un projet supprime aussi ses tâches |
| `service.mutants.test.js` | 6 | tests ajoutés après la mutation (voir section 5) |
| `comptes.inscription.test.js` | 19 | page « Créer un compte » : compte créé, refus précis, mot de passe jamais enregistré |
| `comptes.connexion.test.js` | 10 | page « Se connecter » : bon et mauvais mot de passe, message identique dans les deux cas de refus |
| `service.isolation.test.js` | 9 | un compte ne voit ni ne modifie les projets et tâches d'un autre |

Ces tests n'utilisent ni navigateur ni vraie base : le dépôt, l'horloge, le générateur d'identifiants et le hacheur sont remplacés par des doublures (injection de dépendances). C'est ce qui les rend rapides et répétables.

### 3.2 Classes d'équivalence et valeurs limites : 96 tests, tous réussis

On découpe chaque donnée en classes (valide, trop court, trop long, caractère interdit…) et on teste un représentant par classe, plus les bornes.

| Fichier | Tests | Ce qu'il vérifie |
| --- | --- | --- |
| `classes-equivalence.test.js` | 23 | ajout d'une tâche, une classe à la fois |
| `classes-equivalence.comptes.test.js` | 73 | identifiant (16), mot de passe (11), confirmation (4), puis inscription (25) et connexion (17) une classe à la fois |

Bornes testées pour les comptes : identifiant de 2, 3, 30 et 31 caractères (limites 3 à 30) ; mot de passe de 7, 8, 64 et 65 caractères (limites 8 à 64).

### 3.3 Pairwise : 368 tests, tous réussis

Tester toutes les combinaisons serait trop long. Le pairwise garde un petit ensemble de cas où chaque paire de valeurs apparaît au moins une fois.

| Fichier | Cas exécutés | Combinaisons possibles |
| --- | --- | --- |
| `pairwise.ajout.test.js` | 96 | 768 |
| `pairwise.modification.test.js` | 36 | 432 |
| `pairwise.inscription.test.js` | 150 | 2400 |
| `pairwise.connexion.test.js` | 72 | 216 |
| `outil.pairwise.test.js` | 14 | vérifie le générateur lui-même : toutes les paires sont bien couvertes |

Soit 354 cas exécutés au lieu de 3816, plus 14 tests de l'outil.

### 3.4 Oracles : 589 tests, tous réussis

L'oracle est ce qui dit si le résultat est correct. Plusieurs sortes sont utilisées.

| Fichier | Tests | Oracle |
| --- | --- | --- |
| `oracle.reflexif.test.js` | 39 | réflexif : ce qu'on écrit, on le relit identique |
| `oracle.homothetie.test.js` | 18 | homothétie : multiplier les tâches par k ne change pas le pourcentage ; 2 tests montrent un cas où cet oracle ne détecte rien |
| `oracle.metamorphique.test.js` | 80 | métamorphique : une transformation de l'entrée donne une transformation connue de la sortie |
| `oracle.differentiel.test.js` | 37 | différentiel : le dépôt en mémoire et IndexedDB donnent le même résultat |
| `oracle.comptes.test.js` | 415 | comptes : réflexif (78), 5 relations métamorphiques (186), différentiel sur les 150 cas d'inscription (151) |

L'oracle de référence (une seconde écriture, indépendante, des règles) sert dans les tests pairwise : `web/test/oracles/reference-compte.js` pour les comptes.

L'homothétie n'est pas appliquée aux comptes : rien ne s'y multiplie, un tel test serait vide.

### 3.5 Contrat des doublures et intégration : 40 tests, tous réussis

Une doublure n'est utile que si elle se comporte comme le vrai composant. Les mêmes tests sont donc exécutés sur les deux.

| Fichier | Tests | Ce qu'il vérifie |
| --- | --- | --- |
| `depot.contrat.test.js` | 27 | 11 tests identiques sur le dépôt en mémoire et sur IndexedDB, plus 5 tests de persistance (réouverture de la base, changement de version, onglet bloquant) |
| `hachage.test.js` | 13 | 4 tests identiques sur le vrai hacheur PBKDF2 et sur le faux, plus 5 tests du vrai (sel aléatoire, 100 000 tours) |

## 4. Scénarios BDD : 59 réussis sur 59

Les scénarios sont écrits en français (Gherkin) et exécutés dans un vrai Chrome, sur la vraie application.

| Fichier (`bdd/features/`) | Scénarios exécutés | Sujets |
| --- | --- | --- |
| `gestion_taches.feature` | 27 | projets, ajout, modification, déplacement, progression, persistance, suppression d'un projet |
| `comptes.feature` | 32 | création de compte, connexion, déconnexion, session conservée, isolation, sécurité |

Un « plan du scénario » compte une exécution par ligne d'exemples ; c'est pourquoi il y a plus d'exécutions que de titres de scénarios.

Ce que couvrent les scénarios des comptes :

- **Création de compte :** compte créé puis session ouverte, bornes de longueur, refus avec message, identifiant déjà pris.
- **Connexion :** compte existant, casse de l'identifiant ignorée, refus avec le même message, champ du mot de passe vidé après un refus.
- **Session :** on reste connecté après un rechargement ; après une déconnexion, recharger ne reconnecte pas.
- **Isolation :** un nouvel utilisateur ne voit pas les projets des autres ; deux utilisateurs peuvent avoir un projet du même nom.
- **Sécurité :** le mot de passe n'apparaît ni dans IndexedDB, ni dans le stockage local, ni dans le stockage de session.

Contrôle de la valeur de ces scénarios : en cassant volontairement l'isolation et l'effacement du mot de passe dans le code, 6 scénarios échouent. Le code a été rétabli ensuite.

## 5. Test de mutation : 98,57 %

Stryker modifie le code de production (par exemple `<` devient `<=`) et relance les tests. Si un test échoue, le mutant est détecté ; sinon il survit, ce qui montre un trou dans les tests.

| Fichier muté | Mutants détectés | Survivants | Score |
| --- | --- | --- | --- |
| `web/src/service.js` | 86 | 0 | 100 % |
| `web/src/regles-compte.js` | 79 | 0 | 100 % |
| `web/src/comptes.js` | 41 | 0 | 100 % |
| `web/src/regles.js` | 70 | 4 | 94,59 % |
| **Total** | **276** | **4** | **98,57 %** |

Aucun mutant n'est resté sans test pour l'exécuter, et aucun n'a provoqué de dépassement de temps.

Le seuil d'échec est fixé à 80 % dans `stryker.config.mjs` : la commande réussit.

Ce que la mutation a fait corriger :

- Dans le service des tâches puis dans celui des comptes, l'horloge et le générateur d'identifiants par défaut n'étaient jamais exécutés. Un test a été ajouté dans chaque cas.
- Les refus n'étaient vérifiés que par leur message ; le champ en cause est maintenant vérifié aussi (`service.mutants.test.js`).

- Sur l'échéance, les ancres `^` et `$` de l'expression régulière et le contrôle de l'année pouvaient disparaître sans qu'un test échoue : les classes E10, E11 et E12 ont été ajoutées.

Évolution du score : 89,6 % au premier passage, 97,2 % après les tests ajoutés, 98,57 % avec les comptes.

Les 4 survivants de `regles.js` ont été examinés :

- deux sont équivalents : les contrôles du mois et du jour de l'échéance sont redondants ;
- un est équivalent : comparer les noms en majuscules plutôt qu'en minuscules ;
- un révèle une lacune de spécification : l'ordre d'affichage de « Ecole » et « école » n'est pas défini.

`hachage.js` et `depot-indexeddb.js` ne sont pas soumis à la mutation (ils ne figurent pas dans `stryker.config.mjs`).

## 6. Tests à chaque push

| Mécanisme | Fichier | État |
| --- | --- | --- |
| Hook `pre-push` | `.githooks/pre-push` | installé par `npm install` ; lance `npm test` puis `npm run test:bdd` et annule le push en cas d'échec |
| Intégration continue | `.github/workflows/ci.yml` | **en service** sur https://github.com/Zito237/todo-projets/actions ; toutes les exécutions depuis le 12 novembre ont réussi |

À chaque push, GitHub lance les tests Vitest avec la couverture, puis, s'ils passent, les scénarios BDD dans Chrome. Chaque nuit (02 h 17 UTC), il ajoute le test de mutation. Les rapports (couverture, BDD, mutation) sont téléchargeables dans l'onglet Actions, rubrique « Artifacts ».

Le push du 13 novembre en est un exemple : le hook a lancé les 1180 tests puis les 59 scénarios sur le poste, a laissé passer l'envoi, puis GitHub a rejoué les mêmes tests de son côté.

## 7. Ce qui n'est pas testé

- **Le pipeline GitHub Actions utilise des versions anciennes de ses actions** (`checkout@v4`, `setup-node@v4`, `upload-artifact@v4`) : GitHub signale qu'elles visent Node 20, désormais obsolète. Les exécutions réussissent tout de même.
- **Un seul navigateur :** les scénarios ne passent que dans Chrome.
- **L'échec d'ouverture de la base** (lignes 31-32 du dépôt) n'est pas provoqué.
- **Le nom de projet n'a pas de longueur maximale :** il n'y a donc pas de test de borne haute sur ce champ.
- **Pas de test de charge** ni de test avec un grand nombre de comptes ou de tâches.
- **Pas de serveur :** les comptes séparent les utilisateurs d'un même navigateur. Quelqu'un qui ouvre les outils de développement peut lire la base (mais pas les mots de passe).

Les autres lacunes sont listées dans le README.

## 8. Relancer les tests

À lancer depuis `C:\Users\bertrand\Desktop\todo-projets` (avec le `C` majuscule, sinon Cucumber refuse de démarrer sur ce poste).

```
npm test                  # tests Vitest
npm run test:couverture   # avec la couverture (rapport dans coverage/)
npm run test:bdd          # scénarios dans Chrome
npm run test:bdd:voir     # les mêmes, navigateur visible
npm run test:mutation     # mutation (rapport dans reports/mutation/index.html)
```
