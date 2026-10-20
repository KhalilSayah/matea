# MATEA — tea on a stick

Landing page mobile. Site statique : pas de build, pas de framework, pas de dépendances.
Du HTML, du CSS et quatre fichiers JavaScript.

## Déployer sur Vercel

### Option A — depuis GitHub (recommandé)

```bash
git init && git add . && git commit -m "MATEA landing page"
git remote add origin git@github.com:<toi>/matea.git
git push -u origin main
```

Puis sur [vercel.com/new](https://vercel.com/new) : importe le dépôt.
**Framework Preset : Other.** Laisse « Build Command » et « Output Directory » vides.
Chaque `git push` redéploie automatiquement.

### Option B — depuis le terminal

```bash
npx vercel
```

Réponds aux questions, puis `npx vercel --prod` pour passer en production.

Rien d'autre à configurer : `vercel.json` s'occupe des en-têtes et des URL propres.

## Développer en local

```bash
npx serve .
```

ou, sans Node :

```bash
python -m http.server 3000
```

Puis ouvre `http://localhost:3000`. Pas de rechargement à chaud — rafraîchis la page.

> **Attention au cache.** `python -m http.server` laisse le navigateur garder
> le CSS et le JS en mémoire : tu modifies un fichier, tu rafraîchis, et tu
> vois encore l'ancienne version — sans aucun message d'erreur. `npx serve`
> ne fait pas ça. Avec Python, force un rechargement dur (Ctrl+Shift+R) après
> chaque modification de `assets/`. En production, `vercel.json` envoie déjà
> `must-revalidate` sur le CSS et le JS, donc le problème ne s'y pose pas.

> Ouvrir `index.html` directement par double-clic ne marche pas : les chemins
> commencent par `/`, il faut un serveur.

## Structure

```
index.html              la landing
commander.html          la page de commande, sans compte
admin.html              les commandes — l'entrée du back office
catalogue.html          les parfums

assets/css/styles.css   reset, tokens de design, composants de la landing
assets/css/shop.css     commande et back office

assets/js/config.js     Supabase et mot de passe admin  <- le seul fichier à remplir
assets/js/products.js   catalogue de départ
assets/js/store.js      couche de données : local ou Supabase
assets/js/scene.js      la tasse et le bâton qui fond — canvas, piloté par le scroll
assets/js/deck.js       le carrousel de parfums et le retournement des cartes
assets/js/i18n.js       moteur FR / EN + textes de la landing
assets/js/i18n.shop.js  textes des pages commande et admin
assets/js/caramel.js    la traînée de caramel au doigt — DÉSACTIVÉE
assets/js/dock.js       l'appel à l'action collé en bas de la landing
api/upload.js           dépôt des images dans Supabase Storage
assets/js/wilayas.js    les 58 wilayas
assets/js/composer.js   le composeur de doypack, panier et commande
assets/js/admin-shell.js  verrou, badge et outils partagés par les deux pages admin
assets/js/catalogue.js  les parfums
assets/js/orders.js     les commandes

assets/img/             photos, image de partage, favicon
supabase/schema.sql     tables, index et politiques RLS
vercel.json             en-têtes de cache et de sécurité
```

`styles.css` est chargé sur les trois pages : il porte les tokens de couleur
et de typo. `shop.css` ne sert qu'à la commande et à l'admin.

> Les classes des deux feuilles ne doivent pas se marcher dessus. `.back`,
> `.band` et `.step` existaient déjà dans la landing : les équivalents de la
> boutique s'appellent `.gohome`, `.pstripe` et `.qty`. Si tu ajoutes une
> classe à `shop.css`, vérifie qu'elle n'existe pas déjà dans `styles.css`.

## Modifier le contenu

### Les textes

Le français est écrit **directement dans `index.html`** — la page s'affiche
correctement avant même que le JavaScript ne se charge.
L'anglais vit dans le dictionnaire `EN` en haut de `assets/js/i18n.js`.

Pour changer une phrase en français, édite `index.html`.
Pour changer sa traduction, édite la clé correspondante dans `i18n.js`.

Pour ajouter une phrase traduisible :

```html
<p data-t="maCle">Le texte français</p>
```

```js
// dans i18n.js
maCle: 'The English text',
```

Les attributs se traduisent aussi :

```html
<input data-t="emailIn" data-tattr="placeholder,aria-label" ...>
```

```js
'emailIn:placeholder': 'you@email.com',
```

« Tea on a stick » et les noms de plantes (Hibiscus, Camomille, Verveine,
Fenouil…) restent identiques dans les deux langues — ils ne portent pas de `data-t`.

### Les photos des bâtons

Remplace les fichiers dans `assets/img/`. Les images actuelles sont des photos
recadrées sur fond de pierre : la classe `photo` leur applique un masque circulaire
qui fond le décor dans le noir de la carte.

**Avec des PNG détourés**, retire cette classe :

```html
<!-- avant -->
<div class="media photo"><img src="assets/img/hibiscus.webp" ...></div>
<!-- après -->
<div class="media"><img src="assets/img/hibiscus.png" ...></div>
```

Le bâton se pose alors directement sur le noir, et le halo ambré reste derrière.

### Les prix

Le prix d'un bâton se change dans le back office, ou dans `products.js` pour
la semence. Sur la landing, `70 DA` est écrit en dur dans `index.html` et dans
la clé `p4` de `i18n.js`.

## Régler l'animation du héros

Tout est dans `assets/js/scene.js`.

| Ce que tu veux changer | Où |
| --- | --- |
| La longueur du défilement | `.track { height: 420svh }` dans `styles.css` |
| Le moment de chaque étape | les appels `seg(p, début, fin)` dans `frame()` |
| La forme de la tasse | les constantes `RIM`, `BASE`, `RTOP`, `RBOT`, `RY` |
| La couleur du thé | `WATER_T`, `WATER_B`, `TEA_T`, `TEA_B` |
| La densité des volutes | `MAXP` et la boucle `spawn()` |

`p` va de 0 (haut de page) à 1 (fin du défilement du héros).
`seg(p, 0.38, 0.72)` veut dire : cette étape court de 38 % à 72 % du défilement.

## Accessibilité et performance

- La page est lisible sans JavaScript : tout le contenu est dans le HTML.
- `prefers-reduced-motion` coupe la traînée de caramel, les volutes et la vapeur.
- Les cartes sont des `<button>` : navigables au clavier, `aria-pressed` suit l'état.
- Les photos sont en `loading="lazy"`.

## À finir

- [ ] Les chiffres sont des placeholders : 9 g, 250 ml, 40 s, 630 DA la boîte.
- [ ] Le formulaire email ne fait rien. Pour le brancher : un endpoint Vercel
      dans `api/subscribe.js`, ou un service externe (Formspree, Resend).
- [ ] Les polices viennent de Google Fonts. Pour gagner une requête bloquante,
      héberge Archivo en local dans `assets/fonts/`.


## Composer son doypack

Deux endroits, un seul code : le bas de la landing (`#commander`) et la page
`/commander`. `assets/js/composer.js` s'injecte dans n'importe quel
`<div data-composer></div>`, donc le panier et le formulaire n'existent
qu'en un seul exemplaire.

> `composer.js` doit être chargé **avant** `i18n.js` : il injecte le français
> que le moteur de traduction relève ensuite comme texte de référence. Les
> éléments fixes — barre de panier, feuille de confirmation, toast — sont
> ajoutés à `<body>`, hors du flux, pour qu'aucun parent avec `transform`
> ou `overflow` ne casse leur positionnement.

Depuis la page d'accueil, le bandeau collé en bas ne change plus de page : il
fait glisser jusqu'à la section de commande, et s'efface dès qu'on y est ou
dès qu'un doypack est au panier — la barre de panier prend le relais.

Aucun compte, aucun paiement en ligne.

**Le doypack n'est pas un produit, c'est un contenant que le client remplit.**
Un produit, c'est un *parfum de bâton* vendu à l'unité (70 DA). Le client
mélange ce qu'il veut : deux hibiscus, trois menthe, le reste en camomille.

Le sachet affiché se remplit en direct : chaque bâton ajouté apparaît dans la
fenêtre du doypack à la couleur de son parfum, et la bande du bas devient un
dégradé du mélange en cours. Quand le sachet est plein, les boutons `+` se
désactivent.

Un sachet validé part au panier et le composeur se vide pour le suivant : on
peut commander plusieurs doypacks, chacun avec son propre mélange.

### Régler la capacité

Dans `assets/js/config.js` :

```js
packSize: 10,    // combien de bâtons tiennent dans un sachet
minPerPack: 1,   // en dessous, on refuse de valider le sachet
```

`minPerPack: 10` n'accepterait que des sachets pleins. Le nombre de colonnes de
la fenêtre s'ajuste tout seul à `packSize`.

Le prix d'un sachet est la somme de ses bâtons — pas de remise au sachet plein.
Si tu en veux une, c'est dans `priceOf()` de `commander.js`.

### Le formulaire

**Prénom, nom, téléphone, wilaya, adresse**, puis une référence du type
`MT-EWNRDX`. Les 58 wilayas sont dans `assets/js/wilayas.js` et remplissent
la liste déroulante toutes seules. La wilaya choisie est mémorisée pour la
commande suivante.

Le numéro est normalisé avant validation : `+213 555 12 34 56`,
`00213555123456` et `0555 12 34 56` donnent tous `0555123456`. Le format
attendu est un numéro algérien à dix chiffres.

Le panier survit à un rechargement (`localStorage`). Si un parfum passe en
rupture entre-temps, il est retiré des sachets déjà composés au chargement
suivant.

## Back office

`/admin`, mot de passe dans `config.js` (`matea` par défaut).

Deux pages, parce qu'on ne les ouvre pas pour les mêmes raisons.

**`/admin` — les commandes.** C'est l'entrée du back office : c'est ce qu'on
vient voir tous les jours. Référence, client, téléphone cliquable, wilaya et
adresse, contenu par doypack, total, le statut à faire avancer
(nouvelle → confirmée → livrée), et la suppression.

En haut, quatre compteurs par statut. **Un clic filtre la liste**, un second
clic l'enlève. Les compteurs portent toujours sur l'ensemble, jamais sur ce qui
est affiché : filtrer sur « livrée » ferait sinon tomber les autres chiffres à
zéro, et on ne saurait plus où on en est. Une cinquième tuile donne le total
encaissé à terme, annulées exclues.

**`/catalogue` — les parfums.** Ajouter, modifier, supprimer, envoyer une image,
et le bouton **Victime** qui bascule entre « en vente » et « victime de son
succès ». Dans cet état le parfum reste visible sur la boutique et sur le
carrousel, en noir et blanc, avec son bandeau — la demande reste visible, la
vente est coupée.

Le mot de passe vaut pour les deux pages tant que l'onglet reste ouvert.

Une commande supprimée ne se récupère pas : le bouton demande confirmation
sur lui-même, et se réarme seul après quatre secondes.

### Le mot de passe

En ligne, il est vérifié **par le serveur** : la page envoie ce que tu tapes
dans un en-tête `x-matea-token`, et `api/_lib.js` le compare à
`ADMIN_PASSWORD` à temps constant. Il n'apparaît nulle part dans le code de la
page, et ouvrir `/admin` sans le bon mot de passe ne donne accès à rien : les
fonctions répondent 401.

En local, sans variables d'environnement, c'est la valeur `adminPass` de
`config.js` qui sert — uniquement pour développer.

`admin.html` est en `noindex, nofollow` : il ne remontera pas dans Google.
Pour une couche de plus, Vercel → Settings → Deployment Protection ajoute un
mot de passe devant tout le site.

## Supabase et la mise en ligne

### Pourquoi des fonctions serverless

Les variables d'environnement Vercel **n'existent pas pour un site statique**.
Un fichier servi au navigateur ne peut pas lire `process.env` : tout ce qu'on
écrirait dans `config.js` serait public.

Les commandes passent donc par trois fonctions dans `api/`, exécutées sur
Vercel. Elles seules connaissent Supabase. Le navigateur ne voit jamais la
moindre clé — il parle à `/api/products` et `/api/orders`, c'est tout.

Ce n'est pas qu'une question de secret. Le serveur **relit les prix en base et
recalcule le total** : un client qui trafique la requête pour commander dix
bâtons à 1 DA se fait enregistrer 700 DA. Les prix envoyés par le navigateur
ne sont jamais crus.

```
navigateur  ──►  /api/orders  ──►  Supabase
(aucune clé)     (service_role)    (RLS fermée)
```

### Les trois variables à mettre dans Vercel

Project → Settings → Environment Variables. Coche Production, Preview et
Development pour chacune.

| Variable | Où la trouver | Rôle |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | l'adresse du projet |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` | lecture et écriture, côté serveur |
| `ADMIN_PASSWORD` | tu la choisis | ouvre `/admin` |

Deux variables facultatives : `PACK_SIZE` (défaut 10) et `ORDER_PREFIX`
(défaut `MT`). Le modèle complet est dans `.env.example`.

> **`service_role`, pas `anon`.** La clé `anon` est faite pour vivre dans un
> navigateur et reste bridée par les politiques RLS. La `service_role` les
> contourne toutes : elle ne doit jamais sortir du serveur. Ne la mets pas
> dans `config.js`, ne la commite pas, ne la montre pas dans une capture.
> Si elle fuite, régénère-la depuis Supabase.

### Mise en route

1. Crée un projet sur [supabase.com](https://supabase.com).
2. SQL Editor → colle `supabase/schema.sql` → Run. Tables, index, contraintes,
   RLS et catalogue de départ sont créés.
3. Settings → API → copie l'URL et la clé `service_role`.
4. Mets les trois variables dans Vercel, puis redéploie
   (Deployments → … → Redeploy). **Une variable ajoutée ne s'applique qu'au
   déploiement suivant.**

Ouvre `/admin` : le badge en haut doit passer de `local` à `supabase`.

### Quand ça ne marche pas

Ouvre **`/api/health`** sur ton déploiement. La page dit lesquelles des trois
variables manquent, si Supabase répond, si la bonne clé a été collée, et
combien de produits sont visibles. Avec le mot de passe admin en en-tête, elle
donne en plus le message d'erreur exact de Supabase.

Les trois pannes les plus fréquentes, dans l'ordre :

1. **Les variables ont été ajoutées après le déploiement.** Elles ne
   s'appliquent qu'au suivant. Deployments → … → Redeploy.
2. **C'est la clé `anon` qui a été collée dans `SUPABASE_SERVICE_ROLE_KEY`.**
   RLS n'ayant aucune politique, toutes les tables paraissent vides : le
   catalogue s'affiche vide, sans erreur. `/api/health` lit le rôle inscrit
   dans la clé et le dit.
3. **Le schéma a été exécuté sur un autre projet Supabase** que celui dont
   l'URL est dans Vercel.
4. **`403 — permission denied for table products`** : les `GRANT` du schéma
   n'ont pas été passés. RLS et privilèges sont deux choses différentes —
   `service_role` ignore RLS mais pas les privilèges. Rejoue le bloc
   « Privilèges » de `supabase/schema.sql`.

Le back office affiche toujours l'état en haut : `local`, `supabase`, ou
`erreur` en rouge avec le message.

### Et sans les variables ?

Le site fonctionne quand même. Au chargement il interroge `/api/products` ;
si rien ne répond, il bascule en mode local et garde tout dans le navigateur
du visiteur. Pratique pour développer, inutilisable en vrai : une commande
prise sur le téléphone d'un client n'apparaîtra jamais dans ton back office.

Le badge du back office dit toujours dans quel mode tu es.

### Ce que fait le schéma

RLS est activée sur les deux tables **sans aucune politique**. Ce n'est pas un
oubli : comme tous les accès passent par la clé `service_role`, qui contourne
RLS, laisser zéro politique ferme la porte à toute clé publique qui viendrait
à fuiter. La table `orders` contient les noms, téléphones et adresses de tes
clients ; elle ne doit être lisible que par le serveur.

Les commandes gardent un instantané de ce qui a été acheté — nom et prix du
parfum au moment de l'achat. Changer un prix ou archiver un parfum ne réécrit
pas l'historique.

## L'appel à l'action collé en bas

Sur la landing, un bandeau apparaît en bas de l'écran une fois la séquence de
fonte passée, et suit le lecteur jusqu'au bout de la page. Il s'efface quand le
bloc d'inscription arrive à l'écran, pour ne pas doubler un bouton identique.

Les deux seuils sont dans `assets/js/dock.js` : la sortie se déclenche quand le
bas du `#track` remonte au-dessus de 85 % de la hauteur d'écran, et la
disparition est pilotée par un `IntersectionObserver` sur `.cta`.

La page de commande n'a pas ce bandeau : sa barre de panier occupe déjà le bas.

## Pièges connus

Deux bugs ont coûté cher pendant la construction, les deux de la même famille —
une règle CSS qui en touche une autre sans prévenir.

**Les noms de classes.** `styles.css` et `shop.css` sont chargés ensemble sur
les trois pages. `.back`, `.band` et `.step` existaient déjà dans la landing :
les équivalents de la boutique s'appellent `.gohome`, `.pstripe` et `.qty`.
À l'intérieur même de `shop.css`, `.empty` est la boîte « catalogue vide » avec
ses 30 px de padding — les emplacements vides du doypack s'appellent donc
`.free`, pas `.empty`. Avant d'ajouter une classe, vérifie qu'elle est libre.

**Les cellules à `aspect-ratio` dans une grille.** Une cellule qui porte un
`aspect-ratio` dans une piste `auto` reporte sa hauteur en largeur minimale :
la piste refuse de rétrécir et la grille déborde de son parent. Même chose pour
un `<svg>` à `viewBox` et `height:100%` posé dans une cellule. La fenêtre du
doypack s'en sort avec trois précautions : hauteur fixe du conteneur, pistes en
`minmax(0,1fr)`, et le SVG en `position:absolute` pour qu'il ne participe pas
au calcul.


## La traînée de caramel

L'effet existe toujours dans `assets/js/caramel.js` mais n'est chargé par
aucune page. Pour le remettre sur la landing, deux lignes dans `index.html` :

```html
<!-- juste après <body> -->
<canvas id="trail" aria-hidden="true"></canvas>

<!-- avec les autres scripts, en fin de page -->
<script src="assets/js/caramel.js" defer></script>
```

et décommente la règle `#trail` à la fin de `assets/css/styles.css`.

L'effet ne se déclenche qu'au doigt et au stylet, jamais à la souris, et se
coupe tout seul si le visiteur a demandé moins d'animations dans son système.

## Gestes tactiles

Le double-tap ne zoome plus : `touch-action: manipulation` est posé sur la
racine et sur toutes les commandes. Le zoom au **pincement reste actif** —
c'est une aide d'accessibilité, et c'est pour ça qu'on n'écrit pas
`user-scalable=no` dans le viewport, ce qui le supprimerait (et qu'iOS ignore
de toute façon).

Tous les champs de saisie sont à 16 px au minimum : en dessous, iOS zoome
automatiquement quand on tape dedans, et ne dézoome jamais.


## Les images de parfums

Le back office envoie l'image directement : « Choisir une image », et le
chemin se remplit tout seul.

### Pourquoi pas les identifiants S3

Supabase expose bien un endpoint compatible S3, avec clé d'accès, secret,
endpoint et région. Mais il faut signer chaque requête en SigV4 à la main :
une centaine de lignes de cryptographie, sans bibliothèque, pour exactement
le même résultat. Et c'est un jeu d'identifiants de plus à garder secret.

L'API Storage de Supabase accepte la clé `service_role` déjà configurée.
Rien à ajouter dans Vercel — le bucket est créé par le schéma.

### Ce qui se passe à l'envoi

1. Le navigateur redimensionne l'image à 900 px de côté maximum et la
   réencode en WebP. Une photo de téléphone de 4 Mo descend à quelques
   dizaines de kilooctets, et elle ne sera jamais affichée plus large
   que 400 px de toute façon.
2. Elle part en base64 dans du JSON vers `/api/upload`, qui vérifie le
   jeton admin, le format et le poids.
3. La fonction la dépose dans le bucket `products` avec la clé
   `service_role`, sous un nom assaini suivi d'un suffixe aléatoire —
   deux « menthe.webp » ne s'écrasent pas, et le navigateur ne ressert
   pas l'ancienne depuis son cache.
4. L'URL publique revient et remplit le champ du formulaire.

Trois barrières sur le poids, et c'est voulu : le navigateur redimensionne,
la fonction refuse au-delà de 3 Mo, et le bucket lui-même a une limite
`file_size_limit`. Même avec une faille côté site, rien de plus gros n'entre.

Le champ texte reste disponible en dessous pour les images déjà dans
`assets/img/`.

En mode local, sans serveur, l'image est gardée en data URL dans le
navigateur — assez pour développer, et le message le dit clairement.

## Le panneau clair

La section de commande de la landing est en blanc pour trancher avec le reste
du site. Plutôt que de réécrire chaque composant, `.lightpanel` **échange les
jetons** de surface et d'encre : tout ce qui est peint avec `var(--ink)` ou
`var(--cream)` bascule tout seul.

Les noms deviennent ironiques — `--ink` vaut une couleur claire à l'intérieur
— mais le sens tient : `--ink` reste « le fond », `--cream` reste « ce qui
s'écrit dessus ». Le sachet, lui, garde son noir : c'est le produit, pas
l'interface, donc l'échange y est annulé.


## Le carrousel de la landing

Les cartes qui se retournent viennent du catalogue, comme le composeur : un
parfum ajouté dans le back office y apparaît sans toucher au HTML. Un parfum
marqué **victime de son succès** y reste, en noir et blanc, avec son bandeau
en travers et « indisponible » au dos — la demande continue de se voir, la
vente est coupée.

Le texte des cartes vient de la base, donc il n'a pas de clés de traduction :
remplis les champs anglais du formulaire pour qu'elles basculent aussi.
