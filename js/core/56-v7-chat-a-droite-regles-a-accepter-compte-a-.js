/* =========================================================
V7+ — CHAT À DROITE, RÈGLES À ACCEPTER, COMPTE À REBOURS ROUGE
========================================================= */
(function(){
const css=document.createElement("style");
css.id="uiRight";
css.textContent=`
@media (min-width:1100px){
#chatPanel{top:0;right:0;bottom:0;width:300px;height:auto;max-height:none;border-radius:0;border-width:0 0 0 1px}
body.chatOpen{padding-right:300px;transition:padding .25s ease}
body.chatOpen #dock{right:312px}
}
#rulesLobbyBox{margin:14px 0;padding:14px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);text-align:left}
.rulesAcceptBtn{width:100%;margin-top:12px;padding:13px;border:0;border-radius:14px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:900;font-size:15px;cursor:pointer;transition:transform .15s}
.rulesAcceptBtn:hover:not(:disabled){transform:translateY(-2px)}
.rulesAcceptBtn:disabled{background:rgba(34,197,94,.25);cursor:default}
#rulesStatus{margin-top:10px;font-size:13px;font-weight:800;text-align:center}
`;
document.head.appendChild(css);
})();
/* ---------- Chat : ouvert à droite par défaut (grands écrans) ---------- */
const __toggleChatV8=toggleChat;
toggleChat=function(){
__toggleChatV8();
document.body.classList.toggle("chatOpen",chatState.open);
savePref("quizChatOpen",chatState.open?"1":"0");
};
const __showScreenV8=showScreen;
showScreen=function(id){
__showScreenV8(id);
if(id==="homeScreen"){
resetRulesState();
}
if(
["lobbyScreen","waitingScreen","gameScreen"].includes(id)&&
window.innerWidth>=1100&&
!chatState.open&&
!window.__chatAutoDone&&
loadPref("quizChatOpen","1")==="1"
){
window.__chatAutoDone=true;
toggleChat();
}
};
/* ---------- Règles à accepter avant de commencer ---------- */
window.rulesOk=false;
const RULES_LOBBY_HTML=
'<div id="rulesLobbyBox">'+
'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px">'+
'<strong style="font-size:16px">📖 Règles du jeu</strong>'+
'<div id="rulesLangsHost" style="display:flex;gap:6px">'+
'<button type="button" class="btn btn-secondary" style="padding:4px 10px;width:auto;margin:0" data-lang="fr" onclick="setRulesLang(\'fr\')">🇫🇷</button>'+
'<button type="button" class="btn btn-secondary" style="padding:4px 10px;width:auto;margin:0" data-lang="en" onclick="setRulesLang(\'en\')">🇬🇧</button>'+
'<button type="button" class="btn btn-secondary" style="padding:4px 10px;width:auto;margin:0" data-lang="es" onclick="setRulesLang(\'es\')">🇪🇸</button>'+
'</div></div>'+
'<div id="rulesTextHost" style="font-size:14px;line-height:1.75"></div>'+
'<button id="rulesAcceptHost" class="rulesAcceptBtn" onclick="acceptRules()">✅ J\'ai lu et j\'accepte les règles</button>'+
'<div id="rulesStatus"></div>'+
'</div>';
const __setRulesLangV8=setRulesLang;
setRulesLang=function(lang){
__setRulesLangV8(lang);
const host=document.getElementById("rulesTextHost");
if(host)host.innerHTML=RULES_TEXT[lang]||RULES_TEXT.fr;
document.querySelectorAll("#rulesLangsHost button").forEach(b=>{
b.style.opacity=b.dataset.lang===lang?"1":".5";
});
};
function resetRulesState(){
window.rulesOk=false;
const me=typeof players!=="undefined"&&players[myId];
if(me)me.rulesOk=false;
updateRulesUI();
}
function acceptRules(){
window.rulesOk=true;
if(isHost){
if(players[myId])players[myId].rulesOk=true;
broadcastPlayers();
}else{
const connection=Object.values(connections)[0];
if(connection&&connection.open){
connection.send({type:"rulesAccepted",playerId:myId});
}
}
updateRulesUI();
}
function updateRulesUI(){
const ok=!!window.rulesOk;
const hostBtn=document.getElementById("rulesAcceptHost");
if(hostBtn){
hostBtn.disabled=ok;
hostBtn.textContent=ok?"✅ Règles acceptées":"✅ J'ai lu et j'accepte les règles";
}
const guestBtn=document.getElementById("rulesAcceptGuest");
if(guestBtn){
guestBtn.disabled=ok;
guestBtn.textContent=ok?"✅ Règles acceptées":"✅ J'ai lu et j'accepte les règles";
}
const note=document.getElementById("rulesGuestNote");
if(note){
note.textContent=ok
?"Merci ! L'hôte lancera la partie quand tout le monde aura accepté."
:"Tu dois accepter les règles pour que la partie puisse commencer.";
}
if(!isHost)return;
const list=Object.values(players);
const missing=list.filter(p=>!p.rulesOk);
const status=document.getElementById("rulesStatus");
if(status){
status.textContent=missing.length
?"⏳ Règles acceptées : "+(list.length-missing.length)+"/"+list.length+" — en attente : "+missing.map(p=>p.name).join(", ")
:"✅ Tout le monde a accepté les règles : tu peux lancer la partie !";
status.style.color=missing.length?"#facc15":"#86efac";
}
const start=document.getElementById("startButton");
if(start)start.style.opacity=missing.length?".55":"1";
}
setInterval(updateRulesUI,600);
function rulesMissingNames(){
return Object.values(players).filter(p=>!p.rulesOk).map(p=>p.name);
}
const __requestStartV8=requestStartGame;
requestStartGame=function(){
const missing=rulesMissingNames();
if(missing.length){
showBanner("📖 En attente de l'acceptation des règles : "+missing.join(", "));
updateRulesUI();
return;
}
return __requestStartV8();
};
const __startGameV8=startGame;
startGame=function(){
if(isHost&&rulesMissingNames().length){
showBanner("📖 Tout le monde doit accepter les règles avant de commencer.");
return;
}
return __startGameV8();
};
const __handleDataV8=handleData;
handleData=function(data){
if(data&&data.type==="rulesAccepted"){
if(isHost&&players[data.playerId]){
players[data.playerId].rulesOk=true;
broadcastPlayers();
updateRulesUI();
}
return;
}
return __handleDataV8(data);
};
/* ---------- Compte à rebours : devient rouge juste avant la fin ---------- */
const __showCountdownV8=showStartCountdown;
showStartCountdown=function(seconds,onDone){
__showCountdownV8(seconds,onDone);
clearInterval(window.__redT);
const paint=()=>{
const overlay=document.getElementById("startCountdown");
const num=document.getElementById("startCountdownNum");
if(!overlay||!num||overlay.style.display==="none"){
clearInterval(window.__redT);
return;
}
const n=Number(num.textContent);
const red=n>0&&n<=2;
num.style.color=red?"#ef4444":"#fff";
num.style.textShadow=red?"0 0 60px rgba(239,68,68,.95)":"0 0 40px rgba(167,139,250,.8)";
overlay.firstChild.style.color=red?"#fca5a5":"#fff";
overlay.style.background=red?"rgba(40,6,10,.94)":"rgba(10,8,25,.92)";
};
paint();
window.__redT=setInterval(paint,120);
};
(function(){
const slot=document.getElementById("__rulesLobbySlot");
if(slot)slot.outerHTML=RULES_LOBBY_HTML;
setRulesLang("fr");
updateRulesUI();
})();
/* =========================================================
V9 FINALE — couche d'évolution maîtrisée
Objectif : conserver le gameplay V8/V7+ et ajouter session,
modes, équipes, rapport PDF réel, écran de fin, inspecteur,
robustesse et polish sans réécrire le cœur du jeu.
========================================================= */
(function initV9(){
"use strict";
const V9={
version:"V9 Finale Ultime",
sessionKey:"quizV9Session",
gameKey:"quizV9CurrentGame",
reportKey:"quizV9LastReport"
};
window.V9=V9;
/* ---------- état V9 ---------- */
window.v9GameMode=window.v9GameMode||"individual";
window.v9Teams=window.v9Teams||{};
window.v9LaunchLock=false;
window.v9Inspector=false;
window.v9GameStartedAt=window.v9GameStartedAt||null;
window.v9LastFinishedData=null;
const esc=typeof escapeHTML==="function"?escapeHTML:(x)=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
function saveSessionName(name){
const n=String(name||"").trim();
if(!n)return;
try{localStorage.setItem(V9.sessionKey,JSON.stringify({name:n,updatedAt:Date.now()}));}catch(e){}
}
function loadSessionName(){
try{
const x=JSON.parse(localStorage.getItem(V9.sessionKey)||"null");
return x&&x.name?String(x.name):"";
}catch(e){return "";}
}
function clearCurrentGame(){
try{localStorage.removeItem(V9.gameKey);}catch(e){}
}
function saveCurrentGameSnapshot(){
try{
localStorage.setItem(V9.gameKey,JSON.stringify({
roomCode,myId,myName,mode:window.v9GameMode,teams:window.v9Teams,updatedAt:Date.now()
}));
}catch(e){}
}
/* ---------- session par défaut ---------- */
function hydrateSessionInputs(){
const n=loadSessionName();
if(!n)return;
["hostName","joinName"].forEach(id=>{
const el=document.getElementById(id);
if(el&&!el.value)el.value=n;
});
let badge=document.getElementById("v9SessionBadge");
if(!badge){
const home=document.querySelector("#homeScreen .card");
if(home){
badge=document.createElement("div");
badge.id="v9SessionBadge";
badge.className="v9-session-badge";
home.insertBefore(badge,home.querySelector(".home-grid"));
}
}
if(badge){
badge.innerHTML=`<span>👤 Session : <strong>@${esc(n)}</strong></span><button type="button" onclick="changeUsernameV9()">Changer de nom</button>`;
}
}
window.changeUsernameV9=function(){
const current=myName||loadSessionName();
if(!current){hydrateSessionInputs();return;}
const ok=confirm(`⚠️ CHANGER DE NOM D'UTILISATEUR\n\nVous êtes actuellement connecté en tant que @${current}.\n\nVotre session locale associée à ce nom sera réinitialisée. Les historiques de parties déjà enregistrés restent conservés sous leurs propres identifiants.\n\nVoulez-vous vraiment continuer ?`);
if(!ok)return;
try{localStorage.removeItem(V9.sessionKey);}catch(e){}
clearCurrentGame();
["hostName","joinName"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
hydrateSessionInputs();
showMessage("homeMessage","La session utilisateur a été réinitialisée. Entre ton nouveau pseudo.");
};
const oldCreateRoom=createRoom;
createRoom=function(){
const el=document.getElementById("hostName");
if(el&&el.value.trim())saveSessionName(el.value.trim());
const r=oldCreateRoom();
saveCurrentGameSnapshot();
return r;
};
const oldJoinRoom=joinRoom;
joinRoom=function(){
const el=document.getElementById("joinName");
if(el&&el.value.trim())saveSessionName(el.value.trim());
const r=oldJoinRoom();
saveCurrentGameSnapshot();
return r;
};
/* ---------- modes + équipes ---------- */
function modeLabel(mode){
return ({individual:"👤 Individuel",teams:"👥 Équipes",ffa:"⚔️ Toutes et tous contre toutes et tous",soloHost:"🛡️ Seul(e) contre tout le monde"})[mode]||"👤 Individuel";
}
function ensureModeUI(){
const host=document.getElementById("hostSettings");
if(!host||document.getElementById("v9ModeBox"))return;
const box=document.createElement("div");
box.id="v9ModeBox";
box.className="v9-mode-box";
box.innerHTML=`
<div class="setting-title">🎮 Mode de jeu</div>
<div class="v9-mode-grid">
<button type="button" class="v9-mode-card" data-mode="individual"><b>👤 Individuel</b><span>Chaque joueur joue pour soi.</span></button>
<button type="button" class="v9-mode-card" data-mode="teams"><b>👥 Équipes</b><span>Les joueurs sont répartis en équipes.</span></button>
<button type="button" class="v9-mode-card" data-mode="ffa"><b>⚔️ Toutes et tous contre toutes et tous</b><span>Aucune équipe, confrontation directe.</span></button>
<button type="button" class="v9-mode-card" data-mode="soloHost"><b>🛡️ Seul(e) contre tout le monde</b><span>L’hôte joue seul contre l’ensemble des autres joueurs.</span></button>
</div>
<div id="v9TeamManager" class="v9-team-manager hidden"></div>`;
const rules=document.getElementById("__rulesLobbySlot");
host.insertBefore(box,rules||host.querySelector("#startButton"));
box.querySelectorAll("[data-mode]").forEach(btn=>btn.addEventListener("click",()=>setGameModeV9(btn.dataset.mode,true)));
setGameModeV9(window.v9GameMode,false);
}
function setGameModeV9(mode,broadcastIt){
if(!["individual","teams","ffa","soloHost"].includes(mode))mode="individual";
window.v9GameMode=mode;
document.querySelectorAll("#v9ModeBox .v9-mode-card").forEach(b=>b.classList.toggle("selected",b.dataset.mode===mode));
const mgr=document.getElementById("v9TeamManager");
if(mgr){
mgr.classList.toggle("hidden",mode!=="teams");
if(mode==="teams")renderTeamManagerV9();
}
saveCurrentGameSnapshot();
if(broadcastIt&&isHost){
broadcast({type:"v9Config",mode,teams:window.v9Teams});
}
}
window.setGameModeV9=setGameModeV9;
function teamNames(){
return Object.keys(window.v9Teams).filter(Boolean);
}
function ensureTeams(){
if(!teamNames().length){
window.v9Teams={"Équipe 1":[] ,"Équipe 2":[]};
}
Object.keys(window.v9Teams).forEach(t=>{
if(!Array.isArray(window.v9Teams[t]))window.v9Teams[t]=[];
});
}
function removePlayerFromTeams(id){
Object.keys(window.v9Teams).forEach(t=>{window.v9Teams[t]=window.v9Teams[t].filter(x=>x!==id);});
}
function assignTeamV9(playerId,team){
if(!isHost||window.v9GameMode!=="teams")return;
ensureTeams();
if(!window.v9Teams[team])window.v9Teams[team]=[];
removePlayerFromTeams(playerId);
window.v9Teams[team].push(playerId);
if(players[playerId])players[playerId].team=team;
broadcast({type:"v9Config",mode:window.v9GameMode,teams:window.v9Teams,players:cleanPlayers()});
renderTeamManagerV9();
updatePlayers();
saveCurrentGameSnapshot();
}
function addTeamV9(){
if(!isHost)return;
ensureTeams();
let i=teamNames().length+1,name=`Équipe ${i}`;
while(window.v9Teams[name]){i++;name=`Équipe ${i}`;}
window.v9Teams[name]=[];
broadcast({type:"v9Config",mode:"teams",teams:window.v9Teams,players:cleanPlayers()});
renderTeamManagerV9();
}
function renameTeamV9(oldName){
if(!isHost||!window.v9Teams[oldName])return;
const n=prompt("Nom de la nouvelle équipe :",oldName);
if(n===null)return;
const name=n.trim().slice(0,30);
if(!name||name===oldName)return;
if(window.v9Teams[name]){alert("Cette équipe existe déjà.");return;}
window.v9Teams[name]=window.v9Teams[oldName];
delete window.v9Teams[oldName];
Object.values(players).forEach(p=>{if(p.team===oldName)p.team=name;});
broadcast({type:"v9Config",mode:"teams",teams:window.v9Teams,players:cleanPlayers()});
renderTeamManagerV9();updatePlayers();
}
function renderTeamManagerV9(){
const el=document.getElementById("v9TeamManager");
if(!el||!isHost||window.v9GameMode!=="teams")return;
ensureTeams();
const opts=teamNames().map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");
const teamBlocks=teamNames().map(t=>`<div class="v9-team-block"><div><strong>👥 ${esc(t)}</strong><button type="button" onclick="renameTeamV9(${JSON.stringify(t)})">✏️</button></div><div class="v9-team-members">${(window.v9Teams[t]||[]).map(id=>esc(players[id]?.name||"Joueur")).join(", ")||"Aucun joueur"}</div></div>`).join("");
el.innerHTML=`<div class="v9-team-head"><strong>Configuration des équipes</strong><button type="button" class="v9-small-btn" onclick="addTeamV9()">＋ Ajouter une équipe</button></div>${Object.values(players).map(p=>`<div class="v9-assign-row"><span>👤 ${esc(p.name)}</span><select class="select" onchange="assignTeamV9(${JSON.stringify(p.id)},this.value)"><option value="">Sans équipe</option>${opts}</select></div>`).join("")}<div class="v9-team-list">${teamBlocks}</div>`;
Object.values(players).forEach(p=>{
const sel=el.querySelector(`select[onchange*='${CSS.escape(p.id)}']`);
if(sel)sel.value=p.team||"";
});
}
window.addTeamV9=addTeamV9;
window.renameTeamV9=renameTeamV9;
window.assignTeamV9=assignTeamV9;
/* Ajout des champs V9 aux joueurs sans modifier le cœur existant. */
const oldCleanPlayers=cleanPlayers;
cleanPlayers=function(){
const result=oldCleanPlayers();
Object.keys(result).forEach(id=>{ if(players[id]) result[id].team=players[id].team||""; });
return result;
};
const oldCreatePlayer=createPlayer;
createPlayer=function(id,name,host=false){
const p=oldCreatePlayer(id,name,host);
p.team=p.team||"";
p.sessionName=name;
return p;
};
/* ---------- configuration réseau V9 ---------- */
const oldHandleData=handleData;
handleData=function(data){
if(data&&data.type==="v9Config"){
if(data.mode)window.v9GameMode=data.mode;
if(data.teams)window.v9Teams=JSON.parse(JSON.stringify(data.teams));
if(data.players&&!isHost)players=data.players;
if(!isHost){
renderGuestTeamStatus();
updateWaitingPlayersV9();
}
return;
}
if(data&&data.type==="v9TeamRequest"&&isHost){
assignTeamV9(data.playerId,data.team);
return;
}
return oldHandleData(data);
};
function renderGuestTeamStatus(){
if(isHost)return;
const card=document.querySelector("#waitingScreen .card");
if(!card)return;
let box=document.getElementById("v9GuestMode");
if(!box){
box=document.createElement("div");box.id="v9GuestMode";box.className="v9-guest-mode";
const note=document.getElementById("rulesGuestNote");
if(note)note.parentNode.insertBefore(box,note);
}
const my=players[myId];
const teams=teamNames();
if(window.v9GameMode!=="teams"){
box.innerHTML=`<strong>${modeLabel(window.v9GameMode)}</strong><div>${window.v9GameMode==="ffa"?"Aucune équipe n'est utilisée.":"Tu joues individuellement."}</div>`;
return;
}
box.innerHTML=`<strong>👥 ${esc(my?.team?`Ton équipe : ${my.team}`:"Choisis ton équipe")}</strong><select class="select" id="v9GuestTeamSelect"><option value="">Sans équipe</option>${teams.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select><button type="button" class="btn btn-secondary" onclick="requestTeamV9()">Rejoindre cette équipe</button>`;
const sel=document.getElementById("v9GuestTeamSelect");if(sel)sel.value=my?.team||"";
}
window.requestTeamV9=function(){
const team=document.getElementById("v9GuestTeamSelect")?.value||"";
const c=Object.values(connections)[0];
if(c?.open){c.send({type:"v9TeamRequest",playerId:myId,team});showBanner(team?`👥 Demande envoyée : ${team}`:"Tu es sans équipe.");}
};
function updateWaitingPlayersV9(){
const el=document.getElementById("waitingPlayers");
if(el)el.innerHTML=Object.values(players).map(p=>`<span>${p.avatar||"🎮"} ${esc(p.name)}${p.team?` · ${esc(p.team)}`:""}</span>`).join("");
}
/* ---------- verrouillage et validation du lancement ---------- */
const oldRequestStart=requestStartGame;
requestStartGame=function(){
if(isHost&&window.v9GameMode==="teams"){
ensureTeams();
const missing=Object.values(players).filter(p=>!p.team);
if(missing.length){showBanner("👥 Chaque joueur doit être affecté à une équipe : "+missing.map(p=>p.name).join(", "));renderTeamManagerV9();return;}
if(teamNames().length<2){showBanner("👥 Il faut au moins 2 équipes pour jouer en mode équipes.");return;}
}
return oldRequestStart();
};
const oldStartGame=startGame;
startGame=function(){
if(!isHost)return;
if(window.v9LaunchLock){return;}
if(window.v9GameMode==="teams"){
ensureTeams();
const missing=Object.values(players).filter(p=>!p.team);
if(missing.length||teamNames().length<2){showBanner("Configuration des équipes incomplète.");return;}
}
window.v9LaunchLock=true;
window.v9GameStartedAt=Date.now();
broadcast({type:"v9Config",mode:window.v9GameMode,teams:window.v9Teams,players:cleanPlayers()});
saveCurrentGameSnapshot();
try{return oldStartGame();}
catch(e){window.v9LaunchLock=false;throw e;}
};
/* Déverrouillage quand le compte à rebours est terminé / partie lancée. */
const oldSendNext=sendNextQuestion;
sendNextQuestion=function(first=false){
if(first)window.v9LaunchLock=false;
return oldSendNext(first);
};
/* ---------- compte à rebours + transition ---------- */
const oldCountdown=showStartCountdown;
showStartCountdown=function(seconds,onDone){
oldCountdown(seconds,()=>{
const existing=document.getElementById("v9LaunchTransition");
if(existing)existing.remove();
const overlay=document.createElement("div");
overlay.id="v9LaunchTransition";
overlay.innerHTML=`<div class="v9-launch-kicker">🎮 PRÊT·E ?</div><div class="v9-launch-title">LA PARTIE COMMENCE !</div><div class="v9-launch-sub">BONNE CHANCE À TOUTES ET TOUS !</div>`;
document.body.appendChild(overlay);
setTimeout(()=>{overlay.remove();if(onDone)onDone();},1200);
});
};
/* ---------- capture propre de la partie ---------- */
const oldSaveSession=saveCurrentSession;
saveCurrentSession=function(sorted){
oldSaveSession(sorted);
try{
const sessions=loadSessions();
const rec=sessions.find(s=>s.id===window.__savedKey);
if(rec){
rec.version=V9.version;
rec.mode=window.v9GameMode;
rec.modeLabel=modeLabel(window.v9GameMode);
rec.players=(rec.players||[]).map(p=>({...p,team:players[p.id]?.team||""}));
rec.teams=Object.fromEntries(teamNames().map(t=>[t,(window.v9Teams[t]||[]).map(id=>players[id]?.name||id)]));
rec.duration=window.v9GameStartedAt?Math.max(0,Date.now()-window.v9GameStartedAt):null;
rec.sessionUser=myName||loadSessionName();
rec.finishedAt=Date.now();
storeSessions(sessions);
window.v9LastFinishedData=JSON.parse(JSON.stringify(rec));
try{localStorage.setItem(V9.reportKey,JSON.stringify(rec));}catch(e){}
}
}catch(e){console.warn("V9 save metadata",e);}
};
function teamRankingV9(sorted){
if(window.v9GameMode!=="teams")return [];
const map={};
sorted.forEach(p=>{
const t=p.team||"Sans équipe";
if(!map[t])map[t]={name:t,score:0,members:[]};
map[t].score+=Number(p.score||0);
map[t].members.push(p.name);
});
return Object.values(map).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
}
function ordinalV9(n){
return n===1?"1er":`${n}e`;
}
function addResultsV9(data){
const card=document.querySelector("#resultsScreen .card");
if(!card)return;
let box=document.getElementById("v9FinalBox");
if(box)box.remove();
box=document.createElement("div");box.id="v9FinalBox";box.className="v9-final-box";
const sorted=Object.values(players).sort((a,b)=>Number(b.score||0)-Number(a.score||0));
const my=players[myId];
const tr=teamRankingV9(sorted);
box.innerHTML=`
<div class="v9-congrats">🎉 FÉLICITATIONS <strong>@${esc(my?.name||myName||"joueur")}</strong> !<small>Vous avez terminé la partie.</small></div>
<div class="v9-result-actions">
<button type="button" class="btn btn-primary" onclick="downloadLastReportV9()">📄 Télécharger le rapport PDF</button>
<button type="button" class="btn btn-green" onclick="replayV9()">🔄 Rejouer</button>
<button type="button" class="btn btn-secondary" onclick="newGameV9()">🆕 Nouvelle partie</button>
<button type="button" class="btn btn-secondary" onclick="backToHome()">🏠 Accueil</button>
</div>
${window.v9GameMode==="teams"?`<div class="v9-team-results"><h3>🏆 Classement des équipes</h3>${tr.map((t,i)=>`<div class="v9-team-result"><b>${i<3?["🥇","🥈","🥉"][i]:`${i+1}.`} ${esc(t.name)}</b><strong>${t.score} pts</strong><small>${t.members.map(esc).join(" · ")}</small></div>`).join("")}</div>`:""}
<div class="v9-report-note">Rapport associé à cette partie : <strong>${esc(window.__savedKey||"—")}</strong></div>`;
card.appendChild(box);
}
const oldShowResults=showResults;
showResults=function(data){
oldShowResults(data);
window.v9LastFinishedData=window.v9LastFinishedData||null;
setTimeout(()=>{addResultsV9(data);},0);
window.v9LaunchLock=false;
clearCurrentGame();
};
/* ---------- actions fin de partie ---------- */
window.replayV9=function(){
if(isHost){
window.v9LaunchLock=false;
window.v9GameStartedAt=null;
gameStarted=false;
gameFinishSent=false;
showScreen("lobbyScreen");
ensureModeUI();
updatePlayers();
renderTeamManagerV9();
showBanner("🔄 La partie est prête à être relancée.");
}else{
showScreen("waitingScreen");
renderGuestTeamStatus();
}
};
window.newGameV9=function(){
clearCurrentGame();
window.v9LaunchLock=false;window.v9GameStartedAt=null;
if(isHost){
Object.values(players).forEach(p=>{p.score=0;p.correct=0;p.wrong=0;p.combo=0;p.bestCombo=0;p.team=window.v9GameMode==="teams"?p.team:"";});
showScreen("lobbyScreen");ensureModeUI();updatePlayers();renderTeamManagerV9();
}else{
resetConnection();
showScreen("homeScreen");
}
};
window.downloadLastReportV9=function(){
const id=window.__savedKey||JSON.parse(localStorage.getItem(V9.reportKey)||"null")?.id;
if(id){downloadSessionPDFV9(id);return;}
alert("Le rapport de cette partie n'est pas encore disponible.");
};
/* ---------- PDF réel avec les données de la partie ---------- */
window.downloadSessionPDFV9=function(id){
try{
const s=loadSessions().find(x=>x.id===id)||JSON.parse(localStorage.getItem(V9.reportKey)||"null");
if(!s){alert("Rapport introuvable.");return;}
if(!window.jspdf?.jsPDF){
exportSessionsPDF([id]);
alert("Le générateur PDF direct n'est pas disponible. La boîte d'impression du navigateur a été ouverte : choisis « Enregistrer au format PDF ».");
return;
}
const {jsPDF}=window.jspdf;
const doc=new jsPDF({unit:"mm",format:"a4"});
const W=210,margin=15,content=W-margin*2;
let y=18;
const page=()=>{doc.addPage();y=18;};
const line=()=>{doc.setDrawColor(220,220,230);doc.line(margin,y,W-margin,y);y+=7;};
const text=(txt,size=10,bold=false)=>{
doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);
const lines=doc.splitTextToSize(String(txt??""),content);
if(y+lines.length*5>285)page();
doc.text(lines,margin,y);y+=lines.length*5+2;
};
doc.setFillColor(76,29,149);doc.rect(0,0,W,36,"F");
doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(24);doc.text("QUI SUIS-JE ?",margin,16);doc.setFontSize(11);doc.text("RAPPORT DE PARTIE — V9 FINALE",margin,25);doc.text(new Date(s.ts).toLocaleDateString("fr-FR"),W-margin,25,{align:"right"});
y=47;doc.setTextColor(25,25,35);
text(`Joueur / session : @${s.sessionUser||s.winner||"—"}`,11,true);
text(`Mode : ${s.modeLabel||s.mode||"Individuel"} · ${s.rounds||0} question(s) · ${s.players?.length||0} joueur(s)`);
if(s.duration)text(`Durée : ${Math.round(s.duration/1000)} seconde(s)`);
line();
text(`🏆 Vainqueur : ${s.winner||"—"} — ${s.topScore||0} points`,13,true);
text("CLASSEMENT INDIVIDUEL",12,true);
(s.players||[]).forEach((p,i)=>text(`${ordinalV9(i+1)} — ${p.name} — ${p.score||0} pts · ✓ ${p.correct||0} · ✗ ${p.wrong||0} · meilleur combo ${p.bestCombo||0}`,10,i===0));
if(s.mode==="teams"||s.modeLabel?.includes("Équipes")){
line();text("CLASSEMENT DES ÉQUIPES",12,true);
const tm={};(s.players||[]).forEach(p=>{const t=p.team||"Sans équipe";if(!tm[t])tm[t]={score:0,members:[]};tm[t].score+=Number(p.score||0);tm[t].members.push(p.name);});
Object.entries(tm).sort((a,b)=>b[1].score-a[1].score).forEach(([name,v],i)=>{text(`${ordinalV9(i+1)} — ${name} — ${v.score} pts` ,10,true);text(`Membres : ${v.members.join(", ")}`,9);});
}
line();text("QUESTIONS DE LA PARTIE",12,true);
(s.log||[]).forEach(l=>{text(`${l.n}. ${l.q||""}`,9,true);text(`Thème : ${l.cat||"—"} · Niveau : ${l.diff||"—"} · Bonne réponse : ${l.a||"—"} · Ma réponse : ${l.mine===true?"correcte":l.mine===false?"incorrecte":"non répondue"}`,8);});
doc.setFontSize(8);doc.setTextColor(110,110,120);doc.text(`Généré par Qui suis-je ? — ${V9.version}`,margin,289);
const safe=(s.sessionUser||s.winner||"partie").replace(/[^a-z0-9_-]+/gi,"-").slice(0,40)||"partie";
doc.save(`qui-suis-je-${safe}-${String(s.id).slice(-8)}.pdf`);
}catch(err){
console.error("PDF V9",err);alert("Impossible de générer le PDF directement. Une version imprimable va être proposée.");try{exportSessionsPDF([id]);}catch(e){}
}
};
/* ---------- mode développeur / inspecteur CSS ---------- */
function initInspector(){
if(document.getElementById("v9InspectorPanel"))return;
const panel=document.createElement("div");panel.id="v9InspectorPanel";panel.className="v9-inspector-panel";panel.setAttribute("aria-hidden","true");
panel.innerHTML=`<div class="v9-inspector-title">🛠️ MODE DÉVELOPPEUR <button type="button" onclick="toggleInspectorV9(false)">×</button></div><div id="v9InspectorContent">Survole un élément…</div>`;
document.body.appendChild(panel);
document.addEventListener("mousemove",e=>{
if(!window.v9Inspector)return;
const t=e.target;if(!t||panel.contains(t))return;
const r=t.getBoundingClientRect(),cs=getComputedStyle(t);
const classes=[...t.classList].join(".");
document.querySelectorAll(".v9-dev-outline").forEach(x=>x.classList.remove("v9-dev-outline"));
t.classList.add("v9-dev-outline");
const c=document.getElementById("v9InspectorContent");if(c)c.innerHTML=`<b>${esc(t.tagName)}</b><br>${classes?`.${esc(classes)}`:""}${t.id?`<br>#${esc(t.id)}`:""}<br><br><b>Dimensions</b><br>${Math.round(r.width)} × ${Math.round(r.height)} px<br>Position : ${Math.round(r.left)} / ${Math.round(r.top)}<br><br><b>CSS</b><br>display: ${esc(cs.display)}<br>position: ${esc(cs.position)}<br>background: ${esc(cs.backgroundColor)}<br>color: ${esc(cs.color)}<br>border-radius: ${esc(cs.borderRadius)}`;
},{passive:true});
}
window.toggleInspectorV9=function(on){
window.v9Inspector=on===undefined?!window.v9Inspector:!!on;
initInspector();
const p=document.getElementById("v9InspectorPanel");if(p){p.classList.toggle("show",window.v9Inspector);p.setAttribute("aria-hidden",String(!window.v9Inspector));}
if(!window.v9Inspector)document.querySelectorAll(".v9-dev-outline").forEach(x=>x.classList.remove("v9-dev-outline"));
};
window.addEventListener("keydown",e=>{if(e.ctrlKey&&e.altKey&&e.key.toLowerCase()==="d"){e.preventDefault();toggleInspectorV9();}});
/* ---------- intégration UI ---------- */
const oldShowScreen=showScreen;
showScreen=function(id){
const r=oldShowScreen(id);
if(id==="homeScreen")setTimeout(hydrateSessionInputs,0);
if(id==="lobbyScreen")setTimeout(()=>{ensureModeUI();renderTeamManagerV9();},0);
if(id==="waitingScreen")setTimeout(()=>{renderGuestTeamStatus();updateWaitingPlayersV9();},0);
return r;
};
const oldUpdatePlayers=updatePlayers;
updatePlayers=function(){
const r=oldUpdatePlayers();
setTimeout(()=>{ensureModeUI();renderTeamManagerV9();},0);
return r;
};
const oldBackToHome=backToHome;
backToHome=function(){clearCurrentGame();return oldBackToHome();};
/* ---------- accessibilité ---------- */
const accessStyle=document.createElement("style");
accessStyle.textContent=`
:root{--focus-v9:rgba(168,85,247,.85)}
:focus-visible{outline:3px solid var(--focus-v9);outline-offset:3px}
.v9-session-badge{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 20px;padding:10px 14px;border:1px solid var(--border);background:rgba(255,255,255,.04);border-radius:13px;font-size:13px;color:var(--muted)}
.v9-session-badge button,.v9-small-btn{border:1px solid var(--border);background:rgba(255,255,255,.07);color:#fff;border-radius:9px;padding:7px 10px;font-weight:800;cursor:pointer}
.v9-mode-box{margin:18px 0;padding:18px;border:1px solid var(--border);background:rgba(255,255,255,.035);border-radius:18px}
.v9-mode-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.v9-mode-card{min-height:105px;border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,.04);color:#fff;padding:14px;text-align:left;cursor:pointer;transition:.2s}
.v9-mode-card b{display:block;margin-bottom:7px}.v9-mode-card span{font-size:12px;line-height:1.4;color:var(--muted)}
.v9-mode-card:hover,.v9-mode-card.selected{border-color:var(--primary2);background:rgba(124,58,237,.22);transform:translateY(-2px)}
.v9-team-manager{margin-top:15px;padding:14px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid var(--border)}
.v9-team-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}.v9-assign-row{display:grid;grid-template-columns:1fr 190px;gap:10px;align-items:center;margin:8px 0}.v9-assign-row .select{margin:0}.v9-team-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:12px}.v9-team-block{padding:10px;border-radius:11px;background:rgba(255,255,255,.05)}.v9-team-block>div:first-child{display:flex;justify-content:space-between}.v9-team-block button{border:0;background:none;color:#fff;cursor:pointer}.v9-team-members{margin-top:6px;font-size:12px;color:var(--muted);line-height:1.5}
.v9-guest-mode{margin:14px 0;padding:14px;border-radius:14px;background:rgba(124,58,237,.12);border:1px solid rgba(168,85,247,.28);text-align:center}.v9-guest-mode .select{margin-top:10px}.v9-guest-mode .btn{margin-top:4px}
#v9LaunchTransition{position:fixed;inset:0;z-index:5200;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(8,7,20,.96);animation:v9FadeIn .2s ease}.v9-launch-kicker{font-size:15px;color:#c4b5fd;font-weight:900;letter-spacing:2px}.v9-launch-title{font-size:clamp(38px,8vw,76px);font-weight:1000;margin:12px 20px;text-shadow:0 0 35px rgba(168,85,247,.7);animation:v9LaunchPulse .8s ease infinite alternate}.v9-launch-sub{font-size:18px;color:#a9abc0;font-weight:800}.v9-congrats{margin-top:20px;padding:18px;border-radius:17px;text-align:center;background:linear-gradient(135deg,rgba(124,58,237,.18),rgba(236,72,153,.12));border:1px solid rgba(168,85,247,.3);font-size:20px;font-weight:900}.v9-congrats small{display:block;margin-top:6px;color:var(--muted);font-size:13px}.v9-result-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:12px}.v9-result-actions .btn{margin:0}.v9-team-results{margin-top:18px;padding:16px;border-radius:16px;border:1px solid var(--border);background:rgba(255,255,255,.035)}.v9-team-result{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.08)}.v9-team-result:last-child{border-bottom:0}.v9-team-result small{grid-column:1/-1;color:var(--muted);font-size:12px}.v9-report-note{margin-top:12px;font-size:11px;color:var(--muted);text-align:center}.v9-inspector-panel{position:fixed;right:12px;bottom:12px;width:min(330px,calc(100vw - 24px));max-height:50vh;overflow:auto;z-index:10000;padding:13px;border-radius:13px;background:rgba(9,10,20,.97);border:1px solid #a855f7;box-shadow:0 20px 60px rgba(0,0,0,.5);font:12px/1.55 monospace;color:#fff;display:none}.v9-inspector-panel.show{display:block}.v9-inspector-title{display:flex;justify-content:space-between;gap:10px;font:900 12px Arial,sans-serif;color:#c4b5fd;margin-bottom:10px}.v9-inspector-title button{border:0;background:none;color:#fff;font-size:20px;cursor:pointer}.v9-dev-outline{outline:3px dashed #facc15!important;outline-offset:2px!important}
@keyframes v9FadeIn{from{opacity:0}to{opacity:1}}@keyframes v9LaunchPulse{to{transform:scale(1.035)}}
@media(max-width:750px){.v9-mode-grid{grid-template-columns:1fr}.v9-assign-row{grid-template-columns:1fr}.v9-result-actions{grid-template-columns:1fr}.v9-session-badge{align-items:stretch;flex-direction:column}.v9-team-head{align-items:stretch;flex-direction:column}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}.home-title .emoji,.trophy{animation:none!important}}
`;
document.head.appendChild(accessStyle);
initInspector();
/* ---------- initialisation ---------- */
setTimeout(()=>{
hydrateSessionInputs();
ensureModeUI();
updateWaitingPlayersV9();
},0);
/* bouton développeur discret : Ctrl+Alt+D, aucun élément visible aux joueurs par défaut */
})();
