/* =========================================================
REJOINDRE
========================================================= */
function joinRoom(){
initAudio();
const name=
document.getElementById(
"joinName"
).value.trim();
const code=
document.getElementById(
"roomInput"
).value.trim();
if(!name){
showMessage(
"homeMessage",
"Entre ton pseudo !"
);
return;
}
if(!/^\d{6}$/.test(code)){
showMessage(
"homeMessage",
"Le code doit contenir 6 chiffres."
);
return;
}
const nameCheck=validatePlayerName(name);
if(!nameCheck.ok){
showMessage("homeMessage",nameCheck.error);
return;
}
myName=nameCheck.name;
document.getElementById("joinName").value=myName;
isHost=false;
kicked=false;
gameStarted=false;
roomCode=code;
peer=new Peer();
peer.on("open",id=>{
myId=id;
const connection=
peer.connect(
"quiz-"+roomCode,
{reliable:true}
);
setupConnection(connection);
});
peer.on("error",error=>{
console.error(error);
showMessage(
"homeMessage",
"Impossible de rejoindre la partie."
);
});
}
