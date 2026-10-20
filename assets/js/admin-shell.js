/* MATEA — le socle commun des pages d'administration.

   Le verrou, le badge de mode, les messages et les petits outils de
   formatage sont partagés par /admin et /commandes. Le jeton vit dans
   sessionStorage : on entre son mot de passe une fois, et il vaut pour
   les deux pages tant que l'onglet est ouvert.

   À charger avant admin.js ou orders.js. */

window.MATEA = window.MATEA || {};

MATEA.admin = (function () {
  var cfg = window.MATEA_CONFIG || {};

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'fr'; }
  function t(fr, en) { return lang() === 'en' ? en : fr; }
  function money(n) {
    return Number(n).toLocaleString('fr-DZ').replace(/ | /g, ' ') + ' DA';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastEl = null, toastTimer = null;
  function toast(msg) {
    toastEl = toastEl || document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1800);
  }

  /* Arme un bouton : le premier clic demande confirmation, le second agit.
     Renvoie true quand l'action doit se faire. Les boîtes de dialogue
     natives sont bloquées par certains hébergeurs et pénibles au doigt. */
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

  /* Le badge en haut : local, supabase, ou erreur en rouge. */
  function badge() {
    return MATEA.store.ready.then(function () {
      var live = MATEA.store.mode === 'remote';
      var tag = document.getElementById('modeTag');
      if (tag) {
        tag.classList.toggle('live', live);
        tag.classList.toggle('broken', Boolean(MATEA.store.problem));
        tag.querySelector('span').textContent = MATEA.store.problem ? 'erreur'
                                              : (live ? 'supabase' : 'local');
      }
      var note = document.getElementById('localNote');
      if (note) {
        note.hidden = live && !MATEA.store.problem;
        if (MATEA.store.problem) {
          note.textContent = t('Le serveur répond mais échoue : ', 'The server answers but fails: ') +
            MATEA.store.problem + t('. Ouvre /api/health pour le détail.',
                                    '. Open /api/health for details.');
        }
      }
      return live;
    });
  }

  /* En ligne, le mot de passe n'est jamais comparé dans le navigateur :
     il part en en-tête vers /api, qui le confronte à ADMIN_PASSWORD. */
  function gate(onUnlock) {
    var gateBox = document.getElementById('gate'),
        app = document.getElementById('app');

    function unlock() {
      gateBox.hidden = true;
      app.hidden = false;
      onUnlock();
    }

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
  }

  return { t: t, money: money, esc: esc, toast: toast, arm: arm, gate: gate, badge: badge, lang: lang };
})();
