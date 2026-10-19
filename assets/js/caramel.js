/* MATEA — caramel trail that follows a fingertip on touch devices. */
/* ---- caramel on your fingertip: a syrup trail that follows the drag ---- */
(function(){
  var cv=document.getElementById('trail');
  if(!cv||matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx=cv.getContext('2d'), dpr=1, W=0, H=0, pts=[], drops=[], run=false;
  var LIFE=1150;

  function size(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=window.innerWidth; H=window.innerHeight;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  }
  size();
  addEventListener('resize',size);

  function add(x,y){
    var n=pts.length, last=n?pts[n-1]:null;
    var sp=last?Math.min(Math.hypot(x-last.x,y-last.y),46):0;
    pts.push({x:x,y:y,t:performance.now(),sp:sp});
    if(pts.length>170) pts.shift();
    /* fast drags fling a droplet off, the way syrup does */
    if(sp>22&&Math.random()<0.22&&drops.length<14)
      drops.push({x:x,y:y,vx:(Math.random()-.5)*1.1,vy:Math.random()*0.5,
                  r:2.2+Math.random()*3.4,t:performance.now()});
    start();
  }

  function frame(now){
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);
    while(pts.length&&now-pts[0].t>LIFE) pts.shift();

    if(pts.length>1){
      ctx.lineCap='round'; ctx.lineJoin='round';
      /* body of the syrup: each segment tapers with age and with how fast it was drawn */
      for(var pass=0;pass<2;pass++){
        for(var i=1;i<pts.length;i++){
          var a=pts[i-1], b=pts[i], age=(now-b.t)/LIFE;
          if(age>=1) continue;
          var k=1-age, w=(3.2+b.sp*0.42)*k;
          if(pass===0){
            ctx.strokeStyle='rgba(96,44,8,'+(0.5*k*k).toFixed(3)+')';
            ctx.lineWidth=w+3.4;
          } else {
            ctx.strokeStyle='rgba(206,124,38,'+(0.72*k*k).toFixed(3)+')';
            ctx.lineWidth=w;
          }
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
      /* wet highlight riding on top */
      for(var j=1;j<pts.length;j++){
        var p0=pts[j-1], p1=pts[j], ag=(now-p1.t)/LIFE;
        if(ag>=1) continue;
        var kk=1-ag;
        ctx.strokeStyle='rgba(255,214,150,'+(0.4*kk*kk*kk).toFixed(3)+')';
        ctx.lineWidth=Math.max(0.6,(1+p1.sp*0.12)*kk);
        ctx.beginPath(); ctx.moveTo(p0.x,p0.y-1.4); ctx.lineTo(p1.x,p1.y-1.4); ctx.stroke();
      }
    }

    for(var d=drops.length-1;d>=0;d--){
      var q=drops[d], dage=(now-q.t)/1700;
      if(dage>=1){ drops.splice(d,1); continue; }
      q.vy+=0.045; q.x+=q.vx; q.y+=q.vy;
      var dk=1-dage;
      ctx.fillStyle='rgba(188,108,32,'+(0.62*dk*dk).toFixed(3)+')';
      ctx.beginPath(); ctx.ellipse(q.x,q.y,q.r*dk,q.r*dk*1.25,0,0,6.2832); ctx.fill();
      ctx.fillStyle='rgba(255,220,164,'+(0.42*dk*dk).toFixed(3)+')';
      ctx.beginPath(); ctx.ellipse(q.x-q.r*0.26*dk,q.y-q.r*0.4*dk,q.r*0.26*dk,q.r*0.3*dk,0,0,6.2832); ctx.fill();
    }

    if(pts.length||drops.length) requestAnimationFrame(frame);
    else { run=false; ctx.clearRect(0,0,W,H); }
  }

  function start(){ if(!run){ run=true; requestAnimationFrame(frame); } }

  /* fingers only — a mouse cursor leaving syrup behind reads as a bug, not a texture */
  if(window.PointerEvent){
    addEventListener('pointermove',function(e){
      if(e.pointerType==='mouse') return;
      add(e.clientX,e.clientY);
    },{passive:true});
  } else {
    addEventListener('touchmove',function(e){
      var t=e.touches[0]; if(t) add(t.clientX,t.clientY);
    },{passive:true});
  }
})();
