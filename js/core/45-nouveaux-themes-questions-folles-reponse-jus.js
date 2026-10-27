/* =========================================================
NOUVEAUX THÈMES + QUESTIONS FOLLES (réponse juste en 1er : mélangée au lancement)
========================================================= */
(function(){
const P=[
["🤯 Incroyable mais vrai","facile","Quel aliment ne se périme pratiquement jamais ?",["Le miel","Le lait","La salade","Le yaourt"],"Which food practically never spoils?",["Honey","Milk","Lettuce","Yogurt"]],
["🤯 Incroyable mais vrai","moyen","Quel animal possède des empreintes digitales très proches de celles des humains ?",["Le koala","Le chat","Le dauphin","Le panda"],"Which animal has fingerprints very similar to humans'?",["The koala","The cat","The dolphin","The panda"]],
["🤯 Incroyable mais vrai","difficile","Botaniquement, la banane est…",["Une baie","Un légume","Une noix","Un tubercule"],"Botanically, a banana is a…",["A berry","A vegetable","A nut","A tuber"]],
["🪐 Espace","facile","Quelle galaxie contient notre Système solaire ?",["La Voie lactée","Andromède","Le Triangle","Sombrero"],"Which galaxy contains our Solar System?",["The Milky Way","Andromeda","Triangulum","Sombrero"]],
["🪐 Espace","moyen","Combien de temps la lumière du Soleil met-elle (environ) pour atteindre la Terre ?",["8 minutes","8 secondes","8 heures","8 jours"],"Roughly how long does sunlight take to reach Earth?",["8 minutes","8 seconds","8 hours","8 days"]],
["🪐 Espace","difficile","Quelle planète tourne sur elle-même « à l'envers » (rotation rétrograde) ?",["Vénus","Mars","Jupiter","Mercure"],"Which planet rotates 'backwards' (retrograde rotation)?",["Venus","Mars","Jupiter","Mercury"]],
["😂 Internet & Mèmes","facile","Quel animal est la mascotte de Linux ?",["Un manchot (Tux)","Un chat","Un lion","Un dauphin"],"Which animal is the Linux mascot?",["A penguin (Tux)","A cat","A lion","A dolphin"]],
["😂 Internet & Mèmes","moyen","Quelle race de chien est la star du mème « Doge » ?",["Shiba Inu","Husky","Corgi","Bulldog"],"Which dog breed stars in the 'Doge' meme?",["Shiba Inu","Husky","Corgi","Bulldog"]],
["😂 Internet & Mèmes","difficile","Comment s'appelle le mème du chat volant à corps de Pop-Tart et traînée arc-en-ciel ?",["Nyan Cat","Grumpy Cat","Keyboard Cat","Longcat"],"What is the meme of the flying Pop-Tart cat with a rainbow trail called?",["Nyan Cat","Grumpy Cat","Keyboard Cat","Longcat"]],
["🧬 Corps humain","facile","Quel est le plus grand organe du corps humain ?",["La peau","Le foie","Le cerveau","L'intestin"],"What is the largest organ of the human body?",["The skin","The liver","The brain","The intestine"]],
["🧬 Corps humain","moyen","Combien d'os compte un adulte (environ) ?",["206","106","306","412"],"Roughly how many bones does an adult have?",[".",".",".","."]],
["🧬 Corps humain","difficile","Quel est l'os le plus long du corps humain ?",["Le fémur","Le tibia","L'humérus","Le radius"],"What is the longest bone in the human body?",["The femur","The tibia","The humerus","The radius"]],
["🏆 Records","facile","Quel est le plus haut sommet du monde (au-dessus du niveau de la mer) ?",["L'Everest","Le K2","Le Mont Blanc","Le Kilimandjaro"],"What is the highest mountain above sea level?",["Everest","K2","Mont Blanc","Kilimanjaro"]],
["🏆 Records","moyen","Quel est l'animal terrestre le plus rapide ?",["Le guépard","Le lion","L'autruche","Le cheval"],"What is the fastest land animal?",["The cheetah","The lion","The ostrich","The horse"]],
["🏆 Records","difficile","Quel est le plus long fleuve de France ?",["La Loire","La Seine","Le Rhône","La Garonne"],"What is the longest river in France?",["The Loire","The Seine","The Rhône","The Garonne"]],
["🧳 Voyages","facile","Dans quel pays se trouve le Taj Mahal ?",["L'Inde","Le Pakistan","Le Népal","L'Iran"],"In which country is the Taj Mahal?",["India","Pakistan","Nepal","Iran"]],
["🧳 Voyages","moyen","Dans quelle ville se trouve la Sagrada Família ?",["Barcelone","Madrid","Séville","Valence"],"In which city is the Sagrada Família?",["Barcelona","Madrid","Seville","Valencia"]],
["🧳 Voyages","difficile","Quel pays compte le plus de fuseaux horaires (outre-mer inclus) ?",["La France","La Russie","Les États-Unis","Le Royaume-Uni"],"Which country has the most time zones (overseas territories included)?",["France","Russia","The United States","The United Kingdom"]],
["🎌 Manga & Animation","facile","Quel Pokémon porte le numéro 25 du Pokédex ?",["Pikachu","Salamèche","Roucool","Rondoudou"],"Which Pokémon is number 25 in the Pokédex?",["Pikachu","Charmander","Pidgey","Jigglypuff"]],
["🎌 Manga & Animation","moyen","Quel studio a produit « Le Voyage de Chihiro » ?",["Ghibli","Pixar","Toei","Disney"],"Which studio made 'Spirited Away'?",["Ghibli","Pixar","Toei","Disney"]],
["🎌 Manga & Animation","difficile","Dans One Piece, quel est le fruit du démon de Luffy ?",["Gomu Gomu","Mera Mera","Hie Hie","Yami Yami"],"In One Piece, what is Luffy's Devil Fruit?",["Gomu Gomu","Mera Mera","Hie Hie","Yami Yami"]],
["🧪 Inventions","facile","Qui a déposé le brevet du téléphone en 1876 ?",["Graham Bell","Thomas Edison","Nikola Tesla","Marconi"],"Who patented the telephone in 1876?",["Graham Bell","Thomas Edison","Nikola Tesla","Marconi"]],
["🧪 Inventions","moyen","En quelle année le premier iPhone est-il sorti ?",["2007","2003","2010","2012"],"In what year was the first iPhone released?",[".",".",".","."]],
["🧪 Inventions","difficile","Quelle invention de Gutenberg a révolutionné la diffusion des livres ?",["L'imprimerie à caractères mobiles","La boussole","La poudre à canon","Le microscope"],"Which Gutenberg invention revolutionised the spread of books?",["The movable-type printing press","The compass","Gunpowder","The microscope"]],
["🦄 Fantasy","facile","Comment s'appelle l'école de sorcellerie d'Harry Potter ?",["Poudlard","Beauxbâtons","Durmstrang","Ilvermorny"],"What is Harry Potter's school of witchcraft called?",["Hogwarts","Beauxbatons","Durmstrang","Ilvermorny"]],
["🦄 Fantasy","moyen","Dans « Le Seigneur des anneaux », où l'Anneau unique est-il détruit ?",["La Montagne du Destin","Minas Tirith","Fondcombe","Isengard"],"In 'The Lord of the Rings', where is the One Ring destroyed?",["Mount Doom","Minas Tirith","Rivendell","Isengard"]],
["🦄 Fantasy","difficile","Comment s'appelle la planète désertique de « Dune » ?",["Arrakis","Tatooine","Caladan","Mustafar"],"What is the desert planet in 'Dune' called?",["Arrakis","Tatooine","Caladan","Mustafar"]],
["🎲 Jeux de société","facile","Combien de cases compte un échiquier ?",["64","32","81","100"],"How many squares does a chessboard have?",[".",".",".","."]],
["🎲 Jeux de société","moyen","Quelle pièce d'échecs se déplace en « L » ?",["Le cavalier","Le fou","La tour","La reine"],"Which chess piece moves in an 'L' shape?",["The knight","The bishop","The rook","The queen"]],
["🎲 Jeux de société","difficile","Combien d'armes compte le jeu de base du Cluedo ?",["6","4","8","10"],"How many weapons are in the base game of Cluedo?",[".",".",".","."]],
["🕺 Pop culture","facile","Quelle chanteuse est surnommée « Queen B » ?",["Beyoncé","Rihanna","Adele","Shakira"],"Which singer is nicknamed 'Queen B'?",[".",".",".","."]],
["🕺 Pop culture","moyen","Quel jeu mobile consistait à lancer des oiseaux sur des cochons ?",["Angry Birds","Flappy Bird","Fruit Ninja","Candy Crush"],"Which mobile game had you launching birds at pigs?",[".",".",".","."]],
["🕺 Pop culture","difficile","Quelle danse a été popularisée par le « Gangnam Style » ?",["La danse du cheval","Le moonwalk","La macarena","Le twist"],"Which dance was popularised by 'Gangnam Style'?",["The horse dance","The moonwalk","The Macarena","The twist"]],
["🧛 Légendes & Monstres","facile","Quelle créature légendaire boit du sang selon le folklore ?",["Le vampire","Le yéti","La sirène","Le centaure"],"Which legendary creature drinks blood in folklore?",["The vampire","The yeti","The mermaid","The centaur"]],
["🧛 Légendes & Monstres","moyen","Quel monstre est censé vivre dans un loch écossais ?",["Nessie","Bigfoot","Le Kraken","Chupacabra"],"Which monster is said to live in a Scottish loch?",["Nessie","Bigfoot","The Kraken","Chupacabra"]],
["🧛 Légendes & Monstres","difficile","Quel animal mythique renaît de ses cendres ?",["Le phénix","Le griffon","La chimère","L'hydre"],"Which mythical creature is reborn from its ashes?",["The phoenix","The griffin","The chimera","The hydra"]]
];
const rows=LANG_PACKS.en.rows;
while(rows.length<QUESTIONS.length)rows.push(null);
P.forEach(r=>{
QUESTIONS.push({difficulty:r[1],category:r[0],question:r[2],answers:r[3],correct:0});
rows.push([r[4],r[5]]);
});
Object.assign(LANG_PACKS.en.cats,{
"Histoire":"History","Littérature":"Literature","Technologie":"Technology","Nature":"Nature",
"Mythologie":"Mythology","Langues":"Languages",
"Incroyable mais vrai":"Unbelievable but true","Espace":"Space","Internet & Mèmes":"Internet & Memes",
"Corps humain":"Human body","Records":"Records","Voyages":"Travel","Manga & Animation":"Manga & Anime",
"Inventions":"Inventions","Fantasy":"Fantasy","Jeux de société":"Board games","Pop culture":"Pop culture",
"Légendes & Monstres":"Legends & Monsters",
"Mobilité & Smartphones":"Mobile & Smartphones","IoT & Objets connectés":"IoT & Connected Devices",
"Data & Big Data":"Data & Big Data","OSINT & Investigation numérique":"OSINT & Digital Investigation",
"Support & Dépannage":"Support & Troubleshooting"
});
})();
/* Mélange des réponses (la bonne réponse n'est plus toujours en 1re position) */
function shuffleQuestionAnswers(q){
const pairs=q.answers.map((answer,i)=>({answer,ok:i===q.correct}));
const mixed=shuffle(pairs);
return{
...q,
answers:mixed.map(p=>p.answer),
correct:mixed.findIndex(p=>p.ok)
};
}
/* Bouton "Thèmes au hasard" */
function randomThemes(count=6){
const boxes=[...document.querySelectorAll("#themeGrid input")];
if(!boxes.length)return;
boxes.forEach(box=>{
if(box.checked){
box.checked=false;
box.dispatchEvent(new Event("change",{bubbles:true}));
}
});
shuffle(boxes).slice(0,Math.min(count,boxes.length)).forEach(box=>{
box.checked=true;
box.dispatchEvent(new Event("change",{bubbles:true}));
});
}
/* Écran d'attente pour les joueurs invités */
function showWaitingScreen(){
const active=document.querySelector(".screen.active");
if(!active||active.id==="homeScreen"||active.id==="lobbyScreen"){
showScreen("waitingScreen");
}
const chips=document.getElementById("waitingPlayers");
if(chips){
chips.innerHTML=Object.values(players)
.map(p=>`<span>${escapeHTML(p.avatar||"🙂")} ${escapeHTML(p.name)}</span>`)
.join("");
}
const code=document.getElementById("waitingCode");
const input=document.getElementById("roomInput");
if(code&&input&&input.value){
code.textContent=input.value.toUpperCase();
}
}
