/* Images du cours : matrices, filtres, fusion des tuiles, logos répétés, recherche de la page d'une phrase, association aux questions. */
const I = require("../js/qcm/images.js");
let n = 0, bad = 0;
function ok(c, msg) { n++; if (!c) { bad++; console.log("ÉCHEC", msg); } }
const OPS = { save: 10, restore: 11, transform: 12, paintFormXObjectBegin: 74, paintFormXObjectEnd: 75, paintImageXObject: 85, paintInlineImageXObject: 86 };

/* Matrices : même sens que ctx.transform */
ok(JSON.stringify(I.mul([2, 0, 0, 2, 10, 20], [1, 0, 0, 1, 5, 5])) === JSON.stringify([2, 0, 0, 2, 20, 30]), "translation puis échelle composées");
const r0 = I.rectOf([200, 0, 0, 100, 50, 300]); ok(r0.x === 50 && r0.y === 300 && r0.w === 200 && r0.h === 100, "rectangle d'une image 200×100 posée en (50,300)");
const rr = I.rectOf([0, 100, -200, 0, 300, 0]); ok(Math.abs(rr.w - 200) < 1e-9 && Math.abs(rr.h - 100) < 1e-9 && Math.abs(rr.x - 100) < 1e-9, "image tournée de 90° : rectangle correct");

/* Parcours des opérations : pile save/restore, formulaires imbriqués */
const fn = [OPS.save, OPS.transform, OPS.paintImageXObject, OPS.restore, OPS.save, OPS.paintFormXObjectBegin, OPS.transform, OPS.paintImageXObject, OPS.paintFormXObjectEnd, OPS.restore, OPS.paintImageXObject];
const ar = [null, [100, 0, 0, 50, 10, 20], ["img1", 640, 400], null, null, [[1, 0, 0, 1, 100, 100], null], [50, 0, 0, 50, 0, 0], ["img2", 300, 300], null, null, ["img3", 10, 10]];
const f = I.imagesFromOps(fn, ar, OPS);
ok(f.length === 3, "3 images trouvées (" + f.length + ")");
ok(f[0].m.join() === [100, 0, 0, 50, 10, 20].join() && f[0].w === 640, "image 1 : matrice et taille");
ok(f[1].m.join() === [50, 0, 0, 50, 100, 100].join(), "image 2 : matrice du formulaire composée avec la transformation");
ok(f[2].m.join() === [1, 0, 0, 1, 0, 0].join(), "image 3 : pile restaurée après restore");
ok(I.imagesFromOps(null, null, OPS).length === 0 && I.imagesFromOps([OPS.restore, OPS.restore], [null, null], OPS).length === 0, "entrées vides ou restore en trop : pas d'erreur");
ok(I.imagesFromOps([OPS.transform, OPS.paintImageXObject], [[NaN, 0, 0, 1, 0, 0], ["x", 9, 9]], OPS)[0].m.join() === [1, 0, 0, 1, 0, 0].join(), "matrice invalide ignorée");

/* Filtres : vraies figures seulement (page A4 = 595×842) */
const K = (w, h, px) => I.keepRect({ x: 0, y: 0, w: w, h: h }, 595, 842, px);
ok(K(300, 200, { w: 640, h: 400 }), "figure 300×200 pt conservée");
ok(!K(20, 20), "icône refusée"); ok(!K(400, 3), "filet refusé"); ok(!K(590, 830), "fond de page refusé");
ok(!K(300, 200, { w: 30, h: 20 }), "image de 30×20 pixels refusée"); ok(!K(600, 50), "bandeau 12:1 refusé"); ok(!K(NaN, 100), "NaN refusé");

/* Fusion des bandes d'une même figure ; deux figures éloignées restent séparées */
const tiles = I.mergeRects([{ x: 50, y: 400, w: 300, h: 100 }, { x: 50, y: 500, w: 300, h: 100 }, { x: 50, y: 600, w: 300, h: 100 }]);
ok(tiles.length === 1 && tiles[0].h === 300 && tiles[0].w === 300, "3 bandes fusionnées en une figure");
ok(I.mergeRects([{ x: 0, y: 0, w: 100, h: 100 }, { x: 400, y: 600, w: 100, h: 100 }]).length === 2, "deux figures éloignées restent séparées");

