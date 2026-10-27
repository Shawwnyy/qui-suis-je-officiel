/* Extrait de l'ancien index.html : <script id="v14-patch"> */
(function V14(){
"use strict";
/* Démarrage sécurisé : un seul minuteur, un seul callback et nettoyage de toutes les anciennes couches. */
let launchToken=0,launchTimer=null,launchDone=false;
function overlay(){let o=document.getElementById("v14LaunchSafe");if(!o){o=document.createElement("div");o.id="v14LaunchSafe";o.innerHTML='<div class="v14-launch-label">🎮 LA PARTIE COMMENCE DANS</div><div id="v14Count" class="v14-count">5</div><div class="v14-launch-sub">Prépare-toi, la première question arrive.</div>';document.body.appendChild(o);}return o;}
function cleanOldLaunch(){["__startCdT","__redT","__v12ColorT"].forEach(k=>{clearInterval(window[k]);window[k]=null;});document.getElementById("startCountdown")?.remove();document.getElementById("v9LaunchTransition")?.remove();}
showStartCountdown=function(seconds,onDone){
cleanOldLaunch();clearInterval(launchTimer);const token=++launchToken;launchDone=false;const o=overlay(),n=document.getElementById("v14Count");let left=Math.max(1,Number(seconds)||5);o.classList.add("show");
const paint=()=>{n.textContent=left;n.style.color=left>=4?"#22c55e":left===3?"#facc15":left===2?"#f97316":"#ef4444";n.classList.remove("pop");void n.offsetWidth;n.classList.add("pop");};paint();
launchTimer=setInterval(()=>{if(token!==launchToken){clearInterval(launchTimer);return;}left--;if(left>0){paint();return;}clearInterval(launchTimer);o.classList.remove("show");cleanOldLaunch();if(launchDone)return;launchDone=true;try{if(typeof onDone==="function")onDone();}catch(err){console.error("V14 lancement",err);window.v9LaunchLock=false;gameStarted=false;const b=document.getElementById("startButton");if(b)b.disabled=false;showScreen("lobbyScreen");showBanner("⚠️ Le lancement a été réinitialisé. Vous pouvez réessayer.");}},1000);
};
/* Anti double-clic et restauration automatique si le lancement reste bloqué. */
const req14=requestStartGame;requestStartGame=function(){if(window.__v14Starting)return;window.__v14Starting=true;const b=document.getElementById("startButton");if(b)b.disabled=true;try{return req14();}finally{setTimeout(()=>{if(!gameStarted){window.__v14Starting=false;window.v9LaunchLock=false;if(b)b.disabled=false;}},9000);}};
const send14=sendNextQuestion;sendNextQuestion=function(first=false){const r=send14(first);if(first){window.__v14Starting=false;const b=document.getElementById("startButton");if(b)b.disabled=false;}return r;};
const reset14=resetConnection;resetConnection=function(){launchToken++;clearInterval(launchTimer);overlay().classList.remove("show");window.__v14Starting=false;window.v9LaunchLock=false;return reset14();};
/* 12 pouvoirs supplémentaires, équilibrés et compatibles avec les effets existants. */
Object.assign(EXT_POWERS,{
banque:{type:"bonus",r:1,emoji:"🏦",name:"Banque express",desc:"gagne immédiatement 10 % de ton score (max 1 000 pts)",q:0},
cascade:{type:"bonus",r:1,emoji:"🌊",name:"Cascade",desc:"+250 pts par bonne réponse pendant 2 questions",q:2},
concentration:{type:"bonus",r:1,emoji:"🧘",name:"Concentration",desc:"ton chrono ne peut pas descendre sous 15 s pendant 2 questions",q:2},
renaissance:{type:"bonus",r:2,emoji:"🔥",name:"Renaissance",desc:"la prochaine erreur conserve ton combo et annule sa pénalité",q:3},
acceleration:{type:"bonus",r:1,emoji:"⚡",name:"Accélération",desc:"+40 % de points si tu réponds en moins de 6 s pendant 2 questions",q:2},
couronne:{type:"bonus",r:2,emoji:"👑",name:"Couronne",desc:"+500 pts et +2 combo immédiatement",q:0},
drainage:{type:"malus",r:1,emoji:"🕳️",name:"Drainage",desc:"la cible perd immédiatement 10 % de son score (max 1 000 pts)",q:0},
ancre:{type:"malus",r:1,emoji:"⚓",name:"Ancre",desc:"le combo de la cible ne peut pas augmenter pendant 2 questions",q:2},
fuite:{type:"malus",r:1,emoji:"💧",name:"Fuite",desc:"chaque erreur coûte 250 pts supplémentaires pendant 3 questions",q:3},
silence:{type:"malus",r:2,emoji:"🔕",name:"Silence",desc:"la cible ne peut pas obtenir de nouveau pouvoir pendant 2 questions",q:2},
brouillard:{type:"malus",r:1,emoji:"🌫️",name:"Brouillard",desc:"-35 % de points sur les bonnes réponses pendant 2 questions",q:2},
saboteur:{type:"malus",r:2,emoji:"🧨",name:"Saboteur",desc:"retire 2 combo et 350 pts immédiatement",q:0}
});
["banque","cascade","concentration","renaissance","acceleration","couronne"].forEach(x=>{if(!POWER_KINDS.bonus.includes(x))POWER_KINDS.bonus.push(x);});
["drainage","ancre","fuite","silence","brouillard","saboteur"].forEach(x=>{if(!POWER_KINDS.malus.includes(x))POWER_KINDS.malus.push(x);});
EXT_IDS.bonus=Object.keys(EXT_POWERS).filter(k=>EXT_POWERS[k].type==="bonus");EXT_IDS.malus=Object.keys(EXT_POWERS).filter(k=>EXT_POWERS[k].type==="malus");
["cascade","concentration","renaissance","acceleration"].forEach(x=>{if(!POS_FX.includes(x))POS_FX.push(x);});["ancre","fuite","silence","brouillard"].forEach(x=>{if(!NEG_FX.includes(x))NEG_FX.push(x);});
const ext14=applyExtPower;applyExtPower=function(player,target,id,level){
if(id==="banque"){const amount=Math.min(1000,Math.round((player.score||0)*.10));player.score+=amount;player.bonusPoints=(player.bonusPoints||0)+amount;return{id,label:"🏦 Banque express",blocked:false,msgSelf:"🏦 Banque express : +"+amount+" points !",msgTarget:""};}
if(id==="couronne"){player.score+=500;player.bonusPoints=(player.bonusPoints||0)+500;player.combo=(player.combo||0)+2;player.bestCombo=Math.max(player.bestCombo||0,player.combo);player.powerGrantedCombo=player.combo;return{id,label:"👑 Couronne",blocked:false,msgSelf:"👑 Couronne : +500 points et +2 combo !",msgTarget:""};}
if(id==="drainage"&&target){if(target.shield)return ext14(player,target,id,level);const amount=Math.min(1000,Math.round((target.score||0)*.10));target.score=Math.max(0,target.score-amount);target.malusPoints=(target.malusPoints||0)+amount;return{id,label:"🕳️ Drainage",blocked:false,msgSelf:"🕳️ "+target.name+" perd "+amount+" points.",msgTarget:"🕳️ Drainage : -"+amount+" points."};}
if(id==="saboteur"&&target){if(target.shield)return ext14(player,target,id,level);target.score=Math.max(0,(target.score||0)-350);target.combo=Math.max(0,(target.combo||0)-2);target.powerGrantedCombo=0;target.malusPoints=(target.malusPoints||0)+350;return{id,label:"🧨 Saboteur",blocked:false,msgSelf:"🧨 "+target.name+" perd 350 points et 2 combo.",msgTarget:"🧨 Saboteur : -350 points et -2 combo."};}
return ext14(player,target,id,level);
};
const combo14=nextComboValue;nextComboValue=function(p){if(fxOn(p,"ancre")){p.lastCorrect=true;return p.combo||0;}return combo14(p);};
const score14=applyScoreFx;applyScoreFx=function(p,pts,data){let g=score14(p,pts,data);const elapsed=fxTotalTime(p)-(data.time||0);if(fxOn(p,"cascade"))g+=250;if(fxOn(p,"acceleration")&&elapsed<6)g=Math.round(g*1.4);if(fxOn(p,"brouillard"))g=Math.round(g*.65);return g;};
const wrong14=onWrongFx;onWrongFx=function(p){if(fxOn(p,"renaissance")){delete fxOf(p).renaissance;p.lastCorrect=false;return;}wrong14(p);if(fxOn(p,"fuite")){p.score=Math.max(0,(p.score||0)-250);p.malusPoints=(p.malusPoints||0)+250;}};
const elig14=powerEligible;powerEligible=function(p){return !fxOn(p,"silence")&&elig14(p);};
const time14=fxTimeDelta;fxTimeDelta=function(p){let d=time14(p);if(fxOn(p,"concentration"))d=Math.max(d,15-questionTime);return Math.max(5,questionTime+d)-questionTime;};
function addNote(){const host=document.getElementById("hostSettings");if(!host||document.getElementById("v14PowerNote"))return;const n=document.createElement("div");n.id="v14PowerNote";n.className="v14-power-note";n.innerHTML="<b>✨ V14 : 12 nouveaux pouvoirs</b><br>Banque express, Cascade, Concentration, Renaissance, Accélération, Couronne, Drainage, Ancre, Fuite, Silence, Brouillard et Saboteur.";host.appendChild(n);}
const screen14=showScreen;showScreen=function(id){const r=screen14(id);setTimeout(addNote,0);return r;};setInterval(addNote,1200);addNote();
document.title="Qui suis-je ? 🎮 — V17";console.log("V14 chargée : lancement sécurisé et 12 nouveaux bonus/malus.");
})();
