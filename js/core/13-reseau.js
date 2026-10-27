/* =========================================================
RÉSEAU
========================================================= */
function sendTo(playerId,data){
const connection=
connections[playerId];
if(
connection&&
connection.open
){
try{
connection.send(data);
}catch(e){}
}
}
function broadcast(data){
Object.values(connections)
.forEach(connection=>{
if(
connection&&
connection.open
){
try{
connection.send(data);
}catch(e){}
}
});
}
function broadcastPlayers(){
const safePlayers=(typeof cleanPlayers==="function")?cleanPlayers():players;
broadcast({type:"players",players:safePlayers});
updatePlayers();
}
