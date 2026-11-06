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
