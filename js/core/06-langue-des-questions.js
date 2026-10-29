/* =========================================================
LANGUE DES QUESTIONS
========================================================= */
const QUESTION_LANGS=[
{code:"fr",label:"🇫🇷 Français"},
{code:"en",label:"🇬🇧 English"}
];
const LANG_PACKS={
en:{
cats:{"Géographie": "Geography", "Animaux": "Animals", "Jeux vidéo": "Video games", "Cinéma": "Movies", "Sciences": "Science", "Culture générale": "General knowledge", "Musique": "Music", "Cuisine": "Food", "Sport": "Sports", "Informatique": "Computing", "Art": "Art", "🏛️ Histoire": "History", "📚 Littérature": "Literature", "💡 Technologie": "Technology", "🌿 Nature": "Nature", "⚡ Mythologie": "Mythology", "🗣️ Langues": "Languages", "Réseaux": "Networks", "Programmation": "Programming", "Cryptographie": "Cryptography", "IA / Machine Learning": "AI / Machine Learning", "Algorithmique": "Algorithms"},
diff:{
facile:"🟢 EASY",
moyen:"🔵 MEDIUM",
difficile:"🟠 HARD",
impossible:"🔴 IMPOSSIBLE"
},
rows:[["What is the capital of France?", [".", ".", ".", "."]], ["What is the capital of Italy?", [".", ".", ".", "Venice"]], ["What is the capital of Japan?", [".", ".", ".", "."]], ["What is the largest ocean?", ["Atlantic", "Indian", "Pacific", "Arctic"]], ["Which animal meows?", ["Dog", "Cat", "Horse", "Cow"]], ["Which animal makes honey?", ["Bee", "Ant", "Butterfly", "Fly"]], ["Which character wears a red cap?", [".", ".", ".", "."]], ["Which character is blue and very fast?", [".", ".", ".", "."]], ["In which movie can Simba be found?", ["The Lion King", ".", ".", "."]], ["Which planet is red?", [".", ".", "Venus", "Mercury"]], ["How many days are in a week?", [".", ".", ".", "."]], ["Which instrument usually has 88 keys?", ["Guitar", "Piano", "Violin", "Flute"]], ["Which country does pizza traditionally come from?", ["France", "Italy", "Spain", "Greece"]], ["How many players make up a football (soccer) team on the pitch?", [".", ".", ".", "."]], ["Which is the largest country in the world by area?", ["Canada", "China", "Russia", "United States"]], ["What is the capital of Australia?", [".", ".", ".", "."]], ["Which animal can change color to camouflage itself?", ["Chameleon", "Tiger", "Elephant", "."]], ["Which mammal can fly?", ["Eagle", "Bat", "Penguin", "Ostrich"]], ["Which character wields a sword in Zelda?", [".", ".", ".", "."]], ["In which game can you find the Nether?", [".", ".", ".", "."]], ["Which character wields the hammer Mjolnir?", [".", ".", ".", "."]], ["Which force keeps us on the ground?", ["Magnetism", "Gravity", "Electricity", "Friction"]], ["Which organ pumps blood?", ["Lung", "Brain", "Heart", "Liver"]], ["What does HTML stand for?", [".", ".", ".", "."]], ["Which language is used to style a web page?", [".", ".", ".", "."]], ["What does URL stand for?", [".", ".", ".", "."]], ["How many players of a basketball team are on the court?", [".", ".", ".", "."]], ["What is the capital of Kazakhstan?", [".", ".", "Bishkek", "Tashkent"]], ["Which strait separates Europe and Africa?", ["Bosphorus", ".", "Bering", "Hormuz"]], ["Which animal has three hearts?", ["Octopus", "Shark", "Dolphin", "Jellyfish"]], ["What is the only mammal capable of true flight?", ["Flying squirrel", "Bat", "Lemur", "."]], ["What is the main kingdom in The Legend of Zelda called?", [".", ".", ".", "."]], ["Which director made Inception?", [".", ".", ".", "."]], ["What is the chemical symbol of tungsten?", [".", ".", ".", "."]], ["Which particle has a negative charge?", ["Proton", "Neutron", "Electron", "Photon"]], ["What does CPU stand for?", [".", ".", ".", "."]], ["How many semitones are in an octave?", [".", ".", ".", "."]], ["Which art movement is associated with Claude Monet?", ["Cubism", "Impressionism", "Surrealism", "Baroque"]], ["What does DNS stand for?", [".", ".", ".", "."]], ["What is the capital of Palau?", [".", ".", ".", "."]], ["Which country holds the enclave of Llívia?", ["France", "Spain", "Andorra", "Portugal"]], ["Which animal has blue blood because of hemocyanin?", ["Octopus", "Frog", "Tiger", "Eagle"]], ["Which constant is approximately 6.626 × 10⁻³⁴ J·s?", ["Planck constant", "Boltzmann constant", "Avogadro's number", "Gravitational constant"]], ["What is Avogadro's number, approximately?", ["6.022 × 10²³", "9.81 × 10²³", "3.14 × 10²³", "."]], ["Which data structure follows the LIFO principle?", ["Queue", "Stack", "Tree", "Graph"]], ["Which data structure follows the FIFO principle?", ["Stack", "Queue", "Heap", "Tree"]], ["Which language was created by Guido van Rossum?", [".", ".", ".", "."]], ["What is the name of the protagonist of Hollow Knight?", [".", ".", ".", "."]], ["Which director made Stalker in 1979?", ["Andrei Tarkovsky", ".", ".", "."]], ["Which composer wrote The Rite of Spring?", [".", ".", ".", "."]], ["What is the only even prime number?", [".", ".", ".", "."]], ["Which artist painted the ceiling of the Sistine Chapel?", ["Raphael", "Michelangelo", ".", "Caravaggio"]], ["Which HTTP code usually indicates a 'Not Found' error?", [".", ".", ".", "."]]]
}
};
let questionLang="fr";
function categoryLabel(category,lang){
const pack=LANG_PACKS[lang];
if(!pack)return category;
const m=String(category).match(/^(\S+)\s+([\s\S]*)$/);
if(!m)return category;
return m[1]+" "+(pack.cats[m[2]]||m[2]);
}
function localizeQuestion(q,lang){
const pack=LANG_PACKS[lang];
const index=QUESTIONS.indexOf(q);
if(!pack||index<0||!pack.rows[index])return q;
const row=pack.rows[index];
return{
...q,
category:categoryLabel(q.category,lang),
question:row[0],
answers:q.answers.map((answer,i)=>
(row[1][i]===undefined||row[1][i]===".")
?answer
:row[1][i]
),
diffLabel:pack.diff[q.difficulty]
};
}
function buildLangSelect(){
const select=document.getElementById("questionLang");
if(!select)return;
const langs=QUESTION_LANGS.length?QUESTION_LANGS:[{code:"fr",label:"🇫🇷 Français"}];
select.innerHTML=langs
.map(l=>`<option value="${l.code}">${l.label}</option>`)
.join("");
/* une langue inconnue ne doit jamais laisser la liste sans sélection (affichage vide) */
if(!langs.some(l=>l.code===questionLang))questionLang=langs[0].code;
select.value=questionLang;
if(select.selectedIndex<0)select.selectedIndex=0;
}
function onQuestionLangChange(){
const select=document.getElementById("questionLang");
questionLang=
QUESTION_LANGS.some(l=>l.code===select.value)
?select.value
:"fr";
document
.querySelectorAll("#themeGrid .theme-option")
.forEach(wrapper=>{
const input=wrapper.querySelector("input");
const label=wrapper.querySelector("label");
if(input&&label){
label.textContent=
categoryLabel(input.value,questionLang);
}
});
}
