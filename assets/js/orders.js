/* MATEA — la page des commandes.

   Séparée du catalogue : on la consulte tous les jours, alors que le
   formulaire produit est long et la repousserait loin en bas de page.

   Le verrou, le badge et les outils viennent de admin-shell.js. */

(function () {
  var A = MATEA.admin;
  var t = A.t, money = A.money, esc = A.esc, toast = A.toast, arm = A.arm;

  var box = document.getElementById('orders'),
      none = document.getElementById('noOrders'),
      count = document.getElementById('ordCount'),
      kpis = document.getElementById('kpis');

  var all = [];        // tout ce que le serveur a renvoyé
  var filter = null;   // statut affiché, ou null pour tout

  var STATUS = ['new', 'confirmed', 'shipped', 'cancelled'];
  function statusLabel(s) {
    return {
      new: t('Nouvelle', 'New'), confirmed: t('Confirmée', 'Confirmed'),
      shipped: t('Livrée', 'Shipped'), cancelled: t('Annulée', 'Cancelled')
    }[s] || s;
  }

  /* Les compteurs portent sur TOUT, pas sur ce qui est affiché : sinon
     filtrer sur « livrée » ferait tomber les autres chiffres à zéro et
     on ne saurait plus où on en est. */
  function renderKpis() {
    if (!kpis) return;
    var money_total = all.filter(function (o) { return o.status !== 'cancelled'; })
                         .reduce(function (s, o) { return s + (o.total_da || 0); }, 0);

    kpis.innerHTML = STATUS.map(function (s) {
      var n = all.filter(function (o) { return o.status === s; }).length;
      return '<button type="button" class="kpi k-' + s + (filter === s ? ' on' : '') + '" ' +
        'data-filter="' + s + '" aria-pressed="' + (filter === s ? 'true' : 'false') + '">' +
        '<b>' + n + '</b><span>' + statusLabel(s) + '</span></button>';
    }).join('') +
    '<div class="kpi kpi-sum"><b>' + money(money_total) + '</b><span>' +
      t('encaissé à terme', 'due in total') + '</span></div>';
  }

  function apply() {
    renderKpis();
    render(filter ? all.filter(function (o) { return o.status === filter; }) : all);
  }

  var bulk = document.getElementById('printAll');
  if (bulk) bulk.addEventListener('click', function () {
    if (!shown.length) return toast(t('Rien à imprimer', 'Nothing to print'));
    MATEA.label.print(shown);
  });

  if (kpis) kpis.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-filter]');
    if (!b) return;
    var s = b.getAttribute('data-filter');
    filter = (filter === s) ? null : s;    // un second clic enlève le filtre
    apply();
  });

  var shown = [];

  function render(list) {
    shown = list;
    none.hidden = list.length > 0;
    if (none.hidden === false && filter) {
      none.textContent = t('Aucune commande dans ce statut.', 'No order with this status.');
    }
    if (bulk) {
      bulk.hidden = list.length === 0;
      bulk.textContent = t('Imprimer ' + list.length + ' étiquette' + (list.length > 1 ? 's' : ''),
                           'Print ' + list.length + ' label' + (list.length > 1 ? 's' : ''));
    }
    if (count) {
      var fresh = all.filter(function (o) { return o.status === 'new'; }).length;
      count.textContent = all.length + ' ' +
        (all.length > 1 ? t('commandes', 'orders') : t('commande', 'order')) +
        (fresh ? ' · ' + fresh + ' ' + t('à traiter', 'to handle') : '') +
        (filter ? ' · ' + t('filtre : ', 'filter: ') + statusLabel(filter) : '');
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
          '<b>' + money(o.total_da) +
            (o.delivery_da
              ? '<s>' + t('dont ', 'incl. ') + money(o.delivery_da) + t(' de livraison', ' delivery') + '</s>'
              : '<s>' + (window.MATEA_WILAYAS && window.MATEA_WILAYAS.find(o.wilaya) &&
                         window.MATEA_WILAYAS.find(o.wilaya).livraison === 0
                  ? t('livraison offerte', 'free delivery')
                  : t('livraison à confirmer', 'delivery to confirm')) + '</s>') +
          '</b>' +
          '<div class="oax">' +
            '<select data-order="' + esc(o.id) + '">' + opts + '</select>' +
            '<button type="button" class="olbl" data-label="' + esc(o.id) + '">' +
              t('Étiquette', 'Label') + '</button>' +
            '<button type="button" class="odel" data-del="' + esc(o.id) + '">' +
              t('Suppr.', 'Delete') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function load() {
    return MATEA.store.listOrders().then(function (list) {
      all = list;
      if (filter && !all.some(function (o) { return o.status === filter; })) filter = null;
      apply();
    }).catch(function (err) {
      none.hidden = false;
      none.textContent = err.message;
    });
  }

  box.addEventListener('change', function (e) {
    var sel = e.target.closest('select[data-order]');
    if (!sel) return;
    MATEA.store.setOrderStatus(sel.getAttribute('data-order'), sel.value)
      .then(function () {
        toast(t('Statut mis à jour', 'Status updated'));
        return load();          // les compteurs doivent suivre
      })
      .catch(function (err) { toast(err.message); });
  });

  box.addEventListener('click', function (e) {
    var lab = e.target.closest('button[data-label]');
    if (lab) {
      var one = all.find(function (o) { return String(o.id) === lab.getAttribute('data-label'); });
      if (one) MATEA.label.print(one);
      return;
    }

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
