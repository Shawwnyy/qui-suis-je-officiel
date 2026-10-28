/* =========================================================
V7 — CHAT
========================================================= */
const chatState={open:false,unread:0,last:0,lastFrom:{}};
function chatEl(id){return document.getElementById(id);}
function buildChatUI(){
if(chatEl("chatPanel"))return;
const css=document.createElement("style");
css.id="uiV7";
css.textContent=`
@keyframes screenIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.screen.active{animation:screenIn .35s ease}
.answer{transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}
.answer:hover:not(:disabled){transform:translateY(-3px);filter:brightness(1.12);box-shadow:0 10px 26px rgba(0,0,0,.35)}
.btn:active{transform:scale(.98)}
button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid rgba(250,204,21,.7);outline-offset:2px}
.card{transition:box-shadow .25s ease}
::-webkit-scrollbar{width:9px;height:9px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22);border-radius:99px}
::-webkit-scrollbar-track{background:transparent}
#dock{position:fixed;right:12px;bottom:12px;z-index:1200;display:flex;flex-direction:column;gap:8px}
#dock button{width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(15,15,30,.85);color:#fff;font-size:20px;cursor:pointer;position:relative;backdrop-filter:blur(8px);box-shadow:0 8px 22px rgba(0,0,0,.4);transition:transform .15s}
#dock button:hover{transform:scale(1.1)}
#chatBadge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:99px;background:#ef4444;color:#fff;font-size:11px;font-weight:900;display:none;align-items:center;justify-content:center;padding:0 4px}
#chatPanel{position:fixed;right:70px;bottom:12px;z-index:1200;width:min(320px,calc(100vw - 90px));height:min(380px,60vh);display:none;flex-direction:column;border-radius:18px;background:rgba(12,12,26,.96);border:1px solid rgba(255,255,255,.18);box-shadow:0 20px 60px rgba(0,0,0,.6);overflow:hidden;color:#fff;font-family:inherit}
#chatPanel.open{display:flex}
#chatHead{padding:10px 14px;font-weight:900;font-size:14px;border-bottom:1px solid rgba(255,255,255,.12);display:flex;justify-content:space-between;align-items:center}
#chatList{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;font-size:13px}
.chatMsg{padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.08);max-width:92%;word-break:break-word}
.chatMsg.mine{align-self:flex-end;background:rgba(124,58,237,.45)}
.chatMsg b{display:block;font-size:11px;opacity:.7;margin-bottom:2px}
#chatForm{display:flex;gap:6px;padding:8px;border-top:1px solid rgba(255,255,255,.12)}
#chatInput{flex:1;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;padding:9px 10px;font-size:13px;min-width:0}
#chatSend{border:0;border-radius:10px;padding:0 14px;background:#7c3aed;color:#fff;font-weight:900;cursor:pointer}
#chatWarn{font-size:11px;color:#fca5a5;padding:0 12px 6px;min-height:14px}
`;
document.head.appendChild(css);
const dock=document.createElement("div");
dock.id="dock";
dock.innerHTML=
'<button id="dockChat" title="Chat" onclick="toggleChat()">💬<span id="chatBadge"></span></button>'+
'<button id="dockVoice" title="Voix" onclick="toggleVoice()">'+(voiceOn?"🔊":"🔇")+'</button>'+
'<button id="dockHof" title="Meilleures parties / export PDF" onclick="openHof()">🏆</button>';
document.body.appendChild(dock);
const panel=document.createElement("div");
panel.id="chatPanel";
panel.innerHTML=
'<div id="chatHead"><span>💬 Chat de la salle</span><button style="background:none;border:0;color:#fff;font-size:18px;cursor:pointer" onclick="toggleChat()">✕</button></div>'+
'<div id="chatList"></div><div id="chatWarn"></div>'+
'<div id="chatForm"><input id="chatInput" maxlength="140" placeholder="Écris un message… (langage correct !)" autocomplete="off"><button id="chatSend" onclick="chatSubmit()">➤</button></div>';
document.body.appendChild(panel);
chatEl("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")chatSubmit();});
}
function toggleChat(){
buildChatUI();
chatState.open=!chatState.open;
chatEl("chatPanel").classList.toggle("open",chatState.open);
if(chatState.open){
chatState.unread=0;
updateChatBadge();
chatEl("chatInput").focus();
const l=chatEl("chatList");
l.scrollTop=l.scrollHeight;
}
}
function updateChatBadge(){
const b=chatEl("chatBadge");
if(!b)return;
b.style.display=chatState.unread?"flex":"none";
b.textContent=chatState.unread>9?"9+":chatState.unread;
}
function addChatMessage(m){
buildChatUI();
const list=chatEl("chatList");
const div=document.createElement("div");
div.className="chatMsg"+(m.playerId===myId?" mine":"");
div.innerHTML="<b>"+escapeHTML(m.name||"?")+"</b>"+escapeHTML(m.text);
list.appendChild(div);
while(list.children.length>80)list.removeChild(list.firstChild);
list.scrollTop=list.scrollHeight;
if(!chatState.open&&m.playerId!==myId){
chatState.unread++;
updateChatBadge();
}
}
function chatWarn(text){
const w=chatEl("chatWarn");
if(!w)return;
w.textContent=text;
clearTimeout(window.__chatWarnT);
window.__chatWarnT=setTimeout(()=>{w.textContent="";},3500);
}
/* Un message d'une seule lettre (« a », « k », « 5 », « a ! »…) est supprimé automatiquement :
   jamais envoyé, jamais affiché, jamais compté dans les statistiques. Les mots de 2 lettres (« ok », « si ») passent. */
function isOneLetterMsg(text){
const core=Array.from(String(text==null?"":text).replace(/[\s\p{P}]/gu,""));
return core.length===1&&/[\p{L}\p{N}]/u.test(core[0]);
}
function chatSubmit(){
const input=chatEl("chatInput");
const raw=input.value.trim();
if(!raw)return;
if(isOneLetterMsg(raw)){
input.value="";
chatWarn("🗑️ Message d'une seule lettre supprimé automatiquement.");
return;
}
if(Date.now()-chatState.last<1200){
chatWarn("⏳ Doucement, un message à la fois.");
return;
}
const check=profanityCheck(raw);
if(check.blocked){
chatWarn("🚫 Message bloqué : langage interdit.");
return;
}
chatState.last=Date.now();
input.value="";
if(check.bad)chatWarn("⚠️ Des mots interdits ont été masqués.");
const msg={type:"chat",playerId:myId,name:myName,text:check.clean.slice(0,140)};
if(isHost){
relayChat(msg);
}else{
const connection=Object.values(connections)[0];
if(connection&&connection.open)connection.send(msg);
}
}
/* L'hôte re-vérifie, censure et rediffuse à tout le monde */
function relayChat(msg){
const p=players[msg.playerId];
const now=Date.now();
if(chatState.lastFrom[msg.playerId]&&now-chatState.lastFrom[msg.playerId]<700)return;
chatState.lastFrom[msg.playerId]=now;
const check=profanityCheck(String(msg.text||"").slice(0,140));
if(check.blocked||!check.clean.trim()||isOneLetterMsg(check.clean))return;
const out={type:"chat",playerId:msg.playerId,name:p?p.name:String(msg.name||"?").slice(0,12),text:check.clean};
addChatMessage(out);
broadcast(out);
}
const __handleDataV7=handleData;
handleData=function(data){
if(data&&data.type==="chat"){
if(isHost){
if(data.playerId!==myId)relayChat(data);
}else if(!isOneLetterMsg(data.text)){
addChatMessage(data);
}
return;
}
return __handleDataV7(data);
};
