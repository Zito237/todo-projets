# Explication du projet « To-Do par projets » (INF563)

Ce document résume ce qui a été fait, ce qu'il faut savoir et ce qu'il faut dire au
professeur. Tous les chiffres ci-dessous ont été obtenus en exécutant le projet le
13/11/2026 sur ce poste (Windows 11, Node 24, Google Chrome).

## 1. Le projet en une minute

C'est une application web de gestion de tâches rangées par projets, avec des comptes
d'utilisateur : chacun crée son compte, se connecte et ne voit que ses données. Les données sont
enregistrées dans l'**IndexedDB** du navigateur : il n'y a ni serveur applicatif ni base
de données distante. Tout est écrit en JavaScript, sans framework.

Le but du projet n'est pas l'application elle-même, mais la **façon de la tester**. Il
applique la séance 9 du cours (pyramide des tests, doublures, TDD, BDD, intégration
continue) et les techniques du devoir sur l'équation du second degré (classes
d'équivalence, pairwise, oracles).

Ce que fait l'application :

- créer un compte, se connecter, se déconnecter (section 5.10) ;
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
| Base `todo-projets`, version 2 | créée à la première ouverture de la page |
| Magasin `comptes` (clé `id`) | `id`, `identifiant`, `sel`, `empreinte`, `creeLe` ; jamais le mot de passe |
| Magasin `projets` (clé `id`) | `id`, `nom`, `creeLe`, `compteId` (le propriétaire) |
| Magasin `taches` (clé `id`) | `id`, `projetId`, `titre`, `echeance`, `terminee`, `creeLe`, `modifieLe` |
| Index `parProjet` sur `taches` | retrouve les tâches d'un projet par `projetId` |

L'identifiant du compte connecté est gardé à part, dans **Stockage > Stockage local**,
sous la clé `todo-session`.

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
| `npm test` | **1180 tests réussis sur 1180** (24 fichiers) | 5 à 9 s |
| `npm run test:couverture` | 100 % de `regles.js`, `service.js`, `regles-compte.js`, `comptes.js`, `hachage.js` ; 98 % de `depot-indexeddb.js` | 6 s |
| `npm run test:bdd` | **59 scénarios réussis sur 59** (333 étapes) | environ 1 min |
| `npm run test:mutation` | **98,57 %** : 276 mutants détectés sur 280, 4 survivants | environ 2 min |

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
  src/service.js           TodoService : les opérations sur les projets et les tâches
  src/regles-compte.js     règles pures : identifiant, mot de passe, confirmation
  src/comptes.js           ServiceComptes : créer un compte, se connecter
  src/hachage.js           empreinte du mot de passe (PBKDF2)
  src/depot-indexeddb.js   enregistrement dans IndexedDB
  test/                    tests Vitest
bdd/
  features/gestion_taches.feature   scénarios Gherkin : projets et tâches
  features/comptes.feature          scénarios Gherkin : créer un compte, se connecter
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

Il y a 11 cycles : nom de projet obligatoire, nom unique et liste triée, ajout de tâche,
modification, terminer une tâche, persistance IndexedDB, statistiques, suppression d'un
projet, création de compte, connexion, isolation entre comptes. Les quatre derniers sont
faits mais pas encore enregistrés dans Git.

### 5.2 La pyramide des tests

