# 🎮 Qui suis-je ? — quiz multijoueur

Un jeu de quiz **multijoueur en ligne** (FR / EN) qui tourne entièrement dans le navigateur : l'hôte crée une
partie, les autres rejoignent avec un code, et les questions s'enchaînent avec scores, pouvoirs, bonus, chat et podium.
Les joueurs sont reliés en pair-à-pair via [PeerJS](https://peerjs.com/) : **aucun serveur n'est nécessaire** pour jouer.

- **127 thèmes**, environ **15 000 questions** (4 niveaux : facile, moyen, difficile, impossible)
- Tes propres questions (gestionnaire intégré) et **des QCM générés à partir d'un cours** (PDF, ODT, DOCX, TXT)
- **Modération stricte** du chat (voir plus bas)
- **Anti-triche progressif** : avertissements, malus, puis exclusion jusqu'à la fin de la partie
- **Questions avec image ou vidéo YouTube** (agrandissables), dont un thème de questions en images (« de quelle couleur est le pull ? »)
- **Statistiques et graphiques** de chaque partie, historique des 12 dernières parties, export CSV

## ▶️ Lancer le jeu

Ouvre simplement `index.html` dans un navigateur, ou publie le dossier tel quel (GitHub Pages, n'importe quel hébergement statique).
Le jeu fonctionne aussi en ouvrant le fichier directement (`file://`).

Pour tester en local avec un petit serveur :

```bash
python3 -m http.server 8000      # puis http://localhost:8000/
```

## 📁 Organisation du dépôt

Le fichier unique `index.html` (1,9 Mo) a été découpé. Le comportement du jeu est inchangé.

```
index.html              page + ordre de chargement des scripts
css/
  base.css              styles de base
  features.css          styles des fonctionnalités (chat, pouvoirs, podium…)
  qcm.css               styles de la fenêtre « QCM depuis un cours »
  v40.css               anti-triche, questions avec média, statistiques
js/
  core/                 moteur du jeu (réseau, joueurs, questions, scores…)
  patches/              évolutions successives, chargées dans l'ordre des numéros
  moderation/           lexique + moteur de modération
  qcm/                  générateur de QCM (generator.js), lecture des fichiers (extract.js), interface (ui.js)
  data/                 questions : banque d'origine + data/bank/NNN-theme.js (un fichier par thème)
                        + visual-questions.js (thème « Questions en images », généré à chaque partie)
  media/                media.js : validation et affichage des images / vidéos YouTube / illustrations SVG
  stats/                analysis.js (calculs), charts.js (graphiques SVG), stats.js (capture + tableau de bord)
php/
  qcm.php               OPTIONNEL — extraction côté serveur et mode IA (voir plus bas)
tests/                  tests Node (modération, QCM, banque, médias, questions en images, statistiques)
```

Ce sont des scripts classiques (pas de bundler, pas de build) : **l'ordre des balises `<script>` de `index.html` compte**.

## 🛡️ Modération du chat

Chaque message est analysé **avant l'envoi** (côté joueur) **et à la réception** (côté hôte, qui fait foi). Un message interdit est supprimé instantanément, y compris chez les joueurs qui l'auraient déjà reçu.

Détection notamment de :

- texte écrit **lettre par lettre sur plusieurs lignes** (`B` ⏎ `I` ⏎ `T` ⏎ `E`), même avec des lignes vides ou du texte autour ;
- lettres séparées par des espaces ou des symboles (`b i t e`, `b.i.t.e`, `b!i!t!e`) ;
- astuces classiques : accents, majuscules mélangées, lettres étirées (`biiiite`), leet (`p@ute`, `m3rde`), caractères de largeur nulle, lettres homoglyphes (cyrillique, grec, pleine largeur).

Sanctions progressives par joueur : 1ᵉʳ message interdit → avertissement ; 2ᵉ → sourdine 1 min ; 3ᵉ → 5 min ; 4ᵉ et suivants → 15 min.
La sourdine se lève d'elle-même à la fin de sa durée (le joueur est prévenu) et le compteur repart à zéro après 10 minutes sans infraction. Le journal de modération est visible côté hôte.

Aucun filtre n'est parfait : le lexique est dans `js/moderation/lexicon.js`, facile à compléter.

## 📄 QCM à partir d'un cours

Bouton **« QCM depuis un cours »** sur l'accueil et dans le gestionnaire de questions :

1. choisis un **PDF, ODT, DOCX ou TXT** (25 Mo max), ou colle le texte ;
2. donne un nom de thème et choisis le nombre de questions, **de 5 à 100** ;
3. vérifie l'aperçu (tu peux décocher des questions), puis ajoute au jeu : le thème est créé, sélectionné, et le nombre de manches réglé.

Deux méthodes :

- **⚡ Rapide** (par défaut, gratuit) : tout se passe sur ton appareil, rien n'est envoyé. Le générateur repère des définitions, dates/nombres et termes clés du cours et en fait des questions à 4 réponses. La qualité dépend fortement du texte : un cours bien rédigé (définitions, dates, chiffres) donne de bien meilleurs résultats qu'un diaporama de mots-clés. **Relis toujours l'aperçu.**
- **🤖 IA** (optionnel) : demande un serveur PHP avec une clé API Claude (voir ci-dessous). Les questions sont mieux formulées.

Les questions sont stockées dans le navigateur (`localStorage`) et ne sont utilisées que lorsque **tu** es l'hôte. Relancer le même cours remplace l'ancien lot au lieu de s'accumuler.

Le PDF doit contenir du texte : un PDF scanné (image) ne peut pas être lu sans OCR. Pour lire les PDF, ODT et DOCX, la page charge pdf.js / JSZip depuis cdnjs à la demande (connexion requise à ce moment-là) ; le TXT et le texte collé n'en ont pas besoin. Si le chargement échoue et que `php/qcm.php` est disponible, l'extraction se fait côté serveur.

### Activer le mode IA (optionnel)

GitHub Pages **n'exécute pas PHP** : ce mode demande un hébergement PHP (≥ 7.4, extension cURL). Rien n'est écrit en dur dans le dépôt.

```bash
export ANTHROPIC_API_KEY="sk-ant-…"
export QCM_ACCESS_CODE="un-mot-de-passe"     # fortement recommandé
export ANTHROPIC_MODEL="claude-sonnet-5-5"   # facultatif
```

ou crée `php/config.local.php` (ignoré par git) :

```php
<?php return ['anthropic_key' => 'sk-ant-…', 'model' => 'claude-sonnet-5-5', 'access_code' => 'un-mot-de-passe'];
```

⚠️ Chaque génération IA consomme du crédit API et le texte du cours est envoyé à l'API : définis toujours un code d'accès. Sans PHP ou sans clé, le jeu bascule simplement sur le mode rapide.

## 🚨 Anti-triche

**Une infraction = quitter la page pendant une question** (changement d'onglet ou d'appli, perte du focus) avant d'avoir répondu.
Au plus une infraction par joueur et par question. C'est **l'hôte qui compte et décide** :

| Infractions du joueur | Conséquence |
|---|---|
| 1 et 2 | avertissement (aucune sanction) |
| plus de 2 (3ᵉ et 4ᵉ) | **malus** : −250 points et chrono réduit de 25 % pendant 2 questions (« Minuterie piégée ») |
| plus de 4 (5ᵉ) | **exclusion** : le joueur est retiré de la partie et attend la fin de celle-ci (un écran le lui explique), puis il est libéré pour la suivante |

Les autres joueurs sont prévenus. La question en cours ne bloque pas sur un joueur exclu. L'hôte peut désactiver l'anti-triche dans les réglages de la partie.
Les seuils sont dans `js/patches/039-v40-anti-triche.js` (`V40CheatPolicy`) et testés dans `tests/media.test.js`.

Limites, à connaître : la détection tourne **dans le navigateur du joueur** — quelqu'un de technique peut la contourner ou jouer sur un second appareil ;
l'hôte reçoit les avertissements et malus mais **ne peut pas être exclu** (la partie dépend de lui).

## 🖼️ Questions avec image ou vidéo

Dans le gestionnaire de questions, une question peut avoir un **média** : une image (lien `https://…` ou fichier envoyé, compressé automatiquement),
un lien **YouTube** (`youtube.com/watch`, `youtu.be`, `shorts`, `embed`… avec début optionnel `?t=1m30s`) ou, pour les questions générées, une illustration SVG.
Le média s'affiche au-dessus de la question chez **tous** les joueurs et un bouton **« Agrandir »** le passe en plein écran (Échap ou toucher pour fermer).
Il est conservé à l'export / import des questions.

- Les vidéos passent par `youtube-nocookie.com` dans un cadre isolé, construit à partir de l'identifiant (11 caractères) : aucun autre domaine n'est accepté.
- Une vidéo demande du temps : choisis un **chronomètre assez long**.
- Les images venant d'Internet doivent rester accessibles aux autres joueurs ; les images envoyées sont limitées à environ 170 000 caractères (stockage du navigateur).

Le thème intégré **🖼️ Questions en images** crée à chaque partie de petites scènes (personnes avec un pull, un pantalon ou un chapeau de couleur, formes, ballons, étoiles…).
Les réponses sont **calculées à partir de ce qui est dessiné** (`tests/visual.test.js` relit chaque dessin pour le vérifier). Ce sont des illustrations originales, en français.

## 📊 Statistiques et graphiques

Le bouton **📊** (barre latérale, écran des résultats ou accueil) ouvre un tableau de bord. Pendant la partie, l'hôte note chaque réponse et envoie le journal à tous
les joueurs (même un joueur exclu) : tout le monde voit les mêmes chiffres. Onglets :

- **Vue d'ensemble** : chiffres clés, **évolution des scores** question par question, classement ;
- **Joueurs** : bonnes / mauvaises / sans réponse, temps de réponse moyen, plus gros gain ;
- **Questions** : réussite par question, par thème, par difficulté, avec / sans média, questions les plus difficiles et les plus faciles ;
- **Détail** : qui a répondu quoi à chaque question ;
- **Triche** : infractions par joueur et chronologie ;
- **Historique** : les 12 dernières parties (gardées dans le navigateur), réussite de chaque partie.

Chaque graphique se survole / se touche (infobulle), a une version **Tableau** et la légende masque ou affiche un joueur sans changer les couleurs des autres.
Export **CSV** de toutes les réponses (compatible tableur). Les couleurs sont validées pour le thème sombre et les daltoniens ; au-delà de 8 joueurs, les courbes montrent les 8 premiers arrivés et les autres figurent dans les tableaux.

Les journaux reçus par le réseau sont nettoyés et bornés avant usage (`V40Analysis.normalize`).

## ➕ Ajouter des questions ou un thème

Un thème = un fichier `js/data/bank/NNN-nom.js` :

```js
V35_BANK["🎻 Mon thème"]=[
"f|La question ?|La bonne réponse|Faux 1|Faux 2|Faux 3",   // f = facile, m = moyen, d = difficile, i = impossible
];
```

Ajoute ensuite la balise `<script src="js/data/bank/NNN-nom.js"></script>` dans `index.html`, **avant** `999-register.js`.
La bonne réponse est toujours en premier dans le fichier : le jeu mélange les réponses à l'affichage.

## ✅ Tests

```bash
node tests/moderation.test.js            # cas à bloquer / cas légitimes
node tests/qcm.test.js                   # générateur et lecture des fichiers de test
node tests/bank.test.js                  # valide toutes les questions (format, doublons, réponses ambiguës)
node tests/bank.test.js "Football|Chess"   # ne valider que certains thèmes (expression régulière)
node tests/media.test.js                 # liens YouTube / images, filtrage SVG, politique anti-triche
node tests/visual.test.js                # chaque question en image est cohérente avec son dessin
node tests/stats.test.js                 # calculs de statistiques, historique, CSV, journaux malveillants
```

Le validateur détecte les erreurs de format, les doublons exacts et les réponses incohérentes ; il ne vérifie pas
l'exactitude factuelle des questions.

## ❤️ Contribuer

Les corrections de questions, nouveaux thèmes et mots à modérer sont les bienvenus. Amuse-toi bien ! 🎉
