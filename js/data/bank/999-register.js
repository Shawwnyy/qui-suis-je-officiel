/* Enregistre toutes les questions de la banque dans QUESTIONS */
(function(){const L={f:"facile",m:"moyen",d:"difficile",i:"impossible"};let n=0;
Object.keys(V35_BANK).forEach(cat=>{V35_BANK[cat].forEach(s=>{const p=s.split("|");if(p.length!==6)return;QUESTIONS.push({category:cat,difficulty:L[p[0]]||"moyen",question:p[1],answers:[p[2],p[3],p[4],p[5]],correct:0,source:"officiel",v35:true});n++;});});
window.V35_COUNT=n;})();
