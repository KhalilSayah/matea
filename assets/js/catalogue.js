/* MATEA — back office.
   Même couche de données que la boutique : MATEA.store.
   En local tout vit dans ce navigateur ; avec Supabase renseigné,
   exactement le même code écrit en base. */

(function () {
  var A = MATEA.admin;
  var t = A.t, money = A.money, esc = A.esc, toast = A.toast, arm = A.arm;

  var rows = document.getElementById('rows'),
      noProducts = document.getElementById('noProducts'),
      pForm = document.getElementById('pForm'),
      pErr = document.getElementById('pErr'),
      formTitle = document.getElementById('formTitle');

  var products = [], editing = null;

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
      showThumb(p.image_url || '');
      formTitle.textContent = t('Modifier : ', 'Edit: ') + p.name;
      pForm.scrollIntoView({ block: 'center', behavior: 'smooth' });
      document.getElementById('pName').focus();
    }

    if (act === 'del') {
      /* confirmation en deux temps, dans le bouton lui-même : les boîtes de
         dialogue natives sont bloquées par certains hébergeurs et pénibles
         au doigt. Le bouton se réarme tout seul après quatre secondes. */
      if (!arm(b, t('Supprimer ?', 'Delete?'), t('Suppr.', 'Delete'))) return;
      MATEA.store.deleteProduct(id).then(function () {
        products = products.filter(function (x) { return x.id !== id; });
        renderProducts();
        toast(t('Supprimé', 'Deleted'));
      }).catch(function (err) { toast(err.message); });
    }
  });

  /* ---------- image du parfum ---------- */

  var pickBtn = document.getElementById('pPick'),
      fileIn = document.getElementById('pFile'),
      thumb = document.getElementById('pThumb'),
      upHint = document.getElementById('pUpHint');

  function showThumb(url) {
    if (url) {
      thumb.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
      thumb.classList.add('has');
    } else {
      thumb.style.backgroundImage = '';
      thumb.classList.remove('has');
    }
  }

  function hint(msg, bad) {
    upHint.textContent = msg;
    upHint.classList.toggle('bad', Boolean(bad));
  }

  /* Redimensionne avant d'envoyer : une photo de téléphone fait 4 Mo et
     ne sera jamais affichée plus large que 400 px. On la ramène à 900 px
     et on la réencode en WebP — l'envoi passe de quelques mégaoctets à
     quelques dizaines de kilooctets. */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var MAX = 900;
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, MAX / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * scale);
        cv.height = Math.round(h * scale);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(function (blob) {
          if (!blob) return resolve(file);          // navigateur récalcitrant : on envoie l'original
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp',
                           { type: 'image/webp' }));
        }, 'image/webp', 0.82);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error(t('Image illisible.', 'Unreadable image.')));
      };
      img.src = url;
    });
  }

  pickBtn.addEventListener('click', function () { fileIn.click(); });

  fileIn.addEventListener('change', function () {
    var file = fileIn.files && fileIn.files[0];
    if (!file) return;
    pickBtn.disabled = true;
    hint(t('Préparation…', 'Preparing…'));

    shrink(file).then(function (small) {
      hint(t('Envoi… ', 'Uploading… ') + Math.round(small.size / 1024) + ' Ko');
      return MATEA.store.uploadImage(small);
    }).then(function (res) {
      document.getElementById('pImg').value = res.url;
      showThumb(res.url);
      hint(res.local
        ? t('Mode local : gardée dans ce navigateur, pas envoyée.',
            'Local mode: kept in this browser, not uploaded.')
        : t('Envoyée.', 'Uploaded.'));
    }).catch(function (err) {
      hint(err.message, true);
    }).then(function () {
      pickBtn.disabled = false;
      fileIn.value = '';
    });
  });

  function clearForm() {
    editing = null;
    pForm.reset();
    document.getElementById('pId').value = '';
    document.getElementById('pTint').value = '#9C4F1C';
    pErr.classList.remove('on');
    showThumb('');
    hint(t("JPEG, PNG ou WebP. Redimensionnée avant l'envoi.",
           'JPEG, PNG or WebP. Resized before upload.'));
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
    A.badge().then(function (live) {
      document.getElementById('resetBtn').hidden = live;
      clearForm();
      load();
    });
  }

  A.gate(boot);

  document.addEventListener('matea:lang', function () {
    if (document.getElementById('app').hidden) return;
    renderProducts();
  });
})();
