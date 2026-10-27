/* Extrait de l'ancien index.html : <script id="v33-power-layout-script"> */
(function V33PowerLayout(){
"use strict";
function attackTargets(ownerId){
const owner=players[ownerId];
return Object.values(players).filter(p=>{
if(!p||p.id===ownerId)return false;
const mode=window.v9GameMode||"individual";
if(mode==="coop")return false;
if(mode==="teams"&&owner&&p.team&&p.team===owner.team)return false;
if(mode==="soloHost"&&owner&&p.host===owner.host)return false;
return true;
});
}
function normalizePowerCards(){
const modal=document.getElementById("powerModal");if(!modal)return;
const bonus=modal.querySelector(".power-card.bonus"),malus=modal.querySelector(".power-card.malus");
if(bonus){bonus.style.setProperty("display","flex","important");bonus.style.removeProperty("grid-column");}
if(malus){malus.style.setProperty("display","flex","important");malus.style.removeProperty("grid-column");}
const targets=attackTargets(myId),select=document.getElementById("malusTarget"),button=document.getElementById("malusButton"),desc=document.getElementById("malusDescription");
if(select){
const previous=select.value;select.replaceChildren(new Option("Choisir un adversaire...",""));
targets.forEach(p=>select.add(new Option((p.avatar||"🎮")+" "+p.name+" — "+Number(p.score||0)+" pts",p.id)));
if(targets.some(p=>p.id===previous))select.value=previous;else if(targets[0])select.value=targets[0].id;
select.disabled=!targets.length;
}
if(button){button.style.setProperty("display","block","important");button.disabled=!targets.length;button.textContent=targets.length?"💥 DONNER LE MALUS":"💥 AUCUNE CIBLE DISPONIBLE";}
if(desc)desc.textContent=targets.length?"Choisis un malus puis l’adversaire à pénaliser.":((window.v9GameMode||"individual")==="coop"?"Les attaques sont désactivées en mode Coopération.":"Aucun autre joueur n’est disponible pour recevoir un malus.");
malus?.classList.toggle("v33-unavailable",!targets.length);
}
const previousOpen=openPowerModal;
openPowerModal=function(level,token){const result=previousOpen(level,token);normalizePowerCards();requestAnimationFrame(normalizePowerCards);setTimeout(normalizePowerCards,80);return result;};
const previousChoose=chooseMalus;
chooseMalus=function(){const targets=attackTargets(myId),select=document.getElementById("malusTarget");if(!targets.length){showBanner((window.v9GameMode||"individual")==="coop"?"🤝 Les malus sont désactivés en mode Coopération.":"💥 Aucun adversaire disponible.");return;}if(select&&!select.value)select.value=targets[0].id;return previousChoose();};
const previousStart=startGame;
startGame=function(){const result=previousStart();setTimeout(normalizePowerCards,0);return result;};
window.addEventListener("resize",normalizePowerCards,{passive:true});
setTimeout(normalizePowerCards,80);
document.title="Qui suis-je ? 🎮 — V33 bonus et malus équilibrés";
console.log("V33 : cartes Bonus et Malus visibles, de même taille et cibles malus restaurées.");
})();
