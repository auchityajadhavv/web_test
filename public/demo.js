
/* ======================================================================
   CONFIG — edit these two lines per venue
   ====================================================================== */
const BUSINESS_NAME = "";  // e.g. "Lumière Bistro". Leave "" for a name-free review.

/* ====================================================================== */

const TIERS=['Poor','Fair','Good','Great','Exceptional'];
const tierOf=v=>TIERS[Math.min(4,Math.floor(Math.max(0,v)*5))];
const METRICS=[['Food Quality','food',0.72],['Service','service',0.58],['Ambience','ambience',0.86]];
const STATE={food:0.72,service:0.58,ambience:0.86};
let DRAGGING=false;

/* build cards */
const cardsEl=document.getElementById('cards');
METRICS.forEach(([label,key,v],i)=>{
  const c=document.createElement('div');
  c.className='card anim'; c.style.animationDelay=(0.20+i*0.09)+'s';
  c.style.setProperty('--bz',[12,24,16][i]); c.dataset.baseZ=[12,24,16][i];
  c.style.transform=`translateZ(${[12,24,16][i]}px)`;
  c.innerHTML=`
    <div class="c-top"><span class="c-name">${label}</span>
      <span class="c-tier"><span class="word">${tierOf(v)}</span></span></div>
    <div class="slider" tabindex="0" role="slider" aria-label="${label}" aria-valuemin="0" aria-valuemax="4"
         aria-valuenow="${Math.floor(v*5)}" aria-valuetext="${tierOf(v)}" style="--v:${v}" data-key="${key}">
      <div class="rail"><div class="fill"></div></div><div class="orb"></div>
    </div>`;
  cardsEl.appendChild(c); initSlider(c,key,v);
});

/* ---------- BULLETPROOF SLIDER (pointer + touch, document-level drag) ---------- */
function initSlider(card,key,initial){
  const slider=card.querySelector('.slider');
  const rail=slider.querySelector('.rail');
  const tierEl=card.querySelector('.c-tier'), wordEl=card.querySelector('.word');
  let v=initial,last=tierOf(v);

  const apply=nv=>{
    v=Math.max(0,Math.min(1,nv));
    STATE[key]=v; slider.style.setProperty('--v',v);
    const t=tierOf(v);
    slider.setAttribute('aria-valuenow',Math.min(4,Math.floor(v*5)));
    slider.setAttribute('aria-valuetext',t);
    if(t!==last){last=t;wordEl.textContent=t;tierEl.classList.remove('change');void tierEl.offsetWidth;tierEl.classList.add('change');}
  };
  const fromX=clientX=>{const r=rail.getBoundingClientRect();return (clientX-r.left)/r.width;};

  let active=false;
  const start=clientX=>{active=true;DRAGGING=true;slider.classList.add('drag');card.classList.add('active');apply(fromX(clientX));fadeHint();};
  const move =clientX=>{if(active)apply(fromX(clientX));};
  const stop =()=>{if(!active)return;active=false;DRAGGING=false;slider.classList.remove('drag');card.classList.remove('active');};

  /* Pointer events (covers mouse + most touch) */
  slider.addEventListener('pointerdown',e=>{e.preventDefault();
    try{slider.setPointerCapture(e.pointerId);}catch(_){}
    start(e.clientX);
  });
  slider.addEventListener('pointermove',e=>{ if(active){e.preventDefault(); move(e.clientX);} });
  slider.addEventListener('pointerup',stop);
  slider.addEventListener('pointercancel',stop);
  slider.addEventListener('lostpointercapture',stop);

  /* Touch fallback (older iOS/Safari where pointer events misbehave) */
  slider.addEventListener('touchstart',e=>{ if(e.cancelable)e.preventDefault(); start(e.touches[0].clientX); },{passive:false});
  slider.addEventListener('touchmove', e=>{ if(active){ if(e.cancelable)e.preventDefault(); move(e.touches[0].clientX);} },{passive:false});
  slider.addEventListener('touchend',stop);
  slider.addEventListener('touchcancel',stop);

  /* Keyboard */
  slider.addEventListener('keydown',e=>{const st=e.shiftKey?.12:.04;
    if(['ArrowRight','ArrowUp'].includes(e.key)){apply(v+st);e.preventDefault();}
    if(['ArrowLeft','ArrowDown'].includes(e.key)){apply(v-st);e.preventDefault();}
    if(e.key==='Home'){apply(0);e.preventDefault();} if(e.key==='End'){apply(1);e.preventDefault();}});
}

