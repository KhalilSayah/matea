/* MATEA — l'appel à l'action collé en bas de la landing.

   Il apparaît une fois la séquence de fonte passée et glisse vers la
   section de commande. Il s'efface dans deux cas : quand cette section
   est à l'écran (le bouton y serait redondant), et quand la barre de
   panier monte (deux barres fixes se chevaucheraient). */

(function () {
  var dock = document.getElementById('dock'),
      track = document.getElementById('track'),
      target = document.getElementById('commander');
  if (!dock || !track) return;

  var targetVisible = false, cartUp = false;

  if (target && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      targetVisible = entries[0].isIntersecting;
      update();
    }, { rootMargin: '-10% 0px -25% 0px' }).observe(target);
  }

  document.addEventListener('matea:cart', function (e) {
    cartUp = e.detail && e.detail.count > 0;
    update();
  });

  function update() {
    /* passée la hauteur du track, la scène de fonte est derrière nous */
    var past = track.getBoundingClientRect().bottom < window.innerHeight * 0.85;
    dock.classList.toggle('up', past && !targetVisible && !cartUp);
  }

  /* Glissement doux, et le focus suit pour le clavier. */
  var link = dock.querySelector('a[href^="#"]');
  if (link && target) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();
