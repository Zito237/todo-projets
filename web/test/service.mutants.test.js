// Tests ajoutés pour TUER des mutants survivants signalés par Stryker (npm run test:mutation).
// Règle d'or de la séance 9 : tout défaut trouvé laisse derrière lui un test qui le reproduit.
import { describe, it, expect } from 'vitest';
import { TodoService, ErreurValidation } from '../src/service.js';
import { DepotMemoire } from './doublures/depot-memoire.js';

const refus = (promesse) => promesse.then(() => { throw new Error('refus attendu'); }, (e) => e);

describe('chaque refus indique le champ en cause (contrat de ErreurValidation)', () => {
  it.each([
    ['nom de projet vide', (s) => s.ajouterProjet('  '), 'nom'],
    ['nom de projet en double', async (s) => { await s.ajouterProjet('Maison'); return s.ajouterProjet('MAISON'); }, 'nom'],
    ['tâche inexistante (modifier)', (s) => s.modifierTache('fantome', { titre: 'X' }), 'tache'],
    ['tâche inexistante (cocher)', (s) => s.basculerTerminee('fantome'), 'tache'],
    ['projet inexistant (statistiques)', (s) => s.statistiques('fantome'), 'projet'],
  ])('%s → champ « %s »', async (_cas, action, champ) => {
    const e = await refus(action(new TodoService(new DepotMemoire())));
    expect(e).toBeInstanceOf(ErreurValidation);
    expect(e.name).toBe('ErreurValidation');
    expect(e.message.length).toBeGreaterThan(10); // un vrai message pour l'utilisateur
    expect(e.champ).toBe(champ);
  });
});

describe('sans injection, le service utilise l’horloge système et des UUID', () => {
  // Ces valeurs par défaut ne servent qu'en production ; tous les autres tests les remplacent.
  // On vérifie la FORME, pas la valeur : le test reste reproductible.
  it('dates ISO réelles, identifiants uniques', async () => {
    const service = new TodoService(new DepotMemoire());
    const p = await service.ajouterProjet('Maison');
    const t = await service.ajouterTache(p.id, { titre: 'Payer ENEO' });

    expect(Number.isNaN(Date.parse(t.creeLe))).toBe(false);
    expect(t.creeLe).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(t.id).not.toBe(p.id);
  });
});
