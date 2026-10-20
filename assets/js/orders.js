/* MATEA — la page des commandes.

   Séparée du catalogue : on la consulte tous les jours, alors que le
   formulaire produit est long et la repousserait loin en bas de page.

   Le verrou, le badge et les outils viennent de admin-shell.js. */

(function () {
  var A = MATEA.admin;
  var t = A.t, money = A.money, esc = A.esc, toast = A.toast, arm = A.arm;

  var box = document.getElementById('orders'),
      none = document.getElementById('noOrders'),
      count = document.getElementById('ordCount');

  var STATUS = ['new', 'confirmed', 'shipped', 'cancelled'];
  function statusLabel(s) {
    return {
      new: t('Nouvelle', 'New'), confirmed: t('Confirmée', 'Confirmed'),
      shipped: t('Livrée', 'Shipped'), cancelled: t('Annulée', 'Cancelled')
    }[s] || s;
  }

  function render(list) {
    none.hidden = list.length > 0;
    if (count) {
      var fresh = list.filter(function (o) { return o.status === 'new'; }).length;
      count.textContent = list.length + ' ' +
        (list.length > 1 ? t('commandes', 'orders') : t('commande', 'order')) +
        (fresh ? ' · ' + fresh + ' ' + t('à traiter', 'to handle') : '');
    }

    box.innerHTML = list.map(function (o) {
      var when = new Date(o.created_at).toLocaleString(A.lang() === 'en' ? 'en-GB' : 'fr-FR',
        { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

      var items = (o.items || []).map(function (pk) {
        var inside = (pk.sticks || []).map(function (s) {
          return s.qty + ' × ' + esc(s.name);
        }).join(', ');
        return '<b style="color:var(--cream);font-weight:800">' + t('Doypack ', 'Pouch ') + pk.pack +
               ' (' + pk.stick_count + ')</b> — ' + inside;
      }).join('<br>');

      var opts = STATUS.map(function (s) {
        return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' +
               statusLabel(s) + '</option>';
      }).join('');

      return '<div class="ord' + (o.status === 'new' ? ' fresh' : '') + '">' +
        '<div class="oh">' +
          '<div><div class="oref">' + esc(o.ref) + '</div>' +
          '<div class="owho">' + esc(o.first_name) + ' ' + esc(o.last_name) +
            ' — <a href="tel:' + esc(o.phone) + '">' + esc(o.phone) + '</a></div>' +
          (o.wilaya || o.address
            ? '<div class="oaddr">' + esc(o.wilaya || '') +
              (o.address ? '<br>' + esc(o.address) : '') + '</div>'
            : '') + '</div>' +
          '<div style="font-size:10.5px;color:var(--cream-dim);font-weight:700">' + esc(when) + '</div>' +
        '</div>' +
        '<div class="oit">' + items + '</div>' +
        '<div class="ofo">' +
          '<b>' + money(o.total_da) + '</b>' +
          '<div class="oax">' +
            '<select data-order="' + esc(o.id) + '">' + opts + '</select>' +
            '<button type="button" class="odel" data-del="' + esc(o.id) + '">' +
              t('Suppr.', 'Delete') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function load() {
    return MATEA.store.listOrders().then(render).catch(function (err) {
      none.hidden = false;
      none.textContent = err.message;
    });
  }

  box.addEventListener('change', function (e) {
    var sel = e.target.closest('select[data-order]');
    if (!sel) return;
    MATEA.store.setOrderStatus(sel.getAttribute('data-order'), sel.value)
      .then(function () { toast(t('Statut mis à jour', 'Status updated')); })
      .catch(function (err) { toast(err.message); });
  });

  box.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-del]');
    if (!b) return;
    /* Deux temps : une commande effacée ne se récupère pas. */
    if (!arm(b, t('Supprimer ?', 'Delete?'), t('Suppr.', 'Delete'))) return;
    MATEA.store.deleteOrder(b.getAttribute('data-del')).then(function () {
      toast(t('Commande supprimée', 'Order deleted'));
      return load();
    }).catch(function (err) { toast(err.message); });
  });

  A.gate(function () {
    A.badge().then(load);
  });

  document.addEventListener('matea:lang', function () {
    if (!document.getElementById('app').hidden) load();
  });
})();
