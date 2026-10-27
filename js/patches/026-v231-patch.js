/* Extrait de l'ancien index.html : <script id="v231-patch"> */
(function V231(){
"use strict";
const BANK=[
["🚦 Code de la route","facile","Que faut-il faire avant de tourner ?",["Mettre le clignotant et vérifier l'environnement","Freiner sans prévenir","Changer de voie brusquement","Klaxonner systématiquement"]],
["🚦 Code de la route","moyen","À quoi sert une ligne continue ?",["À interdire généralement son franchissement","À autoriser tous les dépassements","À indiquer une place de parking","À signaler une station-service"]],
["🚦 Code de la route","difficile","Que signifie un feu orange fixe ?",["S'arrêter sauf si cela crée un danger immédiat","Accélérer pour passer","Continuer sans ralentir","Faire demi-tour"]],
["✍️ Grammaire","facile","Dans « Le chat dort », quel mot est le verbe ?",["dort","chat","le","le chat"]],
["✍️ Grammaire","moyen","Quel est le pluriel de « cheval » ?",["chevaux","chevals","chevaus","chevalx"]],
["✍️ Grammaire","difficile","Dans « Bien qu'il pleuve », quel est le mode de « pleuve » ?",["Le subjonctif","L'indicatif","L'impératif","Le conditionnel passé"]],
["🤾 Handball","facile","Quel joueur peut utiliser ses pieds dans sa zone ?",["Le gardien","Tous les joueurs","Le capitaine uniquement","Aucun joueur"]],
["🤾 Handball","moyen","Quelle sanction suit généralement une faute empêchant une occasion nette dans la zone ?",["Un jet de 7 mètres","Une touche","Un corner","Un entre-deux"]],
["🤾 Handball","difficile","À quelle distance se trouve la ligne de jet franc discontinue ?",["9 mètres","6 mètres","7 mètres","10 mètres"]],
["🏛️ Capitales","facile","Quelle est la capitale du Portugal ?",["Lisbonne","Porto","Faro","Braga"]],
["🏛️ Capitales","moyen","Quelle est la capitale de la Suisse ?",["Berne","Genève","Zurich","Lausanne"]],
["🏛️ Capitales","difficile","Quelle est la capitale du Kirghizistan ?",["Bichkek","Tachkent","Douchanbé","Achgabat"]],
["🌍 Géographie","facile","Sur quel continent se trouve le Kenya ?",["L'Afrique","L'Asie","L'Europe","L'Amérique du Sud"]],
["🌍 Géographie","moyen","Quel fleuve traverse Paris ?",["La Seine","La Loire","Le Rhône","Le Rhin"]],
["🌍 Géographie","difficile","Quelle chaîne de montagnes sépare en partie la France et l'Espagne ?",["Les Pyrénées","Les Alpes","Les Carpates","Les Apennins"]],
["🚀 Sciences","facile","Quel gaz est indispensable à la respiration humaine ?",["L'oxygène","L'hélium","Le néon","L'argon"]],
["🚀 Sciences","moyen","Quel organe contrôle principalement le système nerveux ?",["Le cerveau","Le foie","Le rein","L'estomac"]],
["🚀 Sciences","difficile","Quelle unité mesure une force ?",["Le newton","Le joule","Le watt","Le pascal-seconde"]],
["💻 Informatique","facile","Quel périphérique sert principalement à saisir du texte ?",["Le clavier","L'écran","Le haut-parleur","L'imprimante"]],
["💻 Informatique","moyen","Que signifie RAM ?",["Random Access Memory","Rapid Access Machine","Read All Memory","Remote Application Module"]],
["💻 Informatique","difficile","Quel protocole est principalement utilisé pour transférer des pages web sécurisées ?",["HTTPS","FTP","SMTP","Bluetooth"]],
["🛡️ Cybersécurité","facile","Quel mot de passe est le plus sûr ?",["Une phrase longue et unique","123456","motdepasse","Le prénom seul"]],
["🛡️ Cybersécurité","moyen","Qu'est-ce qu'un hameçonnage ?",["Une tentative de voler des informations par tromperie","Une sauvegarde automatique","Une mise à jour système","Un pare-feu physique"]],
["🛡️ Cybersécurité","difficile","À quoi sert un gestionnaire de mots de passe ?",["À créer et stocker des mots de passe uniques","À partager tous les mots de passe","À désactiver le chiffrement","À supprimer les sauvegardes"]],
["⚽ Sport","facile","Combien de mi-temps compte un match de football ?",["2","3","4","5"]],
["⚽ Sport","moyen","Dans quel sport marque-t-on un essai ?",["Le rugby","Le tennis","Le basket","Le volley"]],
["⚽ Sport","difficile","Quelle distance mesure un marathon officiel environ ?",["42,195 km","40 km","50 km","21,097 km"]],
["🎵 Musique","facile","Quel instrument se joue avec des baguettes ?",["La batterie","La flûte","La trompette","Le violon"]],
["🎵 Musique","moyen","Combien de lignes possède une portée musicale standard ?",["5","4","6","7"]],
["🎵 Musique","difficile","Quel terme indique une augmentation progressive du volume ?",["Crescendo","Staccato","Legato","Adagio"]],
["🎬 Cinéma","facile","Comment appelle-t-on la personne qui dirige le tournage d'un film ?",["Le réalisateur","Le décorateur","Le projectionniste","Le critique"]],
["🎬 Cinéma","moyen","Quel genre met principalement en scène des phénomènes futurs ou extraterrestres ?",["La science-fiction","Le western","Le documentaire animalier","La comédie musicale"]],
["🎬 Cinéma","difficile","Quel prix récompense le cinéma français ?",["Le César","Le Grammy","Le Goncourt","Le Molière uniquement théâtral"]],
["🦁 Animaux","facile","Quel animal est le plus grand mammifère marin ?",["La baleine bleue","Le dauphin","L'orque","Le phoque"]],
["🦁 Animaux","moyen","Comment appelle-t-on un animal qui mange surtout des plantes ?",["Un herbivore","Un carnivore","Un omnivore strict","Un insectivore"]],
["🦁 Animaux","difficile","Quel oiseau est incapable de voler mais excellent nageur ?",["Le manchot","L'aigle","Le faucon","L'hirondelle"]],
["➗ Mathématiques","facile","Combien font 9 × 7 ?",["63","56","72","67"]],
["➗ Mathématiques","moyen","Quel est le résultat de 15 % de 200 ?",["30","15","20","45"]],
["➗ Mathématiques","difficile","Quelle est la racine carrée de 225 ?",["15","12","25","17"]],
["📝 Orthographe","facile","Quelle écriture est correcte ?",["Aujourd'hui","Aujourdhui","Aujourd hui","Au jourd'hui"]],
["📝 Orthographe","moyen","Quel mot est correctement écrit ?",["Nécessaire","Néssécaire","Nécesssaire","Nécéssaire"]],
["📝 Orthographe","difficile","Quelle forme est correcte ?",["Ils se sont aperçus","Ils se sont apperçus","Ils se sont aperçu","Ils se sont apperçu"]],
["🚑 Premiers secours","facile","Quel numéro appelle les pompiers en France ?",["18","15","17","114 uniquement"]],
["🚑 Premiers secours","moyen","Que faut-il faire devant un saignement abondant externe ?",["Comprimer directement la plaie si possible","Faire marcher la personne","Donner à boire","Attendre sans agir"]],
["🚑 Premiers secours","difficile","Quelle information est essentielle lors d'un appel aux secours ?",["Le lieu précis et l'état de la victime","La marque du téléphone","La météo de la veille","Le nom de tous les témoins"]],
["🚩 Drapeaux","facile","Quel pays possède un drapeau rouge avec une croix blanche ?",["La Suisse","La Suède","La Finlande","La Grèce"]],
["🚩 Drapeaux","moyen","Quelles couleurs composent le drapeau allemand ?",["Noir, rouge et or","Bleu, blanc et rouge","Vert, blanc et rouge","Rouge et blanc seulement"]],
["🚩 Drapeaux","difficile","Quel pays possède un drapeau non rectangulaire ?",["Le Népal","Le Japon","Le Canada","Le Brésil"]],
["🇪🇺 Europe","facile","Combien d'étoiles figurent sur le drapeau européen ?",["12","27","15","10"]],
["🇪🇺 Europe","moyen","Quelle ville accueille le Parlement européen pour ses sessions plénières ?",["Strasbourg","Paris","Berlin","Rome"]],
["🇪🇺 Europe","difficile","Quel traité a créé l'Union européenne sous ce nom ?",["Le traité de Maastricht","Le traité de Versailles","Le traité de Tordesillas","Le traité de Lisbonne uniquement"]],
["🌱 Environnement & Écologie","facile","Quel geste économise le plus d'eau au quotidien ?",["Prendre une douche courte","Laisser couler le robinet","Arroser en plein midi","Laver une voiture chaque jour"]],
["🌱 Environnement & Écologie","moyen","Qu'est-ce qu'une énergie renouvelable ?",["Une source qui se reconstitue naturellement","Une énergie toujours gratuite","Une énergie sans installation","Une énergie uniquement nucléaire"]],
["🌱 Environnement & Écologie","difficile","Quel gaz contribue fortement à l'effet de serre d'origine humaine ?",["Le dioxyde de carbone","L'oxygène","L'azote","L'hélium"]],
["📚 Littérature","facile","Qui a écrit Le Petit Prince ?",["Antoine de Saint-Exupéry","Victor Hugo","Jules Verne","Molière"]],
["📚 Littérature","moyen","Quel personnage combat des moulins à vent ?",["Don Quichotte","Gavroche","Cyrano","Arsène Lupin"]],
["📚 Littérature","difficile","Qui a écrit Madame Bovary ?",["Gustave Flaubert","Émile Zola","Guy de Maupassant","Honoré de Balzac"]],
["🏛️ Histoire","facile","Qui fut le premier empereur des Français ?",["Napoléon Ier","Louis XIV","Charlemagne","Napoléon III"]],
["🏛️ Histoire","moyen","En quelle année la Seconde Guerre mondiale se termine-t-elle en Europe ?",["1945","1944","1939","1918"]],
["🏛️ Histoire","difficile","Quelle cité antique fut ensevelie par le Vésuve en 79 ?",["Pompéi","Athènes","Sparte","Troie"]]
];
let added=0;
BANK.forEach(r=>{if(QUESTIONS.some(q=>q.category===r[0]&&q.question===r[2]))return;QUESTIONS.push({category:r[0],difficulty:r[1],question:r[2],answers:r[3],correct:0,v231:true});added++;});
const oldHas=hasTranslation;hasTranslation=function(q,lang){return q?.v231?true:oldHas(q,lang);};
const oldLoc=localizeQuestion;localizeQuestion=function(q,lang){return q?.v231?q:oldLoc(q,lang);};
const oldCats=getCategories;getCategories=function(){return [...new Set([...oldCats(),...QUESTIONS.map(q=>q.category)])];};
function addNote(){const host=document.getElementById("hostSettings");if(!host||document.getElementById("v231BankNote"))return;const note=document.createElement("div");note.id="v231BankNote";note.className="v231-bank-note";note.innerHTML="<strong>V23.1 : banque enrichie</strong><br>"+added+" nouvelles questions uniques ajoutées, avec trois niveaux de difficulté dans les thèmes principaux.";host.appendChild(note);}
function addCounts(){document.querySelectorAll("#themeGrid input").forEach(input=>{const label=document.querySelector('label[for="'+CSS.escape(input.id)+'"]');if(!label||label.querySelector?.(".v231-theme-count"))return;const n=QUESTIONS.filter(q=>q.category===input.value).length;const c=document.createElement("span");c.className="v231-theme-count";c.textContent=n+" q.";label.appendChild(c);});}
function quickNav(){if(document.getElementById("v231QuickNav"))return;const n=document.createElement("div");n.id="v231QuickNav";n.innerHTML='<button type="button" title="Monter" aria-label="Monter">↑</button><button type="button" title="Descendre" aria-label="Descendre">↓</button>';n.children[0].onclick=()=>window.scrollTo({top:0,behavior:"smooth"});n.children[1].onclick=()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"});document.body.appendChild(n);}
const oldBuild=buildThemeSelector;buildThemeSelector=function(){const r=oldBuild();requestAnimationFrame(addCounts);return r;};
function boot(){addNote();addCounts();quickNav();document.title="Qui suis-je ? 🎮 — V23.1 plus de questions";}
const oldScreen=showScreen;showScreen=function(id){const r=oldScreen(id);setTimeout(boot,0);return r;};
setTimeout(()=>{try{buildThemeSelector();}catch(e){}boot();},80);
console.log("V23.1 : "+added+" questions uniques ajoutées et navigation améliorée.");
})();
