# Pairwise et oracles : comment les cas de test sont choisis et jugés

INF563, application To-Do par projets avec comptes utilisateurs.

Ce document explique les deux notions qui organisent la plupart des tests du projet :

- **le pairwise** répond à la question « quelles entrées tester ? » (section 1) ;
- **les oracles** répondent à la question « comment savoir si la réponse est juste ? » (section 2).

Le rôle de chaque fichier de test est décrit dans [enseignant.md](enseignant.md) ; les chiffres des dernières exécutions sont dans [test.md](test.md).

## 1. Le pairwise en détail

### 1.1 Le vocabulaire

| Terme | Définition | Exemple dans le projet |
| --- | --- | --- |
| **Facteur** | une entrée qui peut varier dans le test | le mot de passe saisi à l'inscription |
| **Classe** (ou valeur du facteur) | un groupe de valeurs que la spécification traite de la même façon ; on en teste un seul représentant | « mot de passe sans chiffre », représenté par `abcdefgh` |
| **Paire** | deux classes prises dans deux facteurs différents | « mot de passe sans chiffre » avec « identifiant déjà pris » |
| **Cas** | une combinaison complète : une classe par facteur | `identifiant=I1 motDePasse=M2 confirmation=K2 etat=S2` |
| **Produit cartésien** | toutes les combinaisons possibles | 15 × 10 × 4 × 4 = 2400 pour l'inscription |
| **Pairwise** | le plus petit ensemble de cas trouvé tel que chaque paire apparaisse au moins une fois | 150 cas pour l'inscription |

### 1.2 D'où viennent les nombres de classes (4, 7, 10, 15…)

Le nombre de classes d'un facteur n'est pas choisi au hasard : il découle de l'analyse de la règle. Pour chaque règle, on retient :

- **les valeurs valides ordinaires** ;
- **les deux bornes valides** (la plus petite et la plus grande valeur acceptée) ;
- **les valeurs juste hors des bornes** ;
- **les cas particuliers** : vide, absent, espaces, casse, caractère interdit…

Exemple avec le **mot de passe à l'inscription : 10 classes (M1 à M10)**. La règle est « 8 à 64 caractères, au moins une lettre et un chiffre ».

| Classe | Valeur testée | Ce qu'elle représente | Valide |
| --- | --- | --- | --- |
| M1 | `Soleil2026` | un mot de passe ordinaire | oui |
| M2 | `abcdefg1` | 8 caractères, borne basse | oui |
| M3 | 63 « a » puis « 1 » | 64 caractères, borne haute | oui |
| M4 | ` mot de passe n°1 ! ` | espaces et symboles, conservés tels quels | oui |
| M5 | `abcdef1` | 7 caractères, juste sous la borne | non |
| M6 | 64 « a » puis « 1 » | 65 caractères, juste au-dessus | non |
| M7 | chaîne vide | champ laissé vide | non |
| M8 | `undefined` | champ absent du formulaire | non |
| M9 | `abcdefgh` | lettres seulement | non |
| M10 | `12345678` | chiffres seulement | non |

Exemple avec la **confirmation : 4 classes (K1 à K4)**.

| Classe | Ce qu'elle représente | Pourquoi elle est retenue |
| --- | --- | --- |
| K1 | identique au mot de passe | le cas normal |
| K2 | complètement différente | la faute de frappe ordinaire |
| K3 | vide | l'utilisateur a oublié le second champ |
| K4 | différente seulement par la casse (`sOLEIL2026`) | vérifie que la comparaison ne néglige pas les majuscules |

Les autres facteurs suivent le même raisonnement :

