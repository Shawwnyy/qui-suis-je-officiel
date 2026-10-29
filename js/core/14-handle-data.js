/* =========================================================
HANDLE DATA
========================================================= */
function handleData(data){
if(!data||!data.type)return;
/* JOIN */
if(
isHost&&
data.type==="join"
){
if(gameStarted){
sendTo(
data.player.id,
{
type:"error",
message:"La partie a déjà commencé."
}
);
return;
}
if(
Object.keys(players).length>=(typeof window.v54PlayerCap==="function"?window.v54PlayerCap():8)
){
sendTo(
data.player.id,
{
type:"error",
message:"La partie est pleine."
}
);
return;
}
const nameCheck=validatePlayerName(data.player.name);
if(!nameCheck.ok){
sendTo(data.player.id,{type:"error",message:nameCheck.error});
return;
}
data.player.name=assignUniqueName(nameCheck.name,data.player.id).name;
const incoming=
data.player;
incoming.score=0;
incoming.correct=0;
incoming.wrong=0;
incoming.combo=0;
incoming.bestCombo=0;
incoming.bonusPoints=0;
incoming.malusPoints=0;
incoming.bonusesGiven=0;
incoming.malusesReceived=0;
incoming.powerAvailable=false;
incoming.powerGrantedCombo=0;
incoming.shield=false;
incoming.doubleNext=false;
incoming.tripleNext=false;
players[
incoming.id
]=incoming;
sendTo(
incoming.id,
{
type:"players",
players:cleanPlayers()
}
);
broadcastPlayers();
updatePlayers();
return;
}
/* PLAYERS */
if(
!isHost&&
data.type==="players"
){
players=
data.players||{};
if(players[myId]&&players[myId].name){
myName=players[myId].name;
}
updatePlayers();
showWaitingScreen();
updateMyScore();
return;
}
/* GAME START */
if(
!isHost&&
data.type==="gameStart"
){
totalRounds=
data.totalRounds;
questionTime=
data.questionTime;
players=
data.players||players;
gameStarted=true;
showScreen("gameScreen");
displayQuestion(
data.question,
data.round
);
return;
}
/* NEXT QUESTION */
if(
!isHost&&
data.type==="nextQuestion"
){
players=
data.players||players;
displayQuestion(
data.question,
data.round
);
return;
}
/* PROGRESSION */
if(
!isHost&&
data.type==="answerProgress"
){
updateAnswerProgress(
data.answered,
data.total
);
return;
}
/* QUESTION RESULT */
if(
!isHost&&
data.type==="questionResult"
){
players=
data.players||players;
showQuestionResult(data);
return;
}
/* POWER AVAILABLE */
if(
!isHost&&
data.type==="powerAvailable"
){
players=
data.players||players;
updateMyScore();
if(data.playerId===myId){
openPowerModal(
data.powerLevel,
data.token
);
}
return;
}
/* POWER RESULT */
if(
!isHost&&
data.type==="powerResult"
){
players=
data.players||players;
updateMyScore();
showPowerResult(
data
);
return;
}
/* ANSWER */
if(
isHost&&
data.type==="answer"
){
handlePlayerAnswer(data);
return;
}
/* POWER CHOICE */
if(
isHost&&
data.type==="powerChoice"
){
handlePowerChoice(data);
return;
}
/* REACTION */
if(data.type==="reaction"){
showReaction(
data.emoji,
data.playerName
);
return;
}
/* KICK */
if(
!isHost&&
data.type==="kicked"
){
kicked=true;
clearInterval(timer);
closePowerModal();
showFeedback(
false,
"✕"
);
setTimeout(()=>{
alert(
"🚫 Tu as été expulsé de la partie."
);
resetConnection();
showScreen("homeScreen");
},500);
return;
}
/* ERROR */
if(data.type==="error"){
alert(data.message);
return;
}
/* GAME OVER */
if(
!isHost&&
data.type==="gameOver"
){
showResults(
data.players
);
return;
}
}
