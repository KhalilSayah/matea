/* MATEA — réglages publics.

   Il n'y a volontairement AUCUNE clé Supabase ici. Ce fichier part dans
   le navigateur de chaque visiteur : tout ce qu'on y écrit est public.

   Les identifiants vivent dans les variables d'environnement Vercel et
   ne sont lus que par les fonctions de /api, côté serveur :

     SUPABASE_URL
     SUPABASE_SERVICE_ROLE_KEY
     ADMIN_PASSWORD

   Le site choisit son mode tout seul : si /api répond, il travaille sur
   Supabase ; sinon il retombe sur le navigateur, ce qui permet de
   développer en local sans rien installer.                               */

window.MATEA_CONFIG = {
  currency: 'DA',

  /* Le doypack est un contenant que le client remplit lui-même :
     il choisit ses parfums bâton par bâton.
       packSize   : combien de bâtons tiennent dans un sachet
       minPerPack : en dessous, on refuse de valider le sachet
                    (mets-le à packSize pour n'accepter que des sachets pleins)

     Le serveur applique la même limite : voir PACK_SIZE dans api/_lib.js. */
  packSize: 10,
  minPerPack: 1,

  /* Préfixe des références de commande : MT-3F9K2Q.
     En ligne, c'est ORDER_PREFIX côté serveur qui fait foi. */
  orderPrefix: 'MT',

  /* Mot de passe du back office en mode local UNIQUEMENT (développement).
     En ligne, c'est ADMIN_PASSWORD côté serveur qui décide, et cette
     valeur n'est jamais consultée. */
  adminPass: 'matea'
};
