/* Extrait de l'ancien index.html : <script id="v21-languages-patch"> */
(function V21LanguagesTranslations(){
"use strict";
const LANGUAGE_QUESTIONS=[
["🇩🇪 Allemand → Français","facile","Comment traduit-on « Haus » en français ?",["Maison","École","Voiture","Jardin"]],
["🇩🇪 Allemand → Français","moyen","Comment traduit-on « verstehen » en français ?",["Comprendre","Répondre","Choisir","Attendre"]],
["🇩🇪 Allemand → Français","difficile","Comment traduit-on « trotzdem » en français ?",["Malgré cela","Autrefois","Immédiatement","Rarement"]],
["🇫🇷 Français → Allemand","facile","Comment traduit-on « merci » en allemand ?",["Danke","Bitte","Hallo","Tschüss"]],
["🇫🇷 Français → Allemand","moyen","Comment traduit-on « apprendre » en allemand ?",["Lernen","Fahren","Schlafen","Kaufen"]],
["🇫🇷 Français → Allemand","difficile","Comment traduit-on « cependant » en allemand ?",["Jedoch","Gestern","Vielleicht","Niemals"]],
["🇮🇹 Italien → Français","facile","Comment traduit-on « casa » en français ?",["Maison","Chaise","Porte","Route"]],
["🇮🇹 Italien → Français","moyen","Comment traduit-on « scegliere » en français ?",["Choisir","Dormir","Manger","Oublier"]],
["🇮🇹 Italien → Français","difficile","Comment traduit-on « tuttavia » en français ?",["Toutefois","Toujours","Ensemble","Dessous"]],
["🇫🇷 Français → Italien","facile","Comment traduit-on « bonjour » en italien ?",["Buongiorno","Buonanotte","Grazie","Prego"]],
["🇫🇷 Français → Italien","moyen","Comment traduit-on « fenêtre » en italien ?",["Finestra","Porta","Strada","Sedia"]],
["🇫🇷 Français → Italien","difficile","Comment traduit-on « se rendre compte » en italien ?",["Rendersi conto","Fare presto","Avere fame","Andare via"]],
["🇵🇹 Portugais → Français","facile","Comment traduit-on « livro » en français ?",["Livre","Stylo","Arbre","Verre"]],
["🇵🇹 Portugais → Français","moyen","Comment traduit-on « esquecer » en français ?",["Oublier","Écrire","Écouter","Emprunter"]],
["🇵🇹 Portugais → Français","difficile","Comment traduit-on « embora » en français selon le contexte ?",["Bien que","Depuis","Ensuite","Partout"]],
["🇫🇷 Français → Portugais","facile","Comment traduit-on « eau » en portugais ?",["Água","Fogo","Terra","Vento"]],
["🇫🇷 Français → Portugais","moyen","Comment traduit-on « travailler » en portugais ?",["Trabalhar","Viajar","Dormir","Fechar"]],
["🇫🇷 Français → Portugais","difficile","Comment traduit-on « pourtant » en portugais ?",["No entanto","De repente","Ao lado","Desde ontem"]],
["🇬🇧 Anglais → Espagnol","facile","Comment traduit-on « book » en espagnol ?",["Libro","Mesa","Puerta","Calle"]],
["🇬🇧 Anglais → Espagnol","moyen","Comment traduit-on « to learn » en espagnol ?",["Aprender","Vender","Cerrar","Romper"]],
["🇬🇧 Anglais → Espagnol","difficile","Comment traduit-on « however » en espagnol ?",["Sin embargo","Por supuesto","A menudo","De pronto"]],
["🇪🇸 Espagnol → Anglais","facile","Comment traduit-on « perro » en anglais ?",["Dog","Cat","Horse","Bird"]],
["🇪🇸 Espagnol → Anglais","moyen","Comment traduit-on « mejorar » en anglais ?",["To improve","To forget","To borrow","To wait"]],
["🇪🇸 Espagnol → Anglais","difficile","Comment traduit-on « darse cuenta » en anglais ?",["To realise","To give away","To come back","To slow down"]],
["🌐 Vocabulaire multilingue","facile","Quel mot signifie « bonjour » en espagnol ?",["Hola","Gracias","Adiós","Noche"]],
["🌐 Vocabulaire multilingue","moyen","Dans quelle langue « grazie » signifie-t-il « merci » ?",["Italien","Allemand","Portugais","Néerlandais"]],
["🌐 Vocabulaire multilingue","difficile","Quel mot portugais signifie « aujourd'hui » ?",["Hoje","Ontem","Amanhã","Sempre"]],
["💬 Expressions étrangères","facile","Que signifie l'expression anglaise « See you soon » ?",["À bientôt","Bonne nuit","Je ne sais pas","Bienvenue"]],
["💬 Expressions étrangères","moyen","Que signifie l'expression espagnole « No pasa nada » ?",["Ce n'est pas grave","Il est trop tard","Je suis perdu","Tout est fermé"]],
["💬 Expressions étrangères","difficile","Que signifie l'expression allemande « Es kommt darauf an » ?",["Cela dépend","C'est terminé","Je suis d'accord","Il faut partir"]]
];
const addedCats=[];
LANGUAGE_QUESTIONS.forEach(row=>{
if(QUESTIONS.some(q=>q.category===row[0]&&q.question===row[2]))return;
QUESTIONS.push({difficulty:row[1],category:row[0],question:row[2],answers:row[3],correct:0,v21Language:true});
if(!addedCats.includes(row[0]))addedCats.push(row[0]);
});
const oldTranslated=hasTranslation;
hasTranslation=function(q,lang){if(q&&q.v21Language)return true;return oldTranslated(q,lang);};
const oldLocalize=localizeQuestion;
localizeQuestion=function(q,lang){if(q&&q.v21Language)return q;return oldLocalize(q,lang);};
const oldCategories=getCategories;
getCategories=function(){return [...new Set([...oldCategories(),...addedCats])].filter(cat=>QUESTIONS.some(q=>q.category===cat));};
function addInfo(){
const host=document.getElementById("hostSettings");
if(!host||document.getElementById("v21LanguageNote"))return;
const note=document.createElement("div");note.id="v21LanguageNote";note.className="v21-language-note";
note.innerHTML="<b>🌍 V21 Langues et traductions</b><br>Ajout de 10 thèmes linguistiques et 30 questions : allemand, italien, portugais, anglais et espagnol, dans les deux sens, avec vocabulaire et expressions étrangères.";
const grid=document.getElementById("themeGrid");if(grid)grid.before(note);else host.appendChild(note);
}
function refresh(){
if(document.getElementById("themeGrid")&&!document.querySelector('#themeGrid input[value="🇩🇪 Allemand → Français"]'))buildThemeSelector();
addInfo();document.title="Qui suis-je ? 🎮 — V21 Langues et traductions";
}
const oldShow=showScreen;showScreen=function(id){const r=oldShow(id);setTimeout(refresh,0);return r;};
setTimeout(refresh,80);
console.log("V21 Langues : 10 thèmes de traduction et 30 questions ajoutés.");
})();
