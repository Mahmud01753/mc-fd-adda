-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালাবেন না (শুধু নতুন Supabase প্রজেক্টে একবার)
-- কাজ: রেস্ট্রিকশন, চ্যাট লক, ব্যাজ, জেন্ডার ও ভিজিটর তথ্য।
-- SQL-3 (রেস্ট্রিকশন/লক/ব্যাজ/জেন্ডার/ভিজিটর) — পুরোটা কপি করে Supabase SQL Editor-এ Run। ক্রম: ১ → ২ → ৩ → ADMIN

-- ==================== 38_supabase-new-20261024.sql ====================
-- Friend Adda — জেন্ডার সব জায়গায় + ভিজিটর লিস্টে ফোন/ডিভাইস তথ্য (একটাই ফাইল, একবার Run; আবার চালালেও ক্ষতি নেই)
-- আগে ব্যাকআপ নিন। এটা চালানোর পরে নতুন সাইট ফাইল আপলোড করুন (community.js, admin-*.js, sw.js)।
-- জেন্ডার কোড: m = ছেলে/স্যার, f = মেয়ে/ম্যাম, x = ভিজিটর/অজানা। সোর্স: খেলোয়াড়ের "আমি কে?" পছন্দ (সাইট এখন info.g হিসেবে পাঠায়)।

-- ১) কলাম
alter table mc2_presence add column if not exists gender text;
alter table mc2_scores add column if not exists gender text;
alter table mc2_visits add column if not exists gender text;
alter table mc2_cards add column if not exists gender text;
alter table contest_entries add column if not exists gender text;

-- ২) নতুন সারিতে নিজে নিজে জেন্ডার বসানো (স্কোর/ভিজিট/কার্ড/পুরস্কার ফর্ম): আগে info.g বা কার্ডের kind, না থাকলে ওই ডিভাইসের উপস্থিতি-সারি থেকে।
--    তাই স্কোর-সেভ, কার্ড-সেভ, submit_entry ফাংশন বদলাতে হয়নি।
create or replace function mc2_gender_fill() returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(new); g text; dev text;
begin
  if new.gender is not null then return new; end if;
  g := coalesce(j -> 'info' ->> 'g', case j -> 'rec' ->> 'kind' when 'male' then 'm' when 'sir' then 'm' when 'female' then 'f' when 'mam' then 'f' when 'visitor' then 'x' end);
  if g is null and TG_TABLE_NAME <> 'mc2_presence' then
    dev := j ->> 'device';
    if dev is not null then select p.gender into g from mc2_presence p where p.voter = dev; end if;
  end if;
  if g in ('m', 'f', 'x') then new.gender := g; end if;
  return new;
end $$;
revoke all on function mc2_gender_fill() from public, anon, authenticated;
drop trigger if exists mc2_gender_fill_t on mc2_presence; create trigger mc2_gender_fill_t before insert on mc2_presence for each row execute function mc2_gender_fill();
drop trigger if exists mc2_gender_fill_t on mc2_scores;   create trigger mc2_gender_fill_t before insert on mc2_scores   for each row execute function mc2_gender_fill();
drop trigger if exists mc2_gender_fill_t on mc2_visits;   create trigger mc2_gender_fill_t before insert on mc2_visits   for each row execute function mc2_gender_fill();
drop trigger if exists mc2_gender_fill_t on mc2_cards;    create trigger mc2_gender_fill_t before insert on mc2_cards    for each row execute function mc2_gender_fill();
drop trigger if exists mc2_gender_fill_t on contest_entries; create trigger mc2_gender_fill_t before insert on contest_entries for each row execute function mc2_gender_fill();

-- ৩) পুরোনো ডেটা ভরা (যেখানে পাওয়া যায়): আগে কার্ডের kind থেকে, তারপর কার্ড থেকে স্কোর/উপস্থিতি/ভিজিট/পুরস্কার ফর্মে ডিভাইস মিলিয়ে
update mc2_cards set gender = case rec ->> 'kind' when 'male' then 'm' when 'sir' then 'm' when 'female' then 'f' when 'mam' then 'f' when 'visitor' then 'x' end
  where gender is null and rec ->> 'kind' in ('male', 'sir', 'female', 'mam', 'visitor');
update mc2_scores s set gender = d.gender from (select distinct on (device) device, gender from mc2_cards where gender is not null order by device, updated_at desc) d where s.gender is null and s.device = d.device;
update mc2_presence p set gender = d.gender from (select distinct on (device) device, gender from mc2_cards where gender is not null order by device, updated_at desc) d where p.gender is null and p.voter = d.device;
update mc2_visits v set gender = d.gender from (select distinct on (device) device, gender from mc2_cards where gender is not null order by device, updated_at desc) d where v.gender is null and v.device = d.device;
update contest_entries e set gender = d.gender from (select distinct on (device) device, gender from mc2_cards where gender is not null order by device, updated_at desc) d where e.gender is null and e.device = d.device;

-- ৪) হার্টবিট: info.g থেকে জেন্ডার উপস্থিতিতে রাখে (আগের সিগনেচরই, সাইটের পুরোনো ফাইলেও চলবে)
create or replace function mc2_presence_ping(p_device text, p_nick text, p_gname text, p_gdept text, p_gbatch text, p_cdept text, p_csess text, p_cdept_id int, p_csess_id int, p_page text, p_info jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v text := left(coalesce(p_device, ''), 40); o record;
begin
  if char_length(v) < 8 then return; end if;
  select last_seen, offline into o from mc2_presence where voter = v;
  if found and o.last_seen > now() - interval '3 seconds' and not o.offline then return; end if;
  insert into mc2_presence(voter, nick, game_name, game_dept, game_batch, chat_dept, chat_session, chat_dept_id, chat_session_id, page, ip, country, region, city, ua, info, gender)
  values (v, nullif(left(btrim(coalesce(p_nick, '')), 30), ''), nullif(left(btrim(coalesce(p_gname, '')), 30), ''), nullif(left(p_gdept, 60), ''), nullif(left(p_gbatch, 40), ''),
    nullif(left(p_cdept, 60), ''), nullif(left(p_csess, 40), ''), p_cdept_id, p_csess_id, left(p_page, 60), mc2_ip(), left(mc2_hdr('cf-ipcountry'), 8), left(mc2_hdr('cf-region'), 60), left(mc2_hdr('cf-ipcity'), 60),
    left(mc2_hdr('user-agent'), 400), case when p_info is not null and pg_column_size(p_info) < 3000 then p_info end,
    case when p_info ->> 'g' in ('m', 'f', 'x') then p_info ->> 'g' end)
  on conflict (voter) do update set
    nick = excluded.nick, game_name = excluded.game_name, game_dept = excluded.game_dept, game_batch = excluded.game_batch,
    chat_dept = excluded.chat_dept, chat_session = excluded.chat_session, chat_dept_id = excluded.chat_dept_id, chat_session_id = excluded.chat_session_id,
    page = excluded.page, ip = coalesce(excluded.ip, mc2_presence.ip), country = coalesce(excluded.country, mc2_presence.country), region = coalesce(excluded.region, mc2_presence.region), city = coalesce(excluded.city, mc2_presence.city),
    ua = coalesce(excluded.ua, mc2_presence.ua), info = coalesce(excluded.info, mc2_presence.info), gender = coalesce(excluded.gender, mc2_presence.gender),
    joined_at = case when mc2_presence.offline or mc2_presence.last_seen < now() - interval '100 seconds' then now() else mc2_presence.joined_at end,
    visits = mc2_presence.visits + case when mc2_presence.offline or mc2_presence.last_seen < now() - interval '30 minutes' then 1 else 0 end,
    last_seen = now(), offline = false;
end $$;

-- ৫) Visitor List: জেন্ডার, ফোন নম্বর (পুরস্কার ফর্মে দিলে), পুরো ডিভাইস info, শহর/অঞ্চল দিয়ে খোঁজা
create or replace function mc2_admin_users(p_q text default '', p_online boolean default false, p_limit int default 50, p_offset int default 0) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := '%' || lower(btrim(coalesce(p_q, ''))) || '%'; t int; r jsonb;
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  select count(*) into t from mc2_presence p where (not p_online or mc2_online(p.last_seen, p.offline))
    and (q = '%%' or lower(concat_ws(' ', p.nick, p.game_name, p.game_dept, p.game_batch, p.chat_dept, p.chat_session, p.ip, p.city, p.region, mc2_uid(p.voter))) like q);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.ls desc), '[]'::jsonb) into r from (
    select p.voter, mc2_uid(p.voter) uid, p.nick, p.game_name gname, p.game_dept gdept, p.game_batch gbatch, p.chat_dept cdept, p.chat_session csess, p.page, p.ip, p.country, p.region, p.city, left(p.ua, 200) ua, p.visits, p.gender, p.info,
      (select substring(e.contact from '(?:\+?88)?01[3-9][0-9]{8}') from contest_entries e where e.device = p.voter and e.contact is not null order by e.id desc limit 1) phone,
      (extract(epoch from p.last_seen) * 1000)::bigint ls, mc2_online(p.last_seen, p.offline) online, (select max(s.score) from mc2_scores s where s.device = p.voter) best
    from mc2_presence p where (not p_online or mc2_online(p.last_seen, p.offline))
      and (q = '%%' or lower(concat_ws(' ', p.nick, p.game_name, p.game_dept, p.game_batch, p.chat_dept, p.chat_session, p.ip, p.city, p.region, mc2_uid(p.voter))) like q)
    order by p.last_seen desc limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)) x;
  return jsonb_build_object('total', t, 'rows', r);
end $$;
revoke all on function mc2_admin_users(text, boolean, int, int) from public, anon; grant execute on function mc2_admin_users(text, boolean, int, int) to authenticated;

-- ৬) একজনের পুরো তথ্য: জেন্ডার যোগ
create or replace function mc2_admin_user(p_voter text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p mc2_presence; v text := left(coalesce(p_voter, ''), 80);
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  select * into p from mc2_presence where voter = v;
  return jsonb_build_object('voter', v, 'uid', mc2_uid(v), 'known', p.voter is not null,
    'gender', coalesce(p.gender, (select s.gender from mc2_scores s where s.device = v and s.gender is not null order by s.id desc limit 1), (select c.gender from mc2_cards c where c.device = v and c.gender is not null order by c.updated_at desc limit 1)),
    'nick', p.nick, 'gname', coalesce(p.game_name, (select s.name from mc2_scores s where s.device = v order by s.id desc limit 1)), 'gdept', coalesce(p.game_dept, (select s.dept from mc2_scores s where s.device = v order by s.id desc limit 1)),
    'gbatch', coalesce(p.game_batch, (select s.batch from mc2_scores s where s.device = v order by s.id desc limit 1)), 'cdept', p.chat_dept, 'csess', p.chat_session, 'page', p.page,
    'ip', coalesce(p.ip, (select s.ip from mc2_scores s where s.device = v and s.ip is not null order by s.id desc limit 1), (select x.ip from mc2_visits x where x.device = v and x.ip is not null order by x.id desc limit 1), (select m.ip from mc2_ac_messages m where m.voter = v and m.ip is not null order by m.id desc limit 1)),
    'country', p.country, 'region', p.region, 'city', p.city,
    'ua', coalesce(p.ua, (select s.ua from mc2_scores s where s.device = v and s.ua is not null order by s.id desc limit 1), (select x.ua from mc2_visits x where x.device = v and x.ua is not null order by x.id desc limit 1)),
    'info', coalesce(p.info, (select s.info from mc2_scores s where s.device = v and s.info is not null order by s.id desc limit 1), (select x.info from mc2_visits x where x.device = v and x.info is not null order by x.id desc limit 1)),
    'first', p.first_seen, 'last', p.last_seen, 'joined', p.joined_at, 'visits', p.visits, 'online', coalesce(mc2_online(p.last_seen, p.offline), false),
    'best', (select max(score) from mc2_scores where device = v), 'bestpct', (select max(pct) from mc2_scores where device = v), 'plays', (select count(*) from mc2_scores where device = v),
    'scores', coalesce((select jsonb_agg(to_jsonb(t)) from (select name, dept, batch, score, pct, title, created_at from mc2_scores where device = v order by id desc limit 8) t), '[]'::jsonb),
    'msgs', (select count(*) from mc2_ac_messages where voter = v),
    'lastmsgs', coalesce((select jsonb_agg(to_jsonb(t)) from (select m.nick, m.body, m.created_at, s.name sess from mc2_ac_messages m left join mc2_ac_sessions s on s.id = m.session_id where m.voter = v and m.body <> '' order by m.id desc limit 5) t), '[]'::jsonb),
    'contact', (select e.contact from contest_entries e where e.device = v and e.contact is not null order by e.id desc limit 1),
    'phone', (select substring(e.contact from '(?:\+?88)?01[3-9][0-9]{8}') from contest_entries e where e.device = v and e.contact is not null order by e.id desc limit 1));
end $$;
revoke all on function mc2_admin_user(text) from public, anon; grant execute on function mc2_admin_user(text) to authenticated;

-- ৭) অ্যাডমিনের সব ট্যাবে চিহ্ন বসানোর জন্য: ডিভাইস→জেন্ডার (d) ও নাম→জেন্ডার (n, আনুমানিক)
create or replace function mc2_admin_genders() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'd', (select coalesce(jsonb_object_agg(device, gender), '{}'::jsonb) from (
           select distinct on (device) device, gender from (
             select device, gender, created_at t from mc2_scores where gender is not null and device is not null
             union all select voter, gender, last_seen from mc2_presence where gender is not null) a
           order by device, t desc) b),
    'n', (select coalesce(jsonb_object_agg(k, gender), '{}'::jsonb) from (
           select distinct on (lower(name)) lower(name) k, gender from mc2_scores where gender is not null order by lower(name), created_at desc) c));
end $$;
revoke all on function mc2_admin_genders() from public, anon; grant execute on function mc2_admin_genders() to authenticated;

notify pgrst, 'reload schema';

-- নাম-চেক: সবগুলো ok = true এলে ঠিক
select 'gender কলাম (৫ টেবিল)' as item, (select count(*) from information_schema.columns where column_name = 'gender' and table_name in ('mc2_presence', 'mc2_scores', 'mc2_visits', 'mc2_cards', 'contest_entries')) = 5 as ok
union all select 'অ্যাডমিন জেন্ডার ফাংশন', to_regprocedure('mc2_admin_genders()') is not null
union all select 'ট্রিগার (৫টি)', (select count(*) from pg_trigger where tgname = 'mc2_gender_fill_t') = 5;


-- ==================== 39_supabase-new-20261025.sql ====================
-- ২০২৬-১০-২৫ — 🏅 বেইজ (ইউজারের বেইজ): ১৫টা রেডিমেড + নিজের বানানো, একজনকে একাধিক বেইজ।
-- Supabase SQL Editor-এ একবার Run (আগে ব্যাকআপ)। আগে supabase-new-20261018k.sql (ফ্ল্যাগ) চালানো থাকতে হবে।
-- ইউজারের চাবি = ফ্ল্যাগের চাবির একই নিয়ম ("d:ডিভাইস" বা "n:নাম"), তাই ফ্ল্যাগ আর বেইজ একই ইউজারে মেলে।
-- ✅/❔/🚫/📵 অবস্থা আগের ফ্ল্যাগেই থাকে — এখানে কিছু বদলায় না, তাই মুছে যাওয়ার ভয় নেই।

