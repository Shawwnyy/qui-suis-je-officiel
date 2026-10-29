/* =========================================================
CRÉATION PARTIE
========================================================= */
function createRoom(){
initAudio();
const name=
document.getElementById(
"hostName"
).value.trim();
if(!name){
showMessage(
"homeMessage",
"Entre ton pseudo !"
);
return;
}
const nameCheck=validatePlayerName(name);
if(!nameCheck.ok){
showMessage("homeMessage",nameCheck.error);
return;
}
myName=nameCheck.name;
document.getElementById("hostName").value=myName;
isHost=true;
kicked=false;
gameStarted=false;
roomCode=randomCode();
myId="quiz-"+roomCode;
peer=new Peer(myId);
peer.on("open",()=>{
players={};
players[myId]=createPlayer(
myId,
myName,
true
);
document.getElementById(
"roomCodeDisplay"
).textContent=
roomCode;
/* chaque étape est isolée : si l'une plante (script de correctif, données du navigateur…), la liste des langues,
   la grille des thèmes et la liste des joueurs se construisent quand même */
[
()=>buildLangSelect(),
()=>showScreen("lobbyScreen"),
()=>buildLangSelect(),
()=>buildThemeSelector(),
()=>updatePlayers()
].forEach(step=>{
try{step();}catch(error){console.error("Création de la salle :",error);}
});
});
peer.on("connection",connection=>{
setupConnection(connection);
});
peer.on("error",error=>{
console.error(error);
showMessage(
"homeMessage",
"Impossible de créer la partie."
);
});
}
function createPlayer(
id,
name,
host=false
){
return{
id:id,
name:name,
score:0,
avatar:randomAvatar(),
host:host,
correct:0,
wrong:0,
combo:0,
bestCombo:0,
bonusPoints:0,
malusPoints:0,
bonusesGiven:0,
malusesReceived:0,
answerReceived:false,
powerAvailable:false,
powerGrantedCombo:0,
shield:false,
doubleNext:false,
tripleNext:false,
};
}
