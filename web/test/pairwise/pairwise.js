// Générateur PAIRWISE (test par paires), équivalent JavaScript de jenny et du
// décorateur @PairwiseSource du devoir sur l'équation du second degré.
//
// Idée (séance 4) : la plupart des défauts sont déclenchés par UN paramètre ou par
// l'interaction de DEUX paramètres. Au lieu du produit cartésien (toutes les
// combinaisons), on choisit un petit ensemble de cas où chaque PAIRE de valeurs
// de deux facteurs différents apparaît au moins une fois.
//
// Algorithme glouton déterministe (famille AETG) : tant qu'une paire n'est pas
// couverte, on construit un cas qui part de cette paire puis, facteur par facteur,
// prend la valeur qui couvre le plus de paires encore manquantes. Aucun hasard :
// la même entrée donne toujours les mêmes cas (qualité R de F.I.R.S.T.).

/**
 * @param {Record<string, Array<{id: string}>>} facteurs  nom du facteur -> valeurs (chaque valeur a un id)
 * @returns {Array<Record<string, object>>} les cas : nom du facteur -> valeur choisie
 */
export function genererPairwise(facteurs) {
  const noms = Object.keys(facteurs);
  if (noms.length < 2) {
    throw new Error('Le pairwise demande au moins deux facteurs');
  }
  for (const nom of noms) {
    if (!facteurs[nom].length) throw new Error(`Le facteur « ${nom} » n'a aucune valeur`);
  }

  const manquantes = toutesLesPaires(facteurs);
  const cas = [];

  while (manquantes.size > 0) {
    // 1. Graine : la première paire encore manquante (ordre déterministe)
    const [graine] = manquantes;
    const [f1, i1, f2, i2] = decoder(graine);
    const indices = { [f1]: i1, [f2]: i2 };

    // 2. Compléter les autres facteurs en maximisant les nouvelles paires couvertes
    for (const nom of noms) {
      if (nom in indices) continue;
      let meilleur = 0;
      let meilleurGain = -1;
      facteurs[nom].forEach((_, i) => {
        let gain = 0;
        for (const [autre, j] of Object.entries(indices)) {
          if (manquantes.has(cle(nom, i, autre, j, noms))) gain++;
        }
        if (gain > meilleurGain) { meilleurGain = gain; meilleur = i; }
      });
      indices[nom] = meilleur;
    }

    // 3. Retirer les paires couvertes par ce cas
    for (let a = 0; a < noms.length; a++) {
      for (let b = a + 1; b < noms.length; b++) {
        manquantes.delete(cle(noms[a], indices[noms[a]], noms[b], indices[noms[b]], noms));
      }
    }
    cas.push(Object.fromEntries(noms.map((nom) => [nom, facteurs[nom][indices[nom]]])));
  }

  const oubliees = pairesNonCouvertes(facteurs, cas);
  if (oubliees.length) {
    // Comme le décorateur Java : on refuse de servir des cas incomplets
    throw new Error(`Pairwise incomplet : ${oubliees.length} paire(s) non couverte(s), ex. ${oubliees[0]}`);
  }
  return cas;
}

/** Liste lisible des paires qu'aucun cas ne couvre (vide si la couverture est complète). */
export function pairesNonCouvertes(facteurs, cas) {
  const noms = Object.keys(facteurs);
  const manquantes = toutesLesPaires(facteurs);
  for (const c of cas) {
    for (let a = 0; a < noms.length; a++) {
      for (let b = a + 1; b < noms.length; b++) {
        const ia = facteurs[noms[a]].indexOf(c[noms[a]]);
        const ib = facteurs[noms[b]].indexOf(c[noms[b]]);
        manquantes.delete(cle(noms[a], ia, noms[b], ib, noms));
      }
    }
  }
  return [...manquantes].map((k) => {
    const [fa, ia, fb, ib] = decoder(k);
    return `${fa}=${facteurs[fa][ia].id} × ${fb}=${facteurs[fb][ib].id}`;
  });
}

/** Nombre de cas du produit cartésien, pour comparer avec le pairwise. */
export function tailleProduitCartesien(facteurs) {
  return Object.values(facteurs).reduce((n, valeurs) => n * valeurs.length, 1);
}

/** Libellé d'un cas pour les rapports de test : « projet=P1 titre=T3 echeance=E5 ». */
export function nommerCas(c) {
  return Object.entries(c).map(([nom, v]) => `${nom}=${v.id}`).join(' ');
}

// ----- détails -----

function toutesLesPaires(facteurs) {
  const noms = Object.keys(facteurs);
  const paires = new Set();
  for (let a = 0; a < noms.length; a++) {
    for (let b = a + 1; b < noms.length; b++) {
      facteurs[noms[a]].forEach((_, i) => facteurs[noms[b]].forEach((__, j) => {
        paires.add(cle(noms[a], i, noms[b], j, noms));
      }));
    }
  }
  return paires;
}

/** Clé canonique d'une paire : le facteur qui vient en premier dans `noms` est écrit en premier. */
function cle(fa, ia, fb, ib, noms) {
  return noms.indexOf(fa) < noms.indexOf(fb) ? `${fa}\u0000${ia}\u0000${fb}\u0000${ib}` : `${fb}\u0000${ib}\u0000${fa}\u0000${ia}`;
}

function decoder(k) {
  const [fa, ia, fb, ib] = k.split('\u0000');
  return [fa, Number(ia), fb, Number(ib)];
}
