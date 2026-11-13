// TDD de la page « Se connecter ».
import { describe, it, expect, beforeEach } from 'vitest';
import { ErreurValidation } from '../src/comptes.js';
import { nouveauServiceComptes, inscrire, etatComptes } from './doublures/contexte-compte.js';

describe('Se connecter', () => {
  let comptes;
  let depot;
  let awa;

  beforeEach(async () => {
    ({ comptes, depot } = nouveauServiceComptes());
    awa = await inscrire(comptes, 'Awa.Ngono', 'Soleil2026');
    await inscrire(comptes, 'binta', 'Lune2027x');
  });

  it('connecte avec le bon identifiant et le bon mot de passe', async () => {
    expect(await comptes.connecter({ identifiant: 'Awa.Ngono', motDePasse: 'Soleil2026' })).toEqual(awa);
  });

  it("ignore la casse et les espaces autour de l'identifiant", async () => {
    expect(await comptes.connecter({ identifiant: '  awa.NGONO ', motDePasse: 'Soleil2026' })).toEqual(awa);
  });

  it('refuse un mauvais mot de passe', async () => {
    const erreur = await comptes.connecter({ identifiant: 'Awa.Ngono', motDePasse: 'Pluie2026x' }).catch((e) => e);

    expect(erreur).toBeInstanceOf(ErreurValidation);
    expect(erreur.message).toBe('Identifiant ou mot de passe incorrect');
    expect(erreur.champ).toBe('connexion');
  });

  it('tient compte de la casse et des espaces du mot de passe', async () => {
    await expect(comptes.connecter({ identifiant: 'Awa.Ngono', motDePasse: 'soleil2026' })).rejects.toThrow(ErreurValidation);
    await expect(comptes.connecter({ identifiant: 'Awa.Ngono', motDePasse: 'Soleil2026 ' })).rejects.toThrow(ErreurValidation);
  });

  it("refuse le mot de passe d'un autre compte", async () => {
    await expect(comptes.connecter({ identifiant: 'Awa.Ngono', motDePasse: 'Lune2027x' }))
      .rejects.toThrow('Identifiant ou mot de passe incorrect');
  });

  it('ne dit pas si c’est l’identifiant ou le mot de passe qui est faux', async () => {
    const inconnu = await comptes.connecter({ identifiant: 'personne', motDePasse: 'Soleil2026' }).catch((e) => e);
    const mauvais = await comptes.connecter({ identifiant: 'Awa.Ngono', motDePasse: 'Pluie2026x' }).catch((e) => e);

    expect({ message: inconnu.message, champ: inconnu.champ }).toEqual({ message: mauvais.message, champ: mauvais.champ });
  });

  it.each([
    ['identifiant vide', { identifiant: '', motDePasse: 'Soleil2026' }, "L'identifiant est obligatoire", 'identifiant'],
    ['mot de passe vide', { identifiant: 'Awa.Ngono', motDePasse: '' }, 'Le mot de passe est obligatoire', 'motDePasse'],
    ['formulaire absent', undefined, "L'identifiant est obligatoire", 'identifiant'],
  ])('refuse une connexion avec %s', async (_cas, saisie, message, champ) => {
    const erreur = await comptes.connecter(saisie).catch((e) => e);

    expect(erreur.message).toBe(message);
    expect(erreur.champ).toBe(champ);
  });

  it("ne modifie rien dans la base, que la connexion réussisse ou non", async () => {
    const avant = await etatComptes(depot);

    await comptes.connecter({ identifiant: 'Awa.Ngono', motDePasse: 'Soleil2026' });
    await comptes.connecter({ identifiant: 'Awa.Ngono', motDePasse: 'faux' }).catch(() => {});

    expect(await etatComptes(depot)).toEqual(avant);
  });
});