/* ---------------- REVIEW WRITER (on-device, no API) ---------------- */
const pick=a=>a[(Math.random()*a.length)|0];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function band(v){return v>=0.8?'high':v>=0.55?'mid':'low';}

const OPENERS={
  high:["Had a genuinely lovely time","Really enjoyed the whole experience","A brilliant visit from start to finish","Left with a smile"],
  mid :["Had a pleasant time","A decent experience overall","Enjoyed my visit on the whole"],
  low :["Mixed feelings after this visit","It was an okay experience","A few things to note from my visit"],
};
const CLAUSE={
  food:{high:["the food was excellent","the dishes were full of flavour","the quality of the food really stood out","every plate was spot on"],
        mid:["the food was enjoyable","the food was solid","the food did the job nicely"],
        low:["the food was a little underwhelming","the food didn’t quite land for me","the food could be better"]},
  service:{high:["the service was warm and attentive","the team looked after us beautifully","service was friendly and on point","staff couldn’t have been kinder"],
           mid:["the service was fine","the team were pleasant enough","service was reasonable"],
           low:["service was a bit slow","service could have been sharper","we felt a little overlooked"]},
  ambience:{high:["the atmosphere was gorgeous","the space felt relaxed and stylish","loved the ambience","the setting really made the evening"],
            mid:["the setting was pleasant","nice enough atmosphere","the space was comfortable"],
            low:["the ambience felt a little flat","the space lacked a bit of atmosphere","the setting didn’t do much for me"]},
};
const CLOSER={
  high:["Would happily come back.","Highly recommend.","Will definitely return.","Can’t wait to visit again."],
  mid :["Would come again.","Worth a visit.","I’d return."],
  low :["Hope it sharpens up — might give it another go.","Would consider a return if things improve.","Room to grow here."],
};

function writeReview(){
  const f=STATE.food, s=STATE.service, a=STATE.ambience;
  const overall=(f+s+a)/3, ob=band(overall);
  const notes=(document.getElementById('notes').value||"").trim();

  // order categories strongest-first so it reads well
  const cats=[["food",f],["service",s],["ambience",a]].sort((x,y)=>y[1]-x[1]);
  const c1=pick(CLAUSE[cats[0][0]][band(cats[0][1])]);
  const c2=pick(CLAUSE[cats[1][0]][band(cats[1][1])]);
  const c3=pick(CLAUSE[cats[2][0]][band(cats[2][1])]);

  let opener=pick(OPENERS[ob]);
  if(BUSINESS_NAME) opener += ` at ${BUSINESS_NAME}`;

  let out = `${opener}. ${cap(c1)}, and ${c2}. ${cap(c3)} too.`;
  if(notes){
    const clean=notes.replace(/[.\s]+$/,'');
    out += ` ${band(overall)==='low'?'One thing':'Worth mentioning'} — ${clean}.`;
  }
  out += ` ${pick(CLOSER[ob])}`;
  return out;
}

/* ---------------- STEP FLOW ---------------- */
const step1=document.getElementById('step1'), step2=document.getElementById('step2');
const chips=document.getElementById('chips'), reviewText=document.getElementById('reviewText');
const rtitle=document.getElementById('rtitle'), rsub=document.getElementById('rsub'), rhint=document.getElementById('rhint');
const post=document.getElementById('post'), skip=document.getElementById('skip');

