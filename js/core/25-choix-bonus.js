/* =========================================================
CHOIX BONUS
========================================================= */
function chooseBonus(){
if(!powerOpen)return;
const modal=document.getElementById("powerModal");
sendPowerChoice(
"bonus",
null,
Number(modal.dataset.level),
modal.dataset.token,
document.getElementById("bonusType").value
);
}
function chooseMalus(){
if(!powerOpen)return;
const target=document.getElementById("malusTarget").value;
if(!target){
alert("Choisis un adversaire.");
return;
}
const modal=document.getElementById("powerModal");
sendPowerChoice(
"malus",
target,
Number(modal.dataset.level),
modal.dataset.token,
document.getElementById("malusType").value
);
}
function sendPowerChoice(choice,targetId,level,token,kind){
if(!powerOpen)return;
closePowerModal();
const data={
type:"powerChoice",
playerId:myId,
choice:choice,
targetId:targetId,
level:level,
token:token,
kind:kind
};
if(isHost){
handlePowerChoice(data);
}else{
const connection=Object.values(connections)[0];
if(connection&&connection.open){
connection.send(data);
}
}
}
const POWER_KINDS={
bonus:["xp","shield","double","jackpot","triple"],
malus:["xp","freeze","steal","crush","halve"]
};
function powerAmounts(level){
return level>=4
?{bonus:600,malus:400,steal:300,jackpot:1500,crush:900}
:{bonus:300,malus:200,steal:150,jackpot:1000,crush:600};
}
function handlePowerChoice(data){
if(!isHost)return;
const player=players[data.playerId];
if(!player)return;
if(!player.currentPowerToken||
player.currentPowerToken!==data.token)return;
player.currentPowerToken=null;
player.powerAvailable=false;
const amt=powerAmounts(data.level);
let choice=data.choice==="malus"?"malus":"bonus";
let kind=data.kind;
let target=null;
let blocked=false;
let amount=0;
if(choice==="malus"){
target=players[data.targetId];
if(!target||target.id===player.id){
choice="bonus";
kind="xp";
target=null;
}
}
if(!POWER_KINDS[choice].includes(kind)){
kind="xp";
}
let ext=null;
if(EXT_POWERS[kind]){
const used=player.used||(player.used=[]);
if(powerBlockedFor(player,kind)){
kind="xp";
}else{
used.push(kind);
}
}
if(EXT_POWERS[kind]){
ext=applyExtPower(player,target,kind,data.level);
blocked=ext.blocked;
if(choice==="malus"){
player.malusesGiven=(player.malusesGiven||0)+1;
}else{
player.bonusesGiven=(player.bonusesGiven||0)+1;
}
}else if(choice==="bonus"){
if(kind==="xp"){
amount=amt.bonus;
player.score+=amount;
player.bonusPoints=(player.bonusPoints||0)+amount;
}else if(kind==="shield"){
player.shield=true;
}else if(kind==="double"){
player.doubleNext=true;
}else if(kind==="jackpot"){
amount=amt.jackpot;
player.score+=amount;
player.bonusPoints=(player.bonusPoints||0)+amount;
}else if(kind==="triple"){
player.tripleNext=true;
}
player.bonusesGiven=(player.bonusesGiven||0)+1;
}else{
if(target.shield){
target.shield=false;
blocked=true;
}else if(kind==="xp"){
amount=Math.min(amt.malus,target.score);
target.score-=amount;
target.malusPoints=(target.malusPoints||0)+amount;
target.malusesReceived=(target.malusesReceived||0)+1;
}else if(kind==="freeze"){
target.combo=0;
target.powerGrantedCombo=0;
target.malusesReceived=(target.malusesReceived||0)+1;
}else if(kind==="steal"){
amount=Math.min(amt.steal,target.score);
target.score-=amount;
player.score+=amount;
target.malusPoints=(target.malusPoints||0)+amount;
target.malusesReceived=(target.malusesReceived||0)+1;
player.bonusPoints=(player.bonusPoints||0)+amount;
}else if(kind==="crush"){
amount=Math.min(amt.crush,target.score);
target.score-=amount;
target.malusPoints=(target.malusPoints||0)+amount;
target.malusesReceived=(target.malusesReceived||0)+1;
}else if(kind==="halve"){
const before=target.score;
target.score=Math.floor(target.score/2);
amount=before-target.score;
target.malusPoints=(target.malusPoints||0)+amount;
target.malusesReceived=(target.malusesReceived||0)+1;
}
}
const result={
type:"powerResult",
playerId:player.id,
playerName:player.name,
choice:choice,
kind:kind,
amount:amount,
blocked:blocked,
ext:ext,
targetId:target?target.id:null,
targetName:target?target.name:null,
level:data.level,
players:cleanPlayers()
};
broadcast(result);
showPowerResult(result);
setTimeout(()=>{
triggerNextPower();
},(window.__readPause||13000));
}
