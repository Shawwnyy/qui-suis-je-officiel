/* Extrait de l'ancien index.html : <script id="v103-patch"> */
(function V103Patch(){
"use strict";
const remoteTypers=new Map();let active=false,idle=null,pulse=null;
function liveBox(){
buildChatUI();const panel=chatEl("chatPanel"),form=chatEl("chatForm");if(!panel||!form)return null;
let box=document.getElementById("v103TypingLive");if(!box){box=document.createElement("div");box.id="v103TypingLive";box.setAttribute("aria-live","polite");panel.insertBefore(box,form);}return box;
}
function paint(){
const box=liveBox();if(!box)return;const now=Date.now();
for(const [id,item] of remoteTypers){if(now-item.last>6000||id===String(myId))remoteTypers.delete(id);}
const html=[...remoteTypers.values()].map(item=>'<div class="v103-typing-person"><span class="v103-typing-dots"><i></i><i></i><i></i></span><span>@'+escapeHTML(item.name)+' est en train d’écrire ici…</span></div>').join("");
box.innerHTML=html;box.classList.toggle("show",!!html);
}
function sendState(on){
if(!myId)return;const data={type:"typingV103",playerId:String(myId),name:String(myName||"Utilisateur").slice(0,20),active:!!on,stamp:Date.now()};
if(isHost){accept(data);}else{const host=Object.values(connections).find(c=>c&&c.open);if(host)host.send(data);}
}
function begin(){if(!active){active=true;sendState(true);clearInterval(pulse);pulse=setInterval(()=>active&&sendState(true),2000);}clearTimeout(idle);idle=setTimeout(stop,1900);}
function stop(){clearTimeout(idle);clearInterval(pulse);pulse=null;if(active){active=false;sendState(false);}}
function accept(data){
const id=String(data.playerId||"");if(!id)return;
if(data.active)remoteTypers.set(id,{name:String(players[id]?.name||data.name||"Utilisateur").slice(0,20),last:Date.now()});else remoteTypers.delete(id);
paint();
/* L'hôte relaie l'état à chaque autre connexion. */
if(isHost)broadcast({type:"typingV103",playerId:id,name:players[id]?.name||data.name,active:!!data.active,stamp:data.stamp||Date.now()});
}
/* Capture en phase haute, fiable même si le champ est généré plus tard. */
document.addEventListener("input",function(e){if(e.target?.id!=="chatInput")return;e.target.value.trim()?begin():stop();},true);
document.addEventListener("keyup",function(e){if(e.target?.id==="chatInput"&&e.target.value.trim())begin();},true);
document.addEventListener("focusout",function(e){if(e.target?.id==="chatInput")stop();},true);
document.addEventListener("click",function(e){if(e.target?.id==="chatSend")stop();},true);
const baseSubmit103=chatSubmit;chatSubmit=function(){stop();return baseSubmit103();};
const baseHandle103=handleData;handleData=function(data){if(data?.type==="typingV103"){accept(data);return;}return baseHandle103(data);};
const baseReset103=resetConnection;resetConnection=function(){stop();remoteTypers.clear();paint();return baseReset103();};
window.addEventListener("beforeunload",stop);setInterval(paint,1000);setTimeout(liveBox,0);
document.title="Qui suis-je ? 🎮 — V17";
console.log("V10.3 : indicateur de saisie multijoueur corrigé dans une zone indépendante.");
})();
