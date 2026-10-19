/* MATEA — /api/products

   GET     catalogue public (les archivés ne sortent jamais)
   GET ?all=1 + jeton admin : tout, archivés compris
   POST    crée ou met à jour un parfum        (admin)
   PATCH   change le statut                     (admin)
   DELETE  archive                              (admin)

   Le navigateur ne voit jamais la clé Supabase : tout passe par ici. */

const { configured, sb, isAdmin, body, send, fail, guard } = require('./_lib');

const STATUSES = ['active', 'victime', 'archived'];

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'parfum';
}

function clean(p) {
  const row = {
    slug: p.slug ? slugify(p.slug) : slugify(p.name),
    name: String(p.name || '').trim(),
    name_en: String(p.name_en || p.name || '').trim(),
    blurb: String(p.blurb || '').trim(),
    blurb_en: String(p.blurb_en || p.blurb || '').trim(),
    ingredients: Array.isArray(p.ingredients)
      ? p.ingredients.map(String).map(s => s.trim()).filter(Boolean)
      : String(p.ingredients || '').split(',').map(s => s.trim()).filter(Boolean),
    price_da: Math.round(Number(p.price_da) || 0),
    tint: /^#[0-9a-f]{6}$/i.test(p.tint || '') ? p.tint : '#9C4F1C',
    image_url: String(p.image_url || '').trim(),
    status: STATUSES.indexOf(p.status) >= 0 ? p.status : 'active',
    sort_order: Math.round(Number(p.sort_order) || 0)
  };
  if (p.id) row.id = p.id;
  return row;
}

module.exports = async function handler(req, res) {
  if (!guard(res, configured(), 503, 'Supabase non configuré')) return;

  try {
    if (req.method === 'GET') {
      const all = req.query && req.query.all === '1';
      if (all && !guard(res, isAdmin(req), 401, 'Non autorisé')) return;

      let q = 'products?select=*&order=sort_order.asc';
      if (!all) q += '&status=neq.archived';
      return send(res, 200, await sb(q));
    }

    if (!guard(res, isAdmin(req), 401, 'Non autorisé')) return;

    if (req.method === 'POST') {
      const row = clean(body(req));
      if (!guard(res, row.name.length >= 2, 400, 'Il faut un nom.')) return;
      if (!guard(res, row.price_da > 0, 400, 'Il faut un prix supérieur à zéro.')) return;

      const rows = await sb('products?on_conflict=' + (row.id ? 'id' : 'slug'), {
        method: 'POST', body: [row],
        prefer: 'return=representation,resolution=merge-duplicates'
      });
      return send(res, 200, rows[0]);
    }

    if (req.method === 'PATCH') {
      const { id, status } = body(req);
      if (!guard(res, id, 400, 'Identifiant manquant')) return;
      if (!guard(res, STATUSES.indexOf(status) >= 0, 400, 'Statut inconnu')) return;
      const rows = await sb('products?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH', body: { status }
      });
      return send(res, 200, rows[0]);
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || body(req).id;
      if (!guard(res, id, 400, 'Identifiant manquant')) return;
      /* On archive au lieu de détruire : une commande passée garde la
         trace du parfum commandé. */
      await sb('products?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH', body: { status: 'archived' }, prefer: 'return=minimal'
      });
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Méthode non autorisée' });
  } catch (err) {
    return fail(res, err);
  }
};
