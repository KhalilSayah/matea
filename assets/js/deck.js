/* MATEA — le carrousel de parfums de la landing.

   Les cartes viennent du catalogue, comme le composeur : un parfum ajouté
   dans le back office apparaît ici sans toucher au HTML, et un parfum mis
   en rupture y reste — en gris, avec son bandeau.

   Glissement horizontal avec accrochage, et un appui retourne la carte. */

(function () {
  var deck = document.getElementById('deck'),
      dotsBox = document.getElementById('dots');
  if (!deck) return;

  var products = [];

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'fr'; }
  function t(fr, en) { return lang() === 'en' ? en : fr; }
  function money(n) { return Number(n).toLocaleString('fr-DZ').replace(/ | /g, ' ') + ' DA'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render() {
    if (!products.length) { deck.innerHTML = ''; if (dotsBox) dotsBox.innerHTML = ''; return; }

    deck.innerHTML = products.map(function (p) {
      var name = esc(lang() === 'en' ? (p.name_en || p.name) : p.name);
      var note = esc(lang() === 'en' ? (p.blurb_en || p.blurb) : p.blurb);
      var out = p.status === 'victime';
      var chips = (p.ingredients || []).map(function (i) {
        return '<li>' + esc(i) + '</li>';
      }).join('');

      return '<button class="card' + (out ? ' sold' : '') + '" type="button" aria-pressed="false">' +
        '<div class="flip">' +

          '<div class="face front">' +
            '<div class="halo"></div>' +
            '<div class="media photo">' +
              (p.image_url ? '<img src="' + esc(p.image_url) + '" alt="" loading="lazy" decoding="async">' : '') +
            '</div>' +
            '<div class="sheen"></div>' +
            (out ? '<div class="sticker"><span>' +
                     t('Victime de<br>son succès', 'Sold<br>out') + '</span></div>' : '') +
            '<div class="turn" aria-hidden="true">↻</div>' +
            '<div class="glass">' +
              '<div><h3>' + name + '</h3>' +
                '<span class="sub">' + t('Touche pour retourner', 'Tap to turn') + '</span></div>' +
              '<span class="price">' + money(p.price_da) + '</span>' +
            '</div>' +
          '</div>' +

          '<div class="face back">' +
            '<h3>' + name + '</h3>' +
            '<div class="in">' + t('Dans ce bâton', 'In this stick') + '</div>' +
            '<ul>' + chips + '</ul>' +
            '<p class="note">' + note + '</p>' +
            '<div class="foot"><b>' + money(p.price_da) + '</b>' +
              '<span>' + (out ? t('indisponible', 'unavailable') : t('la pièce', 'per stick')) + '</span></div>' +
            '<div class="turn" aria-hidden="true">↺</div>' +
          '</div>' +

        '</div>' +
      '</button>';
    }).join('');

    if (dotsBox) {
      dotsBox.innerHTML = products.map(function (_, i) {
        return '<i' + (i === 0 ? ' class="on"' : '') + '></i>';
      }).join('');
    }
  }

  /* Un appui retourne la carte ; un glissement fait défiler et ne doit
     rien retourner au passage. */
  var sx = 0, sy = 0, moved = false;

  deck.addEventListener('pointerdown', function (e) {
    if (!e.target.closest('.card')) return;
    sx = e.clientX; sy = e.clientY; moved = false;
  });

  deck.addEventListener('pointermove', function (e) {
    if (Math.abs(e.clientX - sx) > 9 || Math.abs(e.clientY - sy) > 9) moved = true;
  });

  deck.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (!card) return;
    if (moved) { e.preventDefault(); return; }
    card.setAttribute('aria-pressed', card.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });

  var tick = null;
  deck.addEventListener('scroll', function () {
    if (tick) return;
    tick = requestAnimationFrame(function () {
      tick = null;
      var cards = deck.querySelectorAll('.card'),
          dots = dotsBox ? dotsBox.querySelectorAll('i') : [];
      if (!cards.length || !dots.length) return;
      var mid = deck.scrollLeft + deck.clientWidth / 2, best = 0, bd = 1e9;
      [].forEach.call(cards, function (c, i) {
        var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < bd) { bd = d; best = i; }
      });
      [].forEach.call(dots, function (d, i) { d.classList.toggle('on', i === best); });
    });
  }, { passive: true });

  MATEA.store.listProducts().then(function (list) {
    /* les archivés ne remontent pas du serveur ; on écarte aussi ceux
       qui n'auraient pas d'image pour ne pas laisser une carte vide */
    products = list;
    render();
  }).catch(function () {
    deck.innerHTML = '';
  });

  document.addEventListener('matea:lang', render);
  document.addEventListener('matea:theme', render);
})();
