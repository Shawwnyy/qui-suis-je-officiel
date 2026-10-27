/* =========================================================
JOUEURS
========================================================= */
function updatePlayers(){
const container=
document.getElementById(
"playersList"
);
if(!container)return;
container.innerHTML="";
Object.values(players)
.forEach(player=>{
const div=
document.createElement("div");
div.className="player";
let kick="";
if(
isHost&&
!player.host
){
kick=`
<button class="kick-button"
onclick="kickPlayer('${escapeAttribute(player.id)}')">
🚫 Expulser
</button>
`;
}
div.innerHTML=`
<div class="player-avatar">
${escapeHTML(player.avatar)}
</div>
<div class="player-name">
${escapeHTML(player.name)}
</div>
${
player.host
?`
<span class="host-badge">
👑 HÔTE
</span>
`
:""
}
${kick}
`;
container.appendChild(div);
});
const start=
document.getElementById(
"startButton"
);
const settings=
document.getElementById(
"hostSettings"
);
if(isHost){
start.style.display="block";
settings.style.display="block";
}else{
start.style.display="none";
settings.style.display="none";
}
}
