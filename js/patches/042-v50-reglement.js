/* =============================================================================
   V50 — Règlement détaillé (FR / EN / ES), ajouté à la suite du règlement existant (comme les autres correctifs).
   Les noms des 16 nouveaux pouvoirs sont repris de V50Powers (une seule source) ; tests/v50.test.js vérifie qu'ils sont
   tous dans les trois langues. Le texte est un HTML statique écrit ici : aucune donnée du réseau n'y entre.
   ============================================================================= */
(function V50Rules() {
  "use strict";
  if (typeof RULES_TEXT === "undefined") return;
  var P = (typeof V50Powers !== "undefined") ? V50Powers : null;
  if (!P) return;
  var D = P.DEFS;
  function nm(id) { return D[id].emoji + " " + D[id].name; }
  function list(ids, desc) { return ids.map(function (id) { return nm(id) + " (" + desc[id] + ")"; }).join(" · "); }

  var fr = {
    b: { tresor: "+350 pts", chance: "+500 ou +150 pts", soin: "+2 combo", ange: "bouclier + 100 pts", horloge: "+15 s à ta prochaine question", boost15: "gains ×1,5 pendant 2 questions", lingot: "prochaine bonne réponse +300 pts", phenix: "tu retrouves ton meilleur combo" },
    m: { amende: "−300 pts", seisme: "l'écran de la cible tremble", boulet: "−2 combo", virus: "gains −15 % pendant 3 questions", eclipse: "réponses cachées 3 s", larcin: "tu voles 200 pts", tempete: "−3 s de chrono", trounoir: "sa prochaine bonne réponse ne rapporte rien" }
  };
  var en = {
    b: { tresor: "+350 pts", chance: "+500 or +150 pts", soin: "+2 combo", ange: "shield + 100 pts", horloge: "+15 s on your next question", boost15: "gains ×1.5 for 2 questions", lingot: "next correct answer +300 pts", phenix: "get your best combo back" },
    m: { amende: "−300 pts", seisme: "the target's screen shakes", boulet: "−2 combo", virus: "gains −15 % for 3 questions", eclipse: "answers hidden for 3 s", larcin: "you steal 200 pts", tempete: "−3 s on the timer", trounoir: "their next correct answer scores nothing" }
  };
  var es = {
    b: { tresor: "+350 pts", chance: "+500 o +150 pts", soin: "+2 combo", ange: "escudo + 100 pts", horloge: "+15 s en tu próxima pregunta", boost15: "ganancias ×1,5 durante 2 preguntas", lingot: "próximo acierto +300 pts", phenix: "recuperas tu mejor combo" },
    m: { amende: "−300 pts", seisme: "la pantalla del objetivo tiembla", boulet: "−2 combo", virus: "ganancias −15 % durante 3 preguntas", eclipse: "respuestas ocultas 3 s", larcin: "robas 200 pts", tempete: "−3 s de tiempo", trounoir: "su próximo acierto no suma nada" }
  };

  var TEXT = {
    fr: "<hr><b>📖 RÈGLEMENT DÉTAILLÉ</b><br>" +
      "<b>1. Avant de jouer :</b> chaque joueur choisit un pseudo correct (les insultes sont refusées) et <b>accepte les règles</b> ; l'hôte ne peut lancer la partie que quand tout le monde les a acceptées.<br>" +
      "<b>2. Les points :</b> une bonne réponse rapporte 500 pts, plus un bonus de vitesse et un bonus de combo, multipliés selon la difficulté. Les questions faciles, moyennes, difficiles et impossibles ne rapportent pas autant.<br>" +
      "<b>3. Les pouvoirs :</b> à chaque combo (2 bonnes réponses d'affilée, 4 pour un Super Combo), trois pouvoirs tirés au hasard te sont proposés, en <b>bonus</b> pour toi ou en <b>malus</b> pour un adversaire. Ils sont ⚪ communs, 🟢 rares ou 🔵 épiques : les épiques n'apparaissent qu'au Super Combo. Un pouvoir déjà joué récemment (parmi tes 3 derniers) ou déjà joué deux fois dans la partie est grisé.<br>" +
      "<b>4. 🟢 Écran vert / 🔴 écran rouge :</b> quand tu reçois un bonus, tout l'écran s'illumine en <b>vert</b> avec une animation. Quand un malus te touche, il passe au <b>rouge</b>. Si ton bouclier arrête un malus, tu vois « BLOQUÉ ! » en vert. L'animation ne bloque jamais les boutons et se réduit à un simple fondu si ton appareil demande moins d'animations.<br>" +
      "<b>5. Nouveaux bonus :</b> " + list(P.BONUS_IDS, fr.b) + ".<br>" +
      "<b>6. Nouveaux malus :</b> " + list(P.MALUS_IDS, fr.m) + ".<br>" +
      "<b>7. Protections :</b> le 🛡️ bouclier et l'Armure annulent un malus ; le Miroir le renvoie ; le Hérisson fait perdre un combo à celui qui te vise. Tu ne peux pas subir plus de <b>2 malus actifs</b> en même temps : un troisième est sans effet.<br>" +
      "<b>8. Le chrono :</b> les bonus et malus de temps sont individuels : chacun peut avoir un chrono différent sur la même question.<br>" +
      "<b>9. Fair-play :</b> quitter la page pendant une question est une infraction (avertissement, malus, puis exclusion). Pas d'insultes, pas de contenu choquant dans le chat, les photos ou la musique ; l'hôte peut exclure un joueur.<br>" +
      "<b>10. Chat vocal :</b> sans rien installer, entre joueurs de la salle. Le micro est coupé tant que tu ne le rejoins pas. La retranscription du texte est <b>facultative</b>, activée par chacun pour lui-même, et utilise la reconnaissance vocale de ton navigateur.<br>" +
      "<b>11. Statistiques :</b> à la fin, tu retrouves des graphiques (scores, réponses, questions, temps de réaction…), un rapport PDF et l'historique des 12 dernières parties, gardés dans ton navigateur.<br>" +
      "<b>12. Images de graphiques :</b> toute image copiée ou téléchargée porte le filigrane <b>qui-suis-je-officiel</b> ; seul l'hôte de la partie peut les avoir sans filigrane.<br>" +
      "<b>13. 🔮 Pronostic, 🕳️ questions pièges et 13 pouvoirs de plus :</b> avant la <b>dernière question</b>, tu peux parier sur ta place finale : place exacte = ton score <b>×2</b>, sinon <b>÷2</b> (pas de pari = rien ne change). De temps en temps, une <b>question piège</b> est annoncée : bonne réponse = points <b>×5</b>, mauvaise réponse = <b>−300 pts</b> (jamais les deux premières ni la dernière question). L'hôte peut désactiver les deux dans « Modes fun ». Bonus en plus : 🎁 Cadeau surprise, 🎰 Machine à sous, 🔭 Radar, 💎 Rente, 🦸 Rattrapage, 🪄 Magicien, 🕊️ Trêve. Malus en plus : 💣 Mine, 🏷️ Dévaluation, 🎢 Montagnes russes, 🌫️ Brouillard, 💀 Faucheuse, 🧛 Vampire.<br>" +
      "<b>14. Dernière règle :</b> on joue pour s'amuser. Bonne chance à tous !",
    en: "<hr><b>📖 DETAILED RULES</b><br>" +
      "<b>1. Before playing:</b> every player picks a decent nickname (insults are refused) and <b>accepts the rules</b>; the host can only start once everyone has accepted.<br>" +
      "<b>2. Points:</b> a correct answer earns 500 pts plus a speed bonus and a combo bonus, multiplied by difficulty. Easy, medium, hard and impossible questions do not pay the same.<br>" +
      "<b>3. Powers:</b> at each combo (2 correct answers in a row, 4 for a Super Combo) you are offered three random powers, as a <b>bonus</b> for you or a <b>penalty</b> for an opponent. They are ⚪ common, 🟢 rare or 🔵 epic: epic ones only appear on a Super Combo. A power you played recently (among your last 3) or already played twice in the game is greyed out.<br>" +
      "<b>4. 🟢 Green screen / 🔴 red screen:</b> when you receive a bonus the whole screen lights up <b>green</b> with an animation. When a penalty hits you it turns <b>red</b>. If your shield stops a penalty you see “BLOCKED!” in green. The animation never blocks the buttons and becomes a simple fade if your device asks for reduced motion.<br>" +
      "<b>5. New bonuses:</b> " + list(P.BONUS_IDS, en.b) + ".<br>" +
      "<b>6. New penalties:</b> " + list(P.MALUS_IDS, en.m) + ".<br>" +
      "<b>7. Protections:</b> the 🛡️ shield and the Armor cancel a penalty; the Mirror sends it back; the Hedgehog costs a combo to whoever targets you. You cannot suffer more than <b>2 active penalties</b> at once: a third one has no effect.<br>" +
      "<b>8. Timer:</b> time bonuses and penalties are individual: each player may have a different timer on the same question.<br>" +
      "<b>9. Fair play:</b> leaving the page during a question is an offence (warning, penalty, then removal). No insults and no shocking content in chat, photos or music; the host can remove a player.<br>" +
      "<b>10. Voice chat:</b> nothing to install, between players of the room. Your microphone stays off until you join. Transcription is <b>optional</b>, turned on by each person for themselves, and uses your browser's speech recognition.<br>" +
      "<b>11. Statistics:</b> at the end you get charts (scores, answers, questions, reaction times…), a PDF report and the history of the last 12 games, kept in your browser.<br>" +
      "<b>12. Chart images:</b> every copied or downloaded image carries the <b>qui-suis-je-officiel</b> watermark; only the game's host can have them without it.<br>" +
      "<b>13. 🔮 Forecast, 🕳️ trap questions and 13 more powers:</b> before the <b>last question</b> you may bet on your final rank: exact rank = your score <b>×2</b>, otherwise <b>÷2</b> (no bet = nothing changes). Now and then a <b>trap question</b> is announced: correct answer = points <b>×5</b>, wrong answer = <b>−300 pts</b> (never the first two or the last question). The host can turn both off in “Fun modes”. Extra bonuses: 🎁 Surprise Gift, 🎰 Slot Machine, 🔭 Radar, 💎 Annuity, 🦸 Catch-up, 🪄 Magician, 🕊️ Truce. Extra maluses: 💣 Mine, 🏷️ Devaluation, 🎢 Roller Coaster, 🌫️ Fog, 💀 Reaper, 🧛 Vampire.<br>" +
      "<b>14. Last rule:</b> we play for fun. Good luck everyone!",
    es: "<hr><b>📖 REGLAMENTO DETALLADO</b><br>" +
      "<b>1. Antes de jugar:</b> cada jugador elige un apodo correcto (se rechazan los insultos) y <b>acepta las reglas</b>; el anfitrión solo puede empezar cuando todos las han aceptado.<br>" +
      "<b>2. Puntos:</b> un acierto vale 500 pts más un bonus de velocidad y un bonus de combo, multiplicados según la dificultad. Las preguntas fáciles, medias, difíciles e imposibles no valen lo mismo.<br>" +
      "<b>3. Poderes:</b> con cada combo (2 aciertos seguidos, 4 para un Super Combo) se te ofrecen tres poderes al azar, como <b>bonus</b> para ti o <b>malus</b> para un rival. Son ⚪ comunes, 🟢 raros o 🔵 épicos: los épicos solo aparecen en un Super Combo. Un poder jugado hace poco (entre tus 3 últimos) o ya jugado dos veces en la partida aparece en gris.<br>" +
      "<b>4. 🟢 Pantalla verde / 🔴 pantalla roja:</b> cuando recibes un bonus, toda la pantalla se ilumina en <b>verde</b> con una animación. Cuando te alcanza un malus, se pone en <b>rojo</b>. Si tu escudo detiene un malus, ves «¡BLOQUEADO!» en verde. La animación nunca bloquea los botones y se reduce a un simple fundido si tu dispositivo pide menos animaciones.<br>" +
      "<b>5. Nuevos bonus:</b> " + list(P.BONUS_IDS, es.b) + ".<br>" +
      "<b>6. Nuevos malus:</b> " + list(P.MALUS_IDS, es.m) + ".<br>" +
      "<b>7. Protecciones:</b> el 🛡️ escudo y la Armadura anulan un malus; el Espejo lo devuelve; el Erizo hace perder un combo a quien te apunta. No puedes sufrir más de <b>2 malus activos</b> a la vez: un tercero no tiene efecto.<br>" +
      "<b>8. Tiempo:</b> los bonus y malus de tiempo son individuales: cada jugador puede tener un tiempo distinto en la misma pregunta.<br>" +
      "<b>9. Juego limpio:</b> salir de la página durante una pregunta es una infracción (aviso, malus y luego expulsión). Nada de insultos ni contenido chocante en el chat, las fotos o la música; el anfitrión puede expulsar a un jugador.<br>" +
      "<b>10. Chat de voz:</b> sin instalar nada, entre los jugadores de la sala. Tu micrófono sigue apagado hasta que te unes. La transcripción es <b>opcional</b>, la activa cada uno para sí mismo y usa el reconocimiento de voz de tu navegador.<br>" +
      "<b>11. Estadísticas:</b> al final tienes gráficos (puntos, respuestas, preguntas, tiempos de reacción…), un informe PDF y el historial de las últimas 12 partidas, guardado en tu navegador.<br>" +
      "<b>12. Imágenes de gráficos:</b> toda imagen copiada o descargada lleva la marca de agua <b>qui-suis-je-officiel</b>; solo el anfitrión de la partida puede tenerlas sin ella.<br>" +
      "<b>13. 🔮 Pronóstico, 🕳️ preguntas trampa y 13 poderes más:</b> antes de la <b>última pregunta</b> puedes apostar por tu puesto final: puesto exacto = tu puntuación <b>×2</b>, si no <b>÷2</b> (sin apuesta no cambia nada). De vez en cuando se anuncia una <b>pregunta trampa</b>: acierto = puntos <b>×5</b>, fallo = <b>−300 pts</b> (nunca las dos primeras ni la última). El anfitrión puede desactivar ambas en «Modos divertidos». Bonus extra: 🎁 Regalo sorpresa, 🎰 Tragaperras, 🔭 Radar, 💎 Renta, 🦸 Remontada, 🪄 Mago, 🕊️ Tregua. Malus extra: 💣 Mina, 🏷️ Devaluación, 🎢 Montaña rusa, 🌫️ Niebla, 💀 Parca, 🧛 Vampiro.<br>" +
      "<b>14. Última regla:</b> jugamos para divertirnos. ¡Suerte a todos!"
  };

  var MARK = { fr: "RÈGLEMENT DÉTAILLÉ", en: "DETAILED RULES", es: "REGLAMENTO DETALLADO" };
  ["fr", "en", "es"].forEach(function (l) { if (RULES_TEXT[l] && RULES_TEXT[l].indexOf(MARK[l]) < 0) RULES_TEXT[l] += TEXT[l]; });
  /* rafraîchit les deux zones d'affichage (attente + salon de l'hôte) dans la langue en cours */
  try {
    var cur = "fr";
    [].forEach.call(document.querySelectorAll("#rulesLangs button, #rulesLangsHost button"), function (b) { if (b.style.opacity === "1" && b.dataset.lang) cur = b.dataset.lang; });
    if (typeof setRulesLang === "function") setRulesLang(cur);
  } catch (e) {}
  window.V50Rules = { TEXT: TEXT };
})();
