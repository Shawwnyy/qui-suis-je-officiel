/* =========================================================
RESET
========================================================= */
function resetConnection(){
clearInterval(timer);
clearInterval(powerTimer);
clearTimeout(
questionResultTimeout
);
closePowerModal();
if(peer){
try{
peer.destroy();
}catch(e){}
}
peer=null;
connections={};
players={};
roomCode="";
myId="";
isHost=false;
gameStarted=false;
kicked=false;
currentQuestion=null;
currentQuestionIndex=0;
usedQuestions=[];
answersReceived=
new Set();
gameFinishSent=false;
myAnswerForQuestion=null;
}