create table if not exists mc2_badge_defs (
  id text primary key check (id ~ '^[a-z][a-z0-9]{0,23}$'),
  name text not null check (char_length(name) between 1 and 30),
  emoji text not null default '🏅' check (char_length(emoji) between 1 and 8),
  color text not null default '#2e7d4f' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort int not null default 100
);
create table if not exists mc2_user_badges (
  k text not null check (char_length(k) between 3 and 120),
  b text not null references mc2_badge_defs(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (k, b)
);
alter table mc2_badge_defs enable row level security;
alter table mc2_user_badges enable row level security;
revoke all on mc2_badge_defs, mc2_user_badges from anon, authenticated;

-- ১৫টা ডিফল্ট (আগে থেকে থাকলে ছোঁয় না)
insert into mc2_badge_defs (id, emoji, name, color, sort) values
  ('b1','🏆','কুইজ বিজয়ী','#c9971c',1),
  ('b2','🥇','টপার','#d4a017',2),
  ('b3','📞','সাড়া দিয়েছে','#2e7d4f',3),
  ('b4','🎁','পুরস্কার পেয়েছে','#c2410c',4),
  ('b5','🌟','সেরা খেলোয়াড়','#b45309',5),
  ('b6','👑','চ্যাম্পিয়ন','#7c3aed',6),
  ('b7','🔥','নিয়মিত খেলোয়াড়','#dc2626',7),
  ('b8','🧠','ধীমান','#0e7490',8),
  ('b9','🗺️','ক্যাম্পাস গাইড','#15803d',9),
  ('b10','⚡','বিদ্যুৎগতি','#ca8a04',10),
  ('b11','🎯','নিখুঁত লক্ষ্য','#be123c',11),
  ('b12','💎','বিশেষ অতিথি','#0369a1',12),
  ('b13','🤝','সহযোগী','#4d7c0f',13),
  ('b14','📣','প্রচারক','#a21caf',14),
  ('b15','🌱','নতুন মুখ','#16a34a',15)
on conflict (id) do nothing;

create or replace function mc2_badge_all() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'defs', coalesce((select jsonb_agg(to_jsonb(d) order by d.sort, d.id) from mc2_badge_defs d), '[]'::jsonb),
    'map',  coalesce((select jsonb_object_agg(k, ids) from (select k, jsonb_agg(b) ids from mc2_user_badges group by k) x), '{}'::jsonb));
end $$;

-- বেইজ বানানো/বদলানো: p_id খালি হলে নতুন (c… আইডি); ডিফল্ট ফেরাতে নির্দিষ্ট আইডি (b1…) দিয়ে ডাকা হয়
create or replace function mc2_badge_def_save(p_id text, p_name text, p_emoji text, p_color text) returns text language plpgsql security definer set search_path = public as $$
declare v text := nullif(trim(coalesce(p_id, '')), '');
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 30 then raise exception 'name 1..30'; end if;
  if v is not null and exists (select 1 from mc2_badge_defs where id = v) then
    update mc2_badge_defs set name = trim(p_name), emoji = left(coalesce(nullif(trim(p_emoji), ''), '🏅'), 8), color = coalesce(p_color, color) where id = v;
    return v;
  end if;
  if (select count(*) from mc2_badge_defs) >= 60 then raise exception 'too many badges (max 60)'; end if;
  v := coalesce(v, 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  insert into mc2_badge_defs (id, name, emoji, color, sort)
    values (v, trim(p_name), left(coalesce(nullif(trim(p_emoji), ''), '🏅'), 8), coalesce(p_color, '#2e7d4f'), coalesce((select max(sort) from mc2_badge_defs), 0) + 1);
  return v;
end $$;

create or replace function mc2_badge_def_del(p_id text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  delete from mc2_badge_defs where id = p_id;   -- সবার থেকে এই বেইজ সরে যায়; ফ্ল্যাগ/অবস্থায় হাত পড়ে না
end $$;

-- একজন বা অনেকজনকে একসাথে বেইজ দেওয়া (p_on = true) বা সরানো (false)
create or replace function mc2_badge_set(p_ks text[], p_id text, p_on boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if p_ks is null or coalesce(array_length(p_ks, 1), 0) = 0 then return; end if;
  if array_length(p_ks, 1) > 5000 then raise exception 'too many users at once (max 5000)'; end if;
  if not exists (select 1 from mc2_badge_defs where id = p_id) then raise exception 'badge not found'; end if;
  if p_on then
    insert into mc2_user_badges (k, b) select distinct k, p_id from unnest(p_ks) k where char_length(k) between 3 and 120 on conflict do nothing;
  else
    delete from mc2_user_badges where b = p_id and k = any (p_ks);
  end if;
end $$;

revoke all on function mc2_badge_all(), mc2_badge_def_save(text, text, text, text), mc2_badge_def_del(text), mc2_badge_set(text[], text, boolean) from public, anon;
grant execute on function mc2_badge_all(), mc2_badge_def_save(text, text, text, text), mc2_badge_def_del(text), mc2_badge_set(text[], text, boolean) to authenticated;

-- যাচাই: ৪টা ফাংশন + ১৫টা বেইজ দেখাবে
select (select count(*) from pg_proc where proname in ('mc2_badge_all','mc2_badge_def_save','mc2_badge_def_del','mc2_badge_set')) as functions_4,
       (select count(*) from mc2_badge_defs) as badges_15_or_more;


-- ==================== 40_supabase-new-20261029.sql ====================
-- 2026-10-29  নামের সীমা ৩০ → ২০০ (কার্ডে/লিডারবোর্ডে পুরো নাম)
-- NOT RUN (মালিক চালানোর কথা জানালে তবেই 'চালানো' ধরা হবে)
-- এক্ষেত্রে শুধু ৪টা ফাংশন নতুন করে বসে; টেবিল/ডেটা বদলায় না; আবার চালালেও সমস্যা নেই।
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে Run।

-- ---- mc2_submit_score ----
create or replace function mc2_submit_score(p_name text, p_dept text, p_batch text, p_club text, p_title text, p_pct int, p_score int, p_ok int, p_total int, p_device text, p_info jsonb)
returns text language plpgsql security definer set search_path = public as $$
begin
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 200 or char_length(coalesce(p_dept, '')) not between 1 and 60
     or p_pct not between 0 and 100 or p_score not between 0 and 1000 or char_length(coalesce(p_device, '')) not between 8 and 40 then return 'invalid'; end if;
  if mc2_ip() is not null and not mc2_ac_rl('score:ip:' || mc2_ip(), mc2_lim('ip_score_hr'), 3600) then return 'slow'; end if;
  if (select count(*) from mc2_scores where device = p_device and created_at > now() - interval '1 hour') >= mc2_lim('score_dev_hr') then return 'slow'; end if;
  insert into mc2_scores(name, dept, batch, club, title, pct, score, ok, total, device, ip, ua, info)
  values (trim(p_name), p_dept, left(p_batch, 40), left(p_club, 60), left(p_title, 60), p_pct, p_score, p_ok, p_total, p_device, mc2_ip(), left(mc2_hdr('user-agent'), 400), p_info);
  return 'ok';
end $$;

-- ---- mc2_card_save ----
create or replace function mc2_card_save(p_device text, p_name text, p_dept text, p_batch text, p_score int, p_rec jsonb, p_thumb text, p_photo text)
returns text language plpgsql security definer set search_path = public as $$
declare v record; nm text := trim(coalesce(p_name, '')); rec jsonb; old record;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 or char_length(nm) not between 1 and 200 or p_score is null or p_score not between 0 and 1000 then return 'invalid'; end if;
  if p_rec is null or jsonb_typeof(p_rec) <> 'object' or octet_length(p_rec::text) > 4000 then return 'invalid'; end if;
  if p_thumb is null or char_length(p_thumb) > 160000 or p_thumb !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then return 'invalid'; end if;
  if p_photo is not null and p_photo <> '' and (char_length(p_photo) > 220000 or p_photo !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$') then return 'invalid'; end if;
  if mc2_ip() is not null and not mc2_ac_rl('card:ip:' || mc2_ip(), mc2_lim('ip_card_hr'), 3600) then return 'slow'; end if;
  select * into v from mc2_scores where device = p_device and lower(name) = lower(nm) and score = p_score order by id desc limit 1;
  if not found then return 'noscore'; end if;
  select * into old from mc2_cards where device = p_device and lower(name) = lower(nm);
  if found then
    if old.updated_at > now() - make_interval(secs => mc2_lim('card_gap_sec')) then return 'slow'; end if;
    if old.score > v.score then return 'lower'; end if;
  elsif (select count(*) from mc2_cards where device = p_device) >= mc2_lim('card_per_dev') then
    delete from mc2_cards where id = (select x.id from mc2_cards x where x.device = p_device and not x.pinned order by x.updated_at limit 1);
    if (select count(*) from mc2_cards where device = p_device) >= mc2_lim('card_per_dev') then return 'slow'; end if;
  end if;
  rec := p_rec - 'device' || jsonb_build_object('name', v.name, 'dept', v.dept, 'batch', coalesce(v.batch, ''), 'score', v.score, 'pct', v.pct, 'ok', coalesce(v.ok, 0), 'total', coalesce(v.total, 0),
    'club', coalesce(v.club, ''), 'title', coalesce(v.title, ''));
  insert into mc2_cards(device, name, dept, batch, score, pct, ok, total, rec, thumb, photo)
  values (p_device, v.name, v.dept, v.batch, v.score, v.pct, v.ok, v.total, rec, p_thumb, nullif(p_photo, ''))
  on conflict (device, (lower(name))) do update set name = excluded.name, dept = excluded.dept, batch = excluded.batch, score = excluded.score, pct = excluded.pct, ok = excluded.ok, total = excluded.total,
    rec = excluded.rec, thumb = excluded.thumb, photo = excluded.photo, updated_at = now();
  if random() < 0.1 then begin perform mc2_cleanup_tick(); exception when others then null; end; end if;
  return 'ok';
end $$;

-- ---- mc2_submit_answers ----
create or replace function mc2_submit_answers(p_session text, p_device text, p_name text, p_answers jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare a jsonb; q mc2_questions; ch text; ms int; ok boolean; sk boolean; pts int; cnt int := 0;
begin
  if char_length(coalesce(p_session, '')) not between 8 and 40 or char_length(coalesce(p_device, '')) not between 8 and 40
     or p_answers is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) not between 1 and 50 then return 'invalid'; end if;
  if exists (select 1 from mc2_answers where session = p_session) then return 'dup'; end if;
  if (select count(distinct session) from mc2_answers where device = p_device and created_at > now() - interval '1 hour') >= 20 then return 'slow'; end if;
  for a in select value from jsonb_array_elements(p_answers) loop
    select * into q from mc2_questions where place_id = nullif(a ->> 'pid', '')::bigint;
    if not found then continue; end if;
    ch := left(a ->> 'c', 120);
    sk := coalesce((a ->> 's')::boolean, false) or ch is null;
    ms := least(greatest(coalesce(round((a ->> 'ms')::numeric)::int, 0), 0), 600000);
    ok := (not sk) and ch = q.correct;
    pts := case when ok then greatest(5, 100 - 5 * floor(ms / 1000.0)::int) else 0 end;
    insert into mc2_answers(session, device, name, place_id, place_bn, chosen, correct_ans, is_correct, skipped, ms, pts)
    values (p_session, p_device, left(trim(coalesce(p_name, '')), 200), q.place_id, q.correct, case when sk then null else ch end, q.correct, ok, sk, ms, pts);
    cnt := cnt + 1;
  end loop;
  return case when cnt > 0 then 'ok' else 'invalid' end;
exception when others then return 'invalid';
end $$;

-- ---- mc2_board_admin_edit ----
create or replace function mc2_board_admin_edit(p_id bigint, p_name text, p_dept text, p_batch text, p_score int) returns text
language plpgsql security definer set search_path = public as $$
declare o mc2_scores%rowtype; nm text := trim(coalesce(p_name, ''));
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  select * into o from mc2_scores where id = p_id; if not found then return 'missing'; end if;
  if char_length(nm) not between 1 and 200 or char_length(coalesce(p_dept, '')) not between 1 and 60 or p_score not between 0 and 1000 or char_length(coalesce(p_batch, '')) > 40 then return 'invalid'; end if;
  update mc2_scores set name = nm, dept = p_dept, batch = nullif(trim(coalesce(p_batch, '')), ''), score = p_score, pct = round(p_score / 10.0)::int where id = p_id;
  if lower(o.name) <> lower(nm) or o.name <> nm then
    begin update mc2_cards set name = nm where device = o.device and lower(name) = lower(o.name);
    exception when unique_violation then null; end;
  end if;
  return 'ok';
end $$;

-- নাম-চেক: সব সারিতে ok = true এলে ঠিক
select p.proname as fn, pg_get_functiondef(p.oid) like '%between 1 and 200%' or pg_get_functiondef(p.oid) like '%, 200)%' as ok
from pg_proc p where p.proname in ('mc2_submit_score','mc2_card_save','mc2_submit_answers','mc2_board_admin_edit') order by 1;


-- ==================== 41_supabase-new-20261030.sql ====================
-- লিডারবোর্ড: র‍্যাংক হিস্টরি (কোন তারিখে কত স্কোর নিয়ে কত র‍্যাংকে ছিল)
-- Supabase > SQL Editor-এ একবার চালান। আগের কিছু বদলায় না; শুধু নতুন ফাংশন যোগ হয়।
-- র‍্যাংক = ওই খেলার স্কোর নিয়ে, ওই মুহূর্ত পর্যন্ত সবার সেরা স্কোরের মধ্যে কততম (কেউ বেশি স্কোর করলে র‍্যাংক নামে)।
create or replace function mc2_rank_history(p_name text, p_dept text, p_batch text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare nm text := left(trim(coalesce(p_name, '')), 200); ip text := mc2_ip(); bt text := coalesce(p_batch, ''); res jsonb;
begin
  if coalesce((select (value ->> 'board_on')::boolean from mc2_settings where key = 'board_cfg'), true) = false then return jsonb_build_object('rows', '[]'::jsonb); end if;
  if nm = '' then return jsonb_build_object('rows', '[]'::jsonb); end if;
  if ip is not null and not mc2_ac_rl('rankh:ip:' || ip || ':60', 40, 60) then return jsonb_build_object('err', 'slow'); end if;
  with mine as (
    select id, score, created_at from mc2_scores
    where lower(name) = lower(nm) and dept = p_dept and coalesce(batch, '') = bt and not coalesce(hidden, false)
    order by created_at desc, id desc limit 100
  ), hist as (
    select m.id, m.score, m.created_at,
      1 + (select count(*) from (select 1 from mc2_scores s
             where not coalesce(s.hidden, false) and s.created_at <= m.created_at
               and not (lower(s.name) = lower(nm) and s.dept = p_dept and coalesce(s.batch, '') = bt)
             group by lower(s.name), s.dept, coalesce(s.batch, '') having max(s.score) > m.score) z) as rk,
      (select count(*) from (select 1 from mc2_scores s
             where not coalesce(s.hidden, false) and s.created_at <= m.created_at
             group by lower(s.name), s.dept, coalesce(s.batch, '')) y) as n
    from mine m
  ), best as (select max(score) as b from mine)
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'score', score, 'rk', rk, 'n', n, 'ts', (extract(epoch from created_at) * 1000)::bigint) order by created_at desc, id desc) from hist), '[]'::jsonb),
    'best', (select b from best),
    'now_rk', case when (select b from best) is null then null else 1 + (select count(*) from (select 1 from mc2_scores s
             where not coalesce(s.hidden, false) and not (lower(s.name) = lower(nm) and s.dept = p_dept and coalesce(s.batch, '') = bt)
             group by lower(s.name), s.dept, coalesce(s.batch, '') having max(s.score) > (select b from best)) q) end
  ) into res;
  return res;
end $$;
grant execute on function mc2_rank_history(text, text, text) to anon, authenticated;

-- চেক: true এলে ঠিক আছে
select exists (select 1 from pg_proc where proname = 'mc2_rank_history') as rank_history_ok;


-- ==================== 42_supabase-new-20261101.sql ====================
-- 2026-11-01: মডারেশন > রিপোর্ট তালিকার মোট সংখ্যা (১ ২ ৩ পেজ-নম্বরের জন্য)। একবার চালান; আবার চালালেও ক্ষতি নেই।
create or replace function mc2_ac_admin_reports_count(p_status text default 'open') returns int
language plpgsql stable security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  return (select count(*)::int from mc2_ac_reports r where (p_status = 'all' or r.status = p_status));
end $$;
revoke all on function mc2_ac_admin_reports_count(text) from public, anon;
grant execute on function mc2_ac_admin_reports_count(text) to authenticated;


-- ==================== 43_supabase-new-20261102.sql ====================
-- 2026-11-02: একই ব্যক্তির (একই নাম + বিভাগ + ব্যাচ + পরিচয় + ডিভাইস/আইপি-ব্রাউজার) কার্ড সর্বোচ্চ ৩টা — বেশি হলে সবচেয়ে কম স্কোরেরটা আগে কাটে (টপ ৩-এ ওঠা কার্ডও), যাতে একজনেই সাইট না ভরে।
-- RUN (মালিক নিশ্চিত করেছেন, ২০২৬-১১-০৬)
-- শুধু mc2_card_save ফাংশন নতুন করে বসে; টেবিল/ডেটা বদলায় না; আবার চালালেও সমস্যা নেই। নতুন কার্ড সেভের সময় থেকে নিয়ম চলবে।
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে Run।

