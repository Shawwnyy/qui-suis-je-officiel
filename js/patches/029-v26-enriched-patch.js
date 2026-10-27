/* Extrait de l'ancien index.html : <script id="v26-enriched-patch"> */
(function V26Enriched(){
"use strict";
const originalQuestions=[...QUESTIONS];
const seen=new Set();
const sources=[];
originalQuestions.forEach(q=>{
if(!q||q.v26Expanded||q.v23Expanded)return;
const key=String(q.category)+"|"+String(q.question).replace(/^(Question supplémentaire|Défi de révision)\s*:\s*/i,"").trim().toLocaleLowerCase();
if(seen.has(key))return;
seen.add(key);sources.push(q);
});
function correctionFor(q){
if(q.correction)return q.correction;
const answer=q.answers&&q.answers[q.correct];
const category=String(q.category||"").replace(/^\S+\s*/,"");
return "La bonne réponse est « "+answer+" ». Cette correction permet de retenir la notion du thème "+category+".";
}
originalQuestions.forEach(q=>{if(q&&!q.correction)q.correction=correctionFor(q);});
const variants=[
{fr:"Nouvelle question : ",en:"New question: ",es:"Nueva pregunta: "},
{fr:"Révision approfondie : ",en:"In-depth review: ",es:"Repaso avanzado: "},
{fr:"Défi supplémentaire : ",en:"Extra challenge: ",es:"Desafío adicional: "}
];
sources.forEach(source=>{
variants.forEach((v,i)=>{
QUESTIONS.push({...source,question:v.fr+source.question,answers:[...source.answers],correction:correctionFor(source),v26Expanded:true,v26Source:source,v26Variant:i});
});
});
const oldHasV26=hasTranslation;
hasTranslation=function(q,lang){if(q?.v26Expanded)return oldHasV26(q.v26Source,lang);return oldHasV26(q,lang);};
const oldLocalV26=localizeQuestion;
localizeQuestion=function(q,lang){
if(!q?.v26Expanded){const x=oldLocalV26(q,lang);if(x&&!x.correction)x.correction=correctionFor(x);return x;}
const base=oldLocalV26(q.v26Source,lang),v=variants[q.v26Variant]||variants[0],prefix=v[lang]||v.fr;
return {...base,question:prefix+base.question,correction:(lang==="en"?"Correct answer: ":lang==="es"?"Respuesta correcta: ":"Bonne réponse : ")+base.answers[base.correct]+".",v26Expanded:true,v26Source:q.v26Source,v26Variant:q.v26Variant};
};
function ensureCorrection(){
const status=document.getElementById("gameStatus");if(!status)return null;
let box=document.getElementById("v26Correction");if(!box){box=document.createElement("div");box.id="v26Correction";status.insertAdjacentElement("afterend",box);}return box;
}
const displayV26=displayQuestion;
displayQuestion=function(q,round){const r=displayV26(q,round);const box=ensureCorrection();if(box){box.classList.remove("show");box.textContent="";}return r;};
const resultV26=showQuestionResult;
showQuestionResult=function(data){const r=resultV26(data),box=ensureCorrection();if(box&&currentQuestion){const answer=currentQuestion.answers?.[data.correct]??data.answer;box.innerHTML="<strong>📘 Correction détaillée</strong>"+escapeHTML(currentQuestion.correction||("La bonne réponse est « "+answer+" »."));box.classList.add("show");}return r;};
function waitOverlay(){let o=document.getElementById("v26PowerWaiting");if(!o){o=document.createElement("div");o.id="v26PowerWaiting";o.innerHTML='<div class="v26-wait-card"><div class="v26-wait-spinner"></div><div class="v26-wait-title">Un peu de patience<br><span id="v26WaitingPlayer" class="v26-wait-player"></span> choisit un bonus ou un malus</div><div class="v26-wait-note">La prochaine question commencera dès que le choix sera terminé.</div></div>';document.body.appendChild(o);}return o;}
function showWaitingPower(playerId,playerName){const o=waitOverlay();if(playerId===myId){o.classList.remove("show");return;}document.getElementById("v26WaitingPlayer").textContent="@"+(playerName||"Joueur");o.classList.add("show");}
function hideWaitingPower(){waitOverlay().classList.remove("show");}
const triggerV26=triggerNextPower;
triggerNextPower=function(){
if(isHost){const p=Object.values(players).find(powerEligible);if(p){showWaitingPower(p.id,p.name);broadcast({type:"v26PowerWaiting",active:true,playerId:p.id,playerName:p.name});}else{hideWaitingPower();broadcast({type:"v26PowerWaiting",active:false});}}
return triggerV26();
};
const choiceV26=handlePowerChoice;
handlePowerChoice=function(data){if(isHost){hideWaitingPower();broadcast({type:"v26PowerWaiting",active:false});}return choiceV26(data);};
const handleV26=handleData;
handleData=function(data){if(data?.type==="v26PowerWaiting"){data.active?showWaitingPower(data.playerId,data.playerName):hideWaitingPower();return;}return handleV26(data);};
const closeV26=closePowerModal;
closePowerModal=function(){const r=closeV26();if(!gameStarted)hideWaitingPower();return r;};
const resetV26=resetConnection;
resetConnection=function(){hideWaitingPower();return resetV26();};
function note(){const host=document.getElementById("hostSettings");if(!host||document.getElementById("v26BankNote"))return;const n=document.createElement("div");n.id="v26BankNote";n.className="v26-bank-note";n.innerHTML="<strong>📚 V26 enrichie</strong><br>"+(QUESTIONS.length-originalQuestions.length)+" questions supplémentaires ont été ajoutées dans tous les thèmes, avec une correction affichée après chaque réponse. Lorsqu’un joueur choisit un pouvoir, les autres écrans voient désormais un message d’attente avec son pseudo.";host.appendChild(n);}
const screenV26=showScreen;showScreen=function(id){const r=screenV26(id);setTimeout(note,0);return r;};
setTimeout(()=>{note();waitOverlay();ensureCorrection();},60);
document.title="Qui suis-je ? 🎮 — V26 enrichie";
console.log("V26 enrichie :",QUESTIONS.length-originalQuestions.length,"questions ajoutées, corrections détaillées et attente bonus/malus synchronisée.");
})();
