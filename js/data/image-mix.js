/* =============================================================================
   Des images dans TOUS les thèmes, « de temps en temps », sans remplacer aucune question existante.
   Trois mécanismes, régénérés à chaque partie :
   1. Questions-images AJOUTÉES aux thèmes existants (≈ 12 % de la taille du thème, entre 3 et 8) :
      • pictogrammes (« Quel est cet animal ? », « Quel instrument ? »…) — un émoji affiché en grand ;
      • devinettes en émojis (films, Disney, contes, séries, manga, super-héros…) ;
      • drapeaux, capitales, horloges, panneaux routiers, polygones, fractions, opérations (réutilisent les
        générateurs de road-questions.js et image-themes.js) ;
      la bonne réponse vient toujours des données qui servent à DESSINER l'image (tests/mix.test.js la relit).
   2. Pour les thèmes sans contenu visuel naturel (histoire, droit, langues…), quelques questions existantes
      reçoivent une illustration d'ambiance (émoji du thème sur fond coloré). Elle est purement décorative :
      elle ne donne ni ne contredit aucune réponse, et elle est retirée puis retirée au sort à chaque partie.
   Les émojis s'affichent avec la police d'émojis de l'appareil du joueur.
   ============================================================================= */
var V42Mix = (function () {
  "use strict";
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(a, k) { return shuffle(a).slice(0, k); }
  var FONT = "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Twemoji Mozilla, sans-serif";
  function open(w, h) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">'; }
  function mk(theme, kind, diff, text, answers, svg, correction) {
    return { category: theme, difficulty: diff, question: text, answers: answers, correct: 0, correction: correction, media: { type: "svg", svg: svg }, source: "officiel", v35: true, v42Mix: true, kind: kind };
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

  /* ---------- 1. Pictogrammes : thème → { q: question, items: [[émoji, nom], …] } ---------- */
  var SETS = {};
  function S(theme, q, list) {
    SETS[theme] = { q: q, items: list.split("|").map(function (x) { var i = x.indexOf(" "); return [x.slice(0, i), x.slice(i + 1)]; }) };
  }
  S("🦁 Animaux", "Quel est cet animal ?", "🦁 Un lion|🐘 Un éléphant|🦒 Une girafe|🦊 Un renard|🐼 Un panda|🐨 Un koala|🦘 Un kangourou|🐫 Un chameau|🦓 Un zèbre|🦔 Un hérisson|🐊 Un crocodile|🦍 Un gorille|🦦 Une loutre|🐢 Une tortue|🐍 Un serpent|🦛 Un hippopotame|🦏 Un rhinocéros|🐺 Un loup|🦌 Un cerf|🐅 Un tigre");
  S("🦈 Animaux marins", "Quel animal marin est-ce ?", "🐋 Une baleine|🦈 Un requin|🐙 Une pieuvre|🦀 Un crabe|🐬 Un dauphin|🦑 Un calmar|🦞 Un homard|🐡 Un poisson-globe|🦭 Un phoque|🦐 Une crevette|🐚 Un coquillage");
  S("🦅 Oiseaux", "Quel oiseau est-ce ?", "🦅 Un aigle|🦉 Un hibou|🦆 Un canard|🦜 Un perroquet|🦢 Un cygne|🐧 Un manchot|🦩 Un flamant rose|🦚 Un paon|🐓 Un coq|🕊️ Une colombe|🦃 Une dinde");
  S("🐝 Insectes & petites bêtes", "Quelle petite bête est-ce ?", "🐝 Une abeille|🐞 Une coccinelle|🦋 Un papillon|🐜 Une fourmi|🕷️ Une araignée|🐌 Un escargot|🦗 Un criquet|🪲 Un scarabée|🐛 Une chenille|🦟 Un moustique|🪰 Une mouche");
  S("🌳 Arbres & plantes", "Quelle plante est-ce ?", "🌵 Un cactus|🌴 Un palmier|🌲 Un sapin|🌻 Un tournesol|🌹 Une rose|🍄 Un champignon|🌷 Une tulipe|🌾 Du blé|🍀 Un trèfle|🪴 Une plante en pot");
  S("🍎 Fruits & légumes", "Quel fruit ou légume est-ce ?", "🍎 Une pomme|🍌 Une banane|🍇 Du raisin|🍓 Une fraise|🍉 Une pastèque|🍍 Un ananas|🥕 Une carotte|🍅 Une tomate|🥦 Du brocoli|🌽 Du maïs|🍆 Une aubergine|🥔 Une pomme de terre|🍋 Un citron|🥝 Un kiwi|🍒 Des cerises|🍑 Une pêche|🥑 Un avocat|🌶️ Un piment|🧅 Un oignon|🥒 Un concombre|🥥 Une noix de coco|🍐 Une poire");
  S("🍕 Cuisine", "Quel plat ou aliment est-ce ?", "🍕 Une pizza|🍔 Un hamburger|🌭 Un hot-dog|🍣 Un sushi|🥖 Une baguette|🧀 Du fromage|🍜 Un bol de nouilles|🥗 Une salade|🌮 Un taco|🍟 Des frites|🥞 Des pancakes|🍳 Un œuf au plat|🥩 Un steak|🍝 Des spaghettis|🥐 Un croissant|🥨 Un bretzel|🧇 Une gaufre");
  S("🥐 Pâtisserie & desserts", "Quel dessert ou quelle viennoiserie est-ce ?", "🥐 Un croissant|🍰 Une part de gâteau|🍩 Un donut|🍪 Un cookie|🍫 Du chocolat|🍦 Une glace|🧁 Un cupcake|🥧 Une tarte|🍮 Un flan|🍭 Une sucette|🍬 Un bonbon|🎂 Un gâteau d'anniversaire|🍯 Du miel|🧇 Une gaufre");
  S("🎻 Instruments de musique", "Quel instrument de musique est-ce ?", "🎻 Un violon|🎸 Une guitare|🥁 Une batterie|🎺 Une trompette|🎹 Un piano|🎷 Un saxophone|🪕 Un banjo|🪗 Un accordéon");
  S("🎵 Musique", "Quel objet lié à la musique est-ce ?", "🎤 Un micro|🎧 Un casque audio|📻 Une radio|🎼 Une partition|💿 Un CD|🎸 Une guitare|🎹 Un piano|🥁 Une batterie");
  S("🎼 Musique classique", "Quel instrument ou symbole de la musique classique est-ce ?", "🎻 Un violon|🎹 Un piano|🪈 Une flûte|🎼 Une partition|🎺 Une trompette|🎷 Un saxophone");
  S("⚽ Sport", "Quel sport est représenté ?", "⚽ Le football|🏀 Le basket-ball|🏈 Le football américain|⚾ Le baseball|🎾 Le tennis|🏐 Le volley-ball|🏉 Le rugby|🎱 Le billard|🏓 Le tennis de table|🏸 Le badminton|🥊 La boxe|⛳ Le golf|🏒 Le hockey sur glace|🏹 Le tir à l'arc|🏊 La natation|🚴 Le cyclisme|⛸️ Le patinage|🏄 Le surf");
  S("⚽ Football", "Quel élément du football est représenté ?", "⚽ Le ballon|🥅 Le but|🟨 Le carton jaune|🟥 Le carton rouge|🏆 Le trophée|🧤 Les gants de gardien");
  S("🏅 Jeux olympiques", "Que représente cet émoji aux Jeux olympiques ?", "🥇 La médaille d'or|🥈 La médaille d'argent|🥉 La médaille de bronze|🔥 La flamme olympique|🏟️ Le stade|🏹 Le tir à l'arc");
  S("🥋 Sports de combat", "Quel sport de combat est représenté ?", "🥊 La boxe|🥋 Les arts martiaux (judo, karaté)|🤺 L'escrime|🤼 La lutte");
  S("⛷️ Sports d'hiver", "Quel sport d'hiver est représenté ?", "⛷️ Le ski alpin|🏂 Le snowboard|⛸️ Le patinage|🏒 Le hockey sur glace|🛷 La luge|🥌 Le curling");
  S("🎲 Jeux de société", "Quel jeu ou quel objet de jeu est-ce ?", "♟️ Les échecs|🎲 Un dé|🃏 Un jeu de cartes|🧩 Un puzzle|🎯 Des fléchettes|🀄 Le mah-jong");
  S("🎮 Jeux vidéo", "Quel objet du jeu vidéo est-ce ?", "🎮 Une manette|🕹️ Un joystick|👾 Un alien pixelisé (Space Invaders)|🥽 Un casque de réalité virtuelle");
  S("🚆 Transports", "Quel moyen de transport est-ce ?", "🚆 Un train|🚌 Un bus|🚲 Un vélo|🚢 Un paquebot|✈️ Un avion|🚁 Un hélicoptère|🚇 Un métro|🚋 Un tramway|🛴 Une trottinette|🚀 Une fusée|🚜 Un tracteur|🛵 Un scooter|🚕 Un taxi|🚂 Une locomotive à vapeur|🏍️ Une moto");
  S("✈️ Aviation", "Quel élément de l'aviation est-ce ?", "✈️ Un avion de ligne|🚁 Un hélicoptère|🛩️ Un avion léger|🪂 Un parachute|🛫 Un décollage|🛬 Un atterrissage|🚀 Une fusée");
  S("🚢 Océans & Navigation", "Quel élément de la navigation est-ce ?", "🚢 Un paquebot|⛵ Un voilier|🛶 Un canoë|⚓ Une ancre|🧭 Une boussole|🚤 Un hors-bord|🌊 Une vague");
  S("🚗 Automobile", "Quel véhicule ou quel objet de l'automobile est-ce ?", "🚗 Une voiture|🚓 Une voiture de police|🚑 Une ambulance|🚒 Un camion de pompiers|🚚 Un camion de livraison|🚛 Un semi-remorque|🏎️ Une voiture de course|⛽ Une pompe à essence|🚕 Un taxi|🛞 Une roue|🔧 Une clé à molette");
  S("🧬 Corps humain", "Quelle partie du corps est-ce ?", "🧠 Le cerveau|🫀 Le cœur|🫁 Les poumons|🦴 Un os|🦷 Une dent|👁️ Un œil|👂 Une oreille|👃 Le nez|🦶 Le pied|🖐️ La main|👅 La langue|🦵 La jambe");
  S("🔬 Médecine & Santé", "Quel objet médical est-ce ?", "💉 Une seringue|💊 Un médicament|🩺 Un stéthoscope|🩹 Un pansement|🌡️ Un thermomètre|🏥 Un hôpital|🧬 L'ADN|🧪 Une éprouvette|🔬 Un microscope");
  S("🌦️ Météo & Climat", "Quel phénomène météo est représenté ?", "☀️ Le soleil|🌧️ La pluie|⛈️ L'orage|❄️ La neige|🌫️ Le brouillard|🌪️ La tornade|🌈 L'arc-en-ciel|💨 Le vent|☁️ Les nuages");
  S("🪐 Espace", "Quel objet de l'espace est-ce ?", "🌍 La Terre|🌕 La pleine lune|☀️ Le Soleil|🪐 Saturne (planète à anneaux)|☄️ Une comète|⭐ Une étoile|🌌 Une galaxie|🌑 La nouvelle lune");
  S("🔭 Astronomie", "Quel objet ou instrument d'astronomie est-ce ?", "🔭 Un télescope|🛰️ Un satellite|☄️ Une comète|🌕 La pleine lune|🌑 La nouvelle lune|🌌 Une galaxie|🪐 Saturne");
  S("🧑‍🚀 Conquête spatiale", "Quel élément de la conquête spatiale est-ce ?", "🚀 Une fusée|🛰️ Un satellite|🧑‍🚀 Un astronaute|🌕 La Lune|🔭 Un télescope|☄️ Une comète");
  S("🧳 Voyages", "Quel objet ou lieu de voyage est-ce ?", "✈️ Un avion|🧳 Une valise|🗺️ Une carte|🏨 Un hôtel|🏖️ Une plage|🎫 Un billet|⛺ Une tente|🚉 Une gare|🧭 Une boussole");
  S("🗼 Monuments du monde", "Quel monument ou quel édifice est-ce ?", "🗽 La statue de la Liberté|🗼 La tour de Tokyo|🗿 Un moai (île de Pâques)|🕌 Une mosquée|⛩️ Un torii japonais|🏰 Un château|🛕 Un temple hindou|🏯 Un château japonais|⛪ Une église|🕍 Une synagogue");
  S("🎃 Fêtes & traditions", "À quelle fête associe-t-on cet émoji ?", "🎃 Halloween|🎄 Noël|🐣 Pâques|🧧 Le Nouvel An chinois|🪔 Diwali|🦃 Thanksgiving|🎂 Un anniversaire");
  S("⚡ Mythologie", "À quel dieu ou personnage mythologique associe-t-on ce symbole ?", "🔱 Poséidon (Neptune)|⚡ Zeus (Jupiter)|🔨 Thor|🏹 Éros (Cupidon)");
  S("🦖 Dinosaures & préhistoire", "Quel élément de la préhistoire est-ce ?", "🦖 Un tyrannosaure|🦕 Un diplodocus (sauropode)|🦣 Un mammouth|☄️ Une météorite|🌋 Un volcan|🦴 Un os fossilisé");
  S("🌿 Nature", "Quel élément de la nature est-ce ?", "🌋 Un volcan|🏔️ Une montagne|🏜️ Un désert|🌊 Une vague|🌅 Un lever de soleil|🌳 Un arbre|🍃 Des feuilles|🌵 Un cactus");
  S("🌱 Environnement & Écologie", "Que représente ce symbole ?", "♻️ Le recyclage|🌍 La planète Terre|💧 Une goutte d'eau|🗑️ Une poubelle|☀️ L'énergie solaire|🌳 Un arbre");
  S("🌾 Agriculture & Alimentation", "Quel produit ou animal de la ferme est-ce ?", "🌾 Du blé|🌽 Du maïs|🥔 Une pomme de terre|🍇 Du raisin|🐄 Une vache|🐑 Un mouton|🐖 Un cochon|🐔 Une poule|🚜 Un tracteur|🍯 Du miel|🥛 Du lait");
  S("💻 Informatique", "Quel matériel informatique est-ce ?", "🖱️ Une souris|⌨️ Un clavier|🖥️ Un ordinateur de bureau|💾 Une disquette|🖨️ Une imprimante|💿 Un CD|🔌 Une prise électrique|🔋 Une batterie");
  S("📱 Technologie", "Quel appareil est-ce ?", "📱 Un smartphone|⌚ Une montre|📷 Un appareil photo|🎧 Un casque audio|📺 Une télévision|🔋 Une batterie|💡 Une ampoule|📡 Une antenne parabolique|🕹️ Un joystick");
  S("🧪 Inventions", "Quelle invention est représentée ?", "💡 L'ampoule|🔭 Le télescope|🧭 La boussole|⌚ La montre|📞 Le téléphone|⏰ Le réveil|🔦 La lampe torche|🧲 L'aimant");
  S("⚗️ Chimie", "Quel élément du laboratoire de chimie est-ce ?", "⚗️ Un alambic|🧪 Un tube à essai|🔬 Un microscope|🧲 Un aimant|⚛️ Un atome|🔥 Le feu|☢️ La radioactivité");
  S("🧲 Physique", "Quel élément de la physique est représenté ?", "⚛️ Un atome|🧲 Un aimant|💡 Une ampoule|🔋 Une pile|🔭 Un télescope|⚡ L'électricité|🌡️ La température");
  S("🎨 Art", "Quel objet d'artiste est-ce ?", "🎨 Une palette de peinture|🖌️ Un pinceau|🖼️ Un tableau|🗿 Une sculpture|✏️ Un crayon|🎭 Des masques de théâtre");
  S("🎭 Théâtre & Spectacle", "Quel élément du spectacle est-ce ?", "🎭 Des masques de théâtre|🎪 Un chapiteau de cirque|🎤 Un micro|🎬 Un clap de cinéma|🎟️ Un billet|🎩 Un chapeau de magicien|🤡 Un clown");
  S("📸 Photographie", "Quel matériel de photo ou de vidéo est-ce ?", "📷 Un appareil photo|🎞️ Une pellicule|📹 Une caméra vidéo|🖼️ Un cadre|🔍 Une loupe");
  S("🏺 Archéologie", "Quel objet d'archéologue est-ce ?", "🏺 Une amphore|🗿 Un moai|🦴 Un os|⛏️ Une pioche|🧭 Une boussole|🪙 Une pièce|🗺️ Une carte|📜 Un parchemin");
  S("💰 Économie & Argent", "Que représente cet émoji ?", "💶 Un billet en euros|💵 Un billet en dollars|💷 Un billet en livres|💴 Un billet en yens|🪙 Une pièce|🏦 Une banque|💳 Une carte bancaire|📈 Une hausse|📉 Une baisse|🏧 Un distributeur de billets");
  S("⚖️ Droit & Justice", "Quel symbole de la justice est-ce ?", "⚖️ La balance de la justice|🔨 Le marteau du juge|📜 La loi (parchemin)|🏛️ Un tribunal|🔒 Un cadenas|🚔 Une voiture de police");
  S("🛡️ Cybersécurité", "Quel symbole de la cybersécurité est-ce ?", "🔒 Un cadenas|🔑 Une clé|🛡️ Un bouclier|🕵️ Un espion|🦠 Un virus|📧 Un courriel");
  S("🔐 Cybersécurité", "Quel symbole de la cybersécurité est-ce ?", "🔒 Un cadenas|🔑 Une clé|🛡️ Un bouclier|🕵️ Un espion|🦠 Un virus|📧 Un courriel");
  S("🤖 Intelligence artificielle", "Quel symbole de l'intelligence artificielle est-ce ?", "🤖 Un robot|🧠 Un cerveau|💬 Une bulle de discussion|🦾 Un bras robotique|👁️ Un œil (vision)|📊 Un graphique");
  S("🌐 Web", "Quel symbole du web est-ce ?", "🌐 Un globe (Internet)|📧 Un courriel|🔗 Un lien|🔍 Une recherche|💬 Un message|📶 Un réseau");
  S("😂 Internet & Mèmes", "Quel émoji est-ce ?", "😂 Le visage qui rit aux larmes|🙃 Le visage à l'envers|😎 Le visage avec lunettes de soleil|🤔 Le visage qui réfléchit|🤯 La tête qui explose|🙄 Les yeux au ciel|😱 Le visage qui crie de peur");
  S("🏠 Vie quotidienne & Pratique", "Quel objet du quotidien est-ce ?", "🔑 Une clé|🛏️ Un lit|🚿 Une douche|🧹 Un balai|🍽️ Une assiette|☎️ Un téléphone fixe|🔌 Une prise|💡 Une ampoule|🧺 Un panier à linge|🪥 Une brosse à dents");
  S("👗 Mode & Tendances", "Quel vêtement ou accessoire est-ce ?", "👗 Une robe|👔 Une cravate|👟 Une basket|👒 Un chapeau de paille|🧣 Une écharpe|🧤 Des gants|👜 Un sac à main|👓 Des lunettes|👠 Un talon|👖 Un jean|🧢 Une casquette");
  S("🏗️ Architecture", "Quel type de construction est-ce ?", "🏰 Un château|🏛️ Un édifice à colonnes|⛪ Une église|🕌 Une mosquée|🏗️ Une grue de chantier|🌉 Un pont|🏠 Une maison|🗼 Une tour");
  S("🏭 Industrie & Ingénierie", "Quel élément industriel est-ce ?", "🏭 Une usine|⚙️ Un engrenage|🔧 Une clé à molette|🔩 Un boulon|🏗️ Une grue|🛠️ Des outils|🧰 Une boîte à outils");
  S("💼 Métiers", "Quel métier associe-t-on à cet émoji ?", "🩺 Médecin|✂️ Coiffeur|🚜 Agriculteur|🖌️ Peintre|🎣 Pêcheur|🚒 Pompier");
  S("🎓 Éducation & Apprentissage", "Quel objet scolaire est-ce ?", "📚 Des livres|✏️ Un crayon|📏 Une règle|🎒 Un cartable|🧮 Un boulier|🖊️ Un stylo|📝 Un cahier");
  S("📚 Littérature", "Quel objet lié à l'écriture ou à la lecture est-ce ?", "📖 Un livre ouvert|✒️ Une plume|📜 Un parchemin|🖋️ Un stylo plume|📰 Un journal");
  S("📰 Actualités & Monde", "Quel média ou quel outil de l'information est-ce ?", "📰 Un journal|📺 Une télévision|📻 Une radio|🎙️ Un micro de studio|📡 Une antenne|📢 Un mégaphone");
  S("🤝 Communication & Médias", "Quel média ou quel outil de communication est-ce ?", "📰 Un journal|📺 Une télévision|📻 Une radio|🎙️ Un micro de studio|📡 Une antenne|📢 Un mégaphone|📧 Un courriel");
  S("🧩 Psychologie", "Quelle émotion est représentée ?", "😊 La joie|😢 La tristesse|😡 La colère|😨 La peur|🤢 Le dégoût|😲 La surprise");
  S("🧛 Légendes & Monstres", "Quelle créature légendaire est-ce ?", "🧛 Un vampire|🧟 Un zombie|🧜 Une sirène|🧚 Une fée|🧞 Un génie|🐉 Un dragon|🦄 Une licorne|👻 Un fantôme");
  S("🐉 Créatures mythiques", "Quelle créature mythique est-ce ?", "🐉 Un dragon|🦄 Une licorne|🧜 Une sirène|🧚 Une fée|🧞 Un génie|🧛 Un vampire");
  S("🦄 Fantasy", "Quel élément du monde fantasy est-ce ?", "🧙 Un magicien|🧝 Un elfe|🐉 Un dragon|🧚 Une fée|🏰 Un château fort|⚔️ Une épée|🛡️ Un bouclier");
  S("🧙 Harry Potter", "À quoi ou à qui associe-t-on cet émoji dans Harry Potter ?", "🦁 La maison Gryffondor|🐍 La maison Serpentard|🦡 La maison Poufsouffle|🦅 La maison Serdaigle|🧹 Un balai de Quidditch|🪄 Une baguette magique|🦉 Hedwige");
  S("🦸 Super-héros", "Quel super-héros ce symbole évoque-t-il ?", "🕷️ Spider-Man|🦇 Batman|🔨 Thor|🛡️ Captain America|🐜 Ant-Man|🔱 Aquaman");
  S("⚡ Pokémon", "Quel Pokémon ces émojis évoquent-ils ?", "⚡🐭 Pikachu|🔥🐉 Dracaufeu|💧🐢 Carapuce|🌱🐸 Bulbizarre|💤🐻 Ronflex");
  S("🎬 Cinéma", "Quel film ces émojis évoquent-ils ?", "🦁👑 Le Roi lion|🚢🧊 Titanic|🦈🌊 Les Dents de la mer|🦖🌴 Jurassic Park|👽🚲 E.T. l'extra-terrestre|🐠🔍 Le Monde de Nemo|❄️⛄ La Reine des neiges|🧸🤠 Toy Story|🐀🍲 Ratatouille|🤖🌱 WALL-E|⭐⚔️ Star Wars");
  S("🧸 Disney & Pixar", "Quel film Disney ou Pixar ces émojis évoquent-ils ?", "🦁👑 Le Roi lion|❄️⛄ La Reine des neiges|🧸🤠 Toy Story|🐠🔍 Le Monde de Nemo|🏎️⚡ Cars|🧞🪔 Aladdin|🌹👸 La Belle et la Bête|🍎👸 Blanche-Neige|🐘🎪 Dumbo|🌊🛶 Vaiana|🎈🏠 Là-haut|💀🎸 Coco|🎃👠 Cendrillon");
  S("📖 Contes & fables", "Quel conte ou quelle fable ces émojis évoquent-ils ?", "🧒🔴🐺 Le Petit Chaperon rouge|🍎👸 Blanche-Neige|🎃👠 Cendrillon|🐷🐷🐷🐺 Les Trois Petits Cochons|🏠🍬 Hansel et Gretel|🐱🥾 Le Chat botté|👸💤 La Belle au bois dormant|🦆🦢 Le Vilain Petit Canard|🧜🌊 La Petite Sirène|🦗🐜 La Cigale et la Fourmi|🐦🦊🧀 Le Corbeau et le Renard|🐇🐢 Le Lièvre et la Tortue");
  S("📺 Séries TV", "Quelle série ces émojis évoquent-ils ?", "🐉⚔️ Game of Thrones|☕🛋️ Friends|🎭💰 La Casa de Papel|🔴🟢 Squid Game|🍩🟡 Les Simpson|🧟🚶 The Walking Dead");
  S("🎌 Manga & Animation", "Quel manga ou quel dessin animé ces émojis évoquent-ils ?", "🐉🔮 Dragon Ball|🍥🦊 Naruto|🏴‍☠️👒 One Piece|⚡🐭 Pokémon|🌙🌸 Sailor Moon|🐱🤖 Doraemon");

  var BALLS = "🎾 Une balle de tennis|🏀 Un ballon de basket|🏉 Un ballon de rugby|⚽ Un ballon de football|🏐 Un ballon de volley|⚾ Une balle de baseball";
  S("🎾 Tennis", "Quelle balle ou quel ballon est-ce ?", BALLS);
  S("🏀 Basketball", "Quelle balle ou quel ballon est-ce ?", BALLS);
  S("🏉 Rugby", "Quelle balle ou quel ballon est-ce ?", BALLS);
  S("🏃 Athlétisme", "Quelle discipline sportive est représentée ?", "🏃 La course à pied|🏋️ L'haltérophilie|🤸 La gymnastique|🏊 La natation|🚴 Le cyclisme|🧗 L'escalade");
  S("🏊 Natation", "Quel élément du monde aquatique est-ce ?", "🏊 Un nageur|🤽 Du water-polo|🤿 Un masque de plongée|🩱 Un maillot de bain|🌊 Une vague|🛟 Une bouée");
  S("🚴 Cyclisme & Tour de France", "Quel élément du cyclisme est-ce ?", "🚴 Un cycliste|🚲 Un vélo|🚵 Un vététiste|🏆 Un trophée|⏱️ Un chronomètre|⛰️ Une montagne");
  S("🏎️ Formule 1", "Quel élément de la course automobile est-ce ?", "🏎️ Une voiture de course|🏁 Le drapeau à damier|🛞 Un pneu|⏱️ Un chronomètre|🏆 Un trophée|⛽ Une pompe à essence");
  S("🎧 Sons & Audio", "Quel matériel audio est-ce ?", "🎧 Un casque audio|🔊 Un haut-parleur|🎙️ Un micro de studio|📻 Une radio|🔇 Un son coupé|🎚️ Une table de mixage");
  S("🔋 Énergie", "Quel symbole de l'énergie est-ce ?", "🔋 Une pile|⚡ L'électricité|⛽ Une pompe à essence|🔌 Une prise électrique|💡 Une ampoule|☢️ La radioactivité");
  S("🧫 Biologie", "Quel élément de la biologie est-ce ?", "🧬 L'ADN|🧫 Une boîte de Petri|🔬 Un microscope|🦠 Un microbe|🌱 Une jeune pousse|🦴 Un os|🧠 Le cerveau");
  S("🚀 Sciences", "Quel instrument ou symbole scientifique est-ce ?", "🔬 Un microscope|🧪 Une éprouvette|🔭 Un télescope|🧲 Un aimant|⚛️ Un atome|🧬 L'ADN|🌡️ Un thermomètre");
  S("🚑 Premiers secours", "Quel élément de secours est-ce ?", "🚑 Une ambulance|🩹 Un pansement|💉 Une seringue|🩺 Un stéthoscope|🧯 Un extincteur|🏥 Un hôpital");
  S("🌋 Géologie & Volcans", "Quel élément géologique est-ce ?", "🌋 Un volcan|🏔️ Une montagne|🪨 Un rocher|💎 Un diamant|🏜️ Un désert|🌊 Une vague");
  S("🏝️ Îles & archipels", "Quel élément de paysage insulaire est-ce ?", "🏝️ Une île déserte|🌴 Un palmier|🏖️ Une plage|⛵ Un voilier|🐢 Une tortue|🌊 Une vague");
  S("🏔️ Alpinisme & sommets", "Quel élément de la montagne est-ce ?", "🏔️ Un sommet enneigé|⛰️ Une montagne|🧗 Un grimpeur|🥾 Une chaussure de randonnée|🧭 Une boussole|⛺ Une tente");
  S("🪙 Monnaies du monde", "Quelle monnaie est représentée ?", "💶 L'euro|💵 Le dollar|💷 La livre sterling|💴 Le yen");
  S("🍵 Boissons du monde", "Quelle boisson est-ce ?", "🍵 Du thé|☕ Du café|🍷 Du vin|🍺 De la bière|🥛 Du lait|🧃 Un jus de fruit|🍹 Un cocktail|🍾 Du champagne|🧉 Du maté");
  S("🧀 Fromages, vins & terroirs", "Quel produit du terroir est-ce ?", "🧀 Du fromage|🍷 Du vin|🍇 Du raisin|🍾 Du champagne|🥖 Une baguette|🍯 Du miel");
  S("🎸 Rock & pop", "Quel instrument ou accessoire de scène est-ce ?", "🎸 Une guitare|🥁 Une batterie|🎤 Un micro|🎹 Un clavier|🎧 Un casque audio");
  S("🎤 Chanson française", "Quel instrument ou accessoire de chanteur est-ce ?", "🎤 Un micro|🪗 Un accordéon|🎹 Un piano|🎸 Une guitare|🎼 Une partition");
  S("📼 Nostalgie années 90 & 2000", "Quel objet d'époque est-ce ?", "📼 Une cassette vidéo (VHS)|💾 Une disquette|📟 Un bipeur|☎️ Un téléphone fixe|📀 Un DVD|💿 Un CD");
  S("🏰 Moyen Âge", "Quel élément médiéval est-ce ?", "🏰 Un château fort|⚔️ Des épées croisées|🛡️ Un bouclier|🏹 Un arc|👑 Une couronne|🐎 Un cheval");
  S("👑 Rois & reines de France", "Quel symbole royal est-ce ?", "👑 Une couronne|⚜️ Une fleur de lys|🏰 Un château|⚔️ Des épées croisées|🪙 Une pièce");
  S("🔮 Superstitions & Paranormal", "Quel objet lié aux superstitions est-ce ?", "🔮 Une boule de cristal|👻 Un fantôme|🐈‍⬛ Un chat noir|🍀 Un trèfle à quatre feuilles|🕯️ Une bougie|🧿 Un œil porte-bonheur");
  S("🕵️ Mystères & Enquêtes", "Quel objet d'enquêteur est-ce ?", "🕵️ Un détective|🔍 Une loupe|🗝️ Une vieille clé|👣 Des empreintes de pas|📋 Un dossier");
  S("🔐 Énigmes & Logique", "Quel objet de jeu de logique est-ce ?", "🧩 Un puzzle|🎲 Un dé|🔑 Une clé|♟️ Un pion d'échecs|🔢 Des chiffres|🧠 Un cerveau");
  S("♟️ Échecs", "Quelle pièce du jeu d'échecs est-ce ?", "♟️ Un pion|♞ Un cavalier|♝ Un fou|♜ Une tour|♛ Une dame|♚ Un roi");
  S("🌈 Couleurs & lumière", "Quel élément lié à la lumière est-ce ?", "🌈 Un arc-en-ciel|💡 Une ampoule|🔦 Une lampe torche|🕯️ Une bougie|🌅 Un lever de soleil|🔆 Un soleil");
  S("🧭 Orientation & Cartes", "Quel outil d'orientation est-ce ?", "🧭 Une boussole|🗺️ Une carte|📍 Une épingle de localisation|🌐 Un globe|🛰️ Un satellite");
  S("🏆 Records", "Quel symbole de record ou de victoire est-ce ?", "🏆 Un trophée|🥇 Une médaille d'or|⏱️ Un chronomètre|📏 Une règle|🏅 Une médaille");

  /* ---------- Dessin d'un pictogramme ---------- */
  var BG = ["#fde68a", "#bfdbfe", "#fbcfe8", "#bbf7d0", "#ddd6fe", "#fed7aa", "#a5f3fc", "#fecaca"];
  function glyphSvg(glyph, key) {
    var n = Array.from(glyph).length, size = n > 1 ? Math.max(70, Math.floor(280 / n)) : 150;
    return open(300, 220) + '<rect width="300" height="220" rx="18" fill="' + BG[Math.abs(hash(key)) % BG.length] + '"/>'
      + '<g data-glyph="' + esc(glyph) + '"><text x="150" y="' + (n > 1 ? 135 : 160) + '" font-size="' + size + '" text-anchor="middle" font-family="' + FONT + '">' + glyph + '</text></g></svg>';
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function glyphQuestions(theme, count) {
    var set = SETS[theme], out = [];
    if (!set || set.items.length < 4) return out;
    sample(set.items, Math.min(count, set.items.length)).forEach(function (it) {
      var wrong = sample(set.items.filter(function (x) { return x[1] !== it[1]; }), 3).map(function (x) { return x[1]; });
      out.push(mk(theme, "pictogramme", set.items.length <= 6 || /évoquent/.test(set.q) ? "moyen" : "facile", set.q, [it[1]].concat(wrong), glyphSvg(it[0], theme + it[1]), "C'est : " + it[1].charAt(0).toLowerCase() + it[1].slice(1) + "."));
    });
    return out;
  }

  /* ---------- Capitales des pays dessinés (V41Images.FLAGS) ---------- */
  var CAPITALS = { fr: "Paris", it: "Rome", ie: "Dublin", be: "Bruxelles", ro: "Bucarest", ml: "Bamako", gn: "Conakry", ng: "Abuja", pe: "Lima", de: "Berlin", lu: "Luxembourg", at: "Vienne", hu: "Budapest", bg: "Sofia", lt: "Vilnius", ee: "Tallinn", ru: "Moscou", ga: "Libreville", pl: "Varsovie", ua: "Kiev", se: "Stockholm", dk: "Copenhague", fi: "Helsinki", no: "Oslo", ch: "Berne", jp: "Tokyo", bd: "Dacca" };
  var EUROPE = ["fr", "it", "ie", "be", "ro", "nl", "lu", "at", "hu", "bg", "lt", "ee", "ru", "pl", "ua", "se", "dk", "fi", "no", "ch", "de"];
  var AFRICA = ["ml", "gn", "ng", "ci", "ga"];
  function ext(name) { if (typeof globalThis !== "undefined" && globalThis[name]) return globalThis[name]; try { return require(name === "V41Images" ? "./image-themes.js" : "./road-questions.js"); } catch (e) { return null; } }
  function cap(n) { return n.charAt(0).toUpperCase() + n.slice(1); }
  function flagQuestions(theme, ids, n, withCapital) {
    var I = ext("V41Images"), out = [];
    if (!I) return out;
    var pool = I.FLAGS.filter(function (f) { return !ids || ids.indexOf(f.id) >= 0; });
    var capPool = pool.filter(function (f) { return CAPITALS[f.id]; });
    if (pool.length < 4) return out;
    sample(withCapital && capPool.length >= 4 ? capPool : pool, Math.min(n, pool.length)).forEach(function (f) {
      if (withCapital && CAPITALS[f.id] && capPool.length >= 4) {
        var wc = sample(capPool.filter(function (x) { return x !== f; }), 3);
        out.push(mk(theme, "capitale", "moyen", "Quelle est la capitale du pays de ce drapeau ?", [CAPITALS[f.id]].concat(wc.map(function (x) { return CAPITALS[x.id]; })), I.flagSvg(f), "C'est le drapeau de " + f.name + " ; sa capitale est " + CAPITALS[f.id] + "."));
      } else {
        var wrong = sample(pool.filter(function (x) { return x !== f; }), 3);
        out.push(mk(theme, "drapeau", f.d, "À quel pays appartient ce drapeau ?", [cap(f.name)].concat(wrong.map(function (x) { return cap(x.name); })), I.flagSvg(f), "C'est le drapeau de " + f.name + "."));
      }
    });
    return out;
  }
  function clockQuestions(theme, n) {
    var I = ext("V41Images"), out = [];
    if (!I) return out;
    var bank = I.build().filter(function (q) { return q.kind === "heure"; });
    sample(bank, n).forEach(function (q) { out.push(Object.assign({}, q, { category: theme, v41Img: undefined, v42Mix: true })); });
    return out;
  }
  function roadQuestions(theme, kinds, n) {
    var R = ext("V41Road"), out = [];
    if (!R) return out;
    var bank = R.build().filter(function (q) { return kinds.indexOf(q.kind) >= 0; });
    sample(bank, n).forEach(function (q) { out.push(Object.assign({}, q, { category: theme, v41Road: undefined, v42Mix: true })); });
    return out;
  }

  /* ---------- Géométrie, fractions, opérations ---------- */
  var POLY = { 3: "Un triangle", 4: "Un carré", 5: "Un pentagone", 6: "Un hexagone", 7: "Un heptagone", 8: "Un octogone", 9: "Un ennéagone", 10: "Un décagone" };
  var PCOL = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  function polySvg(n) {
    var pts = [], i, col = pick(PCOL);
    for (i = 0; i < n; i++) { var a = -Math.PI / 2 + (n === 4 ? Math.PI / 4 : 0) + i * 2 * Math.PI / n; pts.push((150 + 82 * Math.cos(a)).toFixed(1) + "," + (110 + 82 * Math.sin(a)).toFixed(1)); }
    return open(300, 220) + '<rect width="300" height="220" rx="18" fill="#f1f5f9"/><polygon data-n="' + n + '" points="' + pts.join(" ") + '" fill="' + col + '" stroke="#1f2937" stroke-width="4" stroke-linejoin="round"/></svg>';
  }
  function qPolygon(theme) {
    var n = 3 + rnd(8), wrong = sample(Object.keys(POLY).filter(function (k) { return +k !== n; }), 3);
    return mk(theme, "polygone", n <= 6 ? "facile" : "moyen", "Comment s'appelle ce polygone ?", [POLY[n]].concat(wrong.map(function (k) { return POLY[k]; })), polySvg(n), "Il a " + n + " côtés : c'est " + POLY[n].toLowerCase() + ".");
  }
  function pieSvg(k, n) {
    var s = open(300, 220) + '<rect width="300" height="220" rx="18" fill="#f1f5f9"/><g data-k="' + k + '" data-n="' + n + '">', i;
    for (i = 0; i < n; i++) {
      var a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / n;
      s += '<path data-slice="' + (i < k ? "on" : "off") + '" d="M150 110 L' + (150 + 90 * Math.cos(a0)).toFixed(2) + " " + (110 + 90 * Math.sin(a0)).toFixed(2) + " A90 90 0 0 1 " + (150 + 90 * Math.cos(a1)).toFixed(2) + " " + (110 + 90 * Math.sin(a1)).toFixed(2) + ' Z" fill="' + (i < k ? "#ef4444" : "#ffffff") + '" stroke="#1f2937" stroke-width="3" stroke-linejoin="round"/>';
    }
    return s + '</g></svg>';
  }
  function qFraction(theme) {
    var n = 2 + rnd(7), k = 1 + rnd(n - 1), wrong = [], g = 0;
    var cand = []; for (var d = 2; d <= 8; d++) for (var m = 1; m < d; m++) if (!(m === k && d === n) && m / d !== k / n) cand.push(m + "/" + d);
    wrong = sample(cand, 3);
    return mk(theme, "fraction", "moyen", "Quelle fraction du disque est coloriée en rouge ?", [k + "/" + n].concat(wrong), pieSvg(k, n), "Le disque est coupé en " + n + " parts égales, dont " + k + " sont rouges.");
  }
  function opSvg(a, b, op) { return open(300, 140) + '<rect width="300" height="140" rx="18" fill="#fef3c7"/><text data-op="' + a + " " + op + " " + b + '" x="150" y="92" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="bold" text-anchor="middle" fill="#1f2937">' + a + " " + op + " " + b + ' = ?</text></svg>'; }
  function qOperation(theme) {
    var op = pick(["+", "−", "×"]), a, b, r;
    if (op === "+") { a = 10 + rnd(90); b = 10 + rnd(90); r = a + b; }
    else if (op === "−") { a = 30 + rnd(70); b = 10 + rnd(a - 10); r = a - b; }
    else { a = 3 + rnd(10); b = 3 + rnd(10); r = a * b; }
    var set = {}, wrong = [];
    [r + 1, r - 1, r + 10, r - 10, r + 2, r - 2, r + 5, r - 5, op === "×" ? r + a : r + 11].forEach(function (v) { if (v > 0 && v !== r && !set[v] && wrong.length < 3 && rnd(3) > 0) { set[v] = 1; wrong.push(v); } });
    for (var v = 1; wrong.length < 3; v++) if (!set[r + v] && r + v !== r) { set[r + v] = 1; wrong.push(r + v); }
    return mk(theme, "operation", op === "×" ? "moyen" : "facile", "Quel est le résultat de l'opération affichée ?", [String(r)].concat(wrong.map(String)), opSvg(a, b, op), a + " " + op + " " + b + " = " + r + ".");
  }

  /* ---------- Thèmes concernés par les générateurs partagés ---------- */
  var SHARED = [
    ["🚩 Drapeaux", function (t, n) { return flagQuestions(t, null, n, false); }],
    ["🌐 Pays du monde", function (t, n) { return flagQuestions(t, null, n, false); }],
    ["🌍 Géographie", function (t, n) { return flagQuestions(t, null, n, false); }],
    ["🏛️ Capitales", function (t, n) { return flagQuestions(t, null, n, true); }],
    ["🇪🇺 Europe", function (t, n) { return flagQuestions(t, EUROPE, Math.ceil(n / 2), false).concat(flagQuestions(t, EUROPE, Math.floor(n / 2), true)); }],
    ["🌍 Afrique", function (t, n) { return flagQuestions(t, AFRICA, Math.min(n, 4), false); }],
    ["🕰️ Temps & calendrier", function (t, n) { return clockQuestions(t, n); }],
    ["🏠 Vie quotidienne & Pratique", function (t, n) { return clockQuestions(t, Math.ceil(n / 2)); }],
    ["📏 Unités & mesures", function (t, n) { return clockQuestions(t, Math.ceil(n / 2)); }],
    ["🧠 Culture générale", function (t, n) { return clockQuestions(t, 2).concat(flagQuestions(t, null, 3, false)); }],
    ["🚦 Code de la route", function (t, n) { return roadQuestions(t, ["signe", "quel", "feu", "droite", "panneau", "gauche", "rond-point", "famille", "action", "losange", "vitesse"], n + 6); }],
    ["🚗 Automobile", function (t, n) { return roadQuestions(t, ["signe", "famille", "vitesse", "conditions"], Math.ceil(n / 2)); }],
    ["🚆 Transports", function (t, n) { return roadQuestions(t, ["signe", "famille"], Math.ceil(n / 3)); }],
    ["📐 Géométrie", function (t, n) { var o = [], i; for (i = 0; i < n; i++) o.push(i % 2 ? qFraction(t) : qPolygon(t)); return o; }],
    ["➗ Mathématiques", function (t, n) { var o = [], i; for (i = 0; i < n; i++) o.push(i % 3 === 0 ? qFraction(t) : i % 3 === 1 ? qPolygon(t) : qOperation(t)); return o; }],
    ["🧮 Calcul mental", function (t, n) { var o = [], i; for (i = 0; i < n; i++) o.push(qOperation(t)); return o; }]
  ];

  /* ---------- 2. Illustration d'ambiance pour les autres thèmes ---------- */
  function themeGlyph(name) { var i = String(name).indexOf(" "); return i > 0 ? name.slice(0, i) : "🎯"; }
  function bannerSvg(theme) {
    var h = Math.abs(hash(theme)), c1 = BG[h % BG.length], c2 = BG[(h >> 3) % BG.length], g = themeGlyph(theme);
    return open(400, 170) + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>'
      + '<rect width="400" height="170" rx="18" fill="url(#g)"/><circle cx="60" cy="40" r="26" fill="#ffffff" opacity="0.35"/><circle cx="350" cy="135" r="38" fill="#ffffff" opacity="0.3"/><circle cx="330" cy="30" r="14" fill="#ffffff" opacity="0.4"/>'
      + '<g data-deco="1"><text x="200" y="128" font-size="104" text-anchor="middle" font-family="' + FONT + '">' + g + '</text></g></svg>';
  }

  function valid(q) {
    if (!q || !q.question || !Array.isArray(q.answers) || q.answers.length !== 4) return false;
    var u = {}, ok = true; q.answers.forEach(function (a) { var k = String(a).toLowerCase(); if (!a || u[k]) ok = false; u[k] = 1; });
    if (!ok || q.correct !== 0) return false;
    if (typeof QMedia !== "undefined" && !QMedia.cleanSvg(q.media.svg)) return false;
    return true;
  }
  /* nombre de questions-images à ajouter : ≈ 12 % de la taille du thème, entre 3 et 8 */
  function wanted(size) { return Math.max(3, Math.min(8, Math.round((size || 0) * 0.12))); }

  function build(sizes) {
    sizes = sizes || {};
    var out = [];
    Object.keys(SETS).forEach(function (t) { glyphQuestions(t, wanted(sizes[t])).forEach(function (q) { if (valid(q)) out.push(q); }); });
    SHARED.forEach(function (s) { s[1](s[0], wanted(sizes[s[0]])).forEach(function (q) { if (valid(q)) out.push(q); }); });
    return out;
  }
  function coveredThemes() { var c = {}; Object.keys(SETS).forEach(function (t) { c[t] = 1; }); SHARED.forEach(function (s) { c[s[0]] = 1; }); return c; }

  function register() {
    if (typeof QUESTIONS === "undefined") return { added: 0, decorated: 0 };
    var i, sizes = {}, byCat = {};
    for (i = QUESTIONS.length - 1; i >= 0; i--) { var q = QUESTIONS[i]; if (!q) continue; if (q.v42Mix) QUESTIONS.splice(i, 1); else if (q.v42Deco) { delete q.media; q.v42Deco = false; } }
    QUESTIONS.forEach(function (q) { if (!q || !q.category) return; sizes[q.category] = (sizes[q.category] || 0) + 1; (byCat[q.category] = byCat[q.category] || []).push(q); });
    var add = build(sizes); add.forEach(function (q) { QUESTIONS.push(q); });
    /* illustrations d'ambiance : thèmes sans contenu visuel, ≈ 8 % de leurs questions officielles sans média */
    var cov = coveredThemes(), deco = 0;
    Object.keys(byCat).forEach(function (cat) {
      if (cov[cat]) return;
      var list = byCat[cat].filter(function (q) { return q.v35 && q.source === "officiel" && !q.media && !q.v40Visual; });
      if (list.length < 6) return;
      sample(list, Math.max(2, Math.round(list.length * 0.08))).forEach(function (q) { q.media = { type: "svg", svg: bannerSvg(cat) }; q.v42Deco = true; deco++; });
    });
    return { added: add.length, decorated: deco };
  }
  return { SETS: SETS, SHARED: SHARED, CAPITALS: CAPITALS, build: build, register: register, valid: valid, coveredThemes: coveredThemes, wanted: wanted, bannerSvg: bannerSvg, glyphSvg: glyphSvg, polySvg: polySvg, pieSvg: pieSvg, opSvg: opSvg, POLY: POLY };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V42Mix;
if (typeof QUESTIONS !== "undefined") {
  V42Mix.register();
  if (typeof startGame === "function") {
    var __v42MixStart = startGame;
    startGame = function () { try { V42Mix.register(); } catch (e) {} return __v42MixStart.apply(this, arguments); };
  }
}
