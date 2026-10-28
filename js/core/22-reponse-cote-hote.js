/* =========================================================
RÉPONSE CÔTÉ HÔTE
========================================================= */
function handlePlayerAnswer(data){
if(!isHost)return;
const player=
players[data.playerId];
if(!player)return;
if(
answersReceived.has(
data.playerId
)
){
return;
}
answersReceived.add(
data.playerId
);
player.answerReceived=true;
const correct=
data.answer===
currentQuestion.correct;
if(correct){
player.correct=
(player.correct||0)+1;
player.combo=nextComboValue(player);
player.bestCombo=
Math.max(
player.bestCombo||0,
player.combo
);
const multiplier=
DIFFICULTY_INFO[
currentQuestion.difficulty
].points;
const comboBonus=
Math.min(
player.combo*100,
1000
);
const speedBonus=
Math.max(0,Math.min(data.time,questionTime))*25;
const points=
(
500+
speedBonus+
comboBonus
)*multiplier;
const finalPoints=
player.tripleNext?points*3:
player.doubleNext?points*2:points;
player.doubleNext=false;
player.tripleNext=false;
player.tripleNext=false;
player.score+=applyScoreFx(player,finalPoints,data);
}else{
player.wrong=(player.wrong||0)+1;onWrongFx(player);
/*
2 mauvaises réponses consécutives :
le joueur perd automatiquement 200 points.
*/
player.powerGrantedCombo=0;
if(player.wrong%2===0&&!(window.V46Review&&window.V46Review.active())){   /* mode révision : aucune pénalité */
if(player.shield){
player.shield=false;
}else{
const malus=200;
player.score=
Math.max(0,player.score-malus);
player.malusPoints=
(player.malusPoints||0)+malus;
player.malusesReceived=
(player.malusesReceived||0)+1;
}
}
}
updateAnswerProgress(
answersReceived.size,
Object.keys(players).length
);
broadcast({
type:"answerProgress",
answered:
answersReceived.size,
total:
Object.keys(players).length
});
broadcastPlayers();
finishQuestionIfNeeded();
}
