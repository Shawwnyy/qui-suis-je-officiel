/* =========================================================
MODAL POUVOIR
========================================================= */
function openPowerModal(
level,
token
){
clearInterval(powerTimer);
powerOpen=true;
const modal=
document.getElementById(
"powerModal"
);
modal.dataset.level=
String(level);
modal.dataset.token=
token;
const bonus=
level>=4
?600
:300;
const malus=
level>=4
?400
:200;
document.getElementById(
"powerModalTitle"
).textContent=
level>=4
?"⚡ SUPER COMBO !"
:"🔥 COMBO !";
document.getElementById(
"powerModalDescription"
).textContent=
level>=4
?"Tu as réalisé 4 bonnes réponses consécutives ! Choisis ton pouvoir."
:"Tu as réalisé 2 bonnes réponses consécutives ! Choisis ton pouvoir.";
document.getElementById(
"bonusDescription"
).textContent=
`Gagne immédiatement +${bonus} points.`;
document.getElementById(
"malusDescription"
).textContent=
`Retire ${malus} points à un adversaire.`;
const targetSelect=
document.getElementById(
"malusTarget"
);
targetSelect.innerHTML=
`<option value="">Choisir un adversaire...</option>`;
Object.values(players)
.filter(player=>
player.id!==myId
)
.forEach(player=>{
const option=
document.createElement("option");
option.value=
player.id;
option.textContent=
`${player.avatar} ${player.name} — ${player.score} pts`;
targetSelect.appendChild(
option
);
});
fillPowerSelects(level);
modal.classList.add("show");
soundPower();
startPowerCountdown();
}
function fillPowerSelectsBase(level){
const a=powerAmounts(level);
document.getElementById("bonusType").innerHTML=
`<option value="xp">💰 +${a.bonus} points</option>`+
`<option value="shield">🛡️ Bouclier (annule le prochain malus reçu)</option>`+
`<option value="double">✨ Double points (prochaine bonne réponse ×2)</option>`+
`<option value="jackpot">💎 Jackpot (+${a.jackpot} points)</option>`+
`<option value="triple">🚀 Triple points (prochaine bonne réponse ×3)</option>`;
document.getElementById("malusType").innerHTML=
`<option value="xp">💥 -${a.malus} points à la cible</option>`+
`<option value="freeze">🧊 Gel (la cible perd son combo)</option>`+
`<option value="steal">🦝 Vol (tu prends ${a.steal} points à la cible)</option>`+
`<option value="crush">💣 Impact (-${a.crush} points à la cible)</option>`+
`<option value="halve">📉 Moitié (la cible perd 50% de son score)</option>`;
document.getElementById("bonusDescription").textContent=
"Choisis ton bonus.";
document.getElementById("malusDescription").textContent=
"Choisis ton malus et ta cible.";
}
function startPowerCountdown(){
clearInterval(powerTimer);
let left=20;
const element=
document.getElementById(
"powerCountdownValue"
);
const circle=
document.getElementById(
"powerCountdown"
);
element.textContent=
left;
circle.style.background=
`conic-gradient(
#facc15 100%,
rgba(255,255,255,.1) 0
)`;
powerTimer=setInterval(()=>{
left--;
element.textContent=
Math.max(0,left);
const percent=
Math.max(
0,
left/10*100
);
circle.style.background=
`conic-gradient(
${
left<=3
?"var(--red)"
:"#facc15"
}
${percent}%,
rgba(255,255,255,.1) 0
)`;
if(left<=3){
tone(700,.06,"square",.05);
}
if(left<=0){
clearInterval(powerTimer);
closePowerModal();
}
},1000);
}
function closePowerModal(){
clearInterval(powerTimer);
powerOpen=false;
const modal=
document.getElementById(
"powerModal"
);
modal.classList.remove("show");
}
