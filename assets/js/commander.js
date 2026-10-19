/* MATEA — composeur de doypack.

   Le client remplit un sachet bâton par bâton en mélangeant les parfums,
   puis l'ajoute à son panier et en compose un autre s'il veut.

     draft  : { idParfum: quantité }   le sachet en cours
     packs  : [ draft, draft, ... ]    les sachets déjà mis au panier       */

(function () {
  var cfg = window.MATEA_CONFIG || {};
  var CAP = Number(cfg.packSize) || 10;
  var MIN = Math.max(1, Math.min(Number(cfg.minPerPack) || 1, CAP));

  var slots = document.getElementById('slots'),
      bstripe = document.getElementById('bstripe'),
      cCount = document.getElementById('cCount'),
      cCap = document.getElementById('cCap'),
      cPrice = document.getElementById('cPrice'),
      cHint = document.getElementById('cHint'),
      addPack = document.getElementById('addPack'),
      flavours = document.getElementById('flavours'),
      empty = document.getElementById('empty'),
      cartBox = document.getElementById('cartBox'),
      packsBox = document.getElementById('packs'),
      bar = document.getElementById('bar'),
      barTotal = document.getElementById('barTotal'),
      barCount = document.getElementById('barCount'),
      sheet = document.getElementById('sheet'),
      recap = document.getElementById('recap'),
      form = document.getElementById('orderForm'),
      formErr = document.getElementById('formErr'),
      sendBtn = document.getElementById('sendBtn'),
      formStep = document.getElementById('formStep'),
      doneStep = document.getElementById('doneStep'),
      toastEl = document.getElementById('toast');

  var KEY = 'matea.packs';
  var products = [], draft = {}, packs = [], lastFocus = null;

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'fr'; }
  function t(fr, en) { return lang() === 'en' ? en : fr; }
  function money(n) { return Number(n).toLocaleString('fr-DZ').replace(/ | /g, ' ') + ' DA'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function find(id) { return products.find(function (p) { return p.id === id; }); }
  function nameOf(p) { return lang() === 'en' ? (p.name_en || p.name) : p.name; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ draft: draft, packs: packs })); } catch (e) {}
  }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY)) || {};
      draft = v.draft || {}; packs = v.packs || [];
    } catch (e) { draft = {}; packs = []; }
  }

  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1700);
  }

  /* ---------- comptes ---------- */

  function countOf(d) {
    return Object.keys(d).reduce(function (s, k) { return s + d[k]; }, 0);
  }
  function priceOf(d) {
    return Object.keys(d).reduce(function (s, k) {
      var p = find(k); return s + (p ? p.price_da * d[k] : 0);
    }, 0);
  }
  function linesOf(d) {
    return Object.keys(d).filter(function (k) { return d[k] > 0; }).map(function (k) {
      var p = find(k);
      return { id: k, name: p ? p.name : k, qty: d[k], price_da: p ? p.price_da : 0 };
    });
  }
  function cartTotal() {
    return packs.reduce(function (s, d) { return s + priceOf(d); }, 0);
  }

  /* ---------- le sachet en cours ---------- */

  /* Un bâton vu à travers la fenêtre du sachet : tête ronde et manche. */
  function stickGlyph(tint, filled) {
    if (!filled) {
      return '<span class="slot free"></span>';
    }
    return '<span class="slot" style="--c:' + esc(tint) + '">' +
      '<svg viewBox="0 0 20 46" aria-hidden="true">' +
        '<rect x="8.6" y="16" width="2.8" height="28" rx="1.4" fill="#C8B38A"/>' +
        '<circle cx="10" cy="11" r="8.4" fill="var(--c)" stroke="#0E0E0C" stroke-width="1.6"/>' +
      '</svg></span>';
  }

  /* nombre de colonnes de la fenêtre : au plus 6, et moitié de la
     capacité au-delà de 6, pour deux rangées bien remplies */
  var COLS = CAP <= 6 ? CAP : Math.min(6, Math.ceil(CAP / 2));
  var ROWS = Math.ceil(CAP / COLS);

  function renderBuilder() {
    var n = countOf(draft), html = '', i;
    slots.style.setProperty('--cols', COLS);
    slots.style.setProperty('--rows', ROWS);
    var ordered = [];
    Object.keys(draft).forEach(function (k) {
      var p = find(k);
      for (i = 0; i < draft[k]; i++) ordered.push(p ? p.tint : '#9C4F1C');
    });
    for (i = 0; i < CAP; i++) html += stickGlyph(ordered[i], i < ordered.length);
    slots.innerHTML = html;

    cCount.textContent = n;
    cCap.textContent = '/ ' + CAP + ' ' + t('bâtons', 'sticks');
    cPrice.textContent = money(priceOf(draft));
    bstripe.style.background = ordered.length
      ? 'linear-gradient(90deg,' + ordered.join(',') + ')'
      : 'var(--ink-3)';

    var ok = n >= MIN;
    addPack.disabled = !ok;
    addPack.textContent = n >= CAP
      ? t('Ajouter ce doypack · complet', 'Add this pouch · full')
      : t('Ajouter ce doypack', 'Add this pouch');

    if (n === 0) {
      cHint.textContent = t('Ajoute des bâtons ci-dessous.', 'Add sticks below.');
    } else if (n < MIN) {
      cHint.textContent = t('Minimum ' + MIN + ' bâtons par sachet.', 'Minimum ' + MIN + ' sticks per pouch.');
    } else if (n >= CAP) {
      cHint.textContent = t('Le sachet est plein.', 'The pouch is full.');
    } else {
      cHint.textContent = t('Encore ' + (CAP - n) + ' place' + (CAP - n > 1 ? 's' : '') + ' si tu veux.',
                            (CAP - n) + ' slot' + (CAP - n > 1 ? 's' : '') + ' left if you want.');
    }
  }

  /* ---------- la liste des parfums ---------- */

  function renderFlavours() {
    if (!products.length) { flavours.innerHTML = ''; empty.hidden = false; return; }
    empty.hidden = true;
    var full = countOf(draft) >= CAP;

    flavours.innerHTML = products.map(function (p) {
      var n = draft[p.id] || 0;
      var out = p.status === 'victime';
      var ctl;
      if (out) {
        ctl = '<span class="soldout">' + t('Victime de son succès', 'Sold out') + '</span>';
      } else {
        ctl = '<div class="qty">' +
          '<button type="button" data-act="dec" data-id="' + esc(p.id) + '"' + (n ? '' : ' disabled') +
            ' aria-label="' + t('Retirer un bâton', 'Remove one stick') + '">−</button>' +
          '<b>' + n + '</b>' +
          '<button type="button" data-act="inc" data-id="' + esc(p.id) + '"' + (full ? ' disabled' : '') +
            ' aria-label="' + t('Ajouter un bâton', 'Add one stick') + '">+</button>' +
        '</div>';
      }
      return '<article class="fl' + (out ? ' out' : '') + '">' +
        '<div class="flth" style="--tint:' + esc(p.tint) + '">' +
          (p.image_url ? '<img src="' + esc(p.image_url) + '" alt="" loading="lazy" decoding="async">' : '') +
          '<i></i></div>' +
        '<div class="flmt">' +
          '<b>' + esc(nameOf(p)) + '</b>' +
          '<span>' + esc(lang() === 'en' ? (p.blurb_en || p.blurb) : p.blurb) + '</span>' +
          '<em>' + money(p.price_da) + ' · ' + t('le bâton', 'per stick') + '</em>' +
        '</div>' +
        '<div class="flax">' + ctl + '</div>' +
      '</article>';
    }).join('');
  }

  flavours.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b || b.disabled) return;
    var id = b.getAttribute('data-id'), act = b.getAttribute('data-act');
    var p = find(id);
    if (!p || p.status === 'victime') return;

    if (act === 'inc') {
      if (countOf(draft) >= CAP) { toast(t('Sachet plein', 'Pouch full')); return; }
      draft[id] = (draft[id] || 0) + 1;
    } else {
      draft[id] = (draft[id] || 0) - 1;
      if (draft[id] <= 0) delete draft[id];
    }
    save();
    renderBuilder();
    renderFlavours();
  });

  /* ---------- panier de sachets ---------- */

  function renderPacks() {
    cartBox.hidden = packs.length === 0;
    packsBox.innerHTML = packs.map(function (d, i) {
      var ls = linesOf(d).map(function (l) { return l.qty + ' × ' + esc(l.name); }).join(', ');
      return '<div class="pk">' +
        '<div class="pkmt">' +
          '<b>' + t('Doypack ', 'Pouch ') + (i + 1) + ' · ' + countOf(d) + ' ' + t('bâtons', 'sticks') + '</b>' +
          '<span>' + ls + '</span>' +
        '</div>' +
        '<div class="pkpr">' + money(priceOf(d)) + '</div>' +
        '<button type="button" class="pkx" data-pack="' + i + '" aria-label="' +
          t('Retirer ce doypack', 'Remove this pouch') + '">×</button>' +
      '</div>';
    }).join('');
    syncBar();
  }

  packsBox.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-pack]');
    if (!b) return;
    packs.splice(Number(b.getAttribute('data-pack')), 1);
    save();
    renderPacks();
    toast(t('Doypack retiré', 'Pouch removed'));
  });

  addPack.addEventListener('click', function () {
    var n = countOf(draft);
    if (n < MIN) return;
    packs.push(draft);
    draft = {};
    save();
    renderBuilder();
    renderFlavours();
    renderPacks();
    toast('✓ ' + t('Doypack ajouté · ' + n + ' bâtons', 'Pouch added · ' + n + ' sticks'));
    cartBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  function syncBar() {
    var n = packs.length;
    barTotal.textContent = money(cartTotal());
    barCount.textContent = n + ' ' + (lang() === 'en'
      ? (n > 1 ? 'pouches' : 'pouch')
      : (n > 1 ? 'doypacks' : 'doypack'));
    bar.classList.toggle('up', n > 0);
  }

  /* ---------- confirmation ---------- */

  function orderItems() {
    return packs.map(function (d, i) {
      return {
        pack: i + 1,
        sticks: linesOf(d),
        stick_count: countOf(d),
        total_da: priceOf(d)
      };
    });
  }

  function openSheet() {
    if (!packs.length) return;
    lastFocus = document.activeElement;
    recap.innerHTML = packs.map(function (d, i) {
      var ls = linesOf(d).map(function (l) { return l.qty + ' × ' + esc(l.name); }).join(', ');
      return '<div><span>' + t('Doypack ', 'Pouch ') + (i + 1) +
             '<br><small style="color:var(--cream-dim);font-weight:600">' + ls + '</small></span>' +
             '<span>' + money(priceOf(d)) + '</span></div>';
    }).join('') +
    '<div class="tot"><span>' + t('Total', 'Total') + '</span><span>' + money(cartTotal()) + '</span></div>';
    formStep.hidden = false;
    doneStep.hidden = true;
    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { document.getElementById('firstName').focus(); }, 60);
  }

  function closeSheet() {
    sheet.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.getElementById('goOrder').addEventListener('click', openSheet);
  sheet.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeSheet();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet();
  });

  /* Numéros algériens : 10 chiffres. On accepte +213 et 00213. */
  function normalisePhone(raw) {
    var d = String(raw).replace(/[^\d+]/g, '');
    if (d.indexOf('+213') === 0) d = '0' + d.slice(4);
    else if (d.indexOf('00213') === 0) d = '0' + d.slice(5);
    else if (d.indexOf('213') === 0 && d.length === 12) d = '0' + d.slice(3);
    return d;
  }
  function phoneOk(d) { return /^0[1-7]\d{8}$/.test(d); }

  function fail(input, msg) {
    input.setAttribute('aria-invalid', 'true');
    formErr.textContent = msg;
    formErr.classList.add('on');
    input.focus();
    return false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    formErr.classList.remove('on');
    ['firstName', 'lastName', 'phone', 'wilaya', 'address'].forEach(function (id) {
      document.getElementById(id).removeAttribute('aria-invalid');
    });

    var first = document.getElementById('firstName'),
        last = document.getElementById('lastName'),
        tel = document.getElementById('phone');

    if (first.value.trim().length < 2) return fail(first, t('Indique ton prénom.', 'Enter your first name.'));
    if (last.value.trim().length < 2) return fail(last, t('Indique ton nom.', 'Enter your last name.'));

    var d = normalisePhone(tel.value);
    if (!phoneOk(d)) {
      return fail(tel, t('Numéro algérien à 10 chiffres, par exemple 0555 12 34 56.',
                         'Algerian number, 10 digits, e.g. 0555 12 34 56.'));
    }
    var wil = document.getElementById('wilaya'), adr = document.getElementById('address');
    if (!wil.value) return fail(wil, t('Choisis ta wilaya.', 'Pick your wilaya.'));
    if (adr.value.trim().length < 6) {
      return fail(adr, t('Donne une adresse où te livrer.', 'Give an address for the delivery.'));
    }
    if (!packs.length) return fail(first, t('Ton panier est vide.', 'Your cart is empty.'));

    sendBtn.disabled = true;
    sendBtn.textContent = t('Envoi…', 'Sending…');

    MATEA.store.createOrder({
      first_name: first.value.trim(),
      last_name: last.value.trim(),
      phone: d,
      wilaya: wil.value,
      address: adr.value.trim(),
      items: orderItems(),
      total_da: cartTotal()
    }).then(function (order) {
      try { localStorage.setItem('matea.wilaya', wil.value); } catch (e) {}
      packs = []; draft = {}; save();
      renderBuilder(); renderFlavours(); renderPacks();
      document.getElementById('doneRef').textContent = order.ref;
      formStep.hidden = true;
      doneStep.hidden = false;
      form.reset();
    }).catch(function (err) {
      formErr.textContent = t('Envoi impossible : ', 'Could not send: ') + err.message;
      formErr.classList.add('on');
    }).then(function () {
      sendBtn.disabled = false;
      sendBtn.textContent = t('Confirmer la commande', 'Confirm the order');
    });
  });

  /* ---------- démarrage ---------- */

  (function fillWilayas() {
    var sel = document.getElementById('wilaya');
    if (!sel || !window.MATEA_WILAYAS) return;
    var frag = document.createDocumentFragment();
    window.MATEA_WILAYAS.forEach(function (w) {
      var o = document.createElement('option');
      o.value = w; o.textContent = w;
      frag.appendChild(o);
    });
    sel.appendChild(frag);
    try {
      var last = localStorage.getItem('matea.wilaya');
      if (last && window.MATEA_WILAYAS.indexOf(last) >= 0) sel.value = last;
    } catch (e) {}
  })();

  load();
  MATEA.store.ready.then(function () {
    if (!MATEA.store.problem) return;
    var strip = document.createElement('p');
    strip.className = 'warnstrip';
    strip.textContent = t('Le serveur ne répond pas correctement : ',
                          'The server is not answering properly: ') + MATEA.store.problem +
      t(' — les commandes ne partiront pas. Ouvre /api/health.',
        ' — orders will not go through. Open /api/health.');
    document.querySelector('.page').prepend(strip);
  });
  MATEA.store.listProducts().then(function (list) {
    products = list;

    /* un parfum retiré du catalogue ou passé en rupture ne doit pas
       rester dans un sachet composé avant son retrait */
    function clean(d) {
      Object.keys(d).forEach(function (id) {
        var p = find(id);
        if (!p || p.status === 'victime') delete d[id];
      });
      return d;
    }
    clean(draft);
    packs = packs.map(clean).filter(function (d) { return countOf(d) > 0; });
    save();

    renderBuilder();
    renderFlavours();
    renderPacks();
  }).catch(function (err) {
    empty.hidden = false;
    empty.textContent = t('Catalogue indisponible : ', 'Catalogue unavailable: ') + err.message;
  });

  document.addEventListener('matea:lang', function () {
    renderBuilder(); renderFlavours(); renderPacks();
  });
})();
