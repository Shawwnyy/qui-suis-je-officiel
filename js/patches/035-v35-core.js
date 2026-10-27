/* Extrait de l'ancien index.html : <script id="v35-core"> */
(function V35Core(){
"use strict";
const $=id=>document.getElementById(id);
const T={EVENT:5600,GAP:900,NEXT:3600,CHOOSE:20};
const at=n=>"@"+String(n==null||n===""?"Joueur":n);
const S={flow:0,turn:null,advancedFor:-1,timers:new Set(),seq:0,mine:null,sel:null,locked:false,sentToken:null,ui:{ev:null,wait:null,next:null}};
/* ---------- Outils ---------- */
function toast(msg){try{if(typeof window.v34Toast==="function")return window.v34Toast(msg);}catch(e){}try{showBanner(msg);}catch(e){}}
function later(fn,ms){const flow=S.flow;const t=setTimeout(()=>{S.timers.delete(t);if(flow!==S.flow)return;try{fn();}catch(err){console.error("V35 flux",err);}},ms);S.timers.add(t);return t;}
function clearAll(){S.timers.forEach(clearTimeout);S.timers.clear();}
function reEsc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function hl(text,names){
let t=String(text||"");
[...new Set(names.filter(Boolean))].sort((a,b)=>b.length-a.length).forEach(n=>{
try{t=t.replace(new RegExp("(^|[^@\\p{L}\\p{N}_])("+reEsc(n)+")(?![\\p{L}\\p{N}_])","gu"),(m,a,b)=>a+"@"+b);}catch(e){}
});
return t;
}
function modeTargets(ownerId){
const owner=players[ownerId];
return Object.values(players).filter(p=>{
if(!p||p.id===ownerId)return false;
const mode=window.v9GameMode||"individual";
if(mode==="coop")return false;
if(mode==="teams"&&owner&&p.team&&p.team===owner.team)return false;
if(mode==="soloHost"&&owner&&p.host===owner.host)return false;
return true;
});
}
/* ---------- Overlays (tous les joueurs) ---------- */
function ensureUI(){
if(!$("v35Wait")){
const w=document.createElement("div");w.id="v35Wait";w.setAttribute("role","status");w.setAttribute("aria-live","polite");
w.innerHTML='<div class="v35-card"><div class="v35-avatar" id="v35WAvatar">🎮</div><div class="v35-wait-title"><span class="v35-who" id="v35WName">@Joueur</span> choisit un bonus ou un malus</div><div class="v35-wait-note">La partie reprend dès que le choix est fait. Patiente quelques secondes.</div><div class="v35-ring" id="v35WRing"><span id="v35WSec">20</span></div></div>';
document.body.appendChild(w);
}
if(!$("v35Event")){
const e=document.createElement("div");e.id="v35Event";e.setAttribute("role","status");e.setAttribute("aria-live","assertive");
e.innerHTML='<div class="v35-card" id="v35ECard"><div class="v35-confetti" id="v35EConf"></div><div class="v35-ev-emoji" id="v35EEmoji">🎁</div><div class="v35-ev-title" id="v35ETitle"></div><div class="v35-ev-detail" id="v35EDetail"></div><div class="v35-ev-effect" id="v35EEffect"></div><div class="v35-ev-bar"><i id="v35EBar"></i></div><div class="v35-ev-close">Touche pour fermer</div></div>';
document.body.appendChild(e);
e.querySelector(".v35-card").addEventListener("click",()=>hideEvent());
}
if(!$("v35Next")){const n=document.createElement("div");n.id="v35Next";n.setAttribute("role","status");document.body.appendChild(n);}
}
function hideWait(){ensureUI();$("v35Wait").classList.remove("show");clearInterval(S.ui.wait);S.ui.wait=null;}
function showWait(d){
ensureUI();
if(!d||d.playerId===myId){hideWait();return;}
$("v35WAvatar").textContent=d.avatar||"🎮";$("v35WName").textContent=at(d.name);
let left=Number(d.seconds)||T.CHOOSE;const ring=$("v35WRing"),sec=$("v35WSec");
const paint=()=>{sec.textContent=Math.max(0,left);ring.style.setProperty("--p",Math.max(0,left/(Number(d.seconds)||T.CHOOSE)*100)+"%");};
paint();clearInterval(S.ui.wait);S.ui.wait=setInterval(()=>{left--;paint();if(left<=0)clearInterval(S.ui.wait);},1000);
$("v35Wait").classList.add("show");
}
function handleWait(d){if(d&&d.active)showWait(d);else hideWait();}
function hideEvent(){ensureUI();$("v35Event").classList.remove("show","bonus","malus","victim","neutral");clearTimeout(S.ui.ev);S.ui.ev=null;}
function hideNext(){ensureUI();$("v35Next").classList.remove("show");clearInterval(S.ui.next);S.ui.next=null;}
function hideTransient(){hideWait();hideEvent();hideNext();}
function showNext(ms,last){
ensureUI();hideNext();let left=Math.max(1,Math.round((Number(ms)||T.NEXT)/1000));const el=$("v35Next");
const paint=()=>{el.textContent=(last?"🏁 Classement final dans ":"⏭️ Question suivante dans ")+left+" s";};
paint();el.classList.add("show");S.ui.next=setInterval(()=>{left--;if(left<=0){hideNext();return;}paint();},1000);
}
/* ---------- Description d'un pouvoir (hôte) ---------- */
function describe(c){
const {choice,kind,amount,blocked,ext,p,t}=c;const A=at(p.name),B=t?at(t.name):"";
const out={label:"",selfText:"",targetText:"",pubText:"",blocked:!!blocked,reflected:!!(ext&&ext.reflected)};
if(ext){
out.label=ext.label||"Pouvoir";
out.selfText=hl(ext.msgSelf,[p.name,t&&t.name]);
out.targetText=hl(ext.msgTarget,[p.name,t&&t.name]);
}else if(choice==="bonus"){
const m={xp:["💰 +"+amount+" points","Tu gagnes +"+amount+" points !"],shield:["🛡️ Bouclier","Ton prochain malus sera annulé."],double:["✨ Points ×2","Ta prochaine bonne réponse vaut ×2."],jackpot:["💎 Jackpot +"+amount,"Tu empoches +"+amount+" points !"],triple:["🚀 Points ×3","Ta prochaine bonne réponse vaut ×3."]}[kind]||["🎁 Bonus","Bonus appliqué."];
out.label=m[0];out.selfText=m[1];
}else if(blocked){
out.label="🛡️ Malus bloqué";out.selfText="🛡️ "+B+" a bloqué ton malus.";out.targetText="🛡️ Ton bouclier a bloqué le malus de "+A+".";
}else{
const m={
xp:["💥 Pénalité −"+amount,B+" perd "+amount+" points.","Tu perds "+amount+" points."],
freeze:["🧊 Gel du combo",B+" perd son combo.","Ton combo est remis à zéro."],
steal:["🦝 Vol de points","Tu voles "+amount+" points à "+B+".",A+" te vole "+amount+" points."],
crush:["💣 Impact −"+amount,B+" perd "+amount+" points.","Tu perds "+amount+" points."],
halve:["📉 Moitié du score",B+" perd la moitié de son score (−"+amount+").","Tu perds la moitié de ton score (−"+amount+")."]
}[kind]||["💥 Malus","Malus appliqué.","Malus reçu."];
out.label=m[0];out.selfText=m[1];out.targetText=m[2];
}
if(choice==="bonus"){out.pubText=A+" : "+out.label+".";}
else if(out.blocked&&!out.reflected){out.pubText=B+" a bloqué le malus de "+A+".";}
else if(out.reflected){out.pubText=B+" a renvoyé le malus de "+A+" (Miroir).";}
else{out.pubText=A+" a lancé « "+out.label+" » sur "+B+".";}
return out;
}
/* ---------- Affichage d'un évènement (tous les joueurs) ---------- */
function onEvent(ev){
if(!ev)return;
if(!isHost&&ev.players)players=ev.players;
try{updateMyScore();}catch(e){}try{updateFxBar();}catch(e){}
ensureUI();hideWait();hideEvent();
const me=ev.giverId===myId,victim=ev.choice==="malus"&&ev.targetId===myId&&ev.giverId!==myId;
const A=at(ev.giverName),B=at(ev.targetName);
let emoji,title,detail,cls;
if(ev.choice==="bonus"){
cls="bonus";emoji="🎁";
if(me){title="Bonus pour toi, "+A;detail=ev.selfText;}else{title="Bonus pour "+A;detail=ev.pubText;}
}else if(ev.reflected){
cls="malus";emoji="🪞";
if(me){title="Ton malus t'est renvoyé par "+B;detail=ev.selfText;}
else if(victim){title="Ton Miroir a renvoyé le malus de "+A;detail=ev.targetText;}
else{title=B+" a renvoyé le malus de "+A;detail=ev.pubText;}
}else if(ev.blocked){
cls="neutral";emoji="🛡️";
if(me){title="Malus bloqué par "+B;detail=ev.selfText;}
else if(victim){title="Ton bouclier t'a protégé du malus de "+A;detail=ev.targetText;}
else{title=B+" a bloqué le malus de "+A;detail=ev.pubText;}
}else{
cls="malus";
if(me){emoji="💥";title="Tu as donné un malus à "+B;detail=ev.selfText;}
else if(victim){emoji="😱";title="Tu as été la victime du malus de "+A;detail=ev.targetText;cls="malus victim";}
else{emoji="💥";title=A+" a donné un malus à "+B;detail=ev.pubText;}
}
$("v35EEmoji").textContent=emoji;$("v35ETitle").textContent=title;$("v35EDetail").textContent=detail||"";$("v35EEffect").textContent=ev.label||"";$("v35EEffect").style.display=ev.label?"inline-block":"none";
const conf=$("v35EConf");conf.replaceChildren();
if(ev.choice==="bonus"){["✨","🎉","⭐","💫","🎊","✨"].forEach((c,i)=>{const b=document.createElement("b");b.textContent=c;b.style.left=(8+i*16)+"%";b.style.animationDelay=(i*.25)+"s";conf.appendChild(b);});}
const ms=Number(ev.ms)||T.EVENT;const bar=$("v35EBar");bar.style.setProperty("--ms",ms+"ms");bar.style.animation="none";void bar.offsetWidth;bar.style.animation="";
const box=$("v35Event");box.className="";cls.split(" ").forEach(c=>box.classList.add(c));box.classList.add("show");
S.ui.ev=setTimeout(hideEvent,ms);
}
/* ---------- Flux hôte ---------- */
function nextEligible(){
for(const p of Object.values(players)){
let ok=false;try{ok=!!powerEligible(p);}catch(e){}
if(!ok)continue;
if(p.id!==myId&&!(connections[p.id]&&connections[p.id].open)){p.powerGrantedCombo=p.combo;continue;}
return p;
}
return null;
}
function proceed(){
if(!isHost||!gameStarted)return;
const p=nextEligible();
if(p)askPower(p);else advance();
}
function advance(){
if(!isHost||!gameStarted)return;
const key=currentQuestionIndex;if(S.advancedFor===key)return;S.advancedFor=key;
const last=currentQuestionIndex+1>=usedQuestions.length;
S.turn=null;try{closePowerModal();}catch(e){}
try{broadcast({type:"v35Wait",active:false});}catch(e){}hideWait();
broadcast({type:"v35Next",ms:T.NEXT,last});showNext(T.NEXT,last);
later(()=>{if(!gameStarted)return;hideNext();currentQuestionIndex++;sendNextQuestion(false);},T.NEXT);
}
function askPower(p){
const combo=Number(p.combo||0),level=combo>=4?4:2;
const token="v35-"+S.flow+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
p.powerGrantedCombo=combo;p.powerAvailable=true;p.currentPowerToken=token;
S.turn={token,playerId:p.id,level,done:false};
broadcastPlayers();
const w={type:"v35Wait",active:true,playerId:p.id,name:p.name,avatar:p.avatar,seconds:T.CHOOSE};
broadcast(w);handleWait(w);
if(p.id===myId){try{updateMyScore();}catch(e){}openPowerModal(level,token);}
else sendTo(p.id,{type:"powerAvailable",playerId:p.id,powerLevel:level,token,players:cleanPlayers()});
later(()=>expire(token),(T.CHOOSE+3)*1000);
}
function expire(token){
const t=S.turn;if(!t||t.done||t.token!==token)return;
const p=players[t.playerId];if(p){p.currentPowerToken=null;p.powerAvailable=false;}
S.turn=null;broadcastPlayers();
try{broadcast({type:"v35Wait",active:false});}catch(e){}hideWait();
if(t.playerId===myId){try{closePowerModal();}catch(e){}onExpire();}
else sendTo(t.playerId,{type:"v35Expire"});
later(proceed,T.GAP);
}
function onExpire(){try{closePowerModal();}catch(e){}S.sentToken=null;S.locked=false;toast("⏱️ Temps écoulé : aucun pouvoir utilisé.");}
function reject(p,message){
const d={type:"v35Reject",message,players:cleanPlayers()};
if(p.id===myId)onReject(d);else sendTo(p.id,d);
}
function onReject(d){
if(!isHost&&d.players)players=d.players;
S.sentToken=null;S.locked=false;toast("⚠️ "+(d.message||"Choix refusé."));
if(S.mine){try{openPowerModal(S.mine.level,S.mine.token);}catch(e){}}
}
/* Application du choix (logique identique à l'ancienne, nom de l'attaquant toujours pris côté hôte) */
function applyChoice(p,data){
const amt=powerAmounts(data.level);
let choice=data.choice==="malus"?"malus":"bonus",kind=data.kind,target=null,blocked=false,amount=0,ext=null;
if(choice==="malus")target=players[data.targetId];
if(!POWER_KINDS[choice].includes(kind))kind="xp";
if(EXT_POWERS[kind]){
const used=p.used||(p.used=[]);
if(powerBlockedFor(p,kind))kind="xp";else used.push(kind);
}
if(EXT_POWERS[kind]){
ext=applyExtPower(p,target,kind,data.level);blocked=ext.blocked;
if(choice==="malus")p.malusesGiven=(p.malusesGiven||0)+1;else p.bonusesGiven=(p.bonusesGiven||0)+1;
}else if(choice==="bonus"){
if(kind==="xp"){amount=amt.bonus;p.score+=amount;p.bonusPoints=(p.bonusPoints||0)+amount;}
else if(kind==="shield")p.shield=true;
else if(kind==="double")p.doubleNext=true;
else if(kind==="jackpot"){amount=amt.jackpot;p.score+=amount;p.bonusPoints=(p.bonusPoints||0)+amount;}
else if(kind==="triple")p.tripleNext=true;
p.bonusesGiven=(p.bonusesGiven||0)+1;
}else{
p.malusesGiven=(p.malusesGiven||0)+1;
if(target.shield){target.shield=false;blocked=true;}
else if(kind==="xp"){amount=Math.min(amt.malus,target.score);target.score-=amount;target.malusPoints=(target.malusPoints||0)+amount;target.malusesReceived=(target.malusesReceived||0)+1;}
else if(kind==="freeze"){target.combo=0;target.powerGrantedCombo=0;target.malusesReceived=(target.malusesReceived||0)+1;}
else if(kind==="steal"){amount=Math.min(amt.steal,target.score);target.score-=amount;p.score+=amount;target.malusPoints=(target.malusPoints||0)+amount;target.malusesReceived=(target.malusesReceived||0)+1;p.bonusPoints=(p.bonusPoints||0)+amount;}
else if(kind==="crush"){amount=Math.min(amt.crush,target.score);target.score-=amount;target.malusPoints=(target.malusPoints||0)+amount;target.malusesReceived=(target.malusesReceived||0)+1;}
else if(kind==="halve"){const before=target.score;target.score=Math.floor(target.score/2);amount=before-target.score;target.malusPoints=(target.malusPoints||0)+amount;target.malusesReceived=(target.malusesReceived||0)+1;}
}
return {choice,kind,target,blocked,amount,ext};
}
function onChoice(data){
if(!isHost||!gameStarted)return;
const t=S.turn;
if(!t||t.done||!data||data.token!==t.token||data.playerId!==t.playerId)return;
const p=players[t.playerId];if(!p||p.currentPowerToken!==t.token)return;
if(data.choice==="malus"){
const tg=players[data.targetId];
if(!tg||tg.id===p.id||!modeTargets(p.id).some(x=>x.id===tg.id)){reject(p,"Cet adversaire n'est plus disponible. Choisis un autre joueur.");return;}
}
t.done=true;p.currentPowerToken=null;p.powerAvailable=false;
let r;
try{r=applyChoice(p,Object.assign({},data,{level:Number(data.level)||t.level}));}
catch(err){
console.error("V35 pouvoir",err);
const amount=powerAmounts(t.level).bonus;p.score=(p.score||0)+amount;p.bonusPoints=(p.bonusPoints||0)+amount;
r={choice:"bonus",kind:"xp",target:null,blocked:false,amount,ext:null};
}
const d=describe({choice:r.choice,kind:r.kind,amount:r.amount,blocked:r.blocked,ext:r.ext,p,t:r.target});
const ev={type:"v35Event",id:++S.seq,choice:r.choice,kind:r.kind,label:d.label,blocked:d.blocked,reflected:d.reflected,amount:r.amount,
giverId:p.id,giverName:p.name,giverAvatar:p.avatar||"🎮",targetId:r.target?r.target.id:null,targetName:r.target?r.target.name:null,
selfText:d.selfText,targetText:d.targetText,pubText:d.pubText,ms:T.EVENT,players:cleanPlayers()};
S.turn=null;
try{broadcast({type:"v35Wait",active:false});}catch(e){}
broadcast(ev);onEvent(ev);broadcastPlayers();
try{closePowerModal();}catch(e){}
later(proceed,T.EVENT+T.GAP);
}
/* Remplacement des anciennes fonctions de flux */
checkPowersThenContinue=function(){
if(!isHost||!gameStarted)return;
S.flow++;clearAll();S.turn=null;S.advancedFor=-1;
proceed();
};
triggerNextPower=function(){if(isHost&&gameStarted&&!S.turn)proceed();};
handlePowerChoice=onChoice;
const baseSend=sendNextQuestion;
sendNextQuestion=function(first=false){
S.flow++;clearAll();S.turn=null;hideTransient();S.mine=null;S.sentToken=null;S.locked=false;
if(first)S.advancedFor=-1;
try{broadcast({type:"v35Wait",active:false});}catch(e){}
return baseSend(first);
};
const baseFinish=finishGame;
finishGame=function(){S.flow++;clearAll();S.turn=null;hideTransient();try{broadcast({type:"v35Wait",active:false});}catch(e){}return baseFinish();};
const baseReset=resetConnection;
resetConnection=function(){S.flow++;clearAll();S.turn=null;S.mine=null;hideTransient();return baseReset();};
/* ---------- Côté joueur : envoi du choix sans double clic ---------- */
sendPowerChoice=function(choice,targetId,level,token,kind){
if(!powerOpen)return;
if(S.sentToken===token)return;
S.sentToken=token;
const data={type:"powerChoice",playerId:myId,choice,targetId:choice==="malus"?targetId:null,level,token,kind};
if(isHost){closePowerModal();handlePowerChoice(data);return;}
const connection=Object.values(connections)[0];
if(connection&&connection.open){
closePowerModal();
try{connection.send(data);}catch(e){S.sentToken=null;S.locked=false;toast("⚠️ Connexion instable : réessaie.");try{openPowerModal(level,token);}catch(_){}}
}else{
S.sentToken=null;S.locked=false;toast("⚠️ Connexion perdue : impossible d'envoyer ton choix.");
}
};
function lockButtons(on){["bonusButton","malusButton"].forEach(id=>{const b=$(id);if(b)b.disabled=!!on;});}
const baseBonus=chooseBonus;
chooseBonus=function(){if(!powerOpen||S.locked)return;S.locked=true;lockButtons(true);return baseBonus();};
const baseMalus=chooseMalus;
chooseMalus=function(){
if(!powerOpen||S.locked)return;
const tg=modeTargets(myId);
if(!tg.length){toast("💥 Aucun adversaire disponible.");return;}
if(!S.sel||!tg.some(x=>x.id===S.sel)){S.sel=null;renderTargets();const box=$("v35Targets");if(box){box.classList.remove("v35-shake");void box.offsetWidth;box.classList.add("v35-shake");}toast("👆 Choisis d'abord un adversaire.");return;}
const select=$("malusTarget");
if(select){if(![...select.options].some(o=>o.value===S.sel))select.add(new Option(S.sel,S.sel));select.value=S.sel;}
S.locked=true;lockButtons(true);
return baseMalus();
};
/* ---------- Compte à rebours + choix automatique (respecte les règles du mode) ---------- */
const pick=a=>a[Math.floor(Math.random()*a.length)];
function autoChoice(){
if(!powerOpen||S.locked)return;
const modal=$("powerModal"),level=Number(modal.dataset.level),token=modal.dataset.token,me=players[myId]||{};
const tg=modeTargets(myId);
let choice=Math.random()<.5?"bonus":"malus";if(choice==="malus"&&!tg.length)choice="bonus";
const kinds=POWER_KINDS[choice].filter(id=>{try{return !powerBlockedFor(me,id);}catch(e){return true;}});
const kind=pick(kinds)||"xp",target=choice==="malus"?pick(tg):null;
S.locked=true;toast("⏱️ Temps écoulé : choix automatique.");
sendPowerChoice(choice,target?target.id:null,level,token,kind);
}
startPowerCountdown=function(){
clearInterval(powerTimer);let left=T.CHOOSE;
const el=$("powerCountdownValue"),circle=$("powerCountdown");if(!el||!circle)return;
el.textContent=left;circle.style.background="conic-gradient(#facc15 100%,rgba(255,255,255,.1) 0)";
powerTimer=setInterval(()=>{
left--;el.textContent=Math.max(0,left);
circle.style.background="conic-gradient("+(left<=5?"var(--red)":"#facc15")+" "+Math.max(0,left/T.CHOOSE*100)+"%,rgba(255,255,255,.1) 0)";
if(left<=3&&left>0){try{tone(700,.06,"square",.05);}catch(e){}}
if(left<=0){clearInterval(powerTimer);autoChoice();}
},1000);
};
/* ---------- Modal pouvoir : cibles lisibles ---------- */
function renderTargets(){
const box=$("v35Targets"),info=$("v35Sel");if(!box||!info)return;
const tg=modeTargets(myId);
if(S.sel&&!tg.some(x=>x.id===S.sel))S.sel=null;
if(!S.sel&&tg.length===1)S.sel=tg[0].id;
box.replaceChildren();
tg.forEach(p=>{
const b=document.createElement("button");b.type="button";b.className="v35-chip";b.dataset.id=p.id;b.setAttribute("aria-pressed",String(p.id===S.sel));
const a=document.createElement("span");a.textContent=p.avatar||"🎮";
const n=document.createElement("span");n.className="v35-n";n.textContent=at(p.name);
const s=document.createElement("small");s.textContent=Number(p.score||0)+" pts";
b.append(a,n,s);box.appendChild(b);
});
const sel=tg.find(x=>x.id===S.sel);
info.className=sel?"":"none";
info.textContent=sel?"🎯 Cible choisie : "+at(sel.name)+" ("+Number(sel.score||0)+" pts)":(tg.length?"👆 Touche un adversaire pour le choisir.":"Aucun adversaire disponible.");
}
function mountModal(){
const modal=$("powerModal");if(!modal)return;
const desc=$("powerModalDescription"),select=$("malusTarget");if(!desc||!select)return;
let me=$("v35Me");
if(!me){me=document.createElement("div");me.id="v35Me";desc.insertAdjacentElement("afterend",me);}
const mp=players[myId];me.textContent="🎮 Tu joues en tant que "+at(mp?mp.name:"toi");
if(!$("v35Targets")){
const box=document.createElement("div");box.id="v35Targets";box.setAttribute("role","group");box.setAttribute("aria-label","Choisir un adversaire");
const info=document.createElement("div");info.id="v35Sel";info.setAttribute("aria-live","polite");
select.insertAdjacentElement("beforebegin",box);box.insertAdjacentElement("afterend",info);
box.addEventListener("click",e=>{
const b=e.target.closest(".v35-chip");if(!b||S.locked)return;
S.sel=b.dataset.id;const s=$("malusTarget");if(s&&[...s.options].some(o=>o.value===S.sel))s.value=S.sel;renderTargets();
});
}
let info=$("v35Info");
if(!info){info=document.createElement("div");info.id="v35Info";info.className="v35-info";const box=modal.querySelector(".power-modal-box");if(box)box.appendChild(info);}
info.innerHTML="⏱️ Tu as <strong>"+T.CHOOSE+" secondes</strong>. Sans décision, un pouvoir est choisi automatiquement.";
renderTargets();
}
const baseOpen=openPowerModal;
openPowerModal=function(level,token){
S.mine={level,token};S.sel=null;S.locked=false;if(S.sentToken!==token)S.sentToken=null;
const r=baseOpen(level,token);
lockButtons(false);mountModal();requestAnimationFrame(mountModal);setTimeout(mountModal,120);
return r;
};
const baseClose=closePowerModal;
closePowerModal=function(){const r=baseClose();return r;};
/* ---------- Réseau ---------- */
const baseHandle=handleData;
handleData=function(data){
if(data&&data.type){
switch(data.type){
case "v35Wait":if(!isHost)handleWait(data);return;
case "v35Event":if(!isHost)onEvent(data);return;
case "v35Next":if(!isHost)showNext(data.ms,data.last);return;
case "v35Expire":if(!isHost)onExpire();return;
case "v35Reject":if(!isHost)onReject(data);return;
case "powerResult":case "v26PowerWaiting":return;
case "powerAvailable":if(!isHost){S.sentToken=null;hideWait();}break;
case "nextQuestion":case "gameStart":hideTransient();break;
}
}
return baseHandle(data);
};
try{Object.defineProperty(document,"title",{configurable:true,get(){return "Qui suis-je ? 🎮 — V35";},set(v){}});}catch(e){}
ensureUI();
window.v35Flow={state:S,T,describe,modeTargets};
console.log("V35 : flux bonus/malus unifié, transitions et messages @pseudo.");
})();
