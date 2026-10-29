/* ✉️ Envoi direct des statistiques par e-mail (EmailJS) — à remplir UNE fois par l'organisateur du site.
   Sans ces 3 valeurs, le bouton « 📨 Envoyer » explique comment les obtenir ; les autres boutons (messagerie, Gmail, Outlook,
   PDF joint) marchent toujours. Les 3 valeurs sont publiques par conception (la clé publique d'EmailJS est faite pour être
   dans une page web) : limite quand même le domaine autorisé dans EmailJS (Account → Security → Allowed origins).
   Mode d'emploi complet : README, section « Envoyer les statistiques par e-mail ».                                        */
window.V61MailConfig = {
  serviceId: "",    /* ex. "service_ab12cd3"  (Email Services)  */
  templateId: "",   /* ex. "template_x1y2z3w" (Email Templates) */
  publicKey: ""     /* ex. "AbCdEfGhIjKlMnOpQ" (Account → General → Public Key) */
};
