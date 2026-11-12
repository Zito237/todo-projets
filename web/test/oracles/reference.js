// ORACLE DE RÉFÉRENCE (oracle de spécification) : prédit le résultat attendu (RA)
// d'un cas à partir de la SPÉCIFICATION, encodée dans les classes d'équivalence,
// sans appeler ni relire le code testé.
//
// Priorité des refus (lacune de spécification, comme la priorité plafond/solde du
// TP Mobile Money) : quand plusieurs champs sont invalides, quel message afficher ?
// Choix retenu, à faire valider par le client :
//   - ajout        : projet, puis titre, puis échéance (le projet est le contexte du formulaire) ;
//   - modification : titre, puis échéance, puis projet (ordre des champs du formulaire d'édition).

/** RA d'un ajout : { erreur: champ } ou { tache: { titre, echeance, terminee } }. */
export function attenduAjout({ titre, echeance, projet }) {
  if (!projet.existe) return { erreur: 'projet' };
  if (!titre.valide) return { erreur: 'titre' };
  if (!echeance.valide) return { erreur: 'echeance' };
  return { tache: { titre: titre.attendu, echeance: echeance.attendu, terminee: false } };
}

/**
 * RA d'une modification, connaissant la tâche avant modification et les deux projets du contexte.
 * @returns { erreur: champ } ou { tache: { titre, echeance, terminee, projetId } }
 */
export function attenduModification({ titre, echeance, projet }, avant, { autreProjetId }) {
  if (!titre.absent && !titre.valide) return { erreur: 'titre' };
  if (!echeance.absent && !echeance.valide) return { erreur: 'echeance' };
  if (!projet.absent && !projet.valide) return { erreur: 'projet' };
  return {
    tache: {
      titre: titre.absent ? avant.titre : titre.attendu,
      echeance: echeance.absent ? avant.echeance : echeance.attendu,
      terminee: avant.terminee, // modifier ne change jamais le statut
      projetId: projet.cible === 'autre' ? autreProjetId : avant.projetId,
    },
  };
}

/** Objet de changements envoyé à modifierTache : un champ absent n'y figure pas. */
export function changementsDe({ titre, echeance, projet }, { projetId, autreProjetId }) {
  const changements = {};
  if (!titre.absent) changements.titre = titre.valeur;
  if (!echeance.absent) changements.echeance = echeance.valeur;
  if (!projet.absent) {
    changements.projetId = { meme: projetId, autre: autreProjetId, fantome: 'projet-fantome' }[projet.cible];
  }
  return changements;
}

/** RA des statistiques d'un projet de n tâches dont t terminées (définition de la spécification). */
export function attenduStatistiques(aFaire, terminees) {
  const total = aFaire + terminees;
  return { total, aFaire, terminees, progression: total === 0 ? 0 : Math.round((100 * terminees) / total) };
}
