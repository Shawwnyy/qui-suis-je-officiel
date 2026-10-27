/* Extrait de l'ancien index.html : <script id="v163-patch"> */
(function V163(){
"use strict";
const MODE_INFO={
individual:{icon:"👤",name:"Individuel classique",desc:"Chacun joue pour son propre score. Bonus personnels uniquement, aucun malus contre les autres.",tag:"Sans attaque"},
ffa:{icon:"⚔️",name:"Chacun pour soi",desc:"Tous les joueurs sont adversaires. Bonus et malus peuvent viser n’importe quel autre joueur.",tag:"Attaques activées"},
teams:{icon:"👥",name:"Équipes",desc:"Les scores des membres sont additionnés. Les malus ne peuvent viser que les équipes adverses.",tag:"Score collectif"},
soloHost:{icon:"🛡️",name:"L’hôte contre tout le monde",desc:"L’hôte constitue un camp, tous les autres joueurs constituent ensemble le camp adverse.",tag:"1 contre tous"},
duel:{icon:"🤺",name:"Duel",desc:"Mode réservé à exactement deux joueurs. Face-à-face avec bonus et malus directs.",tag:"2 joueurs"},
coop:{icon:"🤝",name:"Coopération",desc:"Tout le monde partage un objectif commun. Aucun malus entre joueurs, le score final est la somme de tous les scores.",tag:"Tous ensemble"},
survival:{icon:"💀",name:"Survie",desc:"À partir de la troisième question, une erreur retire 500 points supplémentaires. Le meilleur survivant gagne.",tag:"Erreurs sévères"},
king:{icon:"👑",name:"Roi de la partie",desc:"Le joueur en tête devient la cible prioritaire. Une bonne réponse du leader vaut 85 %, celle des poursuivants vaut 115 %.",tag:"Retour possible"}
};
window.v163ModeInfo=MODE_INFO;
function modeLabel163(m){const x=MODE_INFO[m]||MODE_INFO.individual;return x.icon+" "+x.name;}
function rebuildModes(){
const box=document.getElementById("v9ModeBox");if(!box)return;const grid=box.querySelector(".v9-mode-grid");if(!grid||grid.dataset.v163)return;grid.dataset.v163="1";grid.replaceChildren();
Object.entries(MODE_INFO).forEach(([id,x])=>{const b=document.createElement("button");b.type="button";b.className="v9-mode-card";b.dataset.mode=id;b.innerHTML='<b>'+x.icon+' '+x.name+'</b><span>'+x.desc+'</span><em class="v163-mode-tag">'+x.tag+'</em>';b.onclick=()=>window.setGameModeV9(id,true);grid.appendChild(b);});
let rules=document.getElementById("v163ModeRules");if(!rules){rules=document.createElement("div");rules.id="v163ModeRules";rules.className="v163-mode-rules";box.appendChild(rules);}selectMode(window.v9GameMode||"individual",false);
}
const oldSetMode=window.setGameModeV9;
function selectMode(mode,broadcastIt){
if(!MODE_INFO[mode])mode="individual";window.v9GameMode=mode;document.querySelectorAll('#v9ModeBox [data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));const mgr=document.getElementById('v9TeamManager');if(mgr)mgr.classList.toggle('hidden',mode!=="teams");const r=document.getElementById('v163ModeRules');if(r)r.innerHTML='<b>'+modeLabel163(mode)+'</b><br>'+MODE_INFO[mode].desc;
try{saveCurrentGameSnapshot();}catch(e){}if(broadcastIt&&isHost)broadcast({type:"v9Config",mode,teams:window.v9Teams||{}});
}
window.setGameModeV9=selectMode;
const oldModeHandle=handleData;handleData=function(data){if(data?.type==="v9Config"&&data.mode&&MODE_INFO[data.mode]){window.v9GameMode=data.mode;setTimeout(()=>selectMode(data.mode,false),0);}return oldModeHandle(data);};
const oldRequest=requestStartGame;requestStartGame=function(){if(isHost&&window.v9GameMode==="duel"&&Object.keys(players).length!==2){showBanner("🤺 Le mode Duel exige exactement 2 joueurs.");return;}return oldRequest();};
const scoreMode=applyScoreFx;applyScoreFx=function(p,pts,data){let g=scoreMode(p,pts,data);if(window.v9GameMode==="king"){const top=Math.max(...Object.values(players).map(x=>Number(x.score||0)));g=Math.round(g*((p.score||0)>=top&&top>0?.85:1.15));}return g;};
const wrongMode=onWrongFx;onWrongFx=function(p){wrongMode(p);if(window.v9GameMode==="survival"&&currentQuestionIndex>=2){p.score=Math.max(0,(p.score||0)-500);p.malusPoints=(p.malusPoints||0)+500;}};
const powerModalMode=openPowerModal;openPowerModal=function(level,token){powerModalMode(level,token);const malus=document.querySelector('#powerModal .power-card.malus');const noAttack=["individual","coop"].includes(window.v9GameMode);if(malus)malus.style.display=noAttack?"none":"";const bonus=document.querySelector('#powerModal .power-card.bonus');if(bonus)bonus.style.gridColumn=noAttack?"1 / -1":"";const sel=document.getElementById('malusTarget');if(sel&&!noAttack){[...sel.options].forEach(o=>{if(!o.value)return;const target=players[o.value],me=players[myId];let allowed=true;if(window.v9GameMode==="teams")allowed=!!target&&target.team!==me?.team;if(window.v9GameMode==="soloHost")allowed=!!target&&!!me&&target.host!==me.host;o.disabled=!allowed;});const first=[...sel.options].find(o=>o.value&&!o.disabled);if(first)sel.value=first.value;}};
/* Sélecteur de thèmes entièrement isolé des anciens gestionnaires. */
let selected=new Set();let themesReady=false;
function availableCategories(){return [...new Set(getCategories())].filter(c=>QUESTIONS.some(q=>q.category===c));}
function initialSelection(){const old=[...document.querySelectorAll('#themeGrid input:checked')].map(x=>x.value);return new Set(old.length?old:availableCategories());}
function syncThemes(){selectedThemes=[...selected];const info=document.getElementById('selectedThemesInfo');if(info)info.textContent=selected.size?"🎯 "+selected.size+" thème(s) sélectionné(s).":"⚠️ Aucun thème sélectionné.";let state=document.getElementById('v163SelectionState');if(!state){state=document.createElement('div');state.id='v163SelectionState';state.className='v163-selection-state';document.getElementById('themeGrid')?.before(state);}if(state)state.textContent="Sélection active : "+selected.size+" / "+availableCategories().length+" thèmes";}
function renderThemes(){
const grid=document.getElementById('themeGrid');if(!grid)return;if(!themesReady){selected=initialSelection();themesReady=true;}const cats=availableCategories();grid.replaceChildren();grid.className='theme-grid v163-themes';
cats.forEach((cat,i)=>{const w=document.createElement('div');w.className='v163-theme';const input=document.createElement('input');input.type='checkbox';input.id='v163-theme-'+i;input.value=cat;input.checked=selected.has(cat);input.disabled=!QUESTIONS.some(q=>q.category===cat&&hasTranslation(q,questionLang));const label=document.createElement('label');label.htmlFor=input.id;label.textContent=categoryLabel(cat,questionLang);label.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(input.disabled)return;if(selected.has(cat))selected.delete(cat);else selected.add(cat);input.checked=selected.has(cat);syncThemes();},{capture:true});w.append(input,label);grid.appendChild(w);});syncThemes();
}
window.buildThemeSelector=renderThemes;
window.updateSelectedThemes=function(){document.querySelectorAll('#themeGrid .v163-theme input').forEach(i=>i.checked=selected.has(i.value));syncThemes();};
window.randomThemes=function(count=6){const cats=availableCategories().filter(c=>QUESTIONS.some(q=>q.category===c&&hasTranslation(q,questionLang)));selected.clear();shuffle(cats).slice(0,Math.min(count,cats.length)).forEach(c=>selected.add(c));renderThemes();};
function replacePresets(){document.querySelectorAll('.v10-theme-presets').forEach(old=>{const n=old.cloneNode(true);old.replaceWith(n);n.querySelectorAll('button').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();const cats=availableCategories().filter(c=>QUESTIONS.some(q=>q.category===c&&hasTranslation(q,questionLang)));selected.clear();if(b.dataset.preset==='one'&&cats.length)selected.add(cats[Math.floor(Math.random()*cats.length)]);if(b.dataset.preset==='all')cats.forEach(c=>selected.add(c));renderThemes();});});}
const lang163=onQuestionLangChange;onQuestionLangChange=function(){lang163();renderThemes();};
const start163=startGame;startGame=function(){selectedThemes=[...selected];return start163();};
function boot(){rebuildModes();if(!document.querySelector('#themeGrid .v163-theme'))renderThemes();if(!document.querySelector('.v10-theme-presets')?.dataset.v163){replacePresets();document.querySelector('.v10-theme-presets')?.setAttribute('data-v163','1');}document.title="Qui suis-je ? 🎮 — V17";}
const screen163=showScreen;showScreen=function(id){const r=screen163(id);setTimeout(boot,0);return r;};setTimeout(boot,0);setInterval(()=>{rebuildModes();if(document.getElementById('themeGrid')&&!document.querySelector('#themeGrid .v163-theme'))renderThemes();},1500);
console.log("V17 : modes réellement distincts et sélection des thèmes isolée.");
})();