/* Logos répétés */
const h1 = "0".repeat(32) + "1".repeat(32), h2 = "10".repeat(32), h3 = "11110000".repeat(8);
const list = [{ page: 0, hash: h1, score: 5 }, { page: 1, hash: h1, score: 5 }, { page: 2, hash: h1, score: 5 }, { page: 3, hash: h1, score: 5 },   /* logo sur 4 pages : écarté */
  { page: 0, hash: h2, score: 9 }, { page: 4, hash: h2, score: 9 },                                                                                      /* 2 pages : première gardée */
  { page: 1, hash: h3, score: 7 }];
const d = I.dedupe(list);
ok(d.length === 2 && !d.some(x => x.hash === h1) && d.filter(x => x.hash === h2).length === 1 && d.find(x => x.hash === h2).page === 0 && d.some(x => x.hash === h3), "logo sur 4 pages écarté, image sur 2 pages gardée une fois : " + d.length);
ok(I.hamming("0101", "0111") === 1 && I.hamming("01", "011") === 99 && I.hamming(null, "01") === 99, "distance de Hamming");

/* Page d'une phrase */
const pages = ["Le principe de fonctionnement repose sur les courants de Foucault dans le récipient.", "Un onduleur transforme la tension du secteur en courant haute fréquence pour la bobine.", "Rien à voir ici."];
const norms = pages.map(I.norm);
ok(I.locatePage("Un onduleur transforme la tension du secteur en courant haute fréquence pour la bobine.", norms) === 1, "phrase trouvée sur la page 2");
ok(I.locatePage("Le  principe de FONCTIONNEMENT repose sur les courants de Foucault dans le récipient", norms) === 0, "casse, espaces et ponctuation ignorés");
ok(I.locatePage("Phrase absente du document, vraiment introuvable ici.", norms) === -1 && I.locatePage("court", norms) === -1 && I.locatePage("", norms) === -1, "phrase absente ou trop courte : -1");
ok(I.locatePage("Le principe de fonctionnement repose sur les courants de Foucault dans le récipient et ceci continue sur la page suivante", norms) === 0, "phrase à cheval sur deux pages : début retrouvé");

/* Association */
const img = (page, score, len) => ({ page, score, url: "data:image/jpeg;base64," + "A".repeat(len || 100) });
const qs = () => [{ src: pages[0] }, { src: pages[0] + " " }, { src: pages[1] }, { src: pages[2] }, { question: "sans src" }];
let Q = qs(), a = I.assign(Q, pages, [img(0, 10), img(0, 50), img(1, 5)]);
ok(a.assigned === 3 && Q[0].media && Q[1].media && Q[2].media && !Q[3].media && !Q[4].media, "une image par question de la page, aucune sur une page sans image (" + a.assigned + ")");
ok(Q[0].media.type === "image" && Q[0].figurePage === 1 && Q[2].figurePage === 2, "type image et numéro de page");
Q = qs(); a = I.assign(Q, pages, [img(0, 10)]);
ok(a.assigned === 1 && Q[0].media && !Q[1].media, "une seule image pour deux questions de la page : une seule jointe");
Q = qs(); a = I.assign(Q, pages, [img(0, 10), img(1, 10)], { max: 1 }); ok(a.assigned === 1, "plafond du nombre d'images");
Q = qs(); a = I.assign(Q, pages, [img(0, 1, 800), img(1, 1, 800)], { maxChars: 1000 }); ok(a.assigned === 1, "plafond du poids total");
Q = qs(); a = I.assign(Q, pages, [{ page: 0, score: 1, url: "https://exemple.fr/x.png" }, { page: 0, score: 1, url: "javascript:alert(1)" }, { page: 0, score: 1, url: "data:image/svg+xml;base64,AAAA" }, { page: -1, score: 1, url: "data:image/jpeg;base64,AAAA" }]);
ok(a.assigned === 0, "seules les images intégrées jpeg / png / webp sont acceptées");
Q = qs(); Q[0].media = { type: "image", url: "old" }; I.assign(Q, pages, []); ok(!Q[0].media, "une régénération sans image retire les anciens médias");
ok(I.assign([], pages, [img(0, 1)]).assigned === 0 && I.assign(qs(), null, [img(0, 1)]).assigned === 0 && I.assign(qs(), pages, null).assigned === 0 && I.assign(null, pages, []).assigned === 0, "entrées vides : aucune erreur");

console.log("Images du cours : " + (n - bad) + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