create or replace function mc2_card_save(p_device text, p_name text, p_dept text, p_batch text, p_score int, p_rec jsonb, p_thumb text, p_photo text)
returns text language plpgsql security definer set search_path = public as $$
declare v record; nm text := trim(coalesce(p_name, '')); rec jsonb; old record;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 or char_length(nm) not between 1 and 200 or p_score is null or p_score not between 0 and 1000 then return 'invalid'; end if;
  if p_rec is null or jsonb_typeof(p_rec) <> 'object' or octet_length(p_rec::text) > 4000 then return 'invalid'; end if;
  if p_thumb is null or char_length(p_thumb) > 160000 or p_thumb !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then return 'invalid'; end if;
  if p_photo is not null and p_photo <> '' and (char_length(p_photo) > 220000 or p_photo !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$') then return 'invalid'; end if;
  if mc2_ip() is not null and not mc2_ac_rl('card:ip:' || mc2_ip(), mc2_lim('ip_card_hr'), 3600) then return 'slow'; end if;
  select * into v from mc2_scores where device = p_device and lower(name) = lower(nm) and score = p_score order by id desc limit 1;
  if not found then return 'noscore'; end if;
  select * into old from mc2_cards where device = p_device and lower(name) = lower(nm);
  if found then
    if old.updated_at > now() - make_interval(secs => mc2_lim('card_gap_sec')) then return 'slow'; end if;
    if old.score > v.score then return 'lower'; end if;
  elsif (select count(*) from mc2_cards where device = p_device) >= mc2_lim('card_per_dev') then
    delete from mc2_cards where id = (select x.id from mc2_cards x where x.device = p_device and not x.pinned order by x.updated_at limit 1);
    if (select count(*) from mc2_cards where device = p_device) >= mc2_lim('card_per_dev') then return 'slow'; end if;
  end if;
  rec := p_rec - 'device' || jsonb_build_object('name', v.name, 'dept', v.dept, 'batch', coalesce(v.batch, ''), 'score', v.score, 'pct', v.pct, 'ok', coalesce(v.ok, 0), 'total', coalesce(v.total, 0),
    'club', coalesce(v.club, ''), 'title', coalesce(v.title, ''));
  insert into mc2_cards(device, name, dept, batch, score, pct, ok, total, rec, thumb, photo)
  values (p_device, v.name, v.dept, v.batch, v.score, v.pct, v.ok, v.total, rec, p_thumb, nullif(p_photo, ''))
  on conflict (device, (lower(name))) do update set name = excluded.name, dept = excluded.dept, batch = excluded.batch, score = excluded.score, pct = excluded.pct, ok = excluded.ok, total = excluded.total,
    rec = excluded.rec, thumb = excluded.thumb, photo = excluded.photo, updated_at = now();
  -- একই ব্যক্তির কার্ড সর্বোচ্চ ৩টা। "একই ব্যক্তি" ধরতে সব কটা মিলতে হবে:
  --   (১) একই নাম  (২) একই বিভাগ  (৩) একই ব্যাচ/সেশন  (৪) একই পরিচয় (ছাত্র/ছাত্রী/স্যার/ম্যাম/ভিজিটর) — দুই কার্ডেই লেখা থাকতে হবে
  --   (৫) একই ডিভাইস, অথবা একই আইপি + একই ব্রাউজার/ফোন (user-agent)
  -- কোনো একটা তথ্য না থাকলে বা সন্দেহ থাকলে "আলাদা ব্যক্তি" ধরা হয়, তাই ভুল করে অন্যের কার্ড কাটার ঝুঁকি নেই।
  -- ৩টার বেশি হলে সবচেয়ে কম স্কোরেরটা (সমান হলে পুরোনোটা) কাটে — টপ ৩-এ ওঠা (pinned) কার্ড হলেও।
  delete from mc2_cards where id in (
    select c.id from mc2_cards c
    where lower(c.name) = lower(v.name) and c.dept = v.dept
      and coalesce(c.batch, '') = coalesce(v.batch, '')
      and coalesce(c.rec ->> 'kind', '') <> '' and (c.rec ->> 'kind') = coalesce(p_rec ->> 'kind', '')
      and (c.device = p_device
           or (v.ip is not null and v.ua is not null and exists (select 1 from mc2_scores s where s.device = c.device and s.ip is not null and s.ip::text = v.ip::text and s.ua is not null and s.ua = v.ua)))
    order by c.score desc, c.updated_at desc offset 3);
  if not exists (select 1 from mc2_cards where device = p_device and lower(name) = lower(v.name)) then return 'lower'; end if;
  if random() < 0.1 then begin perform mc2_cleanup_tick(); exception when others then null; end; end if;
  return 'ok';
end $$;

-- নাম-চেক: ok = true এলে ঠিক
select pg_get_functiondef(p.oid) like '%offset 3%' as ok from pg_proc p where p.proname = 'mc2_card_save';

-- আগে থেকে জমা বাড়তি কার্ড এতে মোছা হয় না; নিয়মটা নতুন কার্ড সেভের সময় থেকে চলে।


-- ==================== 44_supabase-new-20261103.sql ====================
-- 2026-11-03: কার্ডের ম্যানুয়াল ডিলিট (অ্যাডমিন > 🪪 কার্ড > "কার্ড ডিলিট") — প্রতি কার্ডের KB + অনেক আইডেন্টিফায়ার ফিল্টার + এক ডিভাইসে সর্বোচ্চ ২০ কার্ড (কঠোর)
-- RUN (মালিক নিশ্চিত করেছেন, ২০২৬-১১-০৬)
-- কোনো অটো-ডিলিট নিয়ম বদলায় না; কোনো ডেটা মোছে না; টেবিলে কলাম যোগ হয় না। আবার চালালেও সমস্যা নেই।
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে Run। আগে ...20261020c (mc2_top_hist) ও ...20261024 (gender) চালানো থাকতে হবে (আছে)।

-- ১) অ্যাডমিন-ভিউ: প্রতি কার্ডের KB + ফিল্টারের আইডেন্টিফায়ার (শুধু অ্যাডমিন দেখে — নইলে ভিউ খালি আসে; anon/পাবলিক অনুমতি নেই)
create or replace view mc2_cards_adm as
select c.id, c.device, c.name, c.dept, c.batch, c.score, c.pct, c.ok, c.total, c.show, c.pinned, c.gender, c.created_at, c.updated_at, c.thumb,
  round((pg_column_size(c.thumb) + coalesce(pg_column_size(c.photo), 0) + pg_column_size(c.rec) + 100) / 1024.0, 1) as kb,
  round(pg_column_size(c.thumb) / 1024.0, 1) as thumb_kb,
  round(coalesce(pg_column_size(c.photo), 0) / 1024.0, 1) as photo_kb,
  (c.photo is not null) as has_photo,
  c.rec ->> 'kind' as kind,
  nullif(c.rec ->> 'club', '') as club,
  nullif(c.rec ->> 'title', '') as title,
  count(*) over (partition by c.device) as dev_cards,
  count(*) over (partition by lower(c.name), c.dept, coalesce(c.batch, '')) as same_cards,
  s.ip::text as ip,
  nullif(s.info ->> 'model', '') as model,
  coalesce(p.n, 0) as plays,
  coalesce(h.best_rank, 0)::int as top_best,
  coalesce(h.times_in_top, 0)::int as top_times,
  exists (select 1 from contest_entries e where e.device = c.device) as has_form
from mc2_cards c
left join lateral (select x.ip, x.info from mc2_scores x where x.device = c.device and lower(x.name) = lower(c.name) order by x.id desc limit 1) s on true
left join lateral (select count(*)::int as n from mc2_scores x where x.device = c.device and lower(x.name) = lower(c.name)) p on true
left join mc2_top_hist h on h.card_id = c.id
where mc2_is_admin();

revoke all on mc2_cards_adm from public, anon;
grant select on mc2_cards_adm to authenticated;

-- ২) জায়গার মিটার: সব কার্ড মিলিয়ে কত KB/MB, গড়, ছবিসহ/ছাড়া, ২০-এর বেশি কার্ডের ডিভাইস কয়টা
create or replace function mc2_cards_kb_stats() returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'n', count(*), 'mb', round(coalesce(sum(kb), 0) / 1024.0, 2), 'avg_kb', round(coalesce(avg(kb), 0), 1),
    'min_kb', coalesce(min(kb), 0), 'max_kb', coalesce(max(kb), 0),
    'photo_n', count(*) filter (where has_photo),
    'avg_photo_kb', round(coalesce(avg(kb) filter (where has_photo), 0), 1),
    'avg_nophoto_kb', round(coalesce(avg(kb) filter (where not has_photo), 0), 1),
    'devices', count(distinct device),
    'dev_over_20', (select count(*) from (select device from mc2_cards group by device having count(*) > 20) z))
  into r from mc2_cards_adm;
  return r;
end $$;
revoke all on function mc2_cards_kb_stats() from public, anon;
grant execute on function mc2_cards_kb_stats() to authenticated;

-- ৩) এক ডিভাইসে সর্বোচ্চ ২০ কার্ড — কোনো অবস্থাতেই নয় (একই সময়ে অনেকে সেভ করলেও)। একই ডিভাইসে যত জনই খেলুক, মোট ২০টির বেশি কার্ড ঢুকবে না।
-- আগের নিয়ম (mc2_card_save: ২০ হলে সবচেয়ে পুরোনো সুরক্ষিত-নয় কার্ড কেটে নতুনটা বসে) হুবহু আগের মতো থাকে; এটা শুধু শেষ পাহারা।
-- ২০ হয়ে গেছে + সব সুরক্ষিত (টপ ৩) থাকলে নতুন কার্ড বসে না। আগে থেকে জমা বাড়তি কার্ড এতে মোছা হয় না — অ্যাডমিন > 🪪 কার্ড > কার্ড ডিলিট থেকে "এক ডিভাইসে কার্ড ২১ থেকে" ফিল্টারে হাতে মুছুন।
create or replace function mc2_cards_cap_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('mc2_cards_dev:' || new.device));
  if exists (select 1 from mc2_cards where device = new.device and lower(name) = lower(new.name)) then return new; end if; -- একই (ডিভাইস+নাম) হলে আপডেট; নতুন কার্ড নয়
  if (select count(*) from mc2_cards where device = new.device) >= least(20, coalesce(mc2_lim('card_per_dev'), 20)) then
    raise exception 'card cap: one device can keep at most 20 cards';
  end if;
  return new;
end $$;
drop trigger if exists mc2_cards_cap on mc2_cards;
create trigger mc2_cards_cap before insert on mc2_cards for each row execute function mc2_cards_cap_guard();

notify pgrst, 'reload schema';

-- নাম-চেক: সব সারিতে ok = true এলে ঠিক
select 'ভিউ mc2_cards_adm' as item, exists (select 1 from pg_views where viewname = 'mc2_cards_adm') as ok
union all select 'মিটার mc2_cards_kb_stats', exists (select 1 from pg_proc where proname = 'mc2_cards_kb_stats')
union all select 'কার্ড-সীমা ট্রিগার mc2_cards_cap', exists (select 1 from pg_trigger where tgname = 'mc2_cards_cap' and not tgisinternal);


-- ==================== 45_supabase-new-20261105.sql ====================
-- 2026-11-05: (১) আগের 20261102-এর সবকিছু (একই ব্যক্তির সর্বোচ্চ ৩ কার্ড) + (২) এক ডিভাইসে ২০টাই সুরক্ষিত হলে: নতুন স্কোর বেশি হলে সবচেয়ে কম স্কোরের কার্ড কেটে নতুনটা বসে, সমান/কম হলে বসে না।
-- RUN (মালিক নিশ্চিত করেছেন, ২০২৬-১১-০৬)
-- এটা চালালে 20261102 আলাদা করে চালাতে হয় না (এতে ওটার কাজও আছে)। চালানো থাকলেও সমস্যা নেই, ওপরে বসে যায়।
-- 20261103 আলাদাভাবে চালাতে হবে (ডিভাইস-তালিকা ও ২০-সীমার পাহারা)। শুধু mc2_card_save ফাংশন বদলায়; টেবিল/ডেটা বদলায় না।
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে Run।

