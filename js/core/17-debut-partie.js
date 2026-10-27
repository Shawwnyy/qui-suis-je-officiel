/* =========================================================
DÉBUT PARTIE
========================================================= */
function requestStartGame(){
openConfirm(
"Lancer la partie ?",
"Les paramètres seront verrouillés.",
startGame,
"🎮"
);
}
function startGame(){
if(!isHost)return;
selectedThemes=
[...document.querySelectorAll(
"#themeGrid input:checked"
)].map(input=>input.value);
if(!selectedThemes.length){
alert(
"Sélectionne au moins un thème."
);
return;
}
questionTime=
Number(
document.getElementById(
"questionTime"
).value
);
const pool=
getQuestionPool().filter(q=>hasTranslation(q,document.getElementById("questionLang").value));
if(!pool.length){
alert("Aucune question dans cette langue pour ces thèmes : choisis d'autres thèmes.");
return;
}
const requested=
Number(
document.getElementById(
"roundCount"
).value
);
totalRounds=
Math.min(
requested,
pool.length
);
questionLang=
document.getElementById("questionLang")
?document.getElementById("questionLang").value
:"fr";
usedQuestions=
shuffle(pool)
.slice(0,totalRounds)
.map(q=>shuffleQuestionAnswers(localizeQuestion(q,questionLang)));
currentQuestionIndex=0;
gameStarted=true;
gameFinishSent=false;
Object.values(players)
.forEach(player=>{
player.score=0;
player.correct=0;
player.wrong=0;
player.combo=0;
player.bestCombo=0;
player.bonusPoints=0;
player.malusPoints=0;
player.bonusesGiven=0;
player.malusesReceived=0;
player.answerReceived=false;
player.powerAvailable=false;
player.currentPowerToken=null;
player.powerGrantedCombo=0;
player.shield=false;
player.doubleNext=false;
player.tripleNext=false;
});
sendNextQuestion(true);
}
