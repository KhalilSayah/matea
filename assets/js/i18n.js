/* MATEA — language. French is in the markup; English is the dictionary below.
   Add a string: give the element data-t="key" and add EN.key here. */
/* ---- language: French ships in the markup, English lives here ---- */
(function(){
  var EN={
    /* "Tea on a stick" is the brand line: it stays English in both languages */
    p1:'One stick, one cup. Scroll to melt it.',
    h2:'Drop it<br><i>in.</i>',
    p2:'Hot water, iced water, milk. It does not care.',
    h3:'Watch it<br><i>melt.</i>',
    p3:'No bag to fish out. No spoon. No tin on the shelf.',
    h4:"That's<br><i>it.</i>",
    p4:'Hibiscus &amp; gingembre, camomille &amp; lavande, menthe &amp; fenouil. 70 DA each.',
    cue:'Scroll to melt',

    whyEye:'Why a stick',
    whyLede:'A teabag keeps the tea away from you.',
    whyCopy:'A stick melts into the water instead of steeping behind paper. Whole botanicals set in caramel on a birch handle — you can see every leaf and root before it goes in. Stir until the head is gone, lift the stick out, done. Nothing to strain, nothing to throw away but the stick.',
    sp1:'Per stick', sp2:'Makes', sp3:'Melts in', sp4:'Price',

    deckEye:'Three to start',
    deckLede:'Swipe across.<br>Tap one to turn it over.',
    tapTurn:'Tap to turn',
    inStick:'In this stick',
    perStick:'per stick',
    n1:'Tart and deep red, with the ginger arriving late at the back of the throat.',
    n2:'Soft and floral, barely sweet. The one for the end of the day.',
    n3:'Cooling first, anise underneath. Drink it after a long meal.',

    howEye:'How it works',
    s1t:'Drop it in', s1b:'Head first, into 250 ml of water. The stick rests on the rim.',
    s2t:'Stir twice', s2b:'The head comes apart in about forty seconds. The water turns as it goes.',
    s3t:'Lift it out', s3b:'A bare birch stick comes back. Nothing left in the cup but tea.',

    ctaH:'First batch<br>ships soon.',
    ctaP:'70 DA a stick, and you fill the pouch yourself: mix whatever flavours you like. No account, no online payment — you pay on delivery.',
    dockT:'Build your own pouch',
    dockS:'70 DA a stick · you pick the flavours',
    ctaBtn:'Send me one',
    okMsg:'On the list. Watch for a small envelope.',

    footLead:'A question, or a bulk order?<br>We answer.',
    footCall:'Call us',

    'emailIn:placeholder':'you@email.com',
    'emailIn:aria-label':'Email address',
    'canvasA:aria-label':'A tea lollipop melting into a cup of hot water as the page scrolls'
  };

  /* Les autres pages (commande, admin) ajoutent leurs clés ici, via un
     fichier chargé avant celui-ci. Le moteur ne touche qu'aux éléments
     [data-t] réellement présents sur la page en cours. */
  if(window.MATEA_EN_EXTRA){
    Object.keys(window.MATEA_EN_EXTRA).forEach(function(k){ EN[k]=window.MATEA_EN_EXTRA[k]; });
  }

  var nodes=[].slice.call(document.querySelectorAll('[data-t]'));
  nodes.forEach(function(el){
    el._fr=el.innerHTML;
    var ats=el.getAttribute('data-tattr');
    if(ats){
      el._frA={};
      ats.split(',').forEach(function(a){ el._frA[a]=el.getAttribute(a); });
    }
  });

  function apply(lang){
    var en=lang==='en';
    nodes.forEach(function(el){
      var k=el.getAttribute('data-t');
      if(EN[k]!==undefined) el.innerHTML=en?EN[k]:el._fr;
      var ats=el.getAttribute('data-tattr');
      if(ats) ats.split(',').forEach(function(a){
        var v=en?EN[k+':'+a]:el._frA[a];
        if(v!==undefined) el.setAttribute(a,v);
      });
    });
    document.documentElement.lang=lang;
    [].forEach.call(document.querySelectorAll('.lang button'),function(b){
      b.setAttribute('aria-pressed',b.getAttribute('data-lang')===lang?'true':'false');
    });
    try{ localStorage.setItem('matea.lang',lang); }catch(e){}
    /* les pages qui composent du contenu en JS (catalogue, commandes)
       se redessinent en écoutant cet événement */
    document.dispatchEvent(new CustomEvent('matea:lang',{detail:{lang:lang}}));
  }

  [].forEach.call(document.querySelectorAll('.lang button'),function(b){
    b.addEventListener('click',function(){ apply(b.getAttribute('data-lang')); });
  });

  var saved=null;
  try{ saved=localStorage.getItem('matea.lang'); }catch(e){}
  apply(saved==='en'?'en':'fr');
})();
