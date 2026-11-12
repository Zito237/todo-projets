# Explication du projet « To-Do par projets » (INF563)

Ce document résume ce qui a été fait, ce qu'il faut savoir et ce qu'il faut dire au
professeur. Tous les chiffres ci-dessous ont été obtenus en exécutant le projet le
12/11/2026 sur ce poste (Windows 11, Node 24, Google Chrome).

## 1. Le projet en une minute

C'est une application web de gestion de tâches rangées par projets. Les données sont
enregistrées dans l'**IndexedDB** du navigateur : il n'y a ni serveur applicatif ni base
de données distante. Tout est écrit en JavaScript, sans framework.

Le but du projet n'est pas l'application elle-même, mais la **façon de la tester**. Il
applique la séance 9 du cours (pyramide des tests, doublures, TDD, BDD, intégration
continue) et les techniques du devoir sur l'équation du second degré (classes
d'équivalence, pairwise, oracles).

Ce que fait l'application :

- créer des projets (nom obligatoire, unique sans tenir compte de la casse, liste triée) ;
- ajouter une tâche dans un projet (titre obligatoire de 120 caractères au plus, échéance facultative) ;
- modifier une tâche : titre, échéance, ou la déplacer dans un autre projet ;
- supprimer un projet, avec ses tâches, après confirmation ;
- cocher une tâche terminée (les tâches à faire restent en haut) ;
- afficher « x à faire sur y » et « n % terminé » pour chaque projet ;
- conserver les données après rechargement ou fermeture de l'onglet.

## 2. Liens d'accès

### L'interface

Dans un terminal, à la racine du projet :

```powershell
npm install      # une seule fois
npm run serve
```

Puis ouvrir dans Chrome l'adresse affichée par la commande : **http://127.0.0.1:8081/**

Le port par défaut est 8081 et non 8080, car Jenkins occupe le 8080 sur ce poste. Si le
8081 est lui aussi occupé (par exemple parce que l'application tourne déjà dans un autre
terminal), le serveur essaie le 8082, puis les suivants, et affiche l'adresse retenue.

`http://localhost:8081/` fonctionne aussi, mais utilisez toujours la même adresse : pour
le navigateur, ce sont deux sites différents, donc deux bases IndexedDB différentes.
Ouvrir `index.html` par double-clic (`file://`) ne fonctionne pas.

### La base IndexedDB

IndexedDB n'a pas d'adresse web : elle se consulte dans les outils de développement du
navigateur, sur la page de l'application.

1. Ouvrir http://127.0.0.1:8081/ dans Chrome.
2. Appuyer sur **F12**.
3. Onglet **Application** (dans Firefox : onglet **Stockage**).
4. Dans le menu de gauche : **Stockage > IndexedDB > todo-projets**.

On y trouve :

| Élément | Contenu |
| --- | --- |
| Base `todo-projets`, version 1 | créée à la première ouverture de la page |
| Magasin `projets` (clé `id`) | `id`, `nom`, `creeLe` |
| Magasin `taches` (clé `id`) | `id`, `projetId`, `titre`, `echeance`, `terminee`, `creeLe`, `modifieLe` |
| Index `parProjet` sur `taches` | retrouve les tâches d'un projet par `projetId` |

Si une donnée ajoutée n'apparaît pas, cliquer sur le bouton d'actualisation du panneau.
Pour repartir de zéro : clic droit sur `todo-projets`, puis « Supprimer la base de données ».

### Les rapports de test

Ces fichiers sont produits par les commandes de la section 3. Ils s'ouvrent par
double-clic.

| Rapport | Fichier | Produit par |
| --- | --- | --- |
| Scénarios BDD | `reports/cucumber/rapport.html` | `npm run test:bdd` |
| Mutation | `reports/mutation/index.html` | `npm run test:mutation` |
| Couverture | `coverage/index.html` | `npm run test:couverture` |

## 3. Résultats de l'exécution

