/* =========================================================
V7 — NOUVEAUX BONUS / MALUS (8)
========================================================= */
Object.assign(EXT_POWERS,{
armure:{type:"bonus",r:2,emoji:"🛡️",name:"Armure",desc:"bloque les 2 prochains malus (3 q.)",q:3},
star:{type:"bonus",r:1,emoji:"⭐",name:"Star",desc:"chaque bonne réponse = +2 combo (2 q.)",q:2},
diamant:{type:"bonus",r:1,emoji:"💎",name:"Diamant",desc:"+150 pts par bonne réponse (3 q.)",q:3},
sablier:{type:"bonus",r:0,emoji:"⌛",name:"Sablier+",desc:"+25 % de chrono (2 q.)",q:2},
gele:{type:"malus",r:1,emoji:"🥶",name:"Gel prolongé",desc:"combo bloqué à 0 pendant 2 q.",q:2},
escargot:{type:"malus",r:1,emoji:"🐌",name:"Escargot",desc:"-4 s de chrono par question (3 q.)",q:3},
demi:{type:"malus",r:1,emoji:"🎭",name:"Imposteur",desc:"ses gains sont divisés par 2 (2 q.)",q:2},
ponction:{type:"malus",r:1,emoji:"🩸",name:"Ponction",desc:"sa prochaine erreur coûte -300 pts (3 q.)",q:3}
});
EXT_IDS.bonus=Object.keys(EXT_POWERS).filter(k=>EXT_POWERS[k].type==="bonus");
EXT_IDS.malus=Object.keys(EXT_POWERS).filter(k=>EXT_POWERS[k].type==="malus");
POWER_KINDS.bonus.push("armure","star","diamant","sablier");
POWER_KINDS.malus.push("gele","escargot","demi","ponction");
NEG_FX.push("gele","escargot","demi","ponction");
POS_FX.push("armure","star","diamant","sablier");
const __timeV7=fxTimeDelta;
fxTimeDelta=function(p){
let d=__timeV7(p);
if(fxOn(p,"sablier"))d+=Math.round(questionTime*0.25);
if(fxOn(p,"escargot"))d-=4;
return Math.max(5,questionTime+d)-questionTime;
};
const __comboV7=nextComboValue;
nextComboValue=function(p){
if(fxOn(p,"gele")){
p.lastCorrect=true;
return 0;
}
let c=__comboV7(p);
if(fxOn(p,"star"))c+=1;
return c;
};
const __scoreV7=applyScoreFx;
applyScoreFx=function(p,pts,data){
const q=currentQuestion||{};
/* Question impossible : score ×4 (sans-faute uniquement) */
if(q.impossible&&(q.impIds||[]).includes(p.id)){
announce("💀 "+p.name+" réussit la question impossible : score ×4 !");
return Math.round((p.score||0)*3);
}
let g=__scoreV7(p,pts,data);
if(fxOn(p,"diamant"))g+=150;
if(fxOn(p,"demi"))g=Math.round(g/2);
return g;
};
const __wrongV7=onWrongFx;
onWrongFx=function(p){
const q=currentQuestion||{};
__wrongV7(p);
if(fxOn(p,"ponction")){
p.score=Math.max(0,p.score-300);
delete fxOf(p).ponction;
}
if(q.impossible&&(q.impIds||[]).includes(p.id)){
p.score=Math.floor((p.score||0)/4);
announce("💀 "+p.name+" rate la question impossible : score ÷4 !");
}
};
const __applyExtV7=applyExtPower;
applyExtPower=function(player,target,id,level){
const d=EXT_POWERS[id];
if(d&&d.type==="malus"&&target&&fxOn(target,"armure")){
const a=fxOf(target).armure;
a.hits=(a.hits===undefined?2:a.hits)-1;
if(a.hits<=0)delete fxOf(target).armure;
const label=d.emoji+" "+d.name;
return{
id,label,blocked:true,reflected:false,
msgSelf:"🛡️ L'armure de "+target.name+" a bloqué ton "+label+" !",
msgTarget:"🛡️ Ton armure a bloqué "+label+" de "+player.name+" !"
};
}
return __applyExtV7(player,target,id,level);
};
