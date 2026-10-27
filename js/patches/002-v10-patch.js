/* Extrait de l'ancien index.html : <script id="v10-patch"> */
(function V10Patch(){
"use strict";
window.v10ProfileActivity=window.v10ProfileActivity||{};
function activity(id){return window.v10ProfileActivity[id]||(window.v10ProfileActivity[id]={firstSeen:Date.now(),messages:0,lastMessage:null});}
function syncActivity(){Object.keys(players||{}).forEach(activity);}
const priorAddChat=addChatMessage;
addChatMessage=function(m){
if(m&&m.playerId){const a=activity(m.playerId);a.messages++;a.lastMessage=m.time||new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});}
return priorAddChat(m);
};
function safe(v){return escapeHTML(String(v??""));}
function profileRank(id){return Object.values(players).sort((a,b)=>(b.score||0)-(a.score||0)).findIndex(p=>p.id===id)+1;}
window.openProfileV9=function(id){
ensureProfileModalFallback();syncActivity();const p=players[id];if(!p)return;const a=activity(id),total=(p.correct||0)+(p.wrong||0),rate=total?Math.round((p.correct||0)*100/total):0,avg=total?Math.round((p.score||0)/total):0,rank=profileRank(id),mode=typeof modeLabel==="function"?modeLabel(window.v9GameMode):String(window.v9GameMode||"Individuel");
const role=p.host?"Hôte de la partie":"Joueur / Joueuse";const team=p.team||((window.v9GameMode==="soloHost")?(p.host?"Camp de l’hôte":"Camp de tout le monde"):"Aucune équipe");
document.getElementById("profileContent").innerHTML='<div class="profile-hero"><div class="profile-avatar">'+safe(p.avatar||"🙂")+'</div><div><div class="profile-name">@'+safe(p.name||"Utilisateur")+'</div><div class="profile-badges"><span class="profile-badge">'+(p.host?'👑 Hôte':'🎮 Participant')+'</span>'+(id===myId?'<span class="profile-badge">Vous</span>':'')+'<span class="profile-badge v10-online">● En ligne</span></div></div></div><div class="v10-profile-meta"><div><small>Rôle</small><b>'+safe(role)+'</b></div><div><small>Camp / Équipe</small><b>'+safe(team)+'</b></div><div><small>Mode actuel</small><b>'+safe(mode)+'</b></div><div><small>Identifiant de session</small><b>'+safe(String(id).slice(0,16))+'</b></div></div><div class="profile-stats"><div class="profile-stat"><strong class="v10-rank">#'+rank+'</strong><span>CLASSEMENT</span></div><div class="profile-stat"><strong>'+Number(p.score||0)+'</strong><span>POINTS</span></div><div class="profile-stat"><strong>'+Number(p.correct||0)+'</strong><span>BONNES RÉPONSES</span></div><div class="profile-stat"><strong>'+Number(p.wrong||0)+'</strong><span>ERREURS</span></div><div class="profile-stat"><strong>'+rate+' %</strong><span>RÉUSSITE</span></div><div class="profile-stat"><strong>'+Number(p.bestCombo||p.combo||0)+'</strong><span>MEILLEUR COMBO</span></div><div class="profile-stat"><strong>'+avg+'</strong><span>MOY. POINTS / RÉPONSE</span></div><div class="profile-stat"><strong>'+Number(p.bonusesGiven||0)+'</strong><span>POUVOIRS UTILISÉS</span></div><div class="profile-stat"><strong>'+Number(p.malusesReceived||0)+'</strong><span>MALUS REÇUS</span></div><div class="profile-stat"><strong>'+a.messages+'</strong><span>MESSAGES DU CHAT</span></div><div class="profile-stat"><strong>'+(a.lastMessage?safe(a.lastMessage):'—')+'</strong><span>DERNIER MESSAGE</span></div><div class="profile-stat"><strong>'+total+'</strong><span>RÉPONSES TOTALES</span></div></div>';
document.getElementById("profileModal").classList.add("show");
};
function ensureProfileModalFallback(){
if(document.getElementById("profileModal"))return;const m=document.createElement("div");m.id="profileModal";m.className="modal";m.innerHTML='<div class="modal-box"><div id="profileContent"></div><button class="btn btn-secondary" type="button" onclick="closeProfileV9()">Fermer</button></div>';document.body.appendChild(m);m.onclick=e=>{if(e.target===m)closeProfileV9();};
}
function setThemePreset(kind){
const boxes=[...document.querySelectorAll("#themeGrid input")];if(!boxes.length)return;
boxes.forEach(b=>b.checked=false);
if(kind==="one")boxes[Math.floor(Math.random()*boxes.length)].checked=true;
if(kind==="all")boxes.forEach(b=>b.checked=true);
updateSelectedThemes();updatePresetButtons();
}
function updatePresetButtons(){
const n=document.querySelectorAll("#themeGrid input:checked").length,total=document.querySelectorAll("#themeGrid input").length;
document.querySelectorAll(".v10-theme-presets [data-preset]").forEach(b=>b.classList.toggle("active",(b.dataset.preset==="none"&&n===0)||(b.dataset.preset==="one"&&n===1)||(b.dataset.preset==="all"&&n===total)));
}
function addThemeControls(){
const grid=document.getElementById("themeGrid");if(!grid||document.querySelector(".v10-theme-presets"))return;
const wrap=document.createElement("div");wrap.className="v10-theme-presets";wrap.innerHTML='<button type="button" class="btn btn-secondary" data-preset="none">Aucun thème sélectionné</button><button type="button" class="btn btn-secondary" data-preset="one">1 thème</button><button type="button" class="btn btn-secondary" data-preset="all">Tous les thèmes</button>';
grid.parentNode.insertBefore(wrap,grid);wrap.querySelectorAll("button").forEach(b=>b.onclick=()=>setThemePreset(b.dataset.preset));grid.addEventListener("change",updatePresetButtons);updatePresetButtons();
}
function enhanceMode(){
const box=document.getElementById("v9ModeBox");if(!box||box.dataset.v10)return;box.dataset.v10="1";const title=box.querySelector(".setting-title");if(title)title.textContent="🎮 Mode de jeu choisi par l’hôte";const note=document.createElement("div");note.className="v10-config-note";note.textContent="Seul(e) contre tout le monde : l’hôte constitue un camp, tous les autres joueurs constituent le camp adverse.";box.appendChild(note);
}
const oldSet=window.setGameModeV9;
window.setGameModeV9=function(mode,broadcastIt){if(mode==="soloHost"){window.v9GameMode=mode;document.querySelectorAll("#v9ModeBox .v9-mode-card").forEach(b=>b.classList.toggle("selected",b.dataset.mode===mode));document.getElementById("v9TeamManager")?.classList.add("hidden");saveCurrentGameSnapshot();if(broadcastIt&&isHost)broadcast({type:"v9Config",mode,teams:{}});return;}return oldSet(mode,broadcastIt);};
function bindSoloButton(){const b=document.querySelector('[data-mode="soloHost"]');if(b&&!b.dataset.v10){b.dataset.v10="1";b.onclick=e=>{e.preventDefault();window.setGameModeV9("soloHost",true);};}}
const oldUpdatePlayers=updatePlayers;updatePlayers=function(){const r=oldUpdatePlayers();syncActivity();document.querySelectorAll("#playersList .player").forEach((el,i)=>{const p=Object.values(players)[i];if(p){el.title="Ouvrir le profil détaillé de "+p.name;el.onclick=e=>{if(!e.target.closest(".kick-button"))openProfileV9(p.id);};}});return r;};
function boot(){addThemeControls();enhanceMode();bindSoloButton();syncActivity();document.title="Qui suis-je ? 🎮 — V17";}
const oldScreen=showScreen;showScreen=function(id){const r=oldScreen(id);setTimeout(boot,0);return r;};
setInterval(boot,1000);setTimeout(boot,0);
console.log("V10 terminée : profils détaillés, présélections de thèmes et mode Seul(e) contre tout le monde.");
})();
