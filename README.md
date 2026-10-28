# 🎮 Qui suis-je ? — quiz multijoueur

Un jeu de quiz **multijoueur en ligne** (FR / EN) qui tourne entièrement dans le navigateur : l'hôte crée une
partie, les autres rejoignent avec un code, et les questions s'enchaînent avec scores, pouvoirs, bonus, chat et podium.
Les joueurs sont reliés en pair-à-pair via [PeerJS](https://peerjs.com/) : **aucun serveur n'est nécessaire** pour jouer.

- **🎙️ Chat vocal à plusieurs** dans la salle (bouton en bas à gauche) : rien à installer, aucun serveur à toi — voir « Chat vocal » plus bas
- **🔗 Lien d'invitation** : l'hôte copie un lien `…/?room=123456`, le camarade l'ouvre et n'a plus qu'à entrer son prénom

- **157 thèmes**, environ **15 800 questions** de texte, plus **≈ 700 questions avec image ajoutées à tous les thèmes** (tirées à chaque partie) (4 niveaux : facile, moyen, difficile, impossible)
- Tes propres questions (gestionnaire intégré) et **des QCM générés à partir d'un cours** (PDF, Word, PowerPoint, ODP, Excel, EPUB, page web, audio, vidéo…), **avec les images du cours** pour les PDF
- **Modération stricte** du chat (voir plus bas)
- **Anti-triche progressif** : avertissements, malus, puis exclusion jusqu'à la fin de la partie
- **Questions avec image ou vidéo YouTube** (agrandissables), dont quatre thèmes dessinés par le jeu : questions en images (« de quelle couleur est le pull ? »), **Code de la route en images** (panneaux, feux, priorités à une intersection, rond-point, vitesse selon la météo), **Drapeaux en images** et **Lire l'heure** (horloge à aiguilles)
- **Statistiques et graphiques** de chaque partie (classement, évolution des scores, séries de bonnes réponses, réponses les plus rapides, répartition des temps, faits marquants, **analyses avancées** : course au classement, forme du moment, qui a mené la partie), historique des 12 dernières parties, export **PDF clair ou sombre** (tableaux + tous les graphiques) et CSV

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
  v43.css               voix off (réglages), justification de la réponse, horloge permanente et roue des bonus / malus
  voicechat.css         bouton et panneau du chat vocal
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
                        + image-more.js (8 thèmes de plus : 51 drapeaux, partition, dés, boussole, thermomètre, solides, chiffres romains, graphiques)
                        + image-mix.js (questions avec image ajoutées à TOUS les thèmes, sans rien remplacer)
  media/                media.js : validation et affichage des images / vidéos YouTube / illustrations SVG
  stats/                analysis.js (calculs), charts.js (graphiques SVG), pdf.js (export PDF), stats.js (capture + tableau de bord)
  voice/                voice.js : voix off (la question est lue à voix haute, synthèse vocale du navigateur)
  justif/               justif.js : justification après chaque réponse (bonne ou mauvaise)
  clock/                clock.js : horloge permanente HH:MM:SS en bas à gauche
  wheel/                wheel.js : roue des bonus et malus (entre deux manches)
  fix/                  scroll-top.js : chaque nouvelle question s'affiche en haut de la page
  invite/               invite.js : lien d'invitation (?room=123456) — bouton dans le salon, code pré-rempli à l'ouverture
  voicechat/            voicechat.js : chat vocal WebRTC en maillage via PeerJS (logique testable + interface)
php/
  qcm.php               OPTIONNEL — extraction, lecture de liens, transcription et mode IA côté serveur (voir plus bas)
tests/                  tests Node (modération, QCM, formats, banque, médias, questions en images, code de la route / drapeaux / horloges en images, statistiques, PDF, justifications / voix off)
```

Ce sont des scripts classiques (pas de bundler, pas de build) : **l'ordre des balises `<script>` de `index.html` compte**.

## 🎙️ Chat vocal (sans serveur, rien à installer)

Dans une salle (salon d'attente, partie, résultats), le bouton **🎙️** apparaît en bas à gauche. **« Rejoindre le vocal »** demande l'accès au micro (si tu refuses ou si tu n'as pas de micro, tu rejoins en **écoute seule**). Chacun peut **couper son micro**, **couper le son des autres** ou **quitter le vocal**, et voit qui parle (liseré vert). Un badge indique combien de personnes sont déjà au vocal.

**Comment ça marche.** Les participants se relient **directement** entre eux en WebRTC (`peer.call` de PeerJS) : chaque joueur appelle chaque autre, l'audio ne passe par aucun serveur. L'hôte tient la liste des participants au vocal et la diffuse sur le réseau du jeu ; pour une paire de joueurs, celui dont l'identifiant est le plus petit appelle (jamais deux appels pour la même paire). Les appels coupés sont relancés automatiquement. PeerJS ne sert qu'à la mise en relation (son serveur public gratuit, déjà utilisé par le jeu) : **aucun serveur n'est à installer ni à payer**.

**Limites à connaître.**
- Il faut une page en **HTTPS** pour que le navigateur accorde le micro (GitHub Pages l'est ; `http://localhost` aussi).
- Jusqu'à **8 joueurs** par salle (limite du jeu) : chacun maintient jusqu'à 7 liaisons audio, ce qui reste léger pour de la voix.
- Sur des réseaux très restrictifs (certains réseaux d'entreprise ou d'école), la liaison directe peut échouer ; PeerJS fournit des relais publics gratuits mais leur disponibilité n'est pas garantie.
- Utilise un **casque** pour éviter l'écho. Sur iPhone, touche l'écran si le navigateur demande d'activer le son.
- La logique est testée avec un faux réseau (`tests/voicechat.test.js`) et l'interface dans un mini-DOM (`tests/browserglue.test.js`) ; un essai avec de vrais micros sur deux appareils reste à faire après chaque mise en ligne.

## 🛡️ Modération du chat

Chaque message est analysé **avant l'envoi** (côté joueur) **et à la réception** (côté hôte, qui fait foi). Un message interdit est supprimé instantanément, y compris chez les joueurs qui l'auraient déjà reçu.

**Messages d'une seule lettre** (« a », « k », « 5 », « a ! »…) : supprimés **automatiquement** — jamais envoyés, jamais affichés chez les autres, jamais comptés dans les statistiques ; l'expéditeur voit « 🗑️ Message d'une seule lettre supprimé automatiquement » et la règle vaut aussi à la réception (hôte et joueurs) et pour la modification d'un message. Les mots de 2 lettres (« ok », « si ») passent.

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

**Une bonne réponse différente par question.** Le générateur n'utilise jamais deux fois la même bonne réponse dans un QCM (« Cellule » et « cellules » comptent pour une seule, accents et majuscules ignorés) et répartit les bonnes réponses sur les quatre positions (jamais trois fois de suite la même). Si le cours est trop court pour le nombre demandé, le jeu produit moins de questions et l'explique plutôt que de répéter les mêmes réponses — ajoute du texte pour en obtenir davantage. La même règle s'applique au mode IA.

**Jouer à plusieurs** : le bouton principal de la fenêtre d'options est **« 👥 Générer et jouer à plusieurs »** : il génère les questions, crée la salle avec le thème du cours seul (mode révision) et s'arrête dans le salon d'attente. Tu partages le **code** ou le **lien d'invitation** (« 🔗 Copier le lien d'invitation »), tes camarades rejoignent depuis n'importe quel appareil, puis tu lances la partie ; le **chat vocal** 🎙️ est disponible dans la salle.

**Jeu direct (seul)** : sur la fenêtre d'options, **« ▶️ Générer et jouer seul »** tire les questions du cours, les ajoute **toutes**, crée ta salle solo, ne garde que le thème du cours et lance la partie — **sans passer par la liste de relecture**. **« ✨ Générer et relire »** garde l'ancien parcours (décocher des questions avant d'ajouter) ; dans la relecture, la barre **« ▶️ Ajouter et jouer maintenant · 👥 Ajouter et réviser à plusieurs · ➕ Ajouter »** reste collée en bas de la fenêtre (plus besoin de défiler jusqu'au bout des 20 questions). Si la salle ne peut pas s'ouvrir (connexion), un bandeau rouge reste affiché jusqu'au clic sur OK.

1. choisis un **fichier** (voir le tableau), colle un **lien** ou colle le texte ;
2. donne un nom de thème et choisis le nombre de questions, **de 5 à 100** ;
3. vérifie l'aperçu (tu peux décocher des questions), puis ajoute au jeu : le thème est créé, sélectionné, et le nombre de manches réglé.

### Images du cours (PDF) — `js/qcm/images.js`
Pour un PDF, le jeu récupère les **images du cours** (schémas, photos, figures bitmap) et les **rattache aux questions** dont la phrase source se trouve sur la même page (3 images par page au plus, 12 au total, ≈ 640 px de large, compressées en JPEG). Les doublons, logos répétés, bandeaux et petites icônes sont écartés. Dans l'aperçu, chaque question concernée affiche sa miniature, et la case **« Inclure les images du cours »** permet de les retirer ; en partie, l'image s'affiche (agrandissable) avec la question, comme pour les questions avec image du gestionnaire. **Limites :** seules les images *bitmap* d'un PDF sont reprises (pas les figures vectorielles ni les images de Word / PowerPoint / ODP), et le mode IA n'en reçoit pas. Les tests utilisent pdf.js 6.x en local ; la page charge pdf.js 3.11.174 depuis cdnjs, dont l'extraction d'images n'a pas pu être exécutée ici (téléchargement bloqué).

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

### D'autres drapeaux et d'autres thèmes en images (`js/data/image-more.js`)
Huit thèmes de plus, dessinés par le jeu (SVG, aucune image extérieure) et régénérés à chaque partie :
- **🚩 Drapeaux du monde (suite)** — **51 drapeaux de plus** (Afrique, Amériques, Asie, Europe, Océanie : Sénégal, Canada, Brésil, Chine, Inde, Turquie, Royaume-Uni, Grèce, Australie…), schémas simplifiés sans armoiries. Trois types de questions : *À quel pays appartient ce drapeau ?*, *Quelle est la capitale du pays de ce drapeau ?* (sauf capitales ambiguës : Bolivie, Burundi, Israël, Afrique du Sud, Bénin) et *Lequel de ces quatre drapeaux (A à D) est celui de… ?*
- **🎼 Lire une partition** (nom d'une note en clé de sol, nombre de notes), **🎲 Dés et dominos** (somme, face opposée, total d'un domino), **🧭 Boussole et orientation**, **🌡️ Thermomètres**, **🔷 Solides et volumes** (nom, faces, sommets), **🏛️ Chiffres romains**, **📊 Lire un graphique** (barre la plus haute, valeur, total).
- La bonne réponse est calculée à partir des données qui servent à dessiner l'image ; `tests/more.test.js` la **relit dans le SVG** avec des tables indépendantes (noms, familles de couleurs de chaque drapeau, graduation du thermomètre, angle de la flèche, hauteur des barres…).

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
- **Analyses** (onglet dédié) : **course au classement** (place de chaque joueur après chaque question), **forme du moment** (% de bonnes réponses sur les 3 dernières questions) et **qui a mené la partie** (questions passées en tête, plus longue période en tête, nombre de changements de leader).
- **⏱️ Réactions** (onglet dédié des statistiques, et dans le PDF) : temps de réponse en profondeur — chiffres clés (**médiane**, moyenne, régularité ±, réponse la plus rapide / la plus lente, temps des bonnes contre les mauvaises), **temps de réaction question par question** (une courbe par joueur), **courbe de rapidité** (part des réponses données en moins de X secondes), **boîtes à moustaches** (plus rapide · 1ᵉʳ quartile · médiane · 3ᵉ quartile · plus lent, et tableau détaillé avec la **tendance** : accélère / ralentit), **rapidité contre précision** (nuage de points), **premier à répondre juste** (qui gagne le plus de questions de vitesse) et **temps moyen par difficulté et par thème**. Calculs dans `V40Analysis.reactionStats` (testés par `tests/reaction.test.js`).
- **✍️ Mots & lettres** (onglet dédié des statistiques, et dans le PDF) : un **rapport** (chiffres clés + phrases : lettre n° 1, mot n° 1, voyelles/consonnes, lettres jamais écrites, chat contre questions), le graphique des **lettres les plus écrites** (les 26 par défaut ou 10 ; ordre « du plus au moins écrit » ou **A → Z** ; accents ramenés à la lettre de base), **voyelles et consonnes**, les **mots les plus écrits** (Top 15 ou Top 30, hors mots courants « le, de, est… » sauf si tu affiches les « mots courants ») et un tableau **chat / questions**. Source au choix : **Tout**, **💬 Chat** ou **❓ Questions**. Bouton **⬇️ Rapport (.txt)** pour télécharger le rapport. Seuls des comptages sont conservés, jamais les messages ; les messages d'une seule lettre sont supprimés et ne comptent pas.
- **Copier-coller et enregistrer les graphiques** : chaque carte a un bouton **📋 Copier l'image** (le graphique est copié comme une image PNG, avec son titre, sa légende et le fond sombre comme à l'écran : à coller dans un message, un document, une présentation…) et **⬇️ PNG** (téléchargement). En vue « Tableau » (et pour la matrice « Qui a répondu quoi ? »), le bouton devient **📋 Copier le tableau** : texte à tabulations, à coller dans un tableur. Si le navigateur refuse l'accès au presse-papiers, l'image est téléchargée à la place. Tous les graphiques en barres partagent le même style que les courbes (grille, graduations, étiquettes ajustées).
- **Même style partout** : toutes les cartes de graphique ont la même disposition que « Évolution des scores » (titre, explication, rangée de boutons Graphique / Tableau / Copier l'image / PNG, légende en haut, puis le graphique) ; tous les graphiques ont une grille fine, des graduations (entières pour les comptages), un titre d'axe et des valeurs écrites au bout des barres. Le PDF reprend l'axe gradué sous chaque graphique en barres.
- **Bonus / Malus** : la **roue** y figure aussi (tuile « tirages », carte « Roue des bonus / malus », bilans en points).

Export **CSV** de toutes les réponses (compatible tableur) et export **📄 PDF**, au choix en **fond clair** (impression) ou en **fond sombre** (écran) via les boutons « 📄 PDF clair » et « 🌙 PDF sombre » : classement, **tous les graphiques de l'écran** en vectoriel (évolution des scores, course au classement, forme du moment, qui a mené, bonnes / mauvaises réponses, séries, temps, réussite par question, thème / difficulté, roue, malus reçus, points gagnés / perdus, bilan net, types de pouvoirs, **qui vise qui**, cumuls), grille joueurs × questions, détail de chaque question, infractions et tableau « Bonus et malus ». Seul l'historique multi-parties n'y figure pas (il n'est pas dans le journal d'une partie). Le PDF est généré dans le navigateur, **sans bibliothèque externe ni connexion**, en vectoriel (net à tout zoom, texte sélectionnable) ; les emojis, absents de la police intégrée, en sont retirés. Les deux palettes de séries sont validées pour leur fond et les daltoniens ; au-delà de 8 joueurs, les courbes montrent les 8 premiers arrivés et les autres figurent dans les tableaux.

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

## 🕒 Horloge permanente (`js/clock/clock.js`)
L'heure **HH:MM:SS** (24 h, en gras) s'affiche **en bas à gauche, sur tous les écrans** : accueil, salons, question, correction, résultats, fenêtres ouvertes. Elle se place juste au-dessus du bouton « Son ON / OFF », ne capte jamais un clic et se recale sur le début de chaque seconde (et au retour sur l'onglet).
C'est l'heure **de l'appareil de chaque joueur** (pas une heure serveur : si l'horloge d'un téléphone est déréglée, elle l'est aussi à l'écran). Elle n'apparaît pas à l'impression.

## 🎡 Roue des bonus et malus (`js/wheel/wheel.js`)
Une roue tourne **entre deux questions**. **L'hôte choisit dans le salon d'attente (« 🎡 Roue des bonus / malus »)** : **moments fixes** (après la 3e, la 6e, la 9e… manche, par défaut), **moments aléatoires** (de 1 à 6 roues à des manches tirées au sort au début de la partie, non annoncées, jamais avant la 2e manche ni après la dernière, jamais deux de suite) ou **désactivée**. Le choix est gardé dans le navigateur de l'hôte et figé au début de la partie ; les joueurs le subissent comme le reste des réglages de l'hôte. Jamais après la dernière manche ; pas de roue dans une partie de 3 manches ou moins en mode fixe. **Chaque joueur tire sa propre case en même temps** : l'hôte tire au sort (8 cases, toutes équiprobables : la taille d'une case est sa vraie probabilité) puis diffuse le résultat ; chacun voit la roue s'arrêter sur SA case, puis la liste des résultats de tous. La question suivante démarre juste après (≈ 9,5 s).

| Case | Effet |
|---|---|
| 💎 +300 · 💰 +1000 (jackpot) | points ajoutés |
| ⚡ ×2 | points doublés sur la prochaine question |
| 🛡️ Bouclier | bloque le prochain malus |
| 💸 −200 · 💥 −500 | points retirés (jamais sous 0 : « rien à perdre » si le score est à 0) |
| 🏛️ −15 % | impôt de 15 % du score (arrondi vers le bas) |
| 💔 Série | série de bonnes réponses remise à zéro |

Un bouclier déjà obtenu annule le malus et se consomme. Les effets sont appliqués **uniquement par l'hôte** ; les joueurs ne font qu'afficher (messages réseau bornés et nettoyés). Chaque tirage est noté dans le journal de la partie (type `w_…`, le joueur est sa propre cible) : la roue apparaît donc dans l'onglet « Bonus / Malus » et dans le PDF, **comptée à part** des pouvoirs lancés / visés mais incluse dans les points gagnés / perdus et le bilan net.

## ➕ Ajouter des questions ou un thème

Un thème = un fichier `js/data/bank/NNN-nom.js` :

```js
V35_BANK["🎻 Mon thème"]=[
"f|La question ?|La bonne réponse|Faux 1|Faux 2|Faux 3",   // f = facile, m = moyen, d = difficile, i = impossible
];
```

Ajoute ensuite la balise `<script src="js/data/bank/NNN-nom.js"></script>` dans `index.html`, **avant** `999-register.js`.
La bonne réponse est toujours en premier dans le fichier : le jeu mélange les réponses à l'affichage.

## 📚 Mode révision (QCM de cours) — `js/review/review.js`
Un QCM généré depuis un cours se joue « comme les parties d'avant » (combos, classement…) mais en **mode révision** :

- **pas de roue** des bonus / malus ;
- **que des bonus** : un combo ne propose que le bonus (la carte « Malus » est masquée) et **l'hôte l'impose** même si un joueur envoie autre chose ; la pénalité de −200 points après 2 erreurs d'affilée et la question « impossible » (÷4) sont aussi désactivées ;
- **justification détaillée** à chaque réponse, tirée du cours : le **passage** (la phrase source et ses voisines du même paragraphe) avec la bonne réponse surlignée, la **page** et le titre du cours (PDF), l'écart chiffré si les réponses sont des nombres, **pourquoi ta réponse ne convient pas** (« ne figure pas dans ce passage » / « apparaît dans le passage mais ne répond pas à la question »), et un conseil « À réviser : page N ». La voix off lit la phrase du cours. Cette justification s'affiche pour toute question issue d'un cours, même hors mode révision.

**Réviser à plusieurs** : **« 👥 Ajouter et réviser à plusieurs »** (ou « 👥 Réviser à plusieurs » après l'ajout) crée la salle, ne garde que le thème du cours, règle les manches… et **ne lance pas** la partie : tu donnes le code à tes camarades, ils rejoignent depuis l'accueil, puis tu lances. Tout le monde reçoit les mêmes questions une par une, avec le mode révision (bonus seulement, justification détaillée du cours) et le classement de la salle.

**Jouer tout de suite** : à la fin de la génération, **« ▶️ Ajouter et jouer maintenant »** (ou « ▶️ Jouer maintenant » après l'ajout) crée une salle solo, ne garde **que le thème du cours**, règle le nombre de manches sur le nombre de questions ajoutées et lance la partie : les questions arrivent **une par une**, avec le mode révision automatique. (Nécessite la connexion au serveur PeerJS, comme toute salle.)

Réglage de l'hôte dans le salon (« 📚 Mode révision ») : **Automatique** (par défaut : révision si *toutes* les questions de la partie viennent d'un cours), **Activé** ou **Désactivé**. La décision est prise au début de la partie puis diffusée aux joueurs. Le passage est enregistré avec chaque question (≈ 700 octets) ; les questions générées avant cette version n'ont pas de passage et gardent la justification habituelle. Les modes de jeu explicites (Survie, etc.) ne sont pas modifiés. Pas de page affichée pour un cours qui n'est pas un PDF.

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
node tests/more.test.js                  # 8 nouveaux thèmes en images : 51 drapeaux (couleurs), notes, dés, boussole, thermomètre, solides, chiffres romains, graphiques — réponse relue sur le dessin
node tests/chat.test.js                  # chat : messages d'une seule lettre supprimés (envoi, relais de l'hôte, réception, modification)
node tests/mix.test.js                   # images dans tous les thèmes : chaque réponse est recalculée en relisant le dessin
node tests/stats.test.js                 # calculs de statistiques, historique, CSV, journaux malveillants
node tests/pdf.test.js                   # export PDF clair / sombre : structure du fichier, métriques, caractères, pagination, un équivalent PDF pour chaque graphique d'écran
node tests/qcmimages.test.js             # images du cours : rattachement aux questions, doublons, plafonds, tri des figures
node tests/wheel.test.js                 # roue : moments de déclenchement, effet exact de chaque case, bouclier, plafonds, équiprobabilité, messages réseau
node tests/voicechat.test.js             # chat vocal : qui appelle qui, annuaire de l'hôte, départs, arrivées tardives, coupures, messages invalides (faux réseau)
node tests/browserglue.test.js           # chat vocal + lien d'invitation exécutés dans un mini-DOM (bouton, panneau, handleData, resetConnection, XSS)
node tests/invite.test.js                # lien d'invitation : lecture et construction de ?room=123456
node tests/review.test.js                # mode révision : décision automatique, bonus imposé, passage du cours, justification détaillée, leçons piégées
node tests/reaction.test.js              # temps de réaction : médiane, quartiles, régularité, tendance, premier à répondre juste, courbe de rapidité, groupes, robustesse
node tests/text.test.js                  # lettres et mots les plus écrits : découpage, comptages du chat (bornés, sans message en clair), sources, mots, rapport (phrases, .txt) courants, PDF clair / sombre
node tests/clock.test.js                 # horloge : format HH:MM:SS recalculé autrement (20 000 dates, changements d'heure), recalage sur la seconde
node tests/justif.test.js                # justifications (bonne / mauvaise / temps écoulé, écarts, confusions, HTML échappé) et texte lu par la voix off
NODE_PATH=<dossier de jszip> node tests/formats.test.js   # PPTX, ODP, XLSX, ODS, EPUB, RTF, HTML, sous-titres, liens (fichiers réels de tests/fixtures)
```

Les parcours complets (navigateur, import de chaque format, audio avec un modèle simulé, liens, serveur PHP avec faux services) ont été vérifiés avec Playwright pendant le développement ; les scripts ne sont pas dans le dépôt.

**Ce qui n'a pas pu être testé de bout en bout :** le téléchargement réel du modèle Whisper depuis Internet (testé avec un modèle simulé), la transcription par un vrai service payant (testée avec un faux serveur), la lecture de vrais sites web (testée avec des sites simulés) et les liens Canva / Google / YouTube (volontairement non lus).

Le validateur détecte les erreurs de format, les doublons exacts et les réponses incohérentes ; il ne vérifie pas
l'exactitude factuelle des questions.

## ❤️ Contribuer

Les corrections de questions, nouveaux thèmes et mots à modérer sont les bienvenus. Amuse-toi bien ! 🎉
