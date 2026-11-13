// TDD de la page « Créer un compte » : règles vues du service, sans navigateur.
import { describe, it, expect, beforeEach } from 'vitest';
import { ErreurValidation, ServiceComptes } from '../src/comptes.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { nouveauServiceComptes, inscrire, hacheurFactice } from './doublures/contexte-compte.js';

describe('Créer un compte', () => {
  let comptes;
  let depot;

  beforeEach(() => {
    ({ comptes, depot } = nouveauServiceComptes());
  });

  it('crée un compte et renvoie sa partie publique', async () => {
    const compte = await inscrire(comptes, 'awa.ngono', 'Soleil2026');

    expect(compte).toEqual({ id: 'c-1', identifiant: 'awa.ngono', creeLe: '2026-11-10T09:00:00.000Z' });
  });

  it("n'expose jamais le sel ni l'empreinte du mot de passe", async () => {
    const compte = await inscrire(comptes, 'awa.ngono', 'Soleil2026');

    expect(Object.keys(compte).sort()).toEqual(['creeLe', 'id', 'identifiant']);
  });

  it("enregistre une empreinte salée, pas le mot de passe", async () => {
    await inscrire(comptes, 'awa.ngono', 'Soleil2026');

    const [enregistre] = await depot.listerComptes();
    expect(enregistre).toEqual({
      id: 'c-1', identifiant: 'awa.ngono', creeLe: '2026-11-10T09:00:00.000Z',
      sel: 'sel-1', empreinte: 'empreinte(sel-1|Soleil2026)',
    });
    expect(enregistre).not.toHaveProperty('motDePasse');
  });

  it('donne un sel différent à chaque compte, même pour un mot de passe identique', async () => {
    await inscrire(comptes, 'awa.ngono', 'Soleil2026');
    await inscrire(comptes, 'binta', 'Soleil2026');

    const [a, b] = await depot.listerComptes();
    expect(a.sel).not.toBe(b.sel);
    expect(a.empreinte).not.toBe(b.empreinte);
  });

  it("retire les espaces autour de l'identifiant", async () => {
    expect((await inscrire(comptes, '  binta  ', 'Soleil2026')).identifiant).toBe('binta');
  });

  it("refuse un identifiant déjà utilisé, sans tenir compte de la casse ni des espaces", async () => {
    await inscrire(comptes, 'Awa.Ngono', 'Soleil2026');

    const erreur = await inscrire(comptes, ' awa.NGONO ', 'Lune2027x').catch((e) => e);

    expect(erreur).toBeInstanceOf(ErreurValidation);
    expect(erreur.message).toBe('Cet identifiant est déjà utilisé');
    expect(erreur.champ).toBe('identifiant');
    expect(await depot.listerComptes()).toHaveLength(1);
  });

  it('refuse une confirmation différente du mot de passe', async () => {
    const erreur = await comptes
      .creerCompte({ identifiant: 'awa.ngono', motDePasse: 'Soleil2026', confirmation: 'Soleil2027' })
      .catch((e) => e);

    expect(erreur.message).toBe('Les deux mots de passe ne sont pas identiques');
    expect(erreur.champ).toBe('confirmation');
    expect(await depot.listerComptes()).toEqual([]);
  });

  it.each([
    ['vide', '', "L'identifiant est obligatoire"],
    ['trop court', 'ab', "L'identifiant doit faire entre 3 et 30 caractères"],
    ['trop long', 'a'.repeat(31), "L'identifiant doit faire entre 3 et 30 caractères"],
    ['avec un espace', 'awa ngono', "L'identifiant ne peut contenir que des lettres sans accent, des chiffres, le point, le tiret et le tiret bas"],
  ])('refuse un identifiant %s avec un message précis', async (_cas, identifiant, message) => {
    const erreur = await inscrire(comptes, identifiant, 'Soleil2026').catch((e) => e);

    expect(erreur.message).toBe(message);
    expect(erreur.champ).toBe('identifiant');
  });

  it.each([
    ['vide', '', 'Le mot de passe est obligatoire'],
    ['trop court', 'abcdef1', 'Le mot de passe doit faire entre 8 et 64 caractères'],
    ['trop long', `${'a'.repeat(64)}1`, 'Le mot de passe doit faire entre 8 et 64 caractères'],
    ['sans chiffre', 'abcdefgh', 'Le mot de passe doit contenir au moins une lettre et un chiffre'],
    ['sans lettre', '12345678', 'Le mot de passe doit contenir au moins une lettre et un chiffre'],
  ])('refuse un mot de passe %s avec un message précis', async (_cas, motDePasse, message) => {
    const erreur = await inscrire(comptes, 'awa.ngono', motDePasse).catch((e) => e);

    expect(erreur.message).toBe(message);
    expect(erreur.champ).toBe('motDePasse');
  });

  it('refuse un formulaire entièrement absent', async () => {
    await expect(comptes.creerCompte()).rejects.toThrow("L'identifiant est obligatoire");
  });

  // Ajouté après le test de mutation : l'horloge et le générateur d'identifiants par
  // défaut n'étaient jamais exécutés (même trou que celui trouvé sur TodoService).
  it("sans injection, utilise l'horloge système et des UUID", async () => {
    const reel = new ServiceComptes(new DepotMemoire(), { hacheur: hacheurFactice() });
    const avant = Date.now();

    const a = await inscrire(reel, 'awa.ngono', 'Soleil2026');
    const b = await inscrire(reel, 'binta', 'Soleil2026');

    expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(b.id).not.toBe(a.id);
    expect(a.creeLe).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Date.parse(a.creeLe)).toBeGreaterThanOrEqual(avant);
    expect(Date.parse(a.creeLe)).toBeLessThanOrEqual(Date.now());
  });

  it('retrouve un compte par son id (reprise de session), sans ses secrets', async () => {
    const compte = await inscrire(comptes, 'awa.ngono', 'Soleil2026');

    expect(await comptes.trouverCompte(compte.id)).toEqual(compte);
    expect(await comptes.trouverCompte('inconnu')).toBeNull();
  });
});
