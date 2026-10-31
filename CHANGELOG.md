# 📜 Historique des mises à jour — Qui suis-je ?

Les mises à jour les plus récentes sont en haut. Chaque ligne « 🔖 » donne le numéro du commit Git (`git show <numéro>` montre le détail).
Les chiffres de version « V… » sont ceux des fichiers du dépôt (`js/patches/NNN-vXX-….js`) ; les tests correspondants sont listés dans le README.

> **À savoir** : l'historique Git du dépôt commence le **28 octobre 2026** (premier commit = 322 fichiers déjà présents). Ce qui existait avant (V9 → V40) est
> reconstitué à la fin de ce fichier d'après les en-têtes du code : c'est un résumé fidèle mais sans dates précises.

---

## Samedi 31 octobre 2026

### 🎆 V63 — Feux d'artifice, rattrapage des erreurs, partage et fiches — 🔖 `29e224b` (13 h 28)
- **Bruit de feu d'artifice** à chaque réponse (synthétisé, aucun fichier) : bonne réponse = tir complet en 2 bouquets ; mauvaise réponse = petit tir plus grave ; fin de partie = salve de 10 tirs + final.
- **Étincelles** à l'écran, secousse et vibration sur une erreur ; bouton **« 🎆 Effets ON/OFF »** à côté du bouton Son ; respect de « Son OFF » et de « moins d'animations ».
- Sur la carte « 📚 Justifications » : **🔁 Refais tes erreurs** (mini-quiz sur tes questions ratées), **📤 Partager mon score** (🟩🟥⬜ façon Wordle), **📋 Copier** et **⬇️ Télécharger** les fiches de révision, **🎆 Feu d'artifice** (rejoue la salve), **🔊 Lire** à voix haute.
- Tests : `tests/fireworks.test.js`, `tests/e2e/fx.e2e.js`, `tests/e2e/finaljustif.e2e.js` (étendu).

