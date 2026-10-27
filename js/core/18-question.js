/* =========================================================
QUESTION
========================================================= */
function sendNextQuestion(first=false){
closePowerModal();
clearTimeout(
questionResultTimeout
);
clearInterval(timer);
answersReceived=
new Set();
Object.values(players)
.forEach(player=>{
player.answerReceived=false;
});
if(
currentQuestionIndex>=
usedQuestions.length
){
finishGame();
return;
}
currentQuestion=
usedQuestions[
currentQuestionIndex
];
const round=
currentQuestionIndex+1;
const data={
type:first
?"gameStart"
:"nextQuestion",
question:withFxMods(currentQuestion),
round:round,
totalRounds:
totalRounds,
questionTime:
questionTime,
players:
cleanPlayers()
};
showScreen("gameScreen");
displayQuestion(data.question,round);
broadcast(data);
}
