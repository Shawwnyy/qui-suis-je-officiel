/* Extrait de l'ancien index.html : <script id="v207-bottom-output-fix-script"> */
(function V207BottomOutputFix(){
"use strict";
const markers=["function exportSessionsPDF","function openHof","RULES_TEXT.fr+=","const __withFxV7"];
function corrupt(value){
value=String(value||"").trim();
return value.length>180&&markers.some(marker=>value.includes(marker));
}
function clean(){
const root=document.body;
if(!root)return;
const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
const nodes=[];
while(walker.nextNode()){
const node=walker.currentNode;
const parent=node.parentElement;
if(parent&&!parent.closest("script,style,template,noscript")&&corrupt(node.nodeValue))nodes.push(node);
}
nodes.forEach(node=>node.remove());
document.querySelectorAll("body > pre,body > code,body > samp,#app ~ pre,#app ~ code,#app ~ samp").forEach(el=>{if(corrupt(el.textContent))el.remove();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",clean,{once:true});else clean();
setTimeout(clean,100);setTimeout(clean,800);
new MutationObserver(list=>{if(list.some(item=>item.addedNodes.length))clean();}).observe(document.documentElement,{childList:true,subtree:true});
document.title="Qui suis-je ? 🎮 — V20.7 corrigée";
})();
