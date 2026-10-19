/* MATEA — composeur de doypack.

   Le client remplit un sachet bâton par bâton en mélangeant les parfums,
   puis l'ajoute à son panier et en compose un autre s'il veut.

     draft  : { idParfum: quantité }   le sachet en cours
     packs  : [ draft, draft, ... ]    les sachets déjà mis au panier

   Le composeur se monte dans n'importe quel <div data-composer></div> :
   la page de commande et le bas de la landing partagent ce fichier, il
   n'existe donc qu'une seule version du panier et du formulaire.

   Ce fichier doit être chargé AVANT i18n.js : il injecte du français
   que le moteur de traduction relève ensuite comme texte de référence. */

(function () {
  var mount = document.querySelector('[data-composer]');
  if (!mount) return;

  var cfg = window.MATEA_CONFIG || {};
  var CAP = Number(cfg.packSize) || 10;
  var MIN = Math.max(1, Math.min(Number(cfg.minPerPack) || 1, CAP));

  /* ---------- le gabarit ---------- */

  mount.innerHTML =
    '<section class="builder" aria-label="Doypack en cours">' +
      '<div class="bpouch">' +
        '<div class="seal"></div><div class="notch"></div>' +
        '<div class="pmark">MATEA</div>' +
        '<div class="bwin" id="slots" aria-hidden="true"></div>' +
        '<div class="pstripe" id="bstripe"></div>' +
        '<div class="gloss"></div>' +
      '</div>' +
      '<div class="bmeta">' +
        '<div class="bcount"><b id="cCount">0</b><span id="cCap">/ ' + CAP + ' bâtons</span></div>' +
        '<div class="bprice" id="cPrice">0 DA</div>' +
        '<p class="bhint" id="cHint"></p>' +
        '<button type="button" class="badd" id="addPack" disabled data-t="cmpAdd">Ajouter ce doypack</button>' +
      '</div>' +
    '</section>' +

    '<h2 class="sect" data-t="cmpPick">Choisis tes bâtons</h2>' +
    '<div id="flavours" aria-live="polite"></div>' +
    '<div class="empty" id="empty" hidden data-t="ordEmpty">Le catalogue est vide pour le moment.</div>' +

    '<section id="cartBox" hidden>' +
      '<h2 class="sect" data-t="cmpCart">Ton panier</h2>' +
      '<div id="packs"></div>' +
    '</section>';

  /* Les éléments fixes vivent sur <body> : à l'intérieur du flux, un
     parent avec transform ou overflow casserait leur positionnement. */
  var fixed = document.createElement('div');
  fixed.innerHTML =
    '<div class="bar" id="bar">' +
      '<div class="barin">' +
        '<div class="ct"><b id="barTotal">0 DA</b><span id="barCount">0 doypack</span></div>' +
        '<button type="button" id="goOrder" data-t="ordGo">Commander</button>' +
      '</div>' +
    '</div>' +

    '<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">' +
      '<div class="veil" data-close></div>' +
      '<div class="panel">' +
        '<div id="formStep">' +
          '<div class="hd">' +
            '<h2 id="sheetTitle" data-t="ordConfirm">Confirmer la<br>commande.</h2>' +
            '<button type="button" class="shut" data-close aria-label="Fermer">×</button>' +
          '</div>' +
          '<div class="recap" id="recap"></div>' +
          '<form id="orderForm" novalidate>' +
            '<div class="fields">' +
              '<label><span class="lb" data-t="fFirst">Prénom</span>' +
                '<input id="firstName" type="text" autocomplete="given-name" required ' +
                'placeholder="Yacine" data-t="fFirstPh" data-tattr="placeholder"></label>' +
              '<label><span class="lb" data-t="fLast">Nom</span>' +
                '<input id="lastName" type="text" autocomplete="family-name" required ' +
                'placeholder="Benali" data-t="fLastPh" data-tattr="placeholder"></label>' +
              '<label><span class="lb" data-t="fPhone">Téléphone</span>' +
                '<input id="phone" type="tel" inputmode="tel" autocomplete="tel" required ' +
                'placeholder="0555 12 34 56" data-t="fPhonePh" data-tattr="placeholder"></label>' +
              '<label><span class="lb" data-t="fWilaya">Wilaya</span>' +
                '<select id="wilaya" required autocomplete="address-level1">' +
                  '<option value="" data-t="fWilayaPick">Choisis ta wilaya</option>' +
                '</select></label>' +
              '<label><span class="lb" data-t="fAddress">Adresse de livraison</span>' +
                '<textarea id="address" rows="2" required autocomplete="street-address" ' +
                'placeholder="Cité, rue, numéro, point de repère" data-t="fAddressPh" ' +
                'data-tattr="placeholder"></textarea></label>' +
            '</div>' +
            '<p class="err" id="formErr" role="alert"></p>' +
            '<button type="submit" class="send" id="sendBtn" data-t="ordSend">Confirmer la commande</button>' +
            '<p class="fine" data-t="ordFine">On ne demande que le strict nécessaire pour te rappeler. ' +
              'Aucun paiement en ligne : tu règles à la livraison.</p>' +
          '</form>' +
        '</div>' +
        '<div id="doneStep" hidden>' +
          '<div class="done-wrap">' +
            '<div class="tick" aria-hidden="true">✓</div>' +
            '<h2 data-t="ordDone">C\'est enregistré.</h2>' +
            '<div class="ref" id="doneRef">MT-------</div>' +
            '<p data-t="ordDoneMsg">Garde cette référence. On t\'appelle dans la journée pour ' +
              'confirmer l\'adresse et la livraison.</p>' +
            '<button type="button" class="send" data-close data-t="ordBack" ' +
              'style="margin-top:22px">Revenir à la boutique</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="toast" id="toast" role="status" aria-live="polite"></div>';

  while (fixed.firstChild) document.body.appendChild(fixed.firstChild);

  /* ---------- références ---------- */

  var id = function (x) { return document.getElementById(x); };
  var slots = id('slots'), bstripe = id('bstripe'), cCount = id('cCount'), cCap = id('cCap'),
      cPrice = id('cPrice'), cHint = id('cHint'), addPack = id('addPack'),
      flavours = id('flavours'), empty = id('empty'), cartBox = id('cartBox'),
      packsBox = id('packs'), bar = id('bar'), barTotal = id('barTotal'),
      barCount = id('barCount'), sheet = id('sheet'), recap = id('recap'),
      form = id('orderForm'), formErr = id('formErr'), sendBtn = id('sendBtn'),
      formStep = id('formStep'), doneStep = id('doneStep'), toastEl = id('toast');

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
  function find(x) { return products.find(function (p) { return p.id === x; }); }
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
    if (!filled) return '<span class="slot free"></span>';
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

    addPack.disabled = n < MIN;
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
    var pid = b.getAttribute('data-id'), act = b.getAttribute('data-act');
    var p = find(pid);
    if (!p || p.status === 'victime') return;

    if (act === 'inc') {
      if (countOf(draft) >= CAP) { toast(t('Sachet plein', 'Pouch full')); return; }
      draft[pid] = (draft[pid] || 0) + 1;
    } else {
      draft[pid] = (draft[pid] || 0) - 1;
      if (draft[pid] <= 0) delete draft[pid];
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
  });

  function syncBar() {
    var n = packs.length;
    barTotal.textContent = money(cartTotal());
    barCount.textContent = n + ' ' + (lang() === 'en'
      ? (n > 1 ? 'pouches' : 'pouch')
      : (n > 1 ? 'doypacks' : 'doypack'));
    bar.classList.toggle('up', n > 0);
    /* le bandeau d'appel à l'action de la landing laisse la place au panier */
    document.dispatchEvent(new CustomEvent('matea:cart', { detail: { count: n } }));
  }

  /* ---------- confirmation ---------- */

  function orderItems() {
    return packs.map(function (d, i) {
      return { pack: i + 1, sticks: linesOf(d), stick_count: countOf(d), total_da: priceOf(d) };
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
    setTimeout(function () { id('firstName').focus(); }, 60);
  }

  function closeSheet() {
    sheet.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  id('goOrder').addEventListener('click', openSheet);
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
    ['firstName', 'lastName', 'phone', 'wilaya', 'address'].forEach(function (x) {
      id(x).removeAttribute('aria-invalid');
    });

    var first = id('firstName'), last = id('lastName'), tel = id('phone'),
        wil = id('wilaya'), adr = id('address');

    if (first.value.trim().length < 2) return fail(first, t('Indique ton prénom.', 'Enter your first name.'));
    if (last.value.trim().length < 2) return fail(last, t('Indique ton nom.', 'Enter your last name.'));

    var d = normalisePhone(tel.value);
    if (!phoneOk(d)) {
      return fail(tel, t('Numéro algérien à 10 chiffres, par exemple 0555 12 34 56.',
                         'Algerian number, 10 digits, e.g. 0555 12 34 56.'));
    }
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
      try { localStorage.setItem('matea.wilaya', wil.value); } catch (e2) {}
      packs = []; draft = {}; save();
      renderBuilder(); renderFlavours(); renderPacks();
      id('doneRef').textContent = order.ref;
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
    var sel = id('wilaya');
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
    mount.prepend(strip);
  });

  MATEA.store.listProducts().then(function (list) {
    products = list;

    /* un parfum retiré du catalogue ou passé en rupture ne doit pas
       rester dans un sachet composé avant son retrait */
    function clean(d) {
      Object.keys(d).forEach(function (x) {
        var p = find(x);
        if (!p || p.status === 'victime') delete d[x];
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