function showStep2(){
  // chips reflect the words they chose
  chips.innerHTML=METRICS.map(([label,key])=>`<div class="chip">${label} · <b>${tierOf(STATE[key])}</b></div>`).join('');
  reviewText.value=writeReview();
  requestAnimationFrame(()=>autofit(reviewText,118,260));
  const low=((STATE.food+STATE.service+STATE.ambience)/3)<0.55;
  // gently adapt tone if the visit scored low (reputation-friendly)
  if(low){
    rtitle.innerHTML="Thanks for the<br>honesty";
    rsub.textContent="Your notes go straight to the team. You can still post publicly if you’d like.";
    post.textContent="Post to Google anyway";
    skip.textContent="Send privately instead";
  }else{
    rtitle.innerHTML="One tap from<br>the world seeing it";
    rsub.textContent="We turned your visit into a review. Make it yours, then post.";
    post.textContent="Copy example review";
    skip.textContent="No thanks, just send feedback";
  }
  step1.hidden=true; step2.hidden=false;
  step2.querySelectorAll('.title,.chips,.review,.hintline,.cta').forEach((el,i)=>{
    el.classList.remove('anim'); void el.offsetWidth; el.style.animationDelay=(0.05+i*0.07)+'s'; el.classList.add('anim');
  });
  document.querySelector('.ui').scrollTo({top:0,behavior:'instant'in window?'instant':'auto'});
}
function showStep1(){ step2.hidden=true; step1.hidden=false; }

/* grow textareas to fit content — never show a native scrollbar */
function autofit(ta,min,max){ta.style.height='auto';ta.style.height=Math.min(max,Math.max(min,ta.scrollHeight))+'px';}
const notesTA=document.getElementById('notes');
notesTA.addEventListener('input',()=>autofit(notesTA,44,120));
reviewText.addEventListener('input',()=>autofit(reviewText,118,260));
requestAnimationFrame(()=>autofit(notesTA,44,120));

document.getElementById('continue').addEventListener('click',showStep2);
document.getElementById('back').addEventListener('click',showStep1);
document.getElementById('regen').addEventListener('click',()=>{ reviewText.value=writeReview(); autofit(reviewText,118,260); });

post.addEventListener('click',async()=>{
  const text=reviewText.value;
  let copied=false;
  try{ await navigator.clipboard.writeText(text); copied=true; }
  catch(_){ try{ reviewText.select(); document.execCommand('copy'); copied=true; }catch(__){} }
  post.textContent = copied ? "Example copied — nothing posted" : "Copy unavailable";

  setTimeout(()=>{post.textContent="Copy example review";},2600);
});
skip.addEventListener('click',()=>{
  skip.textContent="Example complete — nothing sent";
  skip.disabled=true; skip.style.opacity=.6;
  // In production: POST STATE + notes to your private feedback endpoint here.
});

/* ---------------- parallax (pointer + gyro), frozen while dragging ---------------- */
const panel=document.getElementById('panel'), stage=document.querySelector('.stage');
let tnx=0,tny=0,nx=0,ny=0,hintGone=false,HOLD=false;
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
function fadeHint(){if(hintGone)return;hintGone=true;const h=document.getElementById('hint');if(h)h.style.opacity=0;}
stage.addEventListener('pointermove',e=>{if(DRAGGING||HOLD)return;const r=stage.getBoundingClientRect();
  tnx=((e.clientX-r.left)/r.width-.5)*2; tny=((e.clientY-r.top)/r.height-.5)*2;},{passive:true});
stage.addEventListener('pointerleave',()=>{tnx=0;tny=0;});
function onTilt(e){if(DRAGGING||HOLD)return;const g=e.gamma||0,b=e.beta||0;
  tnx=Math.max(-1,Math.min(1,g/26)); tny=Math.max(-1,Math.min(1,(b-45)/26)); fadeHint();}
function enableMotion(){
  if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission){
    DeviceOrientationEvent.requestPermission().then(s=>{if(s==='granted')addEventListener('deviceorientation',onTilt);}).catch(()=>{});
  } else if('DeviceOrientationEvent' in window){ addEventListener('deviceorientation',onTilt); }
}
addEventListener('touchend',enableMotion,{once:true});
addEventListener('pointerdown',()=>{HOLD=true;},true);
addEventListener('pointerup',()=>{HOLD=false;},true);
addEventListener('pointercancel',()=>{HOLD=false;},true);

const cardsArr=()=>[...document.querySelectorAll('#step1 .card')];

