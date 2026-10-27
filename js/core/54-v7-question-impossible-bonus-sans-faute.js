/* =========================================================
V7 — QUESTION IMPOSSIBLE (bonus sans-faute)
========================================================= */
const IMPOSSIBLE_Q=[
["Quelle est la capitale du Bhoutan ?",["Thimphou","Paro","Punakha","Katmandou"],"What is the capital of Bhutan?",["Thimphu","Paro","Punakha","Kathmandu"],"¿Cuál es la capital de Bután?",["Timbu","Paro","Punakha","Katmandú"]],
["Qui a démontré le dernier théorème de Fermat en 1994 ?",["Andrew Wiles","Grigori Perelman","Terence Tao","Pierre de Fermat"],"Who proved Fermat's Last Theorem in 1994?",[".",".",".","."],"¿Quién demostró el último teorema de Fermat en 1994?",[".",".",".","."]],
["En quelle année a eu lieu la bataille de Marignan ?",["1515","1494","1525","1453"],"In what year was the Battle of Marignano?",[".",".",".","."],"¿En qué año tuvo lugar la batalla de Marignano?",[".",".",".","."]],
["Quel est le plus grand satellite naturel du Système solaire ?",["Ganymède","Titan","Callisto","La Lune"],"What is the largest natural satellite in the Solar System?",["Ganymede","Titan","Callisto","The Moon"],"¿Cuál es el satélite natural más grande del Sistema Solar?",["Ganímedes","Titán","Calisto","La Luna"]],
["Qui a écrit « Ulysse » en 1922 ?",["James Joyce","Virginia Woolf","Marcel Proust","Samuel Beckett"],"Who wrote 'Ulysses' in 1922?",[".",".",".","."],"¿Quién escribió «Ulises» en 1922?",[".",".",".","."]],
["Combien de côtés possède un hexadécagone ?",["16","14","12","18"],"How many sides does a hexadecagon have?",[".",".",".","."],"¿Cuántos lados tiene un hexadecágono?",[".",".",".","."]],
["Qui a découvert la radioactivité en 1896 ?",["Henri Becquerel","Marie Curie","Ernest Rutherford","Wilhelm Röntgen"],"Who discovered radioactivity in 1896?",[".",".",".","."],"¿Quién descubrió la radiactividad en 1896?",[".",".",".","."]],
["Quel peintre a réalisé « Les Ménines » ?",["Diego Vélasquez","Francisco de Goya","Bartolomé Murillo","Le Greco"],"Which painter created 'Las Meninas'?",["Diego Velázquez","Francisco de Goya","Bartolomé Murillo","El Greco"],"¿Qué pintor realizó «Las meninas»?",["Diego Velázquez","Francisco de Goya","Bartolomé Murillo","El Greco"]]
];
function buildImpossibleQuestion(lang,ids){
const r=IMPOSSIBLE_Q[Math.floor(Math.random()*IMPOSSIBLE_Q.length)];
const L=lang==="en"?[2,3]:lang==="es"?[4,5]:[0,1];
const fr=r[1];
const answers=r[L[1]].map((a,i)=>a==="."?fr[i]:a);
return shuffleQuestionAnswers({
difficulty:"impossible",
category:"💀 "+(lang==="en"?"Impossible question":lang==="es"?"Pregunta imposible":"Question impossible"),
question:r[L[0]],
answers,
correct:0,
impossible:true,
impIds:ids,
diffLabel:"💀 IMPOSSIBLE"
});
}
const __sendNextV7=sendNextQuestion;
sendNextQuestion=function(first){
if(first){
window.__impDone=false;
}else if(
isHost&&!window.__impDone&&
window.gameOpts&&window.gameOpts.impossible&&
currentQuestionIndex>=usedQuestions.length&&
usedQuestions.length>=3
){
const eligible=Object.values(players).filter(p=>(p.wrong||0)===0&&(p.correct||0)>=usedQuestions.length);
if(eligible.length){
window.__impDone=true;
const ids=eligible.map(p=>p.id);
usedQuestions.push(buildImpossibleQuestion(questionLang,ids));
totalRounds=usedQuestions.length;
announce("🏅 SANS-FAUTE : "+eligible.map(p=>p.name).join(", ")+" → QUESTION IMPOSSIBLE ! Juste = score ×4 · Faux = score ÷4");
}
}
return __sendNextV7(first);
};
/* options lobby : case "question impossible" */
const __readOptsV7=readGameOpts;
readGameOpts=function(){
__readOptsV7();
const e=document.getElementById("optImpossible");
window.gameOpts.impossible=e?e.checked:true;
};
