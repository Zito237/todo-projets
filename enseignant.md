# Les tests du projet To-Do par projets : guide pour l'enseignant

INF563, application To-Do par projets avec comptes utilisateurs, données enregistrées dans le navigateur (IndexedDB).

Ce document décrit chaque dossier et chaque fichier de `web/test/` : ce que le fichier contient, ce que vérifient ses tests, et pourquoi ils ont été écrits ainsi dans ce projet.

État au 14 novembre 2026 : 1180 tests Vitest sur 1180 réussis (24 fichiers de test), 59 scénarios BDD sur 59 réussis, score de mutation de 98,57 %. Le détail des chiffres est dans [test.md](test.md).

## 1. Ce que les tests vérifient

Le code testé se trouve dans `web/src/`.

| Fichier | Rôle |
| --- | --- |
| `regles.js` | règles d'une tâche : titre de 1 à 120 caractères, échéance au format AAAA-MM-JJ |
| `service.js` (`TodoService`) | projets, tâches, statistiques, suppression ; chaque service est ouvert pour un compte |
| `regles-compte.js` | règles de l'identifiant (3 à 30 caractères) et du mot de passe (8 à 64, avec une lettre et un chiffre) |
| `comptes.js` (`ServiceComptes`) | création de compte et connexion |
| `hachage.js` | empreinte du mot de passe, PBKDF2-HMAC-SHA-256 avec 100 000 tours et un sel de 128 bits |
| `depot-indexeddb.js` | lecture et écriture dans IndexedDB |

**Choix de conception qui rend le code testable.** Les services ne créent pas eux-mêmes ce dont ils dépendent : ils le reçoivent à la construction (injection de dépendances). Ces dépendances sont le dépôt de données, l'horloge, le générateur d'identifiants, le hacheur et l'identifiant du compte connecté. Les tests peuvent ainsi remplacer chacune par une doublure. Ils tournent alors sans navigateur, en quelques secondes, et donnent toujours le même résultat (principes F.I.R.S.T. : rapides, isolés, répétables).

## 2. Organisation du dossier `web/test/`

```
web/test/
├── doublures/      les remplaçants des vraies dépendances et la mise en place commune
├── pairwise/       le générateur pairwise et les classes d'équivalence (les facteurs)
├── oracles/        les oracles de référence : la spécification réécrite indépendamment
└── *.test.js       les 24 fichiers de tests, que Vitest exécute
```

Les trois sous-dossiers ne contiennent aucun test. Ce sont des outils que les fichiers `*.test.js` importent. Vitest n'exécute que les fichiers dont le nom se termine par `.test.js`.

Le nom de chaque fichier de test indique la technique employée :

| Préfixe | Technique du cours |
| --- | --- |
| `service.*`, `comptes.*` | TDD : tests unitaires écrits avant le code |
| `classes-equivalence.*` | classes d'équivalence et valeurs limites |
| `pairwise.*`, `outil.pairwise` | test par paires (pairwise) |
| `oracle.*` | oracles sans valeur attendue écrite à la main |
| `depot.contrat`, `hachage` | test de contrat entre une doublure et le vrai composant, et test d'intégration |

## 3. Le dossier `doublures/`

Une doublure remplace une dépendance réelle pendant les tests. Elle est plus simple, plus rapide et sans hasard. Ce dossier contient aussi la mise en place commune (la partie « Arrange » des tests).

### 3.1 `fixtures.js` : horloge et identifiants maîtrisés

Ce fichier fournit trois outils :

- **`horlogeFixe(date)`** donne toujours la même date ;
- **`horlogeReglable(date)`** donne une date qu'on peut avancer pendant le test, avec `regler(...)` ;
- **`idsSequentiels(prefixe)`** donne des identifiants prévisibles : `id-1`, `id-2`…

**Pourquoi.** Le vrai code utilise l'heure système et des UUID aléatoires. Un test qui dépend de l'heure ou du hasard peut réussir un jour et échouer le lendemain : ce sont les deux premières causes de tests instables vues en séance 9. Avec ces outils, un test peut écrire `creeLe: '2026-11-10T09:00:00.000Z'` et `id: 'c-1'` comme résultat attendu exact. L'horloge réglable sert à vérifier que `modifieLe` change lors d'une modification alors que `creeLe` reste le même.

### 3.2 `depot-memoire.js` : le faux dépôt (fake)

`DepotMemoire` est une vraie implémentation du dépôt, simplifiée, qui range les données dans des `Map` en mémoire au lieu d'IndexedDB. Il a exactement les mêmes méthodes que `DepotIndexedDB` : `sauverProjet`, `trouverTache`, `listerComptes`, `supprimerProjet`…

**Pourquoi.** Dans la classification de Meszaros, c'est un *fake* : il fonctionne vraiment, mais d'une façon qui ne convient pas à la production. Grâce à lui, les tests du service n'ont besoin ni d'un navigateur ni d'une base. Il renvoie toujours des copies des objets, comme IndexedDB : un test ne peut donc pas modifier le stockage par accident en modifiant un objet qu'il a lu.

