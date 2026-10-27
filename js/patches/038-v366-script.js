/* Extrait de l'ancien index.html : <script id="v366-script"> */
/* V36.6 — Fin de partie : défilement libre (plus de retour en haut tout seul) + actions regroupées. */
(function V366(){
 "use strict";
 const $=id=>document.getElementById(id);
 const onResults=()=>{const r=$("resultsScreen");return !!(r&&r.classList.contains("active"));};
 /* ---------- 1) Défilement : rien ne remonte sans action de l'utilisateur (page de fin ET fenêtre d'avis) ---------- */
 const modalOpen=()=>{const m=$("v11RatingModal");return !!(m&&m.classList.contains("show"));};
 const active=()=>onResults()||modalOpen();
 let gestureAt=0,holding=false,chainAt=0;
 const markGesture=()=>{gestureAt=Date.now();chainAt=gestureAt;};
 ["wheel","touchstart","touchmove","keydown"].forEach(ev=>window.addEventListener(ev,markGesture,{capture:true,passive:true}));
 ["pointerdown","mousedown"].forEach(ev=>window.addEventListener(ev,()=>{holding=true;markGesture();},{capture:true,passive:true}));
 ["pointerup","mouseup","touchend","touchcancel","blur"].forEach(ev=>window.addEventListener(ev,()=>{holding=false;markGesture();},{capture:true,passive:true}));
 const recent=()=>holding||Date.now()-gestureAt<900;
 /* Position voulue par l'utilisateur, par zone qui défile (la page, la fenêtre d'avis…) */
 const wanted=new Map();
 const keyOf=t=>(t===document||t===document.documentElement||t===document.body||t===window)?"win":t;
 const getTop=k=>k==="win"?window.scrollY:k.scrollTop;
 const nativeScrollTo=window.scrollTo.bind(window);
 const setTop=(k,y)=>{if(k==="win"){try{nativeScrollTo({top:y,behavior:"instant"});}catch(e){nativeScrollTo(0,y);}}else{const sb=k.style.scrollBehavior;k.style.scrollBehavior="auto";k.scrollTop=y;k.style.scrollBehavior=sb;}};
 let fixRaf=0;
 function onScroll(e){
  if(!active())return;
  const k=keyOf(e.target);if(k!=="win"&&!(k instanceof Element))return;
  const y=getTop(k),now=Date.now();
  /* Défilement de l'utilisateur, y compris l'inertie qui suit son geste (événements continus). */
  if(recent()||now-chainAt<160){chainAt=now;wanted.set(k,y);return;}
  const w=wanted.get(k);
  if(w!=null&&y<w-40){cancelAnimationFrame(fixRaf);fixRaf=requestAnimationFrame(()=>{if(!recent())setTop(k,w);});}
  else wanted.set(k,y);
 }
 document.addEventListener("scroll",onScroll,{capture:true,passive:true});
 window.addEventListener("scroll",onScroll,{passive:true});
 /* Contenu re-rendu (page raccourcie un instant) : on revient dès que possible. */
 setInterval(()=>{
  if(!active()||recent())return;
  wanted.forEach((w,k)=>{if(k!=="win"&&!k.isConnected){wanted.delete(k);return;}const y=getTop(k);if(y<w-40){const max=k==="win"?document.documentElement.scrollHeight-window.innerHeight:k.scrollHeight-k.clientHeight;if(max>y+20)setTop(k,Math.min(w,max));}});
 },200);
 /* Appels automatiques qui font remonter : ignorés tant que l'utilisateur n'a rien demandé. */
 function guardScrollTo(orig){
  return function(a,b){
   if(active()&&!recent()&&wanted.has("win")){
    const top=typeof a==="object"&&a?(a.top!=null?a.top:window.scrollY):(b!=null?b:window.scrollY);
    if(top<window.scrollY-40)return;
   }
   return orig.apply(window,arguments);
  };
 }
 window.scrollTo=guardScrollTo(window.scrollTo);window.scroll=guardScrollTo(window.scroll);
 const nativeFocus=HTMLElement.prototype.focus;
 HTMLElement.prototype.focus=function(opts){if(active()&&!recent())return nativeFocus.call(this,Object.assign({},opts||{},{preventScroll:true}));return nativeFocus.apply(this,arguments);};
 const nativeSIV=Element.prototype.scrollIntoView;
 Element.prototype.scrollIntoView=function(){if(active()&&!recent()&&wanted.size)return;return nativeSIV.apply(this,arguments);};
 function resetScrollState(){wanted.clear();}

 /* ---------- 2) Un seul bloc d'actions ---------- */
 function dl(){try{if(typeof downloadLastReportV9==="function")return downloadLastReportV9();if(typeof exportSessionsPDF==="function")return exportSessionsPDF([window.__savedKey]);}catch(e){console.warn(e);}}
 function call(name,fallback){return()=>{try{if(typeof window[name]==="function")return window[name]();}catch(e){console.warn(e);}if(fallback)fallback();};}
 function ensureNav(){
  const card=document.querySelector("#resultsScreen .card");if(!card)return;
  let nav=$("v366EndNav");
  if(!nav){
   nav=document.createElement("div");nav.id="v366EndNav";
   const mk=(txt,cls,fn)=>{const b=document.createElement("button");b.type="button";b.className="btn "+cls;b.textContent=txt;b.addEventListener("click",fn);return b;};
   nav.append(
    mk("🔄 Rejouer","btn-green",call("replayV9")),
    mk("🆕 Nouvelle partie","btn-secondary",call("newGameV9")),
    mk("🏠 Accueil","btn-secondary v366-home",()=>{try{backToHome();}catch(e){try{showScreen("homeScreen");}catch(x){}}}),
    mk("📄 Télécharger le rapport","btn-primary v366-dl",dl)
   );
  }
  const after=$("v9FinalBox")||$("finalScores");
  if(after&&after.parentNode===card){if(after.nextElementSibling!==nav)card.insertBefore(nav,after.nextSibling);}
  else if(nav.parentNode!==card)card.appendChild(nav);
  /* « Accueil » seul pour un invité si l'hôte seul peut relancer. */
  const replay=nav.firstElementChild;if(replay)replay.hidden=!isHost&&typeof window.replayV9!=="function";
 }
 const prevSR=showResults;
 showResults=function(){const first=!onResults();if(first)resetScrollState();const r=prevSR.apply(this,arguments);setTimeout(ensureNav,60);setTimeout(ensureNav,600);return r;};
 setInterval(()=>{if(onResults())ensureNav();},1200);
 const prevShow=showScreen;showScreen=function(id){if(id!=="resultsScreen")resetScrollState();return prevShow.apply(this,arguments);};
 /* ---------- 3) Rapport : résultat de CHAQUE joueur pour chaque question ---------- */
 let prevCounts={};
 const prevSQR=showQuestionResult;
 showQuestionResult=function(data){
  const r=prevSQR.apply(this,arguments);
  try{
   const log=window.__log||[];const entry=log[log.length-1];
   if(log.length<=1)prevCounts={};
   const list=Object.values((data&&data.players)||players||{});
   if(entry&&list.length&&!entry.all){
    entry.all=list.map(p=>{const b=prevCounts[p.id]||{c:0,w:0};const c=Number(p.correct||0),w=Number(p.wrong||0);
     const res=c>b.c?"correct":w>b.w?"incorrect":"sans reponse";return String(p.name||"Joueur").slice(0,20)+" : "+res;}).join(" | ");
    entry.players=list.map(p=>({id:p.id,name:p.name}));
   }
   list.forEach(p=>{prevCounts[p.id]={c:Number(p.correct||0),w:Number(p.wrong||0)};});
  }catch(e){}
  return r;
 };
 console.log("V36.6 : défilement libre en fin de partie + un seul bouton de téléchargement.");
})();