| Commande | Résultat obtenu | Durée |
| --- | --- | --- |
| `npm test` | **408 tests réussis sur 408** (16 fichiers) | 3 s |
| `npm run test:couverture` | 100 % de `regles.js` et de `service.js`, 97 % de `depot-indexeddb.js` | 4 s |
| `npm run test:bdd` | **27 scénarios réussis sur 27** (157 étapes) | 16 s |
| `npm run test:mutation` | **97,24 %** : 141 mutants tués sur 145, 4 survivants | 56 s |

Pour la démonstration, `npm run test:bdd:voir` rejoue les scénarios en montrant le
navigateur travailler.

### Trois problèmes rencontrés sur ce poste

**Le port 8080 est pris par Jenkins.** `npm run serve` s'arrêtait avec l'erreur `EACCES`.
Le serveur utilise maintenant le port 8081 par défaut et passe au port suivant si
celui-ci est occupé. Les tests BDD ne sont pas touchés : ils choisissent eux-mêmes un
port libre.

**Le serveur renvoyait « Introuvable » sur la page d'accueil.** Sous Windows,
`outils/serveur.js` ne reconnaissait pas l'adresse `/` et répondait 404. Les 21
scénarios BDD échouaient donc tous à l'ouverture de la page. Une ligne a été corrigée
dans `outils/serveur.js` ; après correction, tous les scénarios passent. Cette
modification n'est pas encore dans un commit.

**La lettre du lecteur doit être en majuscule.** Si le terminal est ouvert dans
`c:\Users\...` (minuscule), Cucumber s'arrête avec « invalid installation » et la
couverture compte chaque fichier deux fois. Il faut ouvrir le terminal dans
`C:\Users\bertrand\Desktop\todo-projets`, ou y aller avec
`cd C:\Users\bertrand\Desktop\todo-projets`.

## 4. Architecture

```
web/
  index.html, styles.css
  app.js                   interface : relie la page au service, aucune règle métier
  src/regles.js            règles pures : valider un titre, une échéance, un nom
  src/service.js           TodoService : les opérations de l'application
  src/depot-indexeddb.js   enregistrement dans IndexedDB
  test/                    tests Vitest
bdd/
  features/gestion_taches.feature   scénarios Gherkin en français
  steps/, support/                  code qui exécute les scénarios dans Chrome
outils/serveur.js          petit serveur web
.githooks/pre-push         tests lancés avant chaque git push
.github/workflows/ci.yml   pipeline GitHub Actions
```

Le point à retenir est l'**injection de dépendances**. `TodoService` ne crée pas
lui-même sa base, son horloge ni ses identifiants : on les lui donne.

- En production, il reçoit le dépôt IndexedDB, l'heure réelle et des identifiants aléatoires.
- En test, il reçoit un dépôt en mémoire (une doublure de type *fake*), une horloge fixe et
  des identifiants 1, 2, 3.

Les tests unitaires sont donc rapides et donnent toujours le même résultat.

## 5. Ce qui a été fait, technique par technique

### 5.1 TDD : rouge, vert, refactor

L'historique Git montre le cycle. Commande à montrer : `git log --oneline --reverse`.

- Un commit `test(rouge)` ajoute un test qui échoue.
- Un commit `feat(vert)` ajoute le code minimal qui le fait passer.
- Un commit `refactor` nettoie le code sans changer les tests.

Il y a 8 cycles : nom de projet obligatoire, nom unique et liste triée, ajout de tâche,
modification, terminer une tâche, persistance IndexedDB, statistiques, suppression d'un
projet. Le dernier cycle (suppression) est fait mais pas encore enregistré dans Git.

### 5.2 La pyramide des tests

| Niveau | Outil | Ce qui est réel | Nombre |
| --- | --- | --- | --- |
| Unitaire | Vitest | rien : dépôt en mémoire, horloge fixe | 355 tests |
| Intégration | Vitest + fake-indexeddb | l'API IndexedDB, simulée en mémoire | 53 tests |
| Système | Cucumber-js + Playwright | Chrome et la vraie IndexedDB | 27 scénarios |

Beaucoup de tests rapides en bas, peu de tests lents en haut.