create or replace function mc2_card_save(p_device text, p_name text, p_dept text, p_batch text, p_score int, p_rec jsonb, p_thumb text, p_photo text)
returns text language plpgsql security definer set search_path = public as $$
declare v record; nm text := trim(coalesce(p_name, '')); rec jsonb; old record; low record;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 or char_length(nm) not between 1 and 200 or p_score is null or p_score not between 0 and 1000 then return 'invalid'; end if;
  if p_rec is null or jsonb_typeof(p_rec) <> 'object' or octet_length(p_rec::text) > 4000 then return 'invalid'; end if;
  if p_thumb is null or char_length(p_thumb) > 160000 or p_thumb !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then return 'invalid'; end if;
  if p_photo is not null and p_photo <> '' and (char_length(p_photo) > 220000 or p_photo !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$') then return 'invalid'; end if;
  if mc2_ip() is not null and not mc2_ac_rl('card:ip:' || mc2_ip(), mc2_lim('ip_card_hr'), 3600) then return 'slow'; end if;
  select * into v from mc2_scores where device = p_device and lower(name) = lower(nm) and score = p_score order by id desc limit 1;
  if not found then return 'noscore'; end if;
  select * into old from mc2_cards where device = p_device and lower(name) = lower(nm);
  if found then
    if old.updated_at > now() - make_interval(secs => mc2_lim('card_gap_sec')) then return 'slow'; end if;
    if old.score > v.score then return 'lower'; end if;
  elsif (select count(*) from mc2_cards where device = p_device) >= mc2_lim('card_per_dev') then
    delete from mc2_cards where id = (select x.id from mc2_cards x where x.device = p_device and not x.pinned order by x.updated_at limit 1);
    if (select count(*) from mc2_cards where device = p_device) >= mc2_lim('card_per_dev') then
      -- ২০টাই সুরক্ষিত (টপ ৩): নতুন কার্ডের স্কোর ওই ডিভাইসের সবচেয়ে কম স্কোরের কার্ডের চেয়ে বেশি হলে সেটা কেটে নতুনটা বসে; সমান বা কম হলে বসে না।
      select x.id, x.score into low from mc2_cards x where x.device = p_device order by x.score asc, x.updated_at asc, x.id asc limit 1;
      if low.id is null or v.score <= low.score then return 'lower'; end if;
      delete from mc2_cards where id = low.id;
      if (select count(*) from mc2_cards where device = p_device) >= mc2_lim('card_per_dev') then return 'slow'; end if;
    end if;
  end if;
  rec := p_rec - 'device' || jsonb_build_object('name', v.name, 'dept', v.dept, 'batch', coalesce(v.batch, ''), 'score', v.score, 'pct', v.pct, 'ok', coalesce(v.ok, 0), 'total', coalesce(v.total, 0),
    'club', coalesce(v.club, ''), 'title', coalesce(v.title, ''));
  insert into mc2_cards(device, name, dept, batch, score, pct, ok, total, rec, thumb, photo)
  values (p_device, v.name, v.dept, v.batch, v.score, v.pct, v.ok, v.total, rec, p_thumb, nullif(p_photo, ''))
  on conflict (device, (lower(name))) do update set name = excluded.name, dept = excluded.dept, batch = excluded.batch, score = excluded.score, pct = excluded.pct, ok = excluded.ok, total = excluded.total,
    rec = excluded.rec, thumb = excluded.thumb, photo = excluded.photo, updated_at = now();
  -- একই ব্যক্তির কার্ড সর্বোচ্চ ৩টা। "একই ব্যক্তি" ধরতে সব কটা মিলতে হবে:
  --   (১) একই নাম  (২) একই বিভাগ  (৩) একই ব্যাচ/সেশন  (৪) একই পরিচয় (ছাত্র/ছাত্রী/স্যার/ম্যাম/ভিজিটর) — দুই কার্ডেই লেখা থাকতে হবে
  --   (৫) একই ডিভাইস, অথবা একই আইপি + একই ব্রাউজার/ফোন (user-agent)
  -- কোনো একটা তথ্য না থাকলে বা সন্দেহ থাকলে "আলাদা ব্যক্তি" ধরা হয়, তাই ভুল করে অন্যের কার্ড কাটার ঝুঁকি নেই।
  -- ৩টার বেশি হলে সবচেয়ে কম স্কোরেরটা (সমান হলে পুরোনোটা) কাটে — টপ ৩-এ ওঠা (pinned) কার্ড হলেও।
  delete from mc2_cards where id in (
    select c.id from mc2_cards c
    where lower(c.name) = lower(v.name) and c.dept = v.dept
      and coalesce(c.batch, '') = coalesce(v.batch, '')
      and coalesce(c.rec ->> 'kind', '') <> '' and (c.rec ->> 'kind') = coalesce(p_rec ->> 'kind', '')
      and (c.device = p_device
           or (v.ip is not null and v.ua is not null and exists (select 1 from mc2_scores s where s.device = c.device and s.ip is not null and s.ip::text = v.ip::text and s.ua is not null and s.ua = v.ua)))
    order by c.score desc, c.updated_at desc offset 3);
  if not exists (select 1 from mc2_cards where device = p_device and lower(name) = lower(v.name)) then return 'lower'; end if;
  if random() < 0.1 then begin perform mc2_cleanup_tick(); exception when others then null; end; end if;
  return 'ok';
end $$;

-- নাম-চেক: ok = true এলে ঠিক
select pg_get_functiondef(p.oid) like '%offset 3%' and pg_get_functiondef(p.oid) like '%low.score%' as ok from pg_proc p where p.proname = 'mc2_card_save';

-- আগে থেকে জমা বাড়তি কার্ড এতে মোছা হয় না; নিয়মটা নতুন কার্ড সেভের সময় থেকে চলে।


-- ==================== 46_supabase-new-20261108.sql ====================
-- ইউজার তথ্য ট্যাব: আরও ফিল্টার। পুরোনো mc2_admin_users যেমন ছিল তেমনই থাকে; এটা আলাদা নতুন ফাংশন। একবার চালালেই হবে।
create or replace function mc2_admin_users2(
  p_q text default '', p_status text default 'all', p_gender text default '', p_dept text default '', p_sess text default '', p_country text default '',
  p_dev text default '', p_os text default '', p_br text default '', p_phone text default '', p_score text default '', p_active text default '', p_sort text default 'new', p_from text default '', p_to text default '',
  p_limit int default 50, p_offset int default 0) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := '%' || lower(btrim(coalesce(p_q, ''))) || '%';
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  return (
    with b as (
      select p.*, mc2_uid(p.voter) uid_, mc2_online(p.last_seen, p.offline) onl, (extract(epoch from p.last_seen) * 1000)::bigint ls_,
        (select max(s.score) from mc2_scores s where s.device = p.voter) best_,
        (select substring(e.contact from '(?:\+?88)?01[3-9][0-9]{8}') from contest_entries e where e.device = p.voter and e.contact is not null order by e.id desc limit 1) phone_,
        case when coalesce(p.ua, '') = '' then '' when p.ua ~* 'iPad|Tablet' then 'tab' when p.ua ~* 'Mobi|Android|iPhone' then 'mob' else 'pc' end dk_,
        case when p.ua ~ 'Android' then 'and' when p.ua ~ 'iPhone|iPad' then 'ios' when p.ua ~ 'Windows NT' then 'win' when p.ua ~ 'Mac OS X' then 'mac' when p.ua ~ 'Linux' then 'lin' else '' end ok_,
        case when p.ua ~ 'FBAN|FBAV|FB_IAB' then 'fb' when p.ua ~ 'Messenger' then 'msg' when p.ua ~ 'Instagram' then 'ig' when p.ua ~ 'SamsungBrowser/' then 'sam' when p.ua ~ 'EdgA?/' then 'edg'
             when p.ua ~ 'OPR/' then 'opr' when p.ua ~ 'Firefox/' then 'ff' when p.ua ~ 'Chrome/' then 'chr' when p.ua ~ 'Version/[0-9.]+.*Safari' then 'saf' else 'oth' end bk_
      from mc2_presence p
    ), f as (
      select * from b where
        (q = '%%' or lower(concat_ws(' ', nick, game_name, game_dept, game_batch, chat_dept, chat_session, ip, city, region, uid_)) like q)
        and (p_status not in ('on', 'off') or (p_status = 'on') = onl)
        and (p_gender = '' or (p_gender in ('m', 'f') and gender = p_gender) or (p_gender = 'x' and coalesce(gender, '') not in ('m', 'f')))
        and (p_dept = '' or game_dept = p_dept or chat_dept = p_dept)
        and (p_sess = '' or game_batch = p_sess or chat_session = p_sess)
        and (p_country = '' or country = p_country)
        and (p_dev = '' or dk_ = p_dev) and (p_os = '' or ok_ = p_os) and (p_br = '' or bk_ = p_br)
        and (p_phone = '' or (p_phone = 'yes' and phone_ is not null) or (p_phone = 'no' and phone_ is null))
        and (p_score = '' or (p_score = 'yes' and best_ is not null) or (p_score = 'no' and best_ is null))
        and (p_active = '' or (p_active = 'today' and last_seen >= date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka')
             or (p_active = '7' and last_seen > now() - interval '7 days') or (p_active = '30' and last_seen > now() - interval '30 days')
             or (p_active = 'old' and last_seen <= now() - interval '30 days') or p_active = 'custom')
        and (p_from = '' or last_seen >= (p_from::date)::timestamp at time zone 'Asia/Dhaka')
        and (p_to = '' or last_seen < (p_to::date + 1)::timestamp at time zone 'Asia/Dhaka')
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'rows', coalesce((select jsonb_agg(to_jsonb(x) - 'rn' order by x.rn) from (
          select row_number() over (order by case when p_sort = 'score' then best_ end desc nulls last, case when p_sort = 'visits' then visits end desc nulls last,
                   case when p_sort = 'old' then last_seen end asc, last_seen desc) rn,
            voter, uid_ uid, nick, game_name gname, game_dept gdept, game_batch gbatch, chat_dept cdept, chat_session csess, page, ip, country, region, city, left(ua, 200) ua, visits, gender, info,
            phone_ phone, ls_ ls, onl online, best_ best
          from f) x where x.rn > greatest(p_offset, 0) and x.rn <= greatest(p_offset, 0) + least(greatest(p_limit, 1), 100)), '[]'::jsonb),
      'depts', coalesce((select jsonb_agg(v order by v) from (select game_dept v from b union select chat_dept from b) z where v is not null and btrim(v) <> ''), '[]'::jsonb),
      'sessions', coalesce((select jsonb_agg(v order by v) from (select game_batch v from b union select chat_session from b) z where v is not null and btrim(v) <> ''), '[]'::jsonb),
      'countries', coalesce((select jsonb_agg(v order by v) from (select distinct country v from b) z where v ~ '^[A-Z]{2}$' and v not in ('XX', 'T1')), '[]'::jsonb)));
end $$;
revoke all on function mc2_admin_users2(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, int, int) from public, anon;
grant execute on function mc2_admin_users2(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, int, int) to authenticated;
notify pgrst, 'reload schema';

-- চেক: ok = true এলে ঠিক
select 'ইউজার তথ্য নতুন ফিল্টার ফাংশন' as item, to_regprocedure('mc2_admin_users2(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,int,int)') is not null as ok;


-- ==================== 47_supabase-new-20261109.sql ====================
-- ইউজার তথ্য ট্যাব: বাছাই করা ইউজারদের ডেটা মোছা (সুরক্ষিত সংস্করণ, ২০২৬-১১-১১)। একবার চালালেই হবে; আবার চালালেও ক্ষতি নেই।
-- p_voters = ডিভাইস আইডির তালিকা (একবারে সর্বোচ্চ ৫০০); p_what = কোন কোন ডেটা মুছবে:
--   scores (লিডারবোর্ড স্কোর), cards (কার্ড + টপ হিস্টরি), entries (কনটেস্ট এন্ট্রি), answers (উত্তর),
--   chat (চ্যাট বার্তা, রিঅ্যাকশন, সিন, উপস্থিতি), mod (মডারেশন: ওয়ার্নিং/ব্যান/রিপোর্ট), visitor (Visitor List-এর রেকর্ড)
-- p_dry = true দিলে কিছু মোছে না, শুধু কতগুলো মুছবে তার সংখ্যা দেয় (সুরক্ষা হিসাব করে — প্রিভিউ আর আসল মোছার সংখ্যা মিলবে)।
--
-- এই সংস্করণে যা ঠিক/নতুন:
--   ১) সব একসাথে, নয়তো কিছুই নয়: কার্ড মুছলে ওই কার্ডওয়ালা ডিভাইসের স্কোর, ভিজিটর রেকর্ড, কনটেস্ট এন্ট্রি, উত্তর ও টপ হিস্টরি
--      একই ধাপে নিজে থেকে যায় (টিক দিলেও না দিলেও)। পুরোটা এক ট্রানজ্যাকশন — কোথাও এরর হলে কিছুই মোছে না।
--      কার্ড না মুছলে ওই চারটি ডেটা ১১১০-এর ট্রিগারে সুরক্ষিত থাকে। চ্যাট ও মডারেশন কার্ডের সাথে যায় না (শুধু টিক দিলে যায়)।
--   ২) প্রিভিউ (p_dry) সঠিক: কার্ড মোছা না হলে, কার্ডওয়ালা ডিভাইসের সারি গোনা হয় না (কারণ ওগুলো আসলেই মুছবে না)।
--   ৩) entry_flags শুধু তাদেরই মোছে যাদের এন্ট্রি সত্যিই মুছছে।
--   ৪) কার্ড-সুরক্ষা (সাইট খালি হওয়া ঠেকাতে) — নিচের সীমা পেরোলে এরর দিয়ে থামে, কিছুই মোছে না:
--        • p_unlock_cards = true না দিলে কার্ড মোছা যায় না (আগের মতোই)।
--        • সব কার্ড একসাথে মোছা যায় না — অন্তত ১টি কার্ড থেকে যেতেই হবে।
--        • একবারে (এক কলে) সর্বোচ্চ ৫০টি কার্ড; আর একদিনে (বাংলাদেশ সময়) মোট সর্বোচ্চ ১০০টি কার্ড।
--        • কার্ড মুছতে ঠিক হওয়া ডিভাইসের সংখ্যা মোট কার্ডের অর্ধেকের বেশি হলে থামে (অন্তত ২টি কার্ড থাকলে)।
--        • বাছা ইউজারেরা মিলে Visitor List-এর সব ইউজার হলে থামে (পুরো তালিকা খালি করা যায় না)।
--      সীমা বদলাতে চাইলে নিচের declare-এর c_call, c_day, c_pct পরিবর্তন করুন।
--   ৫) ডিলিট-লগ টেবিল mc2_del_log (দিনপ্রতি কতগুলো কার্ড মোছা হলো) — শুধু এই ফাংশন ব্যবহার করে, বাইরে থেকে পড়া/লেখা যায় না।
create table if not exists mc2_del_log (day date primary key, cards int not null default 0);
alter table mc2_del_log enable row level security;
revoke all on mc2_del_log from public, anon, authenticated;

drop function if exists mc2_admin_users_del(text[], text[], boolean);
create or replace function mc2_admin_users_del(p_voters text[], p_what text[], p_dry boolean default false, p_unlock_cards boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c_call constant int := 50;      -- এক কলে সর্বোচ্চ কার্ড
  c_day  constant int := 100;     -- একদিনে সর্বোচ্চ কার্ড
  c_pct  constant int := 50;      -- মোট কার্ডের সর্বোচ্চ শতাংশ (এক কলে)
  v text[]; w text[] := coalesce(p_what, '{}'); n int; m int; r jsonb := '{}'::jsonb;
  ex text[] := '{}';              -- প্রিভিউ-গণনা থেকে বাদ: কার্ড না মুছলে সুরক্ষিত ডিভাইস; কার্ড মুছলে কার্ডওয়ালা ডিভাইস (ওগুলো আলাদা গোনা)
  cd text[] := '{}';              -- যে কার্ডওয়ালা ডিভাইসের কার্ড মোছা হচ্ছে
  tc int; nc int; tp int; sp int; today date := (now() at time zone 'Asia/Dhaka')::date; spent int; kk int;
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  select coalesce(array_agg(distinct left(x, 80)), '{}') into v from unnest(coalesce(p_voters, '{}')) x where btrim(coalesce(x, '')) <> '';
  if cardinality(v) = 0 then return r; end if;
  if cardinality(v) > 500 then raise exception 'একবারে ৫০০ জনের বেশি নয়'; end if;

  -- সাইট খালি হওয়া ঠেকানো: বাছা ইউজারেরা মিলে পুরো Visitor List হলে থামে
  select count(*) into tp from mc2_presence;
  select count(*) into sp from mc2_presence where voter = any(v);
  if tp > 0 and sp >= tp then raise exception 'সব ইউজার একসাথে মোছা যাবে না — অন্তত একজন বাদ রাখুন (সুরক্ষা)'; end if;

  select count(*) into tc from mc2_cards;
  select count(*) into nc from mc2_cards where device = any(v);

  if 'cards' = any(w) then
    if not p_dry and not coalesce(p_unlock_cards, false) then raise exception 'কার্ড লক করা আছে — আনলক করে মুছুন'; end if;
    if nc > 0 then
      if nc >= tc then raise exception 'সব কার্ড মোছা যাবে না — অন্তত একটি কার্ড থাকতে হবে (সুরক্ষা)'; end if;
      if nc > c_call then raise exception 'একবারে % টির বেশি কার্ড মোছা যাবে না (বাছা: %)। কম জন বেছে আবার চেষ্টা করুন', c_call, nc; end if;
      if tc >= 2 and nc * 100 > tc * c_pct then raise exception 'মোট কার্ডের % শতাংশের বেশি একসাথে মোছা যাবে না (বাছা: % / %)', c_pct, nc, tc; end if;
      select coalesce((select cards from mc2_del_log where day = today), 0) into spent;
      if spent + nc > c_day then raise exception 'আজ আর % টির বেশি কার্ড মোছা যাবে না (আজ মোছা হয়েছে: %, এখন বাছা: %)। কাল আবার চেষ্টা করুন', c_day, spent, nc; end if;
    end if;
    select coalesce(array_agg(distinct device), '{}') into cd from mc2_cards where device = any(v);
    ex := cd;
  else
    -- কার্ড মোছা হচ্ছে না: কার্ডওয়ালা ডিভাইসগুলো ট্রিগারে সুরক্ষিত, তাই প্রিভিউ-সংখ্যা থেকে বাদ
    select coalesce(array_agg(distinct device), '{}') into ex from mc2_cards where device = any(v);
  end if;

  -- ১) কার্ড + কার্ডের সংশ্লিষ্ট সব একসাথে — সবার আগে (এই ফাংশন ১১১০ চালানো থাকলে পূর্ণ কাজ করে; ১১১০ আগে/একসাথে চালান)
  if 'cards' = any(w) then
    -- সংখ্যা আগে গুনি (কার্ড মুছলে ১১১০-এর ট্রিগার বাকিগুলো নিজেই মোছে — সব একই ট্রানজ্যাকশনে)
    select count(*) into kk from mc2_scores where device = any(cd); r := r || jsonb_build_object('scores', kk);
    select count(*) into kk from contest_entries where device = any(cd); r := r || jsonb_build_object('entries', kk);
    select count(*) into kk from mc2_answers where device = any(cd); r := r || jsonb_build_object('answers', kk);
    select count(*) into kk from mc2_presence where voter = any(cd); r := r || jsonb_build_object('visitor', kk);
    if p_dry then
      n := nc;
    else
      delete from mc2_cards where device = any(v); get diagnostics n = row_count;
      if n > 0 then
        insert into mc2_del_log(day, cards) values (today, n) on conflict (day) do update set cards = mc2_del_log.cards + excluded.cards;
      end if;
      -- ১১১০-এর t_mc2_cards_cascade ট্রিগার এখানেই স্কোর/এন্ট্রি/উত্তর/ভিজিটর/টপ হিস্টরি মুছে ফেলেছে
      -- (১১১০ না চালানো থাকলেও যেন কাজ করে — নিচেরগুলো তখন নিজেই মোছে; চালানো থাকলে ০টি সারি মোছে, ক্ষতি নেই)
      delete from mc2_top_hist where device = any(v);
      delete from mc2_entry_flags where k in (select 'e' || id::text from contest_entries where device = any(cd)) or k in (select id::text from contest_entries where device = any(cd));
      delete from contest_entries where device = any(cd);
      delete from mc2_answers where device = any(cd);
      delete from mc2_scores where device = any(cd);
      delete from mc2_presence where voter = any(cd);
    end if;
    r := r || jsonb_build_object('cards', n);
  end if;

  if 'scores' = any(w) then
    if p_dry then select count(*) into n from mc2_scores where device = any(v) and not (device = any(ex));
    else delete from mc2_scores where device = any(v); get diagnostics n = row_count; end if;
    r := r || jsonb_build_object('scores', coalesce((r ->> 'scores')::int, 0) + n);
  end if;

  if 'entries' = any(w) then
    if p_dry then select count(*) into n from contest_entries where device = any(v) and not (device = any(ex));
    else
      delete from mc2_entry_flags where k in (select 'e' || id::text from contest_entries where device = any(v) and not (device = any(ex)))
                                     or k in (select id::text from contest_entries where device = any(v) and not (device = any(ex)));
      delete from contest_entries where device = any(v); get diagnostics n = row_count;
    end if;
    r := r || jsonb_build_object('entries', coalesce((r ->> 'entries')::int, 0) + n);
  end if;

  if 'answers' = any(w) then
    if p_dry then select count(*) into n from mc2_answers where device = any(v) and not (device = any(ex));
    else delete from mc2_answers where device = any(v); get diagnostics n = row_count; end if;
    r := r || jsonb_build_object('answers', coalesce((r ->> 'answers')::int, 0) + n);
  end if;

  if 'chat' = any(w) then
    if p_dry then select count(*) into n from mc2_ac_messages where voter = any(v);
    else
      delete from mc2_ac_reactions where voter = any(v);
      delete from mc2_ac_seen where voter = any(v);
      delete from mc2_ac_here where voter = any(v);
      delete from mc2_ac_events where voter = any(v);
      delete from mc2_ac_messages where voter = any(v); get diagnostics n = row_count;
    end if;
    r := r || jsonb_build_object('chat', n);
  end if;

  if 'mod' = any(w) then
    if p_dry then select count(*) into n from mc2_ac_mod where voter = any(v); select count(*) into m from mc2_ac_warns where voter = any(v); n := n + m;
    else
      delete from mc2_ac_modlog where voter = any(v);
      delete from mc2_ac_reports where target = any(v) or reporter = any(v);
      delete from mc2_ac_warns where voter = any(v); get diagnostics m = row_count;
      delete from mc2_ac_mod where voter = any(v); get diagnostics n = row_count; n := n + m;
    end if;
    r := r || jsonb_build_object('mod', n);
  end if;

  -- সবশেষে (বাকি সব মোছার পর) ভিজিটর রেকর্ড। ইউজার আবার সাইটে ঢুকলে নতুন করে তালিকায় আসবে।
  if 'visitor' = any(w) then
    if p_dry then select count(*) into n from mc2_presence where voter = any(v) and not (voter = any(ex));
    else delete from mc2_presence where voter = any(v); get diagnostics n = row_count; end if;
    r := r || jsonb_build_object('visitor', coalesce((r ->> 'visitor')::int, 0) + n);
  end if;
  return r;
