/* =========================================================
PRÉNOMS : VALIDATION + NUMÉROTATION DES DOUBLONS
========================================================= */
const NAME_BAD_CONTAINS=[
"merde","connard","connasse","salope","putain","encule",
"bitch","fuck","shit","asshole","nigger","nazi","hitler","cunt"
];
const NAME_BAD_EXACT=[
"con","pute","pd","fdp","ntm","nique","tg","cock"
];
function plainLetters(text){
return String(text)
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"")
.toLowerCase()
.replace(/[^a-z]/g,"");
}
function validatePlayerName(raw){
let name=
String(raw||"")
.normalize("NFC")
.replace(/\s+/g," ")
.trim();
if(name.length<2){
return{ok:false,error:"Ton prénom doit contenir au moins 2 lettres."};
}
if(name.length>12){
return{ok:false,error:"Ton prénom ne peut pas dépasser 12 caractères."};
}
if(!/^\p{L}+(?:[ '’-]\p{L}+)*$/u.test(name)){
return{ok:false,error:"Entre un vrai prénom : uniquement des lettres (pas de chiffres, d'émojis ni de symboles)."};
}
const plain=plainLetters(name);
if(
/(.)\1\1/.test(plain)||
(plain.length>=3&&!/[aeiouy]/.test(plain))
){
return{ok:false,error:"Ce prénom ne semble pas valide. Essaie avec ton vrai prénom."};
}
if(
NAME_BAD_EXACT.includes(plain)||
NAME_BAD_CONTAINS.some(word=>plain.includes(word))
){
return{ok:false,error:"Ce prénom n'est pas autorisé. Choisis un prénom correct."};
}
name=
name
.toLocaleLowerCase()
.replace(
/(^|[ '’-])(\p{L})/gu,
(m,sep,letter)=>sep+letter.toLocaleUpperCase()
);
return{ok:true,name:name};
}
function nameBase(name){
return String(name).replace(/\d+$/,"");
}
function nameKey(name){
return plainLetters(nameBase(name));
}
/*
Si "Bob" existe déjà : l'ancien devient "Bob1"
et le nouveau devient "Bob2", puis "Bob3"...
*/
function assignUniqueName(base,newId){
const key=nameKey(base);
const group=
Object.values(players)
.filter(p=>
p.id!==newId&&
nameKey(p.name)===key
);
if(!group.length){
return{name:base};
}
let max=0;
group.forEach(p=>{
const m=String(p.name).match(/(\d+)$/);
if(m){
max=Math.max(max,Number(m[1]));
}
});
group.forEach(p=>{
if(!/\d+$/.test(p.name)){
p.name=p.name+"1";
max=Math.max(max,1);
if(p.id===myId){
myName=p.name;
}
}
});
return{name:base+(max+1)};
}
function getCategories(){
return[
...new Set(
QUESTIONS.map(q=>q.category)
)
];
}
function getQuestionPool(){
if(!selectedThemes.length){
return [...QUESTIONS];
}
return QUESTIONS.filter(q=>
selectedThemes.includes(q.category)
);
}
