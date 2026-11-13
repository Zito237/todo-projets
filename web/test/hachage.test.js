// Hachage des mots de passe. Test de CONTRAT : les mêmes propriétés sont exigées du
// vrai hacheur (PBKDF2 de l'API Web Crypto, présente dans le navigateur et dans Node)
// et du fake utilisé par les tests unitaires. Niveau : intégration (code + Web Crypto).
import { describe, it, expect } from 'vitest';
import { creerHacheur, ITERATIONS } from '../src/hachage.js';
import { ServiceComptes } from '../src/comptes.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { hacheurFactice } from './doublures/contexte-compte.js';
import { horlogeFixe, idsSequentiels } from './doublures/fixtures.js';

const implementations = {
  'vrai hacheur PBKDF2': () => creerHacheur({ iterations: 1000 }), // peu de tours : test rapide
  'fake des tests unitaires': () => hacheurFactice(),
};

for (const [nom, fabriquer] of Object.entries(implementations)) {
  describe(`contrat du hacheur : ${nom}`, () => {
    it('est déterministe : même mot de passe et même sel, même empreinte', async () => {
      const hacheur = fabriquer();
      const sel = hacheur.genererSel();
      expect(await hacheur.hacher('Soleil2026', sel)).toBe(await hacheur.hacher('Soleil2026', sel));
    });

    it('change d’empreinte quand le mot de passe change, même d’un caractère', async () => {
      const hacheur = fabriquer();
      const sel = hacheur.genererSel();
      expect(await hacheur.hacher('Soleil2026', sel)).not.toBe(await hacheur.hacher('Soleil2027', sel));
      expect(await hacheur.hacher('Soleil2026', sel)).not.toBe(await hacheur.hacher('soleil2026', sel));
    });

    it('change d’empreinte quand le sel change', async () => {
      const hacheur = fabriquer();
      expect(await hacheur.hacher('Soleil2026', hacheur.genererSel())).not.toBe(await hacheur.hacher('Soleil2026', hacheur.genererSel()));
    });

    it('ne donne jamais deux fois le même sel', () => {
      const hacheur = fabriquer();
      const sels = Array.from({ length: 50 }, () => hacheur.genererSel());
      expect(new Set(sels).size).toBe(50);
    });
  });
}

describe('vrai hacheur PBKDF2', () => {
  it('produit une empreinte de 256 bits en hexadécimal, sans trace du mot de passe', async () => {
    const hacheur = creerHacheur({ iterations: 1000 });
    const empreinte = await hacheur.hacher('Soleil2026', hacheur.genererSel());

    expect(empreinte).toMatch(/^[0-9a-f]{64}$/);
    expect(empreinte).not.toContain('Soleil2026');
  });

  it('produit un sel de 128 bits en hexadécimal', () => {
    expect(creerHacheur().genererSel()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('donne la valeur connue de PBKDF2-HMAC-SHA-256 (vecteur de référence « password » / « salt », 1 tour)', async () => {
    // Oracle de référence externe : valeur publiée pour PBKDF2-HMAC-SHA256, P="password", S="salt", c=1, dkLen=32
    const sel = Buffer.from('salt').toString('hex');
    expect(await creerHacheur({ iterations: 1 }).hacher('password', sel))
      .toBe('120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');
  });

  it('dépend du nombre de tours, fixé à 100 000 en production', async () => {
    const sel = creerHacheur().genererSel();
    expect(ITERATIONS).toBe(100_000);
    expect(await creerHacheur({ iterations: 1000 }).hacher('Soleil2026', sel))
      .not.toBe(await creerHacheur({ iterations: 1001 }).hacher('Soleil2026', sel));
  });

  it('de bout en bout : inscription puis connexion avec le vrai hacheur, rien en clair dans le dépôt', async () => {
    const depot = new DepotMemoire();
    const comptes = new ServiceComptes(depot, {
      horloge: horlogeFixe(), genererId: idsSequentiels('c'), hacheur: creerHacheur({ iterations: 1000 }),
    });
    const cree = await comptes.creerCompte({ identifiant: 'awa.ngono', motDePasse: 'Soleil2026', confirmation: 'Soleil2026' });

    expect(await comptes.connecter({ identifiant: 'awa.ngono', motDePasse: 'Soleil2026' })).toEqual(cree);
    await expect(comptes.connecter({ identifiant: 'awa.ngono', motDePasse: 'Soleil2027' })).rejects.toThrow('Identifiant ou mot de passe incorrect');
    expect(JSON.stringify(await depot.listerComptes())).not.toContain('Soleil2026');
  });
});
