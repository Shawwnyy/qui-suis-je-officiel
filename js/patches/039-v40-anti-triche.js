/* =============================================================================
   V40 — Anti-triche progressif (décidé par l'hôte)

   Une « infraction » = quitter la page (changement d'onglet / d'appli, perte de focus) pendant une
   question à laquelle on n'a pas encore répondu. La détection est faite par le navigateur du joueur
   (js/patches/027-v24-real-patch.js) ; l'hôte compte et décide :
     - infractions 1 et 2          → avertissement (aucune sanction)
     - plus de 2  (3ᵉ et 4ᵉ)       → malus : −250 points + « Minuterie piégée » (chrono −25 %, 2 questions)
     - plus de 4  (5ᵉ)             → exclusion : le joueur est retiré de la partie et attend la fin de celle-ci
   Au plus une infraction par question et par joueur. L'hôte peut désactiver l'anti-triche.
   L'hôte lui-même reçoit les avertissements et les malus mais ne peut pas être exclu (la partie dépend de lui).
   Limite : la détection tourne dans le navigateur du joueur, un joueur technique peut la contourner.
   ============================================================================= */
var V40CheatPolicy=(function(){
"use strict";
var WARN_MAX=2,KICK_AFTER=4,MALUS_POINTS=250,MALUS_QUESTIONS=2;
/* Niveau de sanction pour la n-ième infraction : none | warn | malus | kick */
function level(n){n=Math.floor(Number(n)||0);if(n>KICK_AFTER)return"kick";if(n>WARN_MAX)return"malus";return n>0?"warn":"none";}
function describe(n){
n=Math.floor(Number(n)||0);
return{count:n,level:level(n),
/* infractions encore permises avant le malus / avant l'exclusion (0 = la prochaine déclenche) */
untilMalus:Math.max(0,WARN_MAX+1-n),untilKick:Math.max(0,KICK_AFTER+1-n)};
}
return{WARN_MAX:WARN_MAX,KICK_AFTER:KICK_AFTER,MALUS_POINTS:MALUS_POINTS,MALUS_QUESTIONS:MALUS_QUESTIONS,level:level,describe:describe};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=V40CheatPolicy;

(function V40AntiTriche(){
"use strict";
if(typeof window==="undefined"||typeof handleData!=="function")return;
var P=V40CheatPolicy,$=function(id){return document.getElementById(id);};
var excluded=false;                 /* côté joueur : exclu pour la fin de la partie */
var excludedOnHost={};              /* côté hôte : joueurs exclus pendant cette partie */
var KEY="quizV40AntiCheat";
function enabled(){var c=$("v40AntiCheatOn");if(c)return !!c.checked;try{return localStorage.getItem(KEY)!=="0";}catch(e){return true;}}

/* ---------- Textes ---------- */
function verdictText(v){
var n=v.count||1,d=P.describe(n);
if(v.level==="malus"){
return{title:"MALUS DE TRICHE !",
sub:"−"+P.MALUS_POINTS+" points et chrono réduit pendant "+P.MALUS_QUESTIONS+" questions.",
line:"Infraction n°"+n+(v.host?" — l'hôte ne peut pas être exclu, mais les malus continuent.":" — encore "+d.untilKick+" infraction"+(d.untilKick>1?"s":"")+" et tu seras exclu(e) de la partie.")};
}
return{title:"TU AS TRICHÉ(E) !",
sub:"Quitter la page pendant une question est considéré comme de la triche.",
line:"Avertissement "+n+"/"+P.WARN_MAX+(d.untilMalus>0?" — à la "+(P.WARN_MAX+1)+"ᵉ infraction : malus ("+P.MALUS_POINTS+" points).":"")};
}
function showVerdict(v){
var t=verdictText(v);
if(typeof window.showCheatOverlayV24==="function")window.showCheatOverlayV24(t.title,t.sub,t.line);
try{if(typeof updateMyScore==="function")updateMyScore();}catch(e){}
}
function say(text){try{showBanner(text);}catch(e){}}

/* ---------- Côté hôte ---------- */
function applyMalus(p){
p.score=Math.max(0,(p.score||0)-P.MALUS_POINTS);
p.malusPoints=(p.malusPoints||0)+P.MALUS_POINTS;
p.malusesReceived=(p.malusesReceived||0)+1;
try{var fx=(typeof fxOf==="function")?fxOf(p):(p.fx||(p.fx={}));fx.piege={left:P.MALUS_QUESTIONS};}catch(e){}
}
function hostRecord(id){
if(!isHost||!enabled()||!gameStarted)return;
var p=players[id];if(!p)return;
var st=$("gameStatus");if(st&&st.dataset.finished==="1")return;      /* question déjà terminée */
var qi=typeof currentQuestionIndex==="number"?currentQuestionIndex:-1;
if(qi>=0&&p.v40CheatQ===qi)return;p.v40CheatQ=qi;                    /* une seule infraction par question */
p.cheatCount=(p.cheatCount||0)+1;
var info=P.describe(p.cheatCount);
var lvl=info.level==="kick"&&p.host?"malus":info.level;              /* l'hôte n'est jamais exclu */
if(lvl==="malus")applyMalus(p);
var name=p.name||"Un joueur";
var text=lvl==="kick"?"🚫 "+name+" est exclu(e) de la partie pour triche ("+p.cheatCount+" infractions)."
:lvl==="malus"?"🚨 "+name+" a triché : malus −"+P.MALUS_POINTS+" points et chrono réduit (infraction "+p.cheatCount+")."
:"⚠️ "+name+" a quitté la page pendant une question (avertissement "+p.cheatCount+"/"+P.WARN_MAX+").";
try{if(window.V40Stats&&window.V40Stats.noteCheat)window.V40Stats.noteCheat({id:id,name:name,count:p.cheatCount,level:lvl,round:qi+1});}catch(e){}
say(text);broadcast({type:"v40Banner",text:text});
if(lvl==="kick"){exclude(id,p);return;}
var verdict={type:"v40Verdict",count:p.cheatCount,level:lvl,host:!!p.host};
if(id===myId)showVerdict(verdict);else sendTo(id,verdict);
broadcastPlayers();
if(p.id===myId){try{updateMyScore();}catch(e){}}
}
function exclude(id,p){
excludedOnHost[id]={name:p.name,count:p.cheatCount,at:Date.now()};
try{answersReceived.delete(id);}catch(e){}
/* le message part AVANT le retrait ; la connexion reste ouverte pour que le joueur reçoive la fin de partie */
sendTo(id,{type:"v40Excluded",count:p.cheatCount,round:(typeof currentQuestionIndex==="number"?currentQuestionIndex+1:0),totalRounds:typeof totalRounds==="number"?totalRounds:0});
delete players[id];
broadcastPlayers();
try{updateAnswerProgress(answersReceived.size,Object.keys(players).length);broadcast({type:"answerProgress",answered:answersReceived.size,total:Object.keys(players).length});}catch(e){}
try{finishQuestionIfNeeded();}catch(e){}
}

/* ---------- Côté joueur ---------- */
function report(){
if(isHost){hostRecord(myId);return;}
var c=Object.values(connections).find(function(x){return x&&x.open;});
if(c){try{c.send({type:"v24Cheat",playerId:myId});}catch(e){}}
}
function overlayExcluded(){
var o=$("v40Excluded");
if(!o){o=document.createElement("div");o.id="v40Excluded";o.setAttribute("role","alert");
o.innerHTML='<div class="v40x-card"><div class="v40x-emoji">🚫</div><div class="v40x-title">Tu es exclu(e) de la partie</div>'
+'<div class="v40x-sub" id="v40xSub"></div><div class="v40x-wait">⏳ Attends la fin de la partie : tu pourras revenir pour la suivante.</div>'
+'<div class="v40x-round" id="v40xRound"></div>'
+'<button type="button" class="v40x-statsbtn" id="v40xStats">📊 Voir les statistiques de la partie</button></div>';
var sb=o.querySelector("#v40xStats");if(sb)sb.addEventListener("click",function(){if(window.V40Stats&&window.V40Stats.open)window.V40Stats.open("overview");});
document.body.appendChild(o);}
return o;
}
function setExcludedInfo(round,total){var r=$("v40xRound");if(r&&round)r.textContent="Partie en cours : manche "+round+(total?" / "+total:"");}
function onExcluded(d){
excluded=true;
try{clearInterval(timer);}catch(e){}
try{closePowerModal();}catch(e){}
try{answered=true;}catch(e){}
if(typeof window.hideCheatOverlayV24==="function")window.hideCheatOverlayV24();
var o=overlayExcluded();
var s=$("v40xSub");if(s)s.textContent=(d.count||5)+" infractions : tu as quitté la page pendant les questions.";
setExcludedInfo(d.round,d.totalRounds);
o.classList.add("show");
document.documentElement.style.overflow="hidden";
}
function release(){
excluded=false;
var o=$("v40Excluded");if(o)o.classList.remove("show");
document.documentElement.style.overflow="";
}

/* ---------- Branchements ---------- */
var baseHandle=handleData;
handleData=function(data){
if(data&&data.type){
if(isHost&&data.type==="v24Cheat"){hostRecord(data.playerId);return;}
if(!isHost){
if(data.type==="v40Verdict"){if(!excluded)showVerdict(data);return;}
if(data.type==="v40Excluded"){onExcluded(data);return;}
if(data.type==="v40Banner"){say(data.text);return;}
if(excluded){
/* un joueur exclu ne suit plus la partie : seul le message de fin le libère */
if(data.type==="gameOver"){release();}
else{
if(data.type==="nextQuestion"||data.type==="gameStart")setExcludedInfo(data.round,data.totalRounds);
if(data.type!=="v40Entry"&&data.type!=="v40Final"&&data.type!=="error"&&data.type!=="kicked"&&data.type!=="v15Banned")return;
}
}
}
}
return baseHandle(data);
};
/* un joueur ne peut déclarer une infraction que pour lui-même : on force l'identité d'après la connexion */
var baseSetup=setupConnection;
setupConnection=function(connection){
try{connection.on("data",function(d){if(d&&d.type==="v24Cheat")d.playerId=connection.peer;});}catch(e){}
return baseSetup(connection);
};
var baseStart=startGame;
startGame=function(){
Object.values(players).forEach(function(p){p.cheatCount=0;p.v40CheatQ=-1;});
excludedOnHost={};
return baseStart.apply(this,arguments);
};
if(typeof finishGame==="function"){
var baseFinish=finishGame;
finishGame=function(){var r=baseFinish.apply(this,arguments);excludedOnHost={};return r;};
}
var baseReset=resetConnection;
resetConnection=function(){release();excludedOnHost={};return baseReset.apply(this,arguments);};
var baseClean=cleanPlayers;
cleanPlayers=function(){var out=baseClean();Object.keys(out).forEach(function(id){out[id].cheats=(players[id]&&players[id].cheatCount)||0;});return out;};

/* ---------- Réglage de l'hôte + règles ---------- */
function mountToggle(){
var host=$("hostSettings");if(!host||$("v40AntiCheatBox"))return;
var box=document.createElement("label");box.id="v40AntiCheatBox";box.className="v40-toggle";
var on=true;try{on=localStorage.getItem(KEY)!=="0";}catch(e){}
box.innerHTML='<input type="checkbox" id="v40AntiCheatOn"'+(on?" checked":"")+'><span><b>🚨 Anti-triche</b><small>Quitter la page pendant une question = infraction. 2 avertissements, malus dès la 3ᵉ infraction, exclusion à la 5ᵉ jusqu’à la fin de la partie.</small></span>';
host.appendChild(box);
$("v40AntiCheatOn").addEventListener("change",function(){try{localStorage.setItem(KEY,this.checked?"1":"0");}catch(e){}});
}
try{
if(typeof RULES_TEXT!=="undefined"){
if(RULES_TEXT.fr.indexOf("Anti-triche")<0){
RULES_TEXT.fr+="<br><b>🚨 Anti-triche :</b> quitter la page pendant une question est une infraction. Jusqu’à 2 : avertissement. Au-delà de 2 : malus (−250 pts et chrono réduit). Au-delà de 4 : exclusion jusqu’à la fin de la partie.";
RULES_TEXT.en+="<br><b>🚨 Anti-cheat:</b> leaving the page during a question is an offence. Up to 2: warning. More than 2: penalty (−250 pts and a shorter timer). More than 4: removed from the game until it ends.";
RULES_TEXT.es+="<br><b>🚨 Antitrampas:</b> salir de la página durante una pregunta es una infracción. Hasta 2: aviso. Más de 2: penalización (−250 pts y menos tiempo). Más de 4: expulsión hasta que termine la partida.";
}
}
}catch(e){}
var baseScreen=showScreen;
showScreen=function(id){var r=baseScreen(id);setTimeout(mountToggle,0);return r;};
setTimeout(mountToggle,60);

window.V40Cheat={policy:P,report:report,hostRecord:hostRecord,enabled:enabled,isExcluded:function(){return excluded;}};
})();
