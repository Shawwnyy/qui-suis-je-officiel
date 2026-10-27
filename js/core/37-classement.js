/* =========================================================
CLASSEMENT
========================================================= */
function buildScoreboard(sorted){
const container=
document.getElementById(
"finalScores"
);
container.innerHTML="";
sorted.forEach(
(player,index)=>{
const row=
document.createElement(
"div"
);
row.className=
"score-row";
let medal;
if(index===0)
medal="🥇";
else if(index===1)
medal="🥈";
else if(index===2)
medal="🥉";
else
medal="#"+(index+1);
row.innerHTML=`
<div class="position">
${medal}
</div>
<div class="score-name">
${escapeHTML(player.avatar)}
${escapeHTML(player.name)}
<div class="detail-line">
✅ ${player.correct||0}
&nbsp; • &nbsp;
❌ ${player.wrong||0}
&nbsp; • &nbsp;
🔥 Combo max :
${player.bestCombo||0}
</div>
<div class="detail-line">
🎁 Bonus :
<span class="bonus-text">
+${player.bonusPoints||0}
</span>
&nbsp; • &nbsp;
💥 Malus :
<span class="malus-text">
-${player.malusPoints||0}
</span>
</div>
<div class="detail-line">
🎯 Pouvoirs utilisés :
${player.bonusesGiven||0}
&nbsp; • &nbsp;
💥 Malus reçus :
${player.malusesReceived||0}
</div>
</div>
<div class="points">
${player.score||0} pts
</div>
`;
container.appendChild(row);
}
);
}
