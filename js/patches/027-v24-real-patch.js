/* Extrait de l'ancien index.html : <script id="v24-real-patch"> */
(function V24Real(){
"use strict";
let cheatCount=0,hiddenAt=0,antiCheatArmed=false,lastQuestionKey="";
function overlay(){let o=document.getElementById("v24CheatOverlay");if(!o){o=document.createElement("div");o.id="v24CheatOverlay";o.innerHTML='<div class="v24-cheat-title">TU AS TRICHÉ(E) !</div><div class="v24-cheat-sub">Le changement de page a été détecté pendant une question.</div><div id="v24CheatCount" class="v24-cheat-count"></div><button type="button" class="btn btn-danger" style="width:min(330px,90vw);margin-top:24px" onclick="closeCheatV24()">J’ai compris, revenir au jeu</button>';document.body.appendChild(o);}return o;}
window.closeCheatV24=function(){overlay().classList.remove("show");if(document.getElementById("gameScreen")?.classList.contains("active")){document.body.style.overflowY="auto";window.scrollTo({top:0,behavior:"auto"});}};
function reportCheat(){
if(!antiCheatArmed||!gameStarted||answered||!document.getElementById("gameScreen")?.classList.contains("active"))return;
const key=currentQuestionIndex+":"+(currentQuestion?.question||"");if(lastQuestionKey===key)return;lastQuestionKey=key;cheatCount++;
const o=overlay();document.getElementById("v24CheatCount").textContent="Avertissement n°"+cheatCount;o.classList.add("show");
if(isHost){if(players[myId]){players[myId].cheatCount=cheatCount;players[myId].score=Math.max(0,(players[myId].score||0)-250);players[myId].malusPoints=(players[myId].malusPoints||0)+250;}broadcastPlayers();showBanner("🚨 "+(myName||"Un joueur")+" a changé de page : -250 points.");}
else{const c=Object.values(connections).find(x=>x&&x.open);if(c)c.send({type:"v24Cheat",playerId:myId,count:cheatCount});}
}
document.addEventListener("visibilitychange",()=>{if(document.hidden){hiddenAt=Date.now();reportCheat();}else if(hiddenAt&&Date.now()-hiddenAt>350)reportCheat();});
window.addEventListener("blur",()=>{setTimeout(()=>{if(!document.hasFocus())reportCheat();},180);});
const handleBase=handleData;handleData=function(data){if(data?.type==="v24Cheat"&&isHost&&players[data.playerId]){const p=players[data.playerId];p.cheatCount=(p.cheatCount||0)+1;p.score=Math.max(0,(p.score||0)-250);p.malusPoints=(p.malusPoints||0)+250;broadcastPlayers();showBanner("🚨 "+p.name+" a changé de page : -250 points.");return;}return handleBase(data);};
const displayBase=displayQuestion;displayQuestion=function(q,r){const x=displayBase(q,r);lastQuestionKey="";antiCheatArmed=true;return x;};
const resultBase=showQuestionResult;showQuestionResult=function(data){antiCheatArmed=false;return resultBase(data);};
const resetBase=resetConnection;resetConnection=function(){antiCheatArmed=false;cheatCount=0;overlay().classList.remove("show");return resetBase();};
function attackMode(){return window.v9GameMode!=="coop";}
function targets(){const me=players[myId];return Object.values(players).filter(p=>p.id!==myId&&(window.v9GameMode!=="teams"||p.team!==me?.team)&&(window.v9GameMode!=="soloHost"||p.host!==me?.host));}
function forceMalusUI(){
const card=document.querySelector("#powerModal .power-card.malus"),bonus=document.querySelector("#powerModal .power-card.bonus"),select=document.getElementById("malusTarget"),button=document.getElementById("malusButton"),list=targets();
if(card){card.classList.toggle("v24-force-show",attackMode()&&list.length>0);card.style.display=attackMode()&&list.length?"block":"none";}
if(bonus)bonus.style.gridColumn=attackMode()&&list.length?"":"1 / -1";
if(select){select.innerHTML='<option value="">Choisir un adversaire...</option>';list.forEach(p=>{const o=document.createElement("option");o.value=p.id;o.textContent=(p.avatar||"🎮")+" "+p.name+" — "+(p.score||0)+" pts";select.appendChild(o);});if(list.length)select.value=list[0].id;}
if(button){button.disabled=!list.length;button.style.display=list.length?"block":"none";}
const desc=document.getElementById("malusDescription");if(desc)desc.textContent=list.length?"Choisis le malus et l’adversaire à pénaliser.":"Aucun adversaire disponible.";
}
const openBase=openPowerModal;openPowerModal=function(level,token){openBase(level,token);requestAnimationFrame(forceMalusUI);setTimeout(forceMalusUI,60);};
const chooseBase=chooseMalus;chooseMalus=function(){const t=document.getElementById("malusTarget");if(!t?.value&&targets()[0])t.value=targets()[0].id;return chooseBase();};
const eligibleBase=powerEligible;powerEligible=function(p){return eligibleBase(p)||(!p.powerAvailable&&p.combo>=2&&p.combo%2===0&&p.powerGrantedCombo!==p.combo);};
function status(){let b=document.getElementById("v24MalusStatus");if(!b){b=document.createElement("div");b.id="v24MalusStatus";document.body.appendChild(b);}const me=players[myId],fx=me?.fx||{},active=Object.keys(fx).filter(k=>(fx[k]?.left||0)>0&&EXT_POWERS[k]?.type==="malus");b.innerHTML=active.length?"💥 Malus actifs : "+active.map(k=>(EXT_POWERS[k]?.name||k)+" ×"+fx[k].left).join(" · "):"";b.classList.toggle("show",active.length>0);}
function note(){const host=document.getElementById("hostSettings");if(!host||document.getElementById("v24RealNote"))return;const n=document.createElement("div");n.id="v24RealNote";n.className="v24-malus-info";n.innerHTML="<b>💥 Malus V24 activés</b><br>Après 2 bonnes réponses consécutives, le joueur choisit un bonus ou un malus. Les malus sont visibles dans tous les modes sauf Coopération. Un changement d’onglet ou de page pendant une question affiche « TU AS TRICHÉ(E) ! » et retire 250 points.";host.appendChild(n);}
const screenBase=showScreen;showScreen=function(id){const x=screenBase(id);setTimeout(()=>{note();status();document.documentElement.style.overflowY="auto";document.body.style.overflowY="auto";window.scrollTo({top:0,left:0,behavior:"auto"});},0);return x;};
setInterval(()=>{status();if(document.getElementById("powerModal")?.classList.contains("show"))forceMalusUI();},500);setTimeout(()=>{note();status();overlay();},50);
document.title="Qui suis-je ? 🎮 — V24 malus et anti-triche";
console.log("V24 finale : malus forcés visibles et détection de changement de page active.");
})();
