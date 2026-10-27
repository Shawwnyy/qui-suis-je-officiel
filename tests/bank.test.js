/* Vérifie la banque de questions : format, doublons, longueurs.  Lancer :  node tests/bank.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "js", "data", "bank");
global.V35_BANK = {};
let bad = 0;
const fail = (m) => { bad++; console.log("ÉCHEC " + m); };
const files = fs.readdirSync(dir).filter(f => /^\d+-.*\.js$/.test(f) && !/^(000|999)-/.test(f)).sort();
files.forEach(f => { try { new Function(fs.readFileSync(path.join(dir, f), "utf8")).call(global); } catch (e) { fail(f + " : " + e.message); } });
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const seen = new Map();
let total = 0;
const newOnly = process.argv[2] ? new RegExp(process.argv[2]) : null;
Object.keys(V35_BANK).forEach(cat => {
  const arr = V35_BANK[cat];
  const counts = { f: 0, m: 0, d: 0, i: 0 };
  arr.forEach((line, i) => {
    total++;
    const p = String(line).split("|"), at = cat + " #" + (i + 1);
    if (p.length !== 6) { fail(at + " : " + p.length + " champs : " + line.slice(0, 80)); return; }
    if (!/^[fmdi]$/.test(p[0])) fail(at + " : difficulté invalide « " + p[0] + " »");
    else counts[p[0]]++;
    const [, q, good, ...wr] = p, all = [good, ...wr];
    if (q.length < 8 || q.length > 220) fail(at + " : longueur de la question " + q.length);
    all.forEach(a => { if (!a.trim()) fail(at + " : réponse vide"); if (a.length > 120) fail(at + " : réponse trop longue"); });
    const set = new Set(all.map(a => a.toLowerCase().replace(/\s+/g, " ").trim()));
    if (set.size !== 4) fail(at + " : réponses identiques : " + all.join(" / "));
    if (/["<>]/.test(line.replace(/^[^|]*\|/, "")) && /[<>]/.test(line)) fail(at + " : caractère < ou > : " + q.slice(0, 60));
    const k = norm(q);
    if (seen.has(k) && (!newOnly || newOnly.test(cat) || newOnly.test(seen.get(k)))) fail(at + " : doublon de « " + seen.get(k) + " » : " + q.slice(0, 70));
    else if (!seen.has(k)) seen.set(k, cat);
    if (!/[?:.!…»)]$|\.\.\.$/.test(q.trim()) && !/_/.test(q)) { /* les questions sans ponctuation finale sont tolérées */ }
  });
  if (newOnly && newOnly.test(cat)) console.log(cat.padEnd(42) + String(arr.length).padStart(4) + "  f" + counts.f + " m" + counts.m + " d" + counts.d + " i" + counts.i);
});
console.log("\n" + files.length + " fichiers, " + Object.keys(V35_BANK).length + " thèmes, " + total + " questions, " + bad + " problème(s).");
process.exit(bad ? 1 : 0);
