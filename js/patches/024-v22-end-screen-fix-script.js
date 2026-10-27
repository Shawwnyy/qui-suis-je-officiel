/* Extrait de l'ancien index.html : <script id="v22-end-screen-fix-script"> */
(function V22EndScreenFix(){
"use strict";
function cleanLiteralBreaks(root){
if(!root)return;
const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
const remove=[];
while(walker.nextNode()){
const node=walker.currentNode;
if(/^\s*<br\s*\/?\s*>\s*$/i.test(node.nodeValue||""))remove.push(node);
}
remove.forEach(node=>node.remove());
}
function repairRating(){
const modal=document.getElementById("v11RatingModal");
if(!modal)return;
modal.querySelectorAll(".v17-rating-status").forEach(el=>el.remove());
cleanLiteralBreaks(modal);
const actions=modal.querySelector(".v11-rating-actions");
const box=modal.querySelector(".modal-box");
if(actions&&box&&actions.parentElement!==box)box.appendChild(actions);
if(actions&&box&&actions!==box.lastElementChild)box.appendChild(actions);
const comment=modal.querySelector("#v11Comment");
if(comment){comment.removeAttribute("style");comment.rows=4;}
if(modal.classList.contains("show")){
document.documentElement.style.overflow="hidden";
document.body.style.overflow="hidden";
if(modal.dataset.v367Top2!=="1"){modal.dataset.v367Top2="1";modal.scrollTop=0;}
}else{modal.dataset.v367Top2="";}
}
function releaseScroll(){
const modal=document.getElementById("v11RatingModal");
if(!modal||!modal.classList.contains("show")){
document.documentElement.style.overflowY="auto";
document.body.style.overflowY="auto";
}
}
const observer=new MutationObserver(()=>{repairRating();releaseScroll();});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
const previousSkip=window.skipRatingV11;
window.skipRatingV11=function(){try{return typeof previousSkip==="function"?previousSkip():undefined;}finally{setTimeout(releaseScroll,0);}};
const previousSubmit=window.submitRatingV11;
window.submitRatingV11=function(){try{return typeof previousSubmit==="function"?previousSubmit():undefined;}finally{setTimeout(releaseScroll,400);}};
const previousResults=showResults;
showResults=function(data){const result=previousResults(data);setTimeout(()=>{repairRating();window.scrollTo({top:0,left:0,behavior:"auto"});},50);return result;};
window.addEventListener("pageshow",()=>{repairRating();releaseScroll();});
setTimeout(()=>{repairRating();releaseScroll();},50);
document.title="Qui suis-je ? 🎮 — V22 fin de partie corrigée";
console.log("V22: formulaire d'avis, boutons et fin de partie corrigés.");
})();
