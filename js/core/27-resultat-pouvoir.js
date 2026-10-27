/* =========================================================
RESULTAT POUVOIR
========================================================= */
function showPowerResult(data){
if(data.ext){
showExtResult(data);
return;
}
const me=data.playerId===myId;
const tgt=data.targetId===myId;
const a=data.amount;
if(data.choice==="bonus"){
if(me){
const txt={
xp:`🎁 BONUS : +${a} points !`,
shield:"🛡️ Bouclier activé : ton prochain malus sera annulé !",
double:"✨ Double points : ta prochaine bonne réponse vaut ×2 !",
jackpot:`💎 Jackpot : +${a} points !`,
triple:"🚀 Triple points : ta prochaine bonne réponse vaut ×3 !"
}[data.kind];
showFeedback(true,"🎁");
showPowerPanel(txt,"#86efac");
}
}else{
if(me){
const txt=data.blocked
?`🛡️ ${data.targetName} a bloqué ton malus !`
:{
xp:`💥 Malus donné à ${data.targetName} : -${a} points !`,
freeze:`🧊 ${data.targetName} perd son combo !`,
steal:`🦝 Tu voles ${a} points à ${data.targetName} !`,
crush:`💣 Impact sur ${data.targetName} : -${a} points !`,
halve:`📉 ${data.targetName} perd la moitié de son score !`
}[data.kind];
showFeedback(true,"💥");
showPowerPanel(txt,"#facc15");
}
if(tgt){
const txt=data.blocked
?`🛡️ Ton bouclier a bloqué le malus de ${data.playerName} !`
:{
xp:`💥 ${data.playerName} t'a donné un malus : -${a} points !`,
freeze:`🧊 ${data.playerName} t'a gelé : combo perdu !`,
steal:`🦝 ${data.playerName} t'a volé ${a} points !`,
crush:`💣 ${data.playerName} t'a retiré ${a} points !`,
halve:`📉 ${data.playerName} t'a fait perdre la moitié de ton score !`
}[data.kind];
showFeedback(!!data.blocked,"💥");
showPowerPanel(txt,data.blocked?"#86efac":"#fca5a5");
}
}
updateMyScore();
}
function showPowerPanel(
text,
color
){
const panel=
document.getElementById(
"powerPanel"
);
const powerText=
document.getElementById(
"powerText"
);
panel.classList.remove(
"hidden"
);
powerText.textContent=
text;
powerText.style.color=
color;
setTimeout(()=>{
panel.classList.add(
"hidden"
);
},3000);
}
