/* =========================================================
STATS
========================================================= */
function buildStats(sorted){
const container=
document.getElementById(
"statsGrid"
);
container.innerHTML="";
if(!sorted.length)return;
const totalCorrect=
sorted.reduce(
(sum,p)=>
sum+(p.correct||0),
0
);
const totalWrong=
sorted.reduce(
(sum,p)=>
sum+(p.wrong||0),
0
);
const totalBonus=
sorted.reduce(
(sum,p)=>
sum+(p.bonusPoints||0),
0
);
const totalMalus=
sorted.reduce(
(sum,p)=>
sum+(p.malusPoints||0),
0
);
const bestCombo=
Math.max(
...sorted.map(
p=>p.bestCombo||0
)
);
const stats=[
[
"🏆",
"Score gagnant",
sorted[0].score||0
],
[
"🔥",
"Meilleur combo",
bestCombo
],
[
"✅",
"Bonnes réponses",
totalCorrect
],
[
"❌",
"Mauvaises réponses",
totalWrong
],
[
"🎁",
"Points bonus",
totalBonus
],
[
"💥",
"Points de malus",
totalMalus
],
[
"👥",
"Joueurs",
sorted.length
],
[
"❓",
"Questions",
totalRounds
]
];
stats.forEach(stat=>{
const div=
document.createElement("div");
div.className="stat-card";
div.innerHTML=`
<div class="stat-number">
${stat[0]} ${stat[2]}
</div>
<div class="stat-label">
${stat[1]}
</div>
`;
container.appendChild(div);
});
}
