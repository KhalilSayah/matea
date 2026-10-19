/* MATEA — flavour deck: horizontal snap scroll, tap a card to flip it. */
/* ---- flavour deck: swipe to browse, tap to turn a card over ---- */
(function(){
  var deck=document.getElementById('deck');
  if(!deck) return;
  var cards=[].slice.call(deck.querySelectorAll('.card')),
      dots=[].slice.call(document.querySelectorAll('#dots i'));

  /* a tap turns the card; a drag scrolls the deck and must not turn anything */
  cards.forEach(function(card){
    var sx=0, sy=0, moved=false;
    card.addEventListener('pointerdown',function(e){ sx=e.clientX; sy=e.clientY; moved=false; });
    card.addEventListener('pointermove',function(e){
      if(Math.abs(e.clientX-sx)>9||Math.abs(e.clientY-sy)>9) moved=true;
    });
    card.addEventListener('click',function(e){
      if(moved){ e.preventDefault(); return; }
      var on=card.getAttribute('aria-pressed')==='true';
      card.setAttribute('aria-pressed',on?'false':'true');
    });
  });

  var tick=null;
  deck.addEventListener('scroll',function(){
    if(tick) return;
    tick=requestAnimationFrame(function(){
      tick=null;
      var mid=deck.scrollLeft+deck.clientWidth/2, best=0, bd=1e9;
      cards.forEach(function(c,i){
        var d=Math.abs(c.offsetLeft+c.offsetWidth/2-mid);
        if(d<bd){ bd=d; best=i; }
      });
      dots.forEach(function(d,i){ d.classList.toggle('on',i===best); });
    });
  },{passive:true});
})();
