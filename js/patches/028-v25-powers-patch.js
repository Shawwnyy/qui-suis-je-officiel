/* Extrait de l'ancien index.html : <script id="v25-powers-patch"> */
(function V25Powers(){
"use strict";
const V25={
bonus:{
v25cash:{emoji:"💰",name:"Prime immédiate",desc:"+400 points immédiatement"},
v25combo:{emoji:"🔥",name:"Combo renforcé",desc:"+2 niveaux de combo immédiatement"},
v25armor:{emoji:"🛡️",name:"Double bouclier",desc:"bloque les 2 prochains malus"},
v25time:{emoji:"⏱️",name:"Temps bonus",desc:"+6 secondes pendant 2 questions"},
v25precision:{emoji:"🎯",name:"Précision",desc:"+25 % de points pendant 2 questions"},
v25comeback:{emoji:"🚀",name:"Remontée",desc:"+600 points si tu n'es pas premier, sinon +300"}
},
malus:{
v25hit:{emoji:"💥",name:"Pénalité",desc:"retire 300 points à la cible"},
v25reset:{emoji:"🧊",name:"Combo gelé",desc:"remet le combo de la cible à zéro"},
v25slow:{emoji:"🐌",name:"Chrono réduit",desc:"-5 secondes pendant 2 questions"},
v25fog:{emoji:"🌫️",name:"Brouillard",desc:"-30 % de gains pendant 2 questions"},
v25silence:{emoji:"🔕",name:"Silence",desc:"aucun nouveau pouvoir pendant 2 questions"},
v25steal:{emoji:"🦝",name:"Vol de points",desc:"vole jusqu'à 200 points à la cible"}
}
};
Object.entries(V25.bonus).forEach(([id,d])=>{EXT_POWERS[id]={type:"bonus",r:1,emoji:d.emoji,name:d.name,desc:d.desc,q:id==="v25time"||id==="v25precision"?2:0};if(!POWER_KINDS.bonus.includes(id))POWER_KINDS.bonus.push(id);if(!EXT_IDS.bonus.includes(id))EXT_IDS.bonus.push(id);});
Object.entries(V25.malus).forEach(([id,d])=>{EXT_POWERS[id]={type:"malus",r:1,emoji:d.emoji,name:d.name,desc:d.desc,q:["v25slow","v25fog","v25silence"].includes(id)?2:0};if(!POWER_KINDS.malus.includes(id))POWER_KINDS.malus.push(id);if(!EXT_IDS.malus.includes(id))EXT_IDS.malus.push(id);});
["v25time","v25precision"].forEach(id=>{if(!POS_FX.includes(id))POS_FX.push(id);});
["v25slow","v25fog","v25silence"].forEach(id=>{if(!NEG_FX.includes(id))NEG_FX.push(id);});
function toast(text,bad){let t=document.getElementById("v25PowerToast");if(!t){t=document.createElement("div");t.id="v25PowerToast";document.body.appendChild(t);}t.className="show "+(bad?"v25-bad":"v25-good");t.textContent=text;clearTimeout(window.__v25Toast);window.__v25Toast=setTimeout(()=>t.className="",4200);}
const applyBase=applyExtPower;
applyExtPower=function(player,target,id,level){
if(id==="v25cash"){player.score=(player.score||0)+400;player.bonusPoints=(player.bonusPoints||0)+400;return{id,label:"💰 Prime immédiate",blocked:false,msgSelf:"💰 Prime immédiate : +400 points !",msgTarget:""};}
if(id==="v25combo"){player.combo=(player.combo||0)+2;player.bestCombo=Math.max(player.bestCombo||0,player.combo);player.powerGrantedCombo=player.combo;return{id,label:"🔥 Combo renforcé",blocked:false,msgSelf:"🔥 Combo renforcé : +2 combo !",msgTarget:""};}
if(id==="v25armor"){fxOf(player).armure={left:4,hits:2};return{id,label:"🛡️ Double bouclier",blocked:false,msgSelf:"🛡️ Double bouclier activé : 2 malus seront bloqués !",msgTarget:""};}
if(id==="v25time"){fxOf(player).v25time={left:2};return{id,label:"⏱️ Temps bonus",blocked:false,msgSelf:"⏱️ +6 secondes pendant 2 questions !",msgTarget:""};}
if(id==="v25precision"){fxOf(player).v25precision={left:2};return{id,label:"🎯 Précision",blocked:false,msgSelf:"🎯 +25 % de points pendant 2 questions !",msgTarget:""};}
if(id==="v25comeback"){const leader=Math.max(...Object.values(players).map(p=>Number(p.score||0)));const amount=(player.score||0)<leader?600:300;player.score+=amount;player.bonusPoints=(player.bonusPoints||0)+amount;return{id,label:"🚀 Remontée",blocked:false,msgSelf:"🚀 Remontée : +"+amount+" points !",msgTarget:""};}
if(target&&target.shield){target.shield=false;return{id,label:(V25.malus[id]?.emoji||"💥")+" "+(V25.malus[id]?.name||"Malus"),blocked:true,msgSelf:"🛡️ "+target.name+" a bloqué ton malus !",msgTarget:"🛡️ Ton bouclier a bloqué le malus de "+player.name+" !"};}
if(id==="v25hit"&&target){const amount=Math.min(300,target.score||0);target.score-=amount;target.malusPoints=(target.malusPoints||0)+amount;target.malusesReceived=(target.malusesReceived||0)+1;return{id,label:"💥 Pénalité",blocked:false,msgSelf:"💥 "+target.name+" perd "+amount+" points !",msgTarget:"💥 Pénalité reçue : -"+amount+" points !"};}
if(id==="v25reset"&&target){target.combo=0;target.powerGrantedCombo=0;target.malusesReceived=(target.malusesReceived||0)+1;return{id,label:"🧊 Combo gelé",blocked:false,msgSelf:"🧊 Le combo de "+target.name+" est remis à zéro !",msgTarget:"🧊 Ton combo a été remis à zéro par "+player.name+" !"};}
if(id==="v25slow"&&target){fxOf(target).v25slow={left:2};target.malusesReceived=(target.malusesReceived||0)+1;return{id,label:"🐌 Chrono réduit",blocked:false,msgSelf:"🐌 "+target.name+" perd 5 secondes pendant 2 questions !",msgTarget:"🐌 Ton chrono est réduit de 5 secondes pendant 2 questions !"};}
if(id==="v25fog"&&target){fxOf(target).v25fog={left:2};target.malusesReceived=(target.malusesReceived||0)+1;return{id,label:"🌫️ Brouillard",blocked:false,msgSelf:"🌫️ Les gains de "+target.name+" sont réduits de 30 % pendant 2 questions !",msgTarget:"🌫️ Tes gains sont réduits de 30 % pendant 2 questions !"};}
if(id==="v25silence"&&target){fxOf(target).v25silence={left:2};target.malusesReceived=(target.malusesReceived||0)+1;return{id,label:"🔕 Silence",blocked:false,msgSelf:"🔕 "+target.name+" ne peut plus obtenir de pouvoir pendant 2 questions !",msgTarget:"🔕 Tu ne peux plus obtenir de pouvoir pendant 2 questions !"};}
if(id==="v25steal"&&target){const amount=Math.min(200,target.score||0);target.score-=amount;player.score=(player.score||0)+amount;target.malusPoints=(target.malusPoints||0)+amount;target.malusesReceived=(target.malusesReceived||0)+1;player.bonusPoints=(player.bonusPoints||0)+amount;return{id,label:"🦝 Vol de points",blocked:false,msgSelf:"🦝 Tu voles "+amount+" points à "+target.name+" !",msgTarget:"🦝 "+player.name+" t'a volé "+amount+" points !"};}
return applyBase(player,target,id,level);
};
const timeBase=fxTimeDelta;fxTimeDelta=function(p){let d=timeBase(p);if(fxOn(p,"v25time"))d+=6;if(fxOn(p,"v25slow"))d-=5;return Math.max(5,questionTime+d)-questionTime;};
const scoreBase=applyScoreFx;applyScoreFx=function(p,pts,data){let g=scoreBase(p,pts,data);if(fxOn(p,"v25precision"))g=Math.round(g*1.25);if(fxOn(p,"v25fog"))g=Math.round(g*.70);return g;};
const eligibleBase25=powerEligible;powerEligible=function(p){return !fxOn(p,"v25silence")&&eligibleBase25(p);};
fillPowerSelects=function(level){
const a=powerAmounts(level),bs=document.getElementById("bonusType"),ms=document.getElementById("malusType");if(!bs||!ms)return;
bs.innerHTML='<option value="xp">💰 Points immédiats : +'+a.bonus+'</option><option value="shield">🛡️ Bouclier : bloque le prochain malus</option><option value="double">✨ Prochaine bonne réponse ×2</option>';
Object.entries(V25.bonus).forEach(([id,d])=>{const o=document.createElement("option");o.value=id;o.textContent=d.emoji+" "+d.name+" — "+d.desc;bs.appendChild(o);});
ms.innerHTML='<option value="xp">💥 Retirer '+a.malus+' points</option><option value="freeze">🧊 Remettre le combo à zéro</option><option value="steal">🦝 Voler '+a.steal+' points</option>';
Object.entries(V25.malus).forEach(([id,d])=>{const o=document.createElement("option");o.value=id;o.textContent=d.emoji+" "+d.name+" — "+d.desc;ms.appendChild(o);});
document.getElementById("bonusDescription").textContent="Choisis un bonus garanti et immédiatement appliqué.";document.getElementById("malusDescription").textContent="Choisis un malus fonctionnel puis un adversaire.";
};
const resultBase25=showExtResult;showExtResult=function(data){resultBase25(data);if(data?.ext){if(data.playerId===myId)toast(data.ext.msgSelf,false);else if(data.targetId===myId)toast(data.ext.msgTarget,!data.ext.blocked);}};
function note(){const host=document.getElementById("hostSettings");if(!host||document.getElementById("v25PowerNote"))return;const n=document.createElement("div");n.id="v25PowerNote";n.className="v25-power-note";n.innerHTML="<strong>🎁💥 V25 : bonus et malus corrigés</strong><br>6 nouveaux bonus et 6 nouveaux malus ont été ajoutés. Les listes sont fixes, lisibles et chaque effet est appliqué par l’hôte puis synchronisé à tous les joueurs. L’anti-triche V24 reste actif.";host.appendChild(n);}
const screenBase25=showScreen;showScreen=function(id){const r=screenBase25(id);setTimeout(note,0);return r;};setTimeout(note,60);setInterval(note,1600);
document.title="Qui suis-je ? 🎮 — V25 bonus et malus corrigés";console.log("V25 : 12 nouveaux pouvoirs fonctionnels, listes stabilisées et synchronisation hôte.");
})();
