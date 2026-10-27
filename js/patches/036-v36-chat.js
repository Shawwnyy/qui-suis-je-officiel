/* Extrait de l'ancien index.html : <script id="v36-chat"> */
/* V36 — Chat rapide : affichage instantané, @pseudo, modifier / supprimer ses messages,
l'hôte peut modifier ou supprimer tous les messages. Couche ajoutée en dernier : elle
remplace l'envoi, le relais et l'affichage du chat sans toucher au reste du jeu. */
(function V36Chat(){
"use strict";
const MAX=140;
const S={msgs:new Map(),gone:new Set(),seq:0,last:0,lastFrom:{},editing:null,armed:null,armT:0};
window.v36Chat=S;
const adm=()=>window.v12AdminState||{muted:new Set(),chatLocked:false,messages:new Map(),filterHits:0,deleted:0};
const stamp=()=>new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
const okTime=t=>/^\d{2}:\d{2}:\d{2}$/.test(String(t||""));
const cleanId=id=>String(id||"").replace(/[^\w-]/g,"").slice(0,48);
const newId=()=>"c"+String(myId||"x").replace(/[^\w-]/g,"").slice(0,14)+"-"+Date.now().toString(36)+"-"+(++S.seq).toString(36);
const nameOf=(pid,fb)=>{const p=(typeof players==="object"&&players)?players[pid]:null;return String((p&&p.name)||fb||"?").slice(0,24);};
const canEdit=m=>!!m&&(isHost||m.playerId===myId);
const warn=t=>{try{chatWarn(t);}catch(e){}};
function toHost(data){if(isHost)return false;const c=Object.values(connections||{}).find(x=>x&&x.open);if(!c)return false;try{c.send(data);return true;}catch(e){return false;}}
function connected(){return isHost||Object.values(connections||{}).some(c=>c&&c.open);}
/* Modération stricte : le message BRUT (retours à la ligne compris) est analysé avant toute simplification,
   puis le texte final qui sera réellement affiché est analysé une seconde fois. */
function strictCheck(t){try{if(window.Moderation){const v=window.Moderation.check(t);if(v&&v.blocked)return v;}}catch(e){}return null;}
function filter(text){
const rawIn=String(text==null?"":text);
const v0=strictCheck(rawIn);if(v0)return{ok:false,why:"blocked",reason:v0.reason,label:v0.label};
const raw=rawIn.replace(/\s+/g," ").trim().slice(0,MAX);
if(!raw)return{ok:false,why:"empty"};
let chk;try{chk=profanityCheck(raw);}catch(e){chk={clean:raw};}
if(chk&&chk.blocked)return{ok:false,why:"blocked",reason:"insulte",label:"langage interdit"};
const clean=String((chk&&chk.clean)||raw).slice(0,MAX).trim();
if(!clean)return{ok:false,why:"empty"};
const v1=strictCheck(clean);if(v1)return{ok:false,why:"blocked",reason:v1.reason,label:v1.label};
return{ok:true,text:clean,masked:!!(chk&&chk.bad)};
}
/* Sanctions (hôte) : 1er message bloqué = avertissement, puis sourdine 1 min, 5 min, 15 min. */
const autoMutes=new Map();
function fmtMs(ms){return ms>=60000?Math.round(ms/60000)+" min":Math.round(ms/1000)+" s";}
function autoMute(pid,ms){
const A=adm();if(!A.muted||!A.muted.add)return;
const was=A.muted.has(pid);A.muted.add(pid);
const until=Date.now()+ms;autoMutes.set(pid,until);
setTimeout(()=>{if(autoMutes.get(pid)!==until)return;autoMutes.delete(pid);if(was)return;try{A.muted.delete(pid);}catch(e){}try{sendTo(pid,{type:"v12Notice",message:"🔊 Tu peux de nouveau écrire dans le chat. Reste correct !"});}catch(e){}},ms);
}
/* Traite un message supprimé par la modération : journal, sanction, avertissements. `tell(texte)` prévient l'auteur. */
function moderate(pid,p,id,text,f,tell){
const A=adm();A.filterHits=(A.filterHits||0)+1;
const label=f.label||"langage interdit";
archive({id,playerId:pid,name:(p&&p.name)||"?",text:String(text||"")},"blocked","Modération stricte : "+label);
let note="🚫 Message supprimé : "+label+".",extra="";
if(pid!==myId){
let st=null;try{st=window.Moderation&&window.Moderation.strike(pid);}catch(e){}
if(st&&st.muteMs){autoMute(pid,st.muteMs);note+=" Avertissement n°"+st.count+" : tu es en sourdine pendant "+fmtMs(st.muteMs)+".";extra=" — mis en sourdine "+fmtMs(st.muteMs);}
else if(st)note+=" Premier avertissement : au prochain message interdit, tu seras mis en sourdine.";
warn("🛡️ Modération : message de "+((p&&p.name)||"?")+" supprimé ("+label+")"+extra+".");
}
try{tell(note);}catch(e){}
}
/* Historique hôte (rapport V13) et activité de profil (V10). */
function archive(m,status,reason){
if(!isHost||!Array.isArray(window.v13ChatArchive))return;
const A=window.v13ChatArchive;let e=A.find(x=>x.id===m.id);
if(!e){e={id:m.id,time:m.time||stamp(),at:new Date().toISOString(),playerId:String(m.playerId||""),name:String(m.name||"Utilisateur").slice(0,30),text:String(m.text||"").slice(0,220),status:"published",reason:""};A.push(e);if(A.length>500)A.splice(0,A.length-500);}
e.text=String(m.text||e.text).slice(0,220);e.status=status||e.status;e.reason=reason||e.reason;if(status!=="published")e.moderatedAt=new Date().toISOString();
}
function track(m){try{const act=window.v10ProfileActivity;if(!act||!m.playerId)return;const a=act[m.playerId]||(act[m.playerId]={firstSeen:Date.now(),messages:0,lastMessage:null});a.messages++;a.lastMessage=m.time;}catch(e){}}
/* ---------- Affichage ---------- */
function list(){try{buildChatUI();}catch(e){}return chatEl("chatList");}
function node(id){const L=chatEl("chatList");return L?L.querySelector('.chatMsg[data-mid="'+CSS.escape(id)+'"]'):null;}
function btn(label,title,fn,cls){const b=document.createElement("button");b.type="button";b.className="v36-act"+(cls?" "+cls:"");b.textContent=label;b.title=title;b.setAttribute("aria-label",title);b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();fn();});return b;}
function render(m,allowCreate){
const L=list();if(!L)return;
let div=node(m.id);const isNew=!div;
if(isNew&&!allowCreate){S.msgs.delete(m.id);return;}
if(isNew){div=document.createElement("div");div.dataset.mid=m.id;}
div.className="chatMsg v36-msg"+(m.playerId===myId?" mine":"")+(m.pending?" v36-pending":"")+(m.failed?" v36-failed":"")+(S.editing===m.id?" v36-editing":"");
div.textContent="";
const head=document.createElement("div");head.className="chat-msg-head";
const name=document.createElement("b");name.className="chat-profile-link";name.textContent="@"+(m.name||"?");
if(m.playerId&&typeof openProfileV9==="function"){name.title="Voir le profil";name.onclick=()=>openProfileV9(m.playerId);}
const time=document.createElement("time");time.className="chat-msg-time";time.textContent=m.time||"";
head.append(name,time);
const body=document.createElement("span");body.className="chat-msg-text";body.textContent=m.text;
div.append(head,body);
const foot=document.createElement("div");foot.className="v36-foot";
if(m.failed){const f=document.createElement("small");f.className="v36-note v36-bad";f.textContent="⚠️ non reçu par l’hôte";foot.appendChild(f);}
else if(m.edited){const e=document.createElement("small");e.className="v36-note";e.textContent=m.editedBy&&m.editedBy!==m.playerId?"modifié par l’hôte":"modifié";foot.appendChild(e);}
if(canEdit(m)){
const armed=S.armed===m.id;
foot.append(btn("✏️","Modifier le message",()=>startEdit(m.id)),btn(armed?"Supprimer ?":"🗑️",armed?"Confirmer la suppression":"Supprimer le message",()=>askDelete(m.id),armed?"armed":""));
}
if(foot.childNodes.length)div.appendChild(foot);
if(isNew){
const atBottom=L.scrollHeight-L.scrollTop-L.clientHeight<80;
L.appendChild(div);
while(L.children.length>150){const f=L.firstElementChild;if(f&&f.dataset&&f.dataset.mid)S.msgs.delete(f.dataset.mid);L.removeChild(f);}
if(atBottom||m.playerId===myId)L.scrollTop=L.scrollHeight;
}
}
function removeLocal(id){S.gone.add(id);const m=S.msgs.get(id);S.msgs.delete(id);try{adm().messages.delete(id);}catch(e){}const n=node(id);if(n)n.remove();if(S.editing===id)cancelEdit();if(S.armed===id)S.armed=null;return m;}
/* Réception d'un message publié (chez tous) ou confirmation de son propre message. */
addChatMessage=function(m){
if(!m)return;
const id=cleanId(m.id)||newId();
if(S.gone.has(id))return;
if(m.playerId!==myId&&strictCheck(m.text)){S.gone.add(id);removeLocal(id);return;}   /* suppression instantanée (défense en profondeur) */
const ex=S.msgs.get(id);
const msg={id,playerId:String(m.playerId||""),name:String(m.name||nameOf(m.playerId)).slice(0,24),text:String(m.text||"").slice(0,MAX),time:okTime(m.time)?m.time:stamp(),edited:!!m.edited,editedBy:String(m.editedBy||""),pending:false,failed:false};
if(ex){
/* Écho de l'hôte : on confirme sans écraser une modification locale déjà faite. */
const keepText=ex.localEdit?ex.text:msg.text;Object.assign(ex,msg,{text:keepText,edited:ex.edited||msg.edited,editedBy:ex.editedBy||msg.editedBy});delete ex.localEdit;render(ex,true);return;
}
if(!msg.text)return;
S.msgs.set(id,msg);try{adm().messages.set(id,msg);}catch(e){}
track(msg);archive(msg,"published");render(msg,true);
if(msg.playerId!==myId&&!chatState.open){chatState.unread++;try{updateChatBadge();}catch(e){}}
};
/* Hôte : vérifie et rediffuse en gardant l'identifiant choisi par l'auteur. */
relayChat=function(msg){
if(!isHost||!msg)return;
const pid=String(msg.playerId||"");const p=players&&players[pid];if(!p)return;
const id=cleanId(msg.id)||newId();
const ex=S.msgs.get(id);if(S.gone.has(id)||(ex&&!ex.pending))return;
const A=adm();
const reject=(t,blocked)=>{if(pid===myId){removeLocal(id);warn(t);}else sendTo(pid,{type:"v36ChatReject",id,message:t,blocked:!!blocked});};
if(A.chatLocked&&!p.host)return reject("🔒 Le chat est verrouillé par l’hôte.");
if(A.muted&&A.muted.has&&A.muted.has(pid))return reject("🔇 Tu as été mis en sourdine par l’hôte.");
const now=Date.now();if(pid!==myId){const h=(S.lastFrom[pid]||[]).filter(x=>now-x<3000);if(h.length>=10){S.lastFrom[pid]=h;return reject("⏳ Trop de messages d’un coup, patiente un instant.");}h.push(now);S.lastFrom[pid]=h;}
const f=filter(msg.text);
if(!f.ok){if(f.why==="blocked")return moderate(pid,p,id,msg.text,f,t=>reject(t,true));return reject("Message vide.");}
const out={type:"chat",id,playerId:pid,name:p.name,text:f.text,time:okTime(msg.time)?msg.time:stamp()};
addChatMessage(out);broadcast(out);
};
/* ---------- Envoi ---------- */
function clearInput(){const i=chatEl("chatInput");if(!i)return;i.value="";try{i.dispatchEvent(new Event("input",{bubbles:true}));}catch(e){}}
chatSubmit=function(){
const input=chatEl("chatInput");if(!input)return;
if(S.editing)return submitEdit();
const raw=input.value;if(!raw.trim())return;
const A=adm();
if(A.chatLocked&&!isHost){warn("🔒 Le chat est verrouillé par l’hôte.");return;}
if(A.muted&&A.muted.has&&A.muted.has(myId)){warn("🔇 Vous êtes en sourdine.");return;}
const now=Date.now();if(now-S.last<350){warn("⏳ Doucement, un message à la fois.");return;}
const f=filter(raw);if(!f.ok){if(f.why==="blocked"){clearInput();warn("🚫 Message supprimé : "+(f.label||"langage interdit")+".");if(!isHost)toHost({type:"v36ChatViolation",playerId:myId,text:String(raw).slice(0,400),time:stamp()});}return;}
if(!connected()){warn("📡 Pas de connexion à l’hôte : message non envoyé.");return;}
S.last=now;if(f.masked)warn("⚠️ Des mots interdits ont été masqués.");
const m={type:"chat",id:newId(),playerId:myId,name:nameOf(myId,myName),text:f.text,time:stamp()};
clearInput();try{input.focus({preventScroll:true});}catch(e){}
if(isHost){relayChat(m);return;}
const local={id:m.id,playerId:m.playerId,name:m.name,text:m.text,time:m.time,pending:true};
S.msgs.set(local.id,local);track(local);render(local,true);
if(!toHost(m)){local.pending=false;local.failed=true;render(local,true);return;}
setTimeout(()=>{const x=S.msgs.get(local.id);if(x&&x.pending){x.pending=false;x.failed=true;render(x,true);}},8000);
};
/* ---------- Modification ---------- */
function editBar(m){
const form=chatEl("chatForm");if(!form)return;
let bar=document.getElementById("v36EditBar");
if(!bar){bar=document.createElement("div");bar.id="v36EditBar";form.parentNode.insertBefore(bar,form);}
bar.textContent="";
const t=document.createElement("span");t.textContent=m.playerId===myId?"✏️ Modification de ton message":"✏️ Modification du message de @"+m.name;
bar.append(t,btn("Annuler","Annuler la modification",cancelEdit,"v36-cancel"));
bar.style.display="flex";
const send=chatEl("chatSend");if(send){send.textContent="✔";send.title="Enregistrer la modification";}
}
function hideBar(){const bar=document.getElementById("v36EditBar");if(bar)bar.style.display="none";const send=chatEl("chatSend");if(send){send.textContent="➤";send.title="Envoyer";}}
function startEdit(id){
const m=S.msgs.get(id);if(!canEdit(m))return;
const A=adm();if(!isHost&&(A.chatLocked||(A.muted&&A.muted.has&&A.muted.has(myId)))){warn("🔒 Modification impossible pour le moment.");return;}
const prev=S.editing;S.editing=id;S.armed=null;
if(prev&&prev!==id){const pm=S.msgs.get(prev);if(pm)render(pm,false);}
if(!chatState.open){try{toggleChat();}catch(e){}}
const input=chatEl("chatInput");if(!input)return;
input.value=m.text;editBar(m);render(m,false);
try{input.focus();input.setSelectionRange(input.value.length,input.value.length);}catch(e){}
}
function cancelEdit(){const id=S.editing;S.editing=null;hideBar();clearInput();const m=id&&S.msgs.get(id);if(m)render(m,false);}
function submitEdit(){
const id=S.editing,m=S.msgs.get(id),input=chatEl("chatInput");
if(!canEdit(m)||!input){cancelEdit();return;}
const A=adm();
if(!isHost&&A.chatLocked){warn("🔒 Le chat est verrouillé par l’hôte.");return;}
if(!isHost&&A.muted&&A.muted.has&&A.muted.has(myId)){warn("🔇 Vous êtes en sourdine.");return;}
const f=filter(input.value);
if(!f.ok){warn(f.why==="blocked"?"🚫 Modification bloquée : langage interdit.":"✏️ Message vide : utilise 🗑️ pour le supprimer.");return;}
if(f.text===m.text){cancelEdit();return;}
S.editing=null;hideBar();clearInput();
if(isHost){hostEdit({id,text:f.text,by:myId},true);return;}
m.text=f.text;m.edited=true;m.editedBy=myId;if(m.pending)m.localEdit=true;render(m,false);
toHost({type:"v36ChatEdit",id,text:f.text,by:myId});
}
function hostEdit(d,privileged){
if(!isHost)return;
const id=cleanId(d.id),m=S.msgs.get(id),by=String(d.by||"");if(!m)return;
const allowed=privileged||(by&&by!==myId&&by===m.playerId);
const revert=()=>{if(!privileged&&by)sendTo(by,{type:"v36ChatEdit",id,text:m.text,edited:m.edited,editedBy:m.editedBy});};
if(!allowed){revert();return;}
const A=adm();
if(!privileged&&(A.chatLocked||(A.muted&&A.muted.has&&A.muted.has(by)))){revert();sendTo(by,{type:"v12Notice",message:"🔒 Modification impossible pour le moment."});return;}
const f=filter(d.text);
if(!f.ok){revert();if(f.why==="blocked"&&!privileged){moderate(by,players&&players[by],"edit-"+id+"-"+Date.now().toString(36),d.text,f,t=>sendTo(by,{type:"v12Notice",message:t.replace("Message supprimé","Modification refusée")}));}else if(!privileged)sendTo(by,{type:"v12Notice",message:"✏️ Message vide."});else warn(f.why==="blocked"?"🚫 Modification bloquée : "+(f.label||"langage interdit")+".":"✏️ Message vide.");return;}
m.text=f.text;m.edited=true;m.editedBy=privileged?myId:by;
render(m,false);archive(m,"published",privileged&&m.playerId!==myId?"Modifié par l’hôte":"Modifié par l’auteur");
broadcast({type:"v36ChatEdit",id,text:m.text,edited:true,editedBy:m.editedBy});
}
function applyEdit(d){
const id=cleanId(d.id),m=S.msgs.get(id);if(!m)return;
if(strictCheck(d.text)){S.gone.add(id);removeLocal(id);return;}   /* modification interdite : le message disparaît */
m.text=String(d.text||m.text).slice(0,MAX);m.edited=!!d.edited;m.editedBy=String(d.editedBy||"");delete m.localEdit;
if(S.editing===id&&d.editedBy&&d.editedBy!==myId){cancelEdit();warn("✏️ L’hôte vient de modifier ce message.");}
render(m,false);
}
/* ---------- Suppression (deux touches pour éviter les erreurs) ---------- */
function askDelete(id){
const m=S.msgs.get(id);if(!canEdit(m))return;
if(S.armed!==id){const prev=S.armed;S.armed=id;clearTimeout(S.armT);if(prev){const pm=S.msgs.get(prev);if(pm)render(pm,false);}render(m,false);S.armT=setTimeout(()=>{if(S.armed===id){S.armed=null;const x=S.msgs.get(id);if(x)render(x,false);}},3000);return;}
S.armed=null;clearTimeout(S.armT);
if(isHost){hostDelete({id,by:myId},true);return;}
removeLocal(id);toHost({type:"v36ChatDelete",id,by:myId});
}
function hostDelete(d,privileged){
if(!isHost)return;
const id=cleanId(d.id),m=S.msgs.get(id),by=String(d.by||"");
if(!m){if(!privileged)S.gone.add(id);return;}
const allowed=privileged||(by&&by!==myId&&by===m.playerId);if(!allowed)return;
removeLocal(id);const A=adm();A.deleted=(A.deleted||0)+1;
archive(m,"deleted",privileged&&m.playerId!==myId?"Supprimé par l’hôte":"Supprimé par l’auteur");
broadcast({type:"v36ChatDelete",id});
}
/* ---------- Réseau ---------- */
const prevHandle=handleData;
handleData=function(data){
const t=data&&data.type;
if(t==="chat"){if(isHost){if(data.playerId!==myId)relayChat(data);}else addChatMessage(data);return;}
if(t==="v36ChatEdit"){if(isHost)hostEdit(data,false);else applyEdit(data);return;}
if(t==="v36ChatDelete"){if(isHost)hostDelete(data,false);else removeLocal(cleanId(data.id));return;}
if(t==="v36ChatReject"){if(!isHost){const m=removeLocal(cleanId(data.id));warn(String(data.message||"Message refusé."));const i=chatEl("chatInput");if(m&&i&&!i.value&&!S.editing&&!data.blocked)i.value=m.text;}return;}
if(t==="v36ChatViolation"){if(isHost){const pid=String(data.playerId||""),pl=players&&players[pid];if(pl&&pid!==myId){const f=filter(data.text);if(!f.ok&&f.why==="blocked")moderate(pid,pl,"viol-"+Date.now().toString(36),data.text,f,tx=>sendTo(pid,{type:"v12Notice",message:tx}));}}return;}
if(t==="v12ClearChat"){S.msgs.clear();if(S.editing)cancelEdit();}
if(t==="v12DeleteMessage"&&data.id){removeLocal(cleanId(data.id));return;}
return prevHandle(data);
};
/* Champ de saisie : touche Entrée « Envoyer » sur mobile, Échap pour annuler une modification. */
function prepInput(){
const i=chatEl("chatInput");if(!i||i.dataset.v36)return;
i.dataset.v36="1";i.setAttribute("enterkeyhint","send");i.maxLength=MAX;
i.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.editing){e.preventDefault();cancelEdit();}});
}
const prevBuild=buildChatUI;
buildChatUI=function(){const r=prevBuild.apply(this,arguments);prepInput();return r;};
setTimeout(()=>{try{buildChatUI();}catch(e){}},0);
window.v36ChatEdit=startEdit;window.v36ChatDelete=askDelete;window.v36ChatCancel=cancelEdit;
document.title=document.title.replace(/V\d+(\.\d+)?/,"V36");
console.log("V36 chargée : chat instantané, @pseudo, modification et suppression des messages.");
})();
/* V36.1 — iPhone : le panneau du chat remonte au-dessus du clavier. */
(function(){
"use strict";
const vv=window.visualViewport;if(!vv)return;
function place(){
const p=document.getElementById("chatPanel");if(!p)return;
const kb=window.innerHeight-(vv.height+vv.offsetTop);
if(chatState&&chatState.open&&kb>100&&window.innerWidth<=700){
p.style.setProperty("bottom",(kb+6)+"px","important");
p.style.setProperty("max-height",Math.max(160,vv.height-12)+"px","important");
const l=document.getElementById("chatList");if(l)l.scrollTop=l.scrollHeight;
}else{p.style.removeProperty("bottom");p.style.removeProperty("max-height");}
}
vv.addEventListener("resize",place);vv.addEventListener("scroll",place);
document.addEventListener("focusin",e=>{if(e.target&&e.target.id==="chatInput"){setTimeout(place,80);setTimeout(place,400);}});
document.addEventListener("focusout",e=>{if(e.target&&e.target.id==="chatInput")setTimeout(place,250);});
})();
