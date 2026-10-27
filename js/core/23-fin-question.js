/* =========================================================
FIN QUESTION
========================================================= */
function finishQuestionIfNeeded(){
if(!isHost)return;
const totalPlayers=
Object.keys(players).length;
if(
answersReceived.size<totalPlayers&&Date.now()<questionEndAt
){
return;
}
sendQuestionResult();
}
function sendQuestionResult(){
if(!isHost)return;
clearInterval(timer);
const status=
document.getElementById(
"gameStatus"
);
if(
status.dataset.finished==="1"
){
return;
}
status.dataset.finished="1";
fxEndQuestion();
const result={
type:"questionResult",
correct:
currentQuestion.correct,
answer:
currentQuestion.answers[
currentQuestion.correct
],
players:
cleanPlayers()
};
showQuestionResult(result);
broadcast(result);
/*
IMPORTANT :
On laisse le joueur choisir son
bonus/malus avant de passer à la
question suivante.
*/
questionResultTimeout=
setTimeout(()=>{
checkPowersThenContinue();
},2200);
}
