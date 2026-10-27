/* Extrait de l'ancien index.html : <script id="v23-questions-navigation-patch"> */
(function V23QuestionsNavigation(){
"use strict";
/* Ajoute deux variantes supplémentaires dans chaque thème existant, sans inventer de nouvelle réponse. */
function installMoreQuestions(){
const groups=new Map();
QUESTIONS.filter(q=>!q.v15Mental&&!q.v23Expanded).forEach(q=>{if(!groups.has(q.category))groups.set(q.category,[]);groups.get(q.category).push(q);});
let added=0;
groups.forEach((items,category)=>{
const source=items.slice(0,2);
source.forEach((q,index)=>{
const prompt=index===0
?"Question supplémentaire : "+q.question
:"Défi de révision : "+q.question;
if(QUESTIONS.some(x=>x.category===category&&x.question===prompt))return;
QUESTIONS.push({...q,question:prompt,answers:[...q.answers],v23Expanded:true,v23Source:q});
added++;
});
});
window.v23QuestionsAdded=added;
console.log("V23 : "+added+" questions de révision ajoutées dans "+groups.size+" thèmes.");
}
installMoreQuestions();
const translated=hasTranslation;
hasTranslation=function(q,lang){if(q?.v23Expanded)return hasTranslation(q.v23Source,lang);return translated(q,lang);};
const localized=localizeQuestion;
localizeQuestion=function(q,lang){
if(!q?.v23Expanded)return localized(q,lang);
const base=localized(q.v23Source,lang);
const prefix=lang==="en"?(q.question.startsWith("Défi")?"Revision challenge: ":"Extra question: "):lang==="es"?(q.question.startsWith("Défi")?"Reto de repaso: ":"Pregunta adicional: "):(q.question.startsWith("Défi")?"Défi de révision : ":"Question supplémentaire : ");
return{...base,question:prefix+base.question,v23Expanded:true,v23Source:q.v23Source};
};
function unlockEndNavigation(){
document.documentElement.style.overflow="auto";
document.body.style.overflow="auto";
document.documentElement.style.pointerEvents="auto";
document.body.style.pointerEvents="auto";
document.body.classList.remove("v19-saving");
const modal=document.getElementById("v11RatingModal");
if(modal){modal.classList.remove("show","v19-saving","v23-rating-finished");modal.style.pointerEvents="";modal.dataset.v19Submitting="0";}
const results=document.getElementById("resultsScreen");
if(results&&!results.classList.contains("active"))showScreen("resultsScreen");
requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}));
}
window.finishRatingV23=unlockEndNavigation;
function enhanceRatingButtons(){
const modal=document.getElementById("v11RatingModal"),actions=modal?.querySelector(".v11-rating-actions");if(!modal||!actions)return;
let next=document.getElementById("v23RatingContinue");
if(!next){next=document.createElement("button");next.id="v23RatingContinue";next.type="button";next.className="btn btn-green";next.textContent="Continuer vers les résultats";next.onclick=unlockEndNavigation;actions.appendChild(next);}
}
const oldSkip=window.skipRatingV11;
window.skipRatingV11=function(){try{if(typeof oldSkip==="function")oldSkip();}finally{unlockEndNavigation();}};
const oldSubmit=window.submitRatingV11;
window.submitRatingV11=function(){
const modal=document.getElementById("v11RatingModal");
try{if(typeof oldSubmit==="function")oldSubmit();}
finally{
setTimeout(()=>{
if(modal){modal.classList.add("v23-rating-finished");modal.classList.remove("show","v19-saving");modal.dataset.v19Submitting="0";}
unlockEndNavigation();
},450);
}
};
function addResultsNavigation(){
const card=document.querySelector("#resultsScreen .card");if(!card||document.getElementById("v23ResultsNav"))return;
const nav=document.createElement("div");nav.id="v23ResultsNav";nav.className="v23-results-nav";
nav.innerHTML='<button type="button" class="btn btn-green" onclick="replayV9()">Rejouer</button><button type="button" class="btn btn-secondary" onclick="newGameV9()">Nouvelle partie</button><button type="button" class="btn btn-secondary" onclick="backToHome()">Retour à l’accueil</button><button type="button" class="btn btn-primary" onclick="downloadLastReportV9()">Télécharger le rapport</button>';
card.appendChild(nav);
}
const results=showResults;
showResults=function(data){const r=results(data);setTimeout(()=>{enhanceRatingButtons();addResultsNavigation();},50);return r;};
const observer=new MutationObserver(()=>{enhanceRatingButtons();if(document.getElementById("resultsScreen")?.classList.contains("active"))addResultsNavigation();});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
window.addEventListener("pageshow",()=>{enhanceRatingButtons();if(document.getElementById("resultsScreen")?.classList.contains("active"))unlockEndNavigation();});
setTimeout(()=>{enhanceRatingButtons();const host=document.getElementById("hostSettings");if(host&&!document.getElementById("v23QuestionNote")){const n=document.createElement("div");n.id="v23QuestionNote";n.className="v23-question-note";n.textContent=window.v23QuestionsAdded+" questions supplémentaires ont été réparties dans tous les thèmes existants.";host.appendChild(n);}},80);
document.title="Qui suis-je ? 🎮 — V23 questions et navigation corrigées";
})();
