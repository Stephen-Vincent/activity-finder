-- ============================================================================
-- Activity Finder — initial schema
-- Migration: 0001_init.sql
--
-- Conceptual model: docs/DESIGN.md §7
-- Reference doc:    docs/DATA_MODEL.md
--
-- Order of operations:
--   1. Extensions
--   2. Enums
--   3. Helper trigger fn (set_updated_at)
--   4. Tables (in dependency order) with their indexes + updated_at triggers
--   5. is_admin() helper + auth.users -> public.users trigger
--   6. RPCs (venues_within, claim_venue)
--   7. RLS enable + policies
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive text (emails, slugs)
create extension if not exists "postgis";    -- geography(Point, 4326) for venues.location


-- ----------------------------------------------------------------------------
-- 2. Enums
-- ----------------------------------------------------------------------------
create type country_code        as enum ('GB-NIR', 'IE');
create type currency            as enum ('GBP', 'EUR');
create type distance_unit       as enum ('mi', 'km');
create type price_band          as enum ('free', 'low', 'mid', 'high');
create type indoor_outdoor      as enum ('indoor', 'outdoor', 'both');
create type parking_type        as enum ('none', 'street', 'car_park_free', 'car_park_paid');
create type venue_status        as enum ('unclaimed', 'claimed', 'verified', 'pro', 'closed');
create type venue_tier          as enum ('free', 'pro');
create type venue_owner_role    as enum ('owner', 'editor');
create type review_status       as enum ('pending', 'approved', 'rejected');
create type plan_type           as enum ('parent_premium', 'venue_pro');
create type subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled',
  'unpaid', 'incomplete', 'incomplete_expired', 'paused'
);
create type promotion_status    as enum ('scheduled', 'active', 'paused', 'completed');
create type booking_provider    as enum (
  'native', 'tiqets', 'getyourguide', 'klook',
  'bokun', 'roller', 'checkfront', 'external'
);
create type school_region       as enum ('NI', 'ROI');


-- ----------------------------------------------------------------------------
-- 3. Helper: updated_at trigger function
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. Tables
-- ----------------------------------------------------------------------------

