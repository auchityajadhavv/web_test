-- Apply with the Supabase SQL editor as project administrator.
-- Also upgrades the earlier email-based policies. Back up existing data first.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;
create or replace function public.is_admin_session() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_admin_session() from public, anon;
grant execute on function public.is_admin(), public.is_admin_session() to authenticated;

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  email text not null,
  message text,
  plan text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);
alter table public.demo_requests add column if not exists request_key uuid unique;
alter table public.demo_requests add column if not exists payload_hash text;
alter table public.demo_requests add column if not exists notification_sent boolean not null default false;
alter table public.demo_requests add column if not exists notification_claimed_at timestamptz;
create index if not exists demo_requests_created_idx on public.demo_requests(created_at desc, id desc);

-- Remove all previous permissive policies: policies combine with OR in PostgreSQL.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'demo_requests'
  loop execute format('drop policy %I on public.demo_requests', p.policyname); end loop;
end $$;
alter table public.demo_requests enable row level security;
revoke all on public.demo_requests from public, anon, authenticated;
grant select on public.demo_requests to authenticated;
grant update(status) on public.demo_requests to authenticated;
grant all on public.demo_requests to service_role;
create policy "mfa admins read" on public.demo_requests for select to authenticated
  using (public.is_admin_session());
create policy "mfa admins update status" on public.demo_requests for update to authenticated
  using (public.is_admin_session()) with check (public.is_admin_session());

create table if not exists private.demo_rate_limits (
  ip_hash text primary key,
  started_at timestamptz not null default now(),
  attempts integer not null default 1
);

-- Server-only, transactional rate limit and retry reservation. No client can call this.
create or replace function public.reserve_demo_request(
  p_request_key uuid, p_payload_hash text, p_ip_hash text,
  p_name text, p_venue text, p_email text, p_message text, p_plan text
) returns table(request_id uuid, state text)
language plpgsql security definer set search_path = '' as $$
declare r public.demo_requests; attempts_now integer; rate_key text; rate_max integer;
begin
  if length(p_name) not between 1 and 100 or length(p_venue) not between 1 and 160
    or length(p_email) not between 3 and 254 or length(p_message) not between 1 and 2000
    or length(p_ip_hash) <> 64 or length(p_payload_hash) <> 64
    or p_plan not in ('Starter', 'Growth', 'Managed', '') then
    raise exception 'invalid request' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));
  select * into r from public.demo_requests where request_key = p_request_key for update;
  if found then
    if r.payload_hash <> p_payload_hash then
      return query select r.id, 'conflict'::text; return;
    end if;
    if r.notification_sent then return query select r.id, 'sent'::text; return; end if;
    -- Provider idempotency lasts 24h. Older unconfirmed notifications need manual review.
    if r.created_at < now() - interval '23 hours' then
      return query select r.id, 'review'::text; return;
    end if;
    if r.notification_claimed_at > now() - interval '60 seconds' then
      return query select r.id, 'busy'::text; return;
    end if;
  end if;
  delete from private.demo_rate_limits where started_at < now() - interval '2 hours';
  -- Email and global limits also apply if the gateway client-IP header is unavailable or spoofed.
  foreach rate_key in array array[p_ip_hash, 'email:' || md5(lower(p_email)), 'global'] loop
    rate_max := case when rate_key = 'global' then 100 when rate_key like 'email:%' then 3 else 5 end;
    insert into private.demo_rate_limits as limits(ip_hash) values (rate_key)
    on conflict(ip_hash) do update set
      attempts = case when limits.started_at < now() - interval '1 hour' then 1 else limits.attempts + 1 end,
      started_at = case when limits.started_at < now() - interval '1 hour' then now() else limits.started_at end
    returning attempts into attempts_now;
    if attempts_now > rate_max then return query select null::uuid, 'limited'::text; return; end if;
  end loop;
  if r.id is null then
    insert into public.demo_requests(request_key, payload_hash, name, venue, email, message, plan, notification_claimed_at)
    values(p_request_key, p_payload_hash, p_name, p_venue, p_email, p_message, nullif(p_plan, ''), now())
    returning * into r;
  else
    update public.demo_requests set notification_claimed_at = now() where id = r.id;
  end if;
  return query select r.id, 'reserved'::text;