| Facteur | Classes | Origine |
| --- | --- | --- |
| Identifiant (inscription) | 15 | règle « 3 à 30 caractères, lettres sans accent, chiffres, `.` `_` `-` » : 5 valides (ordinaire, 3, 30, espaces autour, tous les caractères permis) et 10 invalides (2, 31, vide, espaces seuls, absent, espace intérieur, accent, caractère interdit au début, au milieu, à la fin) |
| État de la base (inscription) | 4 | base vide, autres comptes présents, identifiant déjà pris écrit pareil, déjà pris avec une autre casse |
| Identifiant saisi (connexion) | 9 | exact, autre casse, espaces autour, inconnu, celui d'un autre compte, préfixe du bon, vide, espaces seuls, absent |
| Mot de passe saisi (connexion) | 8 | correct, incorrect, autre casse, espace en plus, préfixe du bon, celui de l'autre compte, vide, absent |
| État de la base (connexion) | 3 | compte visé créé en premier, en dernier, parmi quatre comptes |
| Titre d'une tâche | 8 | règle « 1 à 120 caractères » : ordinaire, 1, 120, espaces autour, 121, vide, espaces seuls, absent |
| Échéance | 12 | règle « date AAAA-MM-JJ facultative » : absente, vide, ordinaire, 29 février bissextile, 31 décembre, 29 février non bissextile, 31 avril, format JJ/MM/AAAA, mois 13, date suivie d'une heure, texte avant la date, année 0050 |

Chaque classe porte un code (M5, K3, S4…) qui sert à nommer les tests. Quand un test échoue, son nom indique donc immédiatement la combinaison en cause. Attention : les codes I1 à I3 désignent l'identifiant dans les comptes, mais la tâche de départ dans le pairwise de modification.

### 1.3 Sur quoi le pairwise est appliqué

Le pairwise est appliqué à **cinq opérations des services**, testées sans navigateur avec le dépôt en mémoire :

| Jeu de cas | Opération testée | Facteurs (nombre de classes) | Produit cartésien | Paires à couvrir | Cas pairwise |
| --- | --- | --- | --- | --- | --- |
| Ajout | `ajouterTache` : ajouter une tâche | titre (8), échéance (12), projet (2), contenu du projet (4) | 768 | 224 | 96 |
| Modification | `modifierTache` : modifier ou déplacer une tâche | titre (6), échéance (6), projet (4), tâche de départ (3) | 432 | 132 | 36 |
| Composition | `statistiques` d'un projet | tâches à faire (4), terminées (4), facteur k (3), ordre de saisie (3) | 144 | 73 | 16 |
| Inscription | `creerCompte` : page « Créer un compte » | identifiant (15), mot de passe (10), confirmation (4), état de la base (4) | 2400 | 366 | 150 |
| Connexion | `connecter` : page « Se connecter » | identifiant saisi (9), mot de passe saisi (8), état de la base (3) | 216 | 123 | 72 |

Les cas ne servent pas qu'aux fichiers `pairwise.*.test.js`. Ils fournissent aussi les données des oracles :

| Cas pairwise | Réutilisés par |
| --- | --- |
| les 13 cas d'ajout qui aboutissent | l'oracle réflexif des tâches |
| les 16 cas de composition | les oracles par homothétie et métamorphiques |
| les 36 cas de modification | l'oracle différentiel des tâches |
| les 150 cas d'inscription | l'oracle différentiel des comptes |
| les 72 cas de connexion | l'oracle réflexif et les relations MR1 et MR3 des comptes |

Le pairwise n'est pas appliqué à l'interface : les scénarios BDD en couvrent les parcours, mais ne combinent pas les classes.

### 1.4 Lire un cas : ce que fait réellement le test

Prenons le cas d'inscription `identifiant=I1 motDePasse=M2 confirmation=K2 etat=S2` :

1. **Préparation :** l'état S2 (deux autres comptes) crée d'abord les comptes `zoe.autre1` et `zoe.autre2`.
2. **Saisie :** identifiant `awa.ngono` (I1), mot de passe `abcdefg1` (M2, borne basse valide), confirmation `AutreChose99` (K2, différente).
3. **Prédiction de l'oracle de référence :** l'identifiant et le mot de passe sont valides, la confirmation ne l'est pas, donc refus sur le champ `confirmation`.
4. **Vérifications :** l'erreur est bien une `ErreurValidation` avec un message (oracle implicite) ; le champ en cause est `confirmation` (oracle de référence) ; la base contient toujours exactement les deux comptes de départ (absence d'effet).

Le cas de connexion `identifiant=C5 motDePasse=W6 etat=B1` est celui qui a révélé l'erreur de l'oracle (section 5.1 de [enseignant.md](enseignant.md)) : l'identifiant `binta` avec le mot de passe de `binta` est une connexion valide, au compte de `binta`.

