/* MATEA — étiquette de livraison.

   Produit une étiquette 100 × 150 mm et ouvre le dialogue d'impression,
   où « Enregistrer en PDF » est proposé aussi bien sur ordinateur que
   sur téléphone. Pas de bibliothèque PDF : elle pèserait plus lourd que
   tout le reste du site pour un rendu moins fidèle à l'impression.

   L'étiquette est écrite dans une iframe cachée plutôt que dans une
   fenêtre : window.open() se fait bloquer par les bloqueurs de pop-up,
   une iframe jamais.

   Code-barres : Code 39. Chaque caractère y vaut neuf éléments dont
   exactement trois larges, ce qui rend l'encodage vérifiable à l'œil —
   un Code 128 serait plus compact mais sa table de 107 motifs ne se
   relit pas. Les références MATEA (lettres, chiffres, tiret) entrent
   toutes dans le jeu de Code 39. */

window.MATEA = window.MATEA || {};

MATEA.label = (function () {

  /* n = élément étroit, w = élément large, dans l'ordre
     barre, espace, barre, espace, barre, espace, barre, espace, barre */
  var CODE39 = {
    '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
    '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
    '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
    'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw',
    'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn', 'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn',
    'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn', 'K': 'wnnnnnnww', 'L': 'nnwnnnnww',
    'M': 'wnwnnnnwn', 'N': 'nnnnwnnww', 'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn',
    'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn', 'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn',
    'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw',
    'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
    '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn',
    '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
    '*': 'nwnnwnwnn'          // délimiteur de début et de fin
  };

  /* Les barres sont dessinées en SVG : à l'impression elles restent
     nettes quelle que soit la résolution, là où un canvas pixelise. */
  function barcode(text, height) {
    var NARROW = 2, WIDE = 5, GAP = 2;     // en unités SVG
    var chars = ('*' + String(text).toUpperCase() + '*').split('');
    var x = 0, bars = [];

    chars.forEach(function (ch, idx) {
      var pattern = CODE39[ch];
      if (!pattern) return;                 // caractère hors jeu : ignoré
      for (var i = 0; i < 9; i++) {
        var w = pattern[i] === 'w' ? WIDE : NARROW;
        if (i % 2 === 0) bars.push('<rect x="' + x + '" y="0" width="' + w +
                                   '" height="' + height + '"/>');
        x += w;
      }
      if (idx < chars.length - 1) x += GAP;  // séparation inter-caractères
    });

    return '<svg viewBox="0 0 ' + x + ' ' + height + '" width="100%" height="' +
           height + '" preserveAspectRatio="none" shape-rendering="crispEdges">' +
           '<rect x="0" y="0" width="' + x + '" height="' + height + '" fill="#fff"/>' +
           '<g fill="#000">' + bars.join('') + '</g></svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) {
    return Number(n).toLocaleString('fr-DZ').replace(/ | /g, ' ') + ' DA';
  }

  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function itemLines(order) {
    return (order.items || []).map(function (pk) {
      var inside = (pk.sticks || []).map(function (s) {
        return s.qty + ' × ' + esc(String(s.name).toUpperCase());
      }).join(', ');
      return '<div class="it"><b>Doypack ' + pk.pack + ' (' + pk.stick_count + ') :</b> ' +
             inside + '</div>';
    }).join('');
  }

  function html(order) {
    var ref = esc(order.ref || '');
    return '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
      '<title>' + ref + '</title><style>' +
      '@page{size:100mm 150mm;margin:0}' +
      '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'html,body{margin:0;padding:0;background:#fff;color:#000;' +
        'font-family:Helvetica,Arial,sans-serif}' +
      '.lbl{width:100mm;height:150mm;padding:4mm;display:flex;flex-direction:column}' +
      '.box{border:1.6pt solid #000;flex:1;display:flex;flex-direction:column}' +
      '.sec{border-bottom:1.6pt solid #000;padding:3mm}' +
      '.sec:last-child{border-bottom:0}' +
      '.hd{display:flex;align-items:center;gap:3mm}' +
      '.d{width:14mm;height:14mm;border:1.6pt solid #000;display:flex;align-items:center;' +
        'justify-content:center;font-size:30pt;font-weight:700;line-height:1;flex:none}' +
      '.ht{min-width:0}' +
      '.ht h1{margin:0;font-size:16pt;font-weight:700;letter-spacing:-.2pt;line-height:1.05}' +
      '.ht p{margin:1mm 0 0;font-size:8.5pt}' +
      '.ht p b{font-weight:700}' +
      '.lb{font-size:8pt;letter-spacing:.4pt;margin:0 0 1.5mm}' +
      '.who{margin:0;font-size:17pt;font-weight:700;line-height:1.1}' +
      '.tel{margin:1.5mm 0 0;font-size:13pt;font-weight:700}' +
      '.adr{margin:2mm 0 0;font-size:11pt;line-height:1.3}' +
      '.wil{margin:1mm 0 0;font-size:13pt;font-weight:700;text-transform:uppercase}' +
      '.it{font-size:9pt;line-height:1.35}' +
      '.it+.it{margin-top:1.5mm}' +
      '.cod{display:flex;align-items:center;justify-content:space-between;gap:3mm}' +
      '.cod span{font-size:9.5pt;font-weight:700;letter-spacing:.2pt}' +
      '.cod b{font-size:24pt;font-weight:700;white-space:nowrap}' +
      '.bc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'padding:3mm;gap:2mm}' +
      '.bc .sv{width:100%}' +
      '.bc .ref{font-size:13pt;font-weight:700;letter-spacing:1.5pt}' +
      '</style></head><body><div class="lbl"><div class="box">' +

      '<div class="sec hd">' +
        '<div class="d">D</div>' +
        '<div class="ht"><h1>DELIVERY / LIVRAISON</h1>' +
        '<p>Order : <b>' + ref + '</b> &nbsp; Date : ' + esc(when(order.created_at)) + '</p></div>' +
      '</div>' +

      '<div class="sec">' +
        '<p class="lb">SHIP TO / DESTINATAIRE :</p>' +
        '<p class="who">' + esc(order.first_name) + ' ' + esc(order.last_name) + '</p>' +
        '<p class="tel">Tel : ' + esc(order.phone) + '</p>' +
        '<p class="adr">' + esc(order.address) + '</p>' +
        '<p class="wil">' + esc(order.wilaya) + '</p>' +
      '</div>' +

      '<div class="sec">' + itemLines(order) + '</div>' +

      '<div class="sec cod">' +
        '<span>TOTAL À ENCAISSER / COD :</span><b>' + money(order.total_da) + '</b>' +
      '</div>' +

      '<div class="bc">' +
        '<div class="sv">' + barcode(order.ref, 60) + '</div>' +
        '<div class="ref">' + ref + '</div>' +
      '</div>' +

      '</div></div></body></html>';
  }

  /* Plusieurs étiquettes en un seul document : une session d'expédition
     se prépare d'un coup, pas commande par commande. */
  function sheetHtml(orders) {
    var first = html(orders[0]);
    var head = first.slice(0, first.indexOf('</head>'));
    var bodies = orders.map(function (o) {
      var h = html(o);
      return h.slice(h.indexOf('<body>') + 6, h.indexOf('</body>'));
    }).join('');
    return head + '<style>.lbl{page-break-after:always;break-after:page}' +
           '.lbl:last-child{page-break-after:auto;break-after:auto}</style>' +
           '</head><body>' + bodies + '</body></html>';
  }

  /* Une iframe cachée : pas de pop-up à débloquer, et la page du back
     office reste telle quelle derrière le dialogue d'impression. */
  function print(order) {
    var old = document.getElementById('mateaLabel');
    if (old) old.remove();

    var frame = document.createElement('iframe');
    frame.id = 'mateaLabel';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
    document.body.appendChild(frame);

    var doc = frame.contentDocument;
    doc.open();
    doc.write(Array.isArray(order) ? sheetHtml(order) : html(order));
    doc.close();

    /* Laisser la mise en page se faire avant d'appeler print(), sinon
       certains navigateurs impriment une page encore vide. */
    setTimeout(function () {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (e) {}
    }, 250);
  }

  return { print: print, html: html, barcode: barcode, sheetHtml: sheetHtml };
})();
