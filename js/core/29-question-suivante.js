/* =========================================================
QUESTION SUIVANTE
========================================================= */
function continueNextQuestion(){
if(!isHost)return;
currentQuestionIndex++;
sendNextQuestion();
}