end $$;
revoke all on function public.reserve_demo_request(uuid,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.reserve_demo_request(uuid,text,text,text,text,text,text,text) to service_role;
commit;

-- Provision an owner separately, after creating/inviting them in Supabase Auth:
-- insert into public.admin_users(user_id) values ('EXACT-AUTH-USER-UUID');
-- Disable public signup in Supabase Auth settings. The app has no signup route.

-- ---------------------------------------------------------------------------
-- Multi-tenant stand setup and guest feedback. Public browsers never receive
-- table grants; the guest Edge Function uses service_role after validating an
-- active, unguessable stand code. MFA admins manage setup through RLS/RPCs.
-- ---------------------------------------------------------------------------
begin;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  logo_url text,
  primary_color text not null default '#202124' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#F2F3F4' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  review_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.stands (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  label text not null check (length(label) between 1 and 80),
  status text not null default 'active' check (status in ('active', 'disabled', 'retired')),
  created_at timestamptz not null default now()
);
create index if not exists stands_business_idx on public.stands(business_id, created_at desc);

create table if not exists public.stand_public_codes (
  id uuid primary key default gen_random_uuid(),
  stand_id uuid not null references public.stands(id) on delete cascade,
  code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (code ~ '^[0-9a-f]{32}$')
);
create unique index if not exists stand_one_active_code_idx on public.stand_public_codes(stand_id) where active;

