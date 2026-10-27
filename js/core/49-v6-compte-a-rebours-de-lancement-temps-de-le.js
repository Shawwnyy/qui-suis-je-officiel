/* =========================================================
V6 : compte à rebours de lancement + temps de lecture des pouvoirs
========================================================= */
const READ_MS=12000;      /* affichage du bonus/malus appliqué (12 s) */
const READ_PAUSE_MS=13000; /* pause de la partie pour laisser lire (13 s) */
function showStartCountdown(seconds,onDone){
let overlay=document.getElementById("startCountdown");
if(!overlay){
overlay=document.createElement("div");
overlay.id="startCountdown";
overlay.style.cssText="position:fixed;inset:0;z-index:5000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,8,25,.92);color:#fff;text-align:center;font-family:inherit";
overlay.innerHTML='<div style="font-size:20px;font-weight:800;opacity:.85;margin-bottom:10px">🎮 La partie commence dans…</div><div id="startCountdownNum" style="font-size:150px;font-weight:900;line-height:1;text-shadow:0 0 40px rgba(167,139,250,.8)"></div><div style="margin-top:14px;font-size:16px;opacity:.7">Prépare-toi !</div>';
document.body.appendChild(overlay);
}
clearInterval(window.__startCdT);
let left=seconds;
const num=document.getElementById("startCountdownNum");
overlay.style.display="flex";
num.textContent=left;
window.__startCdT=setInterval(()=>{
left--;
if(left<=0){
clearInterval(window.__startCdT);
overlay.style.display="none";
if(onDone)onDone();
return;
}
num.textContent=left;
num.style.transform="scale(1.15)";
setTimeout(()=>{num.style.transform="scale(1)";},150);
},1000);
}
const __startGameBase=startGame;
startGame=function(){
if(!isHost)return;
const lang=document.getElementById("questionLang")?document.getElementById("questionLang").value:"fr";
const themes=[...document.querySelectorAll("#themeGrid input:checked")].map(i=>i.value);
if(!themes.length){
alert("Sélectionne au moins un thème.");
return;
}
if(!QUESTIONS.some(q=>themes.includes(q.category)&&hasTranslation(q,lang))){
alert("Aucune question dans cette langue pour ces thèmes : choisis d'autres thèmes.");
return;
}
const button=document.getElementById("startButton");
if(button)button.disabled=true;
broadcast({type:"countdown",seconds:5});
showStartCountdown(5,()=>{
if(button)button.disabled=false;
__startGameBase();
});
};
/* Réception côté invités */
const __handleDataV6=handleData;
handleData=function(data){
if(data&&data.type==="countdown"&&!isHost){
showStartCountdown(data.seconds||5,null);
return;
}
if(data&&data.type==="gameStart"){
const o=document.getElementById("startCountdown");
if(o)o.style.display="none";
clearInterval(window.__startCdT);
}
return __handleDataV6(data);
};
/* Panneau de pouvoir : lecture longue (12 s) + compte à rebours */
showPowerPanel=function(text,color,ms){
const panel=document.getElementById("powerPanel");
const powerText=document.getElementById("powerText");
if(!panel||!powerText)return;
const long=ms||(/^(✅|⏱️)/.test(text)?4000:(window.__readMs||READ_MS));
panel.classList.remove("hidden");
powerText.textContent=text;
powerText.style.color=color;
let note=document.getElementById("powerReadNote");
if(!note){
note=document.createElement("div");
note.id="powerReadNote";
note.style.cssText="margin-top:6px;font-size:12px;opacity:.75;font-weight:700";
powerText.parentNode.appendChild(note);
}
clearInterval(window.__readT);
clearTimeout(window.__panelT);
let left=Math.round(long/1000);
if(long>=10000){
note.textContent="⏳ Suite dans "+left+" s";
window.__readT=setInterval(()=>{
left--;
note.textContent=left>0?"⏳ Suite dans "+left+" s":"";
if(left<=0)clearInterval(window.__readT);
},1000);
}else{
note.textContent="";
}
window.__panelT=setTimeout(()=>{
panel.classList.add("hidden");
note.textContent="";
clearInterval(window.__readT);
},long);
};
/* Les autres joueurs voient aussi ce qui se passe */
const __showExtBase=showExtResult;
showExtResult=function(data){
__showExtBase(data);
const e=data.ext;
if(e&&data.playerId!==myId&&data.targetId!==myId){
showBanner("⚡ "+data.playerName+" : "+e.label+(data.targetName?" → "+data.targetName:""));
}
};
