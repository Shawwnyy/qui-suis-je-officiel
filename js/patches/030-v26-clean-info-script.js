/* Extrait de l'ancien index.html : <script id="v26-clean-info-script"> */
(function V26CleanInfoBlocks(){
"use strict";
const ids=["v24RealNote","v23QuestionNote","v25PowerNote","v231BankNote","v26BankNote"];
function clean(){ids.forEach(id=>document.getElementById(id)?.remove());}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",clean,{once:true});else clean();
const observer=new MutationObserver(clean);
observer.observe(document.body,{childList:true,subtree:true});
setTimeout(clean,100);
setTimeout(clean,1000);
document.title="Qui suis-je ? 🎮 — V26 interface nettoyée";
})();
