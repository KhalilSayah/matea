/* MATEA — /api/orders

   POST    dépose une commande          (public)
   GET     liste les commandes          (admin)
   PATCH   fait avancer un statut       (admin)

   Rien de ce que le navigateur envoie sur l'argent n'est cru : les prix
   sont relus en base et le total recalculé ici. Sinon il suffit d'ouvrir
   les outils développeur pour commander à 1 DA. */

const { configured, sb, isAdmin, body, send, fail, guard, PACK_SIZE } = require('./_lib');

const PHONE = /^0[1-7]\d{8}$/;
const WILAYA = /^\d{2} — .{3,40}$/;          // « 16 — Alger »
const ORDER_STATUS = ['new', 'confirmed', 'shipped', 'cancelled'];

function ref() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sans I, O, 0, 1
  let s = '';
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return (process.env.ORDER_PREFIX || 'MT') + '-' + s;
}

function normalisePhone(raw) {
  let d = String(raw || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+213')) d = '0' + d.slice(4);
  else if (d.startsWith('00213')) d = '0' + d.slice(5);
  else if (d.startsWith('213') && d.length === 12) d = '0' + d.slice(3);
  return d;
}

module.exports = async function handler(req, res) {
  if (!guard(res, configured(), 503, 'Supabase non configuré')) return;

  try {
    if (req.method === 'GET') {
      if (!guard(res, isAdmin(req), 401, 'Non autorisé')) return;
      return send(res, 200, await sb('orders?select=*&order=created_at.desc&limit=400'));
    }

    if (req.method === 'PATCH') {
      if (!guard(res, isAdmin(req), 401, 'Non autorisé')) return;
      const { id, status } = body(req);
      if (!guard(res, id, 400, 'Identifiant manquant')) return;
      if (!guard(res, ORDER_STATUS.indexOf(status) >= 0, 400, 'Statut inconnu')) return;
      const rows = await sb('orders?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH', body: { status }
      });
      return send(res, 200, rows[0]);
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });

    /* ---------- dépôt d'une commande ---------- */
    const o = body(req);
    const first = String(o.first_name || '').trim();
    const last = String(o.last_name || '').trim();
    const phone = normalisePhone(o.phone);
    const wilaya = String(o.wilaya || '').trim();
    const address = String(o.address || '').trim();

    if (!guard(res, first.length >= 2 && first.length <= 60, 400, 'Prénom invalide')) return;
    if (!guard(res, last.length >= 2 && last.length <= 60, 400, 'Nom invalide')) return;
    if (!guard(res, PHONE.test(phone), 400, 'Numéro de téléphone invalide')) return;
    if (!guard(res, WILAYA.test(wilaya), 400, 'Wilaya invalide')) return;
    if (!guard(res, address.length >= 6 && address.length <= 300, 400, 'Adresse invalide')) return;

    const packs = Array.isArray(o.items) ? o.items : [];
    if (!guard(res, packs.length >= 1 && packs.length <= 20, 400, 'Panier invalide')) return;

    /* Prix relus en base, une seule requête pour tous les parfums cités. */
    const ids = [];
    for (const p of packs) {
      for (const s of (Array.isArray(p.sticks) ? p.sticks : [])) {
        if (s && s.id && ids.indexOf(s.id) < 0) ids.push(String(s.id));
      }
    }
    if (!guard(res, ids.length > 0 && ids.length <= 50, 400, 'Panier vide')) return;

    const list = await sb('products?select=id,name,price_da,status&id=in.(' +
      ids.map(encodeURIComponent).join(',') + ')');
    const byId = new Map(list.map(p => [p.id, p]));

    let total = 0;
    const items = [];

    for (let i = 0; i < packs.length; i++) {
      const lines = [];
      let count = 0, packTotal = 0;

      for (const s of (Array.isArray(packs[i].sticks) ? packs[i].sticks : [])) {
        const p = byId.get(String(s && s.id));
        if (!p) return send(res, 400, { error: 'Parfum inconnu dans le panier' });
        if (p.status !== 'active') {
          return send(res, 409, { error: p.name + ' n\'est plus disponible' });
        }
        const qty = Math.round(Number(s.qty) || 0);
        if (qty < 1 || qty > PACK_SIZE) {
          return send(res, 400, { error: 'Quantité invalide pour ' + p.name });
        }
        count += qty;
        packTotal += p.price_da * qty;
        lines.push({ id: p.id, name: p.name, qty, price_da: p.price_da });
      }

      if (count < 1 || count > PACK_SIZE) {
        return send(res, 400, { error: 'Un doypack contient de 1 à ' + PACK_SIZE + ' bâtons' });
      }
      total += packTotal;
      items.push({ pack: i + 1, sticks: lines, stick_count: count, total_da: packTotal });
    }

    /* Une référence peut entrer en collision : on retente une fois. */
    let row;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const rows = await sb('orders', {
          method: 'POST',
          body: [{
            ref: ref(), first_name: first, last_name: last, phone,
            wilaya, address, items, total_da: total, status: 'new'
          }]
        });
        row = rows[0];
        break;
      } catch (err) {
        if (attempt === 1 || !/duplicate|unique/i.test(err.message)) throw err;
      }
    }

    return send(res, 201, { ref: row.ref, total_da: row.total_da, id: row.id });
  } catch (err) {
    return fail(res, err);
  }
};
