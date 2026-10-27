/* Extrait de l'ancien index.html : <script id="v101-patch"> */
(function V101Patch(){
"use strict";
function exactTime(value){
if(/^\d{2}:\d{2}:\d{2}$/.test(String(value||"")))return String(value);
return new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
}
/* L'hôte fixe l'heure de référence à la seconde près avant diffusion. */
const previousRelay=relayChat;
relayChat=function(msg){if(msg&&!msg.time)msg.time=exactTime();return previousRelay(msg);};
/* Remplacement ciblé du rendu, sans modifier le transport ni la modération. */
addChatMessage=function(m){
buildChatUI();
const list=chatEl("chatList"); if(!list)return;
const div=document.createElement("div");
div.className="chatMsg"+(m.playerId===myId?" mine":"");
const head=document.createElement("div");head.className="chat-msg-head";
const name=document.createElement("b");name.className="chat-profile-link";name.textContent=m.name||"?";
if(m.playerId){name.title="Voir le profil détaillé";name.onclick=()=>openProfileV9(m.playerId);}
const time=document.createElement("time");time.className="chat-msg-time";time.textContent=exactTime(m.time);time.dateTime=new Date().toISOString();
const text=document.createElement("span");text.className="chat-msg-text";text.textContent=m.text||"";
head.append(name,time);div.append(head,text);list.appendChild(div);
while(list.children.length>80)list.removeChild(list.firstChild);
list.scrollTop=list.scrollHeight;
if(!chatState.open&&m.playerId!==myId){chatState.unread++;updateChatBadge();}
};
/* Garantit une heure présente dès l'envoi, y compris côté invité. */
const previousSubmit=chatSubmit;
chatSubmit=function(){return previousSubmit();};
const previousHandle=handleData;
handleData=function(data){if(data&&data.type==="chat"&&!data.time)data.time=exactTime();return previousHandle(data);};
function fixSoundPosition(){const sound=document.getElementById("soundToggle");if(sound){sound.title="Activer ou désactiver le son";sound.setAttribute("aria-label","Activer ou désactiver le son");}}
fixSoundPosition();setTimeout(fixSoundPosition,0);
document.title="Qui suis-je ? 🎮 — V17";
console.log("V10.1 terminée : heure HH:MM:SS en haut à droite de chaque message et correction du chevauchement du son.");
})();
