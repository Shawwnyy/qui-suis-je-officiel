/* =========================================================
POUVOIRS ÉTENDUS (V4) — rareté, effets multi-questions
========================================================= */
const RARITY_ICON=["⚪","🟢","🔵"];
const EXT_POWERS={
/* BONUS */
minuterie:{type:"bonus",r:0,emoji:"⏰",name:"Minuterie+",desc:"+8 s sur ta prochaine question",q:1},
etincelle:{type:"bonus",r:1,emoji:"✨",name:"Étincelle",desc:"+1 combo immédiat",q:0},
cible:{type:"bonus",r:1,emoji:"🎯",name:"Cible parfaite",desc:"+50 % si tu réponds en moins de 5 s",q:1},
pari:{type:"bonus",r:1,emoji:"🧮",name:"Pari sur toi",desc:"mise 200 pts : juste = +400, faux = -200",q:1},
interets:{type:"bonus",r:1,emoji:"📈",name:"Intérêts",desc:"+5 % de ton score par bonne réponse (3 q.)",q:3},
sursis:{type:"bonus",r:1,emoji:"🔥",name:"Combo en sursis",desc:"ta prochaine erreur ne casse pas ton combo",q:3},
herisson:{type:"bonus",r:1,emoji:"🦔",name:"Hérisson",desc:"qui te cible perd 1 combo (2 q.)",q:2},
purif:{type:"bonus",r:1,emoji:"🧼",name:"Purification",desc:"efface tes effets négatifs",q:0},
chasseur:{type:"bonus",r:1,emoji:"🏹",name:"Chasseur de leader",desc:"+25 % si tu n'es pas 1er (2 q.)",q:2},
turbo:{type:"bonus",r:1,emoji:"🏎️",name:"Turbo",desc:"+30 % si tu réponds en moins de 8 s (2 q.)",q:2},
de:{type:"bonus",r:0,emoji:"🎲",name:"Dé du destin",desc:"1-2 combo +1, 3-4 bouclier, 5-6 prochaine bonne réponse ×2",q:0},
miroir:{type:"bonus",r:2,emoji:"🪞",name:"Miroir",desc:"renvoie le prochain malus reçu (3 q.)",q:3},
fusion:{type:"bonus",r:2,emoji:"🌋",name:"Série en fusion",desc:"+10 %/combo (max +50 %), erreur = -100 (3 q.)",q:3},
/* MALUS */
blind:{type:"malus",r:0,emoji:"🙈",name:"Chrono masqué",desc:"la cible ne voit plus son chrono (2 q.)",q:2},
reduit:{type:"malus",r:1,emoji:"⏳",name:"Temps réduit",desc:"chrono de la cible réduit (1 q.)",q:1},
tranche:{type:"malus",r:1,emoji:"🪓",name:"Combo tranché",desc:"le combo de la cible est divisé par 2",q:0},
stifle:{type:"malus",r:1,emoji:"🧯",name:"Étouffoir",desc:"sa prochaine bonne réponse ne fait pas monter son combo",q:3},
cap:{type:"malus",r:1,emoji:"🌡️",name:"Plafond de combo",desc:"combo de la cible bloqué à 2 (3 q.)",q:3},
taxe:{type:"malus",r:1,emoji:"🧾",name:"Taxe",desc:"20 % de ses gains te sont reversés (2 q.)",q:2},
briseur:{type:"malus",r:1,emoji:"⚒️",name:"Briseur de bouclier",desc:"retire ses protections (sinon -1 combo)",q:0},
coupe:{type:"malus",r:1,emoji:"🔌",name:"Coupe-circuit",desc:"annule ses bonus (sinon -3 s)",q:0},
fatigue:{type:"malus",r:1,emoji:"🥱",name:"Fatigue",desc:"chaque bonne réponse lui retire 1 s (max -3 s, 3 q.)",q:3},
piege:{type:"malus",r:1,emoji:"⏲️",name:"Minuterie piégée",desc:"chrono de la cible -25 % (2 q.)",q:2},
pileface:{type:"malus",r:0,emoji:"🪙",name:"Pile ou face maudit",desc:"pile -1 combo, face +1 combo pour la cible",q:0},
roulette:{type:"malus",r:1,emoji:"🔫",name:"Roulette",desc:"un malus de temps/combo tiré au hasard",q:0},
bombe:{type:"malus",r:1,emoji:"🧨",name:"Bombe à retardement",desc:"perd son combo dans 2 q. sauf 2 bonnes réponses",q:2}
};
const EXT_IDS={
bonus:Object.keys(EXT_POWERS).filter(k=>EXT_POWERS[k].type==="bonus"),
malus:Object.keys(EXT_POWERS).filter(k=>EXT_POWERS[k].type==="malus")
};
POWER_KINDS.bonus.push(...EXT_IDS.bonus);
POWER_KINDS.malus.push(...EXT_IDS.malus);
const NEG_FX=["blind","reduit","stifle","cap","taxe","fatigue","bombe","coupe","piege"];
const POS_FX=["minuterie","cible","pari","interets","sursis","herisson","miroir","fusion","chasseur","turbo"];
let questionEndAt=0;
function fxOf(p){
return p.fx||(p.fx={});
}
function fxOn(p,id){
const f=fxOf(p)[id];
return !!(f&&f.left>0);
}
/* Intensité selon le nombre de joueurs : 0.6 (2 j.) → 1.2 (8 j.) */
function fxIntensity(){
const n=Object.keys(players).length;
return Math.min(1.2,Math.max(0.6,0.6+0.1*(n-2)));
}
function powerBlockedFor(p,id){
const u=(p&&p.used)||[];
return u.filter(k=>k===id).length>=2||u.slice(-3).includes(id);
}
/* ---------- Chrono par joueur ---------- */
function fxTimeDelta(p){
let d=0;
if(fxOn(p,"minuterie"))d+=8;
if(fxOn(p,"reduit"))d-=Math.round(questionTime*fxOf(p).reduit.pct);
if(fxOn(p,"fatigue"))d-=fxOf(p).fatigue.stack||0;
if(fxOn(p,"coupe"))d-=3;
if(fxOn(p,"piege"))d-=Math.round(questionTime*0.25);
return Math.max(5,questionTime+d)-questionTime;
}
function withFxMods(q){
if(typeof currentQuestionIndex!=="undefined"&&currentQuestionIndex===0){
Object.values(players).forEach(p=>{p.fx={};p.used=[];p.sursisCombo=0;});
}
const timeMods={},blind=[];
let maxPos=0;
Object.values(players).forEach(p=>{
p.lastCorrect=false;
const d=fxTimeDelta(p);
timeMods[p.id]=d;
maxPos=Math.max(maxPos,d);
if(fxOn(p,"blind"))blind.push(p.id);
});
questionEndAt=Date.now()+(questionTime+maxPos)*1000+1500;
clearTimeout(window.__fxEnd);
window.__fxEnd=setTimeout(()=>{
if(isHost)finishQuestionIfNeeded();
},(questionTime+maxPos)*1000+1700);
return Object.assign({},q,{timeMods,blind});
}
function myQuestionTime(q){
return Math.max(5,questionTime+((q&&q.timeMods&&q.timeMods[myId])||0));
}
function fxTotalTime(p){
return Math.max(5,questionTime+((currentQuestion&&currentQuestion.timeMods&&currentQuestion.timeMods[p.id])||0));
}
/* ---------- Hooks de score / combo ---------- */
function nextComboValue(p){
const fx=fxOf(p);
const old=p.combo||0;
p.lastCorrect=true;
if(fxOn(p,"fatigue")){
fx.fatigue.stack=Math.min(3,(fx.fatigue.stack||0)+1);
}
if(fxOn(p,"stifle")){
delete fx.stifle;
return old;
}
let c=old+1;
if(fxOn(p,"cap")&&c>2){
c=Math.max(old,2);
}
return c;
}
function applyScoreFx(p,pts,data){
let mult=1;
const elapsed=fxTotalTime(p)-(data.time||0);
if(fxOn(p,"cible")&&elapsed<5)mult+=0.5;
if(fxOn(p,"fusion"))mult+=Math.min(0.5,0.1*(p.combo||0));
if(fxOn(p,"turbo")&&elapsed<8)mult+=0.3;
if(fxOn(p,"chasseur")&&p.score<Math.max(...Object.values(players).map(x=>x.score||0)))mult+=0.25;
let g=Math.round(pts*mult);
if(fxOn(p,"pari")){
g+=fxOf(p).pari.stake*2;
delete fxOf(p).pari;
}
if(fxOn(p,"interets")){
g+=Math.round((p.score+g)*0.05);
}
if(fxOn(p,"taxe")){
const t=fxOf(p).taxe;
const src=players[t.src];
const amt=Math.round(g*t.pct);
if(src&&src.id!==p.id){
src.score+=amt;
src.bonusPoints=(src.bonusPoints||0)+amt;
p.malusPoints=(p.malusPoints||0)+amt;
g-=amt;
}
}
return g;
}
function onWrongFx(p){
const fx=fxOf(p);
if(fxOn(p,"pari")){
p.score=Math.max(0,p.score-fx.pari.stake);
delete fx.pari;
}
if(fxOn(p,"fusion")){
p.score=Math.max(0,p.score-100);
delete fx.fusion;
}
if(fxOn(p,"sursis")){
delete fx.sursis;
p.sursisCombo=p.combo;
return;
}
p.sursisCombo=0;
p.combo=0;
}
function fxEndQuestion(){
Object.values(players).forEach(p=>{
const fx=fxOf(p);
if(fxOn(p,"bombe")){
if(!p.lastCorrect)fx.bombe.failed=true;
if(fx.bombe.left===1&&fx.bombe.failed){
p.combo=0;
p.powerGrantedCombo=0;
}
}
Object.keys(fx).forEach(k=>{
fx[k].left--;
if(fx[k].left<=0)delete fx[k];
});
});
}
/* ---------- Application d'un pouvoir ---------- */
function applyExtPower(player,target,id,level){
const d=EXT_POWERS[id];
const I=fxIntensity();
const label=d.emoji+" "+d.name;
const out={id,label,blocked:false,reflected:false,msgSelf:"",msgTarget:""};
if(d.type==="bonus"){
const fx=fxOf(player);
if(id==="etincelle"){
player.combo=(player.combo||0)+1;
player.bestCombo=Math.max(player.bestCombo||0,player.combo);
player.powerGrantedCombo=0;
}else if(id==="purif"){
let n=0;
NEG_FX.forEach(k=>{if(fx[k]){delete fx[k];n++;}});
if(!n){
player.shield=true;
out.note=" (aucun effet négatif : bouclier à la place)";
}
}else if(id==="de"){
const roll=1+Math.floor(Math.random()*6);
if(roll<=2){
player.combo=(player.combo||0)+1;
player.bestCombo=Math.max(player.bestCombo||0,player.combo);
player.powerGrantedCombo=0;
out.note=" (🎲 "+roll+" : +1 combo)";
}else if(roll<=4){
player.shield=true;
out.note=" (🎲 "+roll+" : bouclier)";
}else{
player.doubleNext=true;
out.note=" (🎲 "+roll+" : prochaine bonne réponse ×2)";
}
}else if(id==="pari"){
fx.pari={left:d.q,stake:Math.min(200,player.score)};
}else{
fx[id]={left:d.q};
}
out.msgSelf=label+" : "+d.desc+" !"+(out.note||"");
return out;
}
/* MALUS */
if(id==="roulette"){
const pick=["blind","reduit","stifle","cap","piege"][Math.floor(Math.random()*5)];
const r=applyExtPower(player,target,pick,level);
r.label="🔫 Roulette → "+r.label;
r.msgSelf="🔫 Roulette ! "+r.msgSelf;
r.msgTarget="🔫 Roulette ! "+r.msgTarget;
return r;
}
if(target.shield){
target.shield=false;
out.blocked=true;
out.msgSelf="🛡️ "+target.name+" a bloqué ton "+label+" !";
out.msgTarget="🛡️ Ton bouclier a bloqué "+label+" de "+player.name+" !";
return out;
}
let victim=target;
const tfx=fxOf(target);
if(fxOn(target,"miroir")){
delete tfx.miroir;
victim=player;
out.reflected=true;
}else if(fxOn(target,"herisson")){
player.combo=Math.max(0,(player.combo||0)-1);
player.powerGrantedCombo=0;
}
const vfx=fxOf(victim);
if(NEG_FX.includes(id)&&!vfx[id]){
const negs=NEG_FX.filter(k=>vfx[k]).length;
if(negs>=2){
out.blocked=true;
out.msgSelf="🧱 "+victim.name+" subit déjà 2 malus : "+label+" est sans effet.";
out.msgTarget="🧱 Trop de malus actifs : "+label+" est sans effet sur toi.";
return out;
}
}
if(id==="tranche"){
victim.combo=Math.floor((victim.combo||0)/2);
victim.powerGrantedCombo=0;
}else if(id==="briseur"){
const had=victim.shield||fxOn(victim,"miroir")||fxOn(victim,"herisson")||fxOn(victim,"sursis");
victim.shield=false;
["miroir","herisson","sursis"].forEach(k=>delete vfx[k]);
if(!had){
victim.combo=Math.max(0,(victim.combo||0)-1);
victim.powerGrantedCombo=0;
}
}else if(id==="coupe"){
let had=!!victim.doubleNext;
victim.doubleNext=false;
POS_FX.forEach(k=>{if(vfx[k]){delete vfx[k];had=true;}});
if(!had)vfx.coupe={left:1};
}else if(id==="pileface"){
const heads=Math.random()<0.5;
victim.combo=Math.max(0,(victim.combo||0)+(heads?-1:1));
victim.powerGrantedCombo=0;
out.note=heads?" Pile : -1 combo !":" Face : +1 combo (chanceux) !";
}else if(id==="reduit"){
vfx.reduit={left:1,pct:0.5*I};
}else if(id==="taxe"){
vfx.taxe={left:d.q,src:player.id,pct:0.2*I};
}else if(id==="fatigue"){
vfx.fatigue={left:d.q,stack:0};
}else if(id==="bombe"){
vfx.bombe={left:d.q,failed:false};
}else{
vfx[id]={left:d.q};
}
victim.malusesReceived=(victim.malusesReceived||0)+1;
if(out.reflected){
out.msgSelf="🪞 "+target.name+" avait un Miroir : "+label+" te revient !";
out.msgTarget="🪞 Ton Miroir a renvoyé "+label+" à "+player.name+" !";
}else{
out.msgSelf=label+" lancé sur "+target.name+" : "+d.desc+"."+(out.note||"");
out.msgTarget="⚠️ "+player.name+" t'a lancé "+label+" : "+d.desc+"."+(out.note||"");
}
return out;
}
/* ---------- Affichage ---------- */
function showExtResult(data){
const e=data.ext;
const me=data.playerId===myId;
const tgt=data.targetId===myId;
if(!isHost){
players=data.players||players;
}
updateMyScore();
setTimeout(()=>{
if(me){
showPowerPanel(e.msgSelf,data.choice==="bonus"?"#86efac":"#facc15");
}else if(tgt){
showPowerPanel(e.msgTarget,e.blocked?"#86efac":"#fca5a5");
}
updateFxBar();
},1200);
}
function drawExtPowers(type,level){
const weights=level>=4?[35,45,20]:[70,30,0];
const pool=EXT_IDS[type].slice();
const picked=[];
while(picked.length<3&&pool.length){
const tiers=[0,1,2].filter(r=>weights[r]>0&&pool.some(id=>EXT_POWERS[id].r===r));
if(!tiers.length)break;
let roll=Math.random()*tiers.reduce((s,r)=>s+weights[r],0);
let tier=tiers[tiers.length-1];
for(const r of tiers){
if(roll<weights[r]){tier=r;break;}
roll-=weights[r];
}
const cands=pool.filter(id=>EXT_POWERS[id].r===tier);
const id=cands[Math.floor(Math.random()*cands.length)];
picked.push(id);
pool.splice(pool.indexOf(id),1);
}
return picked;
}
function fillPowerSelects(level){
fillPowerSelectsBase(level);
const me=players[myId]||{};
["bonus","malus"].forEach(type=>{
const select=document.getElementById(type+"Type");
if(!select)return;
drawExtPowers(type,level).forEach(id=>{
const d=EXT_POWERS[id];
const option=document.createElement("option");
option.value=id;
option.textContent=RARITY_ICON[d.r]+" "+d.emoji+" "+d.name+" — "+d.desc;
option.disabled=powerBlockedFor(me,id);
select.appendChild(option);
});
});
}
function updateFxBar(){
let bar=document.getElementById("fxBar");
if(!bar){
bar=document.createElement("div");
bar.id="fxBar";
bar.style.cssText="position:fixed;left:10px;bottom:10px;z-index:900;max-width:75vw;display:none;gap:6px;flex-wrap:wrap;font-size:12px;font-weight:700;color:#fff;pointer-events:none";
document.body.appendChild(bar);
}
const me=players[myId];
const fx=(me&&me.fx)||{};
const ids=Object.keys(fx).filter(k=>EXT_POWERS[k]&&fx[k].left>0);
bar.style.display=ids.length?"flex":"none";
bar.innerHTML=ids.map(k=>{
const d=EXT_POWERS[k];
const bad=d.type==="malus";
return `<span style="padding:4px 9px;border-radius:99px;background:${bad?"rgba(239,68,68,.85)":"rgba(34,197,94,.85)"}">${d.emoji} ${d.name} ×${fx[k].left}</span>`;
}).join("");
}
function applyBlind(){
const t=document.getElementById("timer");
if(t){
t.style.visibility=
(currentQuestion&&currentQuestion.blind&&currentQuestion.blind.includes(myId))
?"hidden":"visible";
}
}
const __startTimerBase=startTimer;
startTimer=function(){
__startTimerBase();
applyBlind();
updateFxBar();
};
setInterval(updateFxBar,800);
