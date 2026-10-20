/* MATEA — couche de données.

   Une seule interface, deux implémentations. Les pages n'appellent que
   MATEA.store et ignorent d'où viennent les données.

     listProducts(opts)   -> Promise<[produit]>
     saveProduct(p)       -> Promise<produit>        (crée ou met à jour)
     deleteProduct(id)    -> Promise<void>
     setStatus(id, s)     -> Promise<produit>        'active' | 'victime' | 'archived'
     createOrder(o)       -> Promise<commande>
     listOrders()         -> Promise<[commande]>
     setOrderStatus(id,s) -> Promise<commande>

   Le mode se choisit tout seul au chargement : on interroge /api/products.
   Si une fonction serverless répond, c'est le mode « remote » et tout
   transite par Supabase. Sinon on retombe sur le navigateur.

   Aucune clé Supabase ne vit ici. Elles sont dans les variables
   d'environnement Vercel, lues uniquement par les fonctions de /api.   */

window.MATEA = window.MATEA || {};

MATEA.store = (function () {
  var cfg = window.MATEA_CONFIG || {};
  var API = cfg.apiBase || '/api';

  /* ---------- outils ---------- */

  function uid() {
    return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function newRef() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';   // sans I, O, 0, 1
    for (var i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
    return (cfg.orderPrefix || 'MT') + '-' + s;
  }

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function bySort(a, b) {
    return (a.sort_order || 0) - (b.sort_order || 0) || String(a.name).localeCompare(String(b.name));
  }

  /* Un produit complet, quelles que soient les cases laissées vides. */
  function normalise(p) {
    return {
      id: p.id || uid(),
      slug: p.slug || String(p.name || 'parfum').toLowerCase()
              .normalize('NFD').replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: p.name || '',
      name_en: p.name_en || p.name || '',
      blurb: p.blurb || '',
      blurb_en: p.blurb_en || p.blurb || '',
      ingredients: Array.isArray(p.ingredients) ? p.ingredients
                 : String(p.ingredients || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      price_da: Number(p.price_da) || 0,
      tint: p.tint || '#9C4F1C',
      image_url: p.image_url || '',
      status: ['active', 'victime', 'archived'].indexOf(p.status) >= 0 ? p.status : 'active',
      sort_order: Number(p.sort_order) || 0
    };
  }

  /* Le fichier part en base64 dans du JSON : Vercel analyse déjà le JSON,
     ça évite d'écrire un analyseur multipart pour trois images. */
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        var s = String(fr.result);
        resolve({ name: file.name, type: file.type, data: s.slice(s.indexOf(',') + 1) });
      };
      fr.onerror = function () { reject(new Error('Lecture du fichier impossible')); };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- adaptateur local (ce navigateur seulement) ---------- */

  var PK = 'matea.products', OK = 'matea.orders';

  var local = {
    mode: 'local',

    listProducts: function (opts) {
      var all = read(PK, null);
      if (!all) {
        all = (window.MATEA_SEED || []).map(normalise);
        write(PK, all);
      }
      var keep = (opts && opts.includeArchived)
        ? all
        : all.filter(function (p) { return p.status !== 'archived'; });
      return Promise.resolve(keep.slice().sort(bySort));
    },

    saveProduct: function (p) {
      var all = read(PK, []), item = normalise(p);
      var i = all.findIndex(function (x) { return x.id === item.id; });
      if (i >= 0) all[i] = item; else all.push(item);
      write(PK, all);
      return Promise.resolve(item);
    },

    deleteProduct: function (id) {
      write(PK, read(PK, []).filter(function (x) { return x.id !== id; }));
      return Promise.resolve();
    },

    setStatus: function (id, status) {
      var all = read(PK, []), i = all.findIndex(function (x) { return x.id === id; });
      if (i < 0) return Promise.reject(new Error('Produit introuvable'));
      all[i].status = status;
      write(PK, all);
      return Promise.resolve(all[i]);
    },

    createOrder: function (o) {
      var order = {
        id: 'o-' + Date.now().toString(36),
        ref: newRef(),
        first_name: o.first_name, last_name: o.last_name, phone: o.phone,
        wilaya: o.wilaya, address: o.address,
        items: o.items, total_da: o.total_da,
        status: 'new', created_at: new Date().toISOString()
      };
      var all = read(OK, []);
      all.unshift(order);
      write(OK, all);
      return Promise.resolve(order);
    },

    listOrders: function () { return Promise.resolve(read(OK, [])); },

    setOrderStatus: function (id, status) {
      var all = read(OK, []), i = all.findIndex(function (x) { return x.id === id; });
      if (i < 0) return Promise.reject(new Error('Commande introuvable'));
      all[i].status = status;
      write(OK, all);
      return Promise.resolve(all[i]);
    },

    checkAdmin: function (pass) {
      return Promise.resolve(pass === (cfg.adminPass || 'matea'));
    },

    /* Pas de serveur en local : l'image devient une data URL, stockée
       avec le produit. Suffisant pour développer, à ne pas confondre
       avec un vrai envoi. */
    uploadImage: function (file) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () { resolve({ url: fr.result, local: true }); };
        fr.onerror = function () { reject(new Error('Lecture du fichier impossible')); };
        fr.readAsDataURL(file);
      });
    },

    reset: function () {
      try { localStorage.removeItem(PK); localStorage.removeItem(OK); } catch (e) {}
      return Promise.resolve();
    }
  };

  /* ---------- adaptateur distant (fonctions serverless + Supabase) ---------- */

  function call(path, options) {
    var o = options || {};
    var headers = { 'Content-Type': 'application/json' };
    if (MATEA.token) headers['x-matea-token'] = MATEA.token;
    return fetch(API + path, {
      method: o.method || 'GET',
      headers: headers,
      body: o.body ? JSON.stringify(o.body) : undefined
    }).then(function (r) {
      return r.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) {}
        if (!r.ok) {
          var err = new Error((data && data.error) || ('Erreur ' + r.status));
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  var firstList = null;   // la réponse de la sonde, réutilisée une fois

  var remote = {
    mode: 'remote',

    listProducts: function (opts) {
      if (firstList && !(opts && opts.includeArchived)) {
        var cached = firstList; firstList = null;
        return Promise.resolve(cached.map(normalise).sort(bySort));
      }
      return call('/products' + (opts && opts.includeArchived ? '?all=1' : ''))
        .then(function (rows) { return (rows || []).map(normalise).sort(bySort); });
    },

    saveProduct: function (p) {
      return call('/products', { method: 'POST', body: p }).then(normalise);
    },

    deleteProduct: function (id) {
      return call('/products?id=' + encodeURIComponent(id), { method: 'DELETE' })
        .then(function () {});
    },

    setStatus: function (id, status) {
      return call('/products', { method: 'PATCH', body: { id: id, status: status } })
        .then(normalise);
    },

    createOrder: function (o) {
      return call('/orders', { method: 'POST', body: o });
    },

    listOrders: function () { return call('/orders'); },

    setOrderStatus: function (id, status) {
      return call('/orders', { method: 'PATCH', body: { id: id, status: status } });
    },

    /* Le mot de passe n'est jamais comparé dans le navigateur : on tente
       un appel réservé à l'admin et on regarde si le serveur l'accepte. */
    checkAdmin: function (pass) {
      var before = MATEA.token;
      MATEA.token = pass;
      return call('/orders').then(function () { return true; })
        .catch(function (err) {
          MATEA.token = before;
          if (err.status === 401) return false;
          throw err;
        });
    },

    uploadImage: function (file) {
      return fileToBase64(file).then(function (payload) {
        return call('/upload', { method: 'POST', body: payload });
      });
    },

    reset: function () {
      return Promise.reject(new Error('Réinitialisation indisponible en ligne'));
    }
  };

  /* ---------- choix du mode ---------- */

  var active = local;

  /* Deux échecs très différents, qu'il ne faut pas confondre :

       404  aucune fonction servie (site ouvert en statique, dev local)
            -> mode local, c'est normal, on ne dit rien

       5xx  les fonctions répondent mais quelque chose cloche
            (variables d'environnement absentes, Supabase injoignable)
            -> mode local aussi, mais on garde le message : sans ça, la
               boutique a l'air de marcher alors qu'elle n'enregistre
               plus rien là où il faut. */
  var ready = fetch(API + '/products', { headers: { 'Content-Type': 'application/json' } })
    .then(function (r) {
      if (r.status === 404) { var soft = new Error('absent'); soft.soft = true; throw soft; }
      return r.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) {}
        if (!r.ok) throw new Error((data && data.error) || ('Erreur ' + r.status));
        return data;
      });
    })
    .then(function (rows) {
      firstList = rows;
      active = remote;
    })
    .catch(function (err) {
      active = local;
      if (!err || !err.soft) {
        api.problem = err && err.message ? err.message : 'API injoignable';
      }
    })
    .then(function () {
      api.mode = active.mode;
      return active;
    });

  function proxy(name) {
    return function () {
      var args = arguments;
      return ready.then(function (a) { return a[name].apply(a, args); });
    };
  }

  var api = {
    mode: 'detecting',
    problem: null,          // message quand /api répond mais échoue
    ready: ready,
    listProducts: proxy('listProducts'),
    saveProduct: proxy('saveProduct'),
    deleteProduct: proxy('deleteProduct'),
    setStatus: proxy('setStatus'),
    createOrder: proxy('createOrder'),
    listOrders: proxy('listOrders'),
    setOrderStatus: proxy('setOrderStatus'),
    checkAdmin: proxy('checkAdmin'),
    uploadImage: proxy('uploadImage'),
    reset: proxy('reset'),
    newRef: newRef,
    normalise: normalise
  };

  return api;
})();
