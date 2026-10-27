# 🎮 Qui suis-je ? — quiz multijoueur

Un jeu de quiz **multijoueur en ligne** (FR / EN) qui tourne entièrement dans le navigateur : l'hôte crée une
partie, les autres rejoignent avec un code, et les questions s'enchaînent avec scores, pouvoirs, bonus, chat et podium.
Les joueurs sont reliés en pair-à-pair via [PeerJS](https://peerjs.com/) : **aucun serveur n'est nécessaire** pour jouer.

- **157 thèmes**, environ **15 800 questions** de texte, plus **≈ 700 questions avec image ajoutées à tous les thèmes** (tirées à chaque partie) (4 niveaux : facile, moyen, difficile, impossible)
- Tes propres questions (gestionnaire intégré) et **des QCM générés à partir d'un cours** (PDF, Word, PowerPoint, ODP, Excel, EPUB, page web, audio, vidéo…)
- **Modération stricte** du chat (voir plus bas)
- **Anti-triche progressif** : avertissements, malus, puis exclusion jusqu'à la fin de la partie
- **Questions avec image ou vidéo YouTube** (agrandissables), dont quatre thèmes dessinés par le jeu : questions en images (« de quelle couleur est le pull ? »), **Code de la route en images** (panneaux, feux, priorités à une intersection, rond-point, vitesse selon la météo), **Drapeaux en images** et **Lire l'heure** (horloge à aiguilles)
- **Statistiques et graphiques** de chaque partie (classement, évolution des scores, séries de bonnes réponses, réponses les plus rapides, répartition des temps, faits marquants), historique des 12 dernières parties, export **PDF** (tableaux + graphiques) et CSV

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
  v43.css               voix off (réglages) et carte de justification de la réponse
js/
  core/                 moteur du jeu (réseau, joueurs, questions, scores…)
  patches/              évolutions successives, chargées dans l'ordre des numéros
  moderation/           lexique + moteur de modération
  qcm/                  générateur de QCM (generator.js), formats de cours (formats.js), transcription audio / vidéo (transcribe.js),
                        lecture des fichiers et des liens (extract.js), interface (ui.js)
  data/                 questions : banque d'origine + data/bank/NNN-theme.js (un fichier par thème)
                        + visual-questions.js (thème « Questions en images », généré à chaque partie)
                        + road-questions.js (thème « Code de la route en images », généré à chaque partie)
                        + image-themes.js (thèmes « Drapeaux en images » et « Lire l'heure », générés à chaque partie)
                        + image-mix.js (questions avec image ajoutées à TOUS les thèmes, sans rien remplacer)
  media/                media.js : validation et affichage des images / vidéos YouTube / illustrations SVG
  stats/                analysis.js (calculs), charts.js (graphiques SVG), pdf.js (export PDF), stats.js (capture + tableau de bord)
  voice/                voice.js : voix off (la question est lue à voix haute, synthèse vocale du navigateur)
  justif/               justif.js : justification après chaque réponse (bonne ou mauvaise)
php/
  qcm.php               OPTIONNEL — extraction, lecture de liens, transcription et mode IA côté serveur (voir plus bas)
tests/                  tests Node (modération, QCM, formats, banque, médias, questions en images, code de la route / drapeaux / horloges en images, statistiques, PDF, justifications / voix off)
```

Ce sont des scripts classiques (pas de bundler, pas de build) : **l'ordre des balises `<script>` de `index.html` compte**.

## 🛡️ Modération du chat

Chaque message est analysé **avant l'envoi** (côté joueur) **et à la réception** (côté hôte, qui fait foi). Un message interdit est supprimé instantanément, y compris chez les joueurs qui l'auraient déjà reçu.

Détection notamment de :

- texte écrit **lettre par lettre sur plusieurs lignes** (`B` ⏎ `I` ⏎ `T` ⏎ `E`), même avec des lignes vides ou du texte autour ;
- lettres séparées par des espaces ou des symboles (`b i t e`, `b.i.t.e`, `b!i!t!e`) ;
- astuces classiques : accents, majuscules mélangées, lettres étirées (`biiiite`), leet (`p@ute`, `m3rde`), caractères de largeur nulle, lettres homoglyphes (cyrillique, grec, pleine largeur).

**Contournement par épellation (bannissement).** Envoyer un mot lettre par lettre (« b », « i », « t », « e » en quatre messages) ne trompe plus le filtre : l'hôte garde les « morceaux » (1 à 4 caractères) de chaque joueur pendant 5 minutes, même si d'autres messages sont intercalés (messages de l'hôte compris). Si les morceaux (espacés de moins de 2 minutes) forment un mot interdit (« b » « i » « t » « e », mais aussi « bit » + « e » ou « b » + « ite »), ou si le joueur envoie **3 lettres isolées différentes** en 5 minutes, il est **banni automatiquement** : ses morceaux disparaissent du chat de tout le monde, il est retiré de la partie, son pseudo et son identifiant sont refusés s'il tente de revenir (jusqu'à ce que l'hôte ferme la page), les autres joueurs sont prévenus et l'hôte retrouve la ligne dans son journal. **Deux lettres isolées différentes en 60 secondes** (« b » puis « i ») suppriment immédiatement la seconde (et la première) avec un avertissement ; la troisième lettre différente entraîne le bannissement. Trois lettres seulement 2 à 2 différentes (« a b a ») suppriment aussi le message avec un avertissement. Les nombres seuls (compte à rebours « 3, 2, 1 ») et les mots courts (« ok », « lol ») ne sont pas touchés ; une lettre isolée seule n'est pas une anomalie. Limites : un joueur banni peut revenir avec un autre pseudo ; des lettres espacées de plus de 3 minutes, ou réparties entre plusieurs joueurs, ne sont pas détectées.

Sanctions progressives par joueur : 1ᵉʳ message interdit → avertissement ; 2ᵉ → sourdine 1 min ; 3ᵉ → 5 min ; 4ᵉ et suivants → 15 min.
La sourdine se lève d'elle-même à la fin de sa durée (le joueur est prévenu) et le compteur repart à zéro après 10 minutes sans infraction. Le journal de modération est visible côté hôte.

Aucun filtre n'est parfait : le lexique est dans `js/moderation/lexicon.js`, facile à compléter.

## 📄 QCM à partir d'un cours

Bouton **« QCM depuis un cours »** sur l'accueil et dans le gestionnaire de questions :

1. choisis un **fichier** (voir le tableau), colle un **lien** ou colle le texte ;
2. donne un nom de thème et choisis le nombre de questions, **de 5 à 100** ;
3. vérifie l'aperçu (tu peux décocher des questions), puis ajoute au jeu : le thème est créé, sélectionné, et le nombre de manches réglé.

### Formats acceptés

| Type | Formats | Comment c'est lu |
|---|---|---|
| Documents | **PDF**, **Word (DOCX)**, **ODT**, **RTF**, TXT, Markdown, JSON | sur ton appareil |
| Présentations | **PowerPoint (PPTX)**, **LibreOffice Impress (ODP)** — diapositives **et notes** | sur ton appareil |
| Tableurs | **Excel (XLSX)**, **ODS**, CSV / TSV | sur ton appareil |
| Livres / pages | **EPUB**, **HTML** enregistré | sur ton appareil |
| Sous-titres | SRT, VTT, SBV, ASS / SSA, LRC (les répétitions sont retirées) | sur ton appareil |
| **Audio** | **MP3, WAV, M4A / AAC, OGG / Opus, FLAC** | transcrit (voir ci-dessous) |
| **Vidéo** | **MP4, WebM, MOV, MKV** (piste son) | transcrit (voir ci-dessous) |
| **Liens** | page web, **Wikipédia**, fichier en ligne | voir ci-dessous |

**Pas de lecture directe, avec explication dans le jeu :** les anciens formats binaires (DOC, PPT, XLS : enregistre-les en DOCX / PPTX / XLSX), Pages / Keynote / Numbers, les images et les PDF scannés (il faudrait une reconnaissance de caractères).

**Canva, Google Slides / Docs / Drive, OneDrive, YouTube :** ces services ne laissent pas lire leur contenu depuis un simple lien (sinon n'importe quel site pourrait lire tes documents privés). Le jeu te l'indique et te dit quoi faire : pour **Canva**, *Partager › Télécharger › PDF* (ou PowerPoint) puis dépose le fichier ; pour Google, *Fichier › Télécharger* ; pour YouTube, télécharge le sous-titre ou l'audio. **Aucune connexion à ces comptes n'est faite.**

**Audio et vidéo → texte.** Deux voies :
- **Dans le navigateur** (par défaut, gratuit, rien ne quitte l'appareil) : le modèle de reconnaissance vocale Whisper (via transformers.js, chargé depuis jsDelivr) est téléchargé au premier usage (≈ 40 Mo en qualité rapide, ≈ 80 Mo en précise) puis gardé en cache. Compte **plusieurs minutes pour un cours d'une heure** ; il y a un bouton **Annuler** et une estimation du temps restant. Limites : 300 Mo et **90 minutes** par fichier. Le navigateur doit savoir décoder le codec (MP3, WAV, OGG, WebM : partout ; MP4 / AAC dépend du navigateur : si le son n'est pas lisible, convertis-le en MP3).
- **Par le serveur PHP** (optionnel) : plus rapide et plus précis. Voir « Configuration du serveur » ci-dessous.
Choisis la **langue** du cours (étape 4) : c'est le meilleur moyen d'améliorer la transcription. Relis toujours le texte et les questions : une transcription peut contenir des erreurs (noms propres, termes techniques).

**Liens.** Le jeu essaie d'abord de lire la page directement ; beaucoup de sites l'interdisent depuis un autre site (règle « CORS »). Dans ce cas : enregistre la page / imprime-la en PDF, copie-colle le texte, utilise le serveur PHP du jeu, ou coche l'option **« service de lecture externe »** (r.jina.ai : l'adresse de la page est alors envoyée à ce service tiers ; désactivée par défaut). Les pages qui se construisent en JavaScript ou réservées aux membres ne peuvent pas être lues.

Deux méthodes de génération :

- **⚡ Rapide** (par défaut, gratuit) : tout se passe sur ton appareil, rien n'est envoyé. Le générateur repère des définitions, dates/nombres et termes clés du cours et en fait des questions à 4 réponses. La qualité dépend fortement du texte : un cours bien rédigé (définitions, dates, chiffres) donne de bien meilleurs résultats qu'un diaporama de mots-clés. **Relis toujours l'aperçu.**
- **🤖 IA** (optionnel) : demande un serveur PHP avec une clé API Claude (voir ci-dessous). Les questions sont mieux formulées.

Les questions sont stockées dans le navigateur (`localStorage`) et ne sont utilisées que lorsque **tu** es l'hôte. Relancer le même cours remplace l'ancien lot au lieu de s'accumuler.

Pour lire PDF, DOCX, PPTX, ODP, ODT, XLSX, ODS et EPUB, la page charge pdf.js / JSZip depuis cdnjs à la demande (connexion requise à ce moment-là) ; le texte brut, le HTML, le RTF, les sous-titres et le texte collé n'en ont pas besoin. Si le chargement échoue et que `php/qcm.php` est disponible, l'extraction se fait côté serveur.

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

⚠️ Chaque génération IA consomme du crédit API et le texte du cours est envoyé à l'API. **Par sécurité, le mode IA, la transcription par le serveur et la lecture de liens par le serveur sont désactivés tant que `QCM_ACCESS_CODE` n'est pas défini** (sinon n'importe qui pourrait utiliser ton crédit ou ton serveur). Sans PHP, sans clé ou sans code, le jeu bascule simplement sur le mode rapide / la lecture dans le navigateur.

### Configuration du serveur : lecture de liens et transcription (optionnel)

`php/qcm.php` ajoute, si ton hébergement exécute PHP (cURL ; `ffmpeg` recommandé) :

- `?action=fetch` : lit une page web **côté serveur**, ce qui évite les blocages CORS du navigateur. Protection SSRF : seules les adresses http(s) publiques sont acceptées (adresses locales, privées, IPv6 non publiques et notations décimales / hexadécimales refusées), chaque redirection est revérifiée, l'adresse IP contrôlée est celle qui est utilisée, 8 Mo et 15 s maximum ;
- `?action=transcribe` : transcrit un audio / une vidéo avec une API compatible OpenAI (« Whisper »). Le son est découpé par `ffmpeg` en morceaux de 10 minutes (90 minutes maximum). Configuration : `STT_API_KEY` (obligatoire), `STT_API_URL` (défaut : API OpenAI), `STT_MODEL` (défaut `whisper-1`) — ou les clés `stt_key`, `stt_url`, `stt_model` de `php/config.local.php`.

Le fichier audio est alors **envoyé à ton serveur puis au service de transcription** que tu as choisi. Les deux actions **exigent** un code d'accès configuré ; sans lui, elles sont refusées et le jeu reste sur la voie « navigateur ».

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

Le thème **🚦 Code de la route en images** fonctionne de la même façon (≈ 110 questions par partie, nouveaux dessins à chaque partie) :
- **Panneaux** (≈ 26 : danger, interdiction, obligation, indication, stop, cédez le passage, route à priorité, limitations de vitesse) : « Que signifie ce panneau ? », famille, forme, vitesse, « Quel panneau signifie… ? » (4 panneaux A à D).
- **Feux tricolores** : que doit faire le conducteur selon la lampe allumée ?
- **Mises en situation** : intersection vue de dessus avec deux véhicules de couleurs différentes : priorité à droite, Stop, Cédez le passage, route à priorité (losange).
- **Conditions** : vitesse maximale selon la route (autoroute, route à chaussées séparées, agglomération) et la météo (sec / pluie).

Les thèmes **🏳️ Drapeaux en images** (30 drapeaux à bandes, croix nordiques, disques et croix suisse, sans armoiries) et **🕐 Lire l'heure** (horloge à aiguilles : heures pleines, quarts d'heure, puis toutes les 5 minutes) suivent la même règle ; `tests/images.test.js` relit les couleurs dessinées et l'angle des aiguilles.

### Des images dans tous les thèmes (`js/data/image-mix.js`)

Chaque thème reçoit, **en plus** de ses questions de texte (aucune n'est remplacée ni supprimée), quelques questions avec image — environ 12 % de la taille du thème, entre 3 et 8 — retirées au sort à chaque partie. Il y en a ≈ 700 en tout, sur les 157 thèmes :

- **Pictogrammes** pour ≈ 100 thèmes à contenu visuel (« Quel est cet animal ? », « Quel instrument ? », « Quelle pièce d'échecs ? », « Quel fruit ? », symboles de la météo, du corps humain, de l'espace…) et **devinettes en émojis** (films, Disney & Pixar, contes et fables, séries, mangas, Pokémon, Harry Potter). Les émojis s'affichent avec la police d'émojis de l'appareil du joueur, donc leur dessin varie légèrement d'un téléphone à l'autre.
- **Drapeaux, capitales, horloges, panneaux routiers** repris des générateurs existants pour Géographie, Pays, Europe, Afrique, Capitales, Drapeaux, Temps, Code de la route, Automobile…
- **Polygones, fractions coloriées et opérations affichées en grand** pour Géométrie, Mathématiques et Calcul mental.
- **Illustration d'ambiance** (l'émoji du thème sur un fond coloré) sur ≈ 8 % des questions des thèmes sans contenu visuel naturel (Histoire, Philosophie, Langues…). Elle est **purement décorative** : elle ne donne et ne contredit aucune réponse, et elle est retirée puis retirée au sort à chaque partie. Ce n'est pas une image propre à la question.

`tests/mix.test.js` relit chaque dessin (émoji, nombre de côtés, parts coloriées, opération, drapeau) et vérifie que la bonne réponse correspond, avec des tables indépendantes du générateur.

Les dessins sont des schémas simplifiés, pas des reproductions officielles des panneaux. `tests/road.test.js` relit chaque dessin (panneau, bras de l'intersection, lampe allumée, météo) et vérifie la bonne réponse indépendamment du générateur.

## 📊 Statistiques et graphiques

Le bouton **📊** (barre latérale, écran des résultats ou accueil) ouvre un tableau de bord. Pendant la partie, l'hôte note chaque réponse et envoie le journal à tous
les joueurs (même un joueur exclu) : tout le monde voit les mêmes chiffres. Onglets :

- **Vue d'ensemble** : chiffres clés, **évolution des scores** question par question, classement ;
- **Joueurs** : bonnes / mauvaises / sans réponse, temps de réponse moyen, plus gros gain ;
- **Questions** : réussite par question, par thème, par difficulté, avec / sans média, questions les plus difficiles et les plus faciles ;
- **Détail** : qui a répondu quoi à chaque question ;
- **Bonus / Malus** : pouvoirs utilisés (🎁 bonus pour soi, 💥 malus contre un adversaire), avec 7 graphiques — pouvoirs lancés par joueur, malus reçus (touchés / bloqués par un bouclier ou renvoyés), points gagnés et perdus grâce aux pouvoirs, bilan net au fil des questions, types de pouvoirs, **qui vise qui** (matrice lanceur × cible) et bonus / malus cumulés. Les pouvoirs spéciaux sans montant comptent dans les effectifs mais pas dans les points ;
- **Triche** : infractions par joueur et chronologie ;
- **Historique** : les 12 dernières parties (gardées dans le navigateur), réussite de chaque partie.

Chaque graphique se survole / se touche (infobulle), a une version **Tableau** et la légende masque ou affiche un joueur sans changer les couleurs des autres.
Les bonus et malus sont notés par l'hôte (évènement « v35Event ») et envoyés aux joueurs comme le reste du journal.
Export **CSV** de toutes les réponses (compatible tableur) et export **📄 PDF** : classement, **courbes d'évolution des scores**, réussite par thème / difficulté, grille joueurs × questions, détail de chaque question, infractions et **section « Bonus et malus »** (tableau par joueur, pouvoirs lancés, types de pouvoirs). Le PDF est généré dans le navigateur, **sans bibliothèque externe ni connexion**, en vectoriel (net à tout zoom, texte sélectionnable) ; les emojis, absents de la police intégrée, en sont retirés. Les couleurs sont validées pour le thème sombre et les daltoniens ; au-delà de 8 joueurs, les courbes montrent les 8 premiers arrivés et les autres figurent dans les tableaux.

Les journaux reçus par le réseau sont nettoyés et bornés avant usage (`V40Analysis.normalize`).

## 🗣️ Voix off et justifications

### Voix off (`js/voice/voice.js`)
Chaque question est **lue à voix haute** au moment où elle s'affiche, avec la synthèse vocale du navigateur (gratuite, sans compte, aucune donnée envoyée).
Le réglage est **personnel** (gardé dans le navigateur de chaque joueur) : bouton **🗣️** du dock →
- lire les questions à voix haute (activé par défaut) ;
- lire aussi les quatre réponses (« Réponse A : … ») ;
- lire l'explication après la réponse ;
- vitesse (lente → très rapide) et choix de la voix française s'il y en a plusieurs, avec un bouton « Écouter un exemple ».

La lecture s'arrête dès qu'on répond, quand la correction apparaît ou à la question suivante, et respecte le bouton « Son ON / OFF ». Les symboles sont dits en toutes lettres (« × » → « fois », « % » → « pour cent »…) et les emojis sont ignorés.
Le narrateur 🔊 existant (« Bonne réponse / Mauvaise réponse ») est inchangé. Si le navigateur n'a pas de synthèse vocale, le panneau l'indique. La qualité de la voix dépend de l'appareil.

### Justifications (`js/justif/justif.js`)
Après chaque réponse, une carte explique le résultat, selon le cas :
- **bonne réponse** : confirmation, phrase complète quand la forme de la question le permet (« Paris est la capitale de la France. »), explication propre à la question, taux de réussite des joueurs sur cette manche ;
- **mauvaise réponse** : ce qui a été répondu, la bonne réponse, pourquoi la réponse choisie ne convient pas (écart chiffré pour une date ou un nombre : « 3 ans trop tard »), **confusion repérée** quand la réponse choisie est la bonne réponse d'une autre question de la banque, et « À retenir » ;
- **temps écoulé** : la bonne réponse et son explication.

La carte est complétée environ une seconde plus tard avec les statistiques de la manche (« 1 joueur a trouvé la bonne réponse sur 2 »). Le texte est calculé à partir des données de la question : **la banque ne contient pas d'explication écrite à la main pour chaque question**, donc rien n'est inventé ; quand aucune phrase fiable ne peut être construite, la carte se limite à la bonne réponse, à la correction existante et à la statistique.

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
node tests/road.test.js                  # code de la route en images : chaque réponse est recalculée en relisant le dessin
node tests/images.test.js                # drapeaux et horloges : la réponse est relue sur le dessin (couleurs, angle des aiguilles)
node tests/mix.test.js                   # images dans tous les thèmes : chaque réponse est recalculée en relisant le dessin
node tests/stats.test.js                 # calculs de statistiques, historique, CSV, journaux malveillants
node tests/pdf.test.js                   # export PDF : structure du fichier, métriques, caractères, pagination
node tests/justif.test.js                # justifications (bonne / mauvaise / temps écoulé, écarts, confusions, HTML échappé) et texte lu par la voix off
NODE_PATH=<dossier de jszip> node tests/formats.test.js   # PPTX, ODP, XLSX, ODS, EPUB, RTF, HTML, sous-titres, liens (fichiers réels de tests/fixtures)
```

Les parcours complets (navigateur, import de chaque format, audio avec un modèle simulé, liens, serveur PHP avec faux services) ont été vérifiés avec Playwright pendant le développement ; les scripts ne sont pas dans le dépôt.

**Ce qui n'a pas pu être testé de bout en bout :** le téléchargement réel du modèle Whisper depuis Internet (testé avec un modèle simulé), la transcription par un vrai service payant (testée avec un faux serveur), la lecture de vrais sites web (testée avec des sites simulés) et les liens Canva / Google / YouTube (volontairement non lus).

Le validateur détecte les erreurs de format, les doublons exacts et les réponses incohérentes ; il ne vérifie pas
l'exactitude factuelle des questions.

## ❤️ Contribuer

Les corrections de questions, nouveaux thèmes et mots à modérer sont les bienvenus. Amuse-toi bien ! 🎉