Le **test de contrat** (`depot.contrat.test.js`) joue la même série de tests sur le
dépôt en mémoire et sur le dépôt IndexedDB. Il prouve que la doublure se comporte comme
le vrai dépôt.

### 5.3 Classes d'équivalence et valeurs limites

Chaque entrée est découpée en classes, valides et invalides
(`web/test/pairwise/facteurs.js`).

| Entrée | Classes valides | Classes invalides |
| --- | --- | --- |
| Titre | ordinaire, 1 caractère, 120 caractères, espaces autour | 121 caractères, vide, espaces seuls, absent |
| Échéance | absente, vide, ordinaire, 29/02/2028, 31/12 | 29/02/2027, 31 avril, format JJ/MM/AAAA, mois 13, date suivie d'une heure, texte avant la date, année 0050 |
| Projet | existant | inexistant |

Les bornes 120 et 121 sont les valeurs limites du titre. Les tests changent une seule
classe à la fois : quand un test échoue, on sait laquelle est en cause.

### 5.4 Pairwise

Tester toutes les combinaisons coûte trop cher. Le pairwise garantit que **chaque paire**
de valeurs de deux facteurs apparaît au moins une fois, parce que la plupart des défauts
viennent d'une valeur seule ou de l'interaction de deux valeurs.

| Opération | Toutes les combinaisons | Cas pairwise |
| --- | --- | --- |
| Ajouter une tâche | 768 | 96 |
| Modifier une tâche | 432 | 36 |
| Composer un projet | 144 | 16 |

Le générateur est écrit dans le projet (`web/test/pairwise/pairwise.js`). C'est
l'équivalent JavaScript de jenny et de `@PairwiseSource` du devoir Java. Il est lui-même
testé (`outil.pairwise.test.js`) et refuse de fournir un jeu où une paire manque.

### 5.5 Les oracles

Un oracle est ce qui décide si un résultat est correct.

| Oracle | Ce qu'il vérifie |
| --- | --- |
| Référence | le résultat est celui que prédit la spécification, écrite à part dans `oracles/reference.js` |
| Implicite | toute erreur est une `ErreurValidation` avec un message ; la page ne lève aucune erreur JavaScript |
| Réflexif | modifier une tâche avec ses propres valeurs ne change rien d'autre que la date de modification ; cocher deux fois ramène à l'état initial |
| Homothétie | multiplier chaque tâche par k multiplie les compteurs par k et laisse la progression identique |
| Métamorphique | cinq relations : permuter l'ordre, déplacer une tâche conserve le total, partition, renommer, tout cocher puis décocher |
| Différentiel | les mêmes opérations sur le dépôt en mémoire et sur IndexedDB donnent les mêmes états |

**Le cas où l'homothétie n'est pas intéressante**, à savoir expliquer : si une erreur
calcule la progression avec les tâches *à faire* au lieu des tâches *terminées*,
l'homothétie est quand même respectée, car (k × à faire) / (k × total) = à faire / total.
L'oracle par homothétie ne voit donc rien, alors que l'oracle de référence détecte
l'erreur. C'est l'équivalent du cas (1, 1e8, 1) du devoir. Conclusion : un seul oracle ne
suffit pas, il faut les combiner.

### 5.6 Test de mutation

Stryker modifie volontairement le code (un `>` devient `>=`, une condition devient
`true`) puis relance les tests. Si les tests échouent, le mutant est « tué ». S'ils
passent encore, les tests ont un trou.

- Premier passage : 89,6 %. Les survivants ont montré qu'il manquait trois classes
  d'échéance (date suivie d'une heure, texte avant la date, année 0050) et que certains
  messages d'erreur n'étaient jamais vérifiés.
