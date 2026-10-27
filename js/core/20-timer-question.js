/* =========================================================
TIMER QUESTION
========================================================= */
function startTimer(){
clearInterval(timer);
timeLeft=myQuestionTime(currentQuestion);
updateTimer();
timer=setInterval(()=>{
timeLeft--;
updateTimer();
if(
timeLeft<=5&&
timeLeft>0
){
soundCountdown();
}
if(timeLeft<=0){
clearInterval(timer);
if(!answered){
sendAnswer(-1);
}
if(isHost){
finishQuestionIfNeeded();
}
}
},1000);
}
function soundCountdown(){
tone(
650,
.08,
"square",
.06
);
}
function updateTimer(){
const value=
document.getElementById(
"timerValue"
);
const timerElement=
document.getElementById(
"timer"
);
value.textContent=
timeLeft;
const percent=
Math.min(100,timeLeft/myQuestionTime(currentQuestion)*100);
timerElement.style.background=
`conic-gradient(
var(--primary2)
${percent}%,
rgba(255,255,255,.08) 0
)`;
timerElement.classList.toggle(
"danger",
timeLeft<=5
);
value.style.color=
timeLeft<=5
?"var(--red)"
:"white";
}