end $$;
revoke all on function mc2_admin_users_del(text[], text[], boolean, boolean) from public, anon;
grant execute on function mc2_admin_users_del(text[], text[], boolean, boolean) to authenticated;
notify pgrst, 'reload schema';

select 'ইউজার মোছার ফাংশন (সুরক্ষিত)' as item, to_regprocedure('mc2_admin_users_del(text[],text[],boolean,boolean)') is not null as ok
union all
select 'ডিলিট-লগ টেবিল', to_regclass('mc2_del_log') is not null;


-- ==================== 48_supabase-new-20261110.sql ====================
-- কার্ড-সুরক্ষা: কোনো ডিভাইসের কার্ড (mc2_cards) থাকলে ওই ডিভাইসের এই ডেটার DELETE বন্ধ থাকবে:
--   স্কোর (mc2_scores), ভিজিটর রেকর্ড (mc2_presence), কনটেস্ট এন্ট্রি (contest_entries), উত্তর (mc2_answers)
-- সুরক্ষার বাইরে (আগের মতোই মোছা যাবে): চ্যাট (mc2_ac_messages ইত্যাদি) ও মডারেশন (mc2_ac_mod, warns, modlog, reports)।
-- নতুন (সব একসাথে, নয়তো কিছুই নয়): কোনো ডিভাইসের শেষ কার্ডটি মুছে গেলে (যে পথেই হোক: ইউজার মোছা, কার্ড ট্যাবের ডিলিট, অটো-ক্লিনআপ)
--   ওই ডিভাইসের স্কোর, ভিজিটর রেকর্ড, কনটেস্ট এন্ট্রি, উত্তর ও টপ হিস্টরি একই ট্রানজ্যাকশনে নিজে থেকে মোছে। কোথাও এরর হলে কিছুই মোছে না।
--   ডিভাইসের আরও কার্ড থাকলে (একজনের একাধিক কার্ড থাকতে পারে) কিছুই মোছে না। চ্যাট ও মডারেশনে হাত দেয় না।
--
-- আচরণ: সুরক্ষিত সারিটি চুপচাপ বাদ পড়ে (মোছা হয় না), বাকি সারি যথারীতি মোছা হয়।
--   তাই "ইউজার মোছা", অটো-ক্লিনআপ বা অ্যাডমিনের স্কোর মোছা — কোনোটাই মাঝপথে ভেঙে পড়বে না;
--   শুধু কার্ডওয়ালা ডিভাইসের সারিগুলো থেকে যাবে এবং মোছার গণনায় ওগুলো ধরা হবে না।
-- একবার চালালেই হবে; আবার চালালেও ক্ষতি নেই।

create or replace function mc2_protect_card_del() returns trigger language plpgsql security definer set search_path = public as $$
declare d text;
begin
  -- TG_ARGV[0] = ওই টেবিলে ডিভাইস আইডির কলামের নাম (mc2_presence-এ voter, বাকিগুলোতে device)
  d := to_jsonb(old) ->> TG_ARGV[0];
  if d is not null and exists (select 1 from mc2_cards c where c.device = d) then
    return null;   -- কার্ড আছে: এই সারি মোছা হবে না
  end if;
  return old;
end $$;
revoke all on function mc2_protect_card_del() from public, anon, authenticated;

drop trigger if exists t_mc2_scores_cardlock on mc2_scores;
create trigger t_mc2_scores_cardlock before delete on mc2_scores for each row execute function mc2_protect_card_del('device');

drop trigger if exists t_mc2_presence_cardlock on mc2_presence;
create trigger t_mc2_presence_cardlock before delete on mc2_presence for each row execute function mc2_protect_card_del('voter');

drop trigger if exists t_contest_entries_cardlock on contest_entries;
create trigger t_contest_entries_cardlock before delete on contest_entries for each row execute function mc2_protect_card_del('device');

drop trigger if exists t_mc2_answers_cardlock on mc2_answers;
create trigger t_mc2_answers_cardlock before delete on mc2_answers for each row execute function mc2_protect_card_del('device');

create or replace function mc2_cards_cascade() returns trigger language plpgsql security definer set search_path = public as $$
declare ds text[];
begin
  -- যেসব ডিভাইসের এই স্টেটমেন্টে কার্ড মুছেছে এবং আর একটাও কার্ড বাকি নেই
  select coalesce(array_agg(distinct o.device), '{}') into ds from old_rows o where not exists (select 1 from mc2_cards c where c.device = o.device);
  if cardinality(ds) = 0 then return null; end if;
  delete from mc2_top_hist where device = any(ds);
  delete from mc2_entry_flags where k in (select 'e' || id::text from contest_entries where device = any(ds)) or k in (select id::text from contest_entries where device = any(ds));
  delete from contest_entries where device = any(ds);
  delete from mc2_answers where device = any(ds);
  delete from mc2_scores where device = any(ds);
  delete from mc2_presence where voter = any(ds);
  return null;
end $$;
revoke all on function mc2_cards_cascade() from public, anon, authenticated;
drop trigger if exists t_mc2_cards_cascade on mc2_cards;
create trigger t_mc2_cards_cascade after delete on mc2_cards referencing old table as old_rows for each statement execute function mc2_cards_cascade();

notify pgrst, 'reload schema';

-- যাচাই: পাঁচটিই true হলে ঠিক আছে
select tgrelid::regclass::text as table_name, tgname as trigger_name, tgenabled <> 'D' as ok
from pg_trigger
where tgname in ('t_mc2_scores_cardlock', 't_mc2_presence_cardlock', 't_contest_entries_cardlock', 't_mc2_answers_cardlock', 't_mc2_cards_cascade')
order by 1;


-- ==================== 49_supabase-new-20261111.sql ====================
-- কার্ডওয়ালা ইউজার সব তালিকায় সবসময় দেখানো:
--   লিডারবোর্ড (পাবলিক + অ্যাডমিন "ফলাফল"), সেরা ৩ কার্ড, অ্যাডমিন লিডারবোর্ড তালিকা, অ্যাডমিন ইউজার/ভিজিটর তালিকা।
-- স্কোর (mc2_scores) বা ভিজিটর রেকর্ড (mc2_presence) না থাকলে কার্ডের rec থেকে নাম ও মার্ক নিয়ে দেখানো হয়।
-- নিয়ম:
--   • কার্ড আছে অথচ ওই ডিভাইসের একই নামে কোনো স্কোর-সারি নেই  →  কার্ডের নাম/মার্ক দিয়ে একটি সারি যোগ হয়।
--   • স্কোর-সারি আছে কিন্তু অ্যাডমিন লুকিয়ে (hide) রেখেছেন → লুকানোই থাকে (হাইড ফিচার অক্ষুণ্ণ)।
--   • কার্ড থেকে আসা সারির id ঋণাত্মক (-কার্ড id); তাই ওই সারিতে এডিট/হাইড/ডিলিট কিছু করবে না (আসল স্কোর-সারি নেই)।
--   • আগের ফাংশনগুলোর সর্বশেষ সংস্করণ থেকে শুধু কার্ড-সারি যোগ করা হয়েছে; বাকি সব আগের মতোই।
-- আগে চালানো থাকতে হবে: supabase-new-20261024.sql (জেন্ডার কলাম), supabase-new-20261108.sql (ইউজার ফিল্টার)।
-- একবার চালালেই হবে; আবার চালালেও ক্ষতি নেই।

-- ===== ১) সহায়ক: প্রতিটি কার্ডের নাম/মার্ক (rec থেকে; না পেলে কার্ডের কলাম) =====
create or replace function mc2_card_rows() returns table(cid bigint, device text, name text, dept text, batch text, score int, ok int, total int, pct int, gender text, cat timestamptz, has_score boolean, has_photo boolean, photo_show boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.device,
    coalesce(nullif(btrim(c.rec ->> 'name'), ''), c.name),
    coalesce(nullif(btrim(c.rec ->> 'dept'), ''), c.dept),
    nullif(coalesce(nullif(btrim(c.rec ->> 'batch'), ''), c.batch, ''), ''),
    case when c.rec ->> 'score' ~ '^[0-9]{1,4}$' then (c.rec ->> 'score')::int else c.score end,
    case when c.rec ->> 'ok' ~ '^[0-9]{1,4}$' then (c.rec ->> 'ok')::int else c.ok end,
    case when c.rec ->> 'total' ~ '^[0-9]{1,4}$' then (c.rec ->> 'total')::int else c.total end,
    case when c.rec ->> 'pct' ~ '^[0-9]{1,3}$' then (c.rec ->> 'pct')::int else c.pct end,
    c.gender, c.updated_at,
    exists (select 1 from mc2_scores s where s.device = c.device and lower(s.name) = lower(c.name)),
    c.photo is not null, c.show
  from mc2_cards c
$$;
revoke all on function mc2_card_rows() from public, anon, authenticated;

-- ===== ২) সহায়ক: ভিজিটর তালিকার জন্য উপস্থিতি + (উপস্থিতি না থাকলে) কার্ডওয়ালা ডিভাইস =====
create or replace function mc2_presence_plus() returns table(voter text, nick text, game_name text, game_dept text, game_batch text, chat_dept text, chat_session text, page text, ip text, country text, region text, city text, ua text, info jsonb, last_seen timestamptz, visits int, offline boolean, gender text, card_best int)
language sql stable security definer set search_path = public as $$
  select p.voter, p.nick, coalesce(p.game_name, k.name), coalesce(p.game_dept, k.dept), coalesce(p.game_batch, k.batch), p.chat_dept, p.chat_session, p.page, p.ip, p.country, p.region, p.city, p.ua, p.info,
    p.last_seen, p.visits, p.offline, coalesce(p.gender, k.gender), k.score
  from mc2_presence p
  left join lateral (select x.name, x.dept, x.batch, x.score, x.gender from mc2_card_rows() x where x.device = p.voter order by x.score desc, x.cid limit 1) k on true
  union all
  select k.device, null::text, k.name, k.dept, k.batch, null::text, null::text, null::text, null::text, null::text, null::text, null::text, null::text, null::jsonb,
    k.cat, 0, true, k.gender, k.score
  from (select distinct on (x.device) x.* from mc2_card_rows() x order by x.device, x.score desc, x.cid) k
  where not exists (select 1 from mc2_presence p where p.voter = k.device)
$$;
revoke all on function mc2_presence_plus() from public, anon, authenticated;

-- ===== ৩) পাবলিক লিডারবোর্ড (এবং অ্যাডমিনের "ফলাফল" ট্যাব) =====
create or replace function mc2_board(p_dept text default null, p_batch text default null, p_from timestamptz default null, p_to timestamptz default null, p_q text default null, p_mode text default 'best', p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare lim int := least(greatest(coalesce(p_limit, 50), 1), 500); ofs int := greatest(coalesce(p_offset, 0), 0);
  q text := nullif(left(trim(coalesce(p_q, '')), 40), ''); ip text := mc2_ip(); res jsonb;
begin
  if coalesce((select (value ->> 'board_on')::boolean from mc2_settings where key = 'board_cfg'), true) = false then return jsonb_build_object('total', 0, 'rows', '[]'::jsonb, 'depts', '[]'::jsonb, 'batches', '[]'::jsonb); end if;
  if ip is not null and not mc2_ac_rl('board:ip:' || ip || ':m', mc2_lim('ip_view_min'), 60) then return jsonb_build_object('err', 'slow'); end if;
  if q is not null then q := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_'); end if;
  with src as (
    select s.id, s.name, s.dept, s.batch, s.score, s.ok, s.total, s.pct, s.created_at from mc2_scores s where not coalesce(s.hidden, false)
    union all
    select -k.cid, k.name, k.dept, k.batch, k.score, k.ok, k.total, k.pct, k.cat from mc2_card_rows() k where not k.has_score
  ), base as (
    select src.*, row_number() over (partition by lower(src.name), src.dept, coalesce(src.batch, '') order by src.score desc, src.created_at) as rn
    from src
    where (nullif(p_dept, '') is null or src.dept = p_dept) and (nullif(p_batch, '') is null or src.batch = p_batch)
      and (p_from is null or src.created_at >= p_from) and (p_to is null or src.created_at < p_to)
      and (q is null or src.name ilike '%' || q || '%')
  ), pick as (select * from base where p_mode = 'all' or rn = 1),
  ranked as (select pick.*, rank() over (order by score desc) as rk, count(*) over () as total_n from pick),
  page as (select * from ranked order by rk, created_at, id offset ofs limit lim)
  select jsonb_build_object('total', coalesce((select max(total_n) from page), 0),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'rk', rk, 'name', name, 'dept', dept, 'batch', batch, 'score', score,
        'ok', coalesce(ok, 0), 'wrong', greatest(coalesce(total, 0) - coalesce(ok, 0), 0), 'total', coalesce(total, 0), 'pct', pct,
        'ts', (extract(epoch from created_at) * 1000)::bigint) order by rk, created_at, id) from page), '[]'::jsonb)) into res;
  return res || jsonb_build_object('depts', coalesce((select jsonb_agg(z.d order by z.d) from (select dept as d from mc2_scores union select dept from mc2_card_rows() where not has_score) z), '[]'::jsonb),
                                   'batches', coalesce((select jsonb_agg(z.b order by z.b) from (select batch as b from mc2_scores union select batch from mc2_card_rows() where not has_score) z where z.b is not null and z.b <> ''), '[]'::jsonb));
end $$;

