/* =========================================================
QUESTION RESULT
========================================================= */
function showQuestionResult(data){
clearInterval(timer);
document.querySelectorAll(
".answer"
).forEach((button,index)=>{
button.disabled=true;
if(
index===data.correct
){
button.classList.add(
"correct"
);
}
if(
index===myAnswerForQuestion&&
index!==data.correct
){
button.classList.add(
"wrong"
);
}
});
const status=
document.getElementById(
"gameStatus"
);
const mineWasCorrect=
myAnswerForQuestion===
data.correct;
if(
myAnswerForQuestion!==null
){
if(mineWasCorrect){
showFeedback(
true,
"✓"
);
soundCorrect();
status.textContent=
"✅ Bonne réponse !";
status.className=
"status success";
}else{
showFeedback(
false,
"✕"
);
soundWrong();
status.textContent=
`❌ Mauvaise réponse — ${data.answer}`;
status.className=
"status error";
}
}else{
status.textContent=
`⏱️ Réponse : ${data.answer}`;
status.className=
"status";
}
if(data.players){
if(!isHost){
players=
data.players;
}
updateMyScore();
const me=
players[myId];
if(me){
document.getElementById(
"comboDisplay"
).textContent=
me.combo>=2
?`🔥 COMBO x${me.combo} !`
:"";
}
const answeredCount=
Object.values(players)
.filter(p=>
p.answerReceived
).length;
updateAnswerProgress(
answeredCount,
Object.keys(players).length
);
}
}
