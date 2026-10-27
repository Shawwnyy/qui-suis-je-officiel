/* =========================================================
EXPULSION
========================================================= */
function kickPlayer(playerId){
if(!isHost)return;
const player=
players[playerId];
if(!player)return;
openConfirm(
"Expulser ce joueur ?",
`${player.name} sera retiré de la partie.`,
()=>performKick(playerId),
"🚫"
);
}
function performKick(playerId){
const connection=
connections[playerId];
if(connection){
try{
connection.send({
type:"kicked"
});
}catch(e){}
setTimeout(()=>{
try{
connection.close();
}catch(e){}
},100);
}
delete players[playerId];
delete connections[playerId];
broadcastPlayers();
updatePlayers();
}
