/* =========================================================
CONNEXION
========================================================= */
function setupConnection(connection){
connection.on("open",()=>{
connections[
connection.peer
]=connection;
if(!isHost){
connection.send({
type:"join",
player:createPlayer(
myId,
myName,
false
)
});
}
});
connection.on("data",data=>{
handleData(data);
});
connection.on("close",()=>{
delete connections[
connection.peer
];
if(isHost){
if(players[connection.peer]){
delete players[
connection.peer
];
broadcastPlayers();
updatePlayers();
}
}else if(!gameStarted){
showMessage(
"homeMessage",
"Connexion avec l'hôte perdue."
);
resetConnection();
showScreen("homeScreen");
}
});
}