/* ---------------- WebGL monolith ---------------- */
let renderer,scene,camera,grp,glow,motes,clock;
function glowTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'#fff');gr.addColorStop(.25,'rgba(255,255,255,.7)');
  gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);
  const t=new THREE.Texture(c);t.needsUpdate=true;return t;}
function initGL(){
  const canvas=document.getElementById('gl');
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x050409,0.03);
  camera=new THREE.PerspectiveCamera(56,1,.1,120);camera.position.set(0,0,15);
  const TEX=glowTex();
  const geo=new THREE.BoxGeometry(3.3,9,3.3);
  const slab=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x0a0813}));
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({color:0x9a7fd6,transparent:true,opacity:.55,blending:THREE.AdditiveBlending}));
  grp=new THREE.Group();grp.add(slab);grp.add(edge);grp.position.set(0,0,-11);scene.add(grp);
  glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX,color:0x7c3aed,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
  glow.scale.set(20,26,1);glow.position.set(4.5,0,-14);scene.add(glow);
  const back=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX,color:0x2a1d52,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
  back.scale.set(46,46,1);back.position.set(-2,2,-20);scene.add(back);
  const N=44,pos=new Float32Array(N*3),col=new Float32Array(N*3),pal=[[.6,.5,.85],[.7,.62,.92],[1,1,1]];
  for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*26;pos[i*3+1]=(Math.random()-.5)*34;pos[i*3+2]=-Math.random()*22+3;
    const c=pal[(Math.random()*pal.length)|0];col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];}
  const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  mg.setAttribute('color',new THREE.BufferAttribute(col,3));
  motes=new THREE.Points(mg,new THREE.PointsMaterial({size:1.2,map:TEX,transparent:true,depthWrite:false,
    blending:THREE.AdditiveBlending,vertexColors:true,opacity:.85,sizeAttenuation:true}));scene.add(motes);
  clock=new THREE.Clock();
  const rs=()=>{const b=canvas.getBoundingClientRect();renderer.setSize(b.width,b.height,false);
    camera.aspect=b.width/b.height;camera.updateProjectionMatrix();};
  new ResizeObserver(rs).observe(canvas);rs();loop();
}
function loop(){requestAnimationFrame(loop);const t=clock.getElapsedTime();
  if(!(DRAGGING||HOLD)){ nx+=(tnx-nx)*.06; ny+=(tny-ny)*.06; }
  if(!reduce){grp.rotation.y=t*.22;grp.rotation.x=Math.sin(t*.2)*.05;motes.rotation.y=t*.02;glow.material.opacity=.42+Math.sin(t*.8)*.08;}
  camera.position.x+=(nx*2.4-camera.position.x)*.06;
  camera.position.y+=(-ny*1.6-camera.position.y)*.06;
  camera.lookAt(0,0,-6);renderer.render(scene,camera);
  panel.style.setProperty('--ry',(nx*6).toFixed(2)+'deg');
  panel.style.setProperty('--rx',(-ny*5).toFixed(2)+'deg');
  panel.style.setProperty('--tx',(nx*8).toFixed(1)+'px');
  panel.style.setProperty('--ty',(ny*6).toFixed(1)+'px');
  if(!DRAGGING) cardsArr().forEach(c=>{const z=+c.dataset.baseZ,k=z/24;
    c.style.transform=`translateZ(${z}px) translateX(${(nx*6*k).toFixed(1)}px) translateY(${(ny*5*k).toFixed(1)}px)`;});
}
function cssBG(){(function css(){requestAnimationFrame(css);if(!(DRAGGING||HOLD)){nx+=(tnx-nx)*.06;ny+=(tny-ny)*.06;}
  panel.style.setProperty('--ry',(nx*6).toFixed(2)+'deg');panel.style.setProperty('--rx',(-ny*5).toFixed(2)+'deg');
  panel.style.setProperty('--tx',(nx*8).toFixed(1)+'px');panel.style.setProperty('--ty',(ny*6).toFixed(1)+'px');})();}
let __bgStarted=false;
function startBG(){ if(__bgStarted) return; __bgStarted=true; if(window.THREE) initGL(); else cssBG(); }
if(window.THREE) startBG();
else { document.addEventListener('three-ready', startBG, {once:true}); setTimeout(startBG, 1800); }