### 1.5 Pourquoi exactement 150 cas, et pas moins

Pour l'inscription, les deux plus grands facteurs sont l'identifiant (15 classes) et le mot de passe (10 classes). Il existe donc 15 × 10 = 150 paires « identifiant × mot de passe » différentes, et un cas n'en contient qu'une. Il faut au moins 150 cas : c'est le minimum théorique. Le générateur atteint ce minimum sur les cinq jeux (8 × 12 = 96, 6 × 6 = 36, 4 × 4 = 16, 15 × 10 = 150, 9 × 8 = 72), et le fichier `outil.pairwise.test.js` vérifie qu'il ne descend jamais en dessous.

On obtient ainsi entre 3 et 16 fois moins de cas que le produit cartésien (2400 / 150 = 16 pour l'inscription), en couvrant toutes les interactions entre deux facteurs.

### 1.6 La limite du pairwise dans ce projet : l'effet de masquage

Quand un cas contient une classe invalide, le service refuse dès le premier champ fautif. Les autres classes du cas ne sont alors jamais vraiment exercées : elles sont masquées. Répartition des cas, d'après l'oracle de référence :

| Jeu | Cas | Aboutissent | Refus sur le 1er champ | Refus sur un champ suivant |
| --- | --- | --- | --- | --- |
| Inscription | 150 | 3 | 100 sur l'identifiant | 30 mot de passe, 15 confirmation, 2 identifiant déjà pris |
| Connexion | 72 | 4 | 24 sur l'identifiant | 12 mot de passe vide, 32 « identifiant ou mot de passe incorrect » |
| Ajout | 96 | 13 | 18 sur le projet | 44 titre, 21 échéance |

Pour l'inscription, la combinaison « identifiant valide et déjà pris » n'apparaît donc que 2 fois, et un compte n'est créé que dans 3 cas.

Ce manque est compensé ailleurs :

- les tests de classes d'équivalence (section 7 de [enseignant.md](enseignant.md)) essaient chaque classe seule, les autres champs étant valides ;
- les tests TDD testent explicitement « identifiant déjà pris », y compris avec une autre casse ;
- la relation métamorphique MR5 des comptes crée un compte pour chaque classe d'identifiant valide.

**Amélioration possible :** la pratique recommandée est de faire le pairwise sur les seules classes valides, et de tester les classes invalides une à la fois. Elle n'a pas été appliquée ici ; c'est une piste à mentionner.

## 2. Les oracles en détail

### 2.1 Définition

Un **oracle** est le moyen de décider si le résultat d'un test est correct. Exécuter le programme est facile ; savoir ce qu'il aurait dû répondre est souvent le plus difficile : c'est le **problème de l'oracle**. Il devient aigu avec le pairwise, qui produit des centaines de cas que personne n'a calculés à la main.

Le projet utilise donc plusieurs sortes d'oracles. Les uns prédisent le résultat exact ; les autres vérifient seulement une propriété que tout résultat correct doit respecter.

### 2.2 Oracle de référence (oracle de spécification)

**Définition.** Une seconde écriture du comportement attendu, faite à partir de la spécification et indépendante du code testé. Elle prédit le résultat de chaque cas.

**Dans le cours.** La formule du discriminant permet de prédire les racines attendues de l'équation du second degré.

**Dans le projet.** Les fonctions de `oracles/reference.js` et `oracles/reference-compte.js` lisent les classes d'un cas et répondent « refus sur tel champ » ou « succès, avec telle valeur ». Exemple : pour `identifiant=I6` (2 caractères), `attenduInscription` répond « refus sur `identifiant` » sans jamais appeler `ServiceComptes`.

**Utilisé par :** les 354 cas pairwise et les 96 tests de classes d'équivalence.

**Limite.** Il peut se tromper comme le code, puisqu'il est écrit par la même personne. C'est arrivé ici, avec le cas C5 × W6 : quand le code et l'oracle sont en désaccord, il faut chercher lequel des deux a raison.

**Variante, l'oracle de référence externe :** `hachage.test.js` compare l'empreinte calculée à la valeur publiée de PBKDF2-HMAC-SHA-256 pour « password » et « salt » en 1 tour. Cette valeur ne vient pas de l'auteur du projet ; elle ne peut donc pas partager son erreur.

### 2.3 Oracle implicite

**Définition.** Une propriété que tout résultat doit respecter, quel que soit le cas, sans connaître le résultat attendu.

**Dans le projet.** Toute erreur doit être une `ErreurValidation` avec un nom, un message non vide et un champ. Jamais une `TypeError` ni un plantage. Exemple : pour un identifiant `undefined` (I10), le code ne doit pas planter sur `undefined.trim()` ; il doit répondre « L'identifiant est obligatoire ».

**Utilisé par :** chaque cas pairwise en refus.

### 2.4 Oracle d'absence d'effet

**Définition.** On photographie l'état du système avant l'opération et après ; pour une opération refusée, ou une simple lecture, les deux photographies doivent être identiques.

**Dans le cours.** C'est l'équivalent du `verify(..., never())` de Mockito (séance 9) : vérifier qu'une chose n'a pas eu lieu.

**Dans le projet.** Les fonctions `etat(service)` et `etatComptes(depot)` font les photographies. Exemple : une modification qui change le titre mais donne une échéance invalide ne doit pas enregistrer le nouveau titre à moitié. Autre exemple : une connexion, même réussie, ne doit rien écrire dans la base.

**Utilisé par :** les quatre fichiers `pairwise.*.test.js`, `service.modification.test.js` et `comptes.connexion.test.js`.

### 2.5 Oracle réflexif

**Définition.** On compare le système à lui-même. Une opération qui ne devrait rien changer, ou une opération suivie de son inverse, doit ramener exactement à l'état de départ. Refaire la même chose doit redonner le même résultat.

**Dans le projet :**

| Relation | Exemple |
| --- | --- |
| identité | modifier une tâche avec ses propres valeurs ne change que `modifieLe` |
| involution | cocher puis décocher une tâche redonne l'état de départ |
| idempotence | valider `  binta  ` donne `binta`, et valider `binta` donne encore `binta` |
| répétition | se connecter deux fois avec la même saisie donne deux fois le même résultat |
| aller-retour | écrire dans IndexedDB, fermer la base, la rouvrir : on relit exactement ce qu'on a écrit ; créer un compte, puis se connecter avec les mêmes données, donne ce compte |

**Utilisé par :** `oracle.reflexif.test.js` (39 tests), `oracle.comptes.test.js` (78 tests), le test de réouverture de `oracle.differentiel.test.js` et la vérification aller-retour de `pairwise.inscription.test.js`.

### 2.6 Oracle par homothétie

**Définition.** On multiplie toutes les entrées par un même facteur k et on vérifie l'effet connu sur la sortie : multipliée par k, ou inchangée.

**Dans le cours.** Les racines de k·a·x² + k·b·x + k·c = 0 sont les mêmes que celles de a·x² + b·x + c = 0.

**Dans le projet.** On crée un projet P et un projet k·P où chaque tâche est répétée k fois (k = 2, 3 ou 7). Les compteurs de k·P doivent être k fois ceux de P, et la progression doit être la même. Exemple : le cas `aFaire=A0 terminees=F1 k=K3` donne P avec 1 tâche terminée (100 %) et k·P avec 3 tâches terminées (100 %).

**Utilisé par :** `oracle.homothetie.test.js` (16 cas pairwise).

**Limite démontrée.** Une progression calculée sur les tâches à faire au lieu des terminées est fausse, mais reste homothétique : l'oracle ne la voit pas. C'est le « cas non intéressant » du cours, comme (1, 10⁸, 1) pour l'équation. Une limite aux 10 premières tâches, elle, casse l'homothétie et est vue.

**Pas d'homothétie pour les comptes.** Un identifiant ou un mot de passe ne se multiplie pas ; cet oracle n'aurait rien à vérifier.

### 2.7 Oracle métamorphique

**Définition.** On transforme l'entrée d'une façon dont on connaît l'effet sur la sortie, on exécute les deux versions, et on vérifie la relation entre les deux résultats. L'homothétie en est un cas particulier.

**Dans le projet, pour les tâches (`oracle.metamorphique.test.js`, 80 tests) :**

| Relation | Transformation de l'entrée | Relation attendue entre les sorties |
| --- | --- | --- |
| MR1 | saisir les mêmes tâches dans un autre ordre | mêmes tâches, mêmes statistiques |
| MR2 | déplacer une tâche vers l'autre projet | total d'un projet − 1, de l'autre + 1, somme conservée |
| MR3 | réunir les tâches de P et de Q dans un projet | statistiques de l'union = somme des statistiques |
| MR4 | renommer toutes les tâches | statistiques inchangées |
| MR5 | tout cocher puis tout décocher | 100 %, puis retour au départ |

**Dans le projet, pour les comptes (`oracle.comptes.test.js`, 186 tests) :**

| Relation | Transformation de l'entrée | Relation attendue entre les sorties |
| --- | --- | --- |
| MR1 | écrire l'identifiant en majuscules, en minuscules, avec des espaces ou des tabulations | même résultat de connexion |
| MR2 | créer les mêmes comptes dans un autre ordre | même résultat de connexion |
| MR3 | ajouter un nouveau compte | aucune connexion des autres ne change |
| MR4 | remplacer un identifiant existant par un identifiant inconnu | exactement le même refus (non-divulgation) |
| MR5 | choisir un autre mot de passe à l'inscription | même compte public créé |

**Pourquoi c'est utile ici.** On n'a pas besoin de savoir à l'avance le résultat exact d'une connexion `awa.NGONO` avec le mot de passe `soleil2026` : il suffit de vérifier qu'il est identique à celui obtenu avec `Awa.Ngono`. MR4 transforme une exigence de sécurité en test automatique, sur toutes les classes de mauvais mot de passe.

### 2.8 Oracle différentiel

**Définition.** On exécute les mêmes opérations sur deux implémentations censées se comporter de la même façon, et on compare leurs résultats. Un désaccord prouve qu'au moins l'une des deux est fausse.

**Dans le projet.** Les deux implémentations sont le dépôt en mémoire (`DepotMemoire`) et le vrai dépôt (`DepotIndexedDB`). Exemple : le cas `titre=MT0 echeance=E3 projet=MP2 initiale=I3` (titre inchangé, échéance changée, tâche déplacée, tâche terminée au départ) est joué sur les deux dépôts. Les états, les statistiques et les éventuels refus doivent être identiques.

**Utilisé par :** `oracle.differentiel.test.js` (36 cas de modification) et `oracle.comptes.test.js` (150 cas d'inscription).

**Pourquoi c'est utile ici.** Tous les tests unitaires s'appuient sur le dépôt en mémoire. L'oracle différentiel garantit, sur des centaines de scénarios variés, que ce dépôt se comporte comme IndexedDB, donc que les tests unitaires disent la vérité sur l'application réelle.

### 2.9 Récapitulatif

| Oracle | Question qu'il pose | Fichiers |
| --- | --- | --- |
| Référence | le résultat est-il celui que prévoit la spécification ? | `pairwise.*`, `classes-equivalence.*` |
| Référence externe | le calcul donne-t-il la valeur publiée ? | `hachage.test.js` |
| Implicite | l'erreur est-elle propre, jamais un plantage ? | `pairwise.*` |
| Absence d'effet | un refus ou une lecture a-t-il laissé la base intacte ? | `pairwise.*`, `service.modification`, `comptes.connexion` |
| Réflexif | refaire, défaire ou relire ramène-t-il au même état ? | `oracle.reflexif`, `oracle.comptes`, `oracle.differentiel` |
| Homothétie | multiplier les tâches par k a-t-il l'effet attendu ? | `oracle.homothetie` |
| Métamorphique | une transformation connue de l'entrée donne-t-elle la relation attendue ? | `oracle.metamorphique`, `oracle.comptes` |
| Différentiel | le fake et IndexedDB donnent-ils le même résultat ? | `oracle.differentiel`, `oracle.comptes` |

**Comment pairwise et oracles se combinent.** Le pairwise répond à la question « quelles entrées tester ? ». Les oracles répondent à la question « comment savoir si la réponse est juste ? ». Le pairwise fournit des centaines de cas variés, et chaque oracle les juge sous un angle différent. Un défaut qui échappe à l'un, comme la progression inversée invisible pour l'homothétie, est attrapé par un autre, ici l'oracle de référence.
ok