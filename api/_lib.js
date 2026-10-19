/* MATEA — utilitaires partagés par les fonctions serverless.
   Un fichier préfixé par _ n'est pas exposé comme route par Vercel.

   Tout passe par la clé service_role, qui vit uniquement dans les
   variables d'environnement Vercel et ne descend jamais au navigateur.
   Elle contourne les politiques RLS : c'est ici, et nulle part ailleurs,
   que se fait la validation. */

const crypto = require('crypto');

const SB_URL = process.env.SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN = process.env.ADMIN_PASSWORD || '';

const PACK_SIZE = Number(process.env.PACK_SIZE || 10);

function configured() {
  return Boolean(SB_URL && SB_KEY);
}

async function sb(path, options) {
  const o = options || {};
  const res = await fetch(SB_URL.replace(/\/$/, '') + '/rest/v1/' + path, {
    method: o.method || 'GET',
    headers: {
      apikey: SB_KEY,
      Authorization: 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      Prefer: o.prefer || 'return=representation'
    },
    body: o.body ? JSON.stringify(o.body) : undefined
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error('Supabase ' + res.status + ' : ' + (text || res.statusText));
    err.status = res.status === 404 ? 500 : res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

/* Comparaison à temps constant : une comparaison naïve fuite la longueur
   du préfixe correct, ce qui permet de deviner le mot de passe lettre
   par lettre. */
function sameSecret(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

function isAdmin(req) {
  if (!ADMIN) return false;
  return sameSecret(req.headers['x-matea-token'], ADMIN);
}

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return req.body;
}

function send(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).end(JSON.stringify(payload));
}

function fail(res, err) {
  const status = err && err.status ? err.status : 500;
  send(res, status, { error: err && err.message ? err.message : 'Erreur serveur' });
}

/* Garde commune : répond et renvoie false quand la requête doit s'arrêter. */
function guard(res, ok, status, message) {
  if (ok) return true;
  send(res, status, { error: message });
  return false;
}

module.exports = {
  configured, sb, isAdmin, body, send, fail, guard, PACK_SIZE
};
