/* =========================================================
RÉSULTATS
========================================================= */
function finishGame(){
if(gameFinishSent)return;
gameFinishSent=true;
clearInterval(timer);
clearTimeout(questionResultTimeout);
gameStarted=false;
const clean=
cleanPlayers();
const data={
type:"gameOver",
players:clean
};
showResults(clean);
broadcast(data);
}
function showResults(data){
clearInterval(timer);
closePowerModal();
gameStarted=false;
if(!isHost){
players=data||{};
}
const sorted=
Object.values(players)
.sort(
(a,b)=>
(b.score||0)-
(a.score||0)
);
if(sorted.length){
document.getElementById(
"winnerName"
).textContent=
"🎉 "+sorted[0].name;
}
buildPodium(sorted);
buildStats(sorted);
buildScoreboard(sorted);
showScreen(
"resultsScreen"
);
soundVictory();
setTimeout(
fireworksShow,
350
);
}
