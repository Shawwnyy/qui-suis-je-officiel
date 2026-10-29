/* 📚 Thèmes de cours à part (js/patches/054-v60-cours-prives.js)   node tests/course.test.js */
const V = require("../js/patches/054-v60-cours-prives.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const rec = (id, category) => ({ id, category });
const Q = (category, source) => ({ category, source });

t("isCourseId : « qcm… » oui ; autres identifiants, vides et non-textes non", V.isCourseId("qcmabc") && !V.isCourseId("x1") && !V.isCourseId("") && !V.isCourseId(null) && !V.isCourseId(42) && !V.isCourseId("Qcm1"));
t("courseCats : un thème dont tous les enregistrements viennent d'un cours", JSON.stringify(V.courseCats([rec("qcm1", "📄 Induction"), rec("qcm2", "📄 Induction")], [Q("📄 Induction", "perso"), Q("🍳 Cuisine")])) === JSON.stringify(["📄 Induction"]));
t("courseCats : un thème perso créé à la main n'est pas un cours", V.courseCats([rec("m1", "⭐ Mes questions")], [Q("⭐ Mes questions", "perso")]).length === 0);
t("courseCats : thème mixte (cours + main) → pas un cours", V.courseCats([rec("qcm1", "📄 Mix"), rec("m2", "📄 Mix")], []).length === 0);
t("courseCats : même nom qu'un thème officiel → pas un cours (on ne cache jamais un thème officiel)", V.courseCats([rec("qcm1", "🍳 Cuisine")], [Q("🍳 Cuisine")]).length === 0);
t("courseCats : plusieurs cours, un seul enregistrement chacun, sans doublon", JSON.stringify(V.courseCats([rec("qcm1", "A"), rec("qcm2", "B"), rec("qcm3", "A")], [])) === JSON.stringify(["A", "B"]));
t("courseCats : entrées invalides ignorées, sans exception", V.courseCats([null, 5, {}, { id: "qcm1" }, { id: "qcm2", category: "" }, { id: "qcm3", category: 7 }], [null, 3, {}]).length === 0 && V.courseCats(null, null).length === 0 && V.courseCats("x", {}).length === 0);
t("list : nom et nombre de questions de chaque cours", JSON.stringify(V.list([rec("qcm1", "A"), rec("qcm2", "A"), rec("qcm3", "B")], [])) === JSON.stringify([{ category: "A", count: 2 }, { category: "B", count: 1 }]));
t("list : ne compte pas les questions écrites à la main d'un thème mixte (thème exclu)", V.list([rec("qcm1", "A"), rec("m1", "A")], []).length === 0);
t("hiddenSet : tous les cours sont cachés par défaut", JSON.stringify(Object.keys(V.hiddenSet([rec("qcm1", "A"), rec("qcm2", "B")], [], null)).sort()) === JSON.stringify(["A", "B"]));
t("hiddenSet : un cours dévoilé n'est plus caché, l'autre reste caché", JSON.stringify(Object.keys(V.hiddenSet([rec("qcm1", "A"), rec("qcm2", "B")], [], { A: 1 }))) === JSON.stringify(["B"]));
t("hiddenSet : dévoiler un thème qui n'est pas un cours ne change rien", Object.keys(V.hiddenSet([rec("qcm1", "A")], [], { Z: 1 })).join() === "A");
t("filterCats : retire les thèmes cachés, garde l'ordre des autres", JSON.stringify(V.filterCats(["x", "A", "y"], { A: 1 })) === JSON.stringify(["x", "y"]));
t("filterCats : entrée invalide → liste vide", V.filterCats(null, {}).length === 0);
t("filterPool : retire les questions des thèmes cachés", JSON.stringify(V.filterPool([Q("A"), Q("x"), Q("A"), Q("y")], { A: 1 }).map(q => q.category)) === JSON.stringify(["x", "y"]));
t("filterPool : tolère les entrées nulles et un pool qui n'est pas une liste", V.filterPool([null, Q("x")], { A: 1 }).length === 2 && V.filterPool("z", {}) === "z");
t("pas de cours enregistré : rien n'est caché", Object.keys(V.hiddenSet([], [Q("x")], null)).length === 0);

const fs = require("fs"), path = require("path"), idx = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
t("index.html : le module est chargé après les derniers correctifs de tirage (051) et d'écran (053)", idx.indexOf("054-v60-cours-prives.js") > idx.indexOf("053-v59-pronostic.js") && idx.indexOf("054-v60-cours-prives.js") > idx.indexOf("051-v58-extras.js"));
const ui = fs.readFileSync(path.join(__dirname, "../js/qcm/ui.js"), "utf8");
t("l'écran des cours dévoile le thème avant de créer la salle, et le recache si la salle n'a pas pu s'ouvrir", /V60CourseUI\.reveal\(cat\)/.test(ui) && (ui.match(/V60CourseUI\.hideAll\(\)/g) || []).length >= 2 && /data-qcm="replaymulti"/.test(ui));
console.log("Thèmes de cours à part : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
