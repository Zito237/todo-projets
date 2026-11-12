// CLASSES D'ÉQUIVALENCE et VALEURS LIMITES (séance 4) des entrées de l'application.
// Chaque valeur porte, À CÔTÉ de la donnée d'entrée (DE), ce que la SPÉCIFICATION
// dit qu'il doit se passer : c'est ce qui permet à l'oracle de référence de prédire
// le résultat attendu (RA) sans relire le code testé.
//
// Convention des identifiants : P = projet, T = titre, E = échéance, C = contenu
// déjà présent dans le projet. Les classes invalides sont marquées valide: false.

const TITRE_MAX = 120; // spécification : 120 caractères au plus (README, lacune n°3)

// ----- Titre d'une tâche -----
export const TITRES = [
  { id: 'T1', libelle: 'titre ordinaire', valeur: 'Rédiger le chapitre 2', valide: true, attendu: 'Rédiger le chapitre 2' },
  { id: 'T2', libelle: '1 caractère (borne basse)', valeur: 'x', valide: true, attendu: 'x' },
  { id: 'T3', libelle: `${TITRE_MAX} caractères (borne haute)`, valeur: 'a'.repeat(TITRE_MAX), valide: true, attendu: 'a'.repeat(TITRE_MAX) },
  { id: 'T4', libelle: 'espaces autour (nettoyés)', valeur: '   Payer ENEO  ', valide: true, attendu: 'Payer ENEO' },
  { id: 'T5', libelle: `${TITRE_MAX + 1} caractères (juste hors borne)`, valeur: 'a'.repeat(TITRE_MAX + 1), valide: false },
  { id: 'T6', libelle: 'chaîne vide', valeur: '', valide: false },
  { id: 'T7', libelle: 'espaces seulement', valeur: '     ', valide: false },
  { id: 'T8', libelle: 'absent (undefined)', valeur: undefined, valide: false },
];

// ----- Échéance (facultative, date calendaire AAAA-MM-JJ) -----
export const ECHEANCES = [
  { id: 'E1', libelle: 'absente (null)', valeur: null, valide: true, attendu: null },
  { id: 'E2', libelle: 'chaîne vide (champ date effacé)', valeur: '', valide: true, attendu: null },
  { id: 'E3', libelle: 'date ordinaire', valeur: '2027-06-30', valide: true, attendu: '2027-06-30' },
  { id: 'E4', libelle: '29 février d’une année bissextile', valeur: '2028-02-29', valide: true, attendu: '2028-02-29' },
  { id: 'E5', libelle: '31 décembre (borne de fin d’année)', valeur: '2026-12-31', valide: true, attendu: '2026-12-31' },
  { id: 'E6', libelle: '29 février d’une année NON bissextile', valeur: '2027-02-29', valide: false },
  { id: 'E7', libelle: '31 avril (jour inexistant)', valeur: '2027-04-31', valide: false },
  { id: 'E8', libelle: 'format français JJ/MM/AAAA', valeur: '30/06/2027', valide: false },
  { id: 'E9', libelle: 'mois 13', valeur: '2027-13-01', valide: false },
];

// ----- Projet visé -----
export const PROJETS = [
  { id: 'P1', libelle: 'projet existant', existe: true },
  { id: 'P2', libelle: 'projet inexistant', existe: false },
];

// ----- Contenu déjà présent dans le projet visé (état initial) -----
export const CONTENUS = [
  { id: 'C1', libelle: 'projet vide', taches: [] },
  { id: 'C2', libelle: 'une tâche à faire', taches: [{ titre: 'Réviser la séance 9', terminee: false }] },
  { id: 'C3', libelle: 'tâches terminées et à faire', taches: [{ titre: 'Devoir BDD', terminee: true }, { titre: 'Lire la séance 10', terminee: false }] },
  { id: 'C4', libelle: 'doublon du titre ordinaire', taches: [{ titre: 'Rédiger le chapitre 2', terminee: false }] },
];

/** Facteurs du pairwise d'AJOUT d'une tâche : 8 × 9 × 2 × 4 = 576 combinaisons au total. */
export const FACTEURS_AJOUT = { titre: TITRES, echeance: ECHEANCES, projet: PROJETS, contenu: CONTENUS };

// ----- Modification d'une tâche -----
// Chaque champ peut être absent de la demande de changement (« on n'y touche pas »).
export const CHANGEMENTS_TITRE = [
  { id: 'MT0', libelle: 'titre non modifié', absent: true },
  ...TITRES.filter((t) => ['T1', 'T3', 'T4', 'T5', 'T6'].includes(t.id)),
];
export const CHANGEMENTS_ECHEANCE = [
  { id: 'ME0', libelle: 'échéance non modifiée', absent: true },
  ...ECHEANCES.filter((e) => ['E1', 'E3', 'E4', 'E6', 'E8'].includes(e.id)),
];
export const CHANGEMENTS_PROJET = [
  { id: 'MP0', libelle: 'projet non modifié', absent: true },
  { id: 'MP1', libelle: 'même projet', cible: 'meme', valide: true },
  { id: 'MP2', libelle: 'autre projet existant', cible: 'autre', valide: true },
  { id: 'MP3', libelle: 'projet inexistant', cible: 'fantome', valide: false },
];
export const TACHES_INITIALES = [
  { id: 'I1', libelle: 'à faire, sans échéance', terminee: false, echeance: null },
  { id: 'I2', libelle: 'à faire, avec échéance', terminee: false, echeance: '2027-01-15' },
  { id: 'I3', libelle: 'terminée, avec échéance', terminee: true, echeance: '2026-12-01' },
];

/** Facteurs du pairwise de MODIFICATION : 6 × 6 × 4 × 3 = 432 combinaisons au total. */
export const FACTEURS_MODIFICATION = {
  titre: CHANGEMENTS_TITRE, echeance: CHANGEMENTS_ECHEANCE, projet: CHANGEMENTS_PROJET, initiale: TACHES_INITIALES,
};

// ----- Composition d'un projet, pour les oracles sur les statistiques -----
export const NB_A_FAIRE = [0, 1, 2, 5].map((n) => ({ id: `A${n}`, libelle: `${n} à faire`, n }));
export const NB_TERMINEES = [0, 1, 3, 4].map((n) => ({ id: `F${n}`, libelle: `${n} terminée(s)`, n }));
export const FACTEURS_K = [2, 3, 7].map((k) => ({ id: `K${k}`, libelle: `facteur ${k}`, k }));
export const ORDRES = [
  { id: 'O1', libelle: 'à faire d’abord' },
  { id: 'O2', libelle: 'terminées d’abord' },
  { id: 'O3', libelle: 'alternées' },
];

/** Facteurs des oracles homothétique et métamorphiques : 4 × 4 × 3 × 3 = 144 combinaisons. */
export const FACTEURS_COMPOSITION = { aFaire: NB_A_FAIRE, terminees: NB_TERMINEES, k: FACTEURS_K, ordre: ORDRES };