-- ===== ৪) সেরা ৩ (পাবলিক) =====
create or replace function mc2_top_cards(p_dept text default null, p_batch text default null, p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ip text := mc2_ip(); res jsonb;
begin
  if coalesce((select (value ->> 'board_on')::boolean from mc2_settings where key = 'board_cfg'), true) = false then return jsonb_build_object('rows', '[]'::jsonb); end if;
  if ip is not null and not mc2_ac_rl('topc:ip:' || ip || ':m', mc2_lim('ip_view_min'), 60) then return jsonb_build_object('err', 'slow'); end if;
  with src as (
    select s.id, s.name, s.dept, s.batch, s.score, s.ok, s.total, s.pct, s.created_at, s.device, null::bigint as cid from mc2_scores s where not coalesce(s.hidden, false)
    union all
    select -k.cid, k.name, k.dept, k.batch, k.score, k.ok, k.total, k.pct, k.cat, k.device, k.cid from mc2_card_rows() k where not k.has_score
  ), base as (
    select src.*, row_number() over (partition by lower(src.name), src.dept, coalesce(src.batch, '') order by src.score desc, src.created_at) as rn
    from src
    where (nullif(p_dept, '') is null or src.dept = p_dept) and (nullif(p_batch, '') is null or src.batch = p_batch)
      and (p_from is null or src.created_at >= p_from) and (p_to is null or src.created_at < p_to)
  ), pick as (select base.*, rank() over (order by score desc) as rk from base where rn = 1),
  top as (select * from pick order by rk, created_at, id limit 3)
  select coalesce(jsonb_agg(jsonb_build_object('rk', t.rk, 'name', t.name, 'dept', t.dept, 'batch', t.batch, 'score', t.score, 'ok', coalesce(t.ok, 0), 'total', coalesce(t.total, 0), 'pct', t.pct,
    'ts', (extract(epoch from t.created_at) * 1000)::bigint, 'rec', c.rec, 'photo', case when c.show then c.photo end) order by t.rk, t.created_at, t.id), '[]'::jsonb) into res
  from top t left join lateral (select x.rec, x.photo, x.show from mc2_cards x
    where (t.cid is not null and x.id = t.cid) or (t.cid is null and x.device = t.device and lower(x.name) = lower(t.name)) order by x.score desc limit 1) c on true;
  return jsonb_build_object('rows', res);
end $$;

-- ===== ৫) অ্যাডমিন: লিডারবোর্ড এন্ট্রি তালিকা =====
create or replace function mc2_board_admin_list(p_q text default null, p_dept text default null, p_batch text default null, p_state text default 'all', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(left(trim(coalesce(p_q, '')), 40), ''); lim int := least(greatest(coalesce(p_limit, 50), 1), 200); res jsonb; tot int;
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  if q is not null then q := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_'); end if;
  with u as (
    select s.id, s.name, s.dept, s.batch, s.score as sc, s.ok, s.total, s.hidden, (extract(epoch from s.created_at) * 1000)::bigint as ts,
      exists (select 1 from mc2_cards c where c.device = s.device and lower(c.name) = lower(s.name)) as has_card,
      coalesce((select bool_or(c.photo is not null) from mc2_cards c where c.device = s.device and lower(c.name) = lower(s.name)), false) as has_photo,
      coalesce((select bool_and(c.show) from mc2_cards c where c.device = s.device and lower(c.name) = lower(s.name)), true) as photo_show
    from mc2_scores s
    union all
    select -k.cid, k.name, k.dept, k.batch, k.score, k.ok, k.total, false, (extract(epoch from k.cat) * 1000)::bigint, true, k.has_photo, coalesce(k.photo_show, true)
    from mc2_card_rows() k where not k.has_score
  ), f as (
    select * from u where (q is null or u.name ilike '%' || q || '%') and (nullif(p_dept, '') is null or u.dept = p_dept) and (nullif(p_batch, '') is null or u.batch = p_batch)
      and (p_state = 'all' or (p_state = 'hidden' and u.hidden) or (p_state = 'shown' and not u.hidden))
  )
  select (select count(*) from f), coalesce((select jsonb_agg(r order by r.sc desc, r.id) from (select * from f order by sc desc, id offset greatest(coalesce(p_offset, 0), 0) limit lim) r), '[]'::jsonb) into tot, res;
  return jsonb_build_object('total', tot, 'rows', res);
end $$;

-- ===== ৬) অ্যাডমিন: ইউজার/ভিজিটর তালিকা (পুরোনো ও নতুন ফিল্টারসহ ফাংশন) =====
create or replace function mc2_admin_users(p_q text default '', p_online boolean default false, p_limit int default 50, p_offset int default 0) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := '%' || lower(btrim(coalesce(p_q, ''))) || '%'; t int; r jsonb;
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  select count(*) into t from mc2_presence_plus() p where (not p_online or mc2_online(p.last_seen, p.offline))
    and (q = '%%' or lower(concat_ws(' ', p.nick, p.game_name, p.game_dept, p.game_batch, p.chat_dept, p.chat_session, p.ip, p.city, p.region, mc2_uid(p.voter))) like q);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.ls desc), '[]'::jsonb) into r from (
    select p.voter, mc2_uid(p.voter) uid, p.nick, p.game_name gname, p.game_dept gdept, p.game_batch gbatch, p.chat_dept cdept, p.chat_session csess, p.page, p.ip, p.country, p.region, p.city, left(p.ua, 200) ua, p.visits, p.gender, p.info,
      (select substring(e.contact from '(?:\+?88)?01[3-9][0-9]{8}') from contest_entries e where e.device = p.voter and e.contact is not null order by e.id desc limit 1) phone,
      (extract(epoch from p.last_seen) * 1000)::bigint ls, mc2_online(p.last_seen, p.offline) online, coalesce((select max(s.score) from mc2_scores s where s.device = p.voter), p.card_best) best
    from mc2_presence_plus() p where (not p_online or mc2_online(p.last_seen, p.offline))
      and (q = '%%' or lower(concat_ws(' ', p.nick, p.game_name, p.game_dept, p.game_batch, p.chat_dept, p.chat_session, p.ip, p.city, p.region, mc2_uid(p.voter))) like q)
    order by p.last_seen desc limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)) x;
  return jsonb_build_object('total', t, 'rows', r);
end $$;

create or replace function mc2_admin_users2(
  p_q text default '', p_status text default 'all', p_gender text default '', p_dept text default '', p_sess text default '', p_country text default '',
  p_dev text default '', p_os text default '', p_br text default '', p_phone text default '', p_score text default '', p_active text default '', p_sort text default 'new', p_from text default '', p_to text default '',
  p_limit int default 50, p_offset int default 0) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := '%' || lower(btrim(coalesce(p_q, ''))) || '%';
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  return (
    with b as (
      select p.*, mc2_uid(p.voter) uid_, mc2_online(p.last_seen, p.offline) onl, (extract(epoch from p.last_seen) * 1000)::bigint ls_,
        coalesce((select max(s.score) from mc2_scores s where s.device = p.voter), p.card_best) best_,
        (select substring(e.contact from '(?:\+?88)?01[3-9][0-9]{8}') from contest_entries e where e.device = p.voter and e.contact is not null order by e.id desc limit 1) phone_,
        case when coalesce(p.ua, '') = '' then '' when p.ua ~* 'iPad|Tablet' then 'tab' when p.ua ~* 'Mobi|Android|iPhone' then 'mob' else 'pc' end dk_,
        case when p.ua ~ 'Android' then 'and' when p.ua ~ 'iPhone|iPad' then 'ios' when p.ua ~ 'Windows NT' then 'win' when p.ua ~ 'Mac OS X' then 'mac' when p.ua ~ 'Linux' then 'lin' else '' end ok_,
        case when p.ua ~ 'FBAN|FBAV|FB_IAB' then 'fb' when p.ua ~ 'Messenger' then 'msg' when p.ua ~ 'Instagram' then 'ig' when p.ua ~ 'SamsungBrowser/' then 'sam' when p.ua ~ 'EdgA?/' then 'edg'
             when p.ua ~ 'OPR/' then 'opr' when p.ua ~ 'Firefox/' then 'ff' when p.ua ~ 'Chrome/' then 'chr' when p.ua ~ 'Version/[0-9.]+.*Safari' then 'saf' else 'oth' end bk_
      from mc2_presence_plus() p
    ), f as (
      select * from b where
        (q = '%%' or lower(concat_ws(' ', nick, game_name, game_dept, game_batch, chat_dept, chat_session, ip, city, region, uid_)) like q)
        and (p_status not in ('on', 'off') or (p_status = 'on') = onl)
        and (p_gender = '' or (p_gender in ('m', 'f') and gender = p_gender) or (p_gender = 'x' and coalesce(gender, '') not in ('m', 'f')))
        and (p_dept = '' or game_dept = p_dept or chat_dept = p_dept)
        and (p_sess = '' or game_batch = p_sess or chat_session = p_sess)
        and (p_country = '' or country = p_country)
        and (p_dev = '' or dk_ = p_dev) and (p_os = '' or ok_ = p_os) and (p_br = '' or bk_ = p_br)
        and (p_phone = '' or (p_phone = 'yes' and phone_ is not null) or (p_phone = 'no' and phone_ is null))
        and (p_score = '' or (p_score = 'yes' and best_ is not null) or (p_score = 'no' and best_ is null))
        and (p_active = '' or (p_active = 'today' and last_seen >= date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka')
             or (p_active = '7' and last_seen > now() - interval '7 days') or (p_active = '30' and last_seen > now() - interval '30 days')
             or (p_active = 'old' and last_seen <= now() - interval '30 days') or p_active = 'custom')
        and (p_from = '' or last_seen >= (p_from::date)::timestamp at time zone 'Asia/Dhaka')
        and (p_to = '' or last_seen < (p_to::date + 1)::timestamp at time zone 'Asia/Dhaka')
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'rows', coalesce((select jsonb_agg(to_jsonb(x) - 'rn' order by x.rn) from (
          select row_number() over (order by case when p_sort = 'score' then best_ end desc nulls last, case when p_sort = 'visits' then visits end desc nulls last,
                   case when p_sort = 'old' then last_seen end asc, last_seen desc) rn,
            voter, uid_ uid, nick, game_name gname, game_dept gdept, game_batch gbatch, chat_dept cdept, chat_session csess, page, ip, country, region, city, left(ua, 200) ua, visits, gender, info,
            phone_ phone, ls_ ls, onl online, best_ best
          from f) x where x.rn > greatest(p_offset, 0) and x.rn <= greatest(p_offset, 0) + least(greatest(p_limit, 1), 100)), '[]'::jsonb),
      'depts', coalesce((select jsonb_agg(v order by v) from (select game_dept v from b union select chat_dept from b) z where v is not null and btrim(v) <> ''), '[]'::jsonb),
      'sessions', coalesce((select jsonb_agg(v order by v) from (select game_batch v from b union select chat_session from b) z where v is not null and btrim(v) <> ''), '[]'::jsonb),
      'countries', coalesce((select jsonb_agg(v order by v) from (select distinct country v from b) z where v ~ '^[A-Z]{2}$' and v not in ('XX', 'T1')), '[]'::jsonb)));
end $$;

revoke all on function mc2_admin_users(text, boolean, int, int) from public, anon; grant execute on function mc2_admin_users(text, boolean, int, int) to authenticated;
revoke all on function mc2_admin_users2(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, int, int) from public, anon;
grant execute on function mc2_admin_users2(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, int, int) to authenticated;
notify pgrst, 'reload schema';

-- চেক: সবগুলো ok = true এলে ঠিক
select 'কার্ডওয়ালা সব তালিকায়' as item,
  to_regprocedure('mc2_card_rows()') is not null and to_regprocedure('mc2_presence_plus()') is not null as ok;


-- ==================== supabase-restrict.sql ====================
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


-- ==================== supabase-restrict-v2.sql ====================
-- ⚠️ Restriction v2 — অটো-Restriction (খারাপ শব্দ), "কে দিয়েছে", সময় কমানো/বাড়ানো/বন্ধ, অ্যাকশন লগ, চ্যাট থেকে অ্যাডমিন-মডারেশন।
-- আগে supabase-restrict.sql চালানো থাকতে হবে (পুরোনোটা বদলায়নি)। তারপর এই ফাইল Supabase → SQL Editor-এ একবার Run করুন; আবার চালালেও ক্ষতি নেই।
--
-- কী কী হয়:
--  ১) কেউ খারাপ শব্দ (অ্যাডমিন → 🚫 খারাপ শব্দ তালিকা = mc2_bad_words) লিখলে সার্ভারেই (ট্রিগার, তাই বাইপাস করা যায় না) তাকে অটো Restriction দেয়:
--     ১ম বার ১ ঘণ্টা, ২য় বার ২ ঘণ্টা, ৩য় বার ৪ ঘণ্টা … প্রতিবার দ্বিগুণ (সর্বোচ্চ ৩৬৫ দিন)। অ্যাডমিন যে অটো-শাস্তি "ভুল ছিল" বলে বন্ধ করেন, সেটা গণনায় ধরা হয় না।
--     একই ইউজারের ৬০ সেকেন্ডের মধ্যে পরপর খারাপ শব্দে নতুন করে দ্বিগুণ হয় না (এক ঝোঁকে ১০টা মেসেজ দিলে ১০ ধাপ লাফ দেবে না)।
--     বার্তা আটকায় না (আগের মতো সবার স্ক্রিনে লেখা লুকিয়ে "কমিউনিটি ওয়ার্নিং" দেখায়); কোনো কারণে ট্রিগার ফেল করলেও বার্তা পাঠানো আটকাবে না।
--  ২) fa_rs-এ প্রতিটা ওয়ার্নিংয়ের সাথে "k" (auto / admin) যায় — চ্যাটের পপআপে "কে দিয়েছে" দেখাতে।
--  ৩) অ্যাডমিন চলমান Restriction-এর সময় কমাতে/বাড়াতে/বন্ধ করতে পারে (fa_restriction_adjust); সব কাজ fa_restrict_log-এ লগ হয়।
--  ৪) অ্যাডমিন চ্যাট থেকে বার্তা দেখে ইউজারকে ধরতে পারে (fa_admin_msg_target)।
--  ৫) ⛔ চাপলে সবাই ওয়ার্নিংয়ের কারণ, বাকি সময় ও কে দিয়েছে দেখে; কিন্তু আসল আপত্তিকর মেসেজটা লুকানো বক্সেই থাকে (সবার কাছে)।
--  ৬) Restriction সিস্টেম সবার জন্য ON/OFF (fa_set_restrict)। OFF থাকলে অটো-Restriction হয় না, নতুন Restriction দেওয়া যায় না, চ্যাটে কিছু দেখায় না।
--  ৭) অটো-Restriction অ্যাডমিন আগে বন্ধ করলে (বা সময় কমিয়ে শেষ করলে) সেটা দ্বিগুণ-গণনায় ধরা হয় না।
--
-- চালানোর ক্রম: (আগে থেকে থাকা) mc2 মূল SQL → supabase-restrict.sql → supabase-restrict-v2.sql (এটি)।

-- ================= টেবিলে নতুন কলাম =================
alter table fa_restrictions add column if not exists kind     text    not null default 'admin';   -- 'admin' | 'auto'
alter table fa_restrictions add column if not exists word     text    not null default '';        -- অটো হলে কোন শব্দে ধরা পড়ল (শুধু অ্যাডমিন দেখে)
alter table fa_restrictions add column if not exists forgiven boolean not null default false;     -- অ্যাডমিন "ভুল ছিল" বলে বন্ধ করলে true — দ্বিগুণ হওয়ার গণনায় বাদ
alter table fa_restrictions add column if not exists lvl      int     not null default 0;         -- অটো হলে এটা কত নম্বর বার
alter table fa_restrictions add column if not exists msg_id   bigint;                              -- যে বার্তার জন্য অটো হয়েছে
create index if not exists fa_restrictions_auto on fa_restrictions (voter) where kind = 'auto';

-- ================= অ্যাকশন লগ =================
create table if not exists fa_restrict_log (
  id         bigserial primary key,
  rid        bigint,                                   -- fa_restrictions.id
  voter      text not null,
  uid        text not null default '',
  nick       text not null default '',
  action     text not null,                            -- give | auto | shorten | extend | end
  minutes    int,                                      -- দেওয়া/কমানো/বাড়ানো মিনিট
  old_until  timestamptz,
  new_until  timestamptz,
  reason     text not null default '',
  by_admin   text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists fa_restrict_log_voter on fa_restrict_log (voter, created_at desc);
create index if not exists fa_restrict_log_time  on fa_restrict_log (created_at desc);
alter table fa_restrict_log enable row level security;   -- সরাসরি টেবিল বন্ধ

create or replace function fa_log_restrict(p_rid bigint, p_voter text, p_uid text, p_nick text, p_action text, p_minutes int, p_old timestamptz, p_new timestamptz, p_reason text, p_by text)
returns void language sql security definer set search_path = public as $$
  insert into fa_restrict_log (rid, voter, uid, nick, action, minutes, old_until, new_until, reason, by_admin)
  values (p_rid, p_voter, coalesce(p_uid, ''), coalesce(p_nick, ''), p_action, p_minutes, p_old, p_new, coalesce(p_reason, ''), coalesce(p_by, ''));
$$;
revoke all on function fa_log_restrict(bigint, text, text, text, text, int, timestamptz, timestamptz, text, text) from public, anon, authenticated;

-- ================= Restriction সিস্টেম ON/OFF (ডিফল্ট ON) =================
create or replace function fa_restrict_on() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select val = 'true'::jsonb from fa_settings where key = 'restrict'), true);
$$;
revoke all on function fa_restrict_on() from public, anon, authenticated;

