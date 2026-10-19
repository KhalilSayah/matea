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
admin.html              le back office

assets/css/styles.css   reset, tokens de design, composants de la landing
assets/css/shop.css     commande et back office

assets/js/config.js     Supabase et mot de passe admin  <- le seul fichier à remplir
assets/js/products.js   catalogue de départ
assets/js/store.js      couche de données : local ou Supabase
assets/js/scene.js      la tasse et le bâton qui fond — canvas, piloté par le scroll
assets/js/deck.js       le carrousel de parfums et le retournement des cartes
assets/js/i18n.js       moteur FR / EN + textes de la landing
assets/js/i18n.shop.js  textes des pages commande et admin
assets/js/caramel.js    la traînée de caramel au doigt
assets/js/dock.js       l'appel à l'action collé en bas de la landing
assets/js/wilayas.js    les 58 wilayas
assets/js/commander.js  panier et commande
assets/js/admin.js      gestion du catalogue et des commandes

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

`/commander` — aucun compte, aucun paiement en ligne.

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

- **Produits** : ajouter, modifier, supprimer un *parfum*, et le bouton **Victime**
  qui le bascule entre « en vente » et « victime de son succès ». Dans cet état il
  reste visible sur la boutique, en noir et blanc, avec le bandeau et un bouton
  désactivé — la demande reste visible, la vente est coupée.
- **Commandes** : référence, client, téléphone cliquable, contenu, total, et un
  statut à faire avancer (nouvelle → confirmée → livrée).

### Ce mot de passe n'est pas une sécurité

Il est écrit en clair dans `config.js`, que n'importe quel visiteur peut lire.
Il écarte un curieux, rien de plus. Avant la mise en ligne, choisis une vraie
protection :

1. **Tout de suite** — Vercel → Settings → Deployment Protection → Password
   Protection. Vercel demande alors le mot de passe avant même de servir la page.
2. **À terme** — Supabase Auth (voir ci-dessous). Les politiques RLS refusent
   toute écriture non authentifiée, même si quelqu'un ouvre `/admin`.

`admin.html` est déjà en `noindex, nofollow` : il ne remontera pas dans Google.

## Passer sur Supabase

Aujourd'hui, catalogue et commandes vivent dans le navigateur. Utile pour
essayer, inutilisable à deux : les commandes prises sur le téléphone d'un
client n'apparaissent pas dans ton admin.

Le basculement ne touche qu'un fichier.

1. Crée un projet sur [supabase.com](https://supabase.com).
2. SQL Editor → colle `supabase/schema.sql` → Run. Tables, index, politiques RLS
   et catalogue de départ sont créés.
3. Settings → API → copie **Project URL** et la clé **anon public**.
4. Remplis `assets/js/config.js` :

```js
window.MATEA_CONFIG = {
  supabaseUrl: 'https://xxxxxxxxxxxx.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',
  ...
};
```

C'est tout. `store.js` détecte les deux champs et bascule : la boutique lit le
catalogue en base, les commandes y arrivent, et le badge du back office passe de
`local` à `supabase`.

Aucune dépendance à installer — `store.js` parle à PostgREST en `fetch()`.

**La clé anon est publique**, et c'est normal : elle est faite pour vivre dans
le navigateur. Ce qui protège les données, ce sont les politiques RLS du schéma :
tout le monde peut lire le catalogue et déposer une commande, personne ne peut
relire les commandes des autres ni toucher au catalogue sans être connecté.
Ne mets jamais la clé `service_role` dans `config.js`.

### Reste à faire côté Supabase

Le back office écrit avec la clé anon. Tant que tu n'as pas branché Supabase
Auth, les politiques `authenticated` bloqueront ses écritures — c'est voulu,
mais il faut donc faire l'étape suivante avant de l'utiliser en vrai :

1. Supabase → Authentication → crée ton compte par email.
2. Ajoute un écran de connexion dans `admin.html` qui appelle
   `/auth/v1/token?grant_type=password` et range le `access_token` dans
   `MATEA.accessToken`.

`store.js` est déjà prêt : il envoie `MATEA.accessToken` s'il existe, et retombe
sur la clé anon sinon. Dis-le-moi quand tu veux cette partie.


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