### 📚 V62 — Justifications pour apprendre, écran bonus/malus en grand, chrono après la lecture — 🔖 `c47a0f1` (10 h 17)
- **Carte « 📚 Justifications »** sur l'écran final : une ligne par question (juste ✅, fausse ❌ ou sans réponse ⏱️) avec la bonne réponse, l'explication, ce que tu avais répondu, un « Ne confonds pas », un repère chiffré, une question voisine du même thème et un mot d'encouragement ; filtres « À revoir » / « Tout ouvrir ».
- Les rapports (PDF « Réviser », CSV, « Rapport Qui suis-je N ») et la carte de correction entre les questions reprennent ces compléments (justification jusqu'à 560 caractères).
- **Écran bonus / malus en plein écran** : vert pour un bonus, rouge pour un malus, violet pour un malus bloqué ; un clic le ferme.
- **Le chrono démarre après la lecture** de la question (2 à 7 s, réponses verrouillées, bandeau « 📖 Lis la question ») ; annonce en grand des tours spéciaux (piège ×5, or ×2, éclair, chance).
- **Temps restant visible après ta réponse** ; les autres joueurs voient « Léo a répondu · il reste N s ».
- Tests : `tests/readtime.test.js`, `tests/e2e/clock.e2e.js`, `tests/e2e/finaljustif.e2e.js`.

---

## Vendredi 30 octobre 2026

### 📖 Nouveaux thèmes et justifications dans les rapports — 🔖 `77683ee` (16 h 42) et 🔖 `11fe1ee` (16 h 44)
- **🔍 Trouve la différence** et **🧐 Trouve l'intrus** : deux images côte à côte dessinées par le jeu (SVG), régénérées à chaque partie.
- **29 nouveaux thèmes** de questions (acronymes et sigles, dactylographie, jeux de cartes, conjugaison, homophones, figures de style, proverbes, etc.) : la grille passe de 201 à **232 thèmes**.
- Septième champ facultatif dans les fichiers de questions : l'**explication** de la bonne réponse.
- **Bonne réponse + pourquoi** dans le PDF des statistiques (section « Réviser »), le CSV, le « Rapport Qui suis-je N » et l'export de l'historique.
- README mis à jour avec les chiffres réels (≈ 18 400 questions tirables : 14 800 de texte + ≈ 3 600 en images ou générées).

---

## Jeudi 29 octobre 2026

### ✉️ Statistiques par e-mail
- 🔖 `185e837` (21 h 37) — bouton **« Envoyer maintenant »** (envoi direct via EmailJS, sans serveur), réglage guidé, limites et messages d'erreur clairs.
- 🔖 `6660bda` (21 h 22) — envoi par e-mail **sans serveur** (messagerie, Gmail, Outlook, PDF joint par partage), bilan perso en tête, adresse retenue en option.

### 📈 Statistiques et cours
- 🔖 `2bbc680` (20 h 53) — vrais graphiques pour « champion de chaque catégorie » et « carte des forces », choix Graphique/Tableau retenu, barre d'onglets qui garde sa position.
- 🔖 `1f4843c` (20 h 38) — thèmes de cours visibles seulement dans une salle créée depuis un cours ; **justification des points** (calcul, or, piège, pouvoirs) ; plus de phrase absurde autour des réponses déjà complètes.

### 🎁 Pouvoirs, pronostic et pièges
- 🔖 `e6513d3` (20 h 03) — **écrans vert / rouge complets** : Roue multiplicatrice, Armures, Miroir, pronostic et pièges ; « Oublier » tient en pleine partie.
- 🔖 `f8b1510` (19 h 36) — **pronostic de fin** (place juste : score ×2, sinon ÷2), **questions pièges** (×5 / −300 pts), **13 pouvoirs de plus**, cases de « Modes fun » réparées.

### ⚙️ Outils de l'hôte
- 🔖 `ef27cb8` (16 h 23) — questions jamais jouées d'abord, difficulté progressive, thèmes favoris et inversion de la sélection.
- 🔖 `c409985` (15 h 36) — écran de configuration : liste des langues réparée, résumé « Ta partie en un coup d'œil », difficulté, code de configuration à partager ; statistiques : onglets Catégories et Profils.

### 🏠 Salles
- 🔖 `6669f61` (14 h 03) — places jusqu'à 9 999, onglets **Duels** et **Faits marquants**, grandes salles bornées.
- 🔖 `a24c9e0` (13 h 39) — places de 1 à ∞, menus « Ma salle » et « Réglages & aide », préréglages de partie (Éclair, Classique, Marathon, Réflexion).
- 🔖 `c2414d7` (13 h 10) — salles : nom, mot de passe, places, verrouillage ; correctifs d'identité et de joueurs refusés.

### 🏆 Équipes, trophées, sondages
- 🔖 `8a6af3c` (12 h 32) — carte de résultat personnelle en image (filigrane géré).
- 🔖 `faa8c6c` (12 h 28) — **trophées de fin de partie**, **sondage éclair**, **raccourcis clavier** (1 2 3 4 / A B C D), corrections de sécurité.
- 🔖 `723782d` (12 h 11) — **équipes**, chat d'équipe et bouton « Montrer le classement » pour l'hôte.

### 🏁 Classement et nouveaux contenus
- 🔖 `099fbf0` (10 h 06) — classement à la moitié des questions affiché à tous les joueurs.
- 🔖 `94e123b` (09 h 49) — onglet **Classement** : image 1er, 2e, 3e, 4e… à la mi-partie, à la fin ou après chaque question, avec code de la salle.
- 🔖 `98ae530` (09 h 38) — graphiques sur les questions, récap copiable, onglet « Mes records », PDF complété, accords corrigés.
- 🔖 `c800cfc` (09 h 32) — **201 thèmes** : 24 thèmes de questions et 8 thèmes en images (heure, angles, fractions, coordonnées…) + test SVG.
- 🔖 `25e423b` (09 h 17) — **16 nouveaux pouvoirs** (8 bonus, 8 malus), **écran vert / rouge animé**, règlement détaillé en français, anglais et espagnol.

---

## Mercredi 28 octobre 2026

- 🔖 `7a86450` (19 h 26) — **filigrane** « qui-suis-je-officiel » sur les images de graphiques copiées / téléchargées ; version sans filigrane réservée à l'hôte.
- 🔖 `2e7920f` (19 h 08) — rapport d'appel PDF / ODT disponible sans transcription et après avoir quitté le vocal.
- 🔖 `42d6939` (19 h 02) — transcription : export **ODT** (LibreOffice, Word, Google Docs) en plus du PDF et du texte.
- 🔖 `7d74f23` (18 h 58) — correctif : compteurs de la carte de thème écrasés / coupés, titre de cours coupé en plein mot.
- 🔖 `42f52a0` (18 h 37) — transcription : export PDF avec graphiques (mots les plus dits, qui parle le plus, activité) et graphique en direct dans le panneau.
- 🔖 `c85c4ee` (18 h 21) — transcription : l'export porte l'heure réelle (identique pour tous les participants).
- 🔖 `673fd98` (18 h 11) — **chat vocal** : durée de l'appel, qui parle, temps de parole et transcription partagée.
- 🔖 `59922ca` (17 h 57) — vocal : le test du micro et du son marche aussi pendant le vocal, ta ligne s'allume quand tu parles.
- 🔖 `8de70d7` (17 h 50) — vocal : test du micro (barre de niveau, écoute de soi) et du haut-parleur avant de rejoindre.
- 🔖 `a88e727` (17 h 45) — fenêtre QCM : l'horloge et le bouton vocal ne cachent plus les boutons du bas.
- 🔖 `a69414e` (17 h 40) — **QCM** : une bonne réponse différente par question, jeu à plusieurs, chat vocal et lien d'invitation.
- 🔖 `22cf74d` (16 h 08) — tous les graphiques au même style (grille, graduations, titres d'axes, légende en haut, en-tête de carte uniforme) + axe gradué dans le PDF. **Premier commit du dépôt** (322 fichiers : jeu complet, banque de questions, tests).

---

## Avant l'historique Git (V9 → V47, reconstitué d'après le code)

Résumé par version, dans l'ordre des fichiers `js/patches/` ; les dates ne sont pas conservées.

| Version | Ce que ça apporte |
|---|---|
| **V9** | Liste de thèmes, sessions enregistrées et rapports de partie |
| **V10 – V10.3** | Activité du profil, heure exacte des messages, indicateur « quelqu'un écrit… » |
| **V11** | Variantes de partie (classique…) |
| **V12 – V13** | Modération du chat (admin, sourdine, messages bloqués) et archive du chat |
| **V14 – V15** | Démarrage sécurisé (un seul minuteur), écran personnalisé avant le compte à rebours, mode « 5 secondes » |
| **V16 – V16.3** | Questions supplémentaires, **rapports PDF corrigés et renommés « Rapport Qui suis-je N »**, pouvoirs spéciaux (Chrono royal, Sablier noir…), descriptions des modes |
| **V17 – V18** | Affichage mobile « pro », **photos de profil** (3 Mo max, recadrées en 256 px) |
| **V19 – V20.8** | Questions et thèmes en plus, correctifs de stabilité, de sortie et de navigation |
| **V21 – V22** | Pack complet de questions, **traductions** (anglais, espagnol), correctif de l'écran de fin |
| **V23 – V23.1** | Deux variantes supplémentaires dans chaque thème, navigation dans les questions, nouvelle banque |
| **V24** | **Anti-triche** (quitter la page pendant une question) |
| **V25 – V26** | Pouvoirs de la vague 2, banque enrichie, correction des blocs d'information |
| **V32 – V33** | Version stable, choix de pouvoir et mise en page des pouvoirs / cibles |
| **V34** | **+120 questions**, corrections iOS |
| **V35** | Gestionnaire de questions personnelles, transitions entre questions, **évènements bonus / malus** pour tous les joueurs |
| **V36 – V36.6** | **Chat rapide** (@pseudo, modifier / supprimer ses messages), bouton « Fermer », **musique YouTube** lancée par l'hôte, fin de partie à défilement libre |
| **V40** | Anti-triche progressif (avertissement, malus, exclusion), **images / vidéos / illustrations** dans les questions, **statistiques**, graphiques et PDF |
| **V41 – V47** | Questions en images (drapeaux, horloges, panneaux, formes, séries d'émojis…), questions de cours (QCM), mode révision, justifications des réponses (V43) et voix off |

Les versions suivantes (V50 et plus : pouvoirs, classement à la mi-partie, équipes, salles, configuration, pronostic, justifications, chrono, feux d'artifice…) sont détaillées plus haut, avec leurs numéros de commit.
