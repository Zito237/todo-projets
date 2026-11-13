# INF563 — To-Do par projets : TDD, BDD, pairwise, oracles et tests à chaque push

Application web de gestion de tâches rangées par projets, avec **comptes d'utilisateur**
(création de compte, connexion), sauvegardées dans l'**IndexedDB** du navigateur, entièrement testée **en JavaScript**. Le projet applique la séance 9 du cours
(niveaux de test, doublures, TDD, BDD avec Gherkin, intégration continue) et les techniques
du devoir sur l'équation du second degré : classes d'équivalence, pairwise, oracles de
référence, réflexif, par homothétie, métamorphiques et différentiel.

## Fonctionnalités

- Créer un compte : identifiant de 3 à 30 caractères (lettres sans accent, chiffres, `.`, `-`, `_`),
  unique sans tenir compte de la casse ; mot de passe de 8 à 64 caractères avec au moins une
  lettre et un chiffre, saisi deux fois.
- Se connecter, se déconnecter ; rester connecté après un rechargement de la page.
- Chaque utilisateur ne voit et ne modifie que **ses** projets et **ses** tâches.
- Créer des projets : nom obligatoire, unique sans tenir compte de la casse, liste triée.
- Ajouter une tâche dans un projet : titre obligatoire (120 caractères au plus), échéance facultative.
- Modifier une tâche : titre, échéance, **projet** (déplacer la tâche) ; annuler une modification.
- Supprimer un projet : ses tâches sont supprimées avec lui, après confirmation.
- Cocher une tâche terminée : les tâches à faire restent en haut.
- Compteur « x à faire sur y » et progression « n % terminé » pour chaque projet.
- Données conservées après rechargement ou fermeture de l'onglet (IndexedDB).

## Démarrer

```bash
npm install            # installe aussi le hook Git pre-push (voir plus bas)
npm run serve          # puis ouvrir l'adresse affichée : http://127.0.0.1:8081/
```

IndexedDB et les modules JavaScript exigent une adresse `http://` : ouvrir `index.html` par
double-clic (`file://`) ne fonctionne pas.

## Lancer les tests

| Commande | Ce qu'elle lance | Durée |
| --- | --- | --- |
| `npm test` | 1180 tests Vitest : TDD, classes, pairwise, oracles | ~5 s |
| `npm run test:couverture` | idem + couverture dans `coverage/` (100 % des lignes de `regles.js`, `service.js`, `regles-compte.js`, `comptes.js`, `hachage.js`) | ~6 s |
| `npm run test:bdd` | 59 scénarios Gherkin dans Google Chrome | ~1 min |
| `npm run test:bdd:voir` | idem en voyant le navigateur travailler | ~1 min |
| `npm run test:bdd -- --tags @compte` | un sous-ensemble par tag (ici les pages de compte) | |
| `npm run test:mutation` | test de mutation Stryker, rapport dans `reports/mutation/` | ~2 min |
| `npm run test:tout` | Vitest puis Cucumber | ~1 min |

