/* MATEA — back office.
   Même couche de données que la boutique : MATEA.store.
   En local tout vit dans ce navigateur ; avec Supabase renseigné,
   exactement le même code écrit en base. */

(function () {
  var cfg = window.MATEA_CONFIG || {};
  var gate = document.getElementById('gate'),
      app = document.getElementById('app'),
      rows = document.getElementById('rows'),
      noProducts = document.getElementById('noProducts'),
      ordersBox = document.getElementById('orders'),
      noOrders = document.getElementById('noOrders'),
      pForm = document.getElementById('pForm'),
      pErr = document.getElementById('pErr'),
      formTitle = document.getElementById('formTitle'),
      toastEl = document.getElementById('toast');

  var products = [], editing = null;

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'fr'; }
  function t(fr, en) { return lang() === 'en' ? en : fr; }
  function money(n) { return Number(n).toLocaleString('fr-DZ').replace(/ | /g, ' ') + ' DA'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1800);
  }

  /* ---------- verrou local ---------- */

  function unlock() {
    gate.hidden = true;
    app.hidden = false;
    boot();
  }

  /* En ligne, le mot de passe n'est jamais comparé ici : il part en
     en-tête vers /api, qui le confronte à ADMIN_PASSWORD. Le navigateur
     le garde le temps de l'onglet pour ne pas le redemander à chaque page. */
  try {
    var keep = sessionStorage.getItem('matea.admin');
    if (keep) { MATEA.token = keep; unlock(); }
  } catch (e) {}

  document.getElementById('gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var pass = document.getElementById('gatePass').value;
    var err = document.getElementById('gateErr');
    var btn = this.querySelector('button[type="submit"]');
    btn.disabled = true;
    MATEA.store.checkAdmin(pass).then(function (ok) {
      err.classList.toggle('on', !ok);
      if (!ok) return;
      MATEA.token = pass;
      try { sessionStorage.setItem('matea.admin', pass); } catch (e2) {}
      unlock();
    }).catch(function (e2) {
      err.textContent = e2.message;
      err.classList.add('on');
    }).then(function () { btn.disabled = false; });
  });

  /* Arme un bouton : le premier clic demande confirmation, le second agit.
     Renvoie true quand l'action doit se faire. */
  function arm(btn, askLabel, backLabel) {
    if (btn.dataset.armed === '1') {
      btn.dataset.armed = '';
      btn.textContent = backLabel;
      btn.classList.remove('armed');
      return true;
    }
    btn.dataset.armed = '1';
    btn.textContent = askLabel;
    btn.classList.add('armed');
    setTimeout(function () {
      if (btn.dataset.armed === '1') {
        btn.dataset.armed = '';
        btn.textContent = backLabel;
        btn.classList.remove('armed');
      }
    }, 4000);
    return false;
  }

  /* ---------- onglets ---------- */

  function tab(which) {
    var p = which === 'p';
    document.getElementById('tabP').setAttribute('aria-selected', p ? 'true' : 'false');
    document.getElementById('tabO').setAttribute('aria-selected', p ? 'false' : 'true');
    document.getElementById('paneP').hidden = !p;
    document.getElementById('paneO').hidden = p;
    if (!p) loadOrders();
  }
  document.getElementById('tabP').addEventListener('click', function () { tab('p'); });
  document.getElementById('tabO').addEventListener('click', function () { tab('o'); });

  /* ---------- produits ---------- */

  var LABEL = {
    active: function () { return t('En vente', 'On sale'); },
    victime: function () { return t('Victime de son succès', 'Sold out'); },
    archived: function () { return t('Archivé', 'Archived'); }
  };

  function renderProducts() {
    noProducts.hidden = products.length > 0;
    rows.innerHTML = products.map(function (p) {
      var thumb = p.image_url
        ? '<img src="' + esc(p.image_url) + '" alt="" loading="lazy">' : '';
      var victime = p.status === 'victime';
      return '<div class="row">' +
        '<div class="th" style="--tint:' + esc(p.tint) + '">' + thumb + '<i></i></div>' +
        '<div class="mt">' +
          '<b>' + esc(p.name) + '</b>' +
          '<span>' + money(p.price_da) + ' · ' + t('le bâton', 'per stick') + '</span>' +
          '<span class="tag ' + esc(p.status) + '">' + LABEL[p.status]() + '</span>' +
        '</div>' +
        '<div class="ax">' +
          '<button type="button" class="warn" data-act="victime" data-id="' + esc(p.id) + '" ' +
            'aria-pressed="' + (victime ? 'true' : 'false') + '">' +
            (victime ? t('Remettre', 'Restore') : t('Victime', 'Sold out')) + '</button>' +
          '<button type="button" data-act="edit" data-id="' + esc(p.id) + '">' + t('Modifier', 'Edit') + '</button>' +
          '<button type="button" class="danger" data-act="del" data-id="' + esc(p.id) + '">' + t('Suppr.', 'Delete') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  rows.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var id = b.getAttribute('data-id'), act = b.getAttribute('data-act');
    var p = products.find(function (x) { return x.id === id; });
    if (!p) return;

    if (act === 'victime') {
      var next = p.status === 'victime' ? 'active' : 'victime';
      MATEA.store.setStatus(id, next).then(function () {
        p.status = next;
        renderProducts();
        toast(next === 'victime'
          ? t('Victime de son succès', 'Marked sold out')
          : t('Remis en vente', 'Back on sale'));
      }).catch(function (err) { toast(err.message); });
    }

    if (act === 'edit') {
      editing = p;
      document.getElementById('pId').value = p.id;
      document.getElementById('pName').value = p.name;
      document.getElementById('pNameEn').value = p.name_en || '';
      document.getElementById('pBlurb').value = p.blurb || '';
      document.getElementById('pBlurbEn').value = p.blurb_en || '';
      document.getElementById('pIng').value = (p.ingredients || []).join(', ');
      document.getElementById('pPrice').value = p.price_da;
      document.getElementById('pImg').value = p.image_url || '';
      document.getElementById('pTint').value = p.tint || '#9C4F1C';
      formTitle.textContent = t('Modifier : ', 'Edit: ') + p.name;
      pForm.scrollIntoView({ block: 'center', behavior: 'smooth' });
      document.getElementById('pName').focus();
    }

    if (act === 'del') {
      /* confirmation en deux temps, dans le bouton lui-même : les boîtes de
         dialogue natives sont bloquées par certains hébergeurs et pénibles
         au doigt. Le bouton se réarme tout seul après quatre secondes. */
      if (!arm(b, t('Confirmer ?', 'Confirm?'), t('Suppr.', 'Delete'))) return;
      MATEA.store.deleteProduct(id).then(function () {
        products = products.filter(function (x) { return x.id !== id; });
        renderProducts();
        toast(t('Supprimé', 'Deleted'));
      }).catch(function (err) { toast(err.message); });
    }
  });

  function clearForm() {
    editing = null;
    pForm.reset();
    document.getElementById('pId').value = '';
    document.getElementById('pTint').value = '#9C4F1C';
    pErr.classList.remove('on');
    formTitle.textContent = t('Nouveau parfum', 'New flavour');
  }
  document.getElementById('pCancel').addEventListener('click', clearForm);

  pForm.addEventListener('submit', function (e) {
    e.preventDefault();
    pErr.classList.remove('on');

    var name = document.getElementById('pName').value.trim();
    var price = Number(document.getElementById('pPrice').value);
    if (name.length < 2) {
      pErr.textContent = t('Il faut un nom.', 'A name is required.');
      pErr.classList.add('on'); return;
    }
    if (!(price > 0)) {
      pErr.textContent = t('Il faut un prix supérieur à zéro.', 'The price must be above zero.');
      pErr.classList.add('on'); return;
    }

    var payload = {
      id: document.getElementById('pId').value || undefined,
      name: name,
      name_en: document.getElementById('pNameEn').value.trim(),
      blurb: document.getElementById('pBlurb').value.trim(),
      blurb_en: document.getElementById('pBlurbEn').value.trim(),
      ingredients: document.getElementById('pIng').value,
      price_da: price,
      image_url: document.getElementById('pImg').value.trim(),
      tint: document.getElementById('pTint').value,
      status: editing ? editing.status : 'active',
      sort_order: editing ? editing.sort_order : (products.length + 1)
    };

    MATEA.store.saveProduct(payload).then(function (saved) {
      var i = products.findIndex(function (x) { return x.id === saved.id; });
      if (i >= 0) products[i] = saved; else products.push(saved);
      renderProducts();
      clearForm();
      toast(t('Enregistré', 'Saved'));
    }).catch(function (err) {
      pErr.textContent = err.message;
      pErr.classList.add('on');
    });
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    if (!arm(this, t('Tout effacer ?', 'Erase everything?'),
                   t('Réinitialiser le catalogue', 'Reset the catalogue'))) return;
    MATEA.store.reset().then(load).catch(function (err) { toast(err.message); });
  });

  /* ---------- commandes ---------- */

  var OSTATUS = ['new', 'confirmed', 'shipped', 'cancelled'];
  function ostatusLabel(s) {
    return {
      new: t('Nouvelle', 'New'), confirmed: t('Confirmée', 'Confirmed'),
      shipped: t('Livrée', 'Shipped'), cancelled: t('Annulée', 'Cancelled')
    }[s] || s;
  }

  function loadOrders() {
    MATEA.store.listOrders().then(function (list) {
      noOrders.hidden = list.length > 0;
      ordersBox.innerHTML = list.map(function (o) {
        var when = new Date(o.created_at).toLocaleString(lang() === 'en' ? 'en-GB' : 'fr-FR',
          { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
        var items = (o.items || []).map(function (pk) {
          var inside = (pk.sticks || []).map(function (s) { return s.qty + ' × ' + esc(s.name); }).join(', ');
          return '<b style="color:var(--cream);font-weight:800">' + t('Doypack ', 'Pouch ') + pk.pack +
                 ' (' + pk.stick_count + ')</b> — ' + inside;
        }).join('<br>');
        var opts = OSTATUS.map(function (s) {
          return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + ostatusLabel(s) + '</option>';
        }).join('');
        return '<div class="ord">' +
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
          '<div class="ofo"><b>' + money(o.total_da) + '</b>' +
            '<select data-order="' + esc(o.id) + '">' + opts + '</select></div>' +
        '</div>';
      }).join('');
    }).catch(function (err) {
      noOrders.hidden = false;
      noOrders.textContent = err.message;
    });
  }

  ordersBox.addEventListener('change', function (e) {
    var sel = e.target.closest('select[data-order]');
    if (!sel) return;
    MATEA.store.setOrderStatus(sel.getAttribute('data-order'), sel.value)
      .then(function () { toast(t('Statut mis à jour', 'Status updated')); })
      .catch(function (err) { toast(err.message); });
  });

  /* ---------- démarrage ---------- */

  function load() {
    return MATEA.store.listProducts({ includeArchived: true }).then(function (list) {
      products = list;
      renderProducts();
    }).catch(function (err) {
      noProducts.hidden = false;
      noProducts.textContent = err.message;
    });
  }

  function boot() {
    /* le mode n'est connu qu'une fois la sonde /api terminée */
    MATEA.store.ready.then(function () {
      var live = MATEA.store.mode === 'remote';
      var tag = document.getElementById('modeTag');
      tag.classList.toggle('live', live);
      tag.classList.toggle('broken', Boolean(MATEA.store.problem));
      tag.querySelector('span').textContent = MATEA.store.problem ? 'erreur'
                                            : (live ? 'supabase' : 'local');
      var note = document.getElementById('localNote');
      note.hidden = live && !MATEA.store.problem;
      if (MATEA.store.problem) {
        note.textContent = t('Le serveur répond mais échoue : ', 'The server answers but fails: ') +
          MATEA.store.problem + t('. Ouvre /api/health pour le détail.',
                                  '. Open /api/health for details.');
      }
      document.getElementById('resetBtn').hidden = live;
      clearForm();
      load();
    });
  }

  document.addEventListener('matea:lang', function () {
    if (app.hidden) return;
    renderProducts();
    if (!document.getElementById('paneO').hidden) loadOrders();
  });
})();
