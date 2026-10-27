/* Extrait de l'ancien index.html : <script id="v201-stable-fix"> */
(function V201StableFix(){
"use strict";
const V20_THEMES=[
"🚦 Code de la route","✍️ Grammaire","🤾 Handball","🏛️ Capitales",
"🌐 Pays du monde","🏙️ Villes du monde","🇫🇷 France nationale","🗺️ France régionale",
"🇬🇧 Anglais → Français","🇫🇷 Français → Anglais","🇪🇸 Espagnol → Français",
"🇫🇷 Français → Espagnol","📝 Orthographe","🚩 Drapeaux","🇪🇺 Europe","🚑 Premiers secours"
];
/* Le dernier sélecteur de V17 filtrait les thèmes ajoutés ensuite. On les réinjecte ici. */
const getCategoriesBeforeV20=getCategories;
getCategories=function(){
const base=getCategoriesBeforeV20();
const present=V20_THEMES.filter(cat=>QUESTIONS.some(q=>q.category===cat));
return [...new Set([...base,...present])];
};
/* Supprime uniquement un éventuel bloc de code accidentellement rendu en bas de page. */
function removeRenderedCodeBug(){
[...document.body.childNodes].forEach(node=>{
if(node.nodeType!==Node.TEXT_NODE)return;
const text=(node.textContent||"").trim();
if(text.length>180&&(text.includes("function exportSessionsPDF")||text.includes("function openHof")||text.includes("RULES_TEXT.fr+="))){
node.textContent="";
}
});
document.querySelectorAll('body > pre, body > code').forEach(el=>{
const text=el.textContent||"";
if(text.includes("function exportSessionsPDF")||text.includes("function openHof"))el.remove();
});
}
function rebuildThemesV20(){
const grid=document.getElementById("themeGrid");
if(!grid)return;
const checked=new Set([...grid.querySelectorAll("input:checked")].map(i=>i.value));
try{buildThemeSelector();}catch(error){console.error("V20 thèmes",error);return;}
grid.querySelectorAll("input").forEach(input=>{
if(checked.size)input.checked=checked.has(input.value);
});
/* Au premier affichage, tous les nouveaux thèmes sont cochés pour être immédiatement visibles. */
V20_THEMES.forEach(theme=>{
const input=[...grid.querySelectorAll("input")].find(x=>x.value===theme);
if(input&&!checked.size)input.checked=true;
});
if(typeof updateSelectedThemes==="function")updateSelectedThemes();
}
function verifyThemes(){
const grid=document.getElementById("themeGrid");
if(!grid)return;
const shown=new Set([...grid.querySelectorAll("input")].map(i=>i.value));
if(V20_THEMES.some(theme=>!shown.has(theme)))rebuildThemesV20();
removeRenderedCodeBug();
}
const showScreenBeforeV20=showScreen;
showScreen=function(id){
const result=showScreenBeforeV20(id);
setTimeout(verifyThemes,30);
return result;
};
const createRoomBeforeV20=createRoom;
createRoom=function(){
const result=createRoomBeforeV20();
setTimeout(verifyThemes,350);
return result;
};
setTimeout(()=>{rebuildThemesV20();verifyThemes();},80);
setInterval(verifyThemes,1800);
document.title="Qui suis-je ? 🎮 — V20.5 optimisée";
console.log("V20.1 : bug d'affichage en bas supprimé et 16 thèmes intégrés au sélecteur final.");
})();
