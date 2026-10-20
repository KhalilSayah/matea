/* MATEA — /api/health

   Dit pourquoi ça ne marche pas, sans rien révéler de sensible.

   Ouvre https://ton-site.vercel.app/api/health dans un navigateur.
   Avec l'en-tête x-matea-token, la réponse détaille aussi les erreurs
   renvoyées par Supabase. */

const { isAdmin, send } = require('./_lib');

const SB_URL = process.env.SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN = process.env.ADMIN_PASSWORD || '';

/* La charge utile d'un JWT Supabase n'est pas un secret : c'est du base64
   que n'importe qui peut lire. On s'en sert juste pour dire si la clé
   collée est la bonne — confondre « anon » et « service_role » est
   l'erreur la plus fréquente, et elle donne des tables vides au lieu
   d'un message d'erreur. */
function keyRole(jwt) {
  try {
    const part = String(jwt).split('.')[1];
    if (!part) return 'illisible';
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json).role || 'inconnu';
  } catch (e) {
    return 'illisible';
  }
}

module.exports = async function handler(req, res) {
  const detailed = isAdmin(req);

  const checks = {
    SUPABASE_URL: SB_URL ? 'présente' : 'MANQUANTE',
    SUPABASE_SERVICE_ROLE_KEY: SB_KEY ? 'présente' : 'MANQUANTE',
    ADMIN_PASSWORD: ADMIN ? 'présent' : 'MANQUANT'
  };

  const out = { ok: false, checks, hints: [] };

  if (SB_URL) {
    try { out.host = new URL(SB_URL).host; }
    catch (e) { out.hints.push("SUPABASE_URL n'est pas une URL valide. Attendu : https://xxxx.supabase.co"); }
  }

  if (SB_KEY) {
    const role = keyRole(SB_KEY);
    out.key_role = role;
    if (role === 'anon') {
      out.hints.push(
        "C'est la clé « anon » qui est dans SUPABASE_SERVICE_ROLE_KEY. " +
        "Elle est bloquée par RLS, donc toutes les tables paraissent vides. " +
        "Reprends la clé « service_role » dans Supabase → Settings → API."
      );
    } else if (role !== 'service_role') {
      out.hints.push('Rôle de clé inattendu : ' + role);
    }
  }

  if (!SB_URL || !SB_KEY) {
    out.hints.push(
      "Variables absentes du déploiement en cours. Ajoute-les dans Vercel → " +
      "Settings → Environment Variables, puis REDÉPLOIE : une variable ajoutée " +
      "ne s'applique qu'au déploiement suivant."
    );
    return send(res, 200, out);
  }

  /* Aller-retour réel vers Supabase. */
  try {
    const r = await fetch(SB_URL.replace(/\/$/, '') + '/rest/v1/products?select=id,status&limit=5', {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    });
    const text = await r.text();
    out.supabase_status = r.status;

    if (!r.ok) {
      out.hints.push('Supabase a répondu ' + r.status + '.');

      /* PostgREST renvoie un objet { code, message, hint, details }.
         Ces champs décrivent la panne, pas les données : on peut les
         montrer. Le corps brut, lui, ne sort qu'avec le mot de passe. */
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (e) {}
      if (parsed && typeof parsed === 'object') {
        out.supabase_code = parsed.code || null;
        out.supabase_message = parsed.message || null;
        if (parsed.hint) out.supabase_hint = parsed.hint;
      } else {
        out.supabase_body_type = (r.headers.get('content-type') || 'inconnu');
        out.supabase_body_start = String(text).replace(/\s+/g, ' ').slice(0, 120);
      }

      if (r.status === 401) out.hints.push('Clé refusée : vérifie SUPABASE_SERVICE_ROLE_KEY.');
      if (r.status === 404) out.hints.push("Table absente : le contenu de supabase/schema.sql n'a pas été exécuté sur CE projet.");
      if (r.status === 403) {
        out.hints.push(
          "403 avec une clé service_role est anormal : cette clé ignore RLS. " +
          "Les deux causes habituelles sont des restrictions réseau côté Supabase " +
          "(Settings → Database → Network Restrictions, qui bloquent les IP de Vercel), " +
          "ou les anciennes clés JWT désactivées au profit des nouvelles clés " +
          "sb_secret_… (Settings → API Keys)."
        );
      }
      if (detailed) out.supabase_raw = String(text).slice(0, 500);
      return send(res, 200, out);
    }

    const rows = JSON.parse(text);
    out.products_visible = rows.length;

    /* Le bucket d'images : il s'agit de savoir s'il existe et s'il est
       public. Un bucket privé laisse passer l'envoi sans rien dire, puis
       toutes les images affichent 404 — panne silencieuse, à éviter. */
    const bucket = process.env.STORAGE_BUCKET || 'products';
    try {
      const b = await fetch(SB_URL.replace(/\/$/, '') + '/storage/v1/bucket/' + bucket, {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
      });
      if (b.ok) {
        const info = await b.json();
        out.storage = {
          bucket: bucket,
          public: info.public === true,
          limite_octets: info.file_size_limit || null
        };
        if (info.public !== true) {
          out.hints.push("Le bucket « " + bucket + " » n'est pas public : les images " +
                         "s'enverront mais ne s'afficheront pas. Rejoue le bloc " +
                         "« Stockage des images » de supabase/schema.sql.");
        }
      } else {
        out.storage = { bucket: bucket, trouve: false, statut: b.status };
        out.hints.push("Bucket « " + bucket + " » introuvable (" + b.status + "). " +
                       "Exécute le bloc « Stockage des images » de supabase/schema.sql.");
      }
    } catch (e) {
      out.storage = { bucket: bucket, erreur: detailed ? e.message : 'injoignable' };
    }

    if (out.key_role && out.key_role !== 'service_role') {
      /* la requête a beau passer, l'écriture des commandes, elle, échouera */
      out.hints.push("Corrige la clé avant d'aller plus loin : avec celle-ci, les commandes seront refusées.");
    } else if (rows.length === 0) {
      out.hints.push(
        "Connexion établie, mais la table products est vide. Soit le bloc " +
        "« Catalogue de départ » de schema.sql n'a pas été exécuté, soit la clé " +
        "utilisée est bridée par RLS."
      );
    } else {
      out.ok = !out.storage || out.storage.public === true;
      if (out.ok) out.hints.push('Tout est en place : catalogue et images.');
    }
  } catch (err) {
    out.hints.push('Impossible de joindre Supabase : ' + (detailed ? err.message : 'erreur réseau'));
    out.hints.push("Vérifie que SUPABASE_URL est bien l'URL du projet, sans barre oblique finale.");
  }

  return send(res, 200, out);
};
