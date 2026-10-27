/* Extrait de l'ancien index.html : <script id="v362-script"> */
/* V36.2 — Chat : vrai bouton « Fermer » (mobile compris).
Musique : l'hôte lance une musique YouTube pour toute la salle, avec une règle de respect. */
(function V362(){
"use strict";
const RULE="Interdit : toute musique à caractère sexuel, raciste, haineux, violent, discriminatoire ou insultant. L’hôte est responsable de la musique qu’il lance.";
const M={id:"",title:"",start:0,by:"",on:false,mutedLocal:false,small:false,reports:0,reportedBy:new Set(),iReported:false};
window.v362Music=M;
M.vol=(()=>{try{const v=parseInt(localStorage.getItem("v362Vol"),10);return isFinite(v)?Math.max(0,Math.min(100,v)):70;}catch(e){return 70;}})();
const $=id=>document.getElementById(id);
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function hostName(){const h=Object.values(players||{}).find(p=>p&&p.host);return h?h.name:"l’hôte";}
function toHost(d){if(isHost)return;const c=Object.values(connections||{}).find(x=>x&&x.open);if(c)try{c.send(d);}catch(e){}}
/* ================= CHAT : fermeture fiable ================= */
function closeChat(){if(chatState.open){try{toggleChat();}catch(e){}}}
function ensureBar(){
try{buildChatUI();}catch(e){}
const p=chatEl("chatPanel"),head=chatEl("chatHead");if(!p||!head)return;
p.classList.toggle("v362-host",!!isHost);p.classList.toggle("v362-guest",!isHost);
let bar=$("v362Bar");
if(!bar){
bar=document.createElement("div");bar.id="v362Bar";
const close=document.createElement("button");close.type="button";close.id="v362Close";close.textContent="✕ Fermer le chat";close.setAttribute("aria-label","Fermer le chat");
close.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();closeChat();});
const music=document.createElement("button");music.type="button";music.id="v362MusicBtn";music.textContent="🎵 Musique";music.setAttribute("aria-label","Musique de la partie");
music.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openMusicModal();});
bar.append(close,music);
}
if(bar.parentNode!==p||bar.previousElementSibling!==head)p.insertBefore(bar,head.nextSibling);
$("v362MusicBtn").hidden=!isHost;
}
const prevToggle=toggleChat;
toggleChat=function(){const r=prevToggle.apply(this,arguments);try{ensureBar();}catch(e){}return r;};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&chatState.open&&!(window.v36Chat&&window.v36Chat.editing)&&!$("v362Modal")?.classList.contains("show"))closeChat();});
setTimeout(ensureBar,120);
/* ================= MUSIQUE ================= */
function parseYouTube(url){
let s=String(url||"").trim();if(!s)return null;
/* Lien collé au milieu d'un texte : on extrait la première adresse. */
const found=s.match(/(?:https?:\/\/)?(?:[\w-]+\.)*(?:youtube(?:-nocookie)?\.com|youtu\.be)\/[^\s"'<>]*/i);if(found)s=found[0];
let id="",start=0;
try{
const u=new URL(/^https?:\/\//i.test(s)?s:"https://"+s);
const h=u.hostname.toLowerCase().replace(/^(www|m|music)\./,"");
if(h==="youtu.be")id=u.pathname.slice(1).split("/")[0];
else if(/(^|\.)youtube(-nocookie)?\.com$/.test(h)){
if(u.pathname==="/watch"||u.pathname==="/watch/")id=u.searchParams.get("v")||"";
else{const m=u.pathname.match(/^\/(?:embed|shorts|live|v|e)\/([^/?#]+)/);if(m)id=m[1];}
}
const t=u.searchParams.get("t")||u.searchParams.get("start")||"";
if(t){const m=String(t).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);if(m)start=(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0);}
}catch(e){}
if(!id){const m=s.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);if(m)id=m[1];}
if(!id&&/^[A-Za-z0-9_-]{11}$/.test(s))id=s;
id=String(id||"").slice(0,11);
if(!/^[A-Za-z0-9_-]{11}$/.test(id))return null;
return{id,start:Math.min(start,36000)};
}
window.v362ParseYouTube=parseYouTube;
const LOCAL=!/^https?:$/.test(location.protocol);
const ORIGIN=LOCAL?"":location.origin;
function src(){return "https://www.youtube.com/embed/"+M.id+"?autoplay=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist="+M.id+"&enablejsapi=1"+(ORIGIN?"&origin="+encodeURIComponent(ORIGIN):"")+(M.start?"&start="+M.start:"");}
const ERR={2:"Lien invalide.",5:"Lecture impossible sur cet appareil.",100:"Vidéo introuvable ou privée.",101:"Le propriétaire interdit la lecture hors de YouTube (souvent les clips officiels) : choisis une autre version (audio, lyrics…).",150:"Le propriétaire interdit la lecture hors de YouTube (souvent les clips officiels) : choisis une autre version (audio, lyrics…).",153:"YouTube refuse la lecture quand le jeu est ouvert en fichier local : ouvre le jeu depuis un site (https) ou utilise « Écouter sur YouTube »."};
let api=null,apiWait=[];
function loadApi(cb){
if(window.YT&&window.YT.Player){cb(true);return;}
apiWait.push(cb);if(api)return;
api=document.createElement("script");api.src="https://www.youtube.com/iframe_api";api.async=true;
const prev=window.onYouTubeIframeAPIReady;
window.onYouTubeIframeAPIReady=function(){try{if(typeof prev==="function")prev();}catch(e){}const w=apiWait;apiWait=[];w.forEach(f=>f(true));};
api.onerror=()=>{const w=apiWait;apiWait=[];api=null;w.forEach(f=>f(false));};
document.head.appendChild(api);
setTimeout(()=>{if(apiWait.length&&!(window.YT&&window.YT.Player)){const w=apiWait;apiWait=[];w.forEach(f=>f(false));}},5000);
}
let yt=null,ytFor="",playT=0;
function note(text,kind){const w=$("v362Player");if(!w)return;const n=w.querySelector(".v362-msg");if(!n)return;n.textContent=text||"";n.className="v362-msg"+(kind?" "+kind:"");n.hidden=!text;}
function showStart(on){const w=$("v362Player");if(!w)return;const b=w.querySelector(".v362-go");if(b)b.hidden=!on;}
function reportErr(code){const msg=ERR[code]||("Erreur YouTube "+code+".");note("⚠️ "+msg,"bad");showStart(false);if(!isHost)toHost({type:"v362MusicError",id:M.id,code,by:myId});}
function destroyYt(){try{if(yt&&yt.destroy)yt.destroy();}catch(e){}yt=null;ytFor="";clearTimeout(playT);}
function plainFrame(f){
const ifr=document.createElement("iframe");ifr.dataset.vid=M.id;ifr.src=src();ifr.title="Musique YouTube de la partie";
ifr.allow="autoplay; encrypted-media; picture-in-picture";ifr.referrerPolicy="strict-origin-when-cross-origin";ifr.setAttribute("allowfullscreen","");
f.textContent="";f.appendChild(ifr);
}
function makeFrame(f){
destroyYt();f.textContent="";
const holder=document.createElement("div");holder.className="v362-yt";holder.dataset.vid=M.id;f.appendChild(holder);
const want=M.id;
if(LOCAL)note("ℹ️ Jeu ouvert en fichier local : si la vidéo ne se lance pas, utilise « Écouter sur YouTube ».","");
loadApi(ok=>{
if(M.id!==want||M.mutedLocal||!M.on)return;
if(!ok){plainFrame(f);showStart(false);return;}
try{
ytFor=want;
yt=new YT.Player(holder,{videoId:want,host:"https://www.youtube.com",width:"100%",height:"100%",
playerVars:Object.assign({autoplay:1,playsinline:1,rel:0,modestbranding:1,loop:1,playlist:want,start:M.start||0},ORIGIN?{origin:ORIGIN}:{}),
events:{
onReady:e=>{grabTitle(e.target);try{e.target.setVolume(M.vol);e.target.unMute();e.target.playVideo();}catch(x){}
clearTimeout(playT);playT=setTimeout(()=>{try{if(yt&&yt.getPlayerState&&yt.getPlayerState()!==1){showStart(true);note("🔈 Ton navigateur bloque le son automatique : touche « ▶️ Lancer le son ».","");}}catch(x){}},2500);},
onStateChange:e=>{if(e.data===1){showStart(false);note("","");grabTitle(e.target);}},
onError:e=>reportErr(e.data)
}});
const ifr=f.querySelector("iframe");if(ifr){ifr.dataset.vid=want;ifr.setAttribute("allow","autoplay; encrypted-media; picture-in-picture");ifr.referrerPolicy="strict-origin-when-cross-origin";}
}catch(e){plainFrame(f);}
});
}
function startSound(){try{if(yt&&yt.playVideo){yt.unMute();yt.setVolume(M.vol);yt.playVideo();showStart(false);note("","");return;}}catch(e){}const f=$("v362Player")?.querySelector(".v362-frame");if(f)plainFrame(f);showStart(false);}
function player(){
let w=$("v362Player");
if(!w){
w=document.createElement("div");w.id="v362Player";w.setAttribute("role","region");w.setAttribute("aria-label","Musique de la partie");
w.innerHTML='<div class="v362-top"><b>🎵 Musique</b><span class="v362-who"></span><button type="button" class="v362-min" aria-label="Réduire le lecteur">▾</button></div>'+
'<div class="v362-frame"></div>'+
'<button type="button" class="v362-go" hidden>▶️ Lancer le son</button>'+
'<div class="v362-msg" hidden></div>'+
'<label class="v362-vol">🔉<input type="range" min="0" max="100" step="5" aria-label="Volume de la musique"></label>'+
'<div class="v362-rule">Règle : musique respectueuse uniquement</div>'+
'<div class="v362-row"><button type="button" class="v362-mute"></button><button type="button" class="v362-report">🚩 Signaler</button><button type="button" class="v362-stop">⏹️ Arrêter</button></div>'+
'<a class="v362-open" target="_blank" rel="noopener">🎧 Écouter sur YouTube ↗</a>';
document.body.appendChild(w);
w.querySelector(".v362-min").addEventListener("click",()=>{M.small=!M.small;paint();});
w.querySelector(".v362-mute").addEventListener("click",()=>{M.mutedLocal=!M.mutedLocal;paint(true);});
w.querySelector(".v362-stop").addEventListener("click",()=>{if(isHost)stopMusic();});
w.querySelector(".v362-report").addEventListener("click",reportMusic);
w.querySelector(".v362-go").addEventListener("click",startSound);
const vol=w.querySelector(".v362-vol input");vol.value=M.vol;vol.addEventListener("input",()=>{M.vol=+vol.value||0;try{localStorage.setItem("v362Vol",String(M.vol));}catch(e){}try{if(yt&&yt.setVolume)yt.setVolume(M.vol);}catch(e){}});
}
return w;
}
function paint(reload){
const w=player();
if(!M.on||!M.id){destroyYt();w.classList.remove("show");const f=w.querySelector(".v362-frame");f.textContent="";return;}
w.classList.add("show");w.classList.toggle("small",M.small);
w.querySelector(".v362-min").textContent=M.small?"▴":"▾";
const who=w.querySelector(".v362-who");who.textContent=(M.title?"« "+M.title+" » · ":"")+"par @"+(M.by||hostName());who.title=M.title||"";
w.querySelector(".v362-rule").title=RULE;
const mute=w.querySelector(".v362-mute");mute.textContent=M.mutedLocal?"🔊 Remettre pour moi":"🔇 Couper pour moi";
w.querySelector(".v362-stop").hidden=!isHost;
const rep=w.querySelector(".v362-report");rep.hidden=!!isHost;rep.disabled=M.iReported;rep.textContent=M.iReported?"🚩 Signalé":"🚩 Signaler";
if(isHost&&M.reports){w.querySelector(".v362-rule").textContent="🚩 "+M.reports+" signalement(s) : vérifie ta musique";w.classList.add("reported");}
else{w.querySelector(".v362-rule").textContent="Règle : musique respectueuse uniquement";w.classList.remove("reported");}
const a=w.querySelector(".v362-open");a.href="https://www.youtube.com/watch?v="+M.id+(M.start?"&t="+M.start+"s":"");
const f=w.querySelector(".v362-frame");
if(M.mutedLocal){destroyYt();f.textContent="";const n=document.createElement("div");n.className="v362-off";n.textContent="Musique coupée pour toi";f.appendChild(n);showStart(false);note("","");return;}
const cur=f.querySelector("[data-vid]");
if(cur&&cur.dataset.vid===M.id)return;
showStart(false);note("","");makeFrame(f);
}
function sysNote(text){
try{buildChatUI();}catch(e){}
const L=chatEl("chatList");if(!L)return;
const d=document.createElement("div");d.className="chatMsg v362-sys";d.textContent=text;L.appendChild(d);L.scrollTop=L.scrollHeight;
}
function state(){return{type:"v362Music",on:M.on,id:M.id,start:M.start,by:M.by,title:M.title};}
/* ---- Titre de la chanson : YouTube (oEmbed), sinon le lecteur ; l'hôte le partage à tous ---- */
let noteT=0,noteDone=true;
const RULE_SHORT=" Règle : aucune musique à caractère sexuel, raciste, haineux ou violent.";
function postNote(){
clearTimeout(noteT);if(noteDone||!M.on)return;noteDone=true;
sysNote("🎵 @"+(M.by||hostName())+(M.title?" a lancé « "+M.title+" ».":" a lancé une musique.")+RULE_SHORT);
}
function setTitle(t){
t=String(t||"").replace(/\s+/g," ").trim().slice(0,120);if(!t||!M.on||t===M.title)return;
M.title=t;paint();postNote();
try{const st=document.getElementById("v363Status");if(st&&M.on)st.textContent="🎶 En cours : « "+t+" »";}catch(e){}
if(isHost){try{broadcast(state());}catch(e){}
try{const f=window.v12AdvancedFilter&&window.v12AdvancedFilter(t);if(f&&f.blocked)chatWarn("⚠️ Le titre de cette musique contient des mots interdits : pense à la règle de la salle.");}catch(e){}}
}
function grabTitle(p){try{const d=p&&p.getVideoData&&p.getVideoData();if(d&&d.title)setTitle(d.title);}catch(e){}}
function fetchTitle(id){
if(!window.fetch)return;
const url="https://www.youtube.com/watch?v="+id;
const ok=j=>{if(M.id===id&&j&&j.title)setTitle(j.title);};
fetch("https://www.youtube.com/oembed?format=json&url="+encodeURIComponent(url)).then(r=>r.ok?r.json():Promise.reject()).then(ok)
.catch(()=>{});
}
function applyState(d){
const on=!!d.on&&/^[A-Za-z0-9_-]{11}$/.test(String(d.id||""));
const changed=on!==M.on||String(d.id||"")!==M.id;
if(!changed){if(on&&d.title)setTitle(d.title);return;}
const oldTitle=M.title,wasOn=M.on;
M.on=on;M.id=on?String(d.id):"";M.title=on?String(d.title||"").slice(0,120):"";M.start=on?Math.max(0,Math.min(36000,+d.start||0)):0;M.by=String(d.by||"").slice(0,24);M.reports=0;M.reportedBy.clear();M.iReported=false;M.small=false;
paint(true);
clearTimeout(noteT);
if(on){noteDone=false;if(M.title)postNote();else{noteT=setTimeout(postNote,4000);fetchTitle(M.id);}}
else{noteDone=true;if(wasOn)sysNote(oldTitle?"⏹️ « "+oldTitle+" » a été arrêtée.":"⏹️ La musique a été arrêtée.");}
}
function playMusic(info){
if(!isHost)return;
const me=players&&players[myId];
applyState({on:true,id:info.id,start:info.start,by:me?me.name:(myName||"Hôte")});
try{broadcast(state());}catch(e){}
}
function stopMusic(){if(!isHost)return;applyState({on:false});try{broadcast(state());}catch(e){}}
function reportMusic(){
if(isHost||!M.on||M.iReported)return;
M.iReported=true;paint();toHost({type:"v362MusicReport",id:M.id,by:myId});
try{chatWarn("🚩 Signalement envoyé à l’hôte.");}catch(e){}
}
/* Fenêtre de l'hôte */
function modal(){
let m=$("v362Modal");if(m)return m;
m=document.createElement("div");m.id="v362Modal";m.className="modal";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");
m.innerHTML='<div class="modal-box v362-box"><h2>🎵 Musique de la partie</h2>'+
'<p class="v362-help">Colle un lien YouTube : la musique se lance chez tous les joueurs. Chacun peut la couper pour lui.</p>'+
'<input id="v362Url" type="url" inputmode="url" autocomplete="off" placeholder="https://www.youtube.com/watch?v=…" maxlength="300">'+
'<div id="v362Err" class="v362-err" role="alert"></div>'+
'<div class="v362-rulebox"><b>📜 Règle de la salle</b><p>'+esc(RULE)+'</p><label><input id="v362Ok" type="checkbox"> Je confirme que ma musique respecte cette règle.</label></div>'+
'<div class="v362-now" id="v362Now"></div>'+
'<div class="v362-actions"><button type="button" class="btn btn-primary" id="v362Play">▶️ Lancer pour tous</button><button type="button" class="btn btn-danger" id="v362Stop">⏹️ Arrêter la musique</button><button type="button" class="btn btn-secondary" id="v362Cancel">Fermer</button></div></div>';
document.body.appendChild(m);
const err=t=>{$("v362Err").textContent=t||"";};
$("v362Play").addEventListener("click",()=>{
if(!isHost){err("Seul l’hôte peut lancer une musique.");return;}
const info=parseYouTube($("v362Url").value);
if(!info){err("⚠️ Lien YouTube invalide. Exemple : https://youtu.be/xxxxxxxxxxx");return;}
if(!$("v362Ok").checked){err("⚠️ Coche la case pour confirmer que la musique respecte la règle.");return;}
err("");playMusic(info);closeMusicModal();
});
$("v362Stop").addEventListener("click",()=>{stopMusic();closeMusicModal();});
$("v362Cancel").addEventListener("click",closeMusicModal);
m.addEventListener("click",e=>{if(e.target===m)closeMusicModal();});
$("v362Url").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("v362Play").click();}if(e.key==="Escape")closeMusicModal();});
return m;
}
function openMusicModal(){
if(!isHost)return;
const m=modal();$("v362Err").textContent="";$("v362Ok").checked=false;
$("v362Now").textContent=M.on?"En cours : "+(M.title?"« "+M.title+" »":"youtube.com/watch?v="+M.id):"Aucune musique en cours.";
$("v362Stop").hidden=!M.on;
m.classList.add("show");setTimeout(()=>{try{$("v362Url").focus();}catch(e){}},50);
}
function closeMusicModal(){const m=$("v362Modal");if(m)m.classList.remove("show");}
window.v362OpenMusic=openMusicModal;window.v362StopMusic=stopMusic;window.v362Play=playMusic;window.v362IsLocal=LOCAL;window.v362Rule=RULE;
/* Réseau */
const prevHandle=handleData;
handleData=function(data){
const t=data&&data.type;
if(t==="v362Music"){if(!isHost)applyState(data);return;}
if(t==="v362MusicReport"){
if(isHost&&M.on&&data.id===M.id){const by=String(data.by||"");if(!M.reportedBy.has(by)){M.reportedBy.add(by);M.reports++;paint();const p=players&&players[by];try{chatWarn("🚩 @"+(p?p.name:"Un joueur")+" signale la musique en cours.");}catch(e){}sysNote("🚩 @"+(p?p.name:"Un joueur")+" a signalé la musique (visible uniquement par l’hôte).");}}
return;
}
if(t==="v362MusicError"){if(isHost&&M.on&&data.id===M.id){const p=players&&players[data.by];const msg=ERR[data.code]||("erreur "+data.code);try{chatWarn("⚠️ @"+(p?p.name:"Un joueur")+" ne peut pas lire la musique : "+msg);}catch(e){}}return;}
if(t==="v145RoomClosed"&&!isHost){applyState({on:false});}
return prevHandle(data);
};
/* Les joueurs qui arrivent en cours de partie reçoivent la musique en cours. */
const prevBP=broadcastPlayers;
broadcastPlayers=function(){const r=prevBP.apply(this,arguments);try{if(isHost&&M.on)broadcast(state());}catch(e){}return r;};
/* Retour à l'accueil ou déconnexion : on coupe la musique localement. */
const prevReset=typeof resetConnection==="function"?resetConnection:null;
if(prevReset){resetConnection=function(){const r=prevReset.apply(this,arguments);try{if(M.on){M.on=false;M.id="";paint();}}catch(e){}return r;};}
console.log("V36.2 chargée : fermeture du chat sur mobile + musique YouTube de l’hôte avec règle de respect.");
})();
/* V36.3 — Musique réglable dès la création de la partie (sous le narrateur) + règle ajoutée aux règles du jeu. */
(function V363(){
"use strict";
const $=id=>document.getElementById(id);
/* Règle ajoutée aux règles du jeu (FR / EN / ES). */
try{
RULES_TEXT.fr+="<br><b>🎵 Musique :</b> l’hôte peut lancer une musique YouTube. <b>Interdit :</b> toute musique à caractère sexuel, raciste, haineux, violent, discriminatoire ou insultant. Chacun peut la couper pour lui ou la signaler.";
RULES_TEXT.en+="<br><b>🎵 Music:</b> the host can play a YouTube song. <b>Forbidden:</b> any sexual, racist, hateful, violent, discriminatory or insulting music. Anyone can mute it for themselves or report it.";
RULES_TEXT.es+="<br><b>🎵 Música:</b> el anfitrión puede poner una canción de YouTube. <b>Prohibido:</b> toda música sexual, racista, de odio, violenta, discriminatoria o insultante. Cada uno puede silenciarla o denunciarla.";
["rulesText","rulesTextHost"].forEach(id=>{const b=$(id);if(b&&b.innerHTML.indexOf("🎵")<0&&b.innerHTML.indexOf("🎯")>=0){const lang=b.innerHTML.indexOf("Objective")>=0?"en":b.innerHTML.indexOf("Objetivo")>=0?"es":"fr";b.innerHTML=RULES_TEXT[lang]||RULES_TEXT.fr;}});
}catch(e){}
function status(){
const st=$("v363Status"),stop=$("v363Stop");if(!st)return;
const M=window.v362Music||{};
st.textContent=M.on?"🎶 En cours : "+(M.title?"« "+M.title+" »":"youtube.com/watch?v="+M.id):"Aucune musique pour l’instant.";
st.classList.toggle("on",!!M.on);if(stop)stop.hidden=!M.on;
}
function install(){
const host=$("hostSettings");if(!host)return;
let box=$("v363LobbyMusic");
if(!box){
box=document.createElement("div");box.id="v363LobbyMusic";box.className="v363-music";
box.innerHTML='<div class="v363-title">🎵 Musique de la partie <span>(optionnel)</span></div>'+
'<p class="v363-help">Colle un lien YouTube (youtube.com, youtu.be, shorts…) : la musique se lance chez tous les joueurs, même ceux qui arrivent après. Chacun peut la couper pour lui.<br>💡 Les clips officiels bloquent souvent la lecture hors de YouTube : prends plutôt une version « audio » ou « lyrics ».</p>'+(window.v362IsLocal?'<p class="v363-local">⚠️ Jeu ouvert en fichier local : YouTube peut refuser la lecture. Ouvre le jeu depuis un site (https) pour que la musique marche partout.</p>':'')+
'<input id="v363Url" type="url" inputmode="url" autocomplete="off" maxlength="300" placeholder="https://www.youtube.com/watch?v=…">'+
'<div class="v363-rule"><b>📜 Règle :</b> '+(window.v362Rule||"Interdit : toute musique à caractère sexuel, raciste, haineux, violent, discriminatoire ou insultant.")+'</div>'+
'<label class="v363-check"><input id="v363Ok" type="checkbox"> Je confirme que ma musique respecte la règle.</label>'+
'<div id="v363Err" class="v363-err" role="alert"></div>'+
'<div class="v363-actions"><button type="button" class="btn btn-primary" id="v363Play">▶️ Lancer la musique</button><button type="button" class="btn btn-danger" id="v363Stop">⏹️ Arrêter</button></div>'+
'<div id="v363Status" class="v363-status"></div>';
const err=t=>{$("v363Err").textContent=t||"";};
box.querySelector("#v363Play").addEventListener("click",()=>{
if(!isHost){err("Seul l’hôte peut choisir la musique.");return;}
const info=window.v362ParseYouTube&&window.v362ParseYouTube($("v363Url").value);
if(!info){err("⚠️ Lien YouTube invalide. Exemple : https://youtu.be/xxxxxxxxxxx");return;}
if(!$("v363Ok").checked){err("⚠️ Coche la case pour confirmer que la musique respecte la règle.");return;}
err("");window.v362Play(info);$("v363Ok").checked=false;status();
});
box.querySelector("#v363Stop").addEventListener("click",()=>{if(window.v362StopMusic)window.v362StopMusic();status();});
box.querySelector("#v363Url").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("v363Play").click();}});
}
/* Toujours juste sous le narrateur (ou en bas des paramètres s'il n'est pas encore là). */
const narr=$("v19Narrator");
if(narr&&narr.parentNode===host){if(narr.nextElementSibling!==box)host.insertBefore(box,narr.nextSibling);}
else if(box.parentNode!==host)host.appendChild(box);
status();
}
const s0=showScreen;showScreen=function(id){const r=s0.apply(this,arguments);setTimeout(install,0);setTimeout(install,1600);return r;};
setTimeout(install,0);setInterval(()=>{if($("hostSettings"))install();},1500);
console.log("V36.3 : musique dans les paramètres de création + règle musique ajoutée.");
})();
/* V36.4 — Bruitages (synthétisés, aucun fichier à télécharger). Respectent le bouton « Son ON / OFF ». */
(function V364Sfx(){
"use strict";
const T=(f,d,type,v,delay)=>{try{if(typeof tone==="function")tone(f,d,type||"sine",v==null?.06:v,delay||0);}catch(e){}};
let lastAt={};
function once(key,ms){const n=Date.now();if(lastAt[key]&&n-lastAt[key]<ms)return false;lastAt[key]=n;return true;}
const SFX={
chatIn(){if(!once("chatIn",250))return;T(880,.07,"sine",.05);T(1320,.09,"sine",.045,.06);},
chatOut(){T(620,.05,"triangle",.045);T(930,.06,"triangle",.04,.045);},
bonus(){[784,988,1175,1568].forEach((n,i)=>T(n,.14,"triangle",.07,i*.07));T(2093,.25,"sine",.04,.3);},
malus(){T(392,.14,"sawtooth",.05);T(311,.16,"sawtooth",.05,.12);T(233,.28,"sawtooth",.05,.26);},
victim(){T(330,.18,"square",.05);T(262,.18,"square",.05,.16);T(196,.18,"square",.05,.32);T(147,.4,"square",.05,.48);},
tick(last){T(last?1480:1050,.05,"square",.035);},
whoosh(){if(!once("whoosh",600))return;T(260,.1,"triangle",.035);T(520,.12,"triangle",.035,.07);T(1040,.14,"sine",.03,.14);},
join(){if(!once("join",400))return;T(660,.12,"sine",.06);T(990,.18,"sine",.06,.11);},
music(){T(523,.12,"triangle",.05);T(659,.12,"triangle",.05,.1);T(784,.22,"triangle",.05,.2);},
musicStop(){T(784,.1,"triangle",.045);T(523,.2,"triangle",.045,.1);},
click(){if(!once("click",60))return;T(1250,.03,"sine",.03);}
};
window.v364Sfx=SFX;
/* Chat : message reçu / envoyé */
const prevAdd=addChatMessage;
addChatMessage=function(m){
const st=window.v36Chat;const id=m&&m.id;const isNew=!(st&&id&&st.msgs&&st.msgs.has(id));
const r=prevAdd.apply(this,arguments);
try{if(isNew&&m&&m.playerId&&m.playerId!==myId)SFX.chatIn();}catch(e){}
return r;
};
const prevSubmit=chatSubmit;
chatSubmit=function(){
const i=chatEl("chatInput");const before=i?i.value:"";const editing=!!(window.v36Chat&&window.v36Chat.editing);
const r=prevSubmit.apply(this,arguments);
try{if(before.trim()&&i&&!i.value&&!editing)SFX.chatOut();}catch(e){}
return r;
};
/* Bonus / malus (écran d'événement V35) */
let evShown=false;
function checkEvent(){
const ev=document.getElementById("v35Event");if(!ev)return;
const on=ev.classList.contains("show");
if(on&&!evShown){const t=(ev.textContent||"").toLowerCase();
if(t.includes("victime"))SFX.victim();else if(t.includes("malus"))SFX.malus();else if(t.includes("bonus"))SFX.bonus();}
evShown=on;
}
/* Chrono : tic-tac sur les 3 dernières secondes */
let lastTick="";
function checkTimer(){
const g=document.getElementById("gameScreen");if(!g||!g.classList.contains("active")&&getComputedStyle(g).display==="none")return;
const el=document.getElementById("timerValue")||document.getElementById("timer");if(!el)return;
const v=(el.textContent||"").trim();if(v===lastTick)return;lastTick=v;
const n=parseInt(v,10);if(n>=1&&n<=3)SFX.tick(n===1);
}
/* Nouvelle question */
let lastQ="";
function checkQuestion(){
const q=document.getElementById("questionText");if(!q)return;const t=(q.textContent||"").trim();
if(t&&t!==lastQ&&t!=="Question"){if(lastQ)SFX.whoosh();}
lastQ=t;
}
/* Musique lancée / arrêtée */
let musicOn=false;
function checkMusic(){const p=document.getElementById("v362Player");const on=!!(p&&p.classList.contains("show"));if(on!==musicOn){on?SFX.music():SFX.musicStop();musicOn=on;}}
const mo=new MutationObserver(()=>{checkEvent();checkTimer();checkQuestion();checkMusic();});
function watch(){mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});checkQuestion();}
setTimeout(watch,300);
/* Arrivée d'un joueur */
let count=-1;
const prevUP=updatePlayers;
updatePlayers=function(){
const r=prevUP.apply(this,arguments);
try{const n=Object.keys(players||{}).length;if(count>=0&&n>count)SFX.join();count=n;}catch(e){}
return r;
};
/* Petit clic sur les réponses */
document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest(".answers button,.answer");if(b)SFX.click();},true);
console.log("V36.4 : bruitages (chat, bonus, malus, chrono, nouvelle question, arrivée, musique).");
})();
