/* =========================================================
QUITTER
========================================================= */
function requestLeave(){
openConfirm(
"Êtes-vous sûr ?",
"Tu vas quitter la partie actuelle.",
leaveRoom,
"🚪"
);
}
function leaveRoom(){
resetConnection();
showScreen(
"homeScreen"
);
}
function backToHome(){
openConfirm(
"Retour à l'accueil ?",
"La partie actuelle sera quittée.",
()=>{
resetConnection();
document.getElementById(
"hostName"
).value="";
document.getElementById(
"joinName"
).value="";
document.getElementById(
"roomInput"
).value="";
showScreen(
"homeScreen"
);
},
"🏠"
);
}
