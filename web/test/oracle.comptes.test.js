// ORACLES sans valeur attendue écrite à la main, appliqués aux comptes.
// Les données viennent des classes d'équivalence et des cas pairwise.
//
//   RÉFLEXIF      : refaire la même chose redonne le même résultat.
//   MÉTAMORPHIQUE : on transforme l'entrée d'une façon dont on connaît l'effet sur la sortie.
//   DIFFÉRENTIEL  : mêmes opérations sur le fake et sur IndexedDB, mêmes résultats.
//
// L'oracle par HOMOTHÉTIE n'a pas d'équivalent ici : un identifiant ou un mot de
// passe ne se « multiplie » pas par k. On ne force pas un oracle là où il ne dit rien.
import { describe, it, expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { nommerCas } from './pairwise/pairwise.js';
import { IDENTIFIANTS, COMPTE_VISE, IDENTIFIANTS_SAISIS, MOTS_DE_PASSE_SAISIS } from './pairwise/facteurs-compte.js';
import { validerIdentifiant, cleIdentifiant } from '../src/regles-compte.js';
import { DepotIndexedDB } from '../src/depot-indexeddb.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import {
  nouveauServiceComptes, inscrire, peuplerComptes, etatComptes, CAS_INSCRIPTION, CAS_CONNEXION, preparerEtat, saisieDe,
} from './doublures/contexte-compte.js';

/** Résultat observable d'une tentative : le compte, ou le refus (champ + message). */
async function tenter(action) {
  try {
    return { compte: await action() };
  } catch (e) {
    return { refus: { type: e.name, champ: e.champ, message: e.message } };
  }
}

const connexion = (comptes, c) => tenter(() => comptes.connecter({ identifiant: c.identifiant.valeur, motDePasse: c.motDePasse.valeur }));

describe('oracle réflexif', () => {
  it.each(IDENTIFIANTS.filter((i) => i.valide).map((i) => [`${i.id} ${i.libelle}`, i]))(
    'valider(valider(x)) = valider(x) : %s', (_nom, classe) => {
      const une = validerIdentifiant(classe.valeur);
      expect(validerIdentifiant(une)).toBe(une);
      expect(cleIdentifiant(cleIdentifiant(une))).toBe(cleIdentifiant(une));
    },
  );

  it.each(CAS_CONNEXION.map((c) => [nommerCas(c), c]))('se connecter deux fois donne deux fois le même résultat : %s', async (_nom, c) => {
    const { comptes } = nouveauServiceComptes();
    await peuplerComptes(comptes, c.etat.ordre);

    const premiere = await connexion(comptes, c);
    const seconde = await connexion(comptes, c);

    expect(seconde).toEqual(premiere);
  });

  it('s’inscrire deux fois avec les mêmes données : la seconde est refusée, la base ne change plus', async () => {
    const { comptes, depot } = nouveauServiceComptes();
    await inscrire(comptes, 'awa.ngono', 'Soleil2026');
    const apresUne = await etatComptes(depot);

    await expect(inscrire(comptes, 'awa.ngono', 'Soleil2026')).rejects.toThrow('Cet identifiant est déjà utilisé');

    expect(await etatComptes(depot)).toEqual(apresUne);
  });
});

