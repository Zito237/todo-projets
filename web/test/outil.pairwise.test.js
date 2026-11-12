// Tests de l'OUTILLAGE : avant de faire confiance aux cas pairwise, on vérifie le
// générateur lui-même (comme on vérifiait la sortie de jenny et le décorateur Java).
import { describe, it, expect } from 'vitest';
import { genererPairwise, pairesNonCouvertes, tailleProduitCartesien } from './pairwise/pairwise.js';
import { FACTEURS_AJOUT, FACTEURS_MODIFICATION, FACTEURS_COMPOSITION } from './pairwise/facteurs.js';

const jeux = { ajout: FACTEURS_AJOUT, modification: FACTEURS_MODIFICATION, composition: FACTEURS_COMPOSITION };

describe('générateur pairwise', () => {
  describe.each(Object.entries(jeux))('facteurs « %s »', (_nom, facteurs) => {
    const cas = genererPairwise(facteurs);

    it('couvre TOUTES les paires de valeurs', () => {
      expect(pairesNonCouvertes(facteurs, cas)).toEqual([]);
    });

    it('produit bien moins de cas que le produit cartésien', () => {
      expect(cas.length).toBeLessThan(tailleProduitCartesien(facteurs));
    });

    it('ne descend pas sous le minimum théorique (produit des deux plus grands facteurs)', () => {
      const tailles = Object.values(facteurs).map((v) => v.length).sort((a, b) => b - a);
      expect(cas.length).toBeGreaterThanOrEqual(tailles[0] * tailles[1]);
    });

    it('est déterministe : deux générations donnent les mêmes cas', () => {
      expect(genererPairwise(facteurs)).toEqual(cas);
    });
  });

  it('détecte un jeu de cas incomplet (on retire un cas)', () => {
    const cas = genererPairwise(FACTEURS_AJOUT);
    expect(pairesNonCouvertes(FACTEURS_AJOUT, cas.slice(1)).length).toBeGreaterThan(0);
  });

  it('refuse un seul facteur ou un facteur sans valeur', () => {
    expect(() => genererPairwise({ a: [{ id: 'a1' }] })).toThrow('au moins deux facteurs');
    expect(() => genererPairwise({ a: [{ id: 'a1' }], b: [] })).toThrow('aucune valeur');
  });
});
