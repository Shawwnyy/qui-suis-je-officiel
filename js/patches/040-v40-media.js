/* V40 — affiche l'image / la vidéo / l'illustration d'une question au-dessus de son texte, chez tous les joueurs. */
(function V40Media(){
"use strict";
if(typeof window==="undefined"||!window.QMedia||typeof displayQuestion!=="function")return;
var Q=window.QMedia;
var baseDisplay=displayQuestion;
displayQuestion=function(q,round){
var r=baseDisplay(q,round);
try{Q.mountForQuestion(q);}catch(e){}
return r;
};
if(typeof showResults==="function"){
var baseResults=showResults;
showResults=function(){try{Q.clearQuestionMedia();}catch(e){}return baseResults.apply(this,arguments);};
}
var baseReset=resetConnection;
resetConnection=function(){try{Q.clearQuestionMedia();}catch(e){}return baseReset.apply(this,arguments);};
})();
