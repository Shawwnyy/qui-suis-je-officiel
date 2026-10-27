/* =========================================================
VÉRIFICATION DES POUVOIRS
========================================================= */
function powerEligible(p){
return p.combo>=2 &&
p.combo%2===0 &&
p.powerGrantedCombo!==p.combo&&p.sursisCombo!==p.combo;
}
function checkPowersThenContinue(){
if(!isHost)return;
if(Object.values(players).some(powerEligible)){
triggerNextPower();
}else{
continueNextQuestion();
}
}
function triggerNextPower(){
if(!isHost)return;
const player=
Object.values(players).find(powerEligible);
if(!player){
continueNextQuestion();
return;
}
player.powerGrantedCombo=player.combo;
player.powerAvailable=true;
const level=player.combo>=4?4:2;
const token=Date.now()+"-"+Math.random();
player.currentPowerToken=token;
broadcastPlayers();
if(player.id===myId){
updateMyScore();
openPowerModal(level,token);
}else{
sendTo(player.id,{
type:"powerAvailable",
playerId:player.id,
powerLevel:level,
token:token,
players:cleanPlayers()
});
}
setTimeout(()=>{
if(player.currentPowerToken!==token)return;
player.currentPowerToken=null;
player.powerAvailable=false;
triggerNextPower();
},20500);
}
