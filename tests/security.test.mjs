import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const owner = '11111111-1111-4111-8111-111111111111'
const outsider = '22222222-2222-4222-8222-222222222222'

test('PostgreSQL denies direct access unless an approved admin has MFA; only status is writable', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
      grant usage on schema auth, public to anon, authenticated, service_role;
      grant execute on all functions in schema auth to anon, authenticated, service_role;
      insert into auth.users values ('${owner}'), ('${outsider}');
    `)
    const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
    await db.exec(schema)
    await db.exec(schema) // Repeatable upgrade.
    await db.exec(`insert into public.admin_users values ('${owner}'); insert into public.demo_requests(name,email,status) values ('Private lead','lead@example.com','new')`)
    async function role(name, sub, aal = 'aal1') {
      await db.exec('reset role')
      await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub, aal })])
      await db.exec(`set role ${name}`)
    }
    await role('anon', outsider)
    await assert.rejects(db.query('select * from public.demo_requests'), /permission denied/)
    await assert.rejects(db.query("insert into public.demo_requests(name,email) values ('Spam','spam@example.com')"), /permission denied/)
    await role('authenticated', outsider, 'aal2')
    assert.equal((await db.query('select * from public.demo_requests')).rows.length, 0)
    assert.equal((await db.query('select public.is_admin() as allowed')).rows[0].allowed, false)
    await assert.rejects(db.query(`insert into public.admin_users values ('${outsider}')`), /permission denied/)
    await assert.rejects(db.query('select * from public.admin_users'), /permission denied/)
    await role('authenticated', owner)
    assert.equal((await db.query('select public.is_admin() as allowed')).rows[0].allowed, true)
    assert.equal((await db.query('select * from public.demo_requests')).rows.length, 0)
    await role('authenticated', owner, 'aal2')
    assert.equal((await db.query('select * from public.demo_requests')).rows.length, 1)
    await db.query("update public.demo_requests set status = 'contacted'")
    assert.equal((await db.query('select status from public.demo_requests')).rows[0].status, 'contacted')
    await assert.rejects(db.query("update public.demo_requests set email = 'attacker@example.com'"), /permission denied/)
    await assert.rejects(db.query("delete from public.demo_requests"), /permission denied/)
    await assert.rejects(db.query("select * from public.reserve_demo_request(gen_random_uuid(),repeat('a',64),repeat('b',64),'A','B','a@b.com','Demo','')"), /permission denied/)
    await role('authenticated', outsider, 'aal2')
    await db.query("update public.demo_requests set status = 'closed'")
    await role('authenticated', owner, 'aal2')
    assert.equal((await db.query('select status from public.demo_requests')).rows[0].status, 'contacted')
    // Service-only submissions: duplicates, busy leases, changed payloads and limits.
    await role('service_role', owner)
    const key = '33333333-3333-4333-8333-333333333333'
    const reserve = (id = key, hash = 'a'.repeat(64)) => db.query(`select * from public.reserve_demo_request($1,$2,$3,'A','Venue',$4,'Need a demo','')`, [id, hash, 'b'.repeat(64), `${id}@example.com`])
    assert.equal((await reserve()).rows[0].state, 'reserved')
    assert.equal((await reserve()).rows[0].state, 'busy')
    assert.equal((await reserve(key, 'c'.repeat(64))).rows[0].state, 'conflict')
    await db.query('update public.demo_requests set notification_sent = true where request_key = $1', [key])
    assert.equal((await reserve()).rows[0].state, 'sent')
    for (let n = 0; n < 4; n++) assert.equal((await reserve(crypto.randomUUID())).rows[0].state, 'reserved')
    assert.equal((await reserve(crypto.randomUUID())).rows[0].state, 'limited')
    await db.exec('reset role; truncate private.demo_rate_limits')
    await role('service_role', owner)
    const emailReserve = () => db.query("select * from public.reserve_demo_request($1,repeat('a',64),$2,'A','Cafe','same@example.com','Demo','')", [crypto.randomUUID(), crypto.randomUUID().replaceAll('-', '').repeat(2)])
    for (let n = 0; n < 3; n++) assert.equal((await emailReserve()).rows[0].state, 'reserved')
    assert.equal((await emailReserve()).rows[0].state, 'limited') // Changing the IP does not bypass the email cap.
    await db.exec('reset role; truncate private.demo_rate_limits')
    await role('service_role', owner)
    const retryKey = crypto.randomUUID()
    const reserved = (await reserve(retryKey)).rows[0]
    await db.query("update public.demo_requests set notification_claimed_at = now() - interval '61 seconds' where id = $1", [reserved.request_id])
    assert.equal((await reserve(retryKey)).rows[0].state, 'reserved')
    await db.query("update public.demo_requests set created_at = now() - interval '24 hours' where id = $1", [reserved.request_id])
    assert.equal((await reserve(retryKey)).rows[0].state, 'review')

  } finally { await db.close() }
})
