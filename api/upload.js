/* MATEA — /api/upload

   POST (admin) : dépose une image dans le bucket Supabase Storage et
   renvoie son URL publique.

   On passe par l'API Storage de Supabase avec la clé service_role, pas
   par l'endpoint S3. L'endpoint S3 imposerait de signer chaque requête
   en SigV4 à la main — une centaine de lignes de cryptographie pour le
   même résultat, et un jeu d'identifiants de plus à garder secret.

   Le bucket est créé par supabase/schema.sql. */

const { configured, isAdmin, body, send, fail, guard } = require('./_lib');

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.STORAGE_BUCKET || 'products';

const TYPES = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const MAX_BYTES = 3 * 1024 * 1024;

function safeName(name) {
  return String(name || 'image')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'image';
}

module.exports = async function handler(req, res) {
  if (!guard(res, configured(), 503, 'Supabase non configuré')) return;
  if (!guard(res, req.method === 'POST', 405, 'Méthode non autorisée')) return;
  if (!guard(res, isAdmin(req), 401, 'Non autorisé')) return;

  try {
    const { name, type, data } = body(req);

    const ext = TYPES[type];
    if (!guard(res, ext, 400, 'Format accepté : WebP, JPEG ou PNG')) return;
    if (!guard(res, typeof data === 'string' && data.length, 400, 'Image vide')) return;

    const bytes = Buffer.from(data, 'base64');
    if (!guard(res, bytes.length > 0, 400, 'Image illisible')) return;
    if (!guard(res, bytes.length <= MAX_BYTES, 413,
      'Image trop lourde : ' + Math.round(bytes.length / 1024) + ' Ko pour 3 Mo maximum')) return;

    /* Un suffixe aléatoire : deux « menthe.webp » ne s'écrasent pas, et
       le navigateur ne sert pas l'ancienne depuis son cache. */
    const key = safeName(name) + '-' + Date.now().toString(36) +
                Math.random().toString(36).slice(2, 6) + '.' + ext;

    const put = await fetch(SB_URL + '/storage/v1/object/' + BUCKET + '/' + key, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000'
      },
      body: bytes
    });

    if (!put.ok) {
      const text = await put.text();
      let message = 'Supabase Storage ' + put.status;
      try {
        const parsed = JSON.parse(text);
        if (parsed.message) message += ' : ' + parsed.message;
      } catch (e) {}
      if (put.status === 404) {
        message += " — le bucket « " + BUCKET + " » n'existe pas. " +
                   'Rejoue le bloc « Stockage des images » de supabase/schema.sql.';
      }
      return send(res, 502, { error: message });
    }

    return send(res, 201, {
      url: SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + key,
      key: key,
      bytes: bytes.length
    });
  } catch (err) {
    return fail(res, err);
  }
};
