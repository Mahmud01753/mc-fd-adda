-- 🔒 মেয়াদি লক (কাস্টম সময়: ১ মিনিট – ৩৬৫ দিন, বা স্থায়ী)
-- চালানোর ক্রম: (মূল SQL) → supabase-restrict.sql → supabase-restrict-v2.sql → supabase-restrict-v3.sql → supabase-lock-timed.sql (এটি, সবার শেষে)।
-- একবার Supabase → SQL Editor-এ Run করুন; আবার চালালেও ক্ষতি নেই।
-- ⚠ পরে restrict / v2 / v3 আবার চালালে এই ফাইলও সবার শেষে আবার চালাতে হবে (নইলে ওই ফাংশনগুলো আগের "শুধু স্থায়ী" রূপে ফিরে যায়)।
-- মেয়াদ শেষ হলে লক নিজে থেকে অকার্যকর হয় (সার্ভারে সময় মিলিয়ে দেখা হয়; আলাদা মুছতে হয় না)।

alter table fa_locks add column if not exists until_at timestamptz;   -- null = স্থায়ী

-- লক দেওয়া/মেয়াদ বদলানো: p_minutes null বা না দিলে স্থায়ী
drop function if exists fa_lock(text, text, text, text);
create or replace function fa_lock(p_voter text, p_uid text, p_nick text, p_reason text, p_minutes int default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare nid bigint; adm text; u timestamptz;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if p_voter is null or length(p_voter) < 4 then raise exception 'voter'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason'; end if;
  if p_minutes is not null and (p_minutes < 1 or p_minutes > 525600) then raise exception 'minutes'; end if;
  u := case when p_minutes is null then null else now() + make_interval(mins => p_minutes) end;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;
  update fa_locks set reason = left(btrim(p_reason), 300), uid = left(coalesce(p_uid, ''), 80), nick = left(coalesce(p_nick, ''), 40),
         until_at = u, created_at = now(), by_admin = adm
   where voter = p_voter and lifted_at is null returning id into nid;
  if nid is null then
    insert into fa_locks (voter, uid, nick, reason, by_admin, until_at) values (p_voter, left(coalesce(p_uid, ''), 80), left(coalesce(p_nick, ''), 40), left(btrim(p_reason), 300), adm, u) returning id into nid;
  end if;
  return nid;
end $$;
revoke all on function fa_lock(text, text, text, text, int) from public, anon;
grant execute on function fa_lock(text, text, text, text, int) to authenticated;

-- অ্যাডমিনের তালিকা: শুধু চলমান (মেয়াদ শেষ হয়নি); e = শেষ হওয়ার সময় (ms), null = স্থায়ী
create or replace function fa_admin_locks()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'voter', voter, 'uid', uid, 'nick', nick, 'reason', reason,
           'c', (extract(epoch from created_at) * 1000)::bigint, 'by', by_admin,
           'e', case when until_at is null then null else (extract(epoch from until_at) * 1000)::bigint end) order by created_at desc)
           from fa_locks where lifted_at is null and (until_at is null or until_at > now())), '[]'::jsonb);
end $$;
revoke all on function fa_admin_locks() from public, anon;
grant execute on function fa_admin_locks() to authenticated;

-- সার্ভারের পাহারা: লকড (মেয়াদ চলমান) ইউজারের নতুন বার্তা আটকায়
create or replace function fa_lock_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(new);
begin
  if exists (select 1 from fa_locks l where l.lifted_at is null and (l.until_at is null or l.until_at > now()) and (
       l.voter in (coalesce(j->>'voter', ''), coalesce(j->>'voter_id', ''), coalesce(j->>'device', ''))
       or (l.uid <> '' and l.uid in (coalesce(j->>'uid', ''), coalesce(j->>'user_uid', ''))))) then
    raise exception 'locked';
  end if;
  return new;
end $$;

-- অ্যাডমিন: চ্যাটে বার্তায় চাপলে মালিকের তথ্য (lock_e = লকের শেষ সময়)
create or replace function fa_admin_msg_target(p_msg bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v text; nk text;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  select voter, nick into v, nk from mc2_ac_messages where id = p_msg;
  if not found or v is null then return null; end if;
  return jsonb_build_object('voter', v, 'nick', nk,
    'locked', exists (select 1 from fa_locks where voter = v and lifted_at is null and (until_at is null or until_at > now())),
    'lock_e', (select (extract(epoch from until_at) * 1000)::bigint from fa_locks where voter = v and lifted_at is null and until_at > now() limit 1),
    'active', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'reason', reason, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind) order by created_at)
                          from fa_restrictions where voter = v and lifted_at is null and until > now()), '[]'::jsonb));
end $$;
revoke all on function fa_admin_msg_target(bigint) from public, anon;
grant execute on function fa_admin_msg_target(bigint) to authenticated;

-- সবার জন্য (চ্যাট পেইজ): fa_rs — v3-এর হুবহু, শুধু 'lk'-তে মেয়াদ (e) যোগ ও মেয়াদ-শেষ লক বাদ
create or replace function fa_rs(p_voter text default null)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'on', fa_restrict_on(),
    'vis', fa_rs_vis(),
    'p', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('u', g.uid, 'w', g.w)) from (
          select uid, jsonb_agg(
                   case when fa_rs_vis() = 'private'
                        then jsonb_build_object('c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint)
                        else jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind) end
                   order by created_at) w
            from fa_restrictions where lifted_at is null and until > now() and uid <> '' group by uid) g), '[]'::jsonb) end,
    'm', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind) order by created_at)
            from fa_restrictions where p_voter is not null and voter = p_voter and lifted_at is null and until > now()), '[]'::jsonb) end,
    'lk', (select jsonb_build_object('r', reason, 'e', case when until_at is null then null else (extract(epoch from until_at) * 1000)::bigint end)
             from fa_locks where p_voter is not null and voter = p_voter and lifted_at is null and (until_at is null or until_at > now()) limit 1),
    'shot', coalesce((select val = 'true'::jsonb from fa_settings where key = 'shot'), false),
    'now', (extract(epoch from now()) * 1000)::bigint
  );
$$;
grant execute on function fa_rs(text) to anon, authenticated;

select count(*) filter (where until_at is null) as sthayi_lock, count(*) filter (where until_at > now()) as meyadi_lock
  from fa_locks where lifted_at is null;