Prérequis : Node.js 20 ou plus et Google Chrome. Sans Chrome :
`npx playwright install chromium` puis `PW_CHANNEL=chromium npm run test:bdd`.
Rapport BDD : `reports/cucumber/rapport.html` (capture d'écran jointe à chaque échec).

## La pyramide des tests

| Niveau | Fichiers | Outil | Doublures | Tests |
| --- | --- | --- | --- | --- |
| Unitaire (règles et services) | `web/test/service.*`, `comptes.*`, `classes-*`, `pairwise.*`, `oracle.*` | Vitest | fake `DepotMemoire`, fake du hacheur, horloge fixe, identifiants séquentiels | 952 |
| Intégration de composants (dépôt + API IndexedDB, hacheur + API Web Crypto) | `depot.contrat.test.js`, `oracle.differentiel.test.js`, différentiel de `oracle.comptes.test.js`, `hachage.test.js` | Vitest + fake-indexeddb | IndexedDB conforme, en mémoire ; vrai PBKDF2 | 27 + 37 + 151 + 13 |
| Système / acceptation (appli dans le navigateur) | `bdd/features/*.feature` | Cucumber-js + Playwright | aucune : vrai Chrome, vraie IndexedDB, vrai hachage | 59 scénarios |

Beaucoup de tests rapides en bas, peu de tests lents en haut. Une borne mal codée est
détectée par Vitest en quelques millisecondes, sans ouvrir de navigateur.

```
todo-projets/
├── web/                              l'application
│   ├── index.html, styles.css
│   ├── app.js                        interface (DOM) : aucune règle métier
│   ├── src/
│   │   ├── regles.js                 règles pures : titre, échéance, nom de projet
│   │   ├── service.js                TodoService : dépôt, horloge, générateur d'id et compte injectés
│   │   ├── regles-compte.js          règles pures : identifiant, mot de passe, confirmation
│   │   ├── comptes.js                ServiceComptes : créer un compte, se connecter
│   │   ├── hachage.js                empreinte salée du mot de passe (PBKDF2, Web Crypto)
│   │   └── depot-indexeddb.js        persistance IndexedDB
│   └── test/                         tests Vitest
│       ├── service.*.test.js         TDD : un fichier par fonctionnalité
│       ├── comptes.inscription / connexion .test.js, service.isolation.test.js   TDD des comptes
│       ├── classes-equivalence.test.js, classes-equivalence.comptes.test.js
│       ├── pairwise.ajout / modification / inscription / connexion .test.js
│       ├── oracle.reflexif / homothetie / metamorphique / differentiel / comptes .test.js
│       ├── hachage.test.js           contrat du hacheur (vrai et fake) + vecteur de référence
│       ├── outil.pairwise.test.js    vérifie le générateur pairwise lui-même
│       ├── pairwise/                 générateur pairwise + classes d'équivalence (facteurs.js, facteurs-compte.js)
│       ├── oracles/                  oracles de référence (reference.js, reference-compte.js)
│       └── doublures/                fake DepotMemoire, horloges, mise en place commune
├── bdd/
│   ├── features/gestion_taches.feature   projets et tâches (Gherkin français)
│   ├── features/comptes.feature          pages « Créer un compte » et « Se connecter »
│   ├── steps/todo.steps.js, comptes.steps.js   définitions d'étapes
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
| 8 | suppression d'un projet et de ses tâches (service + contrat du dépôt) | `supprimerProjet`, une seule transaction IndexedDB | |
| 9 | créer un compte : identifiant, mot de passe, confirmation, unicité, empreinte salée | `ServiceComptes.creerCompte`, `regles-compte.js`, `hachage.js` | |
| 10 | se connecter : bon couple, refus sans dire quel champ est faux | `ServiceComptes.connecter` | |
| 11 | isolation : chaque compte ne voit que ses projets et ses tâches | `compteId` injecté dans `TodoService` | les 408 tests précédents restent verts sans modification |

Les cycles 8 à 11 ont suivi le même ordre (tests écrits et vus en échec, puis code) mais ne
sont pas encore enregistrés dans Git.

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

Les pages de compte ont leurs classes dans `web/test/pairwise/facteurs-compte.js`, testées une à
la fois dans `classes-equivalence.comptes.test.js` :

| Entrée | Classes valides | Classes invalides |
| --- | --- | --- |
| Identifiant (création) | I1 ordinaire, I2 3 caractères, I3 30 caractères, I4 espaces autour, I5 majuscules, chiffres, `.`, `-`, `_` | I6 2 caractères, I7 31 caractères, I8 vide, I9 espaces seuls, I10 absent, I11 espace intérieur, I12 lettre accentuée, I13 à I15 caractère interdit au milieu, au début, à la fin |
| Mot de passe (création) | M1 ordinaire, M2 8 caractères, M3 64 caractères, M4 espaces et symboles conservés | M5 7 caractères, M6 65 caractères, M7 vide, M8 absent, M9 lettres seules, M10 chiffres seuls |
| Confirmation | K1 identique | K2 différente, K3 vide, K4 différente par la casse |
| État de la base (création) | S1 aucun compte, S2 deux autres comptes | S3 identifiant déjà pris, S4 déjà pris avec une autre casse |
| Identifiant saisi (connexion) | C1 exact, C2 autre casse, C3 espaces autour | C4 inconnu, C5 celui d'un autre compte, C6 préfixe du bon, C7 vide, C8 espaces seuls, C9 absent |
| Mot de passe saisi (connexion) | W1 correct | W2 incorrect, W3 autre casse, W4 espace ajouté, W5 préfixe du bon, W6 celui d'un autre compte, W7 vide, W8 absent |

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
| Créer un compte | identifiant (15) × mot de passe (10) × confirmation (4) × état de la base (4) | 2400 | **150** |
| Se connecter | identifiant saisi (9) × mot de passe saisi (8) × état de la base (3) | 216 | **72** |

96, 36, 150 et 72 sont le minimum théorique (produit des deux plus grands facteurs). Comme dans le
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

Les mêmes oracles sont appliqués aux pages de compte :

| Oracle | Fichier | Relation vérifiée | Cas |
| --- | --- | --- | --- |
| Référence | `pairwise.inscription.test.js`, `pairwise.connexion.test.js` | résultat = celui que prédit `oracles/reference-compte.js` ; un refus n'enregistre rien ; se connecter n'écrit jamais | 150 + 72 |
| Référence externe | `hachage.test.js` | l'empreinte de « password » / « salt » est la valeur publiée pour PBKDF2-HMAC-SHA-256 | 1 |
| Implicite | `pairwise.*.test.js`, `hooks.js` | toute erreur est une `ErreurValidation` avec un message | tous |
| Aller-retour | `pairwise.inscription.test.js` | un compte créé permet de se connecter avec les mêmes données | chaque succès |
| Réflexif | `oracle.comptes.test.js` | `valider(valider(x)) = valider(x)` ; se connecter deux fois donne le même résultat ; s'inscrire deux fois ne change plus la base | 5 + 72 + 1 |
| Métamorphique | `oracle.comptes.test.js` | MR1 casse et espaces de l'identifiant sans effet, MR2 ordre de création des comptes sans effet, MR3 un nouveau compte ne change rien pour les autres, MR4 même refus pour identifiant inconnu et mauvais mot de passe, MR5 le compte public ne dépend pas du mot de passe | 186 |
| Différentiel | `oracle.comptes.test.js` | création puis connexion sur le fake et sur IndexedDB : mêmes résultats ; connexion après réouverture de la base | 150 + 1 |
| Homothétie | aucun | **ne s'applique pas** : un identifiant ou un mot de passe ne se multiplie pas par k | 0 |

**Un oracle peut être faux.** La première version de l'oracle de référence de la connexion
prédisait un refus pour le cas « identifiant d'un autre compte » × « mot de passe de cet autre
compte ». C'est une connexion valide, au compte de l'autre. Personne n'aurait écrit ce cas à la
main : le pairwise l'a produit, le test a échoué, et c'est l'oracle qui a été corrigé, pas le code.

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

Après ajout de ces tests (`service.mutants.test.js`) : **97,2 %**.

Avec les comptes, Stryker mute aussi `regles-compte.js` et `comptes.js`. Premier passage :
2 mutants jamais exécutés, l'horloge et le générateur d'identifiants par défaut de
`ServiceComptes`, exactement le trou déjà trouvé sur `TodoService`. Après ajout du test :
**98,57 %** (276 mutants détectés sur 280), dont 100 % sur `service.js`, `regles-compte.js` et
`comptes.js`. Les classes I14 et I15 (caractère interdit au début et à la fin) ont été
prévues dès le départ grâce à la leçon des ancres `^` et `$` de l'échéance.

Les 4 survivants, tous dans `regles.js`, ont été examinés :

- deux sont **équivalents** : les contrôles du mois et du jour de `validerEcheance` sont
  redondants, car un débordement de jour change toujours de mois ;
- un est **équivalent** : comparer les noms en majuscules plutôt qu'en minuscules ;
- un révèle une **lacune de spécification** (n°1 ci-dessous) : l'ordre de « Ecole » et « école ».

## 3. BDD : la spécification exécutable, en JavaScript

Deux fichiers écrits en Gherkin français (`# language: fr`) : `bdd/features/gestion_taches.feature`
(projets et tâches, 27 scénarios joués connecté) et `bdd/features/comptes.feature` (pages
« Créer un compte » et « Se connecter », 32 scénarios). On y trouve :

- une Fonctionnalité avec son récit « Afin de / En tant que / Je veux » ;
- un **Contexte** commun ;
- des scénarios Soit / Quand / Alors, c'est-à-dire le schéma AAA ;
- des **Plans du scénario** avec Exemples : bornes du titre (1, 120, 121), progression (0, 33, 67, 100 %),
  bornes de l'identifiant (2, 3, 30, 31), bornes du mot de passe (7, 8, 64, 65), une classe
  invalide par ligne pour la création de compte et pour la connexion.

Tags : `@projet`, `@ajout`, `@modification`, `@suppression`, `@progression`, `@persistance`, `@negatif`, `@limite`,
et pour les comptes `@compte`, `@inscription`, `@connexion`, `@isolation`, `@securite`.

Ce que vérifient les scénarios de compte : création d'un compte et connexion directe, refus
avec le message exact, identifiant déjà pris, connexion sans tenir compte de la casse, même
message pour un identifiant inconnu et un mauvais mot de passe, champ du mot de passe vidé
après un refus, déconnexion, session conservée après rechargement, projets invisibles pour un
autre utilisateur, et mot de passe absent de tout ce que le navigateur conserve (IndexedDB,
`localStorage`, `sessionStorage`).

Cucumber-js relie chaque phrase type à une définition d'étape (`bdd/steps/*.steps.js`)
qui pilote un vrai Chrome avec Playwright. Choix pour des scénarios **reproductibles** :

- un contexte de navigation neuf par scénario, donc une IndexedDB vide : aucun scénario ne dépend d'un autre ;
- aucune pause fixe : on attend que l'application signale la fin de son rendu (`data-rendu`), 10 s au plus ;
- langue, fuseau horaire (`Africa/Douala`) et taille d'écran fixés ;
- serveur web démarré sur un port libre, navigateur lancé une seule fois pour la campagne ;
- oracle implicite : un scénario échoue si la page lève une erreur JavaScript.

Les étapes ont été vérifiées en cassant l'application : un déplacement de tâche ignoré et
une progression mal affichée font échouer 6 scénarios, avec capture d'écran au rapport.
Même vérification pour les comptes : sans filtre par compte et sans effacement du mot de
passe refusé, 6 scénarios `@isolation` et `@negatif` échouent.

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
9. **Suppression.** Supprimer un projet supprime aussi ses tâches, après une confirmation qui en annonce le nombre ; c'est définitif (pas de corbeille). Supprimer une tâche seule n'est pas prévu.
10. **Longueur du nom de projet.** Aucune longueur maximale n'est fixée, contrairement au titre d'une tâche (120).
11. **Portée des données.** IndexedDB est propre à un navigateur : rien n'est partagé entre
    appareils, et effacer les données du navigateur efface les comptes et les tâches.
12. **Comptes sans serveur.** Les comptes sont enregistrés dans le navigateur. Ils séparent les
    données de plusieurs personnes sur un même poste, mais ne protègent pas contre quelqu'un
    qui ouvre les outils de développement : il peut lire les projets et les empreintes. Une
    vraie protection demande un serveur.
13. **Priorité des refus d'un compte.** À la création : identifiant, mot de passe, confirmation,
    puis seulement « identifiant déjà utilisé ». À la connexion : identifiant vide, mot de passe
    vide, puis « Identifiant ou mot de passe incorrect » sans dire lequel.
14. **Règles de l'identifiant et du mot de passe.** L'énoncé ne les donne pas. Choix : 3 à 30
    caractères sans accent pour l'identifiant ; 8 à 64 caractères avec une lettre et un chiffre
    pour le mot de passe, espaces comptés, casse respectée.
15. **Mot de passe oublié, changement de mot de passe, suppression de compte.** Non prévus.
    Sans serveur ni adresse électronique, un mot de passe oublié ne peut pas être récupéré.
16. **Durée de la session.** On reste connecté jusqu'à la déconnexion, même après fermeture du
    navigateur. Aucune expiration, aucun blocage après plusieurs échecs de connexion.
17. **Données d'avant les comptes.** Les projets créés avant l'ajout des comptes n'appartiennent
    à personne : ils restent dans la base mais ne sont plus affichés.
