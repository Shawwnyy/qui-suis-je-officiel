/* =========================================================
AFFICHAGE
========================================================= */
function displayQuestion(
question,
round
){
closePowerModal();
currentQuestion=question;
answered=false;
myAnswerForQuestion=null;
timeLeft=myQuestionTime(currentQuestion);
document.getElementById(
"roundNumber"
).textContent=
round;
document.getElementById(
"totalRounds"
).textContent=
totalRounds;
document.getElementById(
"questionCategory"
).textContent=
question.category;
document.getElementById(
"questionText"
).textContent=
question.question;
const diff=
document.getElementById(
"questionDifficulty"
);
diff.className=
"difficulty "+
question.difficulty;
diff.textContent=
question.diffLabel||
DIFFICULTY_INFO[question.difficulty].label;
const container=
document.getElementById(
"answers"
);
container.innerHTML="";
question.answers
.forEach((answer,index)=>{
const button=
document.createElement("button");
button.className="answer";
button.textContent=
answer;
button.onclick=()=>{
sendAnswer(index);
};
container.appendChild(button);
});
document.getElementById(
"gameStatus"
).textContent=
"Choisis une réponse !";
document.getElementById(
"gameStatus"
).className="status";
document.getElementById(
"gameStatus"
).dataset.finished="0";
document.getElementById(
"comboDisplay"
).textContent="";
document.getElementById(
"powerPanel"
).classList.add("hidden");
updateAnswerProgress(
0,
Object.keys(players).length
);
updateMyScore();
startTimer();
}
