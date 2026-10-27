/* Extrait de l'ancien index.html : <script id="v11-patch"> */
(function V11(){
"use strict";
window.v11Variant=window.v11Variant||"classic";
window.v11Ratings=window.v11Ratings||{};
const VARIANTS={
classic:{icon:"🎮",name:"Classique amélioré",desc:"Les règles habituelles avec toutes les options choisies par l’hôte."},
blitz:{icon:"⚡",name:"Blitz",desc:"10 secondes par question, rythme rapide et décisions immédiates."},
marathon:{icon:"🏃",name:"Marathon",desc:"Partie longue avec le plus grand nombre de questions disponible."},
chaos:{icon:"🎲",name:"Chaos total",desc:"Thèmes aléatoires, questions en or et événements activés."},
pure:{icon:"🧠",name:"Connaissance pure",desc:"Aucun pouvoir, aucun événement aléatoire, uniquement les réponses."},
oneTheme:{icon:"🎯",name:"Défi mono-thème",desc:"Un seul thème choisi au hasard pour toute la partie."}
};
function addVariantUI(){
const host=document.getElementById("hostContent");if(!host||document.getElementById("v11Variants"))return;
const box=document.createElement("div");box.id="v11Variants";box.className="v11-feature-box";box.innerHTML='<h3>✨ Expériences de jeu V11</h3><div class="subtitle">L’hôte choisit une variante qui configure automatiquement la partie.</div><div class="v11-mode-grid">'+Object.entries(VARIANTS).map(([k,v])=>'<button type="button" class="v11-mode" data-v11="'+k+'"><b>'+v.icon+' '+v.name+'</b><span>'+v.desc+'</span></button>').join("")+'</div><div class="v11-badge">Configuration contrôlée par l’hôte</div>';
const mode=document.getElementById("v9ModeBox");host.insertBefore(box,mode?mode.nextSibling:host.firstChild);box.querySelectorAll("[data-v11]").forEach(b=>b.onclick=()=>selectVariant(b.dataset.v11,true));selectVariant(window.v11Variant,false);
}
function setChecked(id,on){const e=document.getElementById(id);if(e)e.checked=on;}
function selectVariant(kind,announce){
if(!VARIANTS[kind])kind="classic";window.v11Variant=kind;document.querySelectorAll("[data-v11]").forEach(b=>b.classList.toggle("selected",b.dataset.v11===kind));
const time=document.getElementById("timeSelect"),round=document.getElementById("roundsSelect")||document.getElementById("questionCount");
if(kind==="blitz"&&time)time.value="10";
if(kind==="marathon"&&round){const values=[...round.options].map(o=>+o.value).filter(Number.isFinite);if(values.length)round.value=String(Math.max(...values));}
if(kind==="pure"){["optGolden","optEvents","optStreak","optImpossible"].forEach(id=>setChecked(id,false));}
if(kind==="chaos"){["optGolden","optEvents","optStreak","optImpossible"].forEach(id=>setChecked(id,true));if(typeof randomThemes==="function")randomThemes();}
if(kind==="oneTheme"){const boxes=[...document.querySelectorAll("#themeGrid input")];boxes.forEach(b=>b.checked=false);if(boxes.length)boxes[Math.floor(Math.random()*boxes.length)].checked=true;if(typeof updateSelectedThemes==="function")updateSelectedThemes();}
try{localStorage.setItem("quizV11Variant",kind);}catch(e){}
if(announce&&isHost){broadcast({type:"v11Variant",variant:kind});if(typeof showBanner==="function")showBanner(VARIANTS[kind].icon+" Variante : "+VARIANTS[kind].name);}
}
window.selectVariantV11=selectVariant;
function ratingModal(){
let m=document.getElementById("v11RatingModal");if(m)return m;m=document.createElement("div");m.id="v11RatingModal";m.className="modal";m.innerHTML='<div class="modal-box"><div class="modal-icon">⭐</div><h2>Votre avis sur cette partie</h2><p class="subtitle">Notez chaque aspect de 1 à 5 étoiles. Votre avis reste associé à cette session.</p><div id="v11RatingRows"></div><label for="v11Comment"><b>Commentaire facultatif</b></label><textarea id="v11Comment" class="input" maxlength="300" rows="3" placeholder="Questions trop faciles, thème préféré, suggestion…" style="resize:vertical;margin-top:7px"></textarea><div class="v11-rating-actions"><button class="btn btn-secondary" type="button" onclick="skipRatingV11()">Plus tard</button><button class="btn btn-primary" type="button" onclick="submitRatingV11()">Envoyer mon avis</button></div></div>';document.body.appendChild(m);return m;
}
const criteria=[['questions','Qualité des questions'],['difficulty','Équilibre de la difficulté'],['variety','Variété des thèmes'],['fun','Plaisir de jeu'],['overall','Note globale']];
function openRating(){
if(window.v11RatingShown)return;window.v11RatingShown=true;const m=ratingModal(),rows=document.getElementById("v11RatingRows");window.v11Draft={};rows.innerHTML=criteria.map(([key,label])=>'<div class="v11-rating-row"><b>'+label+'</b><div class="v11-stars" data-key="'+key+'">'+[1,2,3,4,5].map(n=>'<button type="button" class="v11-star" data-n="'+n+'" aria-label="'+n+' étoile'+(n>1?'s':'')+'">★</button>').join('')+'</div></div>').join('');
rows.querySelectorAll('.v11-star').forEach(star=>star.onclick=()=>{const group=star.parentElement,n=+star.dataset.n,key=group.dataset.key;window.v11Draft[key]=n;group.querySelectorAll('.v11-star').forEach(x=>x.classList.toggle('on',+x.dataset.n<=n));});m.classList.add("show");
}
window.skipRatingV11=()=>document.getElementById("v11RatingModal")?.classList.remove("show");
window.submitRatingV11=function(){
const d=window.v11Draft||{};if(criteria.some(([k])=>!d[k])){if(typeof showBanner==="function")showBanner("⭐ Merci de noter les 5 critères.");return;}
const review={...d,comment:String(document.getElementById("v11Comment")?.value||"").trim(),playerId:myId,name:myName,variant:window.v11Variant,at:new Date().toISOString()};
try{const all=JSON.parse(localStorage.getItem("quizV11Reviews")||"[]");all.push(review);localStorage.setItem("quizV11Reviews",JSON.stringify(all.slice(-100)));}catch(e){}
window.v11Ratings[myId]=review;if(isHost){broadcast({type:"v11RatingAck",playerId:myId});renderRatingSummary();}else{const c=Object.values(connections).find(x=>x&&x.open);if(c)c.send({type:"v11Rating",review});}
document.getElementById("v11RatingModal")?.classList.remove("show");if(typeof showBanner==="function")showBanner("⭐ Merci, votre avis a été enregistré !");
};
function renderRatingSummary(){
if(!isHost)return;const card=document.querySelector("#resultsScreen .card");if(!card)return;let box=document.getElementById("v11ReviewSummary");if(!box){box=document.createElement("div");box.id="v11ReviewSummary";box.className="v11-review-summary";card.appendChild(box);}const reviews=Object.values(window.v11Ratings);if(!reviews.length){box.innerHTML='<b>⭐ Avis de la partie</b><div class="subtitle">En attente des évaluations…</div>';return;}const avg=k=>(reviews.reduce((s,r)=>s+(+r[k]||0),0)/reviews.length).toFixed(1);box.innerHTML='<b>⭐ Avis de la partie · '+reviews.length+' réponse(s)</b><div style="margin-top:7px">Questions '+avg('questions')+'/5 · Difficulté '+avg('difficulty')+'/5 · Variété '+avg('variety')+'/5 · Plaisir '+avg('fun')+'/5 · <strong>Global '+avg('overall')+'/5</strong></div>';
}
const oldHandle11=handleData;handleData=function(data){
if(data?.type==="v11Variant"){window.v11Variant=data.variant||"classic";selectVariant(window.v11Variant,false);return;}
if(data?.type==="v11Rating"&&isHost&&data.review){window.v11Ratings[data.review.playerId]=data.review;renderRatingSummary();return;}
return oldHandle11(data);
};
const oldResults11=showResults;showResults=function(data){const r=oldResults11(data);setTimeout(()=>{window.v11RatingShown=false;renderRatingSummary();openRating();},700);return r;};
const oldStart11=startGame;startGame=function(){window.v11Ratings={};window.v11RatingShown=false;if(window.v11Variant==="chaos"&&typeof randomThemes==="function")randomThemes();return oldStart11();};
function boot(){addVariantUI();try{if(window.v11Variant==="classic"){const v=localStorage.getItem("quizV11Variant");if(v&&VARIANTS[v])window.v11Variant=v;}}catch(e){}document.title="Qui suis-je ? 🎮 — V17";}
const oldScreen11=showScreen;showScreen=function(id){const r=oldScreen11(id);setTimeout(boot,0);return r;};setInterval(boot,1200);setTimeout(boot,0);
console.log("V11 terminée : 6 expériences de jeu et évaluations 5 étoiles en fin de partie.");
})();