| Niveau | Outil | Ce qui est réel | Nombre |
| --- | --- | --- | --- |
| Unitaire | Vitest | rien : dépôt en mémoire, doublure du hacheur, horloge fixe | 952 tests |
| Intégration | Vitest + fake-indexeddb | l'API IndexedDB, simulée en mémoire ; le vrai hachage PBKDF2 | 228 tests |
| Système | Cucumber-js + Playwright | Chrome et la vraie IndexedDB | 59 scénarios |

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
| Créer un compte | 2400 | 150 |
| Se connecter | 216 | 72 |

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
- Après ajout des tests manquants (`service.mutants.test.js`) : 97,2 %.
- Avec le code des comptes, lui-même à 100 % : **98,57 %** au total.
- Les 4 survivants ont été analysés : 3 sont des mutants équivalents (le code modifié se
  comporte exactement comme l'original) et 1 révèle une lacune de la spécification
  (l'ordre de « Ecole » et « école » dans la liste).

À dire : la couverture indique que le code est exécuté, la mutation indique qu'il est
vérifié.

### 5.7 BDD : la spécification exécutable

`bdd/features/gestion_taches.feature` décrit le comportement en français avec Gherkin
(Soit / Quand / Alors). Cucumber-js lit ces phrases et Playwright pilote un vrai Chrome.

- Deux fichiers : `gestion_taches.feature` (27 exécutions) et `comptes.feature` (32 exécutions), soit 59.
- 38 scénarios écrits, dont 6 « Plans du scénario » avec tableau d'exemples.
- Tags : `@projet`, `@ajout`, `@modification`, `@suppression`, `@progression`, `@persistance`, `@negatif`, `@limite`, `@compte`, `@inscription`, `@connexion`, `@isolation`, `@securite`.
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

### 5.10 Comptes : pages « Créer un compte » et « Se connecter » (ajoutées le 13/11/2026)

N'importe qui peut créer un compte, se connecter, puis faire tout ce qui existait déjà
(projets, tâches, modification, suppression). Chaque utilisateur ne voit que ses données.

**Les règles**

| Champ | Règle |
| --- | --- |
| Identifiant | 3 à 30 caractères : lettres sans accent, chiffres, point, tiret, tiret bas. Unique sans tenir compte de la casse. Espaces autour retirés. |
| Mot de passe | 8 à 64 caractères, au moins une lettre et un chiffre. Jamais modifié : un espace compte, la casse compte. |
| Confirmation | Doit être identique au mot de passe. |
| Connexion | L'identifiant est reconnu sans tenir compte de la casse. Un identifiant inconnu et un mauvais mot de passe donnent le même message : « Identifiant ou mot de passe incorrect ». |
| Session | On reste connecté après un rechargement, jusqu'à « Se déconnecter ». |

L'énoncé ne donnait pas ces règles : ce sont mes choix, à faire valider.

**Comment c'est construit**

- `web/src/regles-compte.js` : les règles pures (identifiant, mot de passe, confirmation).
- `web/src/comptes.js` : `ServiceComptes`, avec `creerCompte` et `connecter`.
- `web/src/hachage.js` : le mot de passe n'est **jamais enregistré**. On enregistre une
  empreinte calculée avec PBKDF2 (100 000 tours) et un sel aléatoire propre à chaque compte.
- `TodoService` reçoit le compte connecté (`compteId`). Le projet d'un autre compte est
  traité comme s'il n'existait pas.
- La base IndexedDB passe en version 2 avec un magasin `comptes`.

Le hacheur est **injecté**, comme l'horloge : le vrai est lent exprès (c'est ce qui protège
les mots de passe), donc les tests unitaires utilisent une doublure immédiate. Un test de
contrat vérifie que la doublure et le vrai hacheur respectent les mêmes propriétés.

**Les tests appliqués aux deux pages, technique par technique**

| Technique | Ce qui a été fait | Nombre |
| --- | --- | --- |
| TDD | tests écrits d'abord et vus en échec, puis le code | 19 (création) + 10 (connexion) + 9 (isolation) |
| Classes d'équivalence | 15 classes d'identifiant, 10 de mot de passe, 4 de confirmation, 9 et 8 pour la connexion, une classe à la fois | 73 |
| Valeurs limites | identifiant 2, 3, 30, 31 ; mot de passe 7, 8, 64, 65 | dans les classes et en BDD |
| Pairwise, création de compte | 15 × 10 × 4 × 4 = 2400 combinaisons | 150 cas |
| Pairwise, connexion | 9 × 8 × 3 = 216 combinaisons | 72 cas |
| Oracle de référence | `oracles/reference-compte.js` prédit succès ou champ en erreur ; un refus n'enregistre rien | sur les 222 cas |
| Oracle réflexif | se connecter deux fois donne le même résultat ; `valider(valider(x)) = valider(x)` | 78 |
| Oracles métamorphiques | 5 relations, voir ci-dessous | 186 |
| Oracle différentiel | mêmes opérations sur le dépôt en mémoire et sur IndexedDB | 151 |
| Oracle de référence externe | l'empreinte de « password » / « salt » est la valeur publiée de PBKDF2 | 1 |
| Mutation | `regles-compte.js` et `comptes.js` : 100 % | 120 mutants |
| BDD | `bdd/features/comptes.feature`, dans un vrai Chrome | 32 scénarios |

Les cinq relations métamorphiques :

1. changer la casse de l'identifiant ou l'entourer d'espaces ne change pas le résultat ;
2. l'ordre de création des comptes ne change pas le résultat d'une connexion ;
3. créer un compte de plus ne change rien pour les autres ;
4. un identifiant inconnu et un mauvais mot de passe donnent exactement le même refus ;
5. le compte créé ne dépend pas du mot de passe choisi.

**L'oracle par homothétie ne s'applique pas ici** : un identifiant ou un mot de passe ne
se multiplie pas par k. Il vaut mieux le dire que d'inventer un test qui ne vérifie rien.

**Trois choses à raconter au professeur**

1. **Le pairwise a trouvé une erreur dans l'oracle, pas dans le code.** Sur 1177 tests, un
   seul a échoué au premier lancement : « identifiant d'un autre compte » avec « mot de
   passe de cet autre compte ». Mon oracle de référence prédisait un refus. Or c'est une
   connexion valide, au compte de l'autre. Je n'aurais jamais écrit ce cas à la main. J'ai
   corrigé l'oracle. Leçon : un oracle est aussi du code, il peut être faux.
2. **La mutation a retrouvé le même trou qu'avant.** Premier passage : 2 mutants jamais
   exécutés, l'horloge et le générateur d'identifiants par défaut de `ServiceComptes`.
   C'est exactement le trou déjà trouvé sur `TodoService`. Un test a été ajouté.
3. **La leçon des ancres a servi.** Sur l'échéance, la mutation avait montré qu'on pouvait
   retirer `^` ou `$` de l'expression régulière sans être vu. Pour l'identifiant, j'ai donc
   prévu dès le départ les classes « caractère interdit au début » et « à la fin » :
   aucun mutant n'a survécu.

Les scénarios BDD ont aussi été vérifiés en cassant l'application : sans filtre par compte
et sans effacement du mot de passe refusé, 6 scénarios échouent.

**Limite à dire clairement.** Il n'y a pas de serveur : les comptes sont dans le navigateur.
Ils séparent les données de plusieurs personnes sur un même poste, mais quelqu'un qui ouvre
les outils de développement (F12) peut lire les projets de tout le monde et les empreintes.
Les mots de passe, eux, ne sont lisibles nulle part : un scénario BDD le vérifie. Une vraie
protection demanderait un serveur.

## 6. Points à signaler honnêtement

- **Les comptes, la suppression et la correction du serveur ne sont pas encore dans un commit.**
- **Les comptes ne remplacent pas un serveur** (voir la limite en fin de section 5.10).
- **Les projets créés avant l'ajout des comptes ne sont plus affichés.** Ils restent dans la
  base, sans propriétaire. Il faut recréer vos projets de démonstration après avoir créé un compte.

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
  métier et elle est couverte par les 59 scénarios BDD.

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
12. Les règles de l'identifiant et du mot de passe n'étaient pas données : elles ont été choisies.
13. L'ordre des messages de refus d'un compte a dû être choisi.
14. Mot de passe oublié, changement de mot de passe, suppression de compte : non prévus.
15. La session n'expire jamais et rien ne bloque après plusieurs échecs de connexion.
16. Les projets créés avant l'ajout des comptes n'appartiennent à personne.

## 8. Déroulé conseillé pour la démonstration (environ 10 minutes)

1. `npm run serve`, puis http://127.0.0.1:8081/ : créer un compte, créer deux projets, ajouter deux tâches, en cocher une, en déplacer une, supprimer un projet. Se déconnecter, créer un second compte : il ne voit aucun projet.
2. F12 > Application > IndexedDB > `todo-projets` : montrer les trois magasins, et dans `comptes` l'empreinte à la place du mot de passe, puis recharger la page pour montrer que les données restent.
3. `git log --oneline --reverse` : montrer les commits rouge, vert, refactor.
4. `npm test` : 1180 tests en quelques secondes.
5. Ouvrir `web/test/pairwise/facteurs.js` : les classes d'équivalence. Expliquer 768 combinaisons ramenées à 96 cas.
6. Ouvrir `web/test/oracle.homothetie.test.js` : expliquer le cas où l'homothétie ne détecte rien.
7. `npm run test:bdd:voir` : le navigateur exécute les scénarios. Montrer le fichier `.feature` à côté.
8. Ouvrir `reports/mutation/index.html` : 98,57 %, expliquer les 4 survivants.
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

**Où est enregistré le mot de passe ?**
Nulle part. On enregistre une empreinte PBKDF2 avec un sel propre à chaque compte. À la
connexion, on recalcule l'empreinte du mot de passe saisi et on compare.

**Pourquoi une doublure pour le hacheur ?**
Le vrai fait 100 000 tours pour être lent : c'est ce qui protège les mots de passe. Avec
lui, les 1180 tests dureraient plusieurs minutes. La doublure répond tout de suite, et un
test de contrat vérifie qu'elle a les mêmes propriétés que le vrai.

**Pourquoi le même message pour un identifiant inconnu et un mauvais mot de passe ?**
Pour ne pas révéler quels identifiants existent. C'est vérifié par une relation
métamorphique et par un scénario BDD.

**Ces comptes sont-ils sûrs ?**
Les mots de passe, oui : ils ne sont lisibles nulle part. Les données, non : sans serveur,
quelqu'un qui ouvre les outils du navigateur lit toute la base. Les comptes séparent les
utilisateurs d'un même poste, ils ne remplacent pas un serveur.

**Pourquoi pas d'oracle par homothétie sur les comptes ?**
Parce qu'aucune grandeur ne s'y multiplie. Un oracle ne vaut que s'il peut échouer.
