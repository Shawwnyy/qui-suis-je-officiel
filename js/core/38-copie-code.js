/* =========================================================
COPIE CODE
========================================================= */
function copyRoomCode(){
if(!roomCode)return;
if(navigator.clipboard){
navigator.clipboard
.writeText(roomCode)
.then(()=>{
document.getElementById(
"waitingText"
).textContent=
"✅ Code copié !";
setTimeout(()=>{
document.getElementById(
"waitingText"
).textContent=
"Partage le code à tes amis !";
},2000);
})
.catch(()=>{
alert(
"Ton code est : "+
roomCode
);
});
}else{
alert(
"Ton code est : "+
roomCode
);
}
}
