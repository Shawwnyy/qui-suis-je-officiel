/* =========================================================
UTILITAIRES
========================================================= */
function showScreen(id){
document.querySelectorAll(".screen")
.forEach(s=>{
s.classList.remove("active");
});
document.getElementById(id)
.classList.add("active");
}
function showMessage(
id,
text,
type="error"
){
const el=
document.getElementById(id);
el.textContent=text;
el.className=
"message show "+type;
}
function randomCode(){
return String(
Math.floor(
100000+
Math.random()*900000
)
);
}
function randomAvatar(){
const avatars=[
"😎","🤓","😈","👽",
"🤠","🥳","🦊","🐸",
"🐼","🐯","🦁","🐵",
"👻","🤖","🥷","🧙"
];
return avatars[
Math.floor(
Math.random()*avatars.length
)
];
}
function shuffle(array){
return [...array].sort(
()=>Math.random()-.5
);
}
function escapeHTML(text){
return String(text)
.replaceAll("&","&amp;")
.replaceAll("<","&lt;")
.replaceAll(">","&gt;")
.replaceAll('"',"&quot;")
.replaceAll("'","&#039;");
}
function escapeAttribute(text){
return String(text)
.replaceAll("\\","\\\\")
.replaceAll("'","\\'");
}
function cleanPlayers(){
const result={};
Object.entries(players)
.forEach(([id,p])=>{
result[id]={
id:p.id,
name:p.name,
score:p.score||0,
avatar:p.avatar,
host:!!p.host,
answerReceived:
!!p.answerReceived,
correct:p.correct||0,
wrong:p.wrong||0,
combo:p.combo||0,
bestCombo:p.bestCombo||0,
bonusPoints:p.bonusPoints||0,
malusPoints:p.malusPoints||0,
bonusesGiven:p.bonusesGiven||0,
fx:p.fx||{},
used:p.used||[],
malusesReceived:p.malusesReceived||0,
powerAvailable:
!!p.powerAvailable
};
});
return result;
}
