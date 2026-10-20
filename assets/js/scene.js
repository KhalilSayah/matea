/* MATEA — hero scene: the stick melting into the cup, scrubbed by scroll.
   Pure canvas 2D, no dependencies. Geometry constants live at the top. */
(function(){
  var cv=document.getElementById('c'), ctx=cv.getContext('2d'), track=document.getElementById('track'),
      rail=document.getElementById('rail'), cue=document.getElementById('cue'),
      caps=[].slice.call(document.querySelectorAll('.cap'));
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cl=function(v,a,b){return v<a?a:(v>b?b:v);};
  var seg=function(p,a,b){return cl((p-a)/(b-a),0,1);};
  var eo=function(t){return 1-Math.pow(1-t,3);};
  var ei=function(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;};
  var lp=function(a,b,t){return a+(b-a)*t;};
  var rgba=function(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';};
  var mixc=function(a,b,t){return [Math.round(lp(a[0],b[0],t)),Math.round(lp(a[1],b[1],t)),Math.round(lp(a[2],b[2],t))];};

  /* scene space: 390 x 560 */
  /* a wide, low teacup: the bowl is shorter than it is across, so the opening
     reads as an ellipse you look down into rather than a tall tumbler */
  var SW=390, SH=560, CX=195;
  var RIM=300, BASE=452, RTOP=92, RBOT=58, WALL=7, RY=26;
  var ITOP=RIM, IBOT=BASE-5, ITR=RTOP-WALL, IBR=RBOT-WALL;
  var LEVEL0=328;

  var WATER_T=[196,214,212], WATER_B=[120,142,142];
  var TEA_T=[238,168,66], TEA_B=[104,42,8];

  /* the bowl stays wide near the rim, then tucks in toward the foot */
  function halfAt(y){ var t=cl((y-ITOP)/(IBOT-ITOP),0,1); return lp(ITR,IBR,Math.pow(t,1.5)); }

  /* blob sprite for the melt swirls */
  var sprite=document.createElement('canvas'), SS=64;
  sprite.width=sprite.height=SS;
  (function(){
    var s=sprite.getContext('2d'), g=s.createRadialGradient(SS/2,SS/2,0,SS/2,SS/2,SS/2);
    g.addColorStop(0,'rgba(255,190,104,0.46)');
    g.addColorStop(0.4,'rgba(208,120,34,0.2)');
    g.addColorStop(1,'rgba(150,64,8,0)');
    s.fillStyle=g; s.fillRect(0,0,SS,SS);
  })();

  var P=[], MAXP=200;
  function spawn(x,y){
    if(P.length>=MAXP) P.shift();
    var a=Math.random()*Math.PI*2, sp=0.9+Math.random()*1.5;
    P.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*0.7+0.5,
            r:5+Math.random()*9,grow:0.28+Math.random()*0.4,
            life:1,fade:0.009+Math.random()*0.009});
  }
  function stepP(dt,kill){
    for(var i=P.length-1;i>=0;i--){
      var q=P[i];
      /* swirl field: two counter-rotating cells, so the colour threads through
         the whole glass instead of pooling where it was released */
      q.vx+=Math.sin(q.y*0.052+q.x*0.021)*0.1;
      q.vy+=Math.cos(q.x*0.058-q.y*0.015)*0.075-0.028;
      q.vx*=0.982; q.vy*=0.982;
      q.x+=q.vx*dt; q.y+=q.vy*dt;
      var h=halfAt(q.y)-4;
      if(q.x<CX-h){q.x=CX-h;q.vx*=-0.5;} if(q.x>CX+h){q.x=CX+h;q.vx*=-0.5;}
      if(q.y>IBOT-6){q.y=IBOT-6;q.vy*=-0.35;}
      if(q.y<LEVEL0+3){q.y=LEVEL0+3;q.vy*=-0.3;}
      q.r+=q.grow*dt; q.life-=q.fade*dt*(kill?6:1);
      if(q.life<=0||q.r>62) P.splice(i,1);
    }
  }

  function interior(c){
    c.beginPath();
    c.moveTo(CX-ITR,ITOP);
    c.bezierCurveTo(CX-ITR+1,ITOP+54,CX-IBR-18,IBOT-26,CX-IBR,IBOT-9);
    c.quadraticCurveTo(CX-IBR,IBOT,CX-IBR+11,IBOT);
    c.lineTo(CX+IBR-11,IBOT);
    c.quadraticCurveTo(CX+IBR,IBOT,CX+IBR,IBOT-9);
    c.bezierCurveTo(CX+IBR+18,IBOT-26,CX+ITR-1,ITOP+54,CX+ITR,ITOP);
    c.closePath();
  }

  /* --- the lollipop, drawn flat like the brand stickers --- */
  function lolly(c,x,y,ang,headR,melt,above){
    c.save(); c.translate(x,y); c.rotate(ang);
    c.lineCap='round'; c.lineJoin='round';
    /* handle: from head centre downward is -y, stick goes up out of the cup */
    c.strokeStyle='#0E0E0C'; c.lineWidth=15;
    c.beginPath(); c.moveTo(0,-6); c.lineTo(0,-128); c.stroke();
    c.strokeStyle='#F4F0E6'; c.lineWidth=9;
    c.beginPath(); c.moveTo(0,-6); c.lineTo(0,-128); c.stroke();

    if(headR>1.2){
      /* ragged edge as it dissolves */
      c.beginPath();
      for(var i=0;i<=46;i++){
        var a=i/46*Math.PI*2;
        var n=1+melt*0.28*Math.sin(a*7+melt*11)+melt*0.17*Math.sin(a*13-melt*7);
        var rr=headR*n;
        var px=Math.cos(a)*rr, py=Math.sin(a)*rr;
        if(i===0) c.moveTo(px,py); else c.lineTo(px,py);
      }
      c.closePath();
      c.fillStyle='#F4F0E6'; c.fill();
      c.strokeStyle='#0E0E0C'; c.lineWidth=5.5; c.stroke();

      /* ribbon where the stick meets the head, like the sticker */
      if(melt<0.45){
        c.save(); c.globalAlpha=1-melt/0.45;
        c.strokeStyle='#0E0E0C'; c.lineWidth=3.6; c.lineJoin='round';
        var by=-headR*0.9;
        c.beginPath();
        c.moveTo(-2.5,by); c.quadraticCurveTo(-12,by+5,-10,by-5);
        c.quadraticCurveTo(-8,by-13,-1.5,by-3);
        c.moveTo(2.5,by); c.quadraticCurveTo(12,by+5,10,by-5);
        c.quadraticCurveTo(8,by-13,1.5,by-3);
        c.stroke(); c.restore();
      }

      /* face */
      var fo=cl(1-melt*1.9,0,1);
      if(fo>0.02 && headR>14){
        c.globalAlpha=fo; c.fillStyle='#0E0E0C';
        var ex=headR*0.33, ey=-headR*0.18, er=headR*0.105;
        c.beginPath(); c.arc(-ex,ey,er,0,6.2832); c.fill();
        c.beginPath(); c.arc(ex,ey,er,0,6.2832); c.fill();
        c.strokeStyle='#0E0E0C'; c.lineWidth=headR*0.1; c.lineCap='round';
        c.beginPath(); c.arc(0,headR*0.02,headR*0.42,0.55,Math.PI-0.55); c.stroke();
        c.globalAlpha=1;
      }
    }
    c.restore();
  }

  var dpr=1, W=0, H=0;
  function resize(){
    var r=cv.parentNode.getBoundingClientRect();
    dpr=Math.min(window.devicePixelRatio||1,2.5);
    W=Math.max(1,r.width); H=Math.max(1,r.height);
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  }

  var prog=0;
  function measure(){
    var r=track.getBoundingClientRect(), total=r.height-window.innerHeight;
    prog=total<=0?0:cl(-r.top/total,0,1);
  }

  var last=0;
  function draw(now){
    var dt=last?cl((now-last)/16.667,0,3):1; last=now;
    var t=now/1000, p=prog;

    var drop=ei(seg(p,.08,.30)), melt=seg(p,.32,.70), settle=seg(p,.70,.84),
        lift=ei(seg(p,.76,.94)), conc=eo(Math.min(1,melt*1.06));

    /* lollipop position: head centre */
    var headY=lp(152,396,drop), headR=36*(1-eo(melt));
    var tiltA=lp(0.22,0.06,drop);
    if(lift>0){ headY=lp(396,160,lift); tiltA=lp(0.06,0.3,lift); headR=0; }
    var headX=CX+lp(16,0,drop)+lift*34;

    /* the head displaces water, so the level lifts slightly while it is under */
    var submerged=cl((headY-LEVEL0)/40,0,1);
    var level=LEVEL0-4.5*submerged*(1-lift);

    if(!reduce && melt>0.005 && melt<0.995 && headR>1){
      for(var s=0;s<3;s++){
        var sa=Math.random()*Math.PI*2, sr=headR*(0.6+Math.random()*0.75);
        spawn(headX+Math.cos(sa)*sr, headY+Math.sin(sa)*sr);
      }
    }
    if(!reduce) stepP(dt, melt>=0.985);

    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);
    var sc=Math.min(W/SW,H/SH);
    ctx.translate((W-SW*sc)/2,(H-SH*sc)/2); ctx.scale(sc,sc);

    /* backlight glow behind the cup, warms as the tea builds */
    var gg=ctx.createRadialGradient(CX,380,10,CX,380,210);
    gg.addColorStop(0,'rgba(217,138,43,'+(0.30*conc+0.045).toFixed(3)+')');
    gg.addColorStop(1,'rgba(217,138,43,0)');
    ctx.fillStyle=gg; ctx.beginPath(); ctx.ellipse(CX,380,206,150,0,0,6.2832); ctx.fill();

    /* contact shadow */
    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.ellipse(CX,BASE+14,RTOP+42,15,0,0,6.2832); ctx.fill();

    /* saucer */
    ctx.save();
    ctx.beginPath(); ctx.ellipse(CX,BASE+9,RTOP+36,25,0,0,6.2832);
    var sag=ctx.createLinearGradient(CX-RTOP-36,0,CX+RTOP+36,0);
    sag.addColorStop(0,'rgba(244,240,230,0.17)');
    sag.addColorStop(0.35,'rgba(244,240,230,0.035)');
    sag.addColorStop(0.72,'rgba(244,240,230,0.05)');
    sag.addColorStop(1,'rgba(244,240,230,0.2)');
    ctx.fillStyle=sag; ctx.fill();
    ctx.strokeStyle='rgba(244,240,230,0.34)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.ellipse(CX,BASE+9,RTOP+36,25,0,Math.PI*0.16,Math.PI*0.72); ctx.stroke();
    ctx.strokeStyle='rgba(244,240,230,0.18)'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.ellipse(CX,BASE+7,RBOT+22,15,0,0,6.2832); ctx.stroke();
    ctx.restore();

    /* caustic pooled on the saucer */
    var cg=ctx.createRadialGradient(CX,BASE+12,2,CX,BASE+12,112);
    cg.addColorStop(0,'rgba(240,182,97,'+(0.46*conc).toFixed(3)+')');
    cg.addColorStop(0.5,'rgba(217,138,43,'+(0.15*conc).toFixed(3)+')');
    cg.addColorStop(1,'rgba(217,138,43,0)');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.ellipse(CX,BASE+12,112,22,0,0,6.2832); ctx.fill();

    /* handle, behind the bowl */
    ctx.save();
    ctx.lineCap='round';
    ctx.strokeStyle='rgba(244,240,230,0.2)'; ctx.lineWidth=13;
    ctx.beginPath();
    ctx.moveTo(CX+RTOP-12,RIM+30);
    ctx.bezierCurveTo(CX+RTOP+44,RIM+34,CX+RTOP+40,BASE-40,CX+RBOT+6,BASE-24);
    ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2.2;
    ctx.beginPath();
    ctx.moveTo(CX+RTOP-10,RIM+25);
    ctx.bezierCurveTo(CX+RTOP+39,RIM+30,CX+RTOP+35,BASE-44,CX+RBOT+6,BASE-30);
    ctx.stroke();
    ctx.restore();

    /* --- liquid --- */
    ctx.save();
    interior(ctx); ctx.clip();

    var ct=mixc(WATER_T,TEA_T,conc), cb=mixc(WATER_B,TEA_B,conc);
    var la=lp(0.16,0.97,conc);
    var lg=ctx.createLinearGradient(0,level,0,IBOT);
    lg.addColorStop(0,rgba(ct,la*0.86));
    lg.addColorStop(0.55,rgba(mixc(ct,cb,0.5),la));
    lg.addColorStop(1,rgba(cb,Math.min(1,la*1.05)));
    ctx.fillStyle=lg; ctx.fillRect(CX-RTOP-4,level,(RTOP+4)*2,IBOT-level+6);

    /* submerged part of the lollipop: offset and tinted by the liquid */
    ctx.save();
    ctx.beginPath(); ctx.rect(CX-RTOP-6,level,(RTOP+6)*2,IBOT-level+8); ctx.clip();
    ctx.globalAlpha=lp(1,0.6,conc*0.8);
    ctx.translate(2.5,0);
    lolly(ctx,headX,headY,tiltA,headR,melt,false);
    ctx.globalAlpha=1;
    ctx.fillStyle=rgba(cb,la*0.5); ctx.fillRect(CX-RTOP-6,level,(RTOP+6)*2,IBOT-level+8);
    ctx.restore();

    /* melt swirls */
    if(P.length){
      ctx.globalCompositeOperation='lighter';
      for(var i=0;i<P.length;i++){
        var q=P[i], a=q.life*q.life*0.2*(0.3+0.7*conc);
        if(a<=0.01) continue;
        ctx.globalAlpha=a;
        ctx.drawImage(sprite,q.x-q.r,q.y-q.r,q.r*2,q.r*2);
      }
      ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
    }

    /* edge absorption: more liquid to look through at the sides */
    var eg=ctx.createLinearGradient(CX-RTOP,0,CX+RTOP,0);
    eg.addColorStop(0,'rgba(10,6,2,'+(0.5*la).toFixed(3)+')');
    eg.addColorStop(0.2,'rgba(10,6,2,0)');
    eg.addColorStop(0.8,'rgba(10,6,2,0)');
    eg.addColorStop(1,'rgba(10,6,2,'+(0.5*la).toFixed(3)+')');
    ctx.fillStyle=eg; ctx.fillRect(CX-RTOP,level,RTOP*2,IBOT-level+6);
    ctx.restore();

    /* --- surface --- */
    var hl=halfAt(level), ry=RY*(hl/ITR);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(CX,level,hl,ry,0,0,6.2832);
    var sg=ctx.createLinearGradient(0,level-ry,0,level+ry);
    sg.addColorStop(0,rgba(mixc(ct,[255,255,255],0.3),Math.min(1,la*0.9)));
    sg.addColorStop(1,rgba(mixc(ct,cb,0.6),Math.min(1,la)));
    ctx.fillStyle=sg; ctx.fill();
    /* bright meniscus at the far edge */
    ctx.strokeStyle='rgba(255,236,206,'+(0.1+0.3*conc).toFixed(3)+')';
    ctx.lineWidth=1.6; ctx.beginPath();
    ctx.ellipse(CX,level,hl-1,ry-0.6,0,Math.PI*1.08,Math.PI*1.92); ctx.stroke();
    ctx.restore();

    /* smiley surfacing once the tea is made */
    var fo=Math.min(seg(p,.84,.90),1-seg(p,.95,1.0));
    if(fo>0.02){
      ctx.save(); ctx.globalAlpha=fo*0.5;
      ctx.translate(CX,level); ctx.scale(1,ry/hl*2.0);
      ctx.fillStyle='rgba(58,22,4,1)'; ctx.strokeStyle='rgba(58,22,4,1)';
      ctx.lineWidth=4.4; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(-20,-8,3.6,0,6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(20,-8,3.6,0,6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(0,-2,25,0.6,Math.PI-0.6); ctx.stroke();
      ctx.restore();
    }

    /* --- glass body over the liquid --- */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(CX-RTOP,RIM);
    ctx.bezierCurveTo(CX-RTOP+1,RIM+56,CX-RBOT-20,BASE-28,CX-RBOT,BASE-10);
    ctx.quadraticCurveTo(CX-RBOT,BASE,CX-RBOT+12,BASE);
    ctx.lineTo(CX+RBOT-12,BASE);
    ctx.quadraticCurveTo(CX+RBOT,BASE,CX+RBOT,BASE-10);
    ctx.bezierCurveTo(CX+RBOT+20,BASE-28,CX+RTOP-1,RIM+56,CX+RTOP,RIM);
    ctx.closePath();
    var wg=ctx.createLinearGradient(CX-RTOP,0,CX+RTOP,0);
    wg.addColorStop(0,'rgba(244,240,230,0.22)');
    wg.addColorStop(0.12,'rgba(244,240,230,0.05)');
    wg.addColorStop(0.3,'rgba(244,240,230,0.015)');
    wg.addColorStop(0.72,'rgba(244,240,230,0.03)');
    wg.addColorStop(0.9,'rgba(244,240,230,0.11)');
    wg.addColorStop(1,'rgba(244,240,230,0.26)');
    ctx.fillStyle=wg; ctx.fill();
    ctx.strokeStyle='rgba(244,240,230,0.26)'; ctx.lineWidth=1.3; ctx.stroke();
    ctx.restore();

    /* specular down the left of the bowl */
    ctx.save();
    var spg=ctx.createLinearGradient(0,RIM+20,0,BASE-20);
    spg.addColorStop(0,'rgba(255,255,255,0)');
    spg.addColorStop(0.2,'rgba(255,255,255,0.30)');
    spg.addColorStop(0.78,'rgba(255,255,255,0.1)');
    spg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.strokeStyle=spg; ctx.lineWidth=5; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(CX-RTOP+16,RIM+24);
    ctx.quadraticCurveTo(CX-RTOP+20,BASE-56,CX-RBOT+14,BASE-18);
    ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.lineWidth=2.4;
    ctx.beginPath();
    ctx.moveTo(CX+RTOP-13,RIM+30);
    ctx.quadraticCurveTo(CX+RTOP-16,BASE-58,CX+RBOT-12,BASE-22);
    ctx.stroke();
    ctx.restore();

    /* rim: the defining line of a wide cup, so it carries the brightest highlight */
    ctx.strokeStyle='rgba(244,240,230,0.5)'; ctx.lineWidth=2.6;
    ctx.beginPath(); ctx.ellipse(CX,RIM,RTOP,RY,0,0,6.2832); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=2.6;
    ctx.beginPath(); ctx.ellipse(CX,RIM,RTOP,RY,0,Math.PI*1.1,Math.PI*1.66); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.ellipse(CX,RIM,RTOP,RY,0,Math.PI*0.2,Math.PI*0.62); ctx.stroke();

    /* foot */
    ctx.strokeStyle='rgba(255,241,220,'+(0.26+0.4*conc).toFixed(3)+')'; ctx.lineWidth=2.6;
    ctx.beginPath(); ctx.ellipse(CX,BASE-3,RBOT-6,9,0,0.2,Math.PI-0.2); ctx.stroke();

    /* lollipop above the water line */
    ctx.save();
    ctx.beginPath(); ctx.rect(0,0,SW,level); ctx.clip();
    lolly(ctx,headX,headY,tiltA,headR,melt,true);
    ctx.restore();

    /* steam */
    var st=0.2+0.8*conc;
    ctx.save();
    ctx.strokeStyle='rgba(244,240,230,'+(0.17*st).toFixed(3)+')';
    ctx.lineWidth=2.4; ctx.lineCap='round';
    for(var w=0;w<3;w++){
      var ph=reduce?0:t*0.55+w*2.1, rise=(ph%1), bx=CX-36+w*36;
      ctx.globalAlpha=Math.sin(rise*Math.PI)*0.9;
      var by=level-16-rise*46;
      ctx.beginPath(); ctx.moveTo(bx,by);
      ctx.bezierCurveTo(bx-11,by-16,bx+11,by-26,bx-3,by-44);
      ctx.stroke();
    }
    ctx.restore();

    /* captions + rail */
    for(var k=0;k<caps.length;k++){
      var el=caps[k], a0=+el.dataset.in, b0=+el.dataset.out;
      /* the first caption is already on screen at rest, so it never fades in */
      var fin=a0<=0?1:seg(p,a0,a0+.05);
      var o=Math.min(fin,1-seg(p,b0-.05,b0));
      el.style.opacity=o.toFixed(2);
      el.style.transform='translateY('+((1-o)*16).toFixed(1)+'px)';
      el.style.pointerEvents=o>.5?'auto':'none';
    }
    cue.style.opacity=(1-seg(p,.01,.06)).toFixed(2);
    rail.style.width=(p*100).toFixed(2)+'%';

    requestAnimationFrame(draw);
  }

  addEventListener('scroll',measure,{passive:true});
  addEventListener('resize',function(){resize();measure();});
  resize(); measure(); requestAnimationFrame(draw);

  /* Le formulaire d'email a été retiré de la landing : on commande
     directement. Le garde reste pour qu'une page qui le remettrait
     continue de marcher. */
  var mail = document.getElementById('f');
  if (mail) mail.addEventListener('submit', function (e) {
    e.preventDefault();
    if (document.getElementById('email').value.indexOf('@') > 0) {
      document.getElementById('ok').hidden = false; this.reset();
    }
  });
})();
