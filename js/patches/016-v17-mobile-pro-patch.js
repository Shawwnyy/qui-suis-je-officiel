/* Extrait de l'ancien index.html : <script id="v17-mobile-pro-patch"> */
(function V17MobilePro(){
"use strict";
const two=n=>String(n).padStart(2,"0");
function formatDateTime(d){
const days=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"],months=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
return{date:days[d.getDay()]+" "+d.getDate()+" "+months[d.getMonth()]+" "+d.getFullYear(),time:two(d.getHours())+":"+two(d.getMinutes())+":"+two(d.getSeconds())};
}
function installHomeClock(){
const title=document.querySelector("#homeScreen .home-title");if(!title)return;let box=document.getElementById("v17HomeClock");
if(!box){box=document.createElement("div");box.id="v17HomeClock";box.className="v17-home-clock";box.setAttribute("aria-live","polite");box.innerHTML='<div class="v17-home-clock-icon">🗓️</div><div id="v17ClockDate" class="v17-home-clock-date"></div><div id="v17ClockTime" class="v17-home-clock-time"></div><small>Date et heure locales de la partie, mises à jour chaque seconde.</small>';title.insertAdjacentElement("afterend",box);}
updateClock();
}
function updateClock(){const x=formatDateTime(new Date()),d=document.getElementById("v17ClockDate"),t=document.getElementById("v17ClockTime");if(d)d.textContent=x.date;if(t)t.textContent=x.time;}
installHomeClock();setInterval(updateClock,250);
/* Date exacte du lancement, conservée dans le rapport de session. */
const start17=startGame;startGame=function(){if(isHost){window.v17GameDateTime=new Date().toISOString();try{localStorage.setItem("quizV17GameDateTime",window.v17GameDateTime);}catch(e){}}return start17();};
const save17=saveCurrentSession;saveCurrentSession=function(sorted){save17(sorted);try{const all=loadSessions(),rec=all.find(x=>x.id===window.__savedKey);if(rec){rec.version="V17";rec.startedAt=window.v17GameDateTime||localStorage.getItem("quizV17GameDateTime")||null;rec.finishedAt=new Date().toISOString();storeSessions(all);localStorage.setItem("quizV9LastReport",JSON.stringify(rec));}}catch(e){console.warn("V17 session",e);}};
function ratingModal(){return document.getElementById("v11RatingModal");}
function closeRating(){const m=ratingModal();if(m)m.classList.remove("show");document.body.style.overflow="";document.documentElement.style.overflow="";}
function enhanceRating(){
const m=ratingModal();if(!m)return;if(!m.dataset.v17){m.dataset.v17="1";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Avis sur la partie");const close=document.createElement("button");close.type="button";close.className="v17-rating-close";close.textContent="✕";close.title="Fermer et revenir aux résultats";close.setAttribute("aria-label","Fermer le questionnaire et revenir aux résultats");close.onclick=closeRating;m.appendChild(close);const actions=m.querySelector(".v11-rating-actions");if(actions){const later=actions.querySelector("button:first-child");if(later)later.textContent="Passer";const send=actions.querySelector("button:last-child");if(send)send.textContent="Envoyer mon avis";}const status=document.createElement("div");status.className="v17-rating-status";status.textContent="Les boutons Passer et Envoyer restent toujours visibles en bas de l’écran.";m.querySelector(".modal-box")?.insertBefore(status,actions||null);m.addEventListener("click",e=>{if(e.target===m)closeRating();});}
if(m.classList.contains("show")){document.body.style.overflow="hidden";document.documentElement.style.overflow="hidden";if(m.dataset.v367Top!=="1"){m.dataset.v367Top="1";m.scrollTop=0;}}else{m.dataset.v367Top="";}
}
const obs=new MutationObserver(enhanceRating);obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&ratingModal()?.classList.contains("show")){e.preventDefault();closeRating();}});
const oldSkip=window.skipRatingV11;window.skipRatingV11=function(){try{if(typeof oldSkip==="function")oldSkip();}finally{closeRating();}};
const oldSubmit=window.submitRatingV11;window.submitRatingV11=function(){try{return oldSubmit();}finally{setTimeout(()=>{if(!ratingModal()?.classList.contains("show"))closeRating();},0);}};
/* Réveille l'audio iOS après un geste utilisateur et évite les blocages silencieux. */
function unlockIOS(){try{initAudio();if(audioContext&&audioContext.state==="suspended")audioContext.resume();}catch(e){}document.removeEventListener("pointerdown",unlockIOS,true);document.removeEventListener("touchend",unlockIOS,true);}
document.addEventListener("pointerdown",unlockIOS,true);document.addEventListener("touchend",unlockIOS,true);
/* Recalcule la hauteur lors de l'ouverture/fermeture du clavier virtuel. */
if(window.visualViewport){const resize=()=>document.documentElement.style.setProperty("--v17-vh",window.visualViewport.height+"px");visualViewport.addEventListener("resize",resize);visualViewport.addEventListener("scroll",resize);resize();}
window.addEventListener("pageshow",()=>{installHomeClock();enhanceRating();});
const screen17=showScreen;showScreen=function(id){const r=screen17(id);setTimeout(()=>{installHomeClock();enhanceRating();window.scrollTo({top:0,left:0,behavior:"auto"});},0);return r;};
enhanceRating();document.title="Qui suis-je ? 🎮 — V17";
console.log("V17 : questionnaire de fin mobile, iPhone, zones sûres, interface tactile et horloge à la seconde.");
})();
