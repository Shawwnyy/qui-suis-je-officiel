/* =========================================================
SCORE
========================================================= */
function updateMyScore(){
const me=
players[myId];
if(me){
document.getElementById(
"myScore"
).textContent=
me.score||0;
}
}