create table if not exists public.feedback_sessions (
  id uuid primary key default gen_random_uuid(),
  stand_id uuid not null references public.stands(id) on delete restrict,
  public_code_id uuid not null references public.stand_public_codes(id) on delete restrict,
  answers jsonb not null,
  comment text check (comment is null or length(comment) <= 1200),
  review_clicked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists feedback_stand_created_idx on public.feedback_sessions(stand_id, created_at desc);

create table if not exists private.guest_rate_limits (
  rate_key text primary key,
  started_at timestamptz not null default now(),
  attempts integer not null default 1
);

do $$ declare table_name text; policy record; begin
  foreach table_name in array array['businesses','locations','stands','stand_public_codes','feedback_sessions'] loop
    for policy in select policyname from pg_policies where schemaname = 'public' and tablename = table_name
    loop execute format('drop policy %I on public.%I', policy.policyname, table_name); end loop;
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end $$;

grant select, insert, update, delete on public.businesses, public.locations, public.stands, public.stand_public_codes to authenticated;
grant select on public.feedback_sessions to authenticated;

create policy "mfa admins manage businesses" on public.businesses for all to authenticated
  using (public.is_admin_session()) with check (public.is_admin_session());
create policy "mfa admins manage locations" on public.locations for all to authenticated
  using (public.is_admin_session()) with check (public.is_admin_session());
create policy "mfa admins manage stands" on public.stands for all to authenticated
  using (public.is_admin_session()) with check (public.is_admin_session());
create policy "mfa admins manage stand codes" on public.stand_public_codes for all to authenticated
  using (public.is_admin_session()) with check (public.is_admin_session());
create policy "mfa admins read feedback" on public.feedback_sessions for select to authenticated
  using (public.is_admin_session());

create or replace function public.create_stand_setup(
  p_business_id uuid,
  p_business_name text,
  p_location_name text,
  p_stand_label text,
  p_review_url text,
  p_primary_color text,
  p_accent_color text
) returns table(stand_id uuid, public_code text)
language plpgsql security definer set search_path = '' as $$
declare business uuid; location uuid; created_stand uuid; created_code text;
begin
  if not public.is_admin_session() then raise exception 'not authorized' using errcode = '42501'; end if;
  if length(trim(p_location_name)) not between 1 and 120 or length(trim(p_stand_label)) not between 1 and 80 then
    raise exception 'invalid setup' using errcode = '22023';
  end if;
  if p_business_id is null then
    if length(trim(p_business_name)) not between 1 and 120
      or p_primary_color !~ '^#[0-9A-Fa-f]{6}$' or p_accent_color !~ '^#[0-9A-Fa-f]{6}$'
      or (nullif(trim(p_review_url), '') is not null and trim(p_review_url) !~ '^https://') then
      raise exception 'invalid business' using errcode = '22023';
    end if;
    insert into public.businesses(name, review_url, primary_color, accent_color)
    values(trim(p_business_name), nullif(trim(p_review_url), ''), upper(p_primary_color), upper(p_accent_color))
    returning id into business;
  else
    select id into business from public.businesses where id = p_business_id and active for update;
    if business is null then raise exception 'business unavailable' using errcode = '22023'; end if;
  end if;
  select id into location from public.locations where business_id = business and lower(name) = lower(trim(p_location_name));
  if location is null then
    insert into public.locations(business_id, name) values(business, trim(p_location_name)) returning id into location;
  end if;
  insert into public.stands(business_id, location_id, label)
  values(business, location, trim(p_stand_label)) returning id into created_stand;
  insert into public.stand_public_codes(stand_id) values(created_stand) returning code into created_code;
  return query select created_stand, created_code;
end $$;

create or replace function public.rotate_stand_code(p_stand_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare created_code text;
begin
  if not public.is_admin_session() then raise exception 'not authorized' using errcode = '42501'; end if;
  if not exists(select 1 from public.stands where id = p_stand_id) then
    raise exception 'stand unavailable' using errcode = '22023';
  end if;
  update public.stand_public_codes set active = false, revoked_at = now() where stand_id = p_stand_id and active;
  insert into public.stand_public_codes(stand_id) values(p_stand_id) returning code into created_code;
  return created_code;
end $$;

create or replace function public.submit_guest_feedback(
  p_code text, p_ip_hash text, p_answers jsonb, p_comment text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare code_row public.stand_public_codes; feedback_id uuid; attempts_now integer;
begin
  if p_code !~ '^[0-9a-f]{32}$' or length(p_ip_hash) <> 64 or jsonb_typeof(p_answers) <> 'object'
    or coalesce(p_answers->>'service','') !~ '^[1-5]$'
    or coalesce(p_answers->>'quality','') !~ '^[1-5]$'
    or coalesce(p_answers->>'overall','') !~ '^[1-5]$'
    or length(coalesce(p_comment,'')) > 1200 then
    raise exception 'invalid feedback' using errcode = '22023';
  end if;
  select c.* into code_row from public.stand_public_codes c
    join public.stands s on s.id = c.stand_id
    join public.businesses b on b.id = s.business_id
    join public.locations l on l.id = s.location_id
    where c.code = p_code and c.active and s.status = 'active' and b.active and l.active;
  if code_row.id is null then raise exception 'stand unavailable' using errcode = '22023'; end if;
  delete from private.guest_rate_limits where started_at < now() - interval '2 hours';
  insert into private.guest_rate_limits as limits(rate_key) values(p_ip_hash || ':' || p_code)
  on conflict(rate_key) do update set
    attempts = case when limits.started_at < now() - interval '1 hour' then 1 else limits.attempts + 1 end,
    started_at = case when limits.started_at < now() - interval '1 hour' then now() else limits.started_at end
  returning attempts into attempts_now;
  if attempts_now > 8 then raise exception 'rate limited' using errcode = 'P0001'; end if;
  insert into public.feedback_sessions(stand_id, public_code_id, answers, comment)
  values(code_row.stand_id, code_row.id, p_answers, nullif(trim(p_comment), '')) returning id into feedback_id;
  return feedback_id;
end $$;

create or replace function public.mark_review_click(p_code text, p_feedback_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.feedback_sessions f set review_clicked = true
  from public.stand_public_codes c
  where f.id = p_feedback_id and f.public_code_id = c.id and c.code = p_code and c.active;
end $$;

create or replace function public.get_admin_feedback_metrics()
returns table(total_feedback bigint, average_overall numeric, review_clicks bigint, last_30_days bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin_session() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select
    count(*)::bigint,
    round(avg((f.answers->>'overall')::numeric), 1),
    count(*) filter (where f.review_clicked)::bigint,
    count(*) filter (where f.created_at >= now() - interval '30 days')::bigint
  from public.feedback_sessions f;
end $$;

revoke all on function public.create_stand_setup(uuid,text,text,text,text,text,text) from public, anon;
revoke all on function public.rotate_stand_code(uuid) from public, anon;
revoke all on function public.submit_guest_feedback(text,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.mark_review_click(text,uuid) from public, anon, authenticated;
revoke all on function public.get_admin_feedback_metrics() from public, anon;
grant execute on function public.create_stand_setup(uuid,text,text,text,text,text,text), public.rotate_stand_code(uuid) to authenticated;
grant execute on function public.submit_guest_feedback(text,text,jsonb,text), public.mark_review_click(text,uuid) to service_role;
grant execute on function public.get_admin_feedback_metrics() to authenticated;

commit;
