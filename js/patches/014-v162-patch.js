/* Extrait de l'ancien index.html : <script id="v162-patch"> */
(function V162(){
"use strict";
const SPECIAL={
multiplicateur:{type:"bonus",r:2,emoji:"🎡",name:"Roue multiplicatrice",desc:"la roue tire un multiplicateur ×1 à ×9 pour ta prochaine bonne réponse",q:0},
coffrecombo:{type:"bonus",r:1,emoji:"🧰",name:"Coffre à combo",desc:"transforme ton combo actuel en 150 points par niveau de combo",q:0},
chronoRoyal:{type:"bonus",r:1,emoji:"⌚",name:"Chrono royal",desc:"+10 secondes pendant les 2 prochaines questions",q:2},
antisort:{type:"bonus",r:1,emoji:"🧿",name:"Anti-sort",desc:"supprime tous tes malus et ajoute un bouclier",q:0},
volmoitie:{type:"malus",r:2,emoji:"🦹",name:"Braquage ultime",desc:"vole la moitié des points d'un adversaire, une seule fois par partie",q:0},
inversion:{type:"malus",r:1,emoji:"🔄",name:"Inversion",desc:"la prochaine bonne réponse de la cible ne rapporte que 25 % des points",q:2},
cassecombo:{type:"malus",r:1,emoji:"💔",name:"Casse-combo",desc:"retire immédiatement 3 niveaux de combo",q:0},
sabliernoir:{type:"malus",r:1,emoji:"⏳",name:"Sablier noir",desc:"retire 6 secondes pendant les 2 prochaines questions",q:2}
};
Object.assign(EXT_POWERS,SPECIAL);
["multiplicateur","coffrecombo","chronoRoyal","antisort"].forEach(id=>{if(!POWER_KINDS.bonus.includes(id))POWER_KINDS.bonus.push(id);if(!EXT_IDS.bonus.includes(id))EXT_IDS.bonus.push(id);});
["volmoitie","inversion","cassecombo","sabliernoir"].forEach(id=>{if(!POWER_KINDS.malus.includes(id))POWER_KINDS.malus.push(id);if(!EXT_IDS.malus.includes(id))EXT_IDS.malus.push(id);});
["chronoRoyal"].forEach(id=>{if(!POS_FX.includes(id))POS_FX.push(id);});
["inversion","sabliernoir"].forEach(id=>{if(!NEG_FX.includes(id))NEG_FX.push(id);});
const blockedBase=powerBlockedFor;
powerBlockedFor=function(p,id){if(id==="volmoitie")return (p?.used||[]).includes(id);return blockedBase(p,id);};
function wheelOverlay(){let o=document.getElementById("v162WheelOverlay");if(!o){o=document.createElement("div");o.id="v162WheelOverlay";o.innerHTML='<div class="v162-wheel-card"><div class="v162-wheel-title">🎡 Roue du destin</div><div id="v162Wheel" class="v162-wheel"></div><div id="v162WheelResult" class="v162-wheel-result">La roue tourne…</div><div id="v162WheelNote" class="v162-auto-note"></div></div>';document.body.appendChild(o);}return o;}
function showWheel(result,label,note,done){const o=wheelOverlay(),w=document.getElementById("v162Wheel"),r=document.getElementById("v162WheelResult"),n=document.getElementById("v162WheelNote");o.classList.add("show");r.textContent="La roue tourne…";n.textContent=note||"";w.style.transition="none";w.style.transform="rotate(0deg)";void w.offsetWidth;w.style.transition="transform 3.2s cubic-bezier(.12,.78,.14,1)";const turns=5+Math.floor(Math.random()*3),slice=360/9,angle=turns*360+(9-result)*slice+slice/2;w.style.transform="rotate("+angle+"deg)";setTimeout(()=>{r.textContent=label;setTimeout(()=>{o.classList.remove("show");if(done)done();},1700);},3250);}
const extBase=applyExtPower;
applyExtPower=function(player,target,id,level){
if(id==="multiplicateur"){const mult=1+Math.floor(Math.random()*9);player.wheelMultiplier=mult;return{id,label:"🎡 Roue multiplicatrice",blocked:false,wheel:mult,msgSelf:"🎡 La roue a choisi ×"+mult+" pour ta prochaine bonne réponse !",msgTarget:""};}
if(id==="coffrecombo"){const amount=Math.min(1800,(player.combo||0)*150);player.score+=amount;player.bonusPoints=(player.bonusPoints||0)+amount;return{id,label:"🧰 Coffre à combo",blocked:false,msgSelf:"🧰 Ton combo est converti en +"+amount+" points !",msgTarget:""};}
if(id==="antisort"){const fx=fxOf(player);NEG_FX.forEach(k=>delete fx[k]);player.shield=true;return{id,label:"🧿 Anti-sort",blocked:false,msgSelf:"🧿 Tous tes malus sont supprimés et tu obtiens un bouclier !",msgTarget:""};}
if(id==="volmoitie"&&target){if(target.shield){target.shield=false;return{id,label:"🦹 Braquage ultime",blocked:true,msgSelf:"🛡️ "+target.name+" a bloqué ton Braquage ultime !",msgTarget:"🛡️ Ton bouclier a bloqué le Braquage ultime de "+player.name+" !"};}const amount=Math.floor((target.score||0)/2);target.score=Math.max(0,(target.score||0)-amount);player.score=(player.score||0)+amount;target.malusPoints=(target.malusPoints||0)+amount;target.malusesReceived=(target.malusesReceived||0)+1;player.bonusPoints=(player.bonusPoints||0)+amount;return{id,label:"🦹 Braquage ultime",blocked:false,amount,msgSelf:"🦹 Tu voles "+amount+" points à "+target.name+" : la moitié de son score !",msgTarget:"🦹 "+player.name+" t'a volé la moitié de ton score : -"+amount+" points !"};}
if(id==="cassecombo"&&target){if(target.shield){target.shield=false;return{id,label:"💔 Casse-combo",blocked:true,msgSelf:"🛡️ "+target.name+" a bloqué ton Casse-combo !",msgTarget:"🛡️ Ton bouclier a bloqué le Casse-combo de "+player.name+" !"};}target.combo=Math.max(0,(target.combo||0)-3);target.powerGrantedCombo=0;return{id,label:"💔 Casse-combo",blocked:false,msgSelf:"💔 "+target.name+" perd 3 niveaux de combo !",msgTarget:"💔 "+player.name+" t'a retiré 3 niveaux de combo !"};}
return extBase(player,target,id,level);
};
const scoreBase=applyScoreFx;
applyScoreFx=function(p,pts,data){let g=scoreBase(p,pts,data);if(p.wheelMultiplier){g=Math.round(g*p.wheelMultiplier);p.lastWheelMultiplier=p.wheelMultiplier;p.wheelMultiplier=0;}if(fxOn(p,"inversion")){g=Math.round(g*.25);delete fxOf(p).inversion;}return g;};
const timeBase=fxTimeDelta;
fxTimeDelta=function(p){let d=timeBase(p);if(fxOn(p,"chronoRoyal"))d+=10;if(fxOn(p,"sabliernoir"))d-=6;return Math.max(5,questionTime+d)-questionTime;};
const cleanBase=cleanPlayers;
cleanPlayers=function(){const out=cleanBase();Object.keys(out).forEach(id=>{const p=players[id];out[id].wheelMultiplier=p?.wheelMultiplier||0;out[id].lastWheelMultiplier=p?.lastWheelMultiplier||0;});return out;};
const resultBase=showExtResult;
showExtResult=function(data){if(data?.ext?.id==="multiplicateur"&&data.playerId===myId){if(!isHost)players=data.players||players;updateMyScore();showWheel(data.ext.wheel,"Multiplicateur ×"+data.ext.wheel,"Il sera appliqué à ta prochaine bonne réponse.",()=>showPowerPanel(data.ext.msgSelf,"#fde68a"));return;}return resultBase(data);};
function availableKinds(type,player){return POWER_KINDS[type].filter(id=>!powerBlockedFor(player,id));}
function autoPowerChoiceV162(){if(!powerOpen)return;const modal=document.getElementById("powerModal"),level=Number(modal.dataset.level),token=modal.dataset.token,me=players[myId]||{};let choice=Math.random()<.5?"bonus":"malus";const targets=Object.values(players).filter(p=>p.id!==myId);if(choice==="malus"&&!targets.length)choice="bonus";const kinds=availableKinds(choice,me);const kind=kinds[Math.floor(Math.random()*kinds.length)]||"xp";const target=choice==="malus"?targets[Math.floor(Math.random()*targets.length)]:null;closePowerModal();sendPowerChoice(choice,target?.id||null,level,token,kind);showWheel(1+Math.floor(Math.random()*9),choice==="bonus"?"🎁 BONUS ALÉATOIRE : "+(SPECIAL[kind]?.name||kind):"💥 MALUS ALÉATOIRE : "+(SPECIAL[kind]?.name||kind),"Aucun choix effectué : la roue a sélectionné le pouvoir et la cible automatiquement.");}
window.autoPowerChoiceV162=autoPowerChoiceV162;
startPowerCountdown=function(){clearInterval(powerTimer);let left=20;const element=document.getElementById("powerCountdownValue"),circle=document.getElementById("powerCountdown");element.textContent=left;circle.style.background='conic-gradient(#facc15 100%,rgba(255,255,255,.1) 0)';powerTimer=setInterval(()=>{left--;element.textContent=Math.max(0,left);const percent=Math.max(0,left/20*100);circle.style.background='conic-gradient('+(left<=5?'var(--red)':'#facc15')+' '+percent+'%,rgba(255,255,255,.1) 0)';if(left<=3)tone(700,.06,"square",.05);if(left<=0){clearInterval(powerTimer);autoPowerChoiceV162();}},1000);};
function updatePowerInfo(){const info=document.querySelector("#powerModal .power-info");if(info)info.innerHTML='⏱️ Tu as <strong>20 secondes</strong>. Sans décision, une <strong>roue automatique</strong> choisit d’abord Bonus ou Malus, puis le pouvoir précis et une cible aléatoire.';const host=document.getElementById("hostSettings");if(host&&!document.getElementById("v162SpecialNote")){const n=document.createElement("div");n.id="v162SpecialNote";n.className="v162-special-note";n.innerHTML='<b>🎡 V16.2 : roue et pouvoirs spéciaux</b><br>Roue multiplicatrice ×1 à ×9, Braquage ultime utilisable une seule fois par partie, 6 nouveaux pouvoirs supplémentaires et choix automatique à la fin des 20 secondes.';host.appendChild(n);}}
const openBase=openPowerModal;openPowerModal=function(level,token){openBase(level,token);updatePowerInfo();};
const createBase=createPlayer;createPlayer=function(id,name,host=false){const p=createBase(id,name,host);p.wheelMultiplier=0;p.lastWheelMultiplier=0;return p;};
const startBase=startGame;startGame=function(){Object.values(players).forEach(p=>{p.wheelMultiplier=0;p.lastWheelMultiplier=0;if(p.used)p.used=p.used.filter(x=>x!=="volmoitie");});return startBase();};
function boot(){updatePowerInfo();document.title="Qui suis-je ? 🎮 — V17";}
const screenBase=showScreen;showScreen=function(id){const r=screenBase(id);setTimeout(boot,0);return r;};setInterval(boot,1200);setTimeout(boot,0);
console.log("V16.2 : roue automatique, multiplicateur ×1 à ×9, braquage ultime et nouveaux bonus/malus.");
})();
