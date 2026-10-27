/* =========================================================
MODES FUN : questions en or, événements, paliers, marathon
========================================================= */
window.gameOpts={golden:true,events:true,streak:true};
function readGameOpts(){
const g=id=>{const e=document.getElementById(id);return e?e.checked:true;};
window.gameOpts={golden:g("optGolden"),events:g("optEvents"),streak:g("optStreak")};
}
/* Pastille d'annonce (visible par tous les joueurs) */
function showBanner(text){
let b=document.getElementById("funBanner");
if(!b){
b=document.createElement("div");
b.id="funBanner";
b.style.cssText="position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:3000;max-width:92vw;padding:10px 18px;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-weight:900;font-size:15px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.4);display:none;pointer-events:none";
document.body.appendChild(b);
}
b.textContent=text;
b.style.display="block";
clearTimeout(window.__bannerT);
window.__bannerT=setTimeout(()=>{b.style.display="none";},3500);
}
function announce(text){
showBanner(text);
broadcast({type:"banner",text});
}
/* Hook côté hôte : drapeaux or / événement ajoutés à la question */
const __withFxBase=withFxMods;
withFxMods=function(q){
if(typeof currentQuestionIndex!=="undefined"&&currentQuestionIndex===0){
readGameOpts();
}
const idx=(typeof currentQuestionIndex!=="undefined"?currentQuestionIndex:0)+1;
const opts=window.gameOpts;
const golden=opts.golden&&idx%5===0;
let event=null;
if(!golden&&opts.events&&idx>1&&Math.random()<0.22){
event=Math.random()<0.5?"eclair":"chance";
}
window.__ev=event;
window.__golden=golden;
const out=__withFxBase(q);
out.golden=golden;
out.event=event;
return out;
};
/* Chrono -50 % pour tous pendant l'événement éclair */
const __fxTimeBase=fxTimeDelta;
fxTimeDelta=function(p){
let d=__fxTimeBase(p);
if(window.__ev==="eclair"){
d-=Math.round(questionTime*0.5);
}
return Math.max(5,questionTime+d)-questionTime;
};
/* Multiplicateurs or / événements + paliers de série */
const __applyScoreBase=applyScoreFx;
applyScoreFx=function(p,pts,data){
let mult=1;
const q=currentQuestion||{};
if(q.golden)mult*=2;
if(q.event==="eclair")mult*=1.5;
let g=__applyScoreBase(p,Math.round(pts*mult),data);
if(q.event==="chance")g+=200;
if(window.gameOpts.streak&&p.combo>0&&p.combo%5===0){
const bonus=500*(p.combo/5);
g+=bonus;
announce("🔥 "+p.name+" : "+p.combo+" bonnes réponses d'affilée ! +"+bonus+" pts");
}
return g;
};
/* Affichage client : bandeau or / événement */
const __displayBase=displayQuestion;
displayQuestion=function(question,round){
__displayBase(question,round);
if(question&&question.golden){
showBanner("⭐ QUESTION EN OR : points ×2 !");
}else if(question&&question.event==="eclair"){
showBanner("⚡ ÉCLAIR : chrono -50 %, points ×1,5 !");
}else if(question&&question.event==="chance"){
showBanner("🍀 CHANCE : +200 pts pour chaque bonne réponse !");
}
};
/* Messages d'annonce reçus par les invités */
const __handleDataBase=handleData;
handleData=function(data){
if(data&&data.type==="banner"){
showBanner(data.text);
return;
}
return __handleDataBase(data);
};
/* Langue : filtre des questions traduites + thèmes grisés */
function hasTranslation(q,lang){
if(lang==="fr")return true;
const pack=LANG_PACKS[lang];
const i=QUESTIONS.indexOf(q);
return !!(pack&&i>=0&&pack.rows[i]);
}
const __langChangeBase=onQuestionLangChange;
onQuestionLangChange=function(){
__langChangeBase();
const lang=questionLang;
document.querySelectorAll("#themeGrid input").forEach(input=>{
const count=QUESTIONS.filter(q=>q.category===input.value&&hasTranslation(q,lang)).length;
const wrapper=input.closest(".theme-option")||input.parentElement;
input.disabled=count===0;
if(wrapper)wrapper.style.opacity=count===0?".35":"1";
if(count===0&&input.checked){
input.checked=false;
input.dispatchEvent(new Event("change",{bubbles:true}));
}
});
};
/* Règles (écran d'attente) */
const RULES_TEXT={
fr:`<b>🎯 Objectif :</b> marque un maximum de points.<br>
<b>✅ Bonne réponse :</b> 500 pts + bonus de vitesse + bonus de combo, multipliés selon la difficulté.<br>
<b>🔥 Combo :</b> 2 bonnes réponses d'affilée = une <b>action spéciale</b> (bonus pour toi ou malus pour un adversaire). Tu as <b>20 secondes</b> pour choisir.<br>
<b>❌ Erreurs :</b> 2 mauvaises réponses = -200 pts automatiques.<br>
<b>⭐ Question en or :</b> toutes les 5 questions, points ×2.<br>
<b>⚡🍀 Événements :</b> parfois, chrono réduit (points ×1,5) ou +200 pts de chance.<br>
<b>🏅 Paliers :</b> tous les 5 combos d'affilée, un gros bonus pour tout le monde à voir !`,
en:`<b>🎯 Goal:</b> score as many points as you can.<br>
<b>✅ Correct answer:</b> 500 pts + speed bonus + combo bonus, multiplied by difficulty.<br>
<b>🔥 Combo:</b> 2 correct answers in a row = a <b>special action</b> (a bonus for you or a penalty for an opponent). You have <b>20 seconds</b> to choose.<br>
<b>❌ Mistakes:</b> 2 wrong answers = -200 pts automatically.<br>
<b>⭐ Golden question:</b> every 5 questions, points ×2.<br>
<b>⚡🍀 Events:</b> sometimes a shorter timer (points ×1.5) or +200 lucky points.<br>
<b>🏅 Milestones:</b> every 5 correct answers in a row earns a big bonus, announced to everyone!`,
es:`<b>🎯 Objetivo:</b> consigue el máximo de puntos.<br>
<b>✅ Respuesta correcta:</b> 500 pts + bonus de velocidad + bonus de combo, multiplicados según la dificultad.<br>
<b>🔥 Combo:</b> 2 aciertos seguidos = una <b>acción especial</b> (un bonus para ti o un malus para un rival). Tienes <b>20 segundos</b> para elegir.<br>
<b>❌ Errores:</b> 2 respuestas incorrectas = -200 pts automáticos.<br>
<b>⭐ Pregunta de oro:</b> cada 5 preguntas, puntos ×2.<br>
<b>⚡🍀 Eventos:</b> a veces menos tiempo (puntos ×1,5) o +200 pts de suerte.<br>
<b>🏅 Hitos:</b> cada 5 aciertos seguidos, ¡un gran bonus anunciado a todos!`
};
function setRulesLang(lang){
const box=document.getElementById("rulesText");
if(box)box.innerHTML=RULES_TEXT[lang]||RULES_TEXT.fr;
document.querySelectorAll("#rulesLangs button").forEach(b=>{
b.style.opacity=b.dataset.lang===lang?"1":".5";
});
}
setRulesLang("fr");
window.__HAS_BASE_THEMES=true;
/* =========================================================
V6 : ENCORE PLUS DE QUESTIONS (FR / EN / ES)
format : [catégorie, difficulté, FR q, FR rép., EN q, EN rép., ES q, ES rép.]  ("." = identique au FR)
========================================================= */
(function(){
const PACK_FUN=[
["🤯 Incroyable mais vrai","difficile","Quelle planète flotterait sur l'eau car sa densité est inférieure à celle de l'eau ?",["Saturne","Jupiter","Mars","Uranus"],"Which planet would float on water because it is less dense than water?",["Saturn","Jupiter","Mars","Uranus"],"¿Qué planeta flotaría en el agua por ser menos denso que ella?",["Saturno","Júpiter","Marte","Urano"]],
["🤯 Incroyable mais vrai","moyen","Quel animal marin n'a ni cerveau ni cœur ?",["La méduse","Le dauphin","Le requin","La pieuvre"],"Which sea animal has neither a brain nor a heart?",["The jellyfish","The dolphin","The shark","The octopus"],"¿Qué animal marino no tiene cerebro ni corazón?",["La medusa","El delfín","El tiburón","El pulpo"]],
["🤯 Incroyable mais vrai","moyen","Quel est le seul métal liquide à température ambiante ?",["Le mercure","Le fer","Le cuivre","Le zinc"],"What is the only metal that is liquid at room temperature?",["Mercury","Iron","Copper","Zinc"],"¿Cuál es el único metal líquido a temperatura ambiente?",["El mercurio","El hierro","El cobre","El zinc"]],
["🪐 Espace","facile","Qui a été le premier homme à marcher sur la Lune ?",["Neil Armstrong","Buzz Aldrin","Youri Gagarine","Alan Shepard"],"Who was the first man to walk on the Moon?",[".",".",".","."],"¿Quién fue el primer hombre en caminar sobre la Luna?",[".",".","Yuri Gagarin","."]],
["🪐 Espace","facile","Quelle planète est la plus proche du Soleil ?",["Mercure","Vénus","Mars","La Terre"],"Which planet is closest to the Sun?",["Mercury","Venus","Mars","Earth"],"¿Qué planeta está más cerca del Sol?",["Mercurio","Venus","Marte","La Tierra"]],
["🪐 Espace","difficile","Comment s'appelle la plus grande lune de Saturne ?",["Titan","Europe","Io","Triton"],"What is Saturn's largest moon called?",["Titan","Europa","Io","Triton"],"¿Cómo se llama la luna más grande de Saturno?",["Titán","Europa","Ío","Tritón"]],
["😂 Internet & Mèmes","facile","Que signifie « WWW » dans une adresse web ?",["World Wide Web","World Web Window","Wide World Web","Web Wide World"],"What does 'WWW' stand for in a web address?",[".",".",".","."],"¿Qué significa «WWW» en una dirección web?",[".",".",".","."]],
["😂 Internet & Mèmes","facile","Quel réseau social est célèbre pour ses vidéos courtes et son logo en note de musique ?",["TikTok","LinkedIn","Pinterest","Twitch"],"Which social network is famous for short videos and a music-note logo?",[".",".",".","."],"¿Qué red social es famosa por sus vídeos cortos y su logo de nota musical?",[".",".",".","."]],
["😂 Internet & Mèmes","moyen","Quel site permet à tout le monde de rédiger une encyclopédie libre en ligne ?",["Wikipédia","Netflix","Spotify","Amazon"],"Which site lets anyone write a free online encyclopedia?",["Wikipedia","Netflix","Spotify","Amazon"],"¿Qué sitio permite a cualquiera escribir una enciclopedia libre en línea?",["Wikipedia","Netflix","Spotify","Amazon"]],
["🧬 Corps humain","moyen","Combien de dents compte un adulte, dents de sagesse comprises ?",["32","28","30","36"],"How many teeth does an adult have, wisdom teeth included?",[".",".",".","."],"¿Cuántos dientes tiene un adulto, muelas del juicio incluidas?",[".",".",".","."]],
["🧬 Corps humain","difficile","Quel groupe sanguin est donneur universel pour les globules rouges ?",["O négatif","AB positif","A positif","B négatif"],"Which blood type is the universal red-cell donor?",["O negative","AB positive","A positive","B negative"],"¿Qué grupo sanguíneo es donante universal de glóbulos rojos?",["O negativo","AB positivo","A positivo","B negativo"]],
["🧬 Corps humain","facile","Quels organes filtrent le sang pour produire l'urine ?",["Les reins","Le foie","Le cœur","La rate"],"Which organs filter blood to produce urine?",["The kidneys","The liver","The heart","The spleen"],"¿Qué órganos filtran la sangre para producir orina?",["Los riñones","El hígado","El corazón","El bazo"]],
["🏆 Records","moyen","Quel est le plus petit pays du monde ?",["Le Vatican","Monaco","Saint-Marin","Le Liechtenstein"],"What is the smallest country in the world?",["Vatican City","Monaco","San Marino","Liechtenstein"],"¿Cuál es el país más pequeño del mundo?",["El Vaticano","Mónaco","San Marino","Liechtenstein"]],
["🏆 Records","difficile","Quel est le lac le plus profond du monde ?",["Le Baïkal","Le Tanganyika","Le lac Supérieur","Le lac Victoria"],"What is the deepest lake in the world?",["Lake Baikal","Lake Tanganyika","Lake Superior","Lake Victoria"],"¿Cuál es el lago más profundo del mundo?",["El Baikal","El Tanganica","El lago Superior","El lago Victoria"]],
["🏆 Records","facile","Quel est le plus grand oiseau du monde ?",["L'autruche","L'émeu","L'albatros","Le condor"],"What is the largest bird in the world?",["The ostrich","The emu","The albatross","The condor"],"¿Cuál es el ave más grande del mundo?",["El avestruz","El emú","El albatros","El cóndor"]],
["🧳 Voyages","facile","Dans quelle ville se trouve la célèbre tour penchée ?",["Pise","Florence","Rome","Venise"],"In which city is the famous leaning tower?",["Pisa","Florence","Rome","Venice"],"¿En qué ciudad está la famosa torre inclinada?",["Pisa","Florencia","Roma","Venecia"]],
["🧳 Voyages","facile","Quel pays est surnommé « le pays du Soleil-Levant » ?",["Le Japon","La Chine","La Corée du Sud","Le Vietnam"],"Which country is nicknamed 'the Land of the Rising Sun'?",["Japan","China","South Korea","Vietnam"],"¿Qué país es conocido como «el país del Sol Naciente»?",["Japón","China","Corea del Sur","Vietnam"]],
["🧳 Voyages","moyen","Quelle grande ville est traversée par le Bosphore, entre l'Europe et l'Asie ?",["Istanbul","Ankara","Athènes","Sofia"],"Which big city is split by the Bosphorus, between Europe and Asia?",["Istanbul","Ankara","Athens","Sofia"],"¿Qué gran ciudad atraviesa el Bósforo, entre Europa y Asia?",["Estambul","Ankara","Atenas","Sofía"]],
["🎌 Manga & Animation","facile","Dans Dragon Ball, comment s'appelle le héros saiyan élevé sur Terre ?",["Son Goku","Vegeta","Krilin","Piccolo"],"In Dragon Ball, what is the Saiyan hero raised on Earth called?",["Goku",".",".","."],"En Dragon Ball, ¿cómo se llama el héroe saiyajin criado en la Tierra?",["Son Goku",".",".","."]],
["🎌 Manga & Animation","moyen","Dans Naruto, comment s'appelle le village caché du héros ?",["Konoha","Suna","Kiri","Iwa"],"In Naruto, what is the hero's hidden village called?",[".",".",".","."],"En Naruto, ¿cómo se llama la aldea oculta del héroe?",[".",".",".","."]],
["🎌 Manga & Animation","moyen","Dans Death Note, comment s'appelle le dieu de la mort qui accompagne Light ?",["Ryuk","Rem","L","Near"],"In Death Note, what is the shinigami who follows Light called?",[".",".",".","."],"En Death Note, ¿cómo se llama el dios de la muerte que acompaña a Light?",[".",".",".","."]],
["🧪 Inventions","moyen","Qui a mis au point le vaccin contre la rage en 1885 ?",["Louis Pasteur","Marie Curie","Robert Koch","Alexander Fleming"],"Who developed the rabies vaccine in 1885?",[".",".",".","."],"¿Quién desarrolló la vacuna contra la rabia en 1885?",[".",".",".","."]],
["🧪 Inventions","moyen","Quels frères ont inventé le cinématographe en 1895 ?",["Les frères Lumière","Les frères Wright","Les frères Montgolfier","Les frères Grimm"],"Which brothers invented the cinématographe in 1895?",["The Lumière brothers","The Wright brothers","The Montgolfier brothers","The Grimm brothers"],"¿Qué hermanos inventaron el cinematógrafo en 1895?",["Los hermanos Lumière","Los hermanos Wright","Los hermanos Montgolfier","Los hermanos Grimm"]],
["🧪 Inventions","moyen","Quel scientifique a découvert la pénicilline en 1928 ?",["Alexander Fleming","Louis Pasteur","Marie Curie","Edward Jenner"],"Which scientist discovered penicillin in 1928?",[".",".",".","."],"¿Qué científico descubrió la penicilina en 1928?",[".",".",".","."]],
["🦄 Fantasy","moyen","Comment s'appelle le dragon du Hobbit qui garde le trésor d'Erebor ?",["Smaug","Drogon","Norbert","Glaurung"],"What is the dragon guarding Erebor's treasure in The Hobbit called?",[".",".",".","."],"¿Cómo se llama el dragón de El Hobbit que guarda el tesoro de Erebor?",[".",".",".","."]],
["🦄 Fantasy","facile","Dans Harry Potter, quel sport se joue à balai ?",["Le Quidditch","Le Quodpot","Le Gobstones","Le Snap"],"In Harry Potter, which sport is played on broomsticks?",["Quidditch","Quodpot","Gobstones","Exploding Snap"],"En Harry Potter, ¿qué deporte se juega en escoba?",["El quidditch","El quodpot","Las gobstones","El snap explosivo"]],
["🦄 Fantasy","facile","Quel trône forgé avec des épées apparaît dans Game of Thrones ?",["Le Trône de Fer","Le Trône d'Acier","Le Trône de Glace","Le Trône Noir"],"Which throne forged from swords appears in Game of Thrones?",["The Iron Throne","The Steel Throne","The Ice Throne","The Black Throne"],"¿Qué trono forjado con espadas aparece en Juego de Tronos?",["El Trono de Hierro","El Trono de Acero","El Trono de Hielo","El Trono Negro"]],
["🎲 Jeux de société","moyen","Dans quel jeu construit-on routes et colonies sur une île ?",["Catan","Monopoly","Risk","Cluedo"],"In which game do you build roads and settlements on an island?",[".",".",".","."],"¿En qué juego se construyen caminos y poblados en una isla?",[".",".",".","."]],
["🎲 Jeux de société","facile","Au Monopoly, quelle case t'envoie directement en prison ?",["Allez en prison","Départ","Parc gratuit","Chance"],"In Monopoly, which square sends you straight to jail?",["Go to Jail","Go","Free Parking","Chance"],"En el Monopoly, ¿qué casilla te manda directo a la cárcel?",["Ve a la cárcel","Salida","Parking gratuito","Suerte"]],
["🎲 Jeux de société","moyen","Combien de dés utilise-t-on au Yams ?",["5","4","6","3"],"How many dice are used in Yahtzee?",[".",".",".","."],"¿Cuántos dados se usan en el Yahtzee?",[".",".",".","."]],
["🕺 Pop culture","facile","Quel groupe britannique a chanté « Bohemian Rhapsody » ?",["Queen","Oasis","Coldplay","Blur"],"Which British band sang 'Bohemian Rhapsody'?",[".",".",".","."],"¿Qué grupo británico cantó «Bohemian Rhapsody»?",[".",".",".","."]],
["🕺 Pop culture","facile","Quel super-héros est le « Chevalier noir » de Gotham ?",["Batman","Superman","Flash","Aquaman"],"Which superhero is Gotham's 'Dark Knight'?",[".",".",".","."],"¿Qué superhéroe es el «Caballero Oscuro» de Gotham?",[".",".",".","."]],
["🕺 Pop culture","moyen","Comment s'appelle le « Baby Yoda » de la série The Mandalorian ?",["Grogu","Yaddle","Stitch","Alf"],"What is 'Baby Yoda' from The Mandalorian called?",[".",".",".","."],"¿Cómo se llama el «Baby Yoda» de The Mandalorian?",[".",".",".","."]],
["🧛 Légendes & Monstres","moyen","Quelle créature a le corps d'un lion et la tête et les ailes d'un aigle ?",["Le griffon","La chimère","Le sphinx","L'hydre"],"Which creature has a lion's body and an eagle's head and wings?",["The griffin","The chimera","The sphinx","The hydra"],"¿Qué criatura tiene cuerpo de león y cabeza y alas de águila?",["El grifo","La quimera","La esfinge","La hidra"]],
["🧛 Légendes & Monstres","facile","Quel monstre grec pétrifie ceux qui croisent son regard ?",["Méduse","Cerbère","L'hydre","Le Minotaure"],"Which Greek monster turns onlookers to stone?",["Medusa","Cerberus","The Hydra","The Minotaur"],"¿Qué monstruo griego convierte en piedra a quien lo mira?",["Medusa","Cerbero","La hidra","El Minotauro"]],
["🧛 Légendes & Monstres","moyen","Comment s'appelle le chien à trois têtes qui garde les Enfers ?",["Cerbère","Fenrir","Anubis","Garm"],"What is the three-headed dog guarding the Underworld called?",["Cerberus","Fenrir","Anubis","Garm"],"¿Cómo se llama el perro de tres cabezas que guarda el Inframundo?",["Cerbero","Fenrir","Anubis","Garm"]]
];
const PACK_BASE=[
["🍕 Cuisine","facile","De quel pays vient le sushi ?",["Le Japon","La Chine","La Corée","La Thaïlande"],"Which country does sushi come from?",["Japan","China","Korea","Thailand"],"¿De qué país procede el sushi?",["Japón","China","Corea","Tailandia"]],
["🍕 Cuisine","facile","Quel fromage garnit traditionnellement une pizza Margherita ?",["La mozzarella","Le roquefort","Le cheddar","Le comté"],"Which cheese traditionally tops a Margherita pizza?",["Mozzarella","Roquefort","Cheddar","Comté"],"¿Qué queso lleva tradicionalmente una pizza Margarita?",["Mozzarella","Roquefort","Cheddar","Comté"]],
["🍕 Cuisine","facile","Quel fruit est l'ingrédient principal du guacamole ?",["L'avocat","La tomate","Le concombre","La mangue"],"Which fruit is the main ingredient of guacamole?",["Avocado","Tomato","Cucumber","Mango"],"¿Qué fruta es el ingrediente principal del guacamole?",["El aguacate","El tomate","El pepino","El mango"]],
["⚽ Sport","moyen","Combien de joueurs composent une équipe de volley-ball sur le terrain ?",["6","5","7","8"],"How many players make up a volleyball team on court?",[".",".",".","."],"¿Cuántos jugadores forman un equipo de voleibol en la cancha?",[".",".",".","."]],
["⚽ Sport","facile","Dans quel sport utilise-t-on un volant ?",["Le badminton","Le tennis","Le squash","Le ping-pong"],"In which sport is a shuttlecock used?",["Badminton","Tennis","Squash","Table tennis"],"¿En qué deporte se usa un volante (gallito)?",["El bádminton","El tenis","El squash","El tenis de mesa"]],
["⚽ Sport","moyen","Quel pays a remporté la Coupe du monde de football en 2018 ?",["La France","La Croatie","La Belgique","Le Brésil"],"Which country won the 2018 football World Cup?",["France","Croatia","Belgium","Brazil"],"¿Qué país ganó la Copa del Mundo de fútbol de 2018?",["Francia","Croacia","Bélgica","Brasil"]],
["🧠 Culture générale","facile","Combien de couleurs compte l'arc-en-ciel classique ?",["7","5","6","8"],"How many colours does the classic rainbow have?",[".",".",".","."],"¿Cuántos colores tiene el arcoíris clásico?",[".",".",".","."]],
["🧠 Culture générale","facile","Quel est le plus grand mammifère terrestre ?",["L'éléphant d'Afrique","La girafe","Le rhinocéros","L'hippopotame"],"What is the largest land mammal?",["The African elephant","The giraffe","The rhinoceros","The hippopotamus"],"¿Cuál es el mamífero terrestre más grande?",["El elefante africano","La jirafa","El rinoceronte","El hipopótamo"]],
["🧠 Culture générale","facile","Dans quelle ville se trouve la tour Eiffel ?",["Paris","Lyon","Bordeaux","Lille"],"In which city is the Eiffel Tower?",["Paris",".",".","."],"¿En qué ciudad está la Torre Eiffel?",["París",".",".","."]],
["🎨 Art","facile","Qui a peint La Joconde ?",["Léonard de Vinci","Michel-Ange","Raphaël","Botticelli"],"Who painted the Mona Lisa?",["Leonardo da Vinci","Michelangelo","Raphael","Botticelli"],"¿Quién pintó la Mona Lisa (La Gioconda)?",["Leonardo da Vinci","Miguel Ángel","Rafael","Botticelli"]],
["🎨 Art","facile","Qui a peint La Nuit étoilée ?",["Vincent van Gogh","Claude Monet","Pablo Picasso","Salvador Dalí"],"Who painted The Starry Night?",[".",".",".","."],"¿Quién pintó La noche estrellada?",[".",".",".","."]],
["🎨 Art","moyen","Quel artiste est célèbre pour ses montres molles ?",["Salvador Dalí","Joan Miró","Paul Klee","René Magritte"],"Which artist is famous for his melting watches?",[".",".",".","."],"¿Qué artista es famoso por sus relojes blandos?",[".",".",".","."]],
["🎵 Musique","facile","Combien de cordes possède une guitare classique ?",["6","4","5","7"],"How many strings does a classical guitar have?",[".",".",".","."],"¿Cuántas cuerdas tiene una guitarra clásica?",[".",".",".","."]],
["🎵 Musique","facile","Quel groupe est composé de John, Paul, George et Ringo ?",["Les Beatles","Les Rolling Stones","Queen","Pink Floyd"],"Which band is made up of John, Paul, George and Ringo?",["The Beatles","The Rolling Stones","Queen","Pink Floyd"],"¿Qué grupo está formado por John, Paul, George y Ringo?",["The Beatles","The Rolling Stones","Queen","Pink Floyd"]],
["🎵 Musique","moyen","Quel instrument est associé à Jimi Hendrix ?",["La guitare électrique","Le saxophone","La batterie","Le piano"],"Which instrument is associated with Jimi Hendrix?",["The electric guitar","The saxophone","The drums","The piano"],"¿Qué instrumento se asocia a Jimi Hendrix?",["La guitarra eléctrica","El saxofón","La batería","El piano"]],
["🎬 Cinéma","facile","Quel film raconte le naufrage d'un paquebot en 1912, avec Leonardo DiCaprio ?",["Titanic","Avatar","Gladiator","Inception"],"Which film tells of an ocean liner sinking in 1912, starring Leonardo DiCaprio?",[".",".",".","."],"¿Qué película cuenta el naufragio de un transatlántico en 1912, con Leonardo DiCaprio?",[".",".",".","."]],
["🎬 Cinéma","moyen","Qui a réalisé Jurassic Park en 1993 ?",["Steven Spielberg","James Cameron","George Lucas","Ridley Scott"],"Who directed Jurassic Park in 1993?",[".",".",".","."],"¿Quién dirigió Parque Jurásico en 1993?",[".",".",".","."]],
["🎬 Cinéma","facile","Quel film d'animation met en scène un poisson-clown nommé Nemo ?",["Le Monde de Nemo","Shrek","Cars","Ratatouille"],"Which animated film stars a clownfish named Nemo?",["Finding Nemo","Shrek","Cars","Ratatouille"],"¿Qué película de animación tiene un pez payaso llamado Nemo?",["Buscando a Nemo","Shrek","Cars","Ratatouille"]]
];
function add(pack){
const en=LANG_PACKS.en.rows,es=LANG_PACKS.es.rows;
pack.forEach(r=>{
const idx=QUESTIONS.length;
const same=(base,tr)=>base.map((a,i)=>tr[i]==="."||tr[i]===undefined?a:tr[i]);
QUESTIONS.push({difficulty:r[1],category:r[0],question:r[2],answers:r[3],correct:0});
while(en.length<idx)en.push(null);
while(es.length<idx)es.push(null);
en[idx]=[r[4],same(r[3],r[5])];
es[idx]=[r[6],same(r[3],r[7])];
});
}
add(PACK_FUN);
if(window.__HAS_BASE_THEMES)add(PACK_BASE);
})();
