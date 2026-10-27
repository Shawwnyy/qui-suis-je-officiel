/* =========================================================
RÉPONSE
========================================================= */
function sendAnswer(index){
if(answered)return;
answered=true;
clearInterval(timer);
myAnswerForQuestion=index;
document.querySelectorAll(
".answer"
).forEach(button=>{
button.disabled=true;
});
const status=
document.getElementById(
"gameStatus"
);
if(index===-1){
status.textContent=
"⏱️ Temps écoulé !";
status.className=
"status error";
}else{
status.textContent=
"⏳ Réponse envoyée !";
status.className=
"status waiting";
}
const data={
type:"answer",
playerId:myId,
answer:index,
time:Math.max(
0,
timeLeft
)
};
if(isHost){
handlePlayerAnswer(data);
}else{
const hostConnection=
Object.values(connections)[0];
if(
hostConnection&&
hostConnection.open
){
hostConnection.send(data);
}else{
status.textContent=
"❌ Connexion avec l'hôte perdue.";
status.className=
"status error";
}
}
}
