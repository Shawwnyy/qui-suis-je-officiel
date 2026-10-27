/* =========================================================
QUESTIONS
========================================================= */
const QUESTIONS = [
{
difficulty:"facile",
category:"🌍 Géographie",
question:"Quelle est la capitale de la France ?",
answers:["Paris","Lyon","Marseille","Nice"],
correct:0
},
{
difficulty:"facile",
category:"🌍 Géographie",
question:"Quelle est la capitale de l'Italie ?",
answers:["Milan","Rome","Naples","Venise"],
correct:1
},
{
difficulty:"facile",
category:"🌍 Géographie",
question:"Quelle est la capitale du Japon ?",
answers:["Tokyo","Kyoto","Osaka","Hiroshima"],
correct:0
},
{
difficulty:"facile",
category:"🌍 Géographie",
question:"Quel est le plus grand océan ?",
answers:["Atlantique","Indien","Pacifique","Arctique"],
correct:2
},
{
difficulty:"facile",
category:"🦁 Animaux",
question:"Quel animal miaule ?",
answers:["Chien","Chat","Cheval","Vache"],
correct:1
},
{
difficulty:"facile",
category:"🦁 Animaux",
question:"Quel animal produit du miel ?",
answers:["Abeille","Fourmi","Papillon","Mouche"],
correct:0
},
{
difficulty:"facile",
category:"🎮 Jeux vidéo",
question:"Quel personnage porte une casquette rouge ?",
answers:["Link","Mario","Sonic","Kirby"],
correct:1
},
{
difficulty:"facile",
category:"🎮 Jeux vidéo",
question:"Quel personnage est bleu et très rapide ?",
answers:["Mario","Sonic","Link","Kirby"],
correct:1
},
{
difficulty:"facile",
category:"🎬 Cinéma",
question:"Dans quel film trouve-t-on Simba ?",
answers:["Le Roi Lion","Toy Story","Shrek","Cars"],
correct:0
},
{
difficulty:"facile",
category:"🚀 Sciences",
question:"Quelle planète est rouge ?",
answers:["Mars","Jupiter","Vénus","Mercure"],
correct:0
},
{
difficulty:"facile",
category:"🧠 Culture générale",
question:"Combien de jours compte une semaine ?",
answers:["5","6","7","8"],
correct:2
},
{
difficulty:"facile",
category:"🎵 Musique",
question:"Quel instrument possède généralement 88 touches ?",
answers:["Guitare","Piano","Violon","Flûte"],
correct:1
},
{
difficulty:"facile",
category:"🍕 Cuisine",
question:"De quel pays vient traditionnellement la pizza ?",
answers:["France","Italie","Espagne","Grèce"],
correct:1
},
{
difficulty:"facile",
category:"⚽ Sport",
question:"Combien de joueurs composent une équipe de football sur le terrain ?",
answers:["9","10","11","12"],
correct:2
},
{
difficulty:"moyen",
category:"🌍 Géographie",
question:"Quel est le plus grand pays du monde en superficie ?",
answers:["Canada","Chine","Russie","États-Unis"],
correct:2
},
{
difficulty:"moyen",
category:"🌍 Géographie",
question:"Quelle est la capitale de l'Australie ?",
answers:["Sydney","Melbourne","Canberra","Perth"],
correct:2
},
{
difficulty:"moyen",
category:"🦁 Animaux",
question:"Quel animal peut changer de couleur pour se camoufler ?",
answers:["Caméléon","Tigre","Éléphant","Panda"],
correct:0
},
{
difficulty:"moyen",
category:"🦁 Animaux",
question:"Quel mammifère est capable de voler ?",
answers:["Aigle","Chauve-souris","Pingouin","Autruche"],
correct:1
},
{
difficulty:"moyen",
category:"🎮 Jeux vidéo",
question:"Quel personnage utilise une épée dans Zelda ?",
answers:["Mario","Link","Sonic","Luigi"],
correct:1
},
{
difficulty:"moyen",
category:"🎮 Jeux vidéo",
question:"Dans quel jeu trouve-t-on le Nether ?",
answers:["Minecraft","Fortnite","Roblox","Terraria"],
correct:0
},
{
difficulty:"moyen",
category:"🎬 Cinéma",
question:"Quel personnage utilise le marteau Mjolnir ?",
answers:["Thor","Hulk","Iron Man","Captain America"],
correct:0
},
{
difficulty:"moyen",
category:"🚀 Sciences",
question:"Quelle force nous maintient au sol ?",
answers:["Magnétisme","Gravité","Électricité","Friction"],
correct:1
},
{
difficulty:"moyen",
category:"🚀 Sciences",
question:"Quel organe pompe le sang ?",
answers:["Poumon","Cerveau","Cœur","Foie"],
correct:2
},
{
difficulty:"moyen",
category:"💻 Informatique",
question:"Que signifie HTML ?",
answers:[
"HyperText Markup Language",
"HighText Machine Language",
"HyperTool Modern Language",
"Home Tool Markup Language"
],
correct:0
},
{
difficulty:"moyen",
category:"💻 Informatique",
question:"Quel langage permet de styliser une page web ?",
answers:["HTML","CSS","SQL","PHP"],
correct:1
},
{
difficulty:"moyen",
category:"🌐 Web",
question:"Que signifie URL ?",
answers:[
"Uniform Resource Locator",
"Universal Robot Language",
"User Resource Link",
"Uniform Random Login"
],
correct:0
},
{
difficulty:"moyen",
category:"⚽ Sport",
question:"Combien de joueurs d'une équipe de basket sont sur le terrain ?",
answers:["4","5","6","7"],
correct:1
},
{
difficulty:"difficile",
category:"🌍 Géographie",
question:"Quelle est la capitale du Kazakhstan ?",
answers:["Astana","Almaty","Bichkek","Tachkent"],
correct:0
},
{
difficulty:"difficile",
category:"🌍 Géographie",
question:"Quel détroit sépare l'Europe et l'Afrique ?",
answers:["Bosphore","Gibraltar","Béring","Ormuz"],
correct:1
},
{
difficulty:"difficile",
category:"🦁 Animaux",
question:"Quel animal possède trois cœurs ?",
answers:["Poulpe","Requin","Dauphin","Méduse"],
correct:0
},
{
difficulty:"difficile",
category:"🦁 Animaux",
question:"Quel est le seul mammifère capable de vol actif ?",
answers:["Écureuil volant","Chauve-souris","Lémurien","Colugo"],
correct:1
},
{
difficulty:"difficile",
category:"🎮 Jeux vidéo",
question:"Comment s'appelle le royaume principal de The Legend of Zelda ?",
answers:["Hyrule","Midgar","Rapture","Mordor"],
correct:0
},
{
difficulty:"difficile",
category:"🎬 Cinéma",
question:"Quel réalisateur a réalisé Inception ?",
answers:[
"Christopher Nolan",
"James Cameron",
"Peter Jackson",
"Ridley Scott"
],
correct:0
},
{
difficulty:"difficile",
category:"🚀 Sciences",
question:"Quel est le symbole chimique du tungstène ?",
answers:["T","W","Tu","G"],
correct:1
},
{
difficulty:"difficile",
category:"🚀 Sciences",
question:"Quelle particule possède une charge négative ?",
answers:["Proton","Neutron","Électron","Photon"],
correct:2
},
{
difficulty:"difficile",
category:"💻 Informatique",
question:"Que signifie CPU ?",
answers:[
"Central Processing Unit",
"Computer Personal Unit",
"Central Program Utility",
"Control Processing User"
],
correct:0
},
{
difficulty:"difficile",
category:"🎵 Musique",
question:"Combien de demi-tons contient une octave ?",
answers:["8","10","12","14"],
correct:2
},
{
difficulty:"difficile",
category:"🎨 Art",
question:"Quel mouvement artistique est associé à Claude Monet ?",
answers:[
"Cubisme",
"Impressionnisme",
"Surréalisme",
"Baroque"
],
correct:1
},
{
difficulty:"difficile",
category:"🌐 Web",
question:"Que signifie DNS ?",
answers:[
"Domain Name System",
"Digital Network Service",
"Data Name Server",
"Domain Network Security"
],
correct:0
},
{
difficulty:"impossible",
category:"🌍 Géographie",
question:"Quelle est la capitale de Palau ?",
answers:["Koror","Ngerulmud","Majuro","Funafuti"],
correct:1
},
{
difficulty:"impossible",
category:"🌍 Géographie",
question:"Quel pays possède l'enclave de Llivia ?",
answers:["France","Espagne","Andorre","Portugal"],
correct:1
},
{
difficulty:"impossible",
category:"🦁 Animaux",
question:"Quel animal possède du sang bleu en raison de l'hémocyanine ?",
answers:["Poulpe","Grenouille","Tigre","Aigle"],
correct:0
},
{
difficulty:"impossible",
category:"🚀 Sciences",
question:"Quelle constante est approximativement égale à 6,626 × 10⁻³⁴ J·s ?",
answers:[
"Constante de Planck",
"Constante de Boltzmann",
"Nombre d'Avogadro",
"Constante gravitationnelle"
],
correct:0
},
{
difficulty:"impossible",
category:"🚀 Sciences",
question:"Quel est le nombre d'Avogadro approximatif ?",
answers:[
"6,022 × 10²³",
"9,81 × 10²³",
"3,14 × 10²³",
"1,602 × 10⁻¹⁹"
],
correct:0
},
{
difficulty:"impossible",
category:"💻 Informatique",
question:"Quelle structure de données fonctionne selon le principe LIFO ?",
answers:["File","Pile","Arbre","Graphe"],
correct:1
},
{
difficulty:"impossible",
category:"💻 Informatique",
question:"Quelle structure fonctionne selon le principe FIFO ?",
answers:["Pile","File","Tas","Arbre"],
correct:1
},
{
difficulty:"impossible",
category:"💻 Informatique",
question:"Quel langage a été créé par Guido van Rossum ?",
answers:["Python","Ruby","Go","Lua"],
correct:0
},
{
difficulty:"impossible",
category:"🎮 Jeux vidéo",
question:"Quel est le nom du protagoniste de Hollow Knight ?",
answers:["The Knight","Hornet","The Vessel","Void"],
correct:0
},
{
difficulty:"impossible",
category:"🎬 Cinéma",
question:"Quel réalisateur a réalisé Stalker en 1979 ?",
answers:[
"Andrei Tarkovski",
"Akira Kurosawa",
"Ingmar Bergman",
"Federico Fellini"
],
correct:0
},
{
difficulty:"impossible",
category:"🎵 Musique",
question:"Quel compositeur a écrit Le Sacre du printemps ?",
answers:[
"Igor Stravinsky",
"Claude Debussy",
"Ravel",
"Prokofiev"
],
correct:0
},
{
difficulty:"impossible",
category:"🧠 Culture générale",
question:"Quel est le seul nombre premier pair ?",
answers:["0","1","2","4"],
correct:2
},
{
difficulty:"impossible",
category:"🎨 Art",
question:"Quel artiste a peint le plafond de la chapelle Sixtine ?",
answers:[
"Raphaël",
"Michel-Ange",
"Donatello",
"Caravage"
],
correct:1
},
{
difficulty:"impossible",
category:"🌐 Web",
question:"Quel code HTTP indique généralement une erreur 'Not Found' ?",
answers:["200","301","404","500"],
correct:2
},
/* ================= HISTOIRE ================= */
{ difficulty:"facile", category:"🏛️ Histoire", question:"En quelle année commence généralement la Révolution française ?", answers:["1789","1492","1914","1945"], correct:0 },
{ difficulty:"moyen", category:"🏛️ Histoire", question:"Quelle civilisation a construit le Machu Picchu ?", answers:["Les Incas","Les Romains","Les Vikings","Les Égyptiens"], correct:0 },
{ difficulty:"difficile", category:"🏛️ Histoire", question:"Quel événement est associé à la date du 14 juillet 1789 ?", answers:["La prise de la Bastille","Le traité de Versailles","Le débarquement de Normandie","La bataille de Waterloo"], correct:0 },
{ difficulty:"impossible", category:"🏛️ Histoire", question:"Quel traité signé en 1919 met officiellement fin à la Première Guerre mondiale entre l'Allemagne et les Alliés ?", answers:["Traité de Versailles","Traité de Rome","Traité de Maastricht","Traité de Tordesillas"], correct:0 },
/* ================= LITTÉRATURE ================= */
{ difficulty:"facile", category:"📚 Littérature", question:"Qui a écrit Les Misérables ?", answers:["Victor Hugo","Molière","Émile Zola","Jules Verne"], correct:0 },
{ difficulty:"moyen", category:"📚 Littérature", question:"Quel personnage appartient à l'univers de Sherlock Holmes ?", answers:["Dr Watson","Jean Valjean","Gargantua","Cyrano"], correct:0 },
{ difficulty:"difficile", category:"📚 Littérature", question:"Qui a écrit Candide ?", answers:["Voltaire","Rousseau","Diderot","Balzac"], correct:0 },
{ difficulty:"impossible", category:"📚 Littérature", question:"Quel courant littéraire est particulièrement associé à André Breton ?", answers:["Le surréalisme","Le classicisme","Le réalisme","Le naturalisme"], correct:0 },
/* ================= TECHNOLOGIE ================= */
{ difficulty:"facile", category:"💡 Technologie", question:"Que signifie USB ?", answers:["Universal Serial Bus","Unified System Board","User Storage Base","Universal Secure Browser"], correct:0 },
{ difficulty:"moyen", category:"💡 Technologie", question:"Quel appareil distribue généralement une connexion réseau entre plusieurs appareils ?", answers:["Un routeur","Un écran","Une imprimante","Un scanner"], correct:0 },
{ difficulty:"difficile", category:"💡 Technologie", question:"Quel format est couramment utilisé pour représenter des données structurées sous forme texte ?", answers:["JSON","MP3","PNG","WAV"], correct:0 },
{ difficulty:"impossible", category:"💡 Technologie", question:"Quel protocole chiffre généralement les communications d'un site web en HTTPS ?", answers:["TLS","FTP","ARP","ICMP"], correct:0 },
/* ================= NATURE ================= */
{ difficulty:"facile", category:"🌿 Nature", question:"Quel gaz les plantes absorbent-elles principalement pour la photosynthèse ?", answers:["Dioxyde de carbone","Hélium","Hydrogène","Néon"], correct:0 },
{ difficulty:"moyen", category:"🌿 Nature", question:"Quel est le plus grand animal connu vivant actuellement ?", answers:["Baleine bleue","Éléphant d'Afrique","Girafe","Requin blanc"], correct:0 },
{ difficulty:"difficile", category:"🌿 Nature", question:"Quel phénomène décrit le déplacement saisonnier de certains animaux ?", answers:["La migration","La photosynthèse","La fermentation","La fossilisation"], correct:0 },
{ difficulty:"impossible", category:"🌿 Nature", question:"Comment appelle-t-on une relation dans laquelle deux espèces tirent toutes deux un bénéfice ?", answers:["Mutualisme","Prédation","Parasitisme","Compétition"], correct:0 },
/* ================= MYTHOLOGIE ================= */
{ difficulty:"facile", category:"⚡ Mythologie", question:"Dans la mythologie grecque, qui est le dieu de la foudre ?", answers:["Zeus","Hermès","Arès","Héphaïstos"], correct:0 },
{ difficulty:"moyen", category:"⚡ Mythologie", question:"Quel héros grec est associé au Minotaure ?", answers:["Thésée","Ulysse","Achille","Persée"], correct:0 },
{ difficulty:"difficile", category:"⚡ Mythologie", question:"Quel objet permet à Thésée de retrouver son chemin dans le labyrinthe ?", answers:["Le fil d'Ariane","Le bouclier d'Athéna","La lyre d'Orphée","Le trident de Poséidon"], correct:0 },
{ difficulty:"impossible", category:"⚡ Mythologie", question:"Dans la mythologie nordique, quel arbre relie les différents mondes ?", answers:["Yggdrasil","Excalibur","Mjolnir","Valhalla"], correct:0 },
/* ================= LANGUES ================= */
{ difficulty:"facile", category:"🗣️ Langues", question:"Quelle langue est principalement parlée au Brésil ?", answers:["Portugais","Espagnol","Italien","Français"], correct:0 },
{ difficulty:"moyen", category:"🗣️ Langues", question:"Quel alphabet est utilisé pour écrire le russe moderne ?", answers:["Cyrillique","Grec","Latin uniquement","Arabe"], correct:0 },
{ difficulty:"difficile", category:"🗣️ Langues", question:"Combien de lettres compte l'alphabet grec classique dans sa forme standard ?", answers:["24","20","26","32"], correct:0 },
{ difficulty:"impossible", category:"🗣️ Langues", question:"Quel terme désigne un mot ayant un sens proche d'un autre mot ?", answers:["Synonyme","Antonyme","Homonyme","Palindrome"], correct:0 },
];