describe('oracles métamorphiques', () => {
  const variantes = (texte) => [texte.toUpperCase(), texte.toLowerCase(), `  ${texte}  `, `\t${texte}\n`];

  // MR1 : changer la casse de l'identifiant ou l'entourer d'espaces ne change pas le résultat
  it.each(CAS_CONNEXION.filter((c) => c.identifiant.statut !== 'vide').map((c) => [nommerCas(c), c]))(
    'MR1 casse et espaces de l’identifiant sans effet : %s', async (_nom, c) => {
      const { comptes } = nouveauServiceComptes();
      await peuplerComptes(comptes, c.etat.ordre);
      const reference = await connexion(comptes, c);

      for (const identifiant of variantes(c.identifiant.valeur)) {
        expect(await tenter(() => comptes.connecter({ identifiant, motDePasse: c.motDePasse.valeur }))).toEqual(reference);
      }
    },
  );

  // MR2 : le résultat d'une connexion ne dépend pas de l'ordre de création des comptes
  it.each(IDENTIFIANTS_SAISIS.flatMap((i) => MOTS_DE_PASSE_SAISIS.map((m) => [`${i.id} × ${m.id}`, { identifiant: i, motDePasse: m }])))(
    'MR2 ordre de création des comptes sans effet : %s', async (_nom, c) => {
      const resultats = [];
      for (const ordre of [['vise', 'autre', 'tiers1'], ['tiers1', 'autre', 'vise'], ['autre', 'vise', 'tiers1']]) {
        const { comptes } = nouveauServiceComptes();
        await peuplerComptes(comptes, ordre);
        const r = await connexion(comptes, c);
        // l'id du compte dépend de l'ordre de création : on compare l'identifiant
        resultats.push(r.compte ? { identifiant: r.compte.identifiant } : r);
      }
      expect(resultats[1]).toEqual(resultats[0]);
      expect(resultats[2]).toEqual(resultats[0]);
    },
  );

  // MR3 : créer un compte de plus ne change le résultat d'aucune connexion déjà possible ou impossible
  it.each(CAS_CONNEXION.filter((c) => c.identifiant.statut !== 'inconnu').map((c) => [nommerCas(c), c]))(
    'MR3 un nouveau compte ne change rien pour les autres : %s', async (_nom, c) => {
      const { comptes } = nouveauServiceComptes();
      await peuplerComptes(comptes, c.etat.ordre);
      const avant = await connexion(comptes, c);

      await inscrire(comptes, 'nouvelle.venue', COMPTE_VISE.motDePasse);

      expect(await connexion(comptes, c)).toEqual(avant);
    },
  );

  // MR4 : non-divulgation. Un identifiant inconnu et un mauvais mot de passe donnent
  // exactement le même refus : on ne peut pas deviner quels identifiants existent.
  it.each(MOTS_DE_PASSE_SAISIS.filter((m) => m.statut === 'incorrect').map((m) => [`${m.id} ${m.libelle}`, m]))(
    'MR4 même refus pour identifiant inconnu et mauvais mot de passe : %s', async (_nom, motDePasse) => {
      const { comptes } = nouveauServiceComptes();
      await peuplerComptes(comptes, ['vise', 'autre']);

      const connu = await tenter(() => comptes.connecter({ identifiant: COMPTE_VISE.identifiant, motDePasse: motDePasse.valeur }));
      const inconnu = await tenter(() => comptes.connecter({ identifiant: 'personne', motDePasse: motDePasse.valeur }));

      expect(connu.refus).toBeDefined();
      expect(inconnu).toEqual(connu);
    },
  );

  // MR5 : changer de mot de passe à l'inscription ne change pas le compte public créé
  it.each(IDENTIFIANTS.filter((i) => i.valide).map((i) => [`${i.id} ${i.libelle}`, i]))(
    'MR5 le compte public ne dépend pas du mot de passe choisi : %s', async (_nom, classe) => {
      const a = await inscrire(nouveauServiceComptes().comptes, classe.valeur, 'Soleil2026');
      const b = await inscrire(nouveauServiceComptes().comptes, classe.valeur, 'ToutAutre99!');

      expect(b).toEqual(a);
    },
  );
});

describe(`oracle différentiel fake ↔ IndexedDB sur ${CAS_INSCRIPTION.length} cas pairwise d'inscription`, () => {
  let numeroBase = 0;

  async function jouer(depot, c) {
    const { comptes } = nouveauServiceComptes(depot);
    await preparerEtat(comptes, c);
    const inscription = await tenter(() => comptes.creerCompte(saisieDe(c)));
    const connexionEnsuite = await tenter(() => comptes.connecter({ identifiant: c.identifiant.valeur, motDePasse: c.motDePasse.valeur }));
    return { inscription, connexionEnsuite, etat: await etatComptes(depot) };
  }

  it.each(CAS_INSCRIPTION.map((c) => [nommerCas(c), c]))('%s', async (_nom, c) => {
    const memoire = await jouer(new DepotMemoire(), c);
    const indexeddb = await jouer(await DepotIndexedDB.ouvrir(new IDBFactory(), `comptes-${++numeroBase}`), c);
    expect(indexeddb).toEqual(memoire);
  });

  it('RÉFLEXIF : un compte créé permet encore de se connecter après réouverture de la base', async () => {
    const fabrique = new IDBFactory();
    const premier = await DepotIndexedDB.ouvrir(fabrique, 'comptes-reouverture');
    const cree = await inscrire(nouveauServiceComptes(premier).comptes, 'Awa.Ngono', 'Soleil2026');
    premier.fermer();

    const second = await DepotIndexedDB.ouvrir(fabrique, 'comptes-reouverture'); // comme un rechargement de page
    const { comptes } = nouveauServiceComptes(second);
    expect(await comptes.connecter({ identifiant: 'awa.ngono', motDePasse: 'Soleil2026' })).toEqual(cree);
    expect(await comptes.trouverCompte(cree.id)).toEqual(cree);
  });
});