-- users — mirror of auth.users; populated by handle_new_user trigger below.
create table public.users (
  id                       uuid primary key references auth.users(id) on delete cascade,
  email                    citext unique not null,
  display_name             text,
  avatar_url               text,
  home_postcode            text,
  country_code             country_code,
  preferred_currency       currency,
  preferred_distance_unit  distance_unit,
  marketing_opt_in         boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- staff — gates is_admin(). Bootstrap by inserting your own row via the
-- service role key (see docs/SETUP.md once that flow is written).
create table public.staff (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.users(id) on delete cascade,
  role        text not null check (role in ('admin', 'moderator', 'support')),
  created_at  timestamptz not null default now()
);

-- children — private profiles owned by a parent. Never exposed to venues.
create table public.children (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  nickname    text not null,
  dob         date not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index children_user_id_idx on public.children(user_id);
create trigger children_set_updated_at before update on public.children
  for each row execute function public.set_updated_at();

-- categories — taxonomy with optional parent for hierarchy ("Indoor → Soft play").
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        citext unique not null,
  name_en     text not null,
  parent_id   uuid references public.categories(id) on delete set null,
  position    smallint not null default 0,
  created_at  timestamptz not null default now()
);
create index categories_parent_id_idx on public.categories(parent_id);

-- venues — the canonical place.
create table public.venues (
  id                   uuid primary key default gen_random_uuid(),
  slug                 citext unique not null,
  name                 text not null,
  description          text,
  country_code         country_code not null,
  address_line1        text,
  address_line2        text,
  town                 text,
  postcode             text,
  location             geography(point, 4326),
  phone                text,
  email                citext,
  website              text,
  price_band           price_band,
  currency             currency not null,
  indoor_outdoor       indoor_outdoor,
  min_age              smallint check (min_age between 0 and 17),
  max_age              smallint check (max_age between 0 and 17),
  accessibility_flags  jsonb not null default '{}'::jsonb,
  parking              parking_type,
  public_transport     text,
  status               venue_status not null default 'unclaimed',
  tier                 venue_tier not null default 'free',
  source               text,                   -- audit: where the row originated
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  verified_at          timestamptz,
  check (max_age is null or min_age is null or max_age >= min_age)
);
create index venues_location_gix    on public.venues using gist (location);
create index venues_country_code_idx on public.venues(country_code);
create index venues_tier_idx        on public.venues(tier);
create index venues_status_idx      on public.venues(status);
create trigger venues_set_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

-- venue_categories — many-to-many between venues and categories.
create table public.venue_categories (
  venue_id    uuid not null references public.venues(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (venue_id, category_id)
);
create index venue_categories_category_idx on public.venue_categories(category_id, venue_id);

-- venue_owners — which users own/edit which venues. verified_at = null means pending claim.
create table public.venue_owners (
  user_id      uuid not null references public.users(id) on delete cascade,
  venue_id     uuid not null references public.venues(id) on delete cascade,
  role         venue_owner_role not null default 'owner',
  verified_at  timestamptz,
  created_at   timestamptz not null default now(),
  primary key (user_id, venue_id)
);
create index venue_owners_venue_idx on public.venue_owners(venue_id);

-- venue_photos — separate row per photo; ordered by `position`.
create table public.venue_photos (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references public.venues(id) on delete cascade,
  storage_path  text not null,                  -- path within Supabase Storage bucket
  position      smallint not null default 0,
  caption       text,
  created_at    timestamptz not null default now()
);
create index venue_photos_venue_idx on public.venue_photos(venue_id, position);

-- opening_hours — per venue, per weekday; supports seasonal overrides via valid_from/to.
-- weekday is ISO day-of-week: 1 = Mon … 7 = Sun.
create table public.opening_hours (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),
  opens_at    time not null,
  closes_at   time not null,
  valid_from  date,
  valid_to    date,
  check (closes_at > opens_at)
);
create index opening_hours_venue_idx on public.opening_hours(venue_id);

-- events — one-off or recurring activities at a venue.
create table public.events (
  id                uuid primary key default gen_random_uuid(),
  venue_id          uuid not null references public.venues(id) on delete cascade,
  title             text not null,
  description       text,
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  recurrence_rule   text,                       -- iCal RRULE string
  min_age           smallint check (min_age between 0 and 17),
  max_age           smallint check (max_age between 0 and 17),
  price             numeric(10, 2),
  currency          currency,
  booking_url       text,
  booking_provider  booking_provider,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (max_age is null or min_age is null or max_age >= min_age)
);
create index events_venue_starts_idx on public.events(venue_id, starts_at);
create index events_starts_idx       on public.events(starts_at);
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- reviews
create table public.reviews (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references public.venues(id) on delete cascade,
  user_id         uuid references public.users(id) on delete set null,
  rating          smallint not null check (rating between 1 and 5),
  body            text,
  visit_date      date,
  verified_visit  boolean not null default false,
  status          review_status not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index reviews_venue_created_idx on public.reviews(venue_id, created_at desc);
create index reviews_user_idx          on public.reviews(user_id);
create index reviews_status_idx        on public.reviews(status);
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- review_photos
create table public.review_photos (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references public.reviews(id) on delete cascade,
  storage_path  text not null,
  position      smallint not null default 0,
  created_at    timestamptz not null default now()
);
create index review_photos_review_idx on public.review_photos(review_id);

-- favourites — composite PK acts as the uniqueness constraint.
create table public.favourites (
  user_id     uuid not null references public.users(id) on delete cascade,
  venue_id    uuid not null references public.venues(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, venue_id)
);
create index favourites_venue_idx on public.favourites(venue_id);

-- plans — a basket of activities for a planned day.
create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  name          text not null,
  planned_date  date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index plans_user_idx on public.plans(user_id);
create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- plan_items — line items in a plan; either a venue or an event (XOR).
create table public.plan_items (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  venue_id    uuid references public.venues(id) on delete cascade,
  event_id    uuid references public.events(id) on delete cascade,
  position    smallint not null default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  check ((venue_id is not null) <> (event_id is not null))
);
create index plan_items_plan_idx on public.plan_items(plan_id, position);

-- subscriptions — Parent Premium and Venue Pro both live here.
-- Constraint: Venue Pro rows must reference a venue; Parent Premium must not.
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.users(id) on delete cascade,
  venue_id                uuid references public.venues(id) on delete cascade,
  plan_type               plan_type not null,
  stripe_customer_id      text,
  stripe_subscription_id  text unique,
  status                  subscription_status not null,
  currency                currency not null,
  current_period_end      timestamptz,
  cancel_at               timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (
    (plan_type = 'venue_pro'      and venue_id is not null) or
    (plan_type = 'parent_premium' and venue_id is null)
  )
);
create index subscriptions_user_idx   on public.subscriptions(user_id);
create index subscriptions_venue_idx  on public.subscriptions(venue_id);
create index subscriptions_status_idx on public.subscriptions(status);
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- bookings_clicks — affiliate / booking-link click tracking.
create table public.bookings_clicks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.users(id) on delete set null,
  venue_id            uuid not null references public.venues(id) on delete cascade,
  event_id            uuid references public.events(id) on delete set null,
  provider            booking_provider not null,
  clicked_at          timestamptz not null default now(),
  attributed_revenue  numeric(10, 2),
  currency            currency
);
create index bookings_clicks_venue_clicked_idx on public.bookings_clicks(venue_id, clicked_at desc);
create index bookings_clicks_user_idx          on public.bookings_clicks(user_id);

