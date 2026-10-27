/* =========================================================
V7 — FILTRE D'INSULTES (toutes langues) + MOTS FAMILIERS
========================================================= */
const BAD_EXACT=("conne connard connards connasse connasses salaud salauds salope salopes pute putes putain putains merde merdes merdique "+
"bordel enculer encule enculee enculer niquer nique ntm fdp tg batard batards connerie couille couilles couillon chier chiant chiante chiants foutre "+
"branleur branler tarlouze negro negre bougnoule youpin ordure abruti abrutis debile debiles cretin cretine imbecile idiot idiote gogol clochard "+
"fuck fucker fucking fucked motherfucker shit shitty bullshit bitch bitches asshole arsehole dick dickhead cock pussy cunt whore slut bastard damn crap piss prick "+
"wanker twat douche douchebag retard retarded faggot fag nigger nigga nazi kys jerk moron "+
"puta putas puto putos mierda joder jodete cabron cabrona gilipollas pendejo pendeja hijoeputa marica maricon culero verga chingar chingada zorra zorras mamon estupido idiota "+
"scheisse arschloch fotze hurensohn wichser schlampe ficken fick verdammt missgeburt vollidiot spast spasti "+
"cazzo cazzi merda stronzo stronza vaffanculo figa puttana troia coglione minchia bastardo "+
"caralho porra foda foder filhadaputa cuzao viado buceta babaca "+
"kut kanker kankerlijer klootzak hoer lul tering "+
"sharmouta sharmuta zebi zebbi kahba ibnsharmouta "+
"orospu amk sikerim yarrak aminakoyim "+
"blyat blyad suka pidor pidar huy nahui mudak").split(" ");
/* "salope" retiré des racines : il masquait « salopette » (le mot exact reste interdit via BAD_EXACT) */
const BAD_ROOTS=["fuck","shit","connard","connasse","putain","merde","enculer","encule","niquer","bitch","asshole","bastard","puta","mierda","cabron","gilipollas","pendejo","scheisse","arschloch","hurensohn","stronzo","vaffanculo","caralho","klootzak","sharmouta","orospu","pidor","blyat","cunt","wanker","nigger","pedophil"].filter(x=>x.length>=4);
const BAD_PHRASES=["ta gueule","ferme ta gueule","ferme la","nique ta mere","ta mere la","va te faire foutre","fils de pute","kill yourself","go to hell","hijo de puta","hija de puta","tu madre","che palle","heil hitler","sieg heil","tais toi","ta race"];
function collapseRuns(t){
return t.replace(/(.)\1+/g,"$1");
}
function normalizeText(text){
return String(text)
.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
.toLowerCase()
.replace(/[\u200b-\u200f]/g,"")
.replace(/@/g,"a").replace(/\$/g,"s")
.replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e").replace(/4/g,"a").replace(/5/g,"s").replace(/7/g,"t");
}
const BAD_SET=new Set(BAD_EXACT.map(w=>collapseRuns(w)));
const BAD_ROOT_LIST=BAD_ROOTS.map(w=>collapseRuns(w));
function isBadToken(token){
const t=collapseRuns(token.replace(/[^a-z]/g,""));
if(t.length<2)return false;
if(BAD_SET.has(t))return true;
const singular=t.replace(/(es|s)$/,"");
if(singular.length>=3&&BAD_SET.has(singular))return true;
return t.length>=5&&BAD_ROOT_LIST.some(root=>root.length>=5&&t.includes(root));
}
/* Renvoie {bad, blocked, clean} */
function profanityCheck(text){
const original=String(text||"");
const flat=normalizeText(original).replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim();
let bad=false;
let blocked=false;
if(BAD_PHRASES.some(p=>(" "+flat+" ").includes(" "+p+" "))){
bad=true;
blocked=true;
}
let clean=original.replace(/[\p{L}\p{N}@$][\p{L}\p{N}@$'’]*/gu,word=>{
if(isBadToken(normalizeText(word))){
bad=true;
return "*".repeat(word.length);
}
return word;
});
/* lettres espacées : "f u c k" / "f.u.c.k" */
const parts=normalizeText(original).split(/[ .\-_*,]+/).filter(Boolean);
let run=[];
const flush=()=>{
if(run.length>=3){
for(let a=0;a<run.length;a++){
for(let z=a+3;z<=Math.min(run.length,a+9);z++){
if(isBadToken(run.slice(a,z).join(""))){
bad=true;
blocked=true;
}
}
}
}
run=[];
};
parts.forEach(t=>{
if(t.length===1&&/[a-z]/.test(t))run.push(t);
else flush();
});
flush();
return{bad,blocked,clean};
}
/* Prénoms : refuse les mots interdits */
const __validateNameBase=validatePlayerName;
validatePlayerName=function(raw){
const r=__validateNameBase(raw);
if(r.ok&&profanityCheck(r.name).bad){
return{ok:false,error:"Ce prénom n'est pas autorisé. Choisis un prénom correct."};
}
return r;
};
