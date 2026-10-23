/* MATEA — bascule clair / sombre.

   Le sombre est l'identité de la marque, donc c'est lui par défaut :
   on ne suit pas prefers-color-scheme au premier passage. Le choix du
   visiteur, lui, est retenu.

   Le thème est posé sur <html> par un script en ligne dans le <head>
   de chaque page, AVANT le premier pixel. Ce fichier-ci ne s'occupe
   que du bouton — s'il s'en chargeait aussi, la page s'afficherait en
   sombre puis sauterait en clair sous les yeux du visiteur. */

(function () {
  var KEY = 'matea.theme';
  var root = document.documentElement;

  function current() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function apply(mode) {
    if (mode === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem(KEY, mode); } catch (e) {}

    /* La barre d'adresse du téléphone suit la page. */
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'light' ? '#F4F0E6' : '#0E0E0C');

    [].forEach.call(document.querySelectorAll('.tgl'), function (b) {
      b.setAttribute('aria-pressed', mode === 'light' ? 'true' : 'false');
      b.setAttribute('aria-label', mode === 'light'
        ? 'Passer en thème sombre' : 'Passer en thème clair');
    });

    /* La scène du héros repeint ses couleurs à chaque image, mais le
       carrousel et le composeur, eux, sont rendus une fois : on les
       prévient comme pour un changement de langue. */
    document.dispatchEvent(new CustomEvent('matea:theme', { detail: { mode: mode } }));
  }

  [].forEach.call(document.querySelectorAll('.tgl'), function (btn) {
    btn.addEventListener('click', function () {
      apply(current() === 'light' ? 'dark' : 'light');
    });
  });

  apply(current());
})();