-- promotions — paid promoted listing slots. Geo-bounded.
create table public.promotions (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references public.venues(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  geo_centre      geography(point, 4326),
  geo_radius_m    integer,
  daily_budget    numeric(10, 2),
  spend_to_date   numeric(10, 2) not null default 0,
  currency        currency not null,
  status          promotion_status not null default 'scheduled',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index promotions_venue_idx  on public.promotions(venue_id);
create index promotions_active_idx on public.promotions(status, starts_at, ends_at);
create index promotions_geo_gix    on public.promotions using gist (geo_centre);
create trigger promotions_set_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

-- school_terms — NI + ROI calendars; seeded reference data.
create table public.school_terms (
  id          uuid primary key default gen_random_uuid(),
  region      school_region not null,
  term_name   text not null,
  starts_on   date not null,
  ends_on     date not null,
  is_holiday  boolean not null default false,
  check (ends_on >= starts_on)
);
create index school_terms_region_idx on public.school_terms(region, starts_on);


-- ----------------------------------------------------------------------------
-- 5. Helper functions + auth bridge trigger
-- ----------------------------------------------------------------------------

-- is_admin: true iff the current auth user is an admin in the staff table.
-- security definer so RLS policies can call it without granting select on staff.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- handle_new_user: when auth creates a user, mirror to public.users so FKs work.
-- security definer because public.users is RLS-locked against client inserts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 6. RPCs
-- ----------------------------------------------------------------------------

-- venues_within: spatial search around a point with optional jsonb filters.
-- Supported filter keys:
--   country_code      string ('GB-NIR' | 'IE')
--   indoor_outdoor    string ('indoor' | 'outdoor' | 'both')
--   tier              string ('free' | 'pro')
--   price_bands       array of strings
--   categories        array of category slugs
--   age               int (matches venues with min_age <= age <= max_age, nulls open)
--   open_now          bool
-- Pagination is offset-based for MVP simplicity; revisit if pages get hot.
create or replace function public.venues_within(
  centre_lng   double precision,
  centre_lat   double precision,
  radius_m     integer,
  filters      jsonb default '{}'::jsonb,
  page_size    integer default 25,
  page_offset  integer default 0
)
returns table (
  id              uuid,
  slug            citext,
  name            text,
  country_code    country_code,
  town            text,
  price_band      price_band,
  currency        currency,
  indoor_outdoor  indoor_outdoor,
  min_age         smallint,
  max_age         smallint,
  tier            venue_tier,
  status          venue_status,
  distance_m      double precision,
  lng             double precision,
  lat             double precision
)
language sql
stable
as $$
  select
    v.id, v.slug, v.name, v.country_code, v.town, v.price_band, v.currency,
    v.indoor_outdoor, v.min_age, v.max_age, v.tier, v.status,
    st_distance(v.location, st_makepoint(centre_lng, centre_lat)::geography) as distance_m,
    st_x(v.location::geometry) as lng,
    st_y(v.location::geometry) as lat
  from public.venues v
  where v.status <> 'closed'
    and v.location is not null
    and st_dwithin(v.location, st_makepoint(centre_lng, centre_lat)::geography, radius_m)
    and (filters->>'country_code'   is null or v.country_code::text   = filters->>'country_code')
    and (filters->>'indoor_outdoor' is null or v.indoor_outdoor::text = filters->>'indoor_outdoor')
    and (filters->>'tier'           is null or v.tier::text           = filters->>'tier')
    and (
      filters->'price_bands' is null
      or v.price_band::text = any (
        select jsonb_array_elements_text(filters->'price_bands')
      )
    )
    and (
      filters->>'age' is null
      or (
        (v.min_age is null or v.min_age <= (filters->>'age')::int)
        and (v.max_age is null or v.max_age >= (filters->>'age')::int)
      )
    )
    and (
      filters->'categories' is null
      or exists (
        select 1
        from public.venue_categories vc
        join public.categories c on c.id = vc.category_id
        where vc.venue_id = v.id
          and c.slug::text = any (
            select jsonb_array_elements_text(filters->'categories')
          )
      )
    )
    and (
      coalesce((filters->>'open_now')::boolean, false) = false
      or exists (
        select 1
        from public.opening_hours oh
        where oh.venue_id = v.id
          and oh.weekday   = extract(isodow from (now() at time zone 'Europe/London'))::smallint
          and oh.opens_at <= (now() at time zone 'Europe/London')::time
          and oh.closes_at > (now() at time zone 'Europe/London')::time
          and (oh.valid_from is null or oh.valid_from <= current_date)
          and (oh.valid_to   is null or oh.valid_to   >= current_date)
      )
    )
  order by distance_m asc
  limit page_size offset page_offset;
$$;
grant execute on function public.venues_within(double precision, double precision, integer, jsonb, integer, integer)
  to anon, authenticated;

-- claim_venue: a parent/owner submits a claim against a venue.
-- Inserts a venue_owners row with verified_at = null (admin verifies separately).
-- Evidence (jsonb) is accepted but not yet persisted — wire the audit table in
-- the migration that builds the moderation flow.
create or replace function public.claim_venue(
  p_venue_id  uuid,
  p_evidence  jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'must be authenticated to claim a venue';
  end if;

  insert into public.venue_owners (user_id, venue_id, role, verified_at)
  values (v_user_id, p_venue_id, 'owner', null)
  on conflict (user_id, venue_id) do nothing;

  -- TODO(phase-3): persist p_evidence to a venue_claims audit table.
  return p_venue_id;
end;
$$;
revoke all on function public.claim_venue(uuid, jsonb) from public;
grant execute on function public.claim_venue(uuid, jsonb) to authenticated;


-- ----------------------------------------------------------------------------
-- 7. Row Level Security
-- ----------------------------------------------------------------------------
-- Default-deny: enable RLS on every user-touchable table, then add explicit
-- allow policies. The service role key bypasses RLS, so Edge Functions and
-- the seed scripts can write whatever they need.

alter table public.users             enable row level security;
alter table public.staff             enable row level security;
alter table public.children          enable row level security;
alter table public.categories        enable row level security;
alter table public.venues            enable row level security;
alter table public.venue_categories  enable row level security;
alter table public.venue_owners      enable row level security;
alter table public.venue_photos      enable row level security;
alter table public.opening_hours     enable row level security;
alter table public.events            enable row level security;
alter table public.reviews           enable row level security;
alter table public.review_photos     enable row level security;
alter table public.favourites        enable row level security;
alter table public.plans             enable row level security;
alter table public.plan_items        enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.bookings_clicks   enable row level security;
alter table public.promotions        enable row level security;
alter table public.school_terms      enable row level security;

-- users: self read/update; admin all. No client insert/delete (trigger handles insert).
create policy users_select_self on public.users
  for select using (auth.uid() = id or public.is_admin());
create policy users_update_self on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy users_admin_all on public.users
  for all using (public.is_admin()) with check (public.is_admin());

-- staff: self read; admin manages.
create policy staff_select_self on public.staff
  for select using (auth.uid() = user_id or public.is_admin());
create policy staff_admin_write on public.staff
  for all using (public.is_admin()) with check (public.is_admin());

-- children: owner-only on every operation.
create policy children_owner_all on public.children
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- categories: public read; admin write.
create policy categories_public_read on public.categories
  for select using (true);
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- venues: public can read everything except closed. Verified owners can update.
-- Insert + delete are admin-only (use the seed pipeline / claim flow).
create policy venues_public_read on public.venues
  for select using (status <> 'closed' or public.is_admin());

create policy venues_owner_update on public.venues
  for update using (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = venues.id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  ) with check (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = venues.id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  );

create policy venues_admin_insert on public.venues
  for insert with check (public.is_admin());
create policy venues_admin_delete on public.venues
  for delete using (public.is_admin());

-- venue_categories: public read; verified owners or admin write.
create policy venue_categories_public_read on public.venue_categories
  for select using (true);
create policy venue_categories_owner_write on public.venue_categories
  for all using (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = venue_categories.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  ) with check (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = venue_categories.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  );

-- venue_owners: a user can read their own membership rows; admin manages writes.
-- (claim_venue runs security-definer so it bypasses these on insert.)
create policy venue_owners_self_read on public.venue_owners
  for select using (auth.uid() = user_id or public.is_admin());
create policy venue_owners_admin_write on public.venue_owners
  for all using (public.is_admin()) with check (public.is_admin());

-- venue_photos: public read; verified owners or admin write.
create policy venue_photos_public_read on public.venue_photos
  for select using (true);
create policy venue_photos_owner_write on public.venue_photos
  for all using (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = venue_photos.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  ) with check (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = venue_photos.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  );

-- opening_hours: public read; verified owners or admin write.
create policy opening_hours_public_read on public.opening_hours
  for select using (true);
create policy opening_hours_owner_write on public.opening_hours
  for all using (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = opening_hours.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  ) with check (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = opening_hours.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  );

-- events: public read; verified owners or admin write.
create policy events_public_read on public.events
  for select using (true);
create policy events_owner_write on public.events
  for all using (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = events.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  ) with check (
    public.is_admin() or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = events.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  );

-- reviews: public read approved; author always sees own; verified venue owners
-- can see pending reviews on their venue. Author writes own; admin can do all.
create policy reviews_public_read on public.reviews
  for select using (
    status = 'approved'
    or auth.uid() = user_id
    or public.is_admin()
    or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = reviews.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  );
create policy reviews_author_insert on public.reviews
  for insert with check (auth.uid() = user_id);
create policy reviews_author_update on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reviews_author_delete on public.reviews
  for delete using (auth.uid() = user_id or public.is_admin());

-- review_photos: gated through the parent review's visibility rules.
create policy review_photos_read on public.review_photos
  for select using (
    exists (
      select 1 from public.reviews r
      where r.id = review_photos.review_id
        and (
          r.status = 'approved'
          or auth.uid() = r.user_id
          or public.is_admin()
          or exists (
            select 1 from public.venue_owners vo
            where vo.venue_id = r.venue_id
              and vo.user_id = auth.uid()
              and vo.verified_at is not null
          )
        )
    )
  );
create policy review_photos_author_write on public.review_photos
  for all using (
    public.is_admin() or exists (
      select 1 from public.reviews r
      where r.id = review_photos.review_id and r.user_id = auth.uid()
    )
  ) with check (
    public.is_admin() or exists (
      select 1 from public.reviews r
      where r.id = review_photos.review_id and r.user_id = auth.uid()
    )
  );

-- favourites: owner-only.
create policy favourites_owner_all on public.favourites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- plans: owner-only.
create policy plans_owner_all on public.plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- plan_items: gated through parent plan ownership.
create policy plan_items_owner_all on public.plan_items
  for all using (
    exists (
      select 1 from public.plans p
      where p.id = plan_items.plan_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_items.plan_id and p.user_id = auth.uid()
    )
  );

-- subscriptions: owner reads own; verified venue owners read their venue's;
-- admin reads all. Writes happen via the service role (Stripe webhook) only —
-- no client-facing insert/update/delete policies.
create policy subscriptions_self_read on public.subscriptions
  for select using (
    auth.uid() = user_id
    or public.is_admin()
    or (
      venue_id is not null and exists (
        select 1 from public.venue_owners vo
        where vo.venue_id = subscriptions.venue_id
          and vo.user_id = auth.uid()
          and vo.verified_at is not null
      )
    )
  );
create policy subscriptions_admin_write on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

-- bookings_clicks: owner reads own; admin reads all. Writes via service role.
create policy bookings_clicks_self_read on public.bookings_clicks
  for select using (auth.uid() = user_id or public.is_admin());
create policy bookings_clicks_admin_write on public.bookings_clicks
  for all using (public.is_admin()) with check (public.is_admin());

-- promotions: public sees only currently-active promotions; verified owners
-- see their own; admin sees all. Writes admin-only.
create policy promotions_public_read on public.promotions
  for select using (
    (status = 'active' and now() between starts_at and ends_at)
    or public.is_admin()
    or exists (
      select 1 from public.venue_owners vo
      where vo.venue_id = promotions.venue_id
        and vo.user_id = auth.uid()
        and vo.verified_at is not null
    )
  );
create policy promotions_admin_write on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

-- school_terms: public read; admin write.
create policy school_terms_public_read on public.school_terms
  for select using (true);
create policy school_terms_admin_write on public.school_terms
  for all using (public.is_admin()) with check (public.is_admin());


-- ============================================================================
-- End of 0001_init.sql
-- ============================================================================
