/* MATEA — l'appel à l'action collé en bas de la landing.

   Il apparaît une fois la séquence de fonte passée, et s'efface quand le
   bloc d'inscription arrive à l'écran : deux boutons identiques côte à côte
   se feraient concurrence. */

(function () {
  var dock = document.getElementById('dock'),
      track = document.getElementById('track'),
      cta = document.querySelector('.cta');
  if (!dock || !track) return;

  var ctaVisible = false;

  if (cta && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      ctaVisible = entries[0].isIntersecting;
      update();
    }, { rootMargin: '-10% 0px -10% 0px' }).observe(cta);
  }

  function update() {
    /* passée la hauteur du track, la scène de fonte est derrière nous */
    var past = track.getBoundingClientRect().bottom < window.innerHeight * 0.85;
    dock.classList.toggle('up', past && !ctaVisible);
  }

  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();
