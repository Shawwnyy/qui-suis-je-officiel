/* Extrait de l'ancien index.html : <script id="v102-patch"> */
(function V102Patch(){
"use strict";
const liveTypers=new Map();
let localActive=false, idleTimer=null, heartbeat=null;
const clock=()=>new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
function typingArea(){
buildChatUI();const panel=chatEl("chatPanel");if(!panel)return null;
let area=chatEl("chatTyping");
if(!area){area=document.createElement("div");area.id="chatTyping";area.setAttribute("aria-live","polite");const form=chatEl("chatForm");panel.insertBefore(area,form||chatEl("chatWarn"));}
return area;
}
function drawTypers(){
const area=typingArea();if(!area)return;const now=Date.now();
for(const [id,v] of liveTypers)if(now-v.seen>5200||id===myId)liveTypers.delete(id);
const rows=[...liveTypers.values()].map(v=>'<div class="typing-row"><span class="typing-dots"><i></i><i></i><i></i></span><span>@'+escapeHTML(v.name)+' est en train d’écrire ici…</span></div>');
area.innerHTML=rows.join("");area.classList.toggle("active",rows.length>0);
}
function transmit(active){
if(!myId)return;const packet={type:"v102Typing",playerId:myId,name:myName,active:!!active,time:clock()};
if(isHost)receiveTyping(packet,true);else{const c=Object.values(connections)[0];if(c&&c.open)c.send(packet);}
}
function beginTyping(){
if(!localActive){localActive=true;transmit(true);clearInterval(heartbeat);heartbeat=setInterval(()=>localActive&&transmit(true),2200);}
clearTimeout(idleTimer);idleTimer=setTimeout(endTyping,1600);
}
function endTyping(){clearTimeout(idleTimer);clearInterval(heartbeat);heartbeat=null;if(localActive){localActive=false;transmit(false);}}
function receiveTyping(data,fromHostLocal){
const id=String(data.playerId||"");if(!id)return;
if(data.active)liveTypers.set(id,{name:(players[id]?.name||data.name||"Utilisateur").slice(0,20),seen:Date.now()});else liveTypers.delete(id);
drawTypers();
if(isHost){broadcast({type:"v102Typing",playerId:id,name:players[id]?.name||data.name,active:!!data.active,time:data.time||clock()});}
}
/* Délégation : fonctionne même si le champ du chat est recréé après la connexion. */
document.addEventListener("input",e=>{if(e.target&&e.target.id==="chatInput"){e.target.value.trim()?beginTyping():endTyping();}});
document.addEventListener("focusout",e=>{if(e.target&&e.target.id==="chatInput")endTyping();});
document.addEventListener("keydown",e=>{if(e.target&&e.target.id==="chatInput"&&e.key==="Enter")endTyping();});
const oldSubmitV102=chatSubmit;chatSubmit=function(){endTyping();return oldSubmitV102();};
const oldToggleV102=toggleChat;toggleChat=function(){if(chatState.open)endTyping();return oldToggleV102();};
const oldResetV102=resetConnection;resetConnection=function(){endTyping();liveTypers.clear();drawTypers();return oldResetV102();};
const oldHandleV102=handleData;handleData=function(data){if(data&&data.type==="v102Typing"){receiveTyping(data,false);return;}return oldHandleV102(data);};
window.addEventListener("beforeunload",endTyping);setInterval(drawTypers,1000);setTimeout(drawTypers,0);
document.title="Qui suis-je ? 🎮 — V17";
console.log("V10.2 terminée : indicateur de saisie visible en direct dans le chat pour chaque personne.");
})();
