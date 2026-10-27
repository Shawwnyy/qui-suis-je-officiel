/* =========================================================
RÉACTIONS
========================================================= */
function sendReaction(emoji){
const data={
type:"reaction",
emoji:emoji,
playerName:myName
};
if(isHost){
showReaction(
emoji,
myName
);
broadcast(data);
}else{
const connection=
Object.values(connections)[0];
if(
connection&&
connection.open
){
connection.send(data);
}
}
}
function showReaction(
emoji,
playerName
){
const element=
document.createElement("div");
element.textContent=
`${emoji} ${playerName}`;
element.style.position="fixed";
element.style.left=
`${15+Math.random()*70}%`;
element.style.bottom="25px";
element.style.zIndex="3600";
element.style.fontSize="25px";
element.style.fontWeight="900";
element.style.pointerEvents="none";
element.style.animation=
"reactionFloat 1.5s forwards";
document.body.appendChild(element);
setTimeout(()=>{
element.remove();
},1500);
}
const reactionStyle=
document.createElement("style");
reactionStyle.textContent=`
@keyframes reactionFloat{
from{
transform:
translateY(0)
scale(.7);
opacity:0;
}
20%{
opacity:1;
}
to{
transform:
translateY(-180px)
scale(1.25);
opacity:0;
}
}
`;
document.head.appendChild(
reactionStyle
);
