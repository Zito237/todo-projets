// CLASSES D'ÉQUIVALENCE et VALEURS LIMITES (séance 4) des pages « Créer un compte »
// et « Se connecter ». Comme dans facteurs.js, chaque valeur porte la donnée d'entrée
// ET ce que la spécification prévoit : l'oracle de référence prédit le résultat
// attendu sans relire le code testé.
//
// Convention : I = identifiant, M = mot de passe, K = confirmation, S = état de la
// base à l'inscription ; C = identifiant saisi à la connexion, W = mot de passe saisi,
// B = état de la base à la connexion.

const ID_MIN = 3;
const ID_MAX = 30;
const MDP_MIN = 8;
const MDP_MAX = 64;

// ----- Identifiant (3 à 30 caractères : lettres sans accent, chiffres, . _ -) -----
export const IDENTIFIANTS = [
  { id: 'I1', libelle: 'identifiant ordinaire', valeur: 'awa.ngono', valide: true, attendu: 'awa.ngono' },
  { id: 'I2', libelle: `${ID_MIN} caractères (borne basse)`, valeur: 'abc', valide: true, attendu: 'abc' },
  { id: 'I3', libelle: `${ID_MAX} caractères (borne haute)`, valeur: 'a'.repeat(ID_MAX), valide: true, attendu: 'a'.repeat(ID_MAX) },
  { id: 'I4', libelle: 'espaces autour (nettoyés)', valeur: '  binta  ', valide: true, attendu: 'binta' },
  { id: 'I5', libelle: 'majuscules, chiffres, point, tiret, tiret bas', valeur: 'Jean-Paul_2.0', valide: true, attendu: 'Jean-Paul_2.0' },
  { id: 'I6', libelle: `${ID_MIN - 1} caractères (juste sous la borne)`, valeur: 'ab', valide: false },
  { id: 'I7', libelle: `${ID_MAX + 1} caractères (juste hors borne)`, valeur: 'a'.repeat(ID_MAX + 1), valide: false },
  { id: 'I8', libelle: 'chaîne vide', valeur: '', valide: false },
  { id: 'I9', libelle: 'espaces seulement', valeur: '     ', valide: false },
  { id: 'I10', libelle: 'absent (undefined)', valeur: undefined, valide: false },
  { id: 'I11', libelle: 'espace à l’intérieur', valeur: 'awa ngono', valide: false },
  { id: 'I12', libelle: 'lettre accentuée', valeur: 'élodie', valide: false },
  { id: 'I13', libelle: 'caractère interdit au milieu', valeur: 'awa@mail', valide: false },
  // Classes ajoutées pour les ancres ^ et $ de l'expression régulière (leçon du test
  // de mutation sur l'échéance : sans elles, on peut retirer une ancre sans être vu).
  { id: 'I14', libelle: 'caractère interdit au début', valeur: '@awangono', valide: false },
  { id: 'I15', libelle: 'caractère interdit à la fin', valeur: 'awangono!', valide: false },
];

// ----- Mot de passe (8 à 64 caractères, au moins une lettre et un chiffre, non nettoyé) -----
export const MOTS_DE_PASSE = [
  { id: 'M1', libelle: 'mot de passe ordinaire', valeur: 'Soleil2026', valide: true },
  { id: 'M2', libelle: `${MDP_MIN} caractères (borne basse)`, valeur: 'abcdefg1', valide: true },
  { id: 'M3', libelle: `${MDP_MAX} caractères (borne haute)`, valeur: `${'a'.repeat(MDP_MAX - 1)}1`, valide: true },
  { id: 'M4', libelle: 'espaces et symboles (conservés tels quels)', valeur: ' mot de passe n°1 ! ', valide: true },
  { id: 'M5', libelle: `${MDP_MIN - 1} caractères (juste sous la borne)`, valeur: 'abcdef1', valide: false },
  { id: 'M6', libelle: `${MDP_MAX + 1} caractères (juste hors borne)`, valeur: `${'a'.repeat(MDP_MAX)}1`, valide: false },
  { id: 'M7', libelle: 'chaîne vide', valeur: '', valide: false },
  { id: 'M8', libelle: 'absent (undefined)', valeur: undefined, valide: false },
  { id: 'M9', libelle: 'lettres seulement', valeur: 'abcdefgh', valide: false },
  { id: 'M10', libelle: 'chiffres seulement', valeur: '12345678', valide: false },
];

const inverserCasse = (texte) => [...texte].map((c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase())).join('');