create or replace function fa_set_restrict(p_on boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  insert into fa_settings (key, val) values ('restrict', to_jsonb(coalesce(p_on, true)))
  on conflict (key) do update set val = excluded.val, updated_at = now();
  return coalesce(p_on, true);
end $$;
revoke all on function fa_set_restrict(boolean) from public, anon;
grant execute on function fa_set_restrict(boolean) to authenticated;

-- ================= অ্যাডমিন: Restriction দিন (আগের মতোই + লগ + kind) =================
create or replace function fa_restrict(p_voter text, p_uid text, p_nick text, p_reason text, p_minutes int)
returns bigint language plpgsql security definer set search_path = public as $$
declare nid bigint; adm text; u timestamptz;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if not fa_restrict_on() then raise exception 'Restriction সিস্টেম এখন বন্ধ (আগে চালু করুন)'; end if;
  if p_voter is null or length(p_voter) < 4 then raise exception 'voter'; end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 525600 then raise exception 'minutes 1..525600'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason'; end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;
  u := now() + make_interval(mins => p_minutes);
  insert into fa_restrictions (voter, uid, nick, reason, until, by_admin, kind)
  values (p_voter, left(coalesce(p_uid, ''), 80), left(coalesce(p_nick, ''), 40), left(btrim(p_reason), 300), u, adm, 'admin')
  returning id into nid;
  perform fa_log_restrict(nid, p_voter, left(coalesce(p_uid, ''), 80), left(coalesce(p_nick, ''), 40), 'give', p_minutes, null, u, left(btrim(p_reason), 300), adm);
  return nid;
end $$;
revoke all on function fa_restrict(text, text, text, text, int) from public, anon;
grant execute on function fa_restrict(text, text, text, text, int) to authenticated;

-- ================= অ্যাডমিন: তুলে নিন (আগের মতোই + লগ) =================
create or replace function fa_unrestrict(p_id bigint default null, p_voter text default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int; adm text;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if p_id is null and p_voter is null then return 0; end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;
  with u as (
    update fa_restrictions set lifted_at = now()
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

-- ================= অ্যাডমিন: সময় কমাও / বাড়াও / বন্ধ করো =================
-- p_action: 'shorten' (মেয়াদ থেকে p_minutes কমায়; বাকির চেয়ে বেশি হলে বন্ধ হয়ে যায়) | 'extend' (p_minutes বাড়ায়; আজ থেকে সর্বোচ্চ ৩৬৫ দিন) | 'end' (এখনই বন্ধ)
-- অটো-Restriction আগে বন্ধ করলে/শেষ করে দিলে সেটা পরের অটো-শাস্তির দ্বিগুণ-গণনা থেকে বাদ যায় (p_forgive এখন আর লাগে না; পুরোনো কলের জন্য প্যারামিটারটা আছে)।
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
    update fa_restrictions set lifted_at = now(), forgiven = (r.kind = 'auto') where id = r.id;
    perform fa_log_restrict(r.id, r.voter, r.uid, r.nick, 'end', null, r.until, now(), case when note = '' then r.reason else note end, adm);
    return jsonb_build_object('ok', true, 'ended', true);
  end if;

  if p_action not in ('shorten', 'extend') then raise exception 'action'; end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 525600 then raise exception 'minutes 1..525600'; end if;

  if p_action = 'shorten' then
    nu := r.until - make_interval(mins => p_minutes);
    if nu <= now() then   -- বাকি সময়ের চেয়ে বেশি কমালে মানে বন্ধ
      update fa_restrictions set lifted_at = now(), forgiven = (r.kind = 'auto') where id = r.id;
      perform fa_log_restrict(r.id, r.voter, r.uid, r.nick, 'shorten', p_minutes, r.until, now(), note, adm);
      return jsonb_build_object('ok', true, 'ended', true);
    end if;
  else
    nu := r.until + make_interval(mins => p_minutes);
    if nu > now() + make_interval(mins => 525600) then nu := now() + make_interval(mins => 525600); end if;
  end if;

  update fa_restrictions set until = nu where id = r.id;
  perform fa_log_restrict(r.id, r.voter, r.uid, r.nick, p_action, p_minutes, r.until, nu, note, adm);
  return jsonb_build_object('ok', true, 'ended', false, 'until', (extract(epoch from nu) * 1000)::bigint);
end $$;
revoke all on function fa_restriction_adjust(bigint, text, int, boolean, text) from public, anon;
grant execute on function fa_restriction_adjust(bigint, text, int, boolean, text) to authenticated;

-- ================= অ্যাডমিন: তালিকা (নতুন ফিল্ডসহ: k = auto/admin, wd = ধরা-পড়া শব্দ, fg = ক্ষমা, lv = কত নম্বর বার, mid = বার্তা) =================
create or replace function fa_admin_restrictions(p_active_only boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'voter', voter, 'uid', uid, 'nick', nick, 'reason', reason,
      'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint,
      'l', case when lifted_at is null then null else (extract(epoch from lifted_at) * 1000)::bigint end, 'by', by_admin,
      'k', kind, 'wd', word, 'fg', forgiven, 'lv', lvl, 'mid', msg_id) order by created_at desc)
    from (select * from fa_restrictions
           where (not p_active_only) or (lifted_at is null and until > now())
           order by created_at desc limit 200) x
  ), '[]'::jsonb);
end $$;
revoke all on function fa_admin_restrictions(boolean) from public, anon;
grant execute on function fa_admin_restrictions(boolean) to authenticated;

-- ================= অ্যাডমিন: Restriction অ্যাকশন লগ (p_voter দিলে ওই ইউজারের, নইলে সবার সাম্প্রতিক ২০০) =================
create or replace function fa_admin_restrict_log(p_voter text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'rid', rid, 'voter', voter, 'uid', uid, 'nick', nick, 'a', action, 'm', minutes,
      'o', case when old_until is null then null else (extract(epoch from old_until) * 1000)::bigint end,
      'n', case when new_until is null then null else (extract(epoch from new_until) * 1000)::bigint end,
      'r', reason, 'by', by_admin, 'c', (extract(epoch from created_at) * 1000)::bigint) order by created_at desc)
    from (select * from fa_restrict_log where p_voter is null or voter = p_voter order by created_at desc limit 200) x
  ), '[]'::jsonb);
end $$;
revoke all on function fa_admin_restrict_log(text) from public, anon;
grant execute on function fa_admin_restrict_log(text) to authenticated;

-- ================= অ্যাডমিন: চ্যাটের একটা বার্তা দেখে তার মালিককে চেনা =================
-- ফেরত: voter (ডিভাইস আইডি — শুধু অ্যাডমিন পায়), nick, locked, active = এই ইউজারের চলমান Restriction-গুলো।
create or replace function fa_admin_msg_target(p_msg bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v text; nk text;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  select voter, nick into v, nk from mc2_ac_messages where id = p_msg;
  if not found or v is null then return null; end if;
  return jsonb_build_object('voter', v, 'nick', nk,
    'locked', exists (select 1 from fa_locks where voter = v and lifted_at is null),
    'active', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'reason', reason, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind) order by created_at)
                          from fa_restrictions where voter = v and lifted_at is null and until > now()), '[]'::jsonb));
end $$;
revoke all on function fa_admin_msg_target(bigint) from public, anon;
grant execute on function fa_admin_msg_target(bigint) to authenticated;

-- ================= 🤬 খারাপ শব্দ → অটো Restriction (সার্ভারে) =================
-- চ্যাট পেইজের নিয়মের (nbad) মতোই মেলানো: ছোট হাতের অক্ষর, ফাঁকা/জিরো-উইডথ/চিহ্ন বাদ দিয়ে, শব্দ ≥ ২ অক্ষর, "ভেতরে আছে কিনা"।
create or replace function fa_bad_hit(p_body text)
returns text language plpgsql stable security definer set search_path = public as $$
declare n text; w text; x text; rx constant text := '[\s​-‍.,_\-*+''"!?()]+';
begin
  if p_body is null or p_body = '' then return null; end if;
  n := regexp_replace(lower(p_body), rx, '', 'g');
  for x in select lower(word) from mc2_bad_words limit 5000 loop
    w := regexp_replace(x, rx, '', 'g');
    if length(w) >= 2 and position(w in n) > 0 then return w; end if;
  end loop;
  return null;
exception when others then return null;   -- তালিকা-টেবিল না থাকলে কিছু হয় না
end $$;
revoke all on function fa_bad_hit(text) from public, anon, authenticated;

create or replace function fa_bad_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare w text; n int; mins int; u timestamptz; pu text := ''; nid bigint; j jsonb; lbl text;
begin
  if coalesce(NEW.body, '') = '' or coalesce(NEW.voter, '') = '' then return NEW; end if;
  if not fa_restrict_on() then return NEW; end if;   -- Restriction সিস্টেম বন্ধ
  w := fa_bad_hit(NEW.body);
  if w is null then return NEW; end if;

  -- ৬০ সেকেন্ডের মধ্যে আবার অটো-শাস্তি হয়ে থাকলে নতুন ধাপ নয়
  if exists (select 1 from fa_restrictions where voter = NEW.voter and kind = 'auto' and created_at > now() - interval '60 seconds') then return NEW; end if;

  select count(*) into n from fa_restrictions where voter = NEW.voter and kind = 'auto' and not forgiven;
  mins := least(60 * (2 ^ least(n, 14))::int, 525600);     -- ১ ঘণ্টা, ২, ৪, ৮ … (সর্বোচ্চ ৩৬৫ দিন)
  u := now() + make_interval(mins => mins);

  -- চ্যাটে সবাইকে ⛔ দেখাতে পাবলিক uid লাগে: আসল mc2_ac_meta থেকে নিই (না পেলে ওই ডিভাইসের আগের Restriction-এর uid)
  begin
    execute format('select mc2_ac_meta(%s, %s, %L)', NEW.session_id, NEW.id, NEW.voter) into j;
    select e ->> 'u' into pu from jsonb_array_elements(coalesce(j -> 'rows', '[]'::jsonb)) e where (e ->> 'id')::bigint = NEW.id limit 1;
  exception when others then pu := '';
  end;
  pu := coalesce(pu, '');
  if pu = '' then
    select f.uid into pu from fa_restrictions f where f.voter = NEW.voter and f.uid <> '' order by f.id desc limit 1;
    pu := coalesce(pu, '');
  end if;

  lbl := translate((n + 1)::text, '0123456789', '০১২৩৪৫৬৭৮৯');
  insert into fa_restrictions (voter, uid, nick, reason, until, by_admin, kind, word, lvl, msg_id)
  values (NEW.voter, left(pu, 80), left(coalesce(NEW.nick, ''), 40),
          'আপত্তিকর/খারাপ শব্দ ব্যবহারের কারণে অটো Restriction (মোট ' || lbl || ' বার)', u, 'auto', 'auto', w, n + 1, NEW.id)
  returning id into nid;
  perform fa_log_restrict(nid, NEW.voter, left(pu, 80), left(coalesce(NEW.nick, ''), 40), 'auto', mins, null, u, 'খারাপ শব্দ (অটো)', 'auto');
  return NEW;
exception when others then
  return NEW;   -- যা-ই হোক, বার্তা পাঠানো আটকাবে না
end $$;
do $$ begin
  if to_regclass('public.mc2_ac_messages') is not null then
    drop trigger if exists fa_bad_guard_t on mc2_ac_messages;
    create trigger fa_bad_guard_t after insert on mc2_ac_messages for each row execute function fa_bad_guard();
  end if;
exception when others then raise notice 'অটো-Restriction ট্রিগার বসেনি: %', sqlerrm;
end $$;

-- ================= সবার জন্য (চ্যাট পেইজ): fa_rs =================
-- on = সিস্টেম চালু কিনা। p = চলমান Restriction-এ থাকা সবার ওয়ার্নিং (পাবলিক uid দিয়ে: কারণ, মেয়াদ, কে দিয়েছে), m = নিজের (voter দিয়ে)। সিস্টেম বন্ধ থাকলে p ও m ফাঁকা।
create or replace function fa_rs(p_voter text default null)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'on', fa_restrict_on(),
    'p', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('u', g.uid, 'w', g.w)) from (
          select uid, jsonb_agg(jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind) order by created_at) w
            from fa_restrictions where lifted_at is null and until > now() and uid <> '' group by uid) g), '[]'::jsonb) end,
    'm', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind) order by created_at)
            from fa_restrictions where p_voter is not null and voter = p_voter and lifted_at is null and until > now()), '[]'::jsonb) end,
    'lk', (select jsonb_build_object('r', reason) from fa_locks where p_voter is not null and voter = p_voter and lifted_at is null limit 1),
    'shot', coalesce((select val = 'true'::jsonb from fa_settings where key = 'shot'), false),
    'now', (extract(epoch from now()) * 1000)::bigint
  );
$$;
grant execute on function fa_rs(text) to anon, authenticated;

select count(*) as active_restrictions, count(*) filter (where kind = 'auto') as auto_ones from fa_restrictions where lifted_at is null and until > now();


-- ==================== supabase-restrict-v3.sql ====================
-- 🔒 Restriction v3 — "ওয়ার্নিংয়ের কারণ কারা দেখবে" সেটিং।
-- চালানোর ক্রম: (মূল SQL) → supabase-restrict.sql → supabase-restrict-v2.sql → supabase-restrict-v3.sql (এটি)। একবার চালান; আবার চালালেও ক্ষতি নেই।
--
-- মোড (অ্যাডমিন → 🛡️ মডারেশন → ⚠️ Restriction তালিকা-র ওপরের বোতাম):
--   all     (ডিফল্ট) = ⛔ চাপলে সবাই কারণ, বাকি সময় ও কে দিয়েছে দেখে।
--   private = শুধু ওই ইউজার নিজে আর অ্যাডমিন দেখে; বাকিদের কাছে সার্ভার কারণ/কে দিয়েছে পাঠায়ই না (শুধু ⛔ চিহ্ন + মেয়াদ থাকে)।
-- দুই মোডেই আসল আপত্তিকর মেসেজ সবার কাছে লুকানো বক্সে থাকে।

