/* Extrait de l'ancien index.html : <script id="v145-patch"> */
(function V145(){
"use strict";
let headerQueued=false;
function closePartyLabel(){return isHost?"Fermer la partie":"Quitter la partie";}
function requestClosePartyV145(){
const hostNow=!!isHost;
openConfirm(hostNow?"Fermer la partie ?":"Quitter la partie ?",hostNow?"La salle sera fermée pour tous les participants. Le chat et l’administration seront également fermés.":"Vous allez quitter la salle et revenir à l’accueil.",()=>{
if(hostNow){try{broadcast({type:"v145RoomClosed",message:"La partie a été fermée par l’hôte."});}catch(e){}}
resetConnection();showScreen("homeScreen");showMessage("homeMessage",hostNow?"Partie fermée.":"Vous avez quitté la partie.","success");
},"🚪");
}
window.requestClosePartyV145=requestClosePartyV145;
function createStableHeader(){
buildChatUI();const head=chatEl("chatHead");if(!head)return;
const current=head.querySelector(".v145-chat-actions");
if(current){
const admin=current.querySelector("#v145AdminBtn"),close=current.querySelector("#v145ClosePartyBtn");
if(admin)admin.hidden=!isHost;if(close){close.title=closePartyLabel();close.setAttribute("aria-label",closePartyLabel());}
return;
}
const oldTitle=head.querySelector("span");
const title=document.createElement("span");title.className="v145-chat-title";title.textContent="💬 Chat de la salle";
const actions=document.createElement("div");actions.className="v145-chat-actions";
const admin=document.createElement("button");admin.id="v145AdminBtn";admin.className="v145-head-btn";admin.type="button";admin.textContent="👑 Administration";admin.hidden=!isHost;admin.title="Ouvrir le centre d’administration";admin.setAttribute("aria-label","Ouvrir le centre d’administration");admin.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openAdminV12();decorateAdmin();});
const close=document.createElement("button");close.id="v145ClosePartyBtn";close.className="v145-head-btn";close.type="button";close.textContent="✕";close.title=closePartyLabel();close.setAttribute("aria-label",closePartyLabel());close.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();requestClosePartyV145();});
actions.append(admin,close);head.replaceChildren(title,actions);
}
function scheduleHeader(){if(headerQueued)return;headerQueued=true;requestAnimationFrame(()=>{headerQueued=false;createStableHeader();});}
function statsHTML(){const S=window.v12AdminState||{messages:new Map(),deleted:0,filterHits:0};return '<div class="v145-admin-stat"><strong>'+Object.keys(players||{}).length+'</strong><span>JOUEURS</span></div><div class="v145-admin-stat"><strong>'+(S.messages?.size||0)+'</strong><span>MESSAGES</span></div><div class="v145-admin-stat"><strong>'+(S.deleted||0)+'</strong><span>SUPPRIMÉS</span></div><div class="v145-admin-stat"><strong>'+(S.filterHits||0)+'</strong><span>BLOQUÉS</span></div>';}
function decorateAdmin(){
setTimeout(()=>{const panel=document.getElementById("v12AdminPanel"),box=panel?.querySelector(".modal-box"),content=document.getElementById("v12AdminContent");if(!box||!content)return;
const head=box.firstElementChild;if(head){head.className="v145-admin-head";const close=head.querySelector("button");if(close){close.className="v145-admin-close";close.textContent="Fermer l’administration";close.title="Fermer uniquement le panneau d’administration";}}
let stats=document.getElementById("v145AdminStats");if(!stats){stats=document.createElement("div");stats.id="v145AdminStats";stats.className="v145-admin-stats";content.prepend(stats);}stats.innerHTML=statsHTML();
let tools=document.getElementById("v145AdminTools");if(!tools){tools=document.createElement("div");tools.id="v145AdminTools";tools.className="v145-admin-tools";tools.innerHTML='<button class="btn btn-secondary" type="button">💬 Fermer uniquement le chat</button><button class="btn btn-danger" type="button">🚪 '+closePartyLabel()+'</button>';tools.children[0].addEventListener("click",()=>{closeAdminV12();if(chatState.open)toggleChat();});tools.children[1].addEventListener("click",requestClosePartyV145);content.insertBefore(tools,stats.nextSibling);}
},0);
}
const oldAdmin=window.openAdminV12;window.openAdminV12=function(){const r=oldAdmin();decorateAdmin();return r;};
const oldHandle=handleData;handleData=function(data){if(data?.type==="v145RoomClosed"&&!isHost){resetConnection();showScreen("homeScreen");showMessage("homeMessage",data.message||"La partie a été fermée par l’hôte.","error");return;}return oldHandle(data);};
const oldScreen=showScreen;showScreen=function(id){const r=oldScreen(id);scheduleHeader();return r;};
const oldPlayers=updatePlayers;updatePlayers=function(){const r=oldPlayers();scheduleHeader();return r;};
const observer=new MutationObserver(mutations=>{if(mutations.some(m=>m.target?.id==="chatHead"||m.target?.closest?.("#chatHead")))scheduleHeader();});
setTimeout(()=>{buildChatUI();const head=chatEl("chatHead");if(head)observer.observe(head,{childList:true});createStableHeader();},0);
document.title="Qui suis-je ? 🎮 — V17";
console.log("V14.5 : en-tête stable, aucun remplacement continu au survol et affichage administration corrigé.");
})();
