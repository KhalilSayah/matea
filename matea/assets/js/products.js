/* MATEA — catalogue de départ.

   Ces lignes servent de semence. Dès que l'admin ajoute, modifie ou
   supprime un produit, la version modifiée vit dans le navigateur
   (ou dans Supabase une fois branché) et ce fichier n'est plus relu
   que pour une réinitialisation.

   Un produit = un PARFUM de bâton, vendu à l'unité. Le client compose
   ensuite son doypack en mélangeant les parfums qu'il veut.
   Les champs correspondent un pour un à la table "products"
   de supabase/schema.sql.

   status : 'active'   -> en vente
            'victime'  -> victime de son succès, affiché mais non commandable
            'archived' -> masqué du site, conservé en base                    */

window.MATEA_SEED = [
  {
    id: 'seed-hibiscus',
    slug: 'hibiscus-gingembre',
    name: 'Hibiscus & Gingembre',
    name_en: 'Hibiscus & Ginger',
    blurb: 'Acidulé, rouge profond. Le gingembre arrive tard, au fond de la gorge.',
    blurb_en: 'Tart and deep red. The ginger arrives late, at the back of the throat.',
    ingredients: ['Hibiscus', 'Citron', 'Gingembre', 'Caramel'],
    price_da: 70,
    tint: '#9C4F1C',
    image_url: 'assets/img/hibiscus.webp',
    status: 'active',
    sort_order: 1
  },
  {
    id: 'seed-camomille',
    slug: 'camomille-lavande',
    name: 'Camomille & Lavande',
    name_en: 'Chamomile & Lavender',
    blurb: 'Doux, floral, à peine sucré. Celui de la fin de journée.',
    blurb_en: 'Soft and floral, barely sweet. The one for the end of the day.',
    ingredients: ['Camomille', 'Lavande', 'Verveine', 'Caramel'],
    price_da: 70,
    tint: '#8E7BA8',
    image_url: 'assets/img/camomille.webp',
    status: 'active',
    sort_order: 2
  },
  {
    id: 'seed-menthe',
    slug: 'menthe-fenouil',
    name: 'Menthe & Fenouil',
    name_en: 'Mint & Fennel',
    blurb: "Frais d'abord, anisé en dessous. À boire après un long repas.",
    blurb_en: 'Cooling first, anise underneath. Drink it after a long meal.',
    ingredients: ['Fenouil', 'Menthe', 'Gingembre', 'Caramel'],
    price_da: 70,
    tint: '#6E8F6A',
    image_url: 'assets/img/menthe.webp',
    status: 'active',
    sort_order: 3
  }
];
