-- ⚠️ Restriction (ওয়ার্নিং-চিহ্ন) সিস্টেম — কাস্টম সময়সহ।
-- Supabase → SQL Editor-এ একবার Run করুন (বারবার চালালেও ক্ষতি নেই)। নির্ভর করে আগে থেকে থাকা mc2_is_admin()-এর ওপর।
--
-- (এই ফাইলে একসাথে আছে: Restriction, স্থায়ী লক, স্ক্রীনশট সুরক্ষার সেটিং, খারাপ-শব্দ তালিকা। আগে চালিয়ে থাকলেও আবার চালান — ক্ষতি নেই।)
-- Restriction মানে: ইউজার চ্যাট করতে পারে, কিন্তু
--   • তার ছবির কোনায় ❌ চিহ্ন আসে ও "RESTRICTED" সাইন থাকে; সাধারণ মেসেজ সবাই পড়ে, কিন্তু খারাপ শব্দ থাকলে লেখা লুকিয়ে লাল বক্স দেখায়;
--   • ❌ বা মেসেজের "RESTRICTED" ট্যাগে চাপলে সবাই তাকে দেওয়া ওয়ার্নিং দেখতে পারে;
--   • সে নিজে চ্যাটের ওপরে সবসময় নিজের ওয়ার্নিং দেখে।
-- সময় শেষ হলে নিজে থেকে চিহ্ন চলে যায়। একই ইউজারকে একাধিক ওয়ার্নিং দেওয়া যায় (প্রতিটার নিজের সময়)।
-- (বার্তা পাঠানো বন্ধ = "ব্যান"; সেটা আগের ব্যান সিস্টেমেই চলে, এখানে নয়।)

create table if not exists fa_restrictions (
  id         bigserial primary key,
  voter      text not null,                -- ডিভাইস আইডি (শুধু অ্যাডমিন/নিজে দেখে)
  uid        text not null default '',     -- চ্যাটে দেখানো পাবলিক ইউজার আইডি
  nick       text not null default '',
  reason     text not null,
  created_at timestamptz not null default now(),
  until      timestamptz not null,
  lifted_at  timestamptz,
  by_admin   text
);
create index if not exists fa_restrictions_voter on fa_restrictions (voter, until);
create index if not exists fa_restrictions_uid on fa_restrictions (uid);
alter table fa_restrictions enable row level security;   -- সরাসরি টেবিল বন্ধ

-- অ্যাডমিন: Restriction দিন। p_minutes: ১ মিনিট – ৩৬৫ দিন (কাস্টম)।
create or replace function fa_restrict(p_voter text, p_uid text, p_nick text, p_reason text, p_minutes int)
returns bigint language plpgsql security definer set search_path = public as $$
declare nid bigint; adm text;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if p_voter is null or length(p_voter) < 4 then raise exception 'voter'; end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 525600 then raise exception 'minutes 1..525600'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason'; end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;
  insert into fa_restrictions (voter, uid, nick, reason, until, by_admin)
  values (p_voter, left(coalesce(p_uid, ''), 80), left(coalesce(p_nick, ''), 40), left(btrim(p_reason), 300), now() + make_interval(mins => p_minutes), adm)
  returning id into nid;
  return nid;
end $$;
revoke all on function fa_restrict(text, text, text, text, int) from public, anon;
grant execute on function fa_restrict(text, text, text, text, int) to authenticated;

-- অ্যাডমিন: তুলে নিন — p_id দিলে ওই একটা ওয়ার্নিং, p_voter দিলে ওই ইউজারের সব চলমান ওয়ার্নিং।
create or replace function fa_unrestrict(p_id bigint default null, p_voter text default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if p_id is null and p_voter is null then return 0; end if;
  update fa_restrictions set lifted_at = now()
   where lifted_at is null and until > now() and ((p_id is not null and id = p_id) or (p_voter is not null and voter = p_voter));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function fa_unrestrict(bigint, text) from public, anon;
grant execute on function fa_unrestrict(bigint, text) to authenticated;

-- অ্যাডমিন: তালিকা। p_active_only = true হলে শুধু চলমান; false হলে সাম্প্রতিক ২০০টি (শেষ/তোলা সহ)।
create or replace function fa_admin_restrictions(p_active_only boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'voter', voter, 'uid', uid, 'nick', nick, 'reason', reason,
      'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint,
      'l', case when lifted_at is null then null else (extract(epoch from lifted_at) * 1000)::bigint end, 'by', by_admin) order by created_at desc)
    from (select * from fa_restrictions
           where (not p_active_only) or (lifted_at is null and until > now())
           order by created_at desc limit 200) x
  ), '[]'::jsonb);
end $$;
revoke all on function fa_admin_restrictions(boolean) from public, anon;
grant execute on function fa_admin_restrictions(boolean) to authenticated;

-- ================= 🔒 স্থায়ী লক (রিপোর্ট ছাড়াই অ্যাডমিন সরাসরি) =================
-- লক = স্থায়ী ব্যান: চ্যাট দেখতে পারে, কিন্তু কিছু পাঠাতে/রিপ্লাই দিতে পারে না। অ্যাডমিন "লক খুলুন" না চাপা পর্যন্ত থাকে।
-- সুরক্ষা: (১) চ্যাট পেইজে বোতাম/ইনপুট বন্ধ; (২) নিচের ট্রিগার mc2_ac_messages-এ নতুন বার্তা ঢোকাই আটকায় (ডিভাইস/ইউজার আইডি মিললে)।
create table if not exists fa_locks (
  id bigserial primary key, voter text not null, uid text not null default '', nick text not null default '',
  reason text not null, created_at timestamptz not null default now(), lifted_at timestamptz, by_admin text
);
create unique index if not exists fa_locks_one_active on fa_locks (voter) where lifted_at is null;
alter table fa_locks enable row level security;

