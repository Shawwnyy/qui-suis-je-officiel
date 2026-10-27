/* ============================================================================
   MODÉRATION — LEXIQUE
   Tous les mots sont en minuscules, sans accents, sans ponctuation.
   - exact   : le mot doit être un mot entier (ex. "cul" ne bloque pas "calcul")
   - roots   : fragment sûr (long et sans ambiguïté), bloqué même à l'intérieur d'un mot
   - phrases : expressions bloquées (comparées mot à mot)
   - ambiguous : mots exacts qui sont aussi courants dans une autre langue
                 (ex. "con" = "avec" en espagnol) : ignorés si la phrase contient
                 un mot typique de cette langue
   Pour ajouter un mot : l'ajouter dans la bonne liste, puis lancer `node tests/moderation.test.js`.
   ============================================================================ */
(function (root) {
  "use strict";

  var exact = [
    /* Français — insultes et vulgarités */
    "con", "conne", "connes", "connard", "connards", "connasse", "connasses", "conasse",
    "cul", "tg", "ntm", "fdp", "ptn", "pd", "pede", "pedes", "tapette", "tapettes", "tarlouze", "tarlouse",
    "gouine", "gouines", "pute", "putes", "putain", "putains", "salope", "salopes", "salopard", "salopards",
    "salaud", "salauds", "encule", "enculer", "enculee", "enculees", "encules", "enculez", "nique", "niques", "niquer", "niquez", "bite", "bites", "zob", "zobi", "teub", "teubs",
    "couille", "couilles", "couillon", "couillons", "burne", "burnes", "batard", "batards", "batarde",
    "abruti", "abrutis", "abrutie", "debile", "debiles", "cretin", "cretins", "cretine", "imbecile", "imbeciles",
    "idiot", "idiots", "idiote", "idiotes", "enfoire", "enfoires", "petasse", "petasses", "bougnoule", "bougnoules", "youpin", "youpins", "youtre", "youtres", "chintok", "chintoks", "bamboula",
    "stfu", "fck", "fuk", "fuq", "ftg",
    /* Anglais */
    "fuck", "fucks", "fucker", "fuckers", "fucking", "fucked", "shit", "shits", "shitty", "bullshit", "shithead",
    "bitch", "bitches", "asshole", "assholes", "arsehole", "dickhead", "pussy", "cunt", "cunts", "whore", "whores", "slut", "sluts", "bastard", "bastards", "wanker", "wankers",
    "twat", "douche", "douchebag", "retarded", "faggot", "faggots", "fag", "fags", "nigger", "niggers", "nigga",
    "niggas", "niggaz", "kys", "porn", "porno", "pornhub", "boobs", "nudes",
    /* Espagnol */
    "puta", "putas", "puto", "putos", "mierda", "joder", "jodete", "cabron", "cabrones", "cabrona", "gilipollas",
    "pendejo", "pendeja", "pendejos", "hijoeputa", "hijodeputa", "marica", "maricon", "maricones", "culero",
    "chingar", "chingada", "mamon", "estupido", "culo",
    /* Allemand */
    "scheisse", "scheiss", "arschloch", "fotze", "hurensohn", "wichser", "schlampe", "ficken", "fick",
    "missgeburt", "vollidiot", "spast", "spasti",
    /* Italien */
    "cazzo", "cazzi", "merda", "stronzo", "stronza", "stronzi", "vaffanculo", "figa", "puttana", "puttane",
    "coglione", "coglioni", "minchia", "bastardo",
    /* Portugais */
    "caralho", "porra", "foda", "foder", "filhadaputa", "filhodaputa", "cuzao", "viado", "buceta", "babaca",
    /* Néerlandais */
    "kut", "kankerlijer", "klootzak", "hoer", "lul", "tering",
    /* Arabe / turc / russe translittérés */
    "sharmouta", "sharmuta", "zebi", "zebbi", "kahba", "ibnsharmouta", "orospu", "amk", "sikerim", "siktir",
    "yarrak", "aminakoyim", "blyat", "blyad", "suka", "pidor", "pidar", "nahui", "mudak"
  ];

  var roots = [
    "connard", "connasse", "putain", "merde", "encul", "couill", "branleur", "branlette", "branler",
    "petasse", "pouffiasse", "salopard", "fuck", "bitch", "bastard", "asshole", "arsehole", "dickhead",
    "cocksucker", "motherfuck", "bullshit", "shithead", "douchebag", "wanker", "faggot", "nigger",
    "mierda", "gilipollas", "hijoeputa", "hijodeputa", "cabron", "pendejo", "maricon", "scheiss", "arschloch",
    "hurensohn", "wichser", "schlampe", "vaffanculo", "coglion", "minchia", "caralho", "filhadaputa",
    "filhodaputa", "klootzak", "kankerlijer", "sharmou", "orospu", "siktir", "pedophil", "pedocriminel"
  ];

  var phrases = [
    "ta gueule", "ferme ta gueule", "ferme la gueule", "tais toi", "ta race", "sale race",
    "nique ta mere", "nique ta race", "nique tes morts", "ta mere la pute", "fils de pute", "fille de pute",
    "enfant de pute", "va te faire foutre", "vas te faire foutre", "va te faire enculer", "va chier",
    "sale arabe", "sale noir", "sale negre", "sale juif", "sale blanc", "sale pd", "sale gay", "sale chinois",
    "sale pute", "sale con",
    "va crever", "vas crever", "va mourir", "tue toi", "tuez vous", "suicide toi", "suicidez vous",
    "je vais te tuer", "je te tue", "je vais te buter", "on va te tuer",
    "kill yourself", "go kill yourself", "go die", "i will kill you", "ill kill you", "im going to kill you",
    "go to hell", "shut the fuck up", "shut up bitch", "heil hitler", "sieg heil", "white power",
    "hijo de puta", "hija de puta", "vete a la mierda", "figlio di puta"
  ];

  var ambiguous = {
    /* "con" = idiot en français, mais "avec" en espagnol / italien / portugais / catalan */
    con: [
      /* espagnol */ "el", "los", "las", "una", "para", "del", "pero", "muy", "vamos", "hola", "gracias", "estoy", "eres",
      "tengo", "quiero", "eso", "esto", "mis", "tus", "sus", "nos", "amigos", "amigo", "casa", "familia", "porque",
      "tambien", "donde", "aqui", "todo", "todos", "bien", "bueno", "buenos", "dias", "noches", "tardes", "nada",
      "mucho", "mucha", "gusto", "ellos", "ellas", "ella", "nosotros", "ti", "cuidado", "calma", "amor", "cuando", "como",
      "favor", "permiso", "gente", "personas", "ustedes", "usted",
      /* italien */ "il", "gli", "per", "sono", "ciao", "grazie", "anche", "questo", "quello", "perche", "lui", "lei",
      "noi", "voi", "loro", "amici", "bene", "molto", "buongiorno", "volentieri", "voglio", "vuoi", "sei", "stai", "dove",
      "quando", "cosa", "sempre", "tutti", "tutto", "buonasera", "prego", "scusa", "amore", "ragazzi",
      /* portugais */ "voce", "obrigado", "obrigada", "ola", "muito", "nao", "uma", "com", "bom", "dia",
      /* anglais */ "comic", "expo", "convention", "the", "and", "artist", "man", "game", "was", "are", "you", "with", "this", "that", "his", "her", "they"
    ]
  };

  /* Petits mots courants : une suite de petits mots ("j'ai pu te dire") ne doit pas être prise
     pour des lettres épelées. */
  var stopwords = [
    "a", "as", "au", "ai", "ca", "ce", "ci", "de", "du", "en", "es", "et", "eu", "il", "je", "la", "le", "ma", "me",
    "mi", "ne", "ni", "on", "ou", "pu", "qu", "sa", "se", "si", "ta", "te", "tu", "un", "va", "vu", "y",
    "is", "it", "to", "of", "in", "on", "at", "by", "we", "he", "me", "my", "no", "so", "do", "go", "up", "us",
    "el", "la", "lo", "un", "no", "se", "su", "ya", "yo", "tu", "mi", "es", "ha", "he",
    "ich", "du", "er", "es", "ja", "zu", "im", "in", "am", "an", "ob", "so"
  ];

  /* Mot interdit ignoré s'il est suivi immédiatement de l'un de ces mots : « cul de sac », « cul de four » */
  var followSkip = { cul: ["de"] };

  var lexicon = { exact: exact, roots: roots, phrases: phrases, ambiguous: ambiguous, stopwords: stopwords, followSkip: followSkip };
  root.ModerationLexicon = lexicon;
  if (typeof module !== "undefined" && module.exports) module.exports = lexicon;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