- Après ajout des tests manquants (`service.mutants.test.js`) : **97,24 %**.
- Les 4 survivants ont été analysés : 3 sont des mutants équivalents (le code modifié se
  comporte exactement comme l'original) et 1 révèle une lacune de la spécification
  (l'ordre de « Ecole » et « école » dans la liste).

À dire : la couverture indique que le code est exécuté, la mutation indique qu'il est
vérifié.

### 5.7 BDD : la spécification exécutable

`bdd/features/gestion_taches.feature` décrit le comportement en français avec Gherkin
(Soit / Quand / Alors). Cucumber-js lit ces phrases et Playwright pilote un vrai Chrome.

- 22 scénarios écrits, dont 2 « Plans du scénario » avec tableau d'exemples, soit 27 exécutions.
- Tags : `@projet`, `@ajout`, `@modification`, `@suppression`, `@progression`, `@persistance`, `@negatif`, `@limite`.
- Chaque scénario part d'un profil de navigateur neuf, donc d'une IndexedDB vide : aucun
  scénario ne dépend d'un autre.
- Aucune pause fixe : le test attend que la page signale la fin de son affichage.
- Langue, fuseau horaire et taille d'écran sont fixés pour que le résultat soit le même partout.
- En cas d'échec, une capture d'écran est jointe au rapport.

### 5.8 Les tests à chaque push

**Sur le poste**, le hook `.githooks/pre-push` lance `npm test` puis `npm run test:bdd`
avant chaque `git push`. Si un test échoue, le push est annulé. `npm install` installe
le hook automatiquement.

**Sur GitHub**, le pipeline `.github/workflows/ci.yml` comporte trois étapes :

1. `tdd` : tests Vitest et couverture, à chaque push et à chaque pull request ;
2. `bdd` : scénarios dans Chrome, seulement si l'étape `tdd` est verte ;
3. `mutation` : la nuit ou à la demande, car elle est trop lente pour chaque push.

### 5.9 Suppression d'un projet (ajoutée le 12/11/2026)

Le bouton « Supprimer le projet » se trouve à droite du nom du projet affiché.

- Une boîte de confirmation annonce ce qui sera perdu, par exemple
  « Supprimer le projet « Maison » et ses 2 tâches ? ». Si on refuse, rien ne change.
- Les tâches du projet sont supprimées avec lui. Dans IndexedDB, le projet et ses tâches
  sont supprimés dans **une seule transaction** : soit tout est supprimé, soit rien, même
  si l'onglet se ferme au milieu.
- La suppression est définitive. Le nom redevient libre : on peut recréer un projet du
  même nom, qui sera vide.

Elle a été faite en TDD : 12 tests écrits d'abord et vus en échec, puis le code.

| Niveau | Fichier | Ajout |
| --- | --- | --- |
| Unitaire | `web/test/service.suppression.test.js` | 7 tests |
| Intégration | `web/test/depot.contrat.test.js` | 5 tests (dépôt en mémoire et IndexedDB) |
| Système | `bdd/features/gestion_taches.feature`, tag `@suppression` | 6 scénarios |

**Nom de projet : aucune longueur maximale.** La seule règle est que le nom ne soit pas
vide ; un nom de 500 caractères est accepté. Seul le titre d'une tâche est limité
(120 caractères). C'est une lacune de spécification à signaler.

## 6. Points à signaler honnêtement

- **La suppression et la correction du serveur ne sont pas encore dans un commit.**

- **Le dépôt n'est pas encore sur GitHub.** Aucun dépôt distant n'est configuré
  (`git remote -v` est vide). Le pipeline est écrit mais n'a jamais tourné sur GitHub.
  Pour l'activer : créer le dépôt, puis `git remote add origin <adresse>` et
  `git push -u origin main`.
- **Une ancienne version Java traîne dans `bdd/`.** Les premiers scénarios BDD étaient
  en Java (Cucumber + Selenium). Ils ont été remplacés par la version JavaScript et
  retirés de Git, mais `bdd/pom.xml`, `bdd/src/` et `bdd/target/` sont encore sur le
  disque. Ils ne servent plus et il leur manque 3 scénarios. Si le professeur pose la
  question : le choix a été de tout faire dans un seul langage, avec une seule commande
  d'installation.
- **La correction du serveur** (section 3) reste à enregistrer dans un commit.
- **L'interface (`app.js`) n'a pas de test unitaire.** Elle ne contient aucune règle
  métier et elle est couverte par les 27 scénarios BDD.

## 7. Lacunes de spécification trouvées en écrivant les tests

Écrire les tests a obligé à trancher des points que l'énoncé ne précise pas. C'est un
résultat du projet à présenter, pas un défaut.

1. La casse des noms de projet est ignorée, mais les accents comptent : « Ecole » et « école » sont deux projets.
2. Quand plusieurs champs sont invalides, l'ordre des messages a dû être choisi.
3. Deux tâches de même titre sont acceptées dans un même projet.
4. Les 120 caractères sont comptés en unités JavaScript : un émoji compte pour 2.
5. L'année 0050 est refusée ; aucune plage d'années n'est définie.
6. Une échéance déjà passée est acceptée et rien n'indique un retard.
7. L'échéance est une date sans heure : une règle de retard dépendrait du fuseau horaire.
8. La progression est arrondie à l'entier le plus proche : 2 sur 3 donne 67 %.
9. Supprimer un projet supprime aussi ses tâches ; c'est définitif. Supprimer une tâche seule n'est pas prévu.
10. Le nom d'un projet n'a pas de longueur maximale, alors que le titre d'une tâche est limité à 120.
11. Les données sont propres à un navigateur : rien n'est partagé entre appareils.

## 8. Déroulé conseillé pour la démonstration (environ 10 minutes)

1. `npm run serve`, puis http://127.0.0.1:8081/ : créer deux projets, ajouter deux tâches, en cocher une, en déplacer une, puis supprimer un projet.
2. F12 > Application > IndexedDB > `todo-projets` : montrer les deux magasins, puis recharger la page pour montrer que les données restent.
3. `git log --oneline --reverse` : montrer les commits rouge, vert, refactor.
4. `npm test` : 408 tests en 3 secondes.
5. Ouvrir `web/test/pairwise/facteurs.js` : les classes d'équivalence. Expliquer 768 combinaisons ramenées à 96 cas.
6. Ouvrir `web/test/oracle.homothetie.test.js` : expliquer le cas où l'homothétie ne détecte rien.
7. `npm run test:bdd:voir` : le navigateur exécute les scénarios. Montrer le fichier `.feature` à côté.
8. Ouvrir `reports/mutation/index.html` : 97,24 %, expliquer les 4 survivants.
9. Montrer `.githooks/pre-push` et `.github/workflows/ci.yml`.
10. Terminer par les lacunes de spécification.

## 9. Questions probables et réponses courtes

**Pourquoi un dépôt en mémoire plutôt qu'IndexedDB dans les tests unitaires ?**
Pour la vitesse et la reproductibilité. Le test de contrat et l'oracle différentiel
prouvent que la doublure se comporte comme le vrai dépôt.

**Quelle différence entre TDD et BDD ?**
Le TDD vérifie que le code est bien construit, du point de vue du développeur, au niveau
des fonctions. Le BDD vérifie qu'on a construit le bon produit, du point de vue de
l'utilisateur, dans un langage que le client peut lire.

**Pourquoi le pairwise plutôt que toutes les combinaisons ?**
96 cas au lieu de 768, en couvrant toutes les interactions de deux valeurs. C'est le
minimum théorique ici : 12 valeurs d'échéance × 8 valeurs de titre.

**100 % de couverture, est-ce suffisant ?**
Non. Avec 100 % de couverture, le premier test de mutation ne donnait que 89,6 % : du
code était exécuté sans être vérifié.

**Qu'est-ce qu'un mutant équivalent ?**
Une modification du code qui ne change pas son comportement. Aucun test ne peut la tuer.
Exemple ici : comparer les noms en majuscules plutôt qu'en minuscules.

**Pourquoi la mutation ne tourne-t-elle pas à chaque push ?**
Elle dure environ une minute contre trois secondes pour les tests unitaires. Les tests
lents vont dans le pipeline de nuit.

**Peut-on contourner le hook pre-push ?**
Oui, avec `git push --no-verify`. C'est pour cela que le pipeline GitHub rejoue les tests
côté serveur.
