/* MATEA — les 58 wilayas d'Algérie et le tarif de livraison.

   Source : grille Swift Express au départ de Tlemcen, colonne NON ECOM,
   prix STOP DESK (retrait en agence, pas livraison à domicile).

   Trois états, à ne pas confondre :
     livraison = un nombre : le tarif, en dinars
     livraison = 0         : livraison offerte (Tlemcen, on est sur place)
     livraison = null      : wilaya absente de la grille. La commande passe
                             quand même, le tarif se confirme au téléphone.
                             On n'invente pas un prix qu'il faudrait ensuite
                             renier devant le client.

   Ce fichier est lu des deux côtés — le navigateur l'inclut en <script>,
   les fonctions de /api le require(). Une seule table, donc aucun risque
   que l'affichage et la facturation divergent.

   Le découpage de 2019 a porté le pays de 48 à 58 wilayas ; les dix
   dernières sont les anciennes circonscriptions du Sud.                 */

(function (root) {

  var WILAYAS = [
    { code: '01', name: 'Adrar',               livraison: null },
    { code: '02', name: 'Chlef',               livraison: 500 },
    { code: '03', name: 'Laghouat',            livraison: 600 },
    { code: '04', name: 'Oum El Bouaghi',      livraison: 600 },
    { code: '05', name: 'Batna',               livraison: 600 },
    { code: '06', name: 'Béjaïa',              livraison: 500 },
    { code: '07', name: 'Biskra',              livraison: 550 },
    { code: '08', name: 'Béchar',              livraison: null },
    { code: '09', name: 'Blida',               livraison: 500 },
    { code: '10', name: 'Bouira',              livraison: 500 },
    { code: '11', name: 'Tamanrasset',         livraison: null },
    { code: '12', name: 'Tébessa',             livraison: 550 },
    { code: '13', name: 'Tlemcen',             livraison: 0 },   // offerte : on est sur place
    { code: '14', name: 'Tiaret',              livraison: 500 },
    { code: '15', name: 'Tizi Ouzou',          livraison: 500 },
    { code: '16', name: 'Alger',               livraison: 500 },
    { code: '17', name: 'Djelfa',              livraison: 550 },
    { code: '18', name: 'Jijel',               livraison: 500 },
    { code: '19', name: 'Sétif',               livraison: 500 },
    { code: '20', name: 'Saïda',               livraison: 500 },
    { code: '21', name: 'Skikda',              livraison: null },
    { code: '22', name: 'Sidi Bel Abbès',      livraison: 450 },
    { code: '23', name: 'Annaba',              livraison: 550 },
    { code: '24', name: 'Guelma',              livraison: 550 },
    { code: '25', name: 'Constantine',         livraison: 550 },
    { code: '26', name: 'Médéa',               livraison: 500 },
    { code: '27', name: 'Mostaganem',          livraison: 450 },
    { code: '28', name: "M'Sila",              livraison: 500 },
    { code: '29', name: 'Mascara',             livraison: 500 },
    { code: '30', name: 'Ouargla',             livraison: 650 },
    { code: '31', name: 'Oran',                livraison: 450 },
    { code: '32', name: 'El Bayadh',           livraison: 600 },
    { code: '33', name: 'Illizi',              livraison: null },
    { code: '34', name: 'Bordj Bou Arréridj',  livraison: 500 },
    { code: '35', name: 'Boumerdès',           livraison: 500 },
    { code: '36', name: 'El Tarf',             livraison: 650 },
    { code: '37', name: 'Tindouf',             livraison: null },
    { code: '38', name: 'Tissemsilt',          livraison: null },
    { code: '39', name: 'El Oued',             livraison: 700 },
    { code: '40', name: 'Khenchela',           livraison: null },
    { code: '41', name: 'Souk Ahras',          livraison: 550 },
    { code: '42', name: 'Tipaza',              livraison: 500 },
    { code: '43', name: 'Mila',                livraison: 550 },
    { code: '44', name: 'Aïn Defla',           livraison: 500 },
    { code: '45', name: 'Naâma',               livraison: 600 },
    { code: '46', name: 'Aïn Témouchent',      livraison: 450 },
    { code: '47', name: 'Ghardaïa',            livraison: 650 },
    { code: '48', name: 'Relizane',            livraison: 500 },
    { code: '49', name: 'Timimoun',            livraison: null },
    { code: '50', name: 'Bordj Badji Mokhtar', livraison: null },
    { code: '51', name: 'Ouled Djellal',       livraison: null },
    { code: '52', name: 'Béni Abbès',          livraison: null },
    { code: '53', name: 'In Salah',            livraison: null },
    { code: '54', name: 'In Guezzam',          livraison: null },
    { code: '55', name: 'Touggourt',           livraison: null },
    { code: '56', name: 'Djanet',              livraison: null },
    { code: '57', name: "El M'Ghair",          livraison: null },
    { code: '58', name: 'El Meniaa',           livraison: 650 }
  ];

  /* L'étiquette est ce qui est enregistré avec la commande : on la
     fabrique ici pour que le site et le serveur parlent de la même
     chaîne, au caractère près. */
  WILAYAS.forEach(function (w) { w.label = w.code + ' — ' + w.name; });

  function find(label) {
    for (var i = 0; i < WILAYAS.length; i++) {
      if (WILAYAS[i].label === label) return WILAYAS[i];
    }
    return null;
  }

  /* Montant à facturer : 0 aussi bien pour une livraison offerte que
     pour une wilaya hors grille. Pour distinguer les deux à l'affichage,
     c'est find() qu'il faut interroger et regarder w.livraison. */
  function livraison(label) {
    var w = find(label);
    return w && typeof w.livraison === 'number' ? w.livraison : 0;
  }

  var api = { list: WILAYAS, find: find, livraison: livraison };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MATEA_WILAYAS = api;

})(typeof window !== 'undefined' ? window : globalThis);
