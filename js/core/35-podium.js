/* =========================================================
PODIUM
========================================================= */
function buildPodium(sorted){
const podium=
document.getElementById(
"podium"
);
podium.innerHTML="";
const order=[
sorted[1],
sorted[0],
sorted[2]
];
order.forEach((player,index)=>{
if(!player)return;
const actual=
index===0
?1
:index===1
?0
:2;
const div=
document.createElement("div");
div.className=
"podium-item podium-"+
(actual+1);
div.innerHTML=`
<div class="podium-avatar">
${escapeHTML(player.avatar)}
</div>
<div class="podium-name">
${escapeHTML(player.name)}
</div>
<div class="podium-block">
${
actual===0
?"🥇"
:actual===1
?"🥈"
:"🥉"
}
</div>
`;
podium.appendChild(div);
});
}
