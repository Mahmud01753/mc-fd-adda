-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৮, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-35 (part159): Restriction "বন্ধ/তুলে নিলে" মেসেজের লাল ⛔ Restricted বক্স চলে যাবে, লেখা আবার দেখা যাবে
-- Supabase -> SQL Editor-এ পুরোটা পেস্ট করে একবার Run করুন (আবার চালালেও ক্ষতি নেই)। আগে SQL-32 চালানো থাকতে হবে।
--
-- কী বদলায়:
--  1) fa_restriction_adjust ও fa_unrestrict: অ্যাডমিন কোনো মেসেজ-Restriction হাতে বন্ধ করলে (বা সময় কমিয়ে শেষ করলে) সেটা এখন "ক্ষমা" ধরা হয় -> লেখা আর লুকানো থাকে না।
--  2) fa_rs: নতুন 'fm' (ক্ষমা-করা বার্তার তালিকা) — খারাপ-শব্দের তালিকায় শব্দ থাকলেও ওই বার্তা আর লুকাবে না।
--  3) আগে যেগুলো অ্যাডমিন হাতে বন্ধ করেছিলেন (মেয়াদ নিজে শেষ হওয়াগুলো নয়), সেগুলোর লেখাও ফেরত আসবে।
-- মেয়াদ নিজে নিজে শেষ হলে আগের মতোই লেখা লুকানো থাকবে (SQL-32-এর নিয়ম অক্ষত)।
-- না চালালে: সাইটে আগের মতোই লেখা লুকানো থাকবে (নতুন chat.js কিছু ভাঙবে না)।

create or replace function fa_restriction_adjust(p_id bigint, p_action text, p_minutes int default null, p_forgive boolean default false, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare r fa_restrictions%rowtype; nu timestamptz; adm text; note text := left(btrim(coalesce(p_note, '')), 300);
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  select * into r from fa_restrictions where id = p_id for update;
  if not found then raise exception 'not found'; end if;
  if r.lifted_at is not null or r.until <= now() then raise exception 'already ended'; end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;

  if p_action = 'end' then
    update fa_restrictions set lifted_at = now(), forgiven = (r.kind = 'auto' or r.msg_id is not null) where id = r.id;
    perform fa_log_restrict(r.id, r.voter, r.uid, r.nick, 'end', null, r.until, now(), case when note = '' then r.reason else note end, adm);
    return jsonb_build_object('ok', true, 'ended', true);
  end if;

  if p_action not in ('shorten', 'extend') then raise exception 'action'; end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 52560000 then raise exception 'minutes 1..52560000'; end if;

  if p_action = 'shorten' then
    nu := r.until - make_interval(mins => p_minutes);
    if nu <= now() then
      update fa_restrictions set lifted_at = now(), forgiven = (r.kind = 'auto' or r.msg_id is not null) where id = r.id;
      perform fa_log_restrict(r.id, r.voter, r.uid, r.nick, 'shorten', p_minutes, r.until, now(), note, adm);
      return jsonb_build_object('ok', true, 'ended', true);
    end if;
  else
    nu := r.until + make_interval(mins => p_minutes);
    if nu > now() + make_interval(mins => 52560000) then nu := now() + make_interval(mins => 52560000); end if;
  end if;

  update fa_restrictions set until = nu where id = r.id;
  perform fa_log_restrict(r.id, r.voter, r.uid, r.nick, p_action, p_minutes, r.until, nu, note, adm);
  return jsonb_build_object('ok', true, 'ended', false, 'until', (extract(epoch from nu) * 1000)::bigint);
end $$;
revoke all on function fa_restriction_adjust(bigint, text, int, boolean, text) from public, anon;
grant execute on function fa_restriction_adjust(bigint, text, int, boolean, text) to authenticated;

create or replace function fa_unrestrict(p_id bigint default null, p_voter text default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int; adm text;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if p_id is null and p_voter is null then return 0; end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;
  with u as (
    update fa_restrictions set lifted_at = now(), forgiven = (kind = 'auto' or msg_id is not null)
     where lifted_at is null and until > now() and ((p_id is not null and id = p_id) or (p_voter is not null and voter = p_voter))
    returning id, voter, uid, nick, until, reason
  )
  insert into fa_restrict_log (rid, voter, uid, nick, action, old_until, new_until, reason, by_admin)
  select id, voter, uid, nick, 'end', until, now(), reason, adm from u;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function fa_unrestrict(bigint, text) from public, anon;
grant execute on function fa_unrestrict(bigint, text) to authenticated;

create or replace function fa_rs(p_voter text default null)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'on', fa_restrict_on(),
    'vis', fa_rs_vis(),
    'p', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('u', g.uid, 'w', g.w)) from (
          select uid, jsonb_agg(
                   case when fa_rs_vis() = 'private'
                        then jsonb_build_object('c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'mid', coalesce(msg_id, 0))
                        else jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind, 'mid', coalesce(msg_id, 0)) end
                   order by created_at) w
            from fa_restrictions where lifted_at is null and until > now() and uid <> '' group by uid) g), '[]'::jsonb) end,
    'm', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind, 'mid', coalesce(msg_id, 0)) order by created_at)
            from fa_restrictions where p_voter is not null and voter = p_voter and lifted_at is null and until > now()), '[]'::jsonb) end,
    'hm', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(x.msg_id) from (
            select distinct msg_id from fa_restrictions where msg_id is not null and not forgiven order by msg_id desc limit 3000) x), '[]'::jsonb) end,
    'fm', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(x.msg_id) from (
            select distinct f.msg_id from fa_restrictions f where f.msg_id is not null and f.forgiven and f.lifted_at is not null
               and not exists (select 1 from fa_restrictions g where g.msg_id = f.msg_id and not g.forgiven) order by f.msg_id desc limit 3000) x), '[]'::jsonb) end,
    'dm', coalesce((select (val #>> '{}')::int from fa_settings where key = 'rs_msg_min'), 52560000),
    'du', coalesce((select (val #>> '{}')::int from fa_settings where key = 'rs_user_min'), 60),
    'lk', (select jsonb_build_object('r', reason, 'e', case when until_at is null then null else (extract(epoch from until_at) * 1000)::bigint end)
             from fa_locks where p_voter is not null and voter = p_voter and lifted_at is null and (until_at is null or until_at > now()) limit 1),
    'shot', coalesce((select val = 'true'::jsonb from fa_settings where key = 'shot'), false),
    'now', (extract(epoch from now()) * 1000)::bigint
  );
$$;
grant execute on function fa_rs(text) to anon, authenticated;

update fa_restrictions set forgiven = true where lifted_at is not null and msg_id is not null and kind = 'admin' and not forgiven;