Un fake n'est utile que s'il se comporte comme le vrai composant. Le fichier `depot.contrat.test.js` (section 8.1) le vérifie.

### 3.3 `contexte.js` : mise en place des tests des tâches

| Fonction | Rôle |
| --- | --- |
| `contexteDeuxProjets()` | crée un service neuf avec deux projets : « Mémoire Master 2 » (le projet visé) et « Maison » (l'autre projet) |
| `peupler(service, projet, tâches)` | ajoute des tâches dans un projet, en terminant celles qui doivent l'être |
| `etat(service)` | photographie complète de ce qui est observable (tous les projets et toutes leurs tâches) |
| `composer(nbAFaire, nbTerminées, ordre)` | fabrique une liste de tâches dans un ordre donné : à faire d'abord, terminées d'abord, ou alternées |

**Pourquoi.** Ces étapes de préparation reviennent dans des centaines de tests ; les écrire une seule fois évite les copies divergentes. La fonction `etat` sert à vérifier qu'une opération refusée n'a rien modifié : on photographie avant, on photographie après, et les deux doivent être égaux. Deux projets sont créés pour pouvoir vérifier qu'une opération ne touche pas l'autre projet.

### 3.4 `contexte-compte.js` : mise en place des tests des comptes

| Élément | Rôle |
| --- | --- |
| `hacheurFactice()` | faux hacheur : le sel vaut `sel-1`, `sel-2`… et l'empreinte vaut `empreinte(sel-1\|Soleil2026)` |
| `nouveauServiceComptes()` | service de comptes neuf : dépôt en mémoire, horloge fixe, identifiants `c-1`, `c-2`… |
| `inscrire(comptes, identifiant, motDePasse)` | raccourci pour une inscription dont la confirmation est identique au mot de passe |
| `peuplerComptes(comptes, ordre)` | crée des comptes connus dans un ordre donné : le compte visé, un autre compte, deux comptes tiers |
| `etatComptes(depot)` | photographie de tous les comptes enregistrés |
| `CAS_INSCRIPTION`, `CAS_CONNEXION` | les cas pairwise des comptes, générés une seule fois et partagés par plusieurs fichiers |
| `preparerEtat`, `saisieDe` | traduisent un cas pairwise en état de la base et en saisie du formulaire |

**Pourquoi un faux hacheur.** Le vrai hacheur fait volontairement 100 000 tours de calcul : la lenteur est ce qui protège les mots de passe contre une attaque par force brute. Avec lui, les plus de 700 tests des comptes prendraient plusieurs minutes. Le faux est immédiat et lisible : un test peut vérifier exactement ce qui est enregistré (`empreinte(sel-1|Soleil2026)`) et donc qu'un sel a bien été utilisé. Le fichier `hachage.test.js` (section 8.2) vérifie que le faux et le vrai ont les mêmes propriétés.

Le compte tiers `daouda` utilise volontairement le même mot de passe que le compte visé. Cela vérifie qu'on n'est jamais connecté au mauvais compte parce que deux comptes partagent un mot de passe.

## 4. Le dossier `pairwise/`

### 4.1 `pairwise.js` : le générateur pairwise

Ce générateur, écrit pour le projet, est l'équivalent JavaScript de l'outil *jenny* et du décorateur `@PairwiseSource` utilisés dans le devoir sur l'équation du second degré.

**Principe (séance 4).** La plupart des défauts sont déclenchés par un seul paramètre ou par l'interaction de deux paramètres. Au lieu de tester toutes les combinaisons (le produit cartésien), on choisit un petit ensemble de cas où chaque paire de valeurs de deux paramètres différents apparaît au moins une fois.

**Algorithme.** C'est un algorithme glouton de la famille AETG. Tant qu'une paire n'est pas couverte, il crée un cas à partir de cette paire, puis choisit pour chaque autre paramètre la valeur qui couvre le plus de paires encore manquantes. Il n'utilise aucun hasard : la même entrée donne toujours les mêmes cas, et un échec peut donc être reproduit.

Le générateur vérifie lui-même son résultat et refuse de renvoyer un ensemble de cas qui laisserait une paire non couverte. Le fichier fournit aussi `tailleProduitCartesien` (pour afficher « 150 cas au lieu de 2400 ») et `nommerCas` (pour nommer chaque test d'après son cas, par exemple `identifiant=I6 motDePasse=M2 confirmation=K1 etat=S3`).

### 4.2 `facteurs.js` : les classes d'équivalence des tâches

Chaque entrée de l'application est découpée en classes d'équivalence, valides et invalides, avec leurs valeurs limites. Chaque classe porte deux informations : la donnée d'entrée, et ce que la spécification prévoit pour elle (valide ou non, et la valeur attendue après nettoyage).

| Facteur | Classes | Exemples |
| --- | --- | --- |
| Titre (T) | 8 | T2 : 1 caractère (borne basse) ; T3 : 120 caractères (borne haute) ; T5 : 121 caractères ; T7 : espaces seulement |
| Échéance (E) | 12 | E4 : 29 février d'une année bissextile ; E6 : 29 février d'une année non bissextile ; E7 : 31 avril ; E8 : format JJ/MM/AAAA |
| Projet (P) | 2 | existant, inexistant |
| Contenu du projet (C) | 4 | vide, une tâche, tâches mixtes, tâche portant déjà le même titre |

Ces facteurs donnent 768 combinaisons pour l'ajout d'une tâche. Le fichier définit aussi les facteurs de la modification d'une tâche (432 combinaisons) et ceux de la composition d'un projet, qui servent aux oracles (144 combinaisons).

Les classes E10, E11 et E12 (date suivie d'une heure, texte avant la date, année 0050) ont été ajoutées **après** le test de mutation. Stryker avait montré qu'on pouvait retirer les ancres `^` et `$` de l'expression régulière, ou le contrôle de l'année, sans qu'aucun test n'échoue.

### 4.3 `facteurs-compte.js` : les classes d'équivalence des pages de compte

**Page « Créer un compte » : 15 × 10 × 4 × 4 = 2400 combinaisons.**

| Facteur | Classes | Exemples |
| --- | --- | --- |
| Identifiant (I) | 15 | I2 et I3 : 3 et 30 caractères (bornes) ; I6 et I7 : 2 et 31 caractères ; I11 : espace intérieur ; I12 : lettre accentuée ; I14 et I15 : caractère interdit au début et à la fin |
| Mot de passe (M) | 10 | M2 et M3 : 8 et 64 caractères ; M5 et M6 : 7 et 65 caractères ; M4 : espaces et symboles conservés ; M9 : lettres seulement ; M10 : chiffres seulement |
| Confirmation (K) | 4 | identique, différente, vide, différente seulement par la casse |
| État de la base (S) | 4 | aucun compte, deux autres comptes, identifiant déjà pris, identifiant déjà pris avec une autre casse |

**Page « Se connecter » : 9 × 8 × 3 = 216 combinaisons.**

| Facteur | Classes | Exemples |
| --- | --- | --- |
| Identifiant saisi (C) | 9 | exact, autre casse, espaces autour, inconnu, identifiant d'un autre compte, préfixe du bon identifiant, vide |
| Mot de passe saisi (W) | 8 | correct, incorrect, différent seulement par la casse, espace ajouté à la fin, préfixe du bon mot de passe, mot de passe de l'autre compte, vide |
| État de la base (B) | 3 | compte visé créé en premier, en dernier, parmi quatre comptes |

Les classes I14 et I15 ont été prévues dès le départ, grâce à la leçon des ancres apprise sur l'échéance. Les classes « préfixe » (C6, W5) vérifient qu'une comparaison ne s'arrête pas trop tôt. La classe « différent seulement par la casse » (W3, K4) vérifie que le mot de passe, lui, tient compte des majuscules, contrairement à l'identifiant.

## 5. Le dossier `oracles/`

L'oracle est ce qui décide si le résultat d'un test est correct.

### 5.1 `reference.js` et `reference-compte.js` : les oracles de référence

Ces fichiers réécrivent la spécification sous forme de fonctions courtes, sans appeler ni recopier le code testé :

- `attenduAjout`, `attenduModification` et `attenduStatistiques` pour les tâches ;
- `attenduInscription` et `attenduConnexion` pour les comptes.

Pour un cas pairwise, chaque fonction prédit le résultat attendu : soit un refus et le champ en cause, soit la tâche ou le compte qui doit être créé.

**Pourquoi.** Les cas pairwise sont générés automatiquement ; personne ne peut écrire à la main le résultat attendu de 354 cas. L'oracle de référence le calcule à partir des classes, de façon indépendante du code. Si le code et l'oracle ne sont pas d'accord, l'un des deux est faux.

**Lacune de spécification traitée ici.** Quand plusieurs champs sont invalides en même temps, quel message afficher ? L'énoncé ne le dit pas, comme la priorité entre plafond et solde dans le TP Mobile Money. L'ordre choisi est écrit en tête de chaque fichier et reste à faire valider par le client :

- **Ajout d'une tâche :** projet, puis titre, puis échéance.
- **Modification d'une tâche :** titre, puis échéance, puis projet.
- **Inscription :** identifiant, puis mot de passe, puis confirmation, et seulement ensuite « identifiant déjà utilisé ».
- **Connexion :** identifiant vide, puis mot de passe vide, puis « Identifiant ou mot de passe incorrect », sans dire lequel des deux est faux.

**Un oracle peut aussi se tromper.** La première version de `attenduConnexion` prévoyait un refus pour le cas « identifiant de l'autre compte avec le mot de passe de l'autre compte ». C'est pourtant une connexion valide, au compte de l'autre utilisateur. Le pairwise a produit ce cas (C5 × W6), le test a échoué, et l'analyse a montré que l'erreur venait de l'oracle, pas du code. L'oracle a été corrigé et le commentaire du fichier raconte cet épisode.

## 6. Les tests TDD : `service.*.test.js` et `comptes.*.test.js`

Ces tests ont été écrits avant le code (rouge), puis le code a été écrit pour les faire passer (vert), puis nettoyé. Ils suivent la structure Arrange / Act / Assert et décrivent un comportement attendu par phrase.

### 6.1 `service.projets.test.js` : 6 tests

Il vérifie la création d'un projet (résultat exact : identifiant, nom, date) et le refus d'un nom vide ou fait seulement d'espaces. Il vérifie aussi que les espaces autour du nom sont retirés, et qu'un deuxième projet au même nom est refusé même avec une autre casse ou des espaces (`Maison` puis ` maison `). Enfin, la liste est classée par ordre alphabétique en tenant compte des accents : « école » vient avant « Maison ».

**Pourquoi.** Ce sont les règles de base de la page des projets. Le test du doublon avec une casse différente protège contre deux projets « Maison » et « maison » qu'un utilisateur ne distinguerait pas.

### 6.2 `service.taches.test.js` : 13 tests

Il vérifie qu'une tâche créée est non terminée, rattachée à son projet, avec ses dates de création et de modification. Une tâche n'apparaît que dans son propre projet, et l'ajout dans un projet inexistant est refusé. Le titre vide, fait d'espaces ou absent est refusé. Les valeurs limites du titre sont testées : 120 caractères acceptés, 121 refusés avec le message « Le titre ne doit pas dépasser 120 caractères ». Enfin, une échéance AAAA-MM-JJ est acceptée, et les formats invalides sont refusés : `30/06/2027`, `2027-02-30`, `2027-13-01`, `demain`.

**Pourquoi.** C'est le cœur de l'application. Les bornes 120 et 121 sont l'application directe des valeurs limites : c'est à la frontière que se cachent les erreurs du type `<` écrit à la place de `<=`.

### 6.3 `service.modification.test.js` : 9 tests

Il vérifie que modifier le titre change `modifieLe` mais pas `creeLe` (grâce à l'horloge réglable) et que la modification est bien enregistrée. Les champs non fournis restent inchangés, l'échéance peut être changée ou retirée, et la tâche peut être déplacée vers un autre projet. Les mêmes règles de titre qu'à la création s'appliquent. Un déplacement vers un projet inexistant est refusé, tout comme la modification d'une tâche inexistante. Enfin, une modification refusée n'enregistre rien.

**Pourquoi.** Le dernier point est essentiel : une écriture partielle (le titre changé alors que l'échéance était refusée) laisserait des données incohérentes. C'est l'équivalent du `never()` de Mockito vu en séance 9 : on vérifie qu'une chose n'a pas eu lieu.

### 6.4 `service.terminer.test.js` : 3 tests

Il vérifie que cocher une tâche la termine et que la cocher de nouveau la rouvre, et qu'on ne peut pas terminer une tâche inexistante. Il vérifie aussi l'ordre d'affichage : les tâches à faire d'abord, puis les terminées, chaque groupe dans l'ordre de création.

**Pourquoi.** L'ordre d'affichage est une règle de l'énoncé visible par l'utilisateur. L'horloge réglable permet de créer trois tâches à trois heures différentes et de prédire l'ordre exact.

### 6.5 `service.statistiques.test.js` : 5 tests

Il vérifie le compteur « x à faire sur y » et la progression en pourcentage :

- projet vide : 0 % et pas de division par zéro ;
- 1 tâche terminée sur 3 : 33 % ;
- 2 sur 3 : 67 %, donc un arrondi au plus proche et non une troncature ;
- toutes terminées : 100 % ;
- projet inexistant : refus.

**Pourquoi.** Ces statistiques sont affichées dans l'interface. Elles servent aussi de valeur observée pour les oracles par homothétie et métamorphiques (section 9). Le cas « 2 sur 3 » distingue `Math.round` de `Math.floor`.

### 6.6 `service.suppression.test.js` : 7 tests

Il vérifie qu'un projet supprimé disparaît de la liste, avec ses tâches : il ne reste aucune tâche orpheline. Les autres projets et leurs tâches ne sont pas touchés. Supprimer un projet inexistant, ou supprimer deux fois le même, est refusé sans rien changer. Toute opération sur un projet supprimé est ensuite refusée. Enfin, le nom est libéré : on peut recréer un projet du même nom, et il est vide.

**Pourquoi.** La suppression est la seule opération qui détruit des données, et elle a été ajoutée en cours de projet. Le test « pas de tâche orpheline » garantit que des tâches invisibles ne restent pas dans la base. Le test « le nom est libéré » garantit que la règle d'unicité des noms ne compte pas les projets supprimés.

### 6.7 `service.mutants.test.js` : 6 tests

Ce fichier contient les tests ajoutés pour détecter des mutants qui survivaient au test de mutation (section 10) :

- chaque refus indique le bon champ en cause (`nom`, `tache`, `projet`) et un vrai message ;
- sans injection, le service utilise bien l'horloge système (une date ISO réelle) et des UUID.

**Pourquoi.** Au premier passage, Stryker a montré que les tests vérifiaient le message des refus mais pas le champ, et que l'horloge et le générateur par défaut n'étaient jamais exécutés : tous les autres tests les remplacent. On y applique la règle d'or de la séance 9 : tout défaut trouvé laisse derrière lui un test qui le reproduit. Le second test vérifie la forme des valeurs (une date ISO, un UUID) et non leur valeur exacte, pour rester reproductible.

### 6.8 `comptes.inscription.test.js` : 19 tests (page « Créer un compte »)

Il vérifie que la création d'un compte renvoie seulement la partie publique (`id`, `identifiant`, `creeLe`), sans le sel ni l'empreinte. Ce qui est enregistré est une empreinte salée, jamais le mot de passe. Deux comptes avec le même mot de passe ont des sels différents, donc des empreintes différentes. Les espaces autour de l'identifiant sont retirés, et un identifiant déjà utilisé est refusé, même écrit avec une autre casse. Une confirmation différente est refusée, et chaque refus de l'identifiant (vide, trop court, trop long, avec un espace) et du mot de passe (vide, trop court, trop long, sans chiffre, sans lettre) affiche un message précis sur le bon champ. Un formulaire absent est refusé, l'horloge et les UUID par défaut sont vérifiés, et un compte peut être retrouvé par son identifiant interne, ce qui sert à reprendre la session au rechargement.

**Pourquoi.** Ce fichier décrit la page de création de compte du point de vue du service, sans navigateur. Trois tests portent sur la sécurité : aucun secret dans la réponse, aucun mot de passe enregistré, un sel par compte. Sans sel, deux utilisateurs ayant le même mot de passe auraient la même empreinte, ce qui se repère dans la base. Le test « sans injection » a été ajouté après la mutation : c'était le même trou que sur `TodoService`.

### 6.9 `comptes.connexion.test.js` : 10 tests (page « Se connecter »)

Il vérifie que la connexion réussit avec le bon identifiant et le bon mot de passe, et que la casse et les espaces de l'identifiant sont ignorés. En revanche, ceux du mot de passe comptent : `soleil2026` et `Soleil2026 ` sont refusés. Un mauvais mot de passe est refusé, y compris le mot de passe d'un autre compte. Le refus est le même, mot pour mot, que l'identifiant soit inconnu ou que le mot de passe soit faux. Un identifiant vide ou un mot de passe vide donne un message sur le champ concerné. Enfin, une connexion, réussie ou non, ne modifie jamais la base.

**Pourquoi.** Le test du refus identique est une exigence de sécurité (non-divulgation). Si le message disait « identifiant inconnu », un attaquant pourrait découvrir quels comptes existent. Le dernier test vérifie qu'une simple lecture n'écrit rien.

### 6.10 `service.isolation.test.js` : 9 tests

Deux services, ouverts pour deux comptes différents (`c-awa` et `c-binta`), partagent le même dépôt, comme deux utilisateurs du même navigateur partagent la même base IndexedDB. Le fichier vérifie que :

- chaque projet créé est rattaché au compte connecté, et chaque compte ne voit que ses projets ;
- deux comptes peuvent avoir chacun un projet du même nom, alors qu'un même compte ne peut pas en avoir deux ;
- un compte ne peut ni ajouter une tâche, ni lire les statistiques, ni supprimer le projet d'un autre compte ;
- un compte ne peut ni modifier ni cocher la tâche d'un autre, ni déplacer sa propre tâche vers le projet d'un autre ;
- supprimer son projet « Maison » ne touche pas au projet « Maison » de l'autre compte ;
- un projet créé avant l'ajout des comptes, donc sans propriétaire, n'est visible par aucun compte.

**Pourquoi.** C'est ce qui rend la fonctionnalité « comptes » réelle : sans ces tests, l'écran de connexion pourrait n'être qu'une façade, chaque utilisateur voyant tout. Chaque refus est suivi d'une vérification que les données de l'autre compte n'ont pas changé. Le message renvoyé est « Projet introuvable » et non « accès refusé », pour ne pas révéler qu'un projet existe chez quelqu'un d'autre.

## 7. Classes d'équivalence : `classes-equivalence*.test.js`

**Principe commun :** une classe à la fois. Pour chaque classe, une seule entrée prend cette classe et toutes les autres restent valides. Si un test échoue, on sait exactement quelle classe est en cause, ce que le pairwise ne permet pas : ses cas mélangent plusieurs classes invalides.

### 7.1 `classes-equivalence.test.js` : 23 tests

Chaque classe de titre (8), d'échéance (12) et de projet (2) est essayée à l'ajout d'une tâche. Le résultat attendu vient de l'oracle de référence. Un dernier test vérifie que les classes contiennent bien des valeurs valides et invalides pour chaque entrée, ce qui protège le jeu de classes lui-même contre un oubli.

### 7.2 `classes-equivalence.comptes.test.js` : 73 tests

| Groupe | Tests | Ce qui est vérifié |
| --- | --- | --- |
| Identifiant | 16 | les 15 classes sur la règle seule, plus la clé de comparaison qui ignore la casse et les espaces |
| Mot de passe | 11 | les 10 classes, plus `null` refusé comme une valeur absente ; un mot de passe valide est rendu tel quel, jamais nettoyé |
| Confirmation | 4 | identique, différente, vide, différente par la casse |
| Inscription | 25 | chaque classe d'identifiant et de mot de passe sur le service complet |
| Connexion | 17 | chaque classe d'identifiant saisi et de mot de passe saisi, l'autre champ étant correct |

**Pourquoi deux niveaux.** La règle seule (`regles-compte.js`) est testée directement, puis à travers le service. Les deux niveaux attrapent des défauts différents : une règle juste peut être mal appelée par le service.

Le mot de passe n'est jamais nettoyé : M4, avec des espaces au début et à la fin, est accepté tel quel. Retirer ces espaces changerait en silence le mot de passe choisi par l'utilisateur.

## 8. Contrats et intégration : `depot.contrat.test.js` et `hachage.test.js`

### 8.1 `depot.contrat.test.js` : 27 tests

**Test de contrat : 11 tests joués deux fois.** La même série de tests est exécutée sur `DepotMemoire` (le fake) et sur `DepotIndexedDB` (le vrai). Elle vérifie qu'on retrouve ce qu'on a enregistré et qu'un élément inconnu donne `null`. Elle vérifie aussi que seules les tâches du projet demandé sont listées, et qu'une tâche enregistrée deux fois est mise à jour sans être dupliquée. Supprimer un projet supprime ses tâches, et supprimer un projet inconnu ne change rien. Les comptes et les projets sont rangés séparément : un compte et un projet peuvent porter le même identifiant interne. Enfin, les objets renvoyés sont des copies.

**Pourquoi.** Tous les tests unitaires s'appuient sur le fake. Si le fake se comportait différemment d'IndexedDB, par exemple en renvoyant l'objet stocké au lieu d'une copie, les tests unitaires réussiraient alors que l'application réelle serait fausse. Le contrat garantit que le fake dit la vérité.

**Intégration avec IndexedDB : 5 tests.** Ils vérifient que :

- les données sont retrouvées après la fermeture et la réouverture de la base, ce qui équivaut à un rechargement de la page ;
- une base de la version 1, créée avant les comptes, passe en version 2 sans perte de données, et le nouveau magasin `comptes` fonctionne ;
- un ancien onglet resté ouvert sur l'ancienne version donne un message clair au lieu d'un blocage silencieux ;
- la base cède la place quand une version plus récente est demandée ;
- une suppression reste effective après la réouverture.

**Pourquoi.** Ces tests viennent de situations réelles rencontrées pendant le développement. L'ajout des comptes a fait passer la base en version 2, et un onglet ouvert sur l'ancienne version bloquait l'application sans rien afficher. En Node, l'API IndexedDB est fournie par la bibliothèque `fake-indexeddb`, une implémentation conforme en mémoire. Ce sont donc des tests d'intégration de composants : le vrai code du dépôt utilise une vraie API IndexedDB.

### 8.2 `hachage.test.js` : 13 tests

**Contrat : 4 tests joués deux fois**, sur le vrai hacheur PBKDF2 et sur le faux hacheur des tests. Ils vérifient que :

- le même mot de passe avec le même sel donne la même empreinte ;
- un mot de passe différent d'un seul caractère, ou seulement par la casse, donne une autre empreinte ;
- un autre sel donne une autre empreinte ;
- 50 sels générés sont tous différents.

**Vrai hacheur : 5 tests.** Ils vérifient que :

- l'empreinte fait 256 bits en hexadécimal et ne contient pas le mot de passe, et le sel fait 128 bits ;
- la valeur obtenue est exactement la valeur publiée de PBKDF2-HMAC-SHA-256 pour « password » et « salt » en 1 tour ;
- l'empreinte change avec le nombre de tours, fixé à 100 000 en production ;
- de bout en bout, avec le vrai hacheur : inscription puis connexion, et le mot de passe n'apparaît nulle part dans le dépôt.

**Pourquoi.** Le vecteur de référence publié est un oracle de référence externe : il prouve que le calcul est bien du PBKDF2 standard et non une fonction maison qui aurait seulement l'air de fonctionner. Les tests utilisent 1000 tours au lieu de 100 000 pour rester rapides, et un test séparé vérifie que la production utilise bien 100 000 tours.

## 9. Pairwise : `pairwise.*.test.js` et `outil.pairwise.test.js`

**Principe commun.** Aucun cas n'est écrit à la main : tous sont produits par le générateur à partir des classes d'équivalence. Chaque cas est vérifié par plusieurs oracles à la fois :

1. **Référence :** le succès ou le champ refusé est celui que prédit la spécification ;
2. **Absence d'effet :** un refus ne modifie rien (photographie avant et après) ;
3. **Implicite :** toute erreur est une `ErreurValidation` avec un message, jamais un plantage JavaScript.

| Fichier | Cas exécutés | Combinaisons possibles | Ce qui est vérifié en plus |
| --- | --- | --- | --- |
| `pairwise.ajout.test.js` | 96 | 768 | la tâche créée est exacte, elle apparaît dans la liste, et les compteurs augmentent de 1 |
| `pairwise.modification.test.js` | 36 | 432 | la tâche est dans son nouveau projet et n'est plus dans l'ancien |
| `pairwise.inscription.test.js` | 150 | 2400 | un seul compte est ajouté ; aller-retour : le compte créé permet de se connecter |
| `pairwise.connexion.test.js` | 72 | 216 | on est connecté au bon compte et pas à un autre ; se connecter n'écrit jamais rien |

Soit 354 cas exécutés au lieu de 3816 combinaisons.

**Pourquoi.** Les entrées ont beaucoup de classes : 15 identifiants × 10 mots de passe × 4 confirmations × 4 états de base. Tout tester serait long et illisible. Le pairwise garantit que chaque interaction entre deux paramètres est essayée au moins une fois, par exemple « identifiant déjà pris avec une autre casse » combiné à « mot de passe de 64 caractères ». C'est ce qui a fait apparaître l'erreur de l'oracle de connexion décrite en section 5.1.

### `outil.pairwise.test.js` : 14 tests

Ce fichier teste le générateur lui-même, sur les trois jeux de facteurs des tâches. Pour chacun, il vérifie que :

- toutes les paires sont couvertes ;
- il y a bien moins de cas que le produit cartésien ;
- le nombre de cas ne descend pas sous le minimum théorique (le produit des deux plus grands facteurs) ;
- deux générations donnent les mêmes cas.

Il vérifie aussi que retirer un cas est détecté comme une couverture incomplète, et qu'un seul facteur, ou un facteur sans valeur, est refusé.

**Pourquoi.** Avant de faire confiance aux cas générés, il faut faire confiance au générateur, comme on vérifiait la sortie de *jenny*. Un générateur qui oublierait des paires donnerait une fausse impression de couverture. Le test du minimum théorique vérifie qu'il ne triche pas en produisant trop peu de cas.

## 10. Oracles sans valeur attendue : `oracle.*.test.js`

Ces oracles ne disent pas « le résultat doit être 67 ». Ils comparent le système à lui-même, ou deux exécutions entre elles. Ils sont utiles quand le résultat attendu est difficile à calculer à l'avance.

### 10.1 `oracle.reflexif.test.js` : 39 tests (13 cas valides × 3 relations)

| Relation | Ce qui est vérifié |
| --- | --- |
| R1 | modifier une tâche avec ses propres valeurs ne change que `modifieLe` |
| R2 | cocher puis décocher une tâche ramène exactement à l'état de départ (involution) |
| R3 | valider une valeur déjà validée ne la change plus (idempotence) |

Les données sont les cas pairwise valides de l'ajout.

### 10.2 `oracle.homothetie.test.js` : 18 tests

**Relation (16 cas pairwise).** Si on multiplie par k le contenu d'un projet (chaque tâche répétée k fois, avec k = 2, 3 ou 7), les compteurs sont multipliés par k et la progression ne change pas. C'est l'analogue de g(k·a, k·b, k·c) = g(a, b, c) pour l'équation du second degré.

**Pouvoir de détection de l'oracle (2 tests).** On construit deux versions volontairement fausses du service et on regarde si l'oracle les voit :

- **Cas non intéressant :** une progression calculée sur les tâches à faire au lieu des terminées. L'oracle par homothétie ne voit rien, car l'erreur est elle-même homothétique : (k × à faire) / (k × total) = à faire / total. L'oracle de référence, lui, la voit.
- **Cas intéressant :** des statistiques qui ne lisent que les 10 premières tâches. L'homothétie est cassée dès que k × n dépasse 10, et l'oracle la voit.

**Pourquoi.** Ces deux tests montrent qu'un oracle a des angles morts, comme le cas (1, 10⁸, 1) de l'équation vu en cours. Un oracle par homothétie ne remplace donc pas un oracle de référence ; il le complète.

### 10.3 `oracle.metamorphique.test.js` : 80 tests (16 cas × 5 relations)

| Relation | Transformation | Effet attendu |
| --- | --- | --- |
| MR1 | saisir les tâches dans un autre ordre | même ensemble de tâches, mêmes statistiques |
| MR2 | déplacer une tâche vers un autre projet | le total des deux projets est conservé, et le statut voyage avec la tâche |
| MR3 | réunir deux projets en un seul | statistiques(P ∪ Q) = statistiques(P) + statistiques(Q) |
| MR4 | renommer toutes les tâches | statistiques inchangées |
| MR5 | tout cocher puis tout décocher | 100 % puis retour aux statistiques de départ |

**Pourquoi.** Chaque relation exprime une propriété que tout utilisateur jugerait évidente : par exemple, déplacer une tâche ne doit ni en créer ni en perdre. Elles se vérifient sur n'importe quelle composition de projet sans calculer le résultat attendu à la main.

### 10.4 `oracle.differentiel.test.js` : 37 tests

Les 36 cas pairwise de la modification sont joués sur deux implémentations, le dépôt en mémoire et IndexedDB, et doivent donner exactement les mêmes états, les mêmes statistiques et les mêmes refus. Un dernier test, réflexif, écrit des données, ferme la base, la rouvre et vérifie que tout est relu à l'identique.

**Pourquoi.** C'est un complément au test de contrat. Le contrat teste des opérations isolées du dépôt ; ici, ce sont des scénarios complets du service, sur des données variées.

### 10.5 `oracle.comptes.test.js` : 415 tests

Ce fichier applique aux comptes les oracles sans valeur attendue.

**Réflexif (78 tests) :**

- valider un identifiant déjà validé ne le change plus (5 tests) ;
- se connecter deux fois avec la même saisie donne deux fois le même résultat (72 cas de connexion) ;
- s'inscrire deux fois avec les mêmes données : la seconde inscription est refusée et la base ne change plus (1 test).

**Métamorphique (186 tests) :**

| Relation | Tests | Ce qui est vérifié |
| --- | --- | --- |
| MR1 | 48 | mettre l'identifiant en majuscules, en minuscules, l'entourer d'espaces ou de tabulations ne change pas le résultat de la connexion |
| MR2 | 72 | l'ordre de création des comptes ne change le résultat d'aucune connexion (9 × 8 combinaisons, chacune avec 3 ordres) |
| MR3 | 56 | créer un compte de plus ne change rien pour les connexions des autres comptes |
| MR4 | 5 | un identifiant inconnu et un mauvais mot de passe donnent exactement le même refus |
| MR5 | 5 | le compte public créé ne dépend pas du mot de passe choisi |

**Différentiel (151 tests) :** les 150 cas pairwise d'inscription, suivis d'une tentative de connexion, sont joués sur le dépôt en mémoire et sur IndexedDB, et donnent les mêmes résultats. Un dernier test vérifie qu'un compte créé permet encore de se connecter après la réouverture de la base.

**Pourquoi pas d'homothétie ici.** Un identifiant ou un mot de passe ne se multiplie pas par k ; aucune relation de ce type n'a de sens pour les comptes. Le commentaire du fichier le dit explicitement : on n'écrit pas un oracle là où il ne vérifierait rien.

MR4 vérifie la non-divulgation sur toutes les classes de mauvais mot de passe, et pas seulement sur l'exemple du test TDD. MR3 vérifie qu'un nouvel inscrit, dont le mot de passe est volontairement identique à celui du compte visé, n'interfère pas avec les autres.

## 11. Comment le test de mutation a jugé ces tests

Stryker (`npm run test:mutation`, configuré dans `stryker.config.mjs`) modifie le code de production, par exemple en remplaçant `<` par `<=` ou en supprimant une condition, puis relance tous ces tests. Si au moins un test échoue, le mutant est détecté ; s'il survit, c'est qu'aucun test ne vérifie ce comportement.

| Fichier muté | Score |
| --- | --- |
| `service.js` | 100 % |
| `regles-compte.js` | 100 % |
| `comptes.js` | 100 % |
| `regles.js` | 94,59 % (4 survivants) |
| **Total** | **98,57 % (276 mutants détectés sur 280)** |

Le score était de 89,6 % au premier passage. Les survivants ont conduit à ajouter les classes E10, E11 et E12, le fichier `service.mutants.test.js` et le test « sans injection » des comptes.

Les 4 survivants restants ont été examinés :

- deux sont équivalents : les contrôles du mois et du jour de l'échéance sont redondants, car un jour qui déborde change toujours de mois ;
- un est équivalent : comparer les noms en majuscules plutôt qu'en minuscules donne le même résultat ;
- un révèle une lacune de la spécification : l'ordre d'affichage de « Ecole » et « école » n'est pas défini.

## 12. Les tests de l'interface : le dossier `bdd/`

`web/test/` ne contient pas de test de l'interface : `web/app.js` est vérifié par les scénarios BDD du dossier `bdd/`. Ces scénarios sont écrits en français (Gherkin) et exécutés dans un vrai Chrome avec Cucumber et Playwright.

| Fichier | Scénarios exécutés | Contenu |
| --- | --- | --- |
| `bdd/features/gestion_taches.feature` | 27 | projets, tâches, modification, déplacement, progression, persistance, suppression, joués avec un utilisateur connecté |
| `bdd/features/comptes.feature` | 32 | les pages « Créer un compte » et « Se connecter », la déconnexion, la session conservée au rechargement, l'isolation entre deux utilisateurs, et l'absence du mot de passe dans IndexedDB, le stockage local et le stockage de session |
| `bdd/steps/*.steps.js` | | traduction de chaque phrase Gherkin en actions Playwright |

Les tests de `web/test/` vérifient les règles de façon exhaustive et rapide. Les scénarios BDD vérifient que l'utilisateur voit réellement ces règles appliquées dans la page.

## 13. Quand ces tests sont exécutés

- **À la demande :** `npm test` (environ 4 secondes) et `npm run test:bdd` (environ 40 secondes).
- **Avant chaque `git push` :** le hook `.githooks/pre-push` exécute les deux et annule l'envoi si un test échoue.
- **Sur GitHub, à chaque push :** le pipeline `.github/workflows/ci.yml` rejoue les tests avec la couverture, puis les scénarios BDD.
- **Chaque nuit, sur GitHub :** le pipeline ajoute le test de mutation.
