/* Extrait de l'ancien index.html : <script id="v34-bank-and-ios-patch"> */
(function V34(){
"use strict";
/* ---------- Banque supplémentaire : 120 questions ---------- */
const EXTRA=[
["🏛️ Histoire","facile","Quel événement a eu lieu en 1789 en France ?",["La Révolution française","La Renaissance","La Révolution industrielle","La guerre de Cent Ans"],0],
["🏛️ Histoire","facile","Qui était le premier empereur des Français ?",["Napoléon Ier","Louis XIV","Charlemagne","Clovis"],0],
["🏛️ Histoire","facile","Quel monument romain est célèbre à Rome ?",["Le Colisée","La Tour Eiffel","Big Ben","Le Parthénon"],0],
["🏛️ Histoire","facile","En quelle année le mur de Berlin est-il tombé ?",["1989","1975","1999","1961"],0],
["🏛️ Histoire","moyen","Quelle civilisation utilisait les hiéroglyphes ?",["Les anciens Égyptiens","Les Vikings","Les Incas","Les Romains"],0],
["🏛️ Histoire","moyen","Qui a été couronné empereur en 800 ?",["Charlemagne","Jules César","Louis IX","Hugues Capet"],0],
["🏛️ Histoire","moyen","Quel conflit a opposé principalement les Alliés et les puissances de l'Axe ?",["La Seconde Guerre mondiale","La guerre de Sept Ans","La guerre de Crimée","La guerre froide"],0],
["🏛️ Histoire","difficile","Quel traité partageait certaines zones d'influence entre Espagne et Portugal à la fin du XVe siècle ?",["Traité de Tordesillas","Traité de Versailles","Traité de Rome","Traité de Paris"],0],
["🏛️ Histoire","difficile","Quelle cité antique fut ensevelie par l'éruption du Vésuve en 79 ?",["Pompéi","Athènes","Carthage","Sparte"],0],
["🏛️ Histoire","difficile","Quel roi français est surnommé le Roi-Soleil ?",["Louis XIV","Louis XVI","François Ier","Henri IV"],0],
["🌍 Géographie","facile","Quel continent est le plus vaste ?",["Asie","Afrique","Europe","Océanie"],0],
["🌍 Géographie","facile","Quelle mer borde le sud de la France ?",["Méditerranée","Baltique","Mer du Nord","Mer Noire"],0],
["🌍 Géographie","facile","Quel pays a pour capitale Madrid ?",["Espagne","Portugal","Italie","Grèce"],0],
["🌍 Géographie","facile","Quel fleuve traverse Paris ?",["La Seine","La Loire","Le Rhône","La Garonne"],0],
["🌍 Géographie","moyen","Quel est le plus grand désert chaud du monde ?",["Sahara","Gobi","Kalahari","Atacama"],0],
["🌍 Géographie","moyen","Quelle est la capitale du Canada ?",["Ottawa","Toronto","Vancouver","Montréal"],0],
["🌍 Géographie","moyen","Quel fleuve traverse l'Égypte ?",["Le Nil","Le Danube","Le Tigre","L'Indus"],0],
["🌍 Géographie","difficile","Quel pays possède le plus grand nombre d'îles selon les décomptes géographiques courants ?",["Suède","Indonésie","Japon","Philippines"],0],
["🌍 Géographie","difficile","Quel sommet est le plus haut du monde au-dessus du niveau de la mer ?",["Everest","K2","Kangchenjunga","Mont Blanc"],0],
["🌍 Géographie","difficile","Quelle est la capitale de la Mongolie ?",["Oulan-Bator","Astana","Tachkent","Bichkek"],0],
["💻 Informatique","facile","Que signifie CPU ?",["Central Processing Unit","Computer Personal User","Central Program Utility","Control Power Unit"],0],
["💻 Informatique","facile","Quel composant conserve les données même quand l'ordinateur est éteint ?",["Le SSD","La RAM","Le processeur","Le ventilateur"],0],
["💻 Informatique","facile","Quel système est développé par Microsoft ?",["Windows","Android","Linux","iOS"],0],
["💻 Informatique","facile","Quel symbole est utilisé pour commencer une adresse e-mail ?",["@","#","&","%"],0],
["💻 Informatique","moyen","Que signifie RAM ?",["Random Access Memory","Read Access Module","Rapid Application Machine","Remote Access Monitor"],0],
["💻 Informatique","moyen","Quel protocole sécurise généralement la navigation web avec HTTPS ?",["TLS","FTP","SMTP","DHCP"],0],
["💻 Informatique","moyen","Quel système d'exploitation mobile équipe les iPhone ?",["iOS","Windows Phone","HarmonyOS","ChromeOS"],0],
["💻 Informatique","difficile","Quelle structure de données suit le principe LIFO ?",["Une pile","Une file","Une table","Un graphe"],0],
["💻 Informatique","difficile","Quel algorithme de chiffrement asymétrique utilise couramment une paire de clés ?",["RSA","AES","SHA-256","CRC32"],0],
["💻 Informatique","difficile","Quel protocole attribue automatiquement une adresse IP à un appareil sur un réseau ?",["DHCP","DNS","HTTP","SSH"],0],
["🌐 Web","facile","Que signifie HTTP ?",["HyperText Transfer Protocol","High Transfer Text Program","Hyperlink Transmission Tool Protocol","Host Text Transfer Process"],0],
["🌐 Web","facile","Quel langage structure principalement le contenu d'une page web ?",["HTML","CSS","SQL","Bash"],0],
["🌐 Web","facile","Quel langage est principalement utilisé pour styliser une page web ?",["CSS","HTML","JSON","Python"],0],
["🌐 Web","moyen","Quel code HTTP signifie généralement « OK » ?",["200","301","404","500"],0],
["🌐 Web","moyen","Quel code HTTP indique généralement une page introuvable ?",["404","200","201","302"],0],
["🌐 Web","moyen","À quoi sert principalement JavaScript dans une page web ?",["Ajouter de l'interactivité et de la logique","Remplacer le serveur DNS","Alimenter l'écran","Compresser les images uniquement"],0],
["🌐 Web","difficile","Quel format de données est particulièrement courant pour échanger des objets structurés sur le web ?",["JSON","MP3","PNG","EXE"],0],
["🌐 Web","difficile","Quel en-tête HTTP aide à indiquer le type de contenu retourné ?",["Content-Type","User-Name","Page-Size","Host-Color"],0],
["🌐 Web","difficile","Quel mécanisme permet à un navigateur de conserver de petites données côté client ?",["Cookie","DNS","SMTP","FTP"],0],
["🔐 Cybersécurité","facile","Que signifie 2FA ?",["Authentification à deux facteurs","Deux fichiers actifs","Deux firewalls automatiques","Format audio sécurisé"],0],
["🔐 Cybersécurité","facile","Quel mot de passe est le plus robuste ?",["Une longue phrase unique","123456","motdepasse","prenom2000"],0],
["🔐 Cybersécurité","facile","Qu'est-ce qu'un hameçonnage (phishing) ?",["Une tentative de tromperie pour obtenir des informations","Un antivirus","Un câble réseau","Une sauvegarde"],0],
["🔐 Cybersécurité","moyen","Que fait généralement un gestionnaire de mots de passe ?",["Stocker et générer des mots de passe de façon sécurisée","Désactiver Internet","Réparer un écran","Augmenter le débit Wi-Fi"],0],
["🔐 Cybersécurité","moyen","Quel principe limite les droits d'un utilisateur au strict nécessaire ?",["Moindre privilège","Accès universel","Confiance totale","Port ouvert"],0],
["🔐 Cybersécurité","moyen","Quel est le rôle principal d'une sauvegarde ?",["Pouvoir restaurer des données","Accélérer le processeur","Changer l'adresse IP","Supprimer les virus automatiquement"],0],
["🔐 Cybersécurité","difficile","Qu'est-ce qu'une attaque par déni de service distribué ?",["Un DDoS","Un SSD","Un DNS","Un VPN"],0],
["🔐 Cybersécurité","difficile","Quel algorithme est une fonction de hachage cryptographique courante ?",["SHA-256","AES-256","RSA-2048","TLS 1.3"],0],
["🔐 Cybersécurité","difficile","Pourquoi le sel est-il ajouté au hachage des mots de passe ?",["Pour rendre certaines attaques par tables précalculées plus difficiles","Pour accélérer le Wi-Fi","Pour chiffrer les vidéos","Pour augmenter la RAM"],0],
["🤖 Intelligence artificielle","facile","Que signifie IA ?",["Intelligence artificielle","Internet automatisé","Interface avancée","Indice algorithmique"],0],
["🤖 Intelligence artificielle","facile","Qu'est-ce qu'un modèle de langage ?",["Un modèle entraîné à traiter et générer du texte","Un câble réseau","Un format d'image","Un système GPS"],0],
["🤖 Intelligence artificielle","moyen","Qu'est-ce qu'un prompt ?",["Une instruction donnée à un modèle","Un antivirus","Une adresse IP","Un fichier audio"],0],
["🤖 Intelligence artificielle","moyen","Pourquoi faut-il vérifier une réponse générée par une IA ?",["Elle peut produire des erreurs ou des informations inventées","Elle ne sait jamais écrire","Elle ne fonctionne qu'en anglais","Elle supprime automatiquement les fichiers"],0],
["🤖 Intelligence artificielle","difficile","Comment appelle-t-on une information fausse présentée par un modèle comme vraie ?",["Une hallucination","Une compression","Une compilation","Une sauvegarde"],0],
["🤖 Intelligence artificielle","difficile","Quel apprentissage utilise des exemples associés à des réponses attendues ?",["Apprentissage supervisé","Apprentissage aléatoire","Apprentissage analogique","Apprentissage passif"],0],
["🚀 Sciences","facile","Quelle planète est la plus proche du Soleil ?",["Mercure","Vénus","Terre","Mars"],0],
["🚀 Sciences","facile","Quel gaz est majoritaire dans l'atmosphère terrestre ?",["Azote","Oxygène","Dioxyde de carbone","Hydrogène"],0],
["🚀 Sciences","facile","Combien de côtés possède un hexagone ?",["6","5","7","8"],0],
["🚀 Sciences","moyen","Quelle unité mesure une force ?",["Newton","Joule","Watt","Pascal"],0],
["🚀 Sciences","moyen","Quelle est la formule chimique de l'eau ?",["H₂O","CO₂","O₂","NaCl"],0],
["🚀 Sciences","moyen","Quel organe est principalement responsable des échanges gazeux dans les poumons ?",["Les alvéoles","Le foie","L'estomac","Le pancréas"],0],
["🚀 Sciences","difficile","Quelle vitesse est approximativement celle de la lumière dans le vide ?",["300 000 km/s","30 000 km/s","3 000 km/s","3 000 000 km/s"],0],
["🚀 Sciences","difficile","Quel élément possède le numéro atomique 6 ?",["Carbone","Oxygène","Azote","Bore"],0],
["🚀 Sciences","difficile","Quelle loi relie tension, résistance et intensité dans un circuit électrique ?",["Loi d'Ohm","Loi de Newton","Loi de Boyle","Loi de Snell"],0],
["🧬 Corps humain","facile","Quel organe pompe le sang ?",["Le cœur","Le foie","Le poumon","Le rein"],0],
["🧬 Corps humain","facile","Combien de poumons possède généralement un humain ?",["2","1","3","4"],0],
["🧬 Corps humain","facile","Quel sens est associé aux yeux ?",["La vue","L'ouïe","Le goût","Le toucher"],0],
["🧬 Corps humain","moyen","Quel organe filtre notamment le sang et produit l'urine ?",["Le rein","Le cœur","La rate","La thyroïde"],0],
["🧬 Corps humain","moyen","Quel est le plus grand organe du corps humain ?",["La peau","Le foie","Le cerveau","Le poumon"],0],
["🧬 Corps humain","difficile","Quelle molécule transporte principalement l'oxygène dans les globules rouges ?",["L'hémoglobine","L'insuline","La kératine","La myosine"],0],
["🎬 Cinéma","facile","Quel film met en scène un lion nommé Simba ?",["Le Roi Lion","Shrek","Cars","Avatar"],0],
["🎬 Cinéma","facile","Quel super-héros est associé à Gotham City ?",["Batman","Thor","Spider-Man","Iron Man"],0],
["🎬 Cinéma","facile","Quel personnage dit souvent « Je suis ton père » dans Star Wars ?",["Dark Vador","Yoda","Han Solo","Obi-Wan"],0],
["🎬 Cinéma","moyen","Qui a réalisé Inception ?",["Christopher Nolan","Steven Spielberg","James Cameron","Tim Burton"],0],
["🎬 Cinéma","moyen","Dans quelle saga trouve-t-on Poudlard ?",["Harry Potter","Le Seigneur des anneaux","Star Wars","Jurassic Park"],0],
["🎬 Cinéma","difficile","Quel réalisateur a signé 2001 : L'Odyssée de l'espace ?",["Stanley Kubrick","Ridley Scott","George Lucas","Francis Ford Coppola"],0],
["🎮 Jeux vidéo","facile","Dans quel jeu construit-on avec des blocs ?",["Minecraft","FIFA","Tetris","Valorant"],0],
["🎮 Jeux vidéo","facile","Quel personnage est associé à Nintendo et porte souvent une casquette rouge ?",["Mario","Sonic","Link","Pikachu"],0],
["🎮 Jeux vidéo","moyen","Quel jeu met en scène une île nommée Hyrule ?",["The Legend of Zelda","Minecraft","Fortnite","Animal Crossing"],0],
["🎮 Jeux vidéo","moyen","Dans Pokémon, quelle créature est souvent associée à la foudre ?",["Pikachu","Bulbizarre","Carapuce","Roucool"],0],
["🎮 Jeux vidéo","difficile","Quel studio a créé Minecraft à l'origine ?",["Mojang","Valve","Nintendo","Epic Games"],0],
["⚽ Sport","facile","Combien de joueurs d'une équipe de football sont généralement sur le terrain ?",["11","9","10","12"],0],
["⚽ Sport","facile","Dans quel sport utilise-t-on un panier ?",["Basket-ball","Tennis","Natation","Cyclisme"],0],
["⚽ Sport","facile","Quel sport se joue avec une raquette et un volant ?",["Badminton","Football","Rugby","Boxe"],0],
["⚽ Sport","moyen","Combien de points vaut un essai au rugby à XV ?",["5","3","7","1"],0],
["⚽ Sport","moyen","Sur quelle surface se joue traditionnellement Roland-Garros ?",["Terre battue","Gazon","Béton uniquement","Glace"],0],
["⚽ Sport","difficile","Quel pays a accueilli les premiers Jeux olympiques modernes en 1896 ?",["Grèce","France","Italie","Royaume-Uni"],0],
["🎵 Musique","facile","Quel instrument possède généralement 88 touches ?",["Piano","Guitare","Violon","Trompette"],0],
["🎵 Musique","facile","Combien de notes compte la gamme diatonique traditionnelle ?",["7","5","8","12"],0],
["🎵 Musique","moyen","Quel groupe a interprété Bohemian Rhapsody ?",["Queen","ABBA","U2","The Beatles"],0],
["🎵 Musique","moyen","Quel instrument possède quatre cordes dans sa forme classique ?",["Violon","Piano","Flûte","Trompette"],0],
["🎵 Musique","difficile","Quel compositeur a écrit la Neuvième Symphonie ?",["Ludwig van Beethoven","Mozart","Bach","Chopin"],0],
["🎨 Art","facile","Qui a peint La Joconde ?",["Léonard de Vinci","Monet","Picasso","Van Gogh"],0],
["🎨 Art","facile","Quel mouvement est associé à Claude Monet ?",["Impressionnisme","Cubisme","Surréalisme","Baroque"],0],
["🎨 Art","moyen","Qui a peint La Nuit étoilée ?",["Vincent van Gogh","Pablo Picasso","Salvador Dalí","Paul Cézanne"],0],
["🎨 Art","moyen","Quel artiste est associé au cubisme avec Georges Braque ?",["Pablo Picasso","Claude Monet","Edgar Degas","Auguste Renoir"],0],
["🎨 Art","difficile","Quel peintre espagnol a créé Guernica ?",["Pablo Picasso","Joan Miró","Goya","Dalí"],0],
["🍕 Cuisine","facile","Quel aliment est la base du guacamole ?",["Avocat","Tomate","Pomme de terre","Carotte"],0],
["🍕 Cuisine","facile","Quel pays est traditionnellement associé aux tacos ?",["Mexique","Japon","Norvège","Maroc"],0],
["🍕 Cuisine","moyen","Quel ingrédient donne généralement sa couleur jaune au curry ?",["Curcuma","Vanille","Cacao","Menthe"],0],
["🍕 Cuisine","moyen","Quel fromage italien est traditionnellement utilisé dans le tiramisu ?",["Mascarpone","Comté","Feta","Cheddar"],0],
["🍕 Cuisine","difficile","Quelle céréale est traditionnellement utilisée pour faire le risotto ?",["Riz","Blé","Orge","Seigle"],0],
["🧠 Culture générale","facile","Combien y a-t-il de jours dans une année normale ?",["365","360","366","364"],0],
["🧠 Culture générale","facile","Quel est le symbole chimique de l'or ?",["Au","Ag","Fe","Or"],0],
["🧠 Culture générale","moyen","Combien de côtés possède un octogone ?",["8","6","7","10"],0],
["🧠 Culture générale","moyen","Quelle langue compte le plus de locuteurs natifs selon les estimations courantes ?",["Chinois mandarin","Français","Allemand","Italien"],0],
["🧠 Culture générale","difficile","Quel nombre premier vient juste après 97 ?",["101","99","103","100"],0],
["🗣️ Langues","facile","Que signifie « hello » en français ?",["Bonjour","Merci","Au revoir","Bonne nuit"],0],
["🗣️ Langues","facile","Que signifie « gracias » en français ?",["Merci","Bonjour","Pardon","Demain"],0],
["🗣️ Langues","moyen","Que signifie « grazie » en français ?",["Merci","Bonjour","Bonsoir","Bienvenue"],0],
["🗣️ Langues","moyen","Quel mot anglais signifie « ordinateur » ?",["Computer","Keyboard","Screen","Network"],0],
["🗣️ Langues","difficile","Que signifie « Auf Wiedersehen » en allemand ?",["Au revoir","Bonjour","Merci","À demain"],0],
["🌱 Nature","facile","Quel arbre produit des glands ?",["Le chêne","Le pin","Le bouleau","Le palmier"],0],
["🌱 Nature","facile","Quel animal est un amphibien ?",["Grenouille","Aigle","Dauphin","Tigre"],0],
["🌱 Nature","moyen","Quel processus permet aux plantes de fabriquer leur matière organique grâce à la lumière ?",["Photosynthèse","Fermentation","Digestion","Respiration uniquement"],0],
["🌱 Nature","moyen","Quel est le plus grand animal connu vivant actuellement ?",["Baleine bleue","Éléphant d'Afrique","Requin-baleine","Girafe"],0],
["🌱 Nature","difficile","Quel pigment est principalement responsable de la couleur verte des feuilles ?",["Chlorophylle","Mélanine","Hémoglobine","Carotène uniquement"],0],
["📚 Littérature","facile","Qui a écrit Les Misérables ?",["Victor Hugo","Molière","Zola","Balzac"],0],
["📚 Littérature","facile","Qui est l'auteur de Candide ?",["Voltaire","Rousseau","Diderot","Montaigne"],0],
["📚 Littérature","moyen","Quel personnage est le fidèle compagnon de Sherlock Holmes ?",["Dr Watson","Hercule Poirot","Jean Valjean","Gatsby"],0],
["📚 Littérature","moyen","Quel écrivain a créé Arsène Lupin ?",["Maurice Leblanc","Jules Verne","Victor Hugo","Alexandre Dumas"],0],
["📚 Littérature","difficile","Quel mouvement est particulièrement associé à André Breton ?",["Surréalisme","Classicisme","Naturalisme","Symbolisme"],0],
["📱 Technologie","facile","Quel appareil sert principalement à afficher une image sur un ordinateur ?",["Écran","Routeur","Clavier","Microphone"],0],
["📱 Technologie","facile","Quel connecteur est très répandu sur les appareils modernes pour la charge et les données ?",["USB-C","VGA","PS/2","DVI uniquement"],0],
["📱 Technologie","moyen","À quoi sert principalement un QR code ?",["Encoder des informations lisibles par un appareil","Refroidir un processeur","Mesurer le son","Chiffrer automatiquement tous les fichiers"],0],
["📱 Technologie","moyen","Qu'est-ce que le Bluetooth ?",["Une technologie de communication sans fil à courte portée","Un type de disque dur","Un système d'exploitation","Un langage de programmation"],0],
["📱 Technologie","difficile","Que désigne l'IoT ?",["Internet des objets","Indice d'optimisation thermique","Interface opérateur texte","Installation ordinateur-tablette"],0],
["🕵️ OSINT & Investigation numérique","facile","Que signifie OSINT ?",["Open Source Intelligence","Online Secure Internet Network Tool","Open System Internal Transfer","Official Search Index Network"],0],
["🕵️ OSINT & Investigation numérique","facile","Une information trouvée publiquement sur Internet est-elle forcément vraie ?",["Non, elle doit être vérifiée","Oui, toujours","Seulement si elle est récente","Uniquement sur les réseaux sociaux"],0],
["🕵️ OSINT & Investigation numérique","moyen","Quel élément peut aider à vérifier l'origine d'une image ?",["Sa source et son contexte","Sa couleur uniquement","Sa taille uniquement","Son nom de fichier uniquement"],0],
["🕵️ OSINT & Investigation numérique","moyen","Quel principe est essentiel avant de partager une information trouvée en ligne ?",["Vérifier la source et recouper","La publier immédiatement","Supprimer les commentaires","Changer le titre"],0],
["🕵️ OSINT & Investigation numérique","difficile","Que permet principalement une recherche inversée d'image ?",["Retrouver des occurrences ou sources associées à une image","Modifier les pixels automatiquement","Créer un mot de passe","Accélérer une connexion"],0]
];
EXTRA.forEach(x=>{
if(!Array.isArray(x)||x.length<5)return;
const [category,difficulty,question,answers,correct]=x;
if(!QUESTIONS.some(q=>q.category===category&&q.question===question)){
QUESTIONS.push({category,difficulty,question,answers,correct,v34:true});
}
});
/* ---------- Utilitaires ---------- */
const toastEl=document.getElementById("v34Toast");
let toastTimer=null;
function toast(message){
if(!toastEl)return;
toastEl.textContent=message;
toastEl.classList.add("show");
clearTimeout(toastTimer);
toastTimer=setTimeout(()=>toastEl.classList.remove("show"),2200);
}
window.v34Toast=toast;
function safeText(value,max=80){
return String(value??"").replace(/[<>]/g,"").replace(/[\u0000-\u001F\u007F]/g,"").trim().slice(0,max);
}
/* ---------- Clipboard compatible Safari/iOS + fallback ---------- */
window.v34Copy=async function(text){
text=safeText(text,32);
try{
if(navigator.clipboard&&window.isSecureContext){
await navigator.clipboard.writeText(text); toast("✅ Copié !"); return true;
}
}catch(e){}
try{
const area=document.createElement("textarea");
area.value=text; area.setAttribute("readonly","");
area.style.position="fixed";area.style.opacity="0";area.style.pointerEvents="none";
document.body.appendChild(area);
area.focus();area.select();area.setSelectionRange(0,area.value.length);
const ok=document.execCommand("copy");area.remove();
if(ok){toast("✅ Copié !");return true;}
}catch(e){}
toast("📋 Code : "+text); return false;
};
/* Remplace le comportement de copie fragile par le fallback iOS. */
window.copyRoomCode=function(){
if(!roomCode)return;
v34Copy(roomCode);
};
/* ---------- Audio : respecter les restrictions autoplay de Safari ---------- */
function unlockAudio(){
try{
if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();
if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
}catch(e){}
}
["touchstart","pointerdown","keydown"].forEach(evt=>document.addEventListener(evt,unlockAudio,{once:true,passive:true}));
const oldInitAudio=window.initAudio;
if(typeof oldInitAudio==="function"){
window.initAudio=function(){const r=oldInitAudio.apply(this,arguments);unlockAudio();return r;};
}
/* ---------- Visibilité Safari : ne pas laisser un timer local dériver silencieusement ---------- */
let hiddenAt=0;
document.addEventListener("visibilitychange",()=>{
if(document.hidden){hiddenAt=Date.now();}
else if(hiddenAt&&gameStarted){
const elapsed=(Date.now()-hiddenAt)/1000;
if(elapsed>Math.max(2,questionTime+2)){
toast("⏱️ Retour dans la partie : le temps a continué à s'écouler.");
}
hiddenAt=0;
}
});
/* ---------- Empêcher double-clic/double-tap sur les boutons d'action ---------- */
document.addEventListener("click",e=>{
const b=e.target.closest("button[data-v34-once]");
if(!b)return;
if(b.dataset.v34Locked==="1"){e.preventDefault();e.stopImmediatePropagation();return;}
b.dataset.v34Locked="1";
setTimeout(()=>{if(b.isConnected)b.dataset.v34Locked="0";},900);
},true);
/* ---------- Affichage du volume réel de la banque ---------- */
function addBankNote(){
const host=document.getElementById("hostSettings");
if(!host||document.getElementById("v34BankNote"))return;
const n=document.createElement("div");n.id="v34BankNote";n.className="v34-bank-note";
n.innerHTML="<strong>📚 Banque enrichie</strong><br>Cette version ajoute plus de 120 questions couvrant histoire, géographie, informatique, web, cybersécurité, IA, sciences, culture, sport, cinéma, jeux vidéo, musique, art, cuisine, langues, nature et OSINT.";
const grid=document.getElementById("themeGrid");if(grid)grid.before(n);else host.appendChild(n);
}
/* ---------- Recalcul fiable du compteur des questions disponibles ---------- */
const originalStartGame=window.startGame;
if(typeof originalStartGame==="function"){
window.startGame=function(){
try{
const selected=[...document.querySelectorAll("#themeGrid input:checked")].map(x=>x.value);
if(selected.length){
const pool=QUESTIONS.filter(q=>selected.includes(q.category));
const requested=Number(document.getElementById("roundCount")?.value||10);
if(pool.length<requested){
toast("ℹ️ "+pool.length+" question(s) disponibles avec les thèmes choisis.");
}
}
}catch(e){console.warn("V34 pool check",e)}
return originalStartGame.apply(this,arguments);
};
}
/* ---------- Nettoyage des noms saisis : utile sur clavier iPhone ---------- */
["hostName","joinName"].forEach(id=>{
const el=document.getElementById(id);if(!el)return;
el.setAttribute("autocomplete","nickname");el.setAttribute("enterkeyhint","go");
el.addEventListener("input",()=>{el.value=safeText(el.value,24);});
});
const roomInput=document.getElementById("roomInput");
if(roomInput){
roomInput.setAttribute("inputmode","numeric");roomInput.setAttribute("autocomplete","one-time-code");roomInput.setAttribute("enterkeyhint","join");
roomInput.addEventListener("input",()=>{roomInput.value=roomInput.value.replace(/\D/g,"").slice(0,6);});
}
/* ---------- Touche Entrée sur les formulaires ---------- */
document.addEventListener("keydown",e=>{
if(e.key!=="Enter")return;
const a=document.activeElement;
if(a?.id==="hostName"){e.preventDefault();document.querySelector('#hostName')?.closest('.home-box')?.querySelector('.btn')?.click();}
if(a?.id==="roomInput"){e.preventDefault();document.querySelector('#joinName')?.value.trim()&&document.querySelector('#roomInput')?.value.trim()&&document.querySelector('#roomInput')?.closest('.home-box')?.querySelector('.btn')?.click();}
},true);
addBankNote();
setInterval(addBankNote,1200);
document.title="Qui suis-je ? 🎮 — V34 iOS & questions enrichies";
console.log("V34 : compatibilité Safari/iOS, copie robuste, audio débloqué au geste, safe areas et banque étendue.");
})();