// ----- Confirmation du mot de passe (calculée à partir du mot de passe du cas) -----
export const CONFIRMATIONS = [
  { id: 'K1', libelle: 'identique', identique: true, de: (motDePasse) => motDePasse },
  { id: 'K2', libelle: 'différente', identique: false, de: () => 'AutreChose99' },
  { id: 'K3', libelle: 'vide', identique: false, de: () => '' },
  { id: 'K4', libelle: 'différente seulement par la casse', identique: false, de: (motDePasse) => inverserCasse(motDePasse ?? 'x') },
];

// ----- État de la base au moment de l'inscription -----
export const ETATS_INSCRIPTION = [
  { id: 'S1', libelle: 'aucun compte', autres: 0, pris: false },
  { id: 'S2', libelle: 'deux autres comptes', autres: 2, pris: false },
  { id: 'S3', libelle: 'identifiant déjà pris, même écriture', autres: 1, pris: true, ecriture: (i) => i },
  { id: 'S4', libelle: 'identifiant déjà pris, autre casse', autres: 0, pris: true, ecriture: inverserCasse },
];

/** Facteurs du pairwise d'INSCRIPTION : 15 × 10 × 4 × 4 = 2400 combinaisons au total. */
export const FACTEURS_INSCRIPTION = {
  identifiant: IDENTIFIANTS, motDePasse: MOTS_DE_PASSE, confirmation: CONFIRMATIONS, etat: ETATS_INSCRIPTION,
};

// ----- Connexion : le compte visé est toujours « Awa.Ngono » / « Soleil2026 » -----
export const COMPTE_VISE = { identifiant: 'Awa.Ngono', motDePasse: 'Soleil2026' };
export const AUTRE_COMPTE = { identifiant: 'binta', motDePasse: 'Lune2027x' };

export const IDENTIFIANTS_SAISIS = [
  { id: 'C1', libelle: 'identifiant exact', valeur: 'Awa.Ngono', statut: 'vise' },
  { id: 'C2', libelle: 'autre casse', valeur: 'awa.NGONO', statut: 'vise' },
  { id: 'C3', libelle: 'espaces autour', valeur: '  Awa.Ngono ', statut: 'vise' },
  { id: 'C4', libelle: 'identifiant inconnu', valeur: 'personne', statut: 'inconnu' },
  { id: 'C5', libelle: 'identifiant d’un autre compte', valeur: 'binta', statut: 'autre' },
  { id: 'C6', libelle: 'préfixe du bon identifiant', valeur: 'Awa.Ngon', statut: 'inconnu' },
  { id: 'C7', libelle: 'chaîne vide', valeur: '', statut: 'vide' },
  { id: 'C8', libelle: 'espaces seulement', valeur: '   ', statut: 'vide' },
  { id: 'C9', libelle: 'absent (undefined)', valeur: undefined, statut: 'vide' },
];

export const MOTS_DE_PASSE_SAISIS = [
  { id: 'W1', libelle: 'mot de passe correct', valeur: 'Soleil2026', statut: 'correct' },
  { id: 'W2', libelle: 'mot de passe incorrect', valeur: 'Pluie2026x', statut: 'incorrect' },
  { id: 'W3', libelle: 'différent seulement par la casse', valeur: 'soleil2026', statut: 'incorrect' },
  { id: 'W4', libelle: 'espace ajouté à la fin', valeur: 'Soleil2026 ', statut: 'incorrect' },
  { id: 'W5', libelle: 'préfixe du bon mot de passe', valeur: 'Soleil202', statut: 'incorrect' },
  { id: 'W6', libelle: 'mot de passe de l’autre compte', valeur: 'Lune2027x', statut: 'incorrect', deLAutre: true },
  { id: 'W7', libelle: 'chaîne vide', valeur: '', statut: 'vide' },
  { id: 'W8', libelle: 'absent (undefined)', valeur: undefined, statut: 'vide' },
];

export const ETATS_CONNEXION = [
  { id: 'B1', libelle: 'deux comptes, le visé créé en premier', ordre: ['vise', 'autre'] },
  { id: 'B2', libelle: 'deux comptes, le visé créé en dernier', ordre: ['autre', 'vise'] },
  { id: 'B3', libelle: 'quatre comptes', ordre: ['autre', 'tiers1', 'vise', 'tiers2'] },
];

/** Facteurs du pairwise de CONNEXION : 9 × 8 × 3 = 216 combinaisons au total. */
export const FACTEURS_CONNEXION = {
  identifiant: IDENTIFIANTS_SAISIS, motDePasse: MOTS_DE_PASSE_SAISIS, etat: ETATS_CONNEXION,
};
