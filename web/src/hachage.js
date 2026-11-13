// Hachage des mots de passe avec l'API Web Crypto (navigateur et Node) : PBKDF2,
// HMAC-SHA-256, sel aléatoire de 128 bits propre à chaque compte.
// Le mot de passe n'est jamais enregistré. Le grand nombre de tours rend chaque essai
// coûteux pour qui lirait la base ; le sel empêche de reconnaître deux mots de passe égaux.

export const ITERATIONS = 100_000;

const enHex = (octets) => [...octets].map((o) => o.toString(16).padStart(2, '0')).join('');
const depuisHex = (hex) => Uint8Array.from(hex.match(/../g), (paire) => parseInt(paire, 16));

/** Renvoie { genererSel(), hacher(motDePasse, sel) } ; sel et empreinte sont en hexadécimal. */
export function creerHacheur({ iterations = ITERATIONS, crypto = globalThis.crypto } = {}) {
  return {
    genererSel() {
      return enHex(crypto.getRandomValues(new Uint8Array(16)));
    },
    async hacher(motDePasse, sel) {
      const cle = await crypto.subtle.importKey('raw', new TextEncoder().encode(motDePasse), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: depuisHex(sel), iterations }, cle, 256,
      );
      return enHex(new Uint8Array(bits));
    },
  };
}