create or replace function fa_lock(p_voter text, p_uid text, p_nick text, p_reason text)
returns bigint language plpgsql security definer set search_path = public as $$
declare nid bigint; adm text;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if p_voter is null or length(p_voter) < 4 then raise exception 'voter'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason'; end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;
  update fa_locks set reason = left(btrim(p_reason), 300), uid = left(coalesce(p_uid, ''), 80), nick = left(coalesce(p_nick, ''), 40)
   where voter = p_voter and lifted_at is null returning id into nid;
  if nid is null then
    insert into fa_locks (voter, uid, nick, reason, by_admin) values (p_voter, left(coalesce(p_uid, ''), 80), left(coalesce(p_nick, ''), 40), left(btrim(p_reason), 300), adm) returning id into nid;
  end if;
  return nid;
end $$;
revoke all on function fa_lock(text, text, text, text) from public, anon;
grant execute on function fa_lock(text, text, text, text) to authenticated;

create or replace function fa_unlock(p_voter text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  update fa_locks set lifted_at = now() where voter = p_voter and lifted_at is null;
  get diagnostics n = row_count; return n;
end $$;
revoke all on function fa_unlock(text) from public, anon;
grant execute on function fa_unlock(text) to authenticated;

create or replace function fa_admin_locks()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'voter', voter, 'uid', uid, 'nick', nick, 'reason', reason,
           'c', (extract(epoch from created_at) * 1000)::bigint, 'by', by_admin) order by created_at desc)
           from fa_locks where lifted_at is null), '[]'::jsonb);
end $$;
revoke all on function fa_admin_locks() from public, anon;
grant execute on function fa_admin_locks() to authenticated;

-- ট্রিগার: লকড ইউজারের নতুন বার্তা সার্ভারেই আটকায়। (বার্তা টেবিলে ডিভাইস/ইউজার আইডির কলাম যে নামেই থাকুক খুঁজে নেয়; না মিললে শুধু চ্যাট পেইজের বন্ধ কাজ করে।)
create or replace function fa_lock_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(new);
begin
  if exists (select 1 from fa_locks l where l.lifted_at is null and (
       l.voter in (coalesce(j->>'voter', ''), coalesce(j->>'voter_id', ''), coalesce(j->>'device', ''))
       or (l.uid <> '' and l.uid in (coalesce(j->>'uid', ''), coalesce(j->>'user_uid', ''))))) then
    raise exception 'locked';
  end if;
  return new;
end $$;
do $$ begin
  if to_regclass('public.mc2_ac_messages') is not null then
    drop trigger if exists fa_lock_guard_t on mc2_ac_messages;
    create trigger fa_lock_guard_t before insert on mc2_ac_messages for each row execute function fa_lock_guard();
  end if;
exception when others then raise notice 'ট্রিগার বসেনি: % — তবুও চ্যাট পেইজে লক কাজ করবে।', sqlerrm;
end $$;

-- ================= 🛡 সেটিংস: স্ক্রীনশট সুরক্ষা (ডিফল্ট বন্ধ) =================
create table if not exists fa_settings (key text primary key, val jsonb not null default 'false'::jsonb, updated_at timestamptz not null default now());
alter table fa_settings enable row level security;
create or replace function fa_set_shot(p_on boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  insert into fa_settings (key, val) values ('shot', to_jsonb(coalesce(p_on, false)))
  on conflict (key) do update set val = excluded.val, updated_at = now();
  return coalesce(p_on, false);
end $$;
revoke all on function fa_set_shot(boolean) from public, anon;
grant execute on function fa_set_shot(boolean) to authenticated;

-- ================= 🤬 খারাপ শব্দ (চ্যাটে Restricted ইউজারের লেখা লুকাতে) =================
-- অ্যাডমিনের "🚫 খারাপ শব্দ" তালিকা (mc2_bad_words) পড়ে। তালিকা না থাকলে ফাঁকা।
create or replace function fa_bad() returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  return coalesce((select jsonb_agg(word) from (select word from mc2_bad_words limit 5000) w), '[]'::jsonb);
exception when others then return '[]'::jsonb;
end $$;
grant execute on function fa_bad() to anon, authenticated;

-- ================= সবার জন্য (চ্যাট পেইজ) =================
-- p = চলমান Restriction-এ থাকা সবার ওয়ার্নিং (পাবলিক uid দিয়ে), m = নিজের (voter দিয়ে), lk = নিজে লকড হলে কারণ, shot = স্ক্রীনশট সুরক্ষা চালু কিনা।
-- ডিভাইস আইডি কখনো অন্যকে দেখায় না।
create or replace function fa_rs(p_voter text default null)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'p', coalesce((select jsonb_agg(jsonb_build_object('u', g.uid, 'w', g.w)) from (
          select uid, jsonb_agg(jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint) order by created_at) w
            from fa_restrictions where lifted_at is null and until > now() and uid <> '' group by uid) g), '[]'::jsonb),
    'm', coalesce((select jsonb_agg(jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint) order by created_at)
            from fa_restrictions where p_voter is not null and voter = p_voter and lifted_at is null and until > now()), '[]'::jsonb),
    'lk', (select jsonb_build_object('r', reason) from fa_locks where p_voter is not null and voter = p_voter and lifted_at is null limit 1),
    'shot', coalesce((select val = 'true'::jsonb from fa_settings where key = 'shot'), false),
    'now', (extract(epoch from now()) * 1000)::bigint
  );
$$;
grant execute on function fa_rs(text) to anon, authenticated;

select count(*) as active_restrictions from fa_restrictions where lifted_at is null and until > now();
