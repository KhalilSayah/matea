-- MATEA — schéma Supabase.
-- À coller tel quel dans le SQL Editor du projet Supabase.
-- Les colonnes correspondent une pour une aux objets de assets/js/products.js.
--
-- Un produit = un PARFUM de bâton, vendu à l'unité. Le doypack n'est pas
-- un produit : c'est un contenant que le client remplit lui-même. Sa
-- capacité est un réglage du site (MATEA_CONFIG.packSize), pas une donnée.

-- ---------------------------------------------------------------
-- Produits
-- ---------------------------------------------------------------
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  name_en         text,
  blurb           text,
  blurb_en        text,
  ingredients     text[] not null default '{}',
  price_da        integer not null check (price_da >= 0),  -- prix d'UN bâton
  tint            text not null default '#9C4F1C',
  image_url       text,
  status          text not null default 'active'
                  check (status in ('active', 'victime', 'archived')),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status, sort_order);

-- ---------------------------------------------------------------
-- Commandes
--
-- items est un tableau de doypacks composés, instantané au moment de
-- la commande. Si un parfum change de prix ou disparaît, la commande
-- passée garde ce qui a réellement été commandé. Forme :
--   [{ "pack": 1, "stick_count": 10, "total_da": 700,
--      "sticks": [{"id":"...","name":"Hibiscus & Gingembre","qty":4,"price_da":70}] }]
-- ---------------------------------------------------------------
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  ref         text unique not null,
  first_name  text not null check (length(trim(first_name)) >= 2),
  last_name   text not null check (length(trim(last_name))  >= 2),
  phone       text not null check (phone ~ '^0[1-7][0-9]{8}$'),
  wilaya      text not null,
  address     text not null check (length(trim(address)) >= 6),
  items       jsonb not null,
  total_da    integer not null check (total_da >= 0),
  status      text not null default 'new'
              check (status in ('new', 'confirmed', 'shipped', 'cancelled')),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- ---------------------------------------------------------------
-- updated_at automatique sur products
-- ---------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Privilèges
--
-- RLS et privilèges sont deux choses différentes, et il faut les deux.
--
--   privilèges : le rôle a-t-il le droit de toucher à cette table ?
--   RLS        : parmi les lignes, lesquelles a-t-il le droit de voir ?
--
-- service_role ignore RLS, mais PAS les privilèges. Sans les GRANT
-- ci-dessous, PostgREST répond 403 « permission denied for table
-- products » même avec la bonne clé.
--
-- Ne pas compter sur les privilèges par défaut du projet : ils dépendent
-- du rôle qui crée la table et de l'âge du projet. On les pose à la main,
-- le schéma devient reproductible partout.
--
-- Seul service_role reçoit quelque chose : tous les accès passent par les
-- fonctions de /api. anon et authenticated n'ont rien à faire ici.
-- ---------------------------------------------------------------
grant usage on schema public to service_role;

grant select, insert, update, delete on public.products to service_role;
grant select, insert, update, delete on public.orders   to service_role;

-- pour les tables que tu ajouterais plus tard dans ce schéma
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

-- ---------------------------------------------------------------
-- RLS
--
-- Le site ne parle JAMAIS à Supabase depuis le navigateur. Tout passe
-- par les fonctions de /api, qui utilisent la clé service_role — et
-- cette clé contourne RLS par construction.
--
-- On active donc RLS sans écrire aucune politique : toute clé publique
-- (anon) se retrouve devant des tables vides, même si elle fuite. La
-- validation des commandes se fait dans api/orders.js.
--
-- Activer RLS sans politique n'est pas un oubli : c'est la fermeture
-- la plus stricte possible, et Supabase cesse de signaler les tables
-- comme exposées.
-- ---------------------------------------------------------------
alter table public.products enable row level security;
alter table public.orders   enable row level security;

-- Si un jour tu veux lire le catalogue directement depuis le navigateur
-- avec la clé anon, décommente ceci — et seulement ceci. Les commandes,
-- elles, ne doivent jamais être lisibles sans authentification : elles
-- contiennent les noms, téléphones et adresses de tes clients.
--
-- create policy products_read_public on public.products
--   for select to anon, authenticated
--   using (status <> 'archived');

-- ---------------------------------------------------------------
-- Catalogue de départ
-- ---------------------------------------------------------------
insert into public.products
  (slug, name, name_en, blurb, blurb_en, ingredients, price_da, tint, image_url, status, sort_order)
values
  ('hibiscus-gingembre', 'Hibiscus & Gingembre', 'Hibiscus & Ginger',
   'Acidulé, rouge profond. Le gingembre arrive tard, au fond de la gorge.',
   'Tart and deep red. The ginger arrives late, at the back of the throat.',
   '{Hibiscus,Citron,Gingembre,Caramel}', 70, '#9C4F1C', 'assets/img/hibiscus.webp', 'active', 1),

  ('camomille-lavande', 'Camomille & Lavande', 'Chamomile & Lavender',
   'Doux, floral, à peine sucré. Celui de la fin de journée.',
   'Soft and floral, barely sweet. The one for the end of the day.',
   '{Camomille,Lavande,Verveine,Caramel}', 70, '#8E7BA8', 'assets/img/camomille.webp', 'active', 2),

  ('menthe-fenouil', 'Menthe & Fenouil', 'Mint & Fennel',
   'Frais d''abord, anisé en dessous. À boire après un long repas.',
   'Cooling first, anise underneath. Drink it after a long meal.',
   '{Fenouil,Menthe,Gingembre,Caramel}', 70, '#6E8F6A', 'assets/img/menthe.webp', 'active', 3)
on conflict (slug) do nothing;


-- ---------------------------------------------------------------
-- Stockage des images
--
-- Un bucket public : les photos de parfums sont servies directement
-- par Supabase, sans passer par le site. L'écriture, elle, reste
-- réservée au serveur — api/upload.js dépose avec la clé service_role,
-- qui ignore les politiques de storage.
--
-- file_size_limit est une deuxième barrière après celle de la fonction :
-- même avec une faille côté site, rien de plus gros ne rentre.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 3145728,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