create or replace function fa_rs_vis() returns text language sql stable security definer set search_path = public as $$
  select case when coalesce((select val #>> '{}' from fa_settings where key = 'rs_vis'), 'all') = 'private' then 'private' else 'all' end;
$$;
revoke all on function fa_rs_vis() from public, anon, authenticated;

create or replace function fa_set_rs_vis(p_mode text)
returns text language plpgsql security definer set search_path = public as $$
declare m text := case when p_mode = 'private' then 'private' else 'all' end;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  insert into fa_settings (key, val) values ('rs_vis', to_jsonb(m))
  on conflict (key) do update set val = excluded.val, updated_at = now();
  return m;
end $$;
revoke all on function fa_set_rs_vis(text) from public, anon;
grant execute on function fa_set_rs_vis(text) to authenticated;

-- fa_rs: 'vis' যোগ; private হলে 'p'-তে কারণ/কে দিয়েছে (r, k) থাকে না। 'm' (নিজের) সবসময় পূর্ণ।
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
    'lk', (select jsonb_build_object('r', reason) from fa_locks where p_voter is not null and voter = p_voter and lifted_at is null limit 1),
    'shot', coalesce((select val = 'true'::jsonb from fa_settings where key = 'shot'), false),
    'now', (extract(epoch from now()) * 1000)::bigint
  );
$$;
grant execute on function fa_rs(text) to anon, authenticated;

select fa_rs_vis() as ওয়ার্নিং_কারা_দেখবে;


-- ==================== supabase-lock-timed.sql ====================
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


-- ==================== supabase-chat-users.sql ====================
-- 💬 চ্যাট ইউজার ট্যাবের জন্য: কে কোন অ্যাপ/লিংক থেকে সাইটে ঢুকেছে (Messenger, Facebook, Instagram, WhatsApp…) তার রেকর্ড।
-- Supabase → SQL Editor-এ একবার Run করুন (অন্য SQL-এর সাথে একসাথে চালালেও চলবে; বারবার চালালেও ক্ষতি নেই)।
-- বার্তার সংখ্যা, সতর্কতা, ব্যান/Restriction — এগুলোর জন্য নতুন SQL লাগে না, আগে থেকে থাকা mc2_ac_admin_active থেকে আসে।
-- নির্ভর করে শুধু আগে থেকে থাকা mc2_is_admin() ফাংশনের ওপর (অ্যাডমিন লগইনে যেটা যাচাই হয়)।
--
-- ⚠ কী সংরক্ষণ হয়: কোন অ্যাপ (Messenger/Facebook/…), রেফারার লিংক (কোন পেইজ থেকে ক্লিক করে এসেছে), ল্যান্ডিং লিংক ও fbclid।
-- ফেসবুক/মেসেঞ্জারে ইউজারের নিজের প্রোফাইল আইডি বা প্রোফাইল লিংক ওয়েবসাইট কখনো জানতে পারে না — তাই সেটা সংরক্ষণ করা যায় না।

create table if not exists mc2_fa_sources (
  voter         text primary key,
  app           text not null default '',   -- সর্বশেষ ঢোকার অ্যাপ
  ref           text not null default '',   -- সর্বশেষ রেফারার লিংক
  landing       text not null default '',   -- সর্বশেষ ল্যান্ডিং লিংক
  fbclid        text not null default '',   -- ফেসবুকের ক্লিক আইডি (প্রোফাইল আইডি নয়)
  first_app     text not null default '',   -- প্রথমবার যে অ্যাপ থেকে এসেছিল
  first_ref     text not null default '',
  first_landing text not null default '',
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  visits        int not null default 1
);

-- সরাসরি টেবিল পড়া/লেখা বন্ধ (কোনো policy নেই); শুধু নিচের দুই ফাংশন দিয়ে।
alter table mc2_fa_sources enable row level security;

-- সাইট থেকে (সবার জন্য): নিজের ঢোকার তথ্য জমা
create or replace function mc2_fa_src(p_voter text, p_app text, p_ref text, p_landing text, p_fbclid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_voter is null or length(p_voter) < 4 or length(p_voter) > 80 then return; end if;
  insert into mc2_fa_sources (voter, app, ref, landing, fbclid, first_app, first_ref, first_landing)
  values (p_voter, left(coalesce(p_app, ''), 40), left(coalesce(p_ref, ''), 500), left(coalesce(p_landing, ''), 500), left(coalesce(p_fbclid, ''), 300),
          left(coalesce(p_app, ''), 40), left(coalesce(p_ref, ''), 500), left(coalesce(p_landing, ''), 500))
  on conflict (voter) do update set
    app = excluded.app, ref = excluded.ref, landing = excluded.landing,
    fbclid = case when excluded.fbclid <> '' then excluded.fbclid else mc2_fa_sources.fbclid end,
    last_seen = now(), visits = mc2_fa_sources.visits + 1;
end $$;
grant execute on function mc2_fa_src(text, text, text, text, text) to anon, authenticated;

-- অ্যাডমিন প্যানেলের জন্য (শুধু অ্যাডমিন): সবার তালিকা
create or replace function mc2_fa_src_list()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(to_jsonb(s)) from mc2_fa_sources s), '[]'::jsonb);
end $$;
revoke all on function mc2_fa_src_list() from public, anon;
grant execute on function mc2_fa_src_list() to authenticated;

-- যাচাই: 0 বা তার বেশি সংখ্যা এলে ঠিক আছে।
select count(*) as rows_saved from mc2_fa_sources;


-- ==================== supabase-ref-log.sql ====================
-- 🔗 রেফারার লিংক লগ: কেউ যে লিংক/পেইজ থেকে ক্লিক করে সাইটে ঢুকলে তার আগের পুরো লিংক (document.referrer) জমা থাকে।
-- একই ব্যক্তির জন্য একই লিংক হলে নতুন সারি হয় না — একটাই থাকে (শুধু "কতবার" ও "শেষ কখন" বাড়ে)।
-- Supabase → SQL Editor-এ একবার Run করুন (বারবার চালালেও ক্ষতি নেই)। নির্ভর করে আগে থেকে থাকা mc2_is_admin()-এর ওপর।
--
-- ⚠ ব্রাউজার/অ্যাপ অনেক সময় রেফারারে শুধু ডোমেইন পাঠায় (যেমন https://l.facebook.com/) বা কিছুই পাঠায় না — ওটা ওয়েবসাইট থেকে বদলানো যায় না।
--   যা আসে তার পুরোটাই (পাথ ও প্যারামিটারসহ) এখানে রাখা হয়।

create table if not exists mc2_fa_ref_log (
  voter      text not null,
  ref        text not null,               -- আগের পুরো লিংক
  landing    text not null default '',    -- যে লিংকে ঢুকেছিল (প্রথমবার)
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  hits       int not null default 1,
  primary key (voter, ref)                -- একই ব্যক্তি + একই লিংক = একটাই সারি
);
create index if not exists mc2_fa_ref_log_ref on mc2_fa_ref_log (ref);
alter table mc2_fa_ref_log enable row level security;   -- সরাসরি টেবিল বন্ধ; শুধু নিচের ফাংশন

-- সাইট থেকে (সবার জন্য)
create or replace function mc2_fa_ref(p_voter text, p_ref text, p_landing text)
returns void language plpgsql security definer set search_path = public as $$
declare r text := btrim(coalesce(p_ref, ''));
begin
  if p_voter is null or length(p_voter) < 4 or length(p_voter) > 80 then return; end if;
  if r = '' or r !~* '^https?://' then return; end if;
  r := left(r, 2000);
  insert into mc2_fa_ref_log (voter, ref, landing) values (p_voter, r, left(coalesce(p_landing, ''), 500))
  on conflict (voter, ref) do update set last_seen = now(), hits = mc2_fa_ref_log.hits + 1;
end $$;
grant execute on function mc2_fa_ref(text, text, text) to anon, authenticated;

-- অ্যাডমিনের জন্য (শুধু অ্যাডমিন): সব লিংক
create or replace function mc2_fa_ref_list()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.last_seen desc) from (select * from mc2_fa_ref_log order by last_seen desc limit 20000) x), '[]'::jsonb);
end $$;
revoke all on function mc2_fa_ref_list() from public, anon;
grant execute on function mc2_fa_ref_list() to authenticated;

select count(*) as ref_rows from mc2_fa_ref_log;


-- ==================== supabase-screenshot-log.sql ====================
-- 📸 স্ক্রীনশট নোটিশ (শুধু অ্যাডমিন দেখবে)
-- Supabase → SQL Editor-এ একবার Run করুন (আবার চালালেও ক্ষতি নেই)। নির্ভর করে আগে থেকে থাকা mc2_is_admin()-এর ওপর।
-- কেউ স্ক্রীনশটের চেষ্টা করলে (PrintScreen, Cmd+Shift+3/4/5, Win+Shift+S, ৩-আঙুলের স্পর্শ) এখানে লগ জমে।
-- সাধারণ ইউজার (এমনকি যে স্ক্রীনশট নিল সে-ও) এই তালিকা পড়তে পারে না — পড়ার ফাংশন শুধু অ্যাডমিনের জন্য।

create table if not exists fa_shot_log (
  id         bigserial primary key,
  session_id bigint not null,
  voter      text   not null,
  nick       text   not null default '',
  created_at timestamptz not null default now()
);
create index if not exists fa_shot_log_sess_idx  on fa_shot_log (session_id, id desc);
create index if not exists fa_shot_log_voter_idx on fa_shot_log (voter, created_at desc);

-- সরাসরি টেবিল পড়া/লেখা বন্ধ (কোনো policy নেই); শুধু নিচের ফাংশন দিয়ে।
alter table fa_shot_log enable row level security;

-- সাইট থেকে (সবার জন্য): নিজের স্ক্রীনশট-চেষ্টা জমা। ৫ সেকেন্ডের মধ্যে একই ডিভাইসের পরপর চেষ্টা একবার গণনা হয়।
create or replace function fa_log_shot(p_session bigint, p_voter text, p_nick text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_session is null or p_voter is null or length(p_voter) < 4 or length(p_voter) > 80 then return; end if;
  if exists (select 1 from fa_shot_log where voter = p_voter and created_at > now() - interval '5 seconds') then return; end if;
  insert into fa_shot_log (session_id, voter, nick) values (p_session, p_voter, left(coalesce(p_nick, ''), 40));
  if random() < 0.02 then delete from fa_shot_log where created_at < now() - interval '60 days'; end if; -- পুরোনো লগ নিজে পরিষ্কার
end $$;
grant execute on function fa_log_shot(bigint, text, text) to anon, authenticated;

-- অ্যাডমিনের জন্য (শুধু অ্যাডমিন): এই সেশনের স্ক্রীনশট লগ। p_after = শেষ দেখা id (প্রথমবার 0 → সর্বশেষ ৩০০টি)
create or replace function fa_admin_shots(p_session bigint, p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'v', voter, 'n', nick, 't', (extract(epoch from created_at) * 1000)::bigint) order by id)
    from (select * from fa_shot_log where session_id = p_session and id > coalesce(p_after, 0) order by id desc limit 300) q
  ), '[]'::jsonb);
end $$;
revoke all on function fa_admin_shots(bigint, bigint) from public, anon;
grant execute on function fa_admin_shots(bigint, bigint) to authenticated;

-- যাচাই: সংখ্যা (0 বা বেশি) এলে ঠিক আছে।
select count(*) as shots_logged from fa_shot_log;


-- ==================== supabase-bg.sql ====================
-- Friend Adda: সাইটের ব্যাকগ্রাউন্ড (অ্যাডমিন → 🖼 ব্যাকগ্রাউন্ড)। Supabase SQL Editor-এ একবার চালান।
create table if not exists public.mc2_site_bg (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  pick text not null default '12',          -- '00' = ব্যাকগ্রাউন্ড ছাড়া (ডিফল্ট সবুজ হেডার), '01'..'20' = ছবি
  updated_at timestamptz not null default now()
);
insert into public.mc2_site_bg (id) values (1) on conflict (id) do nothing;
alter table public.mc2_site_bg enable row level security;
drop policy if exists "mc2_site_bg read" on public.mc2_site_bg;
create policy "mc2_site_bg read" on public.mc2_site_bg for select to anon, authenticated using (true);
grant select on public.mc2_site_bg to anon, authenticated;

create or replace function public.mc2_admin_set_bg(p_on boolean, p_pick text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.mc2_is_admin() then raise exception 'not admin'; end if;
  if p_pick !~ '^(0[0-9]|1[0-9]|20)$' then raise exception 'bad pick'; end if;
  update public.mc2_site_bg set enabled = p_on, pick = p_pick, updated_at = now() where id = 1;
end $$;
revoke all on function public.mc2_admin_set_bg(boolean, text) from public, anon;
grant execute on function public.mc2_admin_set_bg(boolean, text) to authenticated;


-- (ডিফল্ট লক কোড বসানোর অংশ সরানো হয়েছে — লক কোড এখন শুধু অ্যাডমিন → 🔒 লক থেকে দেওয়া হয়।)


-- ==================== supabase-chat-speed.sql ====================
-- Friend Adda: বার্তা পাঠানোর সব গতি-সীমা তুলে দেওয়া (আনলিমিটেড) — একসাথে অনেকে দ্রুত চ্যাট করলেও আটকাবে না।
-- Supabase SQL Editor-এ একবার চালান। আবার চালালেও ক্ষতি নেই।
-- তোলা হয়েছে: (১) দুই বার্তার মাঝের ২ সেকেন্ড বিরতি  (২) একই লেখা ২০ সেকেন্ডে আবার না পাঠানো  (৩) ডিভাইস প্রতি মিনিটে ২০টার সীমা
--           (৪) একই IP-র প্রতি মিনিটে ৬০টার সীমা (মোবাইল নেটওয়ার্কে অনেকের IP এক)  (৫) ফাইল পাঠানোর মিনিট/ঘণ্টার সীমা
-- আগের মতোই আছে: পাসওয়ার্ড দেওয়া রুমে ঢোকা, ব্যান করা ইউজারের বাধা, লিংক ≤৩টি, ফাইলের ধরন/সাইজ যাচাই।
-- ⚠ এতে mc2_ac_send আবার তৈরি হয়; ডাটাবেসে supabase-new-20261017d.sql (বা পরের সব SQL) চালানো থাকতে হবে।

create or replace function mc2_ac_send(p_session int, p_nick text, p_body text, p_voter text, p_reply bigint default null, p_kind text default 'text', p_path text default null, p_fname text default null, p_size bigint default null, p_mime text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare q record; o record; ft jsonb; ext text; kd text := 'text'; fn text; fsz bigint; fmt text; r bigint; rid bigint; rn text; rt text;
  b text := mc2_ac_clean(p_body, 400); nk text := mc2_ac_clean(p_nick, 30); v text := coalesce(p_voter, ''); ip text := mc2_ip();
begin
  if v !~ '^[A-Za-z0-9_-]{8,80}$' then return -1; end if;
  select s.id, s.dept_id into q from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.id = p_session and s.active and d.active;
  if not found then return 0; end if;
  if not mc2_ac_can(p_session, v) then return -6; end if;   -- পাসওয়ার্ড দেওয়া চ্যাটে ঢোকেনি
  if mc2_ac_block(v) is not null then return -3; end if;
  perform mc2_ac_tick();
  if nk = '' then nk := 'বেনামি'; end if;
  if p_path is null then
    -- টেক্সট বার্তা
    if b = '' then return -1; end if;
    if (select count(*) from regexp_matches(b, '(https?://|www\.)', 'gi')) > 3 then return -1; end if;
  else
    -- ফাইল বার্তা: ধরন সার্ভারেই বের হয় (ক্লায়েন্টের দেওয়া ধরন/সাইজ/মাইম বিশ্বাস করা হয় না)
    if not mc2_ac_upload_on() then return -2; end if;
    if p_path !~ ('^' || p_session::text || '/[a-z0-9]{8,40}\.[a-z0-9]{1,5}$') then return -5; end if;
    ext := lower(substring(p_path from '\.([a-z0-9]+)$'));
    ft := mc2_ac_ftypes() -> ext;
    if ft is null then return -5; end if;
    select (metadata ->> 'size')::bigint as sz, metadata ->> 'mimetype' as mt, created_at as ca into o from storage.objects where bucket_id = 'mc2-chat' and name = p_path;
    if not found then return -5; end if;
    if o.ca < now() - interval '15 minutes' then return -5; end if;                       -- পুরোনো/অন্যের ফাইল নয়
    if split_part(coalesce(o.mt, ''), ';', 1) <> (ft ->> 1) then return -5; end if;       -- মাইম মিলতে হবে
    if o.sz is null or o.sz < 1 or o.sz > (ft ->> 2)::bigint * 1048576 then return -5; end if;
    if exists (select 1 from mc2_ac_messages where file_path = p_path) then return -5; end if;
    kd := ft ->> 0; fsz := o.sz; fmt := ft ->> 1;
    fn := mc2_ac_clean(translate(coalesce(p_fname, ''), '/\', '__'), 120);
    if fn = '' then fn := 'ফাইল.' || ext; end if;
  end if;
  if p_reply is not null then
    select id, nick, left(case when deleted then 'মুছে ফেলা বার্তা' when body = '' then '📎 ' || coalesce(file_name, 'ফাইল') else body end, 80) into rid, rn, rt
      from mc2_ac_messages where id = p_reply and session_id = p_session and not hidden;
  end if;
  insert into mc2_ac_messages(dept_id, session_id, nick, body, voter, ip, reply_to, reply_nick, reply_text, kind, file_path, file_name, file_size, file_mime)
  values (q.dept_id, q.id, nk, b, v, ip, rid, rn, rt, kd, case when kd = 'text' then null else p_path end, case when kd = 'text' then null else fn end,
          case when kd = 'text' then null else fsz end, case when kd = 'text' then null else fmt end)
  returning id into r;
  return r;
end $$;
grant execute on function mc2_ac_send(int, text, text, text, bigint, text, text, text, bigint, text) to anon, authenticated;

