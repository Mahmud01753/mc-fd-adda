-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালাবেন না (শুধু নতুন Supabase প্রজেক্টে একবার)
-- কাজ: মূল সেটআপ — কন্টেস্ট, চ্যাট ও অ্যাডমিন টেবিল, ফাংশন, স্টোরেজ বাকেট।
-- SQL-1 (মূল সেটআপ) — পুরোটা কপি করে Supabase SQL Editor-এ Run। ক্রম: ১ → ২ → ৩ → ADMIN

-- ==================== 01_supabase-contest.sql ====================
-- Friend Adda: "শেয়ার করে পুরস্কার জেতো" ফর্মের জন্য (Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run চাপুন)
-- জমা পড়া তালিকা দেখতে: Table Editor > contest_entries (স্ক্রিনশটের লিংকে ক্লিক করলে ছবি খোলে)

create table if not exists contest_entries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  fb_link text not null,
  shot_url text not null,
  contact text,
  pct int,
  score int
);
create unique index if not exists contest_entries_link_uq on contest_entries (lower(fb_link));
alter table contest_entries enable row level security;   -- সরাসরি পড়া/লেখা বন্ধ; জমা শুধু নিচের ফাংশন দিয়ে

create or replace function submit_entry(p_name text, p_link text, p_shot text, p_contact text, p_pct int, p_score int)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 60 then raise exception 'bad name'; end if;
  if p_link is null or length(p_link) > 400 or p_link !~* '^https?://([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch|fb\.me)/' then raise exception 'bad link'; end if;
  if p_shot is null or length(p_shot) > 500 then raise exception 'bad shot'; end if;
  insert into contest_entries (name, fb_link, shot_url, contact, pct, score)
  values (trim(p_name), trim(p_link), p_shot, nullif(left(trim(coalesce(p_contact, '')), 300), ''), p_pct, p_score)
  returning id into v;
  return v;
exception when unique_violation then
  raise exception 'duplicate';
end $$;
revoke all on function submit_entry(text, text, text, text, int, int) from public;
grant execute on function submit_entry(text, text, text, text, int, int) to anon;

-- স্ক্রিনশট রাখার বাকেট (শুধু JPEG, সর্বোচ্চ ৩ MB; জমা দেওয়া যাবে, তালিকা করা যাবে না)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contest', 'contest', true, 3145728, array['image/jpeg'])
on conflict (id) do nothing;
drop policy if exists "contest upload" on storage.objects;
create policy "contest upload" on storage.objects for insert to anon with check (bucket_id = 'contest');

-- সাপ্তাহিক লটারি: শুধু আপনি এখানে (SQL Editor-এ) চালাতে পারবেন। গত ৭ দিনের জমা থেকে র‍্যান্ডম ৫ জন:
--   select * from pick_winners();          -- ৭ দিন, ৫ জন
--   select * from pick_winners(14, 3);     -- ১৪ দিন, ৩ জন
create or replace function pick_winners(p_days int default 7, p_count int default 5)
returns table (id bigint, name text, fb_link text, shot_url text, contact text, pct int, created_at timestamptz)
language sql as $$
  select e.id, e.name, e.fb_link, e.shot_url, e.contact, e.pct, e.created_at
  from contest_entries e
  where e.created_at >= now() - make_interval(days => p_days)
  order by random() limit p_count
$$;
revoke all on function pick_winners(int, int) from public, anon;


-- ==================== 02_supabase-community.sql ====================
-- Friend Adda: চ্যাট, সবার লিডারবোর্ড, ভিজিটর লগ, অ্যাডমিন প্যানেল, নতুন ছবি (Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run)
-- আগে supabase-contest.sql চালান (এই ফাইল সেটার টেবিলও ব্যবহার করে)। বারবার চালালেও সমস্যা নেই।
-- অ্যাডমিন বানাতে: Supabase > Authentication > Users > Add user (ইমেইল + পাসওয়ার্ড, "Auto Confirm User" টিক দিন)।
-- তারপর নিচের লাইনটি আপনার ইমেইল দিয়ে একবার চালান (ছোট হাতের অক্ষরে):
--   insert into mc2_admins(email) values ('আপনার-ইমেইল@example.com');
-- ভালো হবে: Authentication > Providers > Email-এ "Allow new users to sign up" বন্ধ করুন।

-- ---------- অ্যাডমিন ----------
create table if not exists mc2_admins (email text primary key check (email = lower(email)));
alter table mc2_admins enable row level security;
revoke all on mc2_admins from anon, authenticated;

create or replace function mc2_is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mc2_admins where email = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
grant execute on function mc2_is_admin() to anon, authenticated;

-- অনুরোধের আইপি ও ডিভাইস (হেডার থেকে)
create or replace function mc2_hdr(k text) returns text language sql stable as $$
  select nullif(trim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> k, '')), '')
$$;
create or replace function mc2_ip() returns text language sql stable as $$
  select nullif(left(trim(split_part(coalesce(mc2_hdr('cf-connecting-ip'), mc2_hdr('x-forwarded-for'), mc2_hdr('x-real-ip'), ''), ',', 1)), 64), '')
$$;

-- ---------- সবার লিডারবোর্ড ----------
create table if not exists mc2_scores (
  id bigint generated always as identity primary key,
  name text not null, dept text not null, batch text, club text, title text,
  pct int not null, score int not null, ok int, total int,
  device text, ip text, ua text, info jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mc2_scores_t on mc2_scores (created_at desc);
alter table mc2_scores enable row level security;
revoke all on mc2_scores from anon, authenticated;
grant select, delete on mc2_scores to authenticated;
drop policy if exists "admin scores" on mc2_scores;
create policy "admin scores" on mc2_scores for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

create or replace function mc2_submit_score(p_name text, p_dept text, p_batch text, p_club text, p_title text, p_pct int, p_score int, p_ok int, p_total int, p_device text, p_info jsonb)
returns text language plpgsql security definer set search_path = public as $$
begin
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 30 or char_length(coalesce(p_dept, '')) not between 1 and 60
     or p_pct not between 0 and 100 or p_score not between 0 and 1000 or char_length(coalesce(p_device, '')) not between 8 and 40 then return 'invalid'; end if;
  if (select count(*) from mc2_scores where device = p_device and created_at > now() - interval '1 hour') >= 30 then return 'slow'; end if;
  insert into mc2_scores(name, dept, batch, club, title, pct, score, ok, total, device, ip, ua, info)
  values (trim(p_name), p_dept, left(p_batch, 40), left(p_club, 60), left(p_title, 60), p_pct, p_score, p_ok, p_total, p_device, mc2_ip(), left(mc2_hdr('user-agent'), 400), p_info);
  return 'ok';
end $$;

create or replace function mc2_top_scores(p_limit int default 500)
returns table (name text, dept text, batch text, pct int, score int, ts bigint)
language sql security definer set search_path = public as $$
  select * from (
    select distinct on (lower(s.name), s.dept) s.name, s.dept, s.batch, s.pct, s.score, (extract(epoch from s.created_at) * 1000)::bigint as ts
    from mc2_scores s order by lower(s.name), s.dept, s.score desc, s.created_at
  ) t order by t.score desc, t.ts limit least(greatest(p_limit, 1), 1000)
$$;
grant execute on function mc2_submit_score(text, text, text, text, text, int, int, int, int, text, jsonb), mc2_top_scores(int) to anon, authenticated;

-- ---------- ভিজিটর লগ ----------
create table if not exists mc2_visits (
  id bigint generated always as identity primary key,
  device text not null, page text, ip text, ua text, info jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mc2_visits_t on mc2_visits (created_at desc);
alter table mc2_visits enable row level security;
revoke all on mc2_visits from anon, authenticated;
grant select, delete on mc2_visits to authenticated;
drop policy if exists "admin visits" on mc2_visits;
create policy "admin visits" on mc2_visits for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

create or replace function mc2_log_visit(p_device text, p_page text, p_info jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 then return; end if;
  if (select count(*) from mc2_visits where device = p_device and created_at > now() - interval '1 hour') >= 40 then return; end if;
  insert into mc2_visits(device, page, ip, ua, info) values (p_device, left(p_page, 100), mc2_ip(), left(mc2_hdr('user-agent'), 400), p_info);
end $$;
grant execute on function mc2_log_visit(text, text, jsonb) to anon, authenticated;

-- ---------- চ্যাট ----------
create table if not exists mc2_chat_rooms (name text primary key check (char_length(name) between 1 and 60), sort int not null default 100);
alter table mc2_chat_rooms enable row level security;
revoke all on mc2_chat_rooms from anon, authenticated;
grant select on mc2_chat_rooms to anon;
grant select, insert, update, delete on mc2_chat_rooms to authenticated;
drop policy if exists "rooms read" on mc2_chat_rooms; drop policy if exists "rooms admin" on mc2_chat_rooms;
create policy "rooms read" on mc2_chat_rooms for select to anon, authenticated using (true);
create policy "rooms admin" on mc2_chat_rooms for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
insert into mc2_chat_rooms(name, sort) values
  ('ক্যাম্পাস লাউঞ্জ', 0), ('বাংলা', 1), ('উদ্ভিদবিজ্ঞান', 2), ('রসায়ন', 3), ('ইংরেজি', 4), ('ইতিহাস', 5), ('ইসলামের ইতিহাস ও সংস্কৃতি', 6),
  ('ইসলামি শিক্ষা', 7), ('দর্শন', 8), ('পদার্থবিজ্ঞান', 9), ('রাষ্ট্রবিজ্ঞান', 10), ('সমাজবিজ্ঞান', 11), ('পরিসংখ্যান', 12), ('উর্দু', 13),
  ('গণিত', 14), ('অর্থনীতি', 15), ('প্রাণিবিদ্যা', 16), ('মনোবিজ্ঞান', 17), ('সংস্কৃত', 18), ('অন্যান্য', 19)
on conflict (name) do nothing;

create table if not exists mc2_chat_messages (
  id bigint generated always as identity primary key,
  room text not null,
  nick text not null check (char_length(nick) between 2 and 30),
  body text not null check (char_length(trim(body)) between 1 and 200),
  voter text not null,
  hidden boolean not null default false,
  ip text, ua text, info jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mc2_chat_r on mc2_chat_messages (room, created_at desc);
alter table mc2_chat_messages enable row level security;
revoke all on mc2_chat_messages from anon, authenticated;
grant select (id, room, nick, body, created_at) on mc2_chat_messages to anon;
grant select, update, delete on mc2_chat_messages to authenticated;
drop policy if exists "chat read" on mc2_chat_messages; drop policy if exists "chat admin" on mc2_chat_messages;
create policy "chat read" on mc2_chat_messages for select to anon using (not hidden and created_at > now() - interval '7 days');
create policy "chat admin" on mc2_chat_messages for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

create table if not exists mc2_chat_reports (
  message_id bigint not null references mc2_chat_messages(id) on delete cascade,
  voter text not null check (char_length(voter) between 8 and 40),
  primary key (message_id, voter)
);
alter table mc2_chat_reports enable row level security;
revoke all on mc2_chat_reports from anon, authenticated;
grant insert on mc2_chat_reports to anon;
grant select, delete on mc2_chat_reports to authenticated;
drop policy if exists "report add" on mc2_chat_reports; drop policy if exists "report admin" on mc2_chat_reports;
create policy "report add" on mc2_chat_reports for insert to anon with check (true);
create policy "report admin" on mc2_chat_reports for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

create table if not exists mc2_chat_bans (voter text primary key, until timestamptz not null);
create table if not exists mc2_chat_warnings (
  message_id bigint primary key references mc2_chat_messages(id) on delete cascade,
  voter text not null, seen boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists mc2_bad_words (word text primary key check (word = lower(word) and word !~ '[^a-z0-9ঀ-৿]'));
alter table mc2_chat_bans enable row level security; alter table mc2_chat_warnings enable row level security; alter table mc2_bad_words enable row level security;
revoke all on mc2_chat_bans, mc2_chat_warnings, mc2_bad_words from anon, authenticated;
grant select, insert, update, delete on mc2_chat_bans, mc2_bad_words to authenticated;
drop policy if exists "bans admin" on mc2_chat_bans; drop policy if exists "words admin" on mc2_bad_words;
create policy "bans admin" on mc2_chat_bans for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
create policy "words admin" on mc2_bad_words for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
insert into mc2_bad_words(word) values ('fuck'),('shit'),('bitch'),('slut'),('asshole'),('bastard') on conflict do nothing;
-- বাংলা খারাপ শব্দ অ্যাডমিন পেজ থেকেও যোগ করা যায়।

-- ৩টি আলাদা রিপোর্টে বার্তা লুকায়, লেখক সতর্কবার্তা পায়
create or replace function mc2_after_report() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into mc2_chat_warnings(message_id, voter) select id, voter from mc2_chat_messages where id = new.message_id on conflict do nothing;
  update mc2_chat_messages set hidden = true
  where id = new.message_id and (select count(*) from mc2_chat_reports where message_id = new.message_id) >= 3;
  return new;
end $$;
drop trigger if exists t_mc2_report on mc2_chat_reports;
create trigger t_mc2_report after insert on mc2_chat_reports for each row execute function mc2_after_report();

create or replace function mc2_send_chat(p_room text, p_nick text, p_body text, p_voter text, p_info jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare n text; b mc2_chat_bans;
begin
  if not exists (select 1 from mc2_chat_rooms where name = p_room)
     or char_length(p_nick) not between 2 and 30 or char_length(trim(p_body)) not between 1 and 200
     or char_length(p_voter) not between 8 and 40 then return 'invalid'; end if;
  select * into b from mc2_chat_bans where voter = p_voter and until > now();
  if found then return 'banned:' || greatest(1, extract(epoch from (b.until - now()))::int); end if;
  if (select count(*) from mc2_chat_messages where voter = p_voter and created_at > now() - interval '1 minute') >= 5 then return 'slow'; end if;
  n := regexp_replace(translate(lower(p_body), '0134@$5', 'oieaass'), '[^a-z0-9ঀ-৿]', '', 'g');
  if exists (select 1 from mc2_bad_words w where position(w.word in n) > 0) then
    insert into mc2_chat_bans(voter, until) values (p_voter, now() + interval '10 minutes')
    on conflict (voter) do update set until = excluded.until;
    return 'banned:600';
  end if;
  insert into mc2_chat_messages(room, nick, body, voter, ip, ua, info)
  values (p_room, p_nick, trim(p_body), p_voter, mc2_ip(), left(mc2_hdr('user-agent'), 400), p_info);
  return 'ok';
end $$;

create or replace function mc2_chat_status(p_voter text) returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'ban', coalesce((select greatest(0, extract(epoch from (until - now()))::int) from mc2_chat_bans where voter = p_voter and until > now()), 0),
    'warn', (select count(*) from mc2_chat_warnings where voter = p_voter and not seen))
$$;
create or replace function mc2_chat_ack(p_voter text) returns void language sql security definer set search_path = public as $$
  update mc2_chat_warnings set seen = true where voter = p_voter
$$;
grant execute on function mc2_send_chat(text, text, text, text, jsonb), mc2_chat_status(text), mc2_chat_ack(text) to anon, authenticated;

-- ---------- নতুন ছবি (খেলায় নতুন জায়গা) ----------
create table if not exists mc2_places (
  id bigint generated always as identity primary key,
  bn text not null check (char_length(bn) between 1 and 60), en text, img text not null,
  active boolean not null default true, created_at timestamptz not null default now()
);
alter table mc2_places enable row level security;
revoke all on mc2_places from anon, authenticated;
grant select on mc2_places to anon;
grant select, insert, update, delete on mc2_places to authenticated;
drop policy if exists "places read" on mc2_places; drop policy if exists "places admin" on mc2_places;
create policy "places read" on mc2_places for select to anon, authenticated using (active);
create policy "places admin" on mc2_places for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mc2-places', 'mc2-places', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "places upload" on storage.objects; drop policy if exists "places delete" on storage.objects;
create policy "places upload" on storage.objects for insert to authenticated with check (bucket_id = 'mc2-places' and mc2_is_admin());
create policy "places delete" on storage.objects for delete to authenticated using (bucket_id = 'mc2-places' and mc2_is_admin());

-- ---------- পুরস্কারের জমায় আইপি/ডিভাইস + অ্যাডমিন দেখা ----------
alter table contest_entries add column if not exists ip text;
alter table contest_entries add column if not exists ua text;
create or replace function mc2_contest_meta() returns trigger language plpgsql as $$
begin new.ip := mc2_ip(); new.ua := left(mc2_hdr('user-agent'), 400); return new; end $$;
drop trigger if exists t_mc2_contest_meta on contest_entries;
create trigger t_mc2_contest_meta before insert on contest_entries for each row execute function mc2_contest_meta();
alter table contest_entries enable row level security;
grant select, delete on contest_entries to authenticated;
drop policy if exists "admin contest" on contest_entries;
create policy "admin contest" on contest_entries for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
grant execute on function pick_winners(int, int) to authenticated;


-- ==================== 03_supabase-titles.sql ====================
-- Friend Adda: উপাধি কাউন্টার (Supabase > SQL Editor-এ পুরোটা পেস্ট করে Run চাপুন)
create table if not exists title_counter (key text primary key, n bigint not null default 0);
alter table title_counter enable row level security;  -- সরাসরি টেবিল পড়া/লেখা বন্ধ, শুধু নিচের ফাংশন দিয়ে

create or replace function next_title(p_key text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  insert into title_counter(key, n) values (left(p_key, 80), 1)
  on conflict (key) do update set n = title_counter.n + 1
  returning n into v;
  return v;
end $$;

revoke all on function next_title(text) from public;
grant execute on function next_title(text) to anon;


-- ==================== 04_supabase-gallery.sql ====================
-- Friend Adda: ছবির গ্যালারি + ক্যাটাগরি + স্বয়ংক্রিয় MCQ + কুইজ সেটিংস + উত্তর সংরক্ষণ + ড্যাশবোর্ড
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run করুন। বারবার চালালেও সমস্যা নেই।
-- আগে চালানো থাকতে হবে: supabase-contest.sql, supabase-community.sql (mc2_admins, mc2_is_admin(), mc2_places এগুলো সেখানে বানানো)।

-- ---------- ক্যাটাগরি ----------
create table if not exists mc2_categories (
  name text primary key check (char_length(name) between 1 and 40),
  sort int not null default 100
);
alter table mc2_categories enable row level security;
revoke all on mc2_categories from anon, authenticated;
grant select on mc2_categories to anon;
grant select, insert, update, delete on mc2_categories to authenticated;
drop policy if exists "cat read" on mc2_categories; drop policy if exists "cat admin" on mc2_categories;
create policy "cat read" on mc2_categories for select to anon, authenticated using (true);
create policy "cat admin" on mc2_categories for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
insert into mc2_categories(name, sort) values
  ('ক্যাম্পাসের ভবন', 1), ('গেট ও প্রবেশপথ', 2), ('মিলনায়তন', 3), ('বিভাগ ও একাডেমিক', 4), ('খোলা জায়গা ও দৃশ্য', 5)
on conflict (name) do nothing;

-- ---------- ছবির টেবিলে নতুন কলাম ----------
alter table mc2_places add column if not exists category text references mc2_categories(name) on update cascade on delete set null;
alter table mc2_places add column if not exists updated_at timestamptz not null default now();
create index if not exists mc2_places_cat on mc2_places (category);

create or replace function mc2_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists t_mc2_places_touch on mc2_places;
create trigger t_mc2_places_touch before update on mc2_places for each row execute function mc2_touch();

-- ---------- কুইজ সেটিংস (অ্যাডমিন বদলাতে পারে, সবাই পড়তে পারে) ----------
create table if not exists mc2_settings (key text primary key check (char_length(key) <= 40), value jsonb not null);
alter table mc2_settings enable row level security;
revoke all on mc2_settings from anon, authenticated;
grant select on mc2_settings to anon;
grant select, insert, update, delete on mc2_settings to authenticated;
drop policy if exists "set read" on mc2_settings; drop policy if exists "set admin" on mc2_settings;
create policy "set read" on mc2_settings for select to anon, authenticated using (true);
create policy "set admin" on mc2_settings for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

create or replace function mc2_settings_check() returns trigger language plpgsql as $$
begin
  if new.key = 'quiz_count' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not between 1 and 50 then raise exception 'quiz_count must be 1..50'; end if;
  elsif new.key = 'wrong_options' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not in (3, 4) then raise exception 'wrong_options must be 3 or 4'; end if;
  elsif new.key = 'png_max_kb' then
    if jsonb_typeof(new.value) <> 'number' or not ((new.value #>> '{}')::numeric = 0 or (new.value #>> '{}')::numeric between 100 and 5000) then raise exception 'png_max_kb must be 0 or 100..5000'; end if;
  elsif new.key = 'quiz_categories' then
    if jsonb_typeof(new.value) <> 'array' then raise exception 'quiz_categories must be an array'; end if;
  else
    raise exception 'unknown setting';
  end if;
  return new;
end $$;
drop trigger if exists t_mc2_settings_check on mc2_settings;
create trigger t_mc2_settings_check before insert or update on mc2_settings for each row execute function mc2_settings_check();

insert into mc2_settings(key, value) values ('quiz_count', '10'), ('quiz_categories', '[]'), ('wrong_options', '3'), ('png_max_kb', '0')
on conflict (key) do nothing;

-- ---------- স্বয়ংক্রিয় প্রশ্ন (প্রতিটি চালু ছবির জন্য একটি MCQ) ----------
-- সঠিক উত্তর = ছবির নাম। ভুল অপশন = আগে একই ক্যাটাগরির অন্য ছবির নাম (কাছাকাছি), কম পড়লে বাকি ক্যাটাগরি থেকে।
create table if not exists mc2_questions (
  place_id bigint primary key references mc2_places(id) on delete cascade,
  question text not null,
  correct text not null,
  wrong text[] not null,
  updated_at timestamptz not null default now()
);
alter table mc2_questions enable row level security;
revoke all on mc2_questions from anon, authenticated;
grant select on mc2_questions to anon, authenticated;
drop policy if exists "q read" on mc2_questions;
create policy "q read" on mc2_questions for select to anon, authenticated using (true);

create or replace function mc2_rebuild_questions() returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select least(greatest(coalesce((select (value #>> '{}')::int from mc2_settings where key = 'wrong_options'), 3), 3), 4) into n;
  delete from mc2_questions q where not exists (select 1 from mc2_places p where p.id = q.place_id and p.active);
  insert into mc2_questions(place_id, question, correct, wrong, updated_at)
  select p.id, 'এটা কোন জায়গা?', p.bn,
    coalesce((
      select array_agg(o.bn) from (
        select d.bn from (
          select distinct on (x.bn) x.bn, (x.category is not distinct from p.category) as sm, random() as r
          from mc2_places x where x.active and x.bn <> p.bn order by x.bn
        ) d order by d.sm desc, d.r limit n
      ) o
    ), '{}'), now()
  from mc2_places p where p.active
  on conflict (place_id) do update set question = excluded.question, correct = excluded.correct, wrong = excluded.wrong, updated_at = now();
end $$;
revoke all on function mc2_rebuild_questions() from public, anon, authenticated;

create or replace function mc2_trg_rebuild() returns trigger language plpgsql security definer set search_path = public as $$
begin perform mc2_rebuild_questions(); return null; end $$;
drop trigger if exists t_mc2_places_q on mc2_places;
drop trigger if exists t_mc2_places_q_i on mc2_places; drop trigger if exists t_mc2_places_q_u on mc2_places; drop trigger if exists t_mc2_places_q_d on mc2_places;
create trigger t_mc2_places_q_i after insert on mc2_places for each statement execute function mc2_trg_rebuild();
create trigger t_mc2_places_q_u after update on mc2_places for each statement execute function mc2_trg_rebuild();
create trigger t_mc2_places_q_d after delete on mc2_places for each statement execute function mc2_trg_rebuild();
drop trigger if exists t_mc2_settings_q on mc2_settings;
create trigger t_mc2_settings_q after insert or update on mc2_settings for each statement execute function mc2_trg_rebuild();

-- অ্যাডমিন বাটন থেকে হাতে নতুন করে বানাতে
create or replace function mc2_admin_rebuild() returns int language plpgsql security definer set search_path = public as $$
declare c int;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  perform mc2_rebuild_questions();
  select count(*) into c from mc2_questions;
  return c;
end $$;
revoke all on function mc2_admin_rebuild() from public, anon;
grant execute on function mc2_admin_rebuild() to authenticated;

-- ---------- আগের ১৩টি স্থির ছবি অ্যাডমিন প্যানেলে আনা (একবারই; ছবির ফাইল সাইটের images/places/ ফোল্ডারেই থাকে) ----------
insert into mc2_places(bn, en, img, category)
select v.bn, v.en, v.img, v.cat from (values
  ('কলা ভবন', 'Arts Building', 'images/places/kola1.jpg', 'ক্যাম্পাসের ভবন'),
  ('কলা ভবন', 'Arts Building', 'images/places/kola2.jpg', 'ক্যাম্পাসের ভবন'),
  ('ছাত্র মিলনায়তন', 'Students Auditorium', 'images/places/chatro.jpg', 'মিলনায়তন'),
  ('মেইন গেইট', 'Main Gate', 'images/places/gate1.jpg', 'গেট ও প্রবেশপথ'),
  ('একাডেমিক ভবন (নিউ)', 'New Academic Building', 'images/places/academic.jpg', 'বিভাগ ও একাডেমিক'),
  ('কেমিস্ট্রি বিভাগ', 'Chemistry Department', 'images/places/chem.jpg', 'বিভাগ ও একাডেমিক'),
  ('জারুলতলা', 'Jarul Tola', 'images/places/jarul.jpg', 'খোলা জায়গা ও দৃশ্য'),
  ('২য় গেইট', 'Second Gate', 'images/places/gate2.jpg', 'গেট ও প্রবেশপথ'),
  ('পাখির ভিউ', 'Bird''s Eye View', 'images/places/aerial.jpg', 'খোলা জায়গা ও দৃশ্য'),
  ('পাখির ভিউয়ে পুকুর', 'Pond Bird''s Eye View', 'images/places/pond.jpg', 'খোলা জায়গা ও দৃশ্য'),
  ('প্রশাসনিক ভবন', 'Administrative Building', 'images/places/admin.jpg', 'ক্যাম্পাসের ভবন'),
  ('কলেজ ম্যাপ', 'College Map', 'images/places/map.jpg', 'খোলা জায়গা ও দৃশ্য'),
  ('মোহনা মিলনায়তন', 'Mohona Auditorium', 'images/places/mohona.jpg', 'মিলনায়তন'),
  ('গ্রন্থাগার', 'Library', 'images/places/library.jpg', 'বিভাগ ও একাডেমিক')
) as v(bn, en, img, cat)
where not exists (select 1 from mc2_places p where p.img = v.img);

-- ---------- প্রতিটি উত্তরের রেকর্ড (সঠিক/ভুল সার্ভার নিজে যাচাই করে) ----------
create table if not exists mc2_answers (
  id bigint generated always as identity primary key,
  session text not null,
  device text not null,
  name text,
  place_id bigint references mc2_places(id) on delete set null,
  place_bn text,
  chosen text,
  correct_ans text,
  is_correct boolean not null,
  skipped boolean not null default false,
  ms int,
  pts int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists mc2_answers_s on mc2_answers (session);
create index if not exists mc2_answers_p on mc2_answers (place_id);
create index if not exists mc2_answers_t on mc2_answers (created_at desc);
alter table mc2_answers enable row level security;
revoke all on mc2_answers from anon, authenticated;
grant select, delete on mc2_answers to authenticated;
drop policy if exists "answers admin" on mc2_answers;
create policy "answers admin" on mc2_answers for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

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
    values (p_session, p_device, left(trim(coalesce(p_name, '')), 30), q.place_id, q.correct, case when sk then null else ch end, q.correct, ok, sk, ms, pts);
    cnt := cnt + 1;
  end loop;
  return case when cnt > 0 then 'ok' else 'invalid' end;
exception when others then return 'invalid';
end $$;
revoke all on function mc2_submit_answers(text, text, text, jsonb) from public;
grant execute on function mc2_submit_answers(text, text, text, jsonb) to anon, authenticated;

-- ---------- ড্যাশবোর্ড (শুধু অ্যাডমিন) ----------
create or replace function mc2_dash() returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return json_build_object(
    'plays', (select count(*) from mc2_scores),
    'plays_today', (select count(*) from mc2_scores where created_at >= (date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka')),
    'avg_pct', (select coalesce(round(avg(pct)), 0)::int from mc2_scores),
    'visitors', (select count(distinct device) from mc2_visits),
    'places', (select count(*) from mc2_places),
    'active', (select count(*) from mc2_places where active),
    'questions', (select count(*) from mc2_questions),
    'answers', (select count(*) from mc2_answers),
    'correct', (select count(*) from mc2_answers where is_correct),
    'prize', (select count(*) from contest_entries),
    'days', (select coalesce(json_agg(json_build_object('d', t.d, 'n', t.n) order by t.d), '[]'::json) from (
        select (created_at at time zone 'Asia/Dhaka')::date as d, count(*) as n from mc2_scores
        where created_at > now() - interval '14 days' group by 1) t),
    'hard', (select coalesce(json_agg(json_build_object('bn', t.bn, 'n', t.n, 'pct', t.pct)), '[]'::json) from (
        select place_bn as bn, count(*) as n, round(100.0 * avg(is_correct::int))::int as pct from mc2_answers
        where place_bn is not null group by place_bn having count(*) >= 3 order by 3, 2 desc limit 8) t),
    'easy', (select coalesce(json_agg(json_build_object('bn', t.bn, 'n', t.n, 'pct', t.pct)), '[]'::json) from (
        select place_bn as bn, count(*) as n, round(100.0 * avg(is_correct::int))::int as pct from mc2_answers
        where place_bn is not null group by place_bn having count(*) >= 3 order by 3 desc, 2 desc limit 8) t),
    'cats', (select coalesce(json_agg(json_build_object('cat', t.cat, 'n', t.n, 'pct', t.pct)), '[]'::json) from (
        select coalesce(p.category, 'ক্যাটাগরিহীন') as cat, count(*) as n, round(100.0 * avg(a.is_correct::int))::int as pct
        from mc2_answers a join mc2_places p on p.id = a.place_id group by 1 order by 2 desc) t)
  );
end $$;
revoke all on function mc2_dash() from public, anon;
grant execute on function mc2_dash() to authenticated;

-- সব ঠিকঠাক চালু হলে প্রথমবার প্রশ্নগুলো এখনই তৈরি হয়ে যাক
select mc2_rebuild_questions();


-- ==================== 05_supabase-anonchat.sql ====================
-- Friend Adda — বেনামি চ্যাট (সব এক ফাইলে): বিভাগ → সেশন → চ্যাট, রিঅ্যাকশন, রিপ্লাই, Seen, নাম Edit, মোছা, ফাইল আপলোড + ON/OFF।
-- Supabase SQL Editor-এ একবার চালান। আগে supabase-community.sql চালানো থাকতে হবে। আবার চালালেও ক্ষতি নেই।
create table if not exists mc2_ac_depts (id serial primary key, name text not null unique check (char_length(name) between 1 and 60), sort int not null default 100, active boolean not null default true);
create table if not exists mc2_ac_sessions (id serial primary key, dept_id int not null references mc2_ac_depts(id) on delete cascade, name text not null check (char_length(name) between 1 and 40), sort int not null default 100, active boolean not null default true, unique (dept_id, name));
create table if not exists mc2_ac_messages (id bigserial primary key, dept_id int not null references mc2_ac_depts(id) on delete cascade, session_id int not null references mc2_ac_sessions(id) on delete cascade, nick text not null, body text not null, voter text not null, ip text, hidden boolean not null default false, created_at timestamptz not null default now());
create index if not exists mc2_ac_m on mc2_ac_messages (session_id, id desc);

alter table mc2_ac_depts enable row level security; alter table mc2_ac_sessions enable row level security; alter table mc2_ac_messages enable row level security;
revoke all on mc2_ac_depts, mc2_ac_sessions, mc2_ac_messages from anon, authenticated;
grant select on mc2_ac_depts, mc2_ac_sessions to anon;
grant select, insert, update, delete on mc2_ac_depts, mc2_ac_sessions, mc2_ac_messages to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select (id, session_id, nick, body, created_at) on mc2_ac_messages to anon;

drop policy if exists "ac d read" on mc2_ac_depts; drop policy if exists "ac d admin" on mc2_ac_depts;
drop policy if exists "ac s read" on mc2_ac_sessions; drop policy if exists "ac s admin" on mc2_ac_sessions;
drop policy if exists "ac m read" on mc2_ac_messages; drop policy if exists "ac m admin" on mc2_ac_messages;
create policy "ac d read" on mc2_ac_depts for select to anon using (active);
create policy "ac s read" on mc2_ac_sessions for select to anon using (active and exists (select 1 from mc2_ac_depts d where d.id = dept_id and d.active));
create policy "ac m read" on mc2_ac_messages for select to anon using (not hidden);
create policy "ac d admin" on mc2_ac_depts for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
create policy "ac s admin" on mc2_ac_sessions for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
create policy "ac m admin" on mc2_ac_messages for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

alter table mc2_ac_messages
  add column if not exists reply_to bigint, add column if not exists reply_nick text, add column if not exists reply_text text,
  add column if not exists kind text not null default 'text', add column if not exists file_path text, add column if not exists file_name text,
  add column if not exists file_size bigint, add column if not exists file_mime text, add column if not exists deleted boolean not null default false;
grant select (id, session_id, nick, body, created_at, reply_to, reply_nick, reply_text, kind, file_path, file_name, file_size, file_mime, deleted) on mc2_ac_messages to anon;

-- সেটিংস: আপলোড ON/OFF (অ্যাডমিন প্যানেল থেকে বদলায়)
create table if not exists mc2_ac_cfg (key text primary key, value jsonb not null);
alter table mc2_ac_cfg enable row level security;
revoke all on mc2_ac_cfg from anon, authenticated;
grant select on mc2_ac_cfg to anon; grant select, insert, update, delete on mc2_ac_cfg to authenticated;
drop policy if exists "ac c read" on mc2_ac_cfg; drop policy if exists "ac c admin" on mc2_ac_cfg;
create policy "ac c read" on mc2_ac_cfg for select to anon using (true);
create policy "ac c admin" on mc2_ac_cfg for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
insert into mc2_ac_cfg(key, value) values ('upload', 'true') on conflict do nothing;
create or replace function mc2_ac_upload_on() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true'::jsonb from mc2_ac_cfg where key = 'upload'), true) $$;
grant execute on function mc2_ac_upload_on() to anon, authenticated;

-- ফাইল স্টোরেজ (সর্বোচ্চ ২৫ MB; OFF থাকলে সরাসরি আপলোডও বন্ধ; এক্সিকিউটেবল/HTML/SVG/JS নিষেধ)
insert into storage.buckets (id, name, public, file_size_limit) values ('mc2-chat', 'mc2-chat', true, 26214400)
  on conflict (id) do update set public = true, file_size_limit = 26214400;
drop policy if exists "ac up" on storage.objects;
create policy "ac up" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'mc2-chat' and mc2_ac_upload_on() and name ~ '^[0-9]+/[A-Za-z0-9._-]+$' and name !~* '\.(exe|bat|cmd|sh|apk|msi|js|mjs|html?|svg|php|jar|scr|com)$');

-- রিঅ্যাকশন, Seen
create table if not exists mc2_ac_reactions (message_id bigint not null references mc2_ac_messages(id) on delete cascade, voter text not null, emoji text not null check (char_length(emoji) between 1 and 16), primary key (message_id, voter));
create table if not exists mc2_ac_seen (session_id int not null references mc2_ac_sessions(id) on delete cascade, voter text not null, nick text, last_id bigint not null default 0, at timestamptz not null default now(), primary key (session_id, voter));
alter table mc2_ac_reactions enable row level security; alter table mc2_ac_seen enable row level security;
revoke all on mc2_ac_reactions, mc2_ac_seen from anon, authenticated;
grant select, delete on mc2_ac_reactions, mc2_ac_seen to authenticated;
drop policy if exists "ac r admin" on mc2_ac_reactions; drop policy if exists "ac se admin" on mc2_ac_seen;
create policy "ac r admin" on mc2_ac_reactions for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
create policy "ac se admin" on mc2_ac_seen for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

-- বার্তা পাঠানো (টেক্সট বা ফাইল, রিপ্লাইসহ)। ফল: id>0 সফল | 0 সেশন বন্ধ | -1 ভুল/খুব দ্রুত | -2 আপলোড বন্ধ
drop function if exists mc2_ac_send(int, text, text, text);
create or replace function mc2_ac_send(p_session int, p_nick text, p_body text, p_voter text, p_reply bigint default null, p_kind text default 'text', p_path text default null, p_fname text default null, p_size bigint default null, p_mime text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare q record; b text := btrim(coalesce(p_body, '')); n text := left(btrim(coalesce(p_nick, '')), 30); v text := left(coalesce(p_voter, ''), 80); k text := coalesce(p_kind, 'text'); r bigint; rid bigint; rn text; rt text;
begin
  select s.id, s.dept_id into q from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.id = p_session and s.active and d.active;
  if not found then return 0; end if;
  if k not in ('text', 'image', 'video', 'audio', 'file') or char_length(b) > 400 or v = '' then return -1; end if;
  if k = 'text' then
    if char_length(b) < 1 then return -1; end if;
  else
    if not mc2_ac_upload_on() then return -2; end if;
    if p_path is null or p_path not like p_session::text || '/%' or not exists (select 1 from storage.objects where bucket_id = 'mc2-chat' and name = p_path) then return -1; end if;
  end if;
  if n = '' then n := 'বেনামি'; end if;
  if exists (select 1 from mc2_ac_messages where voter = v and created_at > now() - interval '2 seconds') then return -1; end if;
  if (select count(*) from mc2_ac_messages where voter = v and created_at > now() - interval '1 minute') >= 20 then return -1; end if;
  if p_reply is not null then
    select id, nick, left(case when deleted then 'মুছে ফেলা বার্তা' when body = '' then '📎 ' || coalesce(file_name, 'ফাইল') else body end, 80) into rid, rn, rt
      from mc2_ac_messages where id = p_reply and session_id = p_session and not hidden;
  end if;
  insert into mc2_ac_messages(dept_id, session_id, nick, body, voter, ip, reply_to, reply_nick, reply_text, kind, file_path, file_name, file_size, file_mime)
  values (q.dept_id, q.id, n, b, v, mc2_ip(), rid, rn, rt, k, case when k = 'text' then null else p_path end, case when k = 'text' then null else left(p_fname, 120) end, case when k = 'text' then null else p_size end, case when k = 'text' then null else left(p_mime, 100) end)
  returning id into r;
  return r;
end $$;
grant execute on function mc2_ac_send(int, text, text, text, bigint, text, text, text, bigint, text) to anon, authenticated;

-- Delete for Everyone: নিজের বার্তা, ৫ মিনিটের মধ্যে (সার্ভার যাচাই করে)
create or replace function mc2_ac_unsend(p_msg bigint, p_voter text) returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  update mc2_ac_messages set deleted = true, body = '', kind = 'text', file_path = null, file_name = null, file_size = null, file_mime = null, reply_to = null, reply_nick = null, reply_text = null
    where id = p_msg and voter = p_voter and not deleted and created_at > now() - interval '5 minutes';
  get diagnostics c = row_count;
  if c > 0 then delete from mc2_ac_reactions where message_id = p_msg; update mc2_ac_messages set reply_text = 'মুছে ফেলা বার্তা' where reply_to = p_msg; end if;
  return c > 0;
end $$;
grant execute on function mc2_ac_unsend(bigint, text) to anon, authenticated;

-- রিঅ্যাকশন (একই ইমোজি আবার চাপলে সরে যায়)
create or replace function mc2_ac_react(p_msg bigint, p_voter text, p_emoji text) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_voter, '') = '' or char_length(coalesce(p_emoji, '')) not between 1 and 16 then return; end if;
  if not exists (select 1 from mc2_ac_messages m join mc2_ac_sessions s on s.id = m.session_id join mc2_ac_depts d on d.id = s.dept_id where m.id = p_msg and not m.hidden and not m.deleted and s.active and d.active) then return; end if;
  if exists (select 1 from mc2_ac_reactions where message_id = p_msg and voter = p_voter and emoji = p_emoji) then delete from mc2_ac_reactions where message_id = p_msg and voter = p_voter;
  else insert into mc2_ac_reactions(message_id, voter, emoji) values (p_msg, p_voter, p_emoji) on conflict (message_id, voter) do update set emoji = excluded.emoji; end if;
end $$;
grant execute on function mc2_ac_react(bigint, text, text) to anon, authenticated;

-- Seen
create or replace function mc2_ac_seen(p_session int, p_voter text, p_nick text, p_last bigint) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_voter, '') = '' or not exists (select 1 from mc2_ac_sessions where id = p_session) then return; end if;
  insert into mc2_ac_seen(session_id, voter, nick, last_id) values (p_session, left(p_voter, 80), left(p_nick, 30), coalesce(p_last, 0))
  on conflict (session_id, voter) do update set last_id = greatest(mc2_ac_seen.last_id, excluded.last_id), nick = excluded.nick, at = now();
end $$;
grant execute on function mc2_ac_seen(int, text, text, bigint) to anon, authenticated;
create or replace function mc2_ac_seenlist(p_msg bigint) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(s.nick order by s.at), '[]'::jsonb) from mc2_ac_seen s join mc2_ac_messages m on m.session_id = s.session_id where m.id = p_msg and s.last_id >= m.id and s.voter <> m.voter $$;
grant execute on function mc2_ac_seenlist(bigint) to anon, authenticated;

-- নাম Edit: আগের বার্তার নামও বদলায়
create or replace function mc2_ac_rename(p_voter text, p_nick text) returns void language plpgsql security definer set search_path = public as $$
declare n text := left(btrim(coalesce(p_nick, '')), 30);
begin
  if n = '' or coalesce(p_voter, '') = '' then return; end if;
  update mc2_ac_messages set nick = n where voter = p_voter and nick <> n;
  update mc2_ac_seen set nick = n where voter = p_voter;
end $$;
grant execute on function mc2_ac_rename(text, text) to anon, authenticated;

-- পোলিং: আপলোড চালু কিনা + প্রতি বার্তার রিঅ্যাকশন/Seen/মোছা/মালিক
create or replace function mc2_ac_meta(p_session int, p_min bigint, p_voter text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('up', mc2_ac_upload_on(), 'rows', coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', m.id, 'n', m.nick, 'd', m.deleted, 'o', m.voter = p_voter,
      'r', (select coalesce(jsonb_object_agg(e, c), '{}'::jsonb) from (select emoji e, count(*) c from mc2_ac_reactions r where r.message_id = m.id group by emoji) z),
      'm', (select emoji from mc2_ac_reactions r where r.message_id = m.id and r.voter = p_voter),
      's', (select count(*) from mc2_ac_seen s where s.session_id = m.session_id and s.last_id >= m.id and s.voter <> m.voter)) x
    from mc2_ac_messages m where m.session_id = p_session and m.id >= p_min and not m.hidden order by m.id desc limit 500) t), '[]'::jsonb)) $$;
grant execute on function mc2_ac_meta(int, bigint, text) to anon, authenticated;

-- শুরুর তালিকা: আগের চ্যাট গ্রুপের নাম থেকে বিভাগ, প্রতিটিতে ২০১৭-১৮ থেকে ২০২৫-২৬ সেশন (অ্যাডমিন প্যানেলে বদলানো যাবে)
insert into mc2_ac_depts(name, sort) select name, sort from mc2_chat_rooms where name <> 'ক্যাম্পাস লাউঞ্জ' on conflict do nothing;
insert into mc2_ac_sessions(dept_id, name, sort) select d.id, x.n, x.o from mc2_ac_depts d,
  (values ('২০১৭-১৮',1),('২০১৮-১৯',2),('২০১৯-২০',3),('২০২০-২১',4),('২০২১-২২',5),('২০২২-২৩',6),('২০২৩-২৪',7),('২০২৪-২৫',8),('২০২৫-২৬',9),('অ্যালামনাই',10)) as x(n, o)
  on conflict do nothing;


-- ==================== 06_supabase-userinfo.sql ====================
-- Friend Adda — User Info, অনলাইন স্ট্যাটাস, Visitor List, Join/Leave, Last Active (একটাই ফাইল)
-- Supabase SQL Editor-এ পুরোটা পেস্ট করে একবার Run। আগের সব SQL (contest, community, titles, gallery, anonchat) চালানো থাকতে হবে। আবার চালালেও ক্ষতি নেই।
-- ⚠️ এটা চালানোর পরে নতুন সাইট ফাইল (presence.js, anonchat.js, contest.js ইত্যাদি) আপলোড করুন।

-- পুরস্কার ফর্মের সাথে ডিভাইস মেলাতে (ঐচ্ছিক কলাম; পুরোনো জমা এতে খালি থাকবে)
alter table contest_entries add column if not exists device text;
drop function if exists submit_entry(text, text, text, text, int, int);
create or replace function submit_entry(p_name text, p_link text, p_shot text, p_contact text, p_pct int, p_score int, p_device text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 60 then raise exception 'bad name'; end if;
  if p_link is null or length(p_link) > 400 or p_link !~* '^https?://([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch|fb\.me)/' then raise exception 'bad link'; end if;
  if p_shot is null or length(p_shot) > 500 then raise exception 'bad shot'; end if;
  insert into contest_entries (name, fb_link, shot_url, contact, pct, score, device)
  values (trim(p_name), trim(p_link), p_shot, nullif(left(trim(coalesce(p_contact, '')), 300), ''), p_pct, p_score, nullif(left(coalesce(p_device, ''), 80), ''))
  returning id into v;
  return v;
exception when unique_violation then
  raise exception 'duplicate';
end $$;
revoke all on function submit_entry(text, text, text, text, int, int, text) from public;
grant execute on function submit_entry(text, text, text, text, int, int, text) to anon;

-- সহায়ক ফাংশন: পাবলিক ইউজার আইডি (ডিভাইস আইডি থেকে ফেরানো যায় না) ও অনলাইন নিয়ম (১০০ সেকেন্ডের মধ্যে সাড়া পেলে অনলাইন)
create or replace function mc2_uid(v text) returns text language sql immutable as $$ select 'U' || upper(substr(md5('mc2|' || coalesce(v, '')), 1, 7)) $$;
create or replace function mc2_online(ls timestamptz, off boolean) returns boolean language sql stable as $$ select not coalesce(off, false) and ls > now() - interval '100 seconds' $$;
grant execute on function mc2_uid(text), mc2_online(timestamptz, boolean) to anon, authenticated;

-- উপস্থিতি টেবিল (প্রতি ডিভাইসে একটা সারি); সরাসরি শুধু অ্যাডমিন পড়তে পারে
create table if not exists mc2_presence (
  voter text primary key,
  nick text, game_name text, game_dept text, game_batch text,
  chat_dept text, chat_session text, chat_dept_id int, chat_session_id int,
  page text, ip text, country text, region text, city text, ua text, info jsonb,
  first_seen timestamptz not null default now(), last_seen timestamptz not null default now(), joined_at timestamptz not null default now(),
  visits int not null default 1, offline boolean not null default false
);
create index if not exists mc2_presence_ls on mc2_presence (last_seen desc);
alter table mc2_presence enable row level security;
revoke all on mc2_presence from anon, authenticated;
grant select, delete on mc2_presence to authenticated;
drop policy if exists "pres admin" on mc2_presence;
create policy "pres admin" on mc2_presence for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

-- সাইট থেকে হার্টবিট (প্রতি ৩০ সেকেন্ডে)। আইপি ও আনুমানিক লোকেশন সার্ভার নিজে হেডার থেকে নেয় (দেশ প্রায় সবসময়, শহর/অঞ্চল সবসময় নয়)
create or replace function mc2_presence_ping(p_device text, p_nick text, p_gname text, p_gdept text, p_gbatch text, p_cdept text, p_csess text, p_cdept_id int, p_csess_id int, p_page text, p_info jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v text := left(coalesce(p_device, ''), 40); o record;
begin
  if char_length(v) < 8 then return; end if;
  select last_seen, offline into o from mc2_presence where voter = v;
  if found and o.last_seen > now() - interval '3 seconds' and not o.offline then return; end if;
  insert into mc2_presence(voter, nick, game_name, game_dept, game_batch, chat_dept, chat_session, chat_dept_id, chat_session_id, page, ip, country, region, city, ua, info)
  values (v, nullif(left(btrim(coalesce(p_nick, '')), 30), ''), nullif(left(btrim(coalesce(p_gname, '')), 30), ''), nullif(left(p_gdept, 60), ''), nullif(left(p_gbatch, 40), ''),
    nullif(left(p_cdept, 60), ''), nullif(left(p_csess, 40), ''), p_cdept_id, p_csess_id, left(p_page, 60), mc2_ip(), left(mc2_hdr('cf-ipcountry'), 8), left(mc2_hdr('cf-region'), 60), left(mc2_hdr('cf-ipcity'), 60),
    left(mc2_hdr('user-agent'), 400), case when p_info is not null and pg_column_size(p_info) < 3000 then p_info end)
  on conflict (voter) do update set
    nick = excluded.nick, game_name = excluded.game_name, game_dept = excluded.game_dept, game_batch = excluded.game_batch,
    chat_dept = excluded.chat_dept, chat_session = excluded.chat_session, chat_dept_id = excluded.chat_dept_id, chat_session_id = excluded.chat_session_id,
    page = excluded.page, ip = coalesce(excluded.ip, mc2_presence.ip), country = coalesce(excluded.country, mc2_presence.country), region = coalesce(excluded.region, mc2_presence.region), city = coalesce(excluded.city, mc2_presence.city),
    ua = coalesce(excluded.ua, mc2_presence.ua), info = coalesce(excluded.info, mc2_presence.info),
    joined_at = case when mc2_presence.offline or mc2_presence.last_seen < now() - interval '100 seconds' then now() else mc2_presence.joined_at end,
    visits = mc2_presence.visits + case when mc2_presence.offline or mc2_presence.last_seen < now() - interval '30 minutes' then 1 else 0 end,
    last_seen = now(), offline = false;
end $$;
grant execute on function mc2_presence_ping(text, text, text, text, text, text, text, int, int, text, jsonb) to anon, authenticated;

-- পেজ বন্ধ করলে সাথে সাথে অফলাইন
create or replace function mc2_presence_leave(p_device text) returns void language sql security definer set search_path = public as $$
  update mc2_presence set offline = true where voter = left(coalesce(p_device, ''), 40) $$;
grant execute on function mc2_presence_leave(text) to anon, authenticated;

-- চ্যাটের পোলিং: আগের সব কিছু + প্রতি বার্তায় ইউজার আইডি ('u') ও অনলাইন ('a'), আর রুমে অনলাইন সংখ্যা ('on')
create or replace function mc2_ac_meta(p_session int, p_min bigint, p_voter text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('up', mc2_ac_upload_on(),
    'on', (select count(*) from mc2_presence p where p.chat_session_id = p_session and p.page = '#anon' and mc2_online(p.last_seen, p.offline)),
    'rows', coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', m.id, 'n', m.nick, 'd', m.deleted, 'o', m.voter = p_voter, 'u', mc2_uid(m.voter),
      'a', exists (select 1 from mc2_presence p where p.voter = m.voter and mc2_online(p.last_seen, p.offline)),
      'r', (select coalesce(jsonb_object_agg(e, c), '{}'::jsonb) from (select emoji e, count(*) c from mc2_ac_reactions r where r.message_id = m.id group by emoji) z),
      'm', (select emoji from mc2_ac_reactions r where r.message_id = m.id and r.voter = p_voter),
      's', (select count(*) from mc2_ac_seen s where s.session_id = m.session_id and s.last_id >= m.id and s.voter <> m.voter)) x
    from mc2_ac_messages m where m.session_id = p_session and m.id >= p_min and not m.hidden order by m.id desc limit 500) t), '[]'::jsonb)) $$;
grant execute on function mc2_ac_meta(int, bigint, text) to anon, authenticated;

-- চ্যাটের User Info (সবাই দেখে): সদস্য তালিকা। আইপি/ডিভাইস/লোকেশন/ফোন এখানে নেই।
create or replace function mc2_ac_members(p_session int) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.onl desc, x.ls desc nulls last), '[]'::jsonb) from (
    select mc2_uid(v.voter) u,
      coalesce((select m.nick from mc2_ac_messages m where m.voter = v.voter and m.session_id = p_session order by m.id desc limit 1), p.nick, 'বেনামি') n,
      coalesce(mc2_online(p.last_seen, p.offline), false) onl,
      (extract(epoch from p.last_seen) * 1000)::bigint ls
    from (select voter from mc2_ac_messages where session_id = p_session and not hidden and created_at > now() - interval '30 days' group by voter
          union select voter from mc2_presence where chat_session_id = p_session and page = '#anon' and mc2_online(last_seen, offline)) v
    left join mc2_presence p on p.voter = v.voter
    limit 80) x $$;
grant execute on function mc2_ac_members(int) to anon, authenticated;

-- চ্যাটে নাম ক্লিক করলে: ইউজার কার্ড (সবাই দেখে; শুধু নাম, আইডি, বিভাগ, সেশন, স্কোর, অনলাইন, Last Active)
create or replace function mc2_ac_usercard(p_session int, p_uid text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v text; p mc2_presence; dn text; sn text;
begin
  select m.voter into v from mc2_ac_messages m where m.session_id = p_session and mc2_uid(m.voter) = p_uid limit 1;
  if v is null then select pr.voter into v from mc2_presence pr where pr.chat_session_id = p_session and mc2_uid(pr.voter) = p_uid limit 1; end if;
  if v is null then return null; end if;
  select * into p from mc2_presence where voter = v;
  select d.name, s.name into dn, sn from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.id = p_session;
  return jsonb_build_object('u', p_uid,
    'n', coalesce((select m.nick from mc2_ac_messages m where m.voter = v and m.session_id = p_session order by m.id desc limit 1), p.nick, 'বেনামি'),
    'dept', dn, 'sess', sn,
    'best', (select max(score) from mc2_scores where device = v), 'pct', (select max(pct) from mc2_scores where device = v), 'plays', (select count(*) from mc2_scores where device = v),
    'onl', coalesce(mc2_online(p.last_seen, p.offline), false), 'ls', (extract(epoch from p.last_seen) * 1000)::bigint,
    'msgs', (select count(*) from mc2_ac_messages where voter = v and session_id = p_session and not deleted));
end $$;
grant execute on function mc2_ac_usercard(int, text) to anon, authenticated;

-- ---------- অ্যাডমিন (শুধু mc2_admins; সার্ভারেও যাচাই) ----------
-- ড্যাশবোর্ডের অনলাইন বক্স (প্রতি ৮ সেকেন্ডে পোল): অনলাইন সংখ্যা, আজকের ও মোট ভিজিটর, অনলাইন তালিকা
create or replace function mc2_admin_online() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare dday date := (now() at time zone 'Asia/Dhaka')::date;
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'online', (select count(*) from mc2_presence where mc2_online(last_seen, offline)),
    'today', (select count(*) from mc2_presence where (last_seen at time zone 'Asia/Dhaka')::date = dday),
    'total', (select count(*) from mc2_presence),
    'rows', coalesce((select jsonb_agg(to_jsonb(t) order by t.ls desc) from (
      select p.voter v, mc2_uid(p.voter) u, coalesce(p.game_name, p.nick, 'অজানা') n, coalesce(p.game_dept, p.chat_dept) d, coalesce(p.game_batch, p.chat_session) s, p.page pg,
        (extract(epoch from p.last_seen) * 1000)::bigint ls
      from mc2_presence p where mc2_online(p.last_seen, p.offline) order by p.last_seen desc limit 200) t), '[]'::jsonb));
end $$;
revoke all on function mc2_admin_online() from public, anon; grant execute on function mc2_admin_online() to authenticated;

-- Visitor List (খোঁজা, শুধু অনলাইন ফিল্টার, পেজিং)
create or replace function mc2_admin_users(p_q text default '', p_online boolean default false, p_limit int default 50, p_offset int default 0) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := '%' || lower(btrim(coalesce(p_q, ''))) || '%'; t int; r jsonb;
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  select count(*) into t from mc2_presence p where (not p_online or mc2_online(p.last_seen, p.offline))
    and (q = '%%' or lower(concat_ws(' ', p.nick, p.game_name, p.game_dept, p.game_batch, p.chat_dept, p.chat_session, p.ip, mc2_uid(p.voter))) like q);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.ls desc), '[]'::jsonb) into r from (
    select p.voter, mc2_uid(p.voter) uid, p.nick, p.game_name gname, p.game_dept gdept, p.game_batch gbatch, p.chat_dept cdept, p.chat_session csess, p.page, p.ip, p.country, p.region, p.city, left(p.ua, 200) ua, p.visits,
      (extract(epoch from p.last_seen) * 1000)::bigint ls, mc2_online(p.last_seen, p.offline) online, (select max(s.score) from mc2_scores s where s.device = p.voter) best
    from mc2_presence p where (not p_online or mc2_online(p.last_seen, p.offline))
      and (q = '%%' or lower(concat_ws(' ', p.nick, p.game_name, p.game_dept, p.game_batch, p.chat_dept, p.chat_session, p.ip, mc2_uid(p.voter))) like q)
    order by p.last_seen desc limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)) x;
  return jsonb_build_object('total', t, 'rows', r);
end $$;
revoke all on function mc2_admin_users(text, boolean, int, int) from public, anon; grant execute on function mc2_admin_users(text, boolean, int, int) to authenticated;

-- নাম ক্লিক করলে পুরো User Info (ডিভাইস আইডি দিয়ে)। প্রেজেন্স না থাকলে স্কোর/ভিজিট/বার্তার লগ থেকে যা পাওয়া যায়।
create or replace function mc2_admin_user(p_voter text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p mc2_presence; v text := left(coalesce(p_voter, ''), 80);
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  select * into p from mc2_presence where voter = v;
  return jsonb_build_object('voter', v, 'uid', mc2_uid(v), 'known', p.voter is not null,
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

notify pgrst, 'reload schema';


-- ==================== 07_supabase-moderation.sql ====================
-- Friend Adda — চ্যাট মডারেশন + ফাইল নিরাপত্তা + রেট লিমিট (বেনামি চ্যাটের জন্য)
-- কী আছে: রিপোর্ট (কারণ + ইতিহাস), সতর্কতা, সাময়িক Restriction/Ban, Unban, ৩টি বৈধ রিপোর্টে Review,
--          যাচাই (Verify) ছাড়া স্থায়ী ব্যান নয়, Input Validation, Rate Limiting, ফাইলের ধরন/সাইজ/মাইম যাচাই (সার্ভারে)।
-- চালানোর ক্রম: supabase-gallery.sql -> supabase-anonchat.sql -> supabase-userinfo.sql -> এই ফাইল। আবার চালালেও ক্ষতি নেই।
-- (supabase-pending-all.sql-এ সবই এই ক্রমে একসাথে আছে।)

-- ========== ১) রেট লিমিটার (ভেতরের কাজে; ক্লায়েন্ট সরাসরি ডাকতে পারে না) ==========
create table if not exists mc2_ac_rl (k text primary key, ws timestamptz not null default now(), n int not null default 0);
alter table mc2_ac_rl enable row level security;
revoke all on mc2_ac_rl from anon, authenticated;
create or replace function mc2_ac_rl(p_k text, p_limit int, p_secs int) returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into mc2_ac_rl(k, ws, n) values (p_k, now(), 1)
  on conflict (k) do update set
    n = case when mc2_ac_rl.ws < now() - make_interval(secs => p_secs) then 1 else mc2_ac_rl.n + 1 end,
    ws = case when mc2_ac_rl.ws < now() - make_interval(secs => p_secs) then now() else mc2_ac_rl.ws end
  returning n into c;
  if random() < 0.01 then delete from mc2_ac_rl where ws < now() - interval '1 day'; end if;
  return c <= p_limit;
end $$;
revoke all on function mc2_ac_rl(text, int, int) from public, anon, authenticated;

-- ========== ২) ইনপুট পরিষ্কার (কন্ট্রোল/বাইডি-ওভাররাইড অক্ষর বাদ; বাংলার ZWJ/ZWNJ রাখা হয়) ==========
create or replace function mc2_ac_clean(t text, p_len int) returns text language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(t, ''), E'[[:cntrl:]\\u200B\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]', '', 'g')), p_len) $$;

-- ========== ৩) অনুমোদিত ফাইলের তালিকা: এক্সটেনশন -> [ধরন, মাইম, সর্বোচ্চ MB] ==========
-- (ক্লায়েন্টের anonchat.js-এর FT তালিকার সাথে মিল রাখুন। SVG/HTML/JS/EXE/ZIP ইচ্ছা করেই নেই।)
create or replace function mc2_ac_ftypes() returns jsonb language sql immutable as $$ select '{
 "jpg":["image","image/jpeg",10],"jpeg":["image","image/jpeg",10],"png":["image","image/png",10],"gif":["image","image/gif",10],"webp":["image","image/webp",10],
 "mp4":["video","video/mp4",25],"webm":["video","video/webm",25],"mov":["video","video/quicktime",25],
 "mp3":["audio","audio/mpeg",15],"m4a":["audio","audio/mp4",15],"wav":["audio","audio/wav",15],"ogg":["audio","audio/ogg",15],"aac":["audio","audio/aac",15],
 "pdf":["file","application/pdf",15],"txt":["file","text/plain",2],"csv":["file","text/csv",5],
 "doc":["file","application/msword",15],
 "docx":["file","application/vnd.openxmlformats-officedocument.wordprocessingml.document",15],
 "xls":["file","application/vnd.ms-excel",15],
 "xlsx":["file","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",15],
 "ppt":["file","application/vnd.ms-powerpoint",25],
 "pptx":["file","application/vnd.openxmlformats-officedocument.presentationml.presentation",25]}'::jsonb $$;
grant execute on function mc2_ac_ftypes() to anon, authenticated;

-- ========== ৪) মডারেশন টেবিল (সবই RLS চালু, সরাসরি অ্যাক্সেস বন্ধ; শুধু নিচের RPC দিয়ে) ==========
alter table mc2_ac_messages add column if not exists mod_removed boolean not null default false;
grant select (mod_removed) on mc2_ac_messages to anon;
create unique index if not exists mc2_ac_m_file on mc2_ac_messages (file_path) where file_path is not null;

create table if not exists mc2_ac_mod (
  voter text primary key,
  state text not null default 'ok' check (state in ('ok', 'restricted', 'banned')),
  until timestamptz,                         -- restricted: বাধ্যতামূলক; banned: খালি = স্থায়ী
  reason text,
  review boolean not null default false,     -- ৩টি বৈধ রিপোর্ট হলে true (অ্যাডমিনের Review তালিকায় আসে)
  review_at timestamptz,
  verified boolean not null default false,   -- যাচাই শেষ (স্থায়ী ব্যানের শর্ত)
  verified_by text, verified_at timestamptz, verified_note text,
  warns int not null default 0,
  updated_at timestamptz not null default now(),
  check (state <> 'restricted' or until is not null)
);
create table if not exists mc2_ac_modlog (
  id bigserial primary key, voter text, action text not null, reason text, until timestamptz,
  admin text, msg_id bigint, report_id bigint, created_at timestamptz not null default now()
);
create index if not exists mc2_ac_modlog_v on mc2_ac_modlog (voter, id desc);
create table if not exists mc2_ac_warns (
  id bigserial primary key, voter text not null, reason text not null, msg_id bigint,
  acked boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists mc2_ac_warns_v on mc2_ac_warns (voter, acked);
create table if not exists mc2_ac_reports (
  id bigserial primary key,
  message_id bigint references mc2_ac_messages(id) on delete set null,
  session_id int, target text not null, target_nick text, reporter text not null,
  reason text not null check (reason in ('abuse', 'harass', 'threat', 'adult', 'spam', 'privacy', 'illegal', 'other')),
  note text check (note is null or char_length(note) <= 200),
  snap_body text, snap_kind text, snap_file text, snap_fname text,   -- রিপোর্টের সময়ের কপি (পরে মুছলেও প্রমাণ থাকে)
  status text not null default 'open' check (status in ('open', 'valid', 'rejected')),
  reviewed_by text, reviewed_at timestamptz, admin_note text,
  created_at timestamptz not null default now(),
  unique (message_id, reporter)
);
create index if not exists mc2_ac_reports_t on mc2_ac_reports (target, status);
create index if not exists mc2_ac_reports_s on mc2_ac_reports (status, id desc);
alter table mc2_ac_mod enable row level security; alter table mc2_ac_modlog enable row level security;
alter table mc2_ac_warns enable row level security; alter table mc2_ac_reports enable row level security;
revoke all on mc2_ac_mod, mc2_ac_modlog, mc2_ac_warns, mc2_ac_reports from anon, authenticated;

-- ========== ৫) ভেতরের সহায়ক ফাংশন ==========
create or replace function mc2_ac_adm() returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'অনুমতি নেই' using errcode = '42501'; end if;
  return coalesce(auth.jwt() ->> 'email', 'admin');
end $$;
revoke all on function mc2_ac_adm() from public, anon;
grant execute on function mc2_ac_adm() to authenticated;

create or replace function mc2_ac_block(p_voter text) returns text language sql stable security definer set search_path = public as $$
  select case when m.state = 'banned' and (m.until is null or m.until > now()) then 'banned'
              when m.state = 'restricted' and m.until > now() then 'restricted' end
  from mc2_ac_mod m where m.voter = p_voter $$;
revoke all on function mc2_ac_block(text) from public, anon, authenticated;

create or replace function mc2_ac_me(p_voter text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    's', coalesce(mc2_ac_block(p_voter), 'ok'),
    'u', (select case when m.until is not null then (extract(epoch from m.until) * 1000)::bigint end from mc2_ac_mod m where m.voter = p_voter),
    'r', (select m.reason from mc2_ac_mod m where m.voter = p_voter and mc2_ac_block(p_voter) is not null),
    'w', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'r', w.reason) order by w.id) from mc2_ac_warns w where w.voter = p_voter and not w.acked), '[]'::jsonb)) $$;
revoke all on function mc2_ac_me(text) from public, anon, authenticated;

create or replace function mc2_ac_log(p_voter text, p_action text, p_reason text, p_until timestamptz, p_admin text, p_msg bigint default null, p_report bigint default null) returns void
language sql security definer set search_path = public as $$
  insert into mc2_ac_modlog(voter, action, reason, until, admin, msg_id, report_id) values (p_voter, p_action, p_reason, p_until, p_admin, p_msg, p_report) $$;
revoke all on function mc2_ac_log(text, text, text, timestamptz, text, bigint, bigint) from public, anon, authenticated;

-- ফাইল আপলোডের সরাসরি Storage পথেও রেট লিমিট (আইপি না পেলে আটকায় না — সবাইকে একসাথে আটকানো এড়াতে)
create or replace function mc2_ac_upload_gate() returns boolean language plpgsql security definer set search_path = public as $$
declare ip text := mc2_ip();
begin
  if ip is null then return true; end if;
  return mc2_ac_rl('up:ip:' || ip || ':60', 20, 60);
end $$;
grant execute on function mc2_ac_upload_gate() to anon, authenticated;

-- ========== ৬) নিরাপদ ফাইল স্টোরেজ ==========
-- বাকেটে শুধু অনুমোদিত মাইম; সর্বোচ্চ ২৫ MB। আপলোড পলিসি: ON/OFF সুইচ + কঠোর নাম + অনুমোদিত এক্সটেনশন + সেশন আছে + রেট লিমিট।
do $$ begin
  update storage.buckets set public = true, file_size_limit = 26214400,
    allowed_mime_types = (select array_agg(distinct e.v ->> 1) from jsonb_each(mc2_ac_ftypes()) e(k, v))
  where id = 'mc2-chat';
exception when undefined_column then
  update storage.buckets set public = true, file_size_limit = 26214400 where id = 'mc2-chat';
end $$;
drop policy if exists "ac up" on storage.objects;
create policy "ac up" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'mc2-chat' and mc2_ac_upload_on()
    and name ~ '^[0-9]{1,9}/[a-z0-9]{8,40}\.[a-z0-9]{1,5}$'
    and (mc2_ac_ftypes() -> lower(substring(name from '\.([A-Za-z0-9]+)$'))) is not null
    and split_part(name, '/', 1) in (select id::text from mc2_ac_sessions)
    and mc2_ac_upload_gate());
-- অ্যাডমিন বার্তা মুছলে ফাইলও বাকেট থেকে মুছতে পারবে
drop policy if exists "ac adm sel" on storage.objects; drop policy if exists "ac adm del" on storage.objects;
create policy "ac adm sel" on storage.objects for select to authenticated using (bucket_id = 'mc2-chat' and mc2_is_admin());
create policy "ac adm del" on storage.objects for delete to authenticated using (bucket_id = 'mc2-chat' and mc2_is_admin());

-- ========== ৭) বার্তা পাঠানো (সব যাচাই সার্ভারে) ==========
-- ফল: id>0 সফল | 0 সেশন বন্ধ | -1 ভুল ইনপুট | -2 আপলোড বন্ধ | -3 ব্যান/Restriction | -4 খুব দ্রুত/বেশি | -5 ফাইল অনুমোদিত নয়
drop function if exists mc2_ac_send(int, text, text, text, bigint, text, text, text, bigint, text);
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
    if exists (select 1 from mc2_ac_messages where voter = v and kind = 'text' and body = b and created_at > now() - interval '20 seconds') then return -4; end if;
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
    if not mc2_ac_rl('file:v:' || v || ':60', 5, 60) or not mc2_ac_rl('file:v:' || v || ':3600', 30, 3600) then return -4; end if;
  end if;
  if exists (select 1 from mc2_ac_messages where voter = v and created_at > now() - interval '2 seconds') then return -4; end if;
  if not mc2_ac_rl('send:v:' || v || ':60', 20, 60) then return -4; end if;
  if ip is not null and not mc2_ac_rl('send:ip:' || ip || ':60', 60, 60) then return -4; end if;
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

-- রিঅ্যাকশন ও নাম বদল: ব্যান চেক + রেট লিমিট + যাচাই
create or replace function mc2_ac_react(p_msg bigint, p_voter text, p_emoji text) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' or char_length(coalesce(p_emoji, '')) not between 1 and 16 then return; end if;
  if mc2_ac_block(p_voter) is not null then return; end if;
  if not mc2_ac_rl('react:v:' || p_voter || ':60', 40, 60) then return; end if;
  if not exists (select 1 from mc2_ac_messages m join mc2_ac_sessions s on s.id = m.session_id join mc2_ac_depts d on d.id = s.dept_id where m.id = p_msg and not m.hidden and not m.deleted and s.active and d.active) then return; end if;
  if exists (select 1 from mc2_ac_reactions where message_id = p_msg and voter = p_voter and emoji = p_emoji) then delete from mc2_ac_reactions where message_id = p_msg and voter = p_voter;
  else insert into mc2_ac_reactions(message_id, voter, emoji) values (p_msg, p_voter, p_emoji) on conflict (message_id, voter) do update set emoji = excluded.emoji; end if;
end $$;
grant execute on function mc2_ac_react(bigint, text, text) to anon, authenticated;

create or replace function mc2_ac_rename(p_voter text, p_nick text) returns void language plpgsql security definer set search_path = public as $$
declare n text := mc2_ac_clean(p_nick, 30);
begin
  if n = '' or coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' then return; end if;
  if mc2_ac_block(p_voter) is not null then return; end if;
  if not mc2_ac_rl('ren:v:' || p_voter || ':3600', 10, 3600) then return; end if;
  update mc2_ac_messages set nick = n where voter = p_voter and nick <> n;
  update mc2_ac_seen set nick = n where voter = p_voter;
end $$;
grant execute on function mc2_ac_rename(text, text) to anon, authenticated;

-- ========== ৮) রিপোর্ট (সবাই পাঠাতে পারে) ==========
-- ফল: 1 সফল | 0 বার্তা নেই/মুছে গেছে | -1 ভুল ইনপুট | -2 নিজের বার্তা | -3 ব্যান | -4 বেশি রিপোর্ট (রেট লিমিট) | -6 আগেই রিপোর্ট করেছেন
create or replace function mc2_ac_report(p_msg bigint, p_voter text, p_reason text, p_note text default null) returns int
language plpgsql security definer set search_path = public as $$
declare v text := coalesce(p_voter, ''); m record; ip text := mc2_ip(); nt text := nullif(mc2_ac_clean(p_note, 200), '');
begin
  if v !~ '^[A-Za-z0-9_-]{8,80}$' or coalesce(p_reason, '') not in ('abuse', 'harass', 'threat', 'adult', 'spam', 'privacy', 'illegal', 'other') then return -1; end if;
  if mc2_ac_block(v) = 'banned' then return -3; end if;
  select x.id, x.session_id, x.voter, x.nick, x.body, x.kind, x.file_path, x.file_name into m
    from mc2_ac_messages x join mc2_ac_sessions s on s.id = x.session_id join mc2_ac_depts d on d.id = s.dept_id
    where x.id = p_msg and not x.hidden and not x.deleted and s.active and d.active;
  if not found then return 0; end if;
  if m.voter = v then return -2; end if;
  if exists (select 1 from mc2_ac_reports where message_id = p_msg and reporter = v) then return -6; end if;
  if not mc2_ac_rl('rep:v:' || v || ':3600', 8, 3600) or not mc2_ac_rl('rep:v:' || v || ':86400', 20, 86400)
     or (ip is not null and not mc2_ac_rl('rep:ip:' || ip || ':3600', 30, 3600)) then return -4; end if;
  insert into mc2_ac_reports(message_id, session_id, target, target_nick, reporter, reason, note, snap_body, snap_kind, snap_file, snap_fname)
  values (m.id, m.session_id, m.voter, m.nick, v, p_reason, nt, left(m.body, 400), m.kind, m.file_path, m.file_name)
  on conflict do nothing;
  return 1;
end $$;
grant execute on function mc2_ac_report(bigint, text, text, text) to anon, authenticated;

-- সতর্কবার্তা "বুঝেছি" চাপলে
create or replace function mc2_ac_ack_warn(p_voter text, p_id bigint) returns void language sql security definer set search_path = public as $$
  update mc2_ac_warns set acked = true where id = p_id and voter = p_voter $$;
grant execute on function mc2_ac_ack_warn(text, bigint) to anon, authenticated;

-- পোলিংয়ে নিজের স্ট্যাটাস (ban/restrict/সতর্কতা) সহ — আগের mc2_ac_meta-র সব আছে, শুধু 'me' যোগ হয়েছে
create or replace function mc2_ac_meta(p_session int, p_min bigint, p_voter text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('up', mc2_ac_upload_on(), 'me', mc2_ac_me(p_voter),
    'on', (select count(*) from mc2_presence p where p.chat_session_id = p_session and p.page = '#anon' and mc2_online(p.last_seen, p.offline)),
    'rows', coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', m.id, 'n', m.nick, 'd', m.deleted, 'o', m.voter = p_voter, 'u', mc2_uid(m.voter),
      'a', exists (select 1 from mc2_presence p where p.voter = m.voter and mc2_online(p.last_seen, p.offline)),
      'r', (select coalesce(jsonb_object_agg(e, c), '{}'::jsonb) from (select emoji e, count(*) c from mc2_ac_reactions r where r.message_id = m.id group by emoji) z),
      'm', (select emoji from mc2_ac_reactions r where r.message_id = m.id and r.voter = p_voter),
      's', (select count(*) from mc2_ac_seen s where s.session_id = m.session_id and s.last_id >= m.id and s.voter <> m.voter)) x
    from mc2_ac_messages m where m.session_id = p_session and m.id >= p_min and not m.hidden order by m.id desc limit 500) t), '[]'::jsonb)) $$;
grant execute on function mc2_ac_meta(int, bigint, text) to anon, authenticated;

-- ========== ৯) অ্যাডমিন RPC (সবগুলো mc2_is_admin() ছাড়া চলে না) ==========
create or replace function mc2_ac_admin_reports(p_status text default 'open', p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc), '[]'::jsonb) from (
    select r.id, r.message_id, r.target, mc2_uid(r.target) as tuid, r.target_nick, mc2_uid(r.reporter) as ruid, r.reason, r.note,
      r.snap_body, r.snap_kind, r.snap_file, r.snap_fname, r.status, r.admin_note, r.created_at, r.reviewed_at,
      (select count(distinct r2.reporter) from mc2_ac_reports r2 where r2.target = r.target and r2.status = 'valid') as valid_cnt,
      coalesce(mc2_ac_block(r.target), 'ok') as st,
      (select (m.deleted or m.hidden) from mc2_ac_messages m where m.id = r.message_id) as gone,
      (select d.name || ' · ' || s.name from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.id = r.session_id) as place
    from mc2_ac_reports r where (p_status = 'all' or r.status = p_status)
    order by r.id desc limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)) x);
end $$;

-- রিপোর্ট বৈধ/অবৈধ করা। একই ইউজারের বিরুদ্ধে ৩ জন আলাদা রিপোর্টারের বৈধ রিপোর্ট হলে নিজে থেকে "Review"-তে ওঠে।
create or replace function mc2_ac_admin_review(p_id bigint, p_status text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm(); t text; cnt int; was boolean := false; rv boolean := false;
begin
  if p_status not in ('valid', 'rejected', 'open') then raise exception 'ভুল অবস্থা'; end if;
  update mc2_ac_reports set status = p_status, reviewed_by = case when p_status = 'open' then null else a end, reviewed_at = case when p_status = 'open' then null else now() end,
    admin_note = nullif(left(mc2_ac_clean(p_note, 300), 300), '') where id = p_id returning target into t;
  if t is null then raise exception 'রিপোর্ট পাওয়া যায়নি'; end if;
  perform mc2_ac_log(t, case p_status when 'valid' then 'report_valid' when 'rejected' then 'report_rejected' else 'report_reopen' end, mc2_ac_clean(p_note, 300), null, a, null, p_id);
  select count(distinct reporter) into cnt from mc2_ac_reports where target = t and status = 'valid';
  if p_status = 'valid' and cnt >= 3 then
    select coalesce((select review from mc2_ac_mod where voter = t), false) into was;
    if not was then
      insert into mc2_ac_mod(voter, review, review_at) values (t, true, now())
      on conflict (voter) do update set review = true, review_at = now(), updated_at = now();
      perform mc2_ac_log(t, 'review_flag', cnt || 'টি বৈধ রিপোর্ট — Review দরকার', null, 'system', null, p_id);
      rv := true;
    end if;
  end if;
  return jsonb_build_object('valid_cnt', cnt, 'review_flagged', rv);
end $$;

-- বার্তা মোছা (সবার জন্য; "অ্যাডমিন সরিয়েছেন" দেখায়)। ফেরত: ফাইলের পথ — অ্যাডমিন পেজ Storage থেকেও মুছে দেয়।
create or replace function mc2_ac_admin_remove(p_msg bigint, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm(); m record;
begin
  select id, voter, file_path into m from mc2_ac_messages where id = p_msg;
  if not found then raise exception 'বার্তা পাওয়া যায়নি'; end if;
  update mc2_ac_messages set deleted = true, mod_removed = true, body = '', kind = 'text', file_path = null, file_name = null, file_size = null, file_mime = null, reply_to = null, reply_nick = null, reply_text = null where id = p_msg;
  update mc2_ac_messages set reply_text = 'মুছে ফেলা বার্তা' where reply_to = p_msg;
  delete from mc2_ac_reactions where message_id = p_msg;
  perform mc2_ac_log(m.voter, 'msg_remove', mc2_ac_clean(p_reason, 300), null, a, p_msg);
  return jsonb_build_object('file', m.file_path);
end $$;

-- সতর্ক করা: ইউজার পরের পোলিংয়ে সতর্কবার্তা দেখে "বুঝেছি" চাপে
create or replace function mc2_ac_admin_warn(p_voter text, p_reason text, p_msg bigint default null) returns void
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm(); rs text := mc2_ac_clean(p_reason, 300);
begin
  if coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' then raise exception 'ভুল ইউজার'; end if;
  if char_length(rs) < 3 then raise exception 'সতর্কতার কারণ লিখুন'; end if;
  insert into mc2_ac_warns(voter, reason, msg_id) values (p_voter, rs, p_msg);
  insert into mc2_ac_mod(voter, warns) values (p_voter, 1) on conflict (voter) do update set warns = mc2_ac_mod.warns + 1, updated_at = now();
  perform mc2_ac_log(p_voter, 'warn', rs, null, a, p_msg);
end $$;

-- সাময়িক Restriction (শুধু পড়তে পারবে) বা Ban। p_minutes: ৫ মিনিট থেকে ৩০ দিন (৪৩২০০)।
-- স্থায়ী ব্যান = kind 'ban' + p_minutes খালি; এর জন্য আগে (১) ৩ জন আলাদা রিপোর্টারের বৈধ রিপোর্ট ও (২) Verify (যাচাই) লাগে।
create or replace function mc2_ac_admin_sanction(p_voter text, p_kind text, p_minutes int, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm(); rs text := mc2_ac_clean(p_reason, 300); u timestamptz; perm boolean := (p_minutes is null or p_minutes <= 0); ok boolean; cnt int;
begin
  if coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' then raise exception 'ভুল ইউজার'; end if;
  if p_kind not in ('restrict', 'ban') then raise exception 'ভুল ধরন'; end if;
  if char_length(rs) < 3 then raise exception 'কারণ লিখুন'; end if;
  if perm then
    if p_kind <> 'ban' then raise exception 'Restriction সাময়িকই হয় — সময় দিন'; end if;
    select count(distinct reporter) into cnt from mc2_ac_reports where target = p_voter and status = 'valid';
    select coalesce((select verified from mc2_ac_mod where voter = p_voter), false) into ok;
    if cnt < 3 or not ok then raise exception 'স্থায়ী ব্যানের আগে ৩টি বৈধ রিপোর্ট ও যাচাই (Verify) লাগবে — এখন সাময়িক ব্যান দিন'; end if;
    u := null;
  else
    if p_minutes < 5 or p_minutes > 43200 then raise exception 'সময় ৫ মিনিট থেকে ৩০ দিনের মধ্যে দিন'; end if;
    u := now() + make_interval(mins => p_minutes);
  end if;
  insert into mc2_ac_mod(voter, state, until, reason, review) values (p_voter, case p_kind when 'ban' then 'banned' else 'restricted' end, u, rs, false)
  on conflict (voter) do update set state = excluded.state, until = excluded.until, reason = excluded.reason, review = false, updated_at = now();
  perform mc2_ac_log(p_voter, case when p_kind = 'ban' and perm then 'ban_perm' else p_kind end, rs, u, a);
  return jsonb_build_object('state', case p_kind when 'ban' then 'banned' else 'restricted' end, 'until', u);
end $$;

create or replace function mc2_ac_admin_unban(p_voter text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm();
begin
  update mc2_ac_mod set state = 'ok', until = null, reason = null, updated_at = now() where voter = p_voter;
  perform mc2_ac_log(p_voter, 'unban', mc2_ac_clean(p_reason, 300), null, a);
end $$;

-- যাচাই (Verify): ৩ জন আলাদা রিপোর্টারের বৈধ রিপোর্ট থাকলে, প্রমাণ দেখে লিখিত নোটসহ; এরপরই স্থায়ী ব্যান সম্ভব
create or replace function mc2_ac_admin_verify(p_voter text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm(); nt text := mc2_ac_clean(p_note, 300); cnt int;
begin
  select count(distinct reporter) into cnt from mc2_ac_reports where target = p_voter and status = 'valid';
  if cnt < 3 then raise exception 'যাচাইয়ের জন্য কমপক্ষে ৩ জন আলাদা রিপোর্টারের বৈধ রিপোর্ট লাগবে (এখন %)', cnt; end if;
  if char_length(nt) < 10 then raise exception 'যাচাইয়ে কী দেখেছেন তা অন্তত ১০ অক্ষরে লিখুন'; end if;
  insert into mc2_ac_mod(voter, verified, verified_by, verified_at, verified_note, review) values (p_voter, true, a, now(), nt, false)
  on conflict (voter) do update set verified = true, verified_by = a, verified_at = now(), verified_note = nt, review = false, updated_at = now();
  perform mc2_ac_log(p_voter, 'verify', nt, null, a);
end $$;

-- Review শেষ, কোনো শাস্তি ছাড়া
create or replace function mc2_ac_admin_clear_review(p_voter text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm();
begin
  update mc2_ac_mod set review = false, updated_at = now() where voter = p_voter;
  perform mc2_ac_log(p_voter, 'review_clear', mc2_ac_clean(p_note, 300), null, a);
end $$;

-- যেসব ইউজারের দিকে নজর দরকার (Review / Restriction / Ban / সতর্কতা)
create or replace function mc2_ac_admin_mods() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.review desc, x.upd desc), '[]'::jsonb) from (
    select m.voter, mc2_uid(m.voter) as uid,
      coalesce((select g.nick from mc2_ac_messages g where g.voter = m.voter order by g.id desc limit 1), 'বেনামি') as nick,
      coalesce(mc2_ac_block(m.voter), 'ok') as st, m.until, m.reason, m.review, m.verified, m.warns,
      (select count(distinct r.reporter) from mc2_ac_reports r where r.target = m.voter and r.status = 'valid') as valid_cnt,
      (select count(*) from mc2_ac_reports r where r.target = m.voter and r.status = 'open') as open_cnt,
      m.updated_at as upd
    from mc2_ac_mod m where m.review or m.warns > 0 or m.state <> 'ok' order by m.updated_at desc limit 200) x);
end $$;

-- একজন ইউজারের সম্পূর্ণ ইতিহাস: অবস্থা + তার বিরুদ্ধে রিপোর্ট (কারণসহ) + সব অ্যাডমিন/সিস্টেম অ্যাকশন
create or replace function mc2_ac_admin_history(p_voter text) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  return jsonb_build_object(
    'uid', mc2_uid(p_voter),
    'nick', coalesce((select g.nick from mc2_ac_messages g where g.voter = p_voter order by g.id desc limit 1), 'বেনামি'),
    'st', coalesce(mc2_ac_block(p_voter), 'ok'),
    'mod', (select to_jsonb(m) - 'voter' from mc2_ac_mod m where m.voter = p_voter),
    'valid_cnt', (select count(distinct reporter) from mc2_ac_reports where target = p_voter and status = 'valid'),
    'reports', coalesce((select jsonb_agg(to_jsonb(z) order by z.id desc) from (
        select r.id, r.reason, r.note, r.status, r.snap_body, r.snap_kind, r.snap_fname, r.created_at, mc2_uid(r.reporter) as ruid, r.admin_note
        from mc2_ac_reports r where r.target = p_voter order by r.id desc limit 100) z), '[]'::jsonb),
    'log', coalesce((select jsonb_agg(to_jsonb(l) order by l.id desc) from (
        select id, action, reason, until, admin, msg_id, report_id, created_at from mc2_ac_modlog where voter = p_voter order by id desc limit 100) l), '[]'::jsonb));
end $$;

-- ফাইল আপলোড ON/OFF (লগসহ)। বন্ধ করলে সার্ভারে সব আপলোড বন্ধ; আবার চালু করলে কোড বদলাতে হয় না।
create or replace function mc2_ac_admin_upload(p_on boolean) returns void language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm();
begin
  insert into mc2_ac_cfg(key, value) values ('upload', to_jsonb(coalesce(p_on, true))) on conflict (key) do update set value = excluded.value;
  perform mc2_ac_log(null, case when coalesce(p_on, true) then 'upload_on' else 'upload_off' end, null, null, a);
end $$;

-- ========== ১০) চ্যাট ও ফাইল স্বয়ংক্রিয় মোছা (ডিফল্ট ১ দিন; অ্যাডমিন বদলাতে পারে; চ্যাট-বক্স (সেশন) অনুযায়ী আলাদা সময়; এখনই মোছা) ==========
-- সময় মিনিটে। 0 = কখনো মুছবে না। সেশনের keep_min খালি = ডিফল্ট। মোছা চলে চ্যাট ব্যবহারের সময় (সর্বোচ্চ ৫ মিনিট পরপর), তাই কোনো cron লাগে না।
alter table mc2_ac_sessions add column if not exists keep_min int check (keep_min is null or keep_min between 0 and 525600);
insert into mc2_ac_cfg(key, value) values ('keep_min', '1440') on conflict do nothing;

create or replace function mc2_ac_purge() returns int language plpgsql security definer set search_path = public as $$
declare d int := coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'keep_min'), 1440); n int; paths text[];
begin
  select coalesce(array_agg(m.file_path) filter (where m.file_path is not null), '{}') into paths
    from mc2_ac_messages m join mc2_ac_sessions s on s.id = m.session_id
    where coalesce(s.keep_min, d) > 0 and m.created_at < now() - make_interval(mins => coalesce(s.keep_min, d));
  delete from mc2_ac_messages m using mc2_ac_sessions s
    where s.id = m.session_id and coalesce(s.keep_min, d) > 0 and m.created_at < now() - make_interval(mins => coalesce(s.keep_min, d));
  get diagnostics n = row_count;
  -- ফাইল: মেয়াদোত্তীর্ণ বার্তার ফাইল + কোনো বার্তায় না লাগা ১ দিনের পুরোনো আপলোড। (Supabase সরাসরি SQL-মোছা আটকালে এই অংশ চুপচাপ বাদ যায়; বার্তা তবু মুছে যায়।)
  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects where bucket_id = 'mc2-chat' and (name = any (paths)
      or (created_at < now() - interval '1 day' and name not in (select file_path from mc2_ac_messages where file_path is not null)));
  exception when others then null;
  end;
  return n;
end $$;
revoke all on function mc2_ac_purge() from public, anon, authenticated;

create or replace function mc2_ac_tick() returns void language plpgsql security definer set search_path = public as $$
begin if mc2_ac_rl('purge', 1, 300) then perform mc2_ac_purge(); end if; end $$;
grant execute on function mc2_ac_tick() to anon, authenticated;

create or replace function mc2_ac_admin_retention() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  return jsonb_build_object('default', coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'keep_min'), 1440),
    'sessions', coalesce((select jsonb_agg(to_jsonb(x) order by x.dsort, x.ssort) from (
      select s.id, d.name as dept, s.name, s.keep_min, d.sort as dsort, s.sort as ssort,
        (select count(*) from mc2_ac_messages m where m.session_id = s.id) as msgs,
        (select count(*) from mc2_ac_messages m where m.session_id = s.id and m.file_path is not null) as files
      from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id) x), '[]'::jsonb));
end $$;

-- সময় বদল: p_session খালি = সবার ডিফল্ট (০..৫,২৫,৬০০ মিনিট, ০ = কখনো না); p_session থাকলে শুধু সেই চ্যাট-বক্স (p_min খালি = ডিফল্ট অনুযায়ী)
create or replace function mc2_ac_admin_keep(p_session int, p_min int) returns void language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm();
begin
  if p_min is not null and (p_min < 0 or p_min > 525600) then raise exception 'সময় ০ থেকে ৫,২৫,৬০০ মিনিটের (১ বছর) মধ্যে দিন'; end if;
  if p_session is null then
    if p_min is null then raise exception 'ডিফল্ট সময় দিন'; end if;
    insert into mc2_ac_cfg(key, value) values ('keep_min', to_jsonb(p_min)) on conflict (key) do update set value = excluded.value;
  else
    update mc2_ac_sessions set keep_min = p_min where id = p_session;
    if not found then raise exception 'চ্যাট-বক্স পাওয়া যায়নি'; end if;
  end if;
  perform mc2_ac_log(null, 'keep_set', coalesce(p_session::text, 'ডিফল্ট') || ' = ' || coalesce(p_min::text, 'ডিফল্ট অনুযায়ী') || ' মিনিট', null, a);
end $$;

-- এখনই মোছা: p_session খালি = সব চ্যাট-বক্স; p_older_min = শুধু এর চেয়ে পুরোনো (০ = সব)। ফাইলের পথ ফেরত আসে — অ্যাডমিন পেজ Storage API দিয়ে বাইটসহ মুছে দেয়।
create or replace function mc2_ac_admin_purge_now(p_session int default null, p_older_min int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm(); paths text[]; n int; t timestamptz := now() - make_interval(mins => greatest(coalesce(p_older_min, 0), 0));
begin
  select coalesce(array_agg(file_path) filter (where file_path is not null), '{}') into paths from mc2_ac_messages where (p_session is null or session_id = p_session) and created_at < t;
  delete from mc2_ac_messages where (p_session is null or session_id = p_session) and created_at < t;
  get diagnostics n = row_count;
  perform mc2_ac_log(null, 'purge', coalesce(p_session::text, 'সব চ্যাট') || ' · ' || n || 'টি বার্তা · ' || coalesce(p_older_min, 0) || ' মিনিটের পুরোনো', null, a);
  return jsonb_build_object('deleted', n, 'files', to_jsonb(paths));
end $$;

-- অ্যাডমিন RPC: শুধু লগইন করা ইউজার ডাকতে পারে (ভেতরে আবার mc2_is_admin() যাচাই হয়)
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.proname like 'mc2\_ac\_admin\_%' and p.pronamespace = 'public'::regnamespace loop
    execute 'revoke all on function ' || f.sig || ' from public, anon';
    execute 'grant execute on function ' || f.sig || ' to authenticated';
  end loop;
end $$;

-- রিঅ্যাকশন পপআপ: কে কোন রিঅ্যাকশন দিয়েছে (শুধু নাম ও ইমোজি; ডিভাইস/ইউজার আইডি যায় না। 'o' = নিজের)
create or replace function mc2_ac_reactors(p_msg bigint, p_voter text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'n', coalesce((select mm.nick from mc2_ac_messages mm where mm.voter = r.voter and mm.session_id = m.session_id order by mm.id desc limit 1),
                  (select s.nick from mc2_ac_seen s where s.voter = r.voter and s.session_id = m.session_id limit 1), 'বেনামি'),
    'e', r.emoji, 'o', r.voter = p_voter) order by r.emoji), '[]'::jsonb)
  from mc2_ac_reactions r join mc2_ac_messages m on m.id = r.message_id
  where r.message_id = p_msg and not m.hidden and not m.deleted $$;
grant execute on function mc2_ac_reactors(bigint, text) to anon, authenticated;

-- ========== চ্যাট রুমের পাসওয়ার্ড (অ্যাডমিন প্যানেলের সেশন-লিস্ট থেকে বসে/বদলায়/সরে) ==========
-- পাসওয়ার্ড শুধু হ্যাশ হয়ে থাকে (anon দেখতে পায় না; শুধু has_pw দেখে)। ঠিক পাসওয়ার্ড দিলে ডিভাইস mc2_ac_access-এ ঢোকে;
-- পড়া (RLS) ও পাঠানো (mc2_ac_send) দুটোই সার্ভারে আটকানো। পাসওয়ার্ড বদলালে/সরালে আগের সবার অ্যাক্সেস মুছে যায়।
alter table mc2_ac_sessions add column if not exists pw_hash text;
alter table mc2_ac_sessions add column if not exists pw_on boolean not null default false;   -- ডিফল্ট: বন্ধ। অ্যাডমিন চালু/বন্ধ করে (পাসওয়ার্ড সেভ থাকে)
alter table mc2_ac_sessions drop column if exists has_pw;
alter table mc2_ac_sessions add column has_pw boolean generated always as (pw_hash is not null and pw_on) stored;
revoke select on mc2_ac_sessions from anon;
grant select (id, dept_id, name, sort, active, keep_min, has_pw) on mc2_ac_sessions to anon;
create table if not exists mc2_ac_access (session_id int not null references mc2_ac_sessions(id) on delete cascade, voter text not null, at timestamptz not null default now(), primary key (session_id, voter));
alter table mc2_ac_access enable row level security; revoke all on mc2_ac_access from anon, authenticated;
create or replace function mc2_ac_pwh(p_session int, p_pw text) returns text language sql immutable set search_path = public as $$
  select encode(sha256(convert_to('mc2ac:' || p_session::text || ':' || p_pw, 'UTF8')), 'hex') $$;
revoke all on function mc2_ac_pwh(int, text) from public, anon, authenticated;
create or replace function mc2_ac_hdr_voter() returns text language sql stable set search_path = public as $$
  select coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-voter', '') $$;
grant execute on function mc2_ac_hdr_voter() to anon, authenticated;
create or replace function mc2_ac_can(p_session int, p_voter text) returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from mc2_ac_sessions s where s.id = p_session and s.has_pw)
      or exists (select 1 from mc2_ac_access a where a.session_id = p_session and a.voter = coalesce(p_voter, '')) $$;
grant execute on function mc2_ac_can(int, text) to anon, authenticated;
drop policy if exists "ac m read" on mc2_ac_messages;
create policy "ac m read" on mc2_ac_messages for select to anon using (not hidden and mc2_ac_can(session_id, mc2_ac_hdr_voter()));
-- ঢোকা: 1 = ঢুকেছে/পাসওয়ার্ড লাগে না, 2 = পাসওয়ার্ড লাগবে, -2 = ভুল, -4 = বেশি চেষ্টা, 0 = চ্যাট বন্ধ, -1 = অবৈধ
create or replace function mc2_ac_join(p_session int, p_voter text, p_pw text default '') returns int language plpgsql security definer set search_path = public as $$
declare h text; ip text := mc2_ip();
begin
  if coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' then return -1; end if;
  select case when has_pw then pw_hash end into h from mc2_ac_sessions where id = p_session and active;
  if not found then return 0; end if;
  if h is null then return 1; end if;
  if exists (select 1 from mc2_ac_access where session_id = p_session and voter = p_voter) then return 1; end if;
  if coalesce(p_pw, '') = '' then return 2; end if;
  if not mc2_ac_rl('pw:v:' || p_voter || ':600', 8, 600) or (ip is not null and not mc2_ac_rl('pw:ip:' || ip || ':600', 40, 600)) then return -4; end if;
  if h <> mc2_ac_pwh(p_session, p_pw) then return -2; end if;
  insert into mc2_ac_access(session_id, voter) values (p_session, p_voter) on conflict do nothing;
  return 1;
end $$;
grant execute on function mc2_ac_join(int, text, text) to anon, authenticated;
-- অ্যাডমিন: পাসওয়ার্ড বসানো/বদলানো (খালি = সরানো)
create or replace function mc2_ac_admin_setpw(p_session int, p_pw text) returns void language plpgsql security definer set search_path = public as $$
declare w text := btrim(coalesce(p_pw, ''));
begin
  perform mc2_ac_adm();
  if w = '' then update mc2_ac_sessions set pw_hash = null, pw_on = false where id = p_session;
  else
    if char_length(w) not between 3 and 40 then raise exception 'পাসওয়ার্ড ৩ থেকে ৪০ অক্ষরের হতে হবে'; end if;
    update mc2_ac_sessions set pw_hash = mc2_ac_pwh(p_session, w), pw_on = true where id = p_session;
  end if;
  delete from mc2_ac_access where session_id = p_session;
end $$;
revoke all on function mc2_ac_admin_setpw(int, text) from public, anon;
grant execute on function mc2_ac_admin_setpw(int, text) to authenticated;
-- অ্যাডমিন: পাসওয়ার্ড চালু/বন্ধ (সেভ করা পাসওয়ার্ড থাকে; চালু করলে সবাইকে আবার দিতে হয়)
create or replace function mc2_ac_admin_pwon(p_session int, p_on boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  if p_on and not exists (select 1 from mc2_ac_sessions where id = p_session and pw_hash is not null) then raise exception 'আগে পাসওয়ার্ড দিন'; end if;
  update mc2_ac_sessions set pw_on = p_on where id = p_session;
  delete from mc2_ac_access where session_id = p_session;
end $$;
revoke all on function mc2_ac_admin_pwon(int, boolean) from public, anon;
grant execute on function mc2_ac_admin_pwon(int, boolean) to authenticated;
-- চ্যাট ছাড়লে (Leave) নিজের অ্যাক্সেস মুছে যায়: আবার ঢুকতে পাসওয়ার্ড লাগবে
create or replace function mc2_ac_unjoin(p_session int, p_voter text) returns void language sql security definer set search_path = public as $$
  delete from mc2_ac_access where session_id = p_session and voter = coalesce(p_voter, '') $$;
grant execute on function mc2_ac_unjoin(int, text) to anon, authenticated;


-- ==================== 08_supabase-live-board.sql ====================
-- Friend Adda — (ক) চ্যাটে Live Typing Indicator + Join/Leave System Message, (খ) লিডারবোর্ডের ফিল্টার/র‍্যাংক।
-- চালানোর ক্রম: supabase-moderation.sql-এর পরে (supabase-pending-all.sql-এ সবই ক্রমে আছে)। আবার চালালেও ক্ষতি নেই।

-- ========== (ক) লাইভ উপস্থিতি, টাইপিং, Join/Leave ==========
create table if not exists mc2_ac_here (
  session_id int not null references mc2_ac_sessions(id) on delete cascade, voter text not null, nick text,
  at timestamptz not null default now(), typing_at timestamptz, primary key (session_id, voter));
create table if not exists mc2_ac_events (
  id bigserial primary key, session_id int not null references mc2_ac_sessions(id) on delete cascade, voter text,
  kind text not null check (kind in ('join', 'leave')), nick text, created_at timestamptz not null default now());
create index if not exists mc2_ac_events_s on mc2_ac_events (session_id, id desc);
alter table mc2_ac_here enable row level security; alter table mc2_ac_events enable row level security;
revoke all on mc2_ac_here, mc2_ac_events from anon, authenticated;

-- একটাই কল: নিজের হাজিরা + টাইপিং পাঠায়; ফেরত দেয় কারা টাইপ করছে ও নতুন Join/Leave।
-- p_after < 0 (প্রথমবার) = শুধু বর্তমান শেষ id নেয়, পুরোনো ইভেন্ট ফেরত দেয় না।
-- ৭৫ সেকেন্ড সাড়া না দিলে (ট্যাব বন্ধ/নেট নেই) সবার পোলিংয়ের সময় নিজে থেকে "Leave" ধরা হয়।
create or replace function mc2_ac_live(p_session int, p_voter text, p_nick text, p_typing boolean default false, p_after bigint default -1) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := coalesce(p_voter, ''); nk text := coalesce(nullif(mc2_ac_clean(p_nick, 30), ''), 'বেনামি'); h record; last bigint; ty jsonb; ev jsonb;
begin
  if v !~ '^[A-Za-z0-9_-]{8,80}$' then return jsonb_build_object('err', 1); end if;
  if not exists (select 1 from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.id = p_session and s.active and d.active) then return jsonb_build_object('err', 2); end if;
  if not mc2_ac_rl('live:v:' || v || ':60', 90, 60) then return jsonb_build_object('err', 3); end if;
  if mc2_ac_block(v) is null then
    with gone as (delete from mc2_ac_here where session_id = p_session and voter <> v and at < now() - interval '75 seconds' returning voter, nick)
      insert into mc2_ac_events(session_id, voter, kind, nick) select p_session, voter, 'leave', nick from gone;
    select * into h from mc2_ac_here where session_id = p_session and voter = v;
    if not found or h.at < now() - interval '75 seconds' then insert into mc2_ac_events(session_id, voter, kind, nick) values (p_session, v, 'join', nk); end if;
    insert into mc2_ac_here(session_id, voter, nick, at, typing_at) values (p_session, v, nk, now(), case when p_typing then now() end)
    on conflict (session_id, voter) do update set nick = excluded.nick, at = now(), typing_at = case when p_typing then now() end;
  end if;
  if p_after is null or p_after < 0 then
    select coalesce(max(id), 0) into last from mc2_ac_events where session_id = p_session; ev := '[]'::jsonb;
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'k', e.kind, 'n', e.nick, 't', (extract(epoch from e.created_at) * 1000)::bigint, 'o', e.voter = v) order by e.id), '[]'::jsonb), coalesce(max(e.id), p_after)
      into ev, last from (select * from mc2_ac_events where session_id = p_session and id > p_after order by id limit 30) e;
  end if;
  select coalesce(jsonb_agg(x.nick order by x.typing_at), '[]'::jsonb) into ty
    from (select nick, typing_at from mc2_ac_here where session_id = p_session and voter <> v and typing_at > now() - interval '5 seconds' order by typing_at limit 10) x;
  return jsonb_build_object('last', last, 'ev', ev, 'ty', ty);
end $$;
grant execute on function mc2_ac_live(int, text, text, boolean, bigint) to anon, authenticated;

-- ঘর ছাড়লে সাথে সাথে Leave
create or replace function mc2_ac_leave(p_session int, p_voter text) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' or not mc2_ac_rl('leave:v:' || p_voter || ':60', 30, 60) then return; end if;
  with gone as (delete from mc2_ac_here where session_id = p_session and voter = p_voter returning voter, nick)
    insert into mc2_ac_events(session_id, voter, kind, nick) select p_session, voter, 'leave', nick from gone;
end $$;
grant execute on function mc2_ac_leave(int, text) to anon, authenticated;

-- পুরোনো ইভেন্ট/হাজিরা পরিষ্কার (মোছার টিক-এর সাথে চলে)
create or replace function mc2_ac_purge_live() returns void language sql security definer set search_path = public as $$
  delete from mc2_ac_events where created_at < now() - interval '1 day';
  delete from mc2_ac_here where at < now() - interval '1 day' $$;
revoke all on function mc2_ac_purge_live() from public, anon, authenticated;
create or replace function mc2_ac_tick() returns void language plpgsql security definer set search_path = public as $$
begin if mc2_ac_rl('purge', 1, 300) then perform mc2_ac_purge(); perform mc2_ac_purge_live(); end if; end $$;
grant execute on function mc2_ac_tick() to anon, authenticated;

-- ========== (খ) লিডারবোর্ড: সব ফলাফল স্থায়ীভাবে mc2_scores-এ (প্রতিটি খেলা, স্বয়ংক্রিয় মোছার আওতার বাইরে); ফিল্টার + র‍্যাংক সার্ভারে ==========
create index if not exists mc2_scores_dept on mc2_scores (dept);
create index if not exists mc2_scores_batch on mc2_scores (batch);
create index if not exists mc2_scores_score on mc2_scores (score desc);

-- p_mode 'best' = প্রত্যেকের (নাম+বিভাগ+সেশন) সেরা ফল; 'all' = সব খেলা। র‍্যাংক = ফিল্টার করা তালিকার ভেতরে (সমান স্কোরে সমান র‍্যাংক)।
-- ফিল্টার: বিভাগ, সেশন, তারিখ (p_from <= সময় < p_to), নাম খোঁজা। ভুল = মোট প্রশ্ন − সঠিক। আইপি/ডিভাইস কখনো ফেরত যায় না।
create or replace function mc2_board(p_dept text default null, p_batch text default null, p_from timestamptz default null, p_to timestamptz default null, p_q text default null, p_mode text default 'best', p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare lim int := least(greatest(coalesce(p_limit, 50), 1), 500); ofs int := greatest(coalesce(p_offset, 0), 0);
  q text := nullif(left(trim(coalesce(p_q, '')), 40), ''); ip text := mc2_ip(); res jsonb;
begin
  if ip is not null and not mc2_ac_rl('board:ip:' || ip || ':60', 60, 60) then return jsonb_build_object('err', 'slow'); end if;
  if q is not null then q := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_'); end if;
  with base as (
    select s.id, s.name, s.dept, s.batch, s.score, s.ok, s.total, s.pct, s.created_at,
      row_number() over (partition by lower(s.name), s.dept, coalesce(s.batch, '') order by s.score desc, s.created_at) as rn
    from mc2_scores s
    where (nullif(p_dept, '') is null or s.dept = p_dept) and (nullif(p_batch, '') is null or s.batch = p_batch)
      and (p_from is null or s.created_at >= p_from) and (p_to is null or s.created_at < p_to)
      and (q is null or s.name ilike '%' || q || '%')
  ), pick as (select * from base where p_mode = 'all' or rn = 1),
  ranked as (select pick.*, rank() over (order by score desc) as rk, count(*) over () as total_n from pick),
  page as (select * from ranked order by rk, created_at, id offset ofs limit lim)
  select jsonb_build_object('total', coalesce((select max(total_n) from page), 0),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'rk', rk, 'name', name, 'dept', dept, 'batch', batch, 'score', score,
        'ok', coalesce(ok, 0), 'wrong', greatest(coalesce(total, 0) - coalesce(ok, 0), 0), 'total', coalesce(total, 0), 'pct', pct,
        'ts', (extract(epoch from created_at) * 1000)::bigint) order by rk, created_at, id) from page), '[]'::jsonb)) into res;
  return res || jsonb_build_object('depts', coalesce((select jsonb_agg(z.d order by z.d) from (select distinct dept as d from mc2_scores) z), '[]'::jsonb),
                                   'batches', coalesce((select jsonb_agg(z.b order by z.b) from (select distinct batch as b from mc2_scores where batch is not null and batch <> '') z), '[]'::jsonb));
end $$;
grant execute on function mc2_board(text, text, timestamptz, timestamptz, text, text, int, int) to anon, authenticated;


-- ==================== 09_supabase-cards.sql ====================
-- Friend Adda — ইউজারের কার্ড সংরক্ষণ (অ্যাডমিনের জন্য ছোট নমুনা) + লিডারবোর্ডের টপ ৩ কার্ড/ছবি।
-- চালানোর ক্রম: supabase-live-board.sql-এর পরে (supabase-pending-all.sql-এর শেষে যোগ করা আছে)। আবার চালালেও ক্ষতি নেই।
--
-- কীভাবে কম জায়গা নেয়, অথচ ডাউনলোডে ফুল কোয়ালিটি:
--   থাকে: (১) ছোট প্রিভিউ JPEG (~৩০–৫০ KB), (২) ছোট বর্গাকার ছবি (~৩০–৫০ KB, ঐচ্ছিক), (৩) কার্ড আঁকার ছোট্ট তথ্য (rec, কয়েক শ বাইট)।
--   ডাউনলোডের সময় অ্যাডমিন পেজ ওই তথ্য আর ছবি থেকে ১০৮০×১৪০০ কার্ড ও ১০৮০×১৯২০ স্টোরি আবার আঁকে — ইউজার যে কার্ড ডাউনলোড করে হুবহু সেটাই।

create table if not exists mc2_cards (
  id bigint generated always as identity primary key,
  device text not null,
  name text not null, dept text not null, batch text,
  score int not null, pct int not null, ok int, total int,
  rec jsonb not null,
  thumb text not null,
  photo text,
  show boolean not null default true,   -- false = লিডারবোর্ডের টপ ৩-এ ছবি দেখানো হবে না (অ্যাডমিন লুকালে)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists mc2_cards_u on mc2_cards (device, lower(name));
create index if not exists mc2_cards_s on mc2_cards (score desc);
create index if not exists mc2_cards_t on mc2_cards (updated_at desc);
alter table mc2_cards enable row level security;
revoke all on mc2_cards from anon, authenticated;
grant select, update, delete on mc2_cards to authenticated;
drop policy if exists "admin cards" on mc2_cards;
create policy "admin cards" on mc2_cards for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

-- কার্ড সেভ: স্কোর সত্যিই mc2_scores-এ আছে কি না মিলিয়ে দেখে (ভুয়া স্কোরে কার্ড/টপ ৩ হবে না)।
-- প্রতি (ডিভাইস + নাম)-এ একটাই কার্ড; নতুন স্কোর আগের চেয়ে কম হলে পুরোনো সেরা কার্ড থাকে, সমান/বেশি হলে বদলায়।
create or replace function mc2_card_save(p_device text, p_name text, p_dept text, p_batch text, p_score int, p_rec jsonb, p_thumb text, p_photo text)
returns text language plpgsql security definer set search_path = public as $$
declare v record; nm text := trim(coalesce(p_name, '')); rec jsonb; old record;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 or char_length(nm) not between 1 and 30 or p_score is null or p_score not between 0 and 1000 then return 'invalid'; end if;
  if p_rec is null or jsonb_typeof(p_rec) <> 'object' or octet_length(p_rec::text) > 4000 then return 'invalid'; end if;
  if p_thumb is null or char_length(p_thumb) > 160000 or p_thumb !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then return 'invalid'; end if;
  if p_photo is not null and p_photo <> '' and (char_length(p_photo) > 220000 or p_photo !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$') then return 'invalid'; end if;
  select * into v from mc2_scores where device = p_device and lower(name) = lower(nm) and score = p_score order by id desc limit 1;
  if not found then return 'noscore'; end if;
  select * into old from mc2_cards where device = p_device and lower(name) = lower(nm);
  if found then
    if old.updated_at > now() - interval '2 seconds' then return 'slow'; end if;
    if old.score > v.score then return 'lower'; end if;
  elsif (select count(*) from mc2_cards where device = p_device) >= 20 then return 'slow'; end if;
  rec := p_rec - 'device' || jsonb_build_object('name', v.name, 'dept', v.dept, 'batch', coalesce(v.batch, ''), 'score', v.score, 'pct', v.pct, 'ok', coalesce(v.ok, 0), 'total', coalesce(v.total, 0),
    'club', coalesce(v.club, ''), 'title', coalesce(v.title, ''));
  insert into mc2_cards(device, name, dept, batch, score, pct, ok, total, rec, thumb, photo)
  values (p_device, v.name, v.dept, v.batch, v.score, v.pct, v.ok, v.total, rec, p_thumb, nullif(p_photo, ''))
  on conflict (device, (lower(name))) do update set name = excluded.name, dept = excluded.dept, batch = excluded.batch, score = excluded.score, pct = excluded.pct, ok = excluded.ok, total = excluded.total,
    rec = excluded.rec, thumb = excluded.thumb, photo = excluded.photo, updated_at = now();
  return 'ok';
end $$;
grant execute on function mc2_card_save(text, text, text, text, int, jsonb, text, text) to anon, authenticated;

-- লিডারবোর্ডের টপ ৩ (ফিল্টার একই: বিভাগ, সেশন, তারিখ; প্রত্যেকের সেরা ফল)। কার্ড/ছবি থাকলে সাথে আসে।
-- পাবলিকে যায়: নাম, বিভাগ, সেশন, স্কোর, সঠিক/মোট, কার্ড আঁকার তথ্য, ছবি (শুধু অ্যাডমিন লুকিয়ে না রাখলে)। ডিভাইস/আইপি কখনো না।
create or replace function mc2_top_cards(p_dept text default null, p_batch text default null, p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ip text := mc2_ip(); res jsonb;
begin
  if ip is not null and not mc2_ac_rl('topc:ip:' || ip || ':60', 60, 60) then return jsonb_build_object('err', 'slow'); end if;
  with base as (
    select s.id, s.name, s.dept, s.batch, s.score, s.ok, s.total, s.pct, s.created_at, s.device,
      row_number() over (partition by lower(s.name), s.dept, coalesce(s.batch, '') order by s.score desc, s.created_at) as rn
    from mc2_scores s
    where (nullif(p_dept, '') is null or s.dept = p_dept) and (nullif(p_batch, '') is null or s.batch = p_batch)
      and (p_from is null or s.created_at >= p_from) and (p_to is null or s.created_at < p_to)
  ), pick as (select base.*, rank() over (order by score desc) as rk from base where rn = 1),
  top as (select * from pick order by rk, created_at, id limit 3)
  select coalesce(jsonb_agg(jsonb_build_object('rk', t.rk, 'name', t.name, 'dept', t.dept, 'batch', t.batch, 'score', t.score, 'ok', coalesce(t.ok, 0), 'total', coalesce(t.total, 0), 'pct', t.pct,
    'ts', (extract(epoch from t.created_at) * 1000)::bigint, 'rec', c.rec, 'photo', case when c.show then c.photo end) order by t.rk, t.created_at, t.id), '[]'::jsonb) into res
  from top t left join lateral (select x.rec, x.photo, x.show from mc2_cards x where x.device = t.device and lower(x.name) = lower(t.name) order by x.score desc limit 1) c on true;
  return jsonb_build_object('rows', res);
end $$;
grant execute on function mc2_top_cards(text, text, timestamptz, timestamptz) to anon, authenticated;


-- ==================== 10_supabase-additions.sql ====================
-- Friend Adda — সংযোজন (2026-10-17): ছবির মূল ফাইলের নাম, চ্যাট-ফাইলের আলাদা মেয়াদ (ডিফল্ট ১ দিন, অ্যাডমিন বদলাতে পারে),
-- Seen তালিকায় একই নামের ইউজার আলাদা করা। আগে চালানো থাকতে হবে: gallery, anonchat, userinfo, moderation (মোছা অংশ), live-board। ফাইলটি idempotent।

-- ১) ছবির মূল ফাইলের নাম (Display Name = bn আলাদা থাকে)
alter table mc2_places add column if not exists orig_name text;

-- ২) চ্যাটের ফাইল/অ্যাটাচমেন্টের আলাদা মেয়াদ। মিনিটে; ০ = কখনো না। ডিফল্ট ১৪৪০ (১ দিন)।
alter table mc2_ac_messages add column if not exists file_expired boolean not null default false;
grant select (file_expired) on mc2_ac_messages to anon;
insert into mc2_ac_cfg(key, value) values ('file_keep_min', '1440') on conflict do nothing;

create or replace function mc2_ac_purge() returns int language plpgsql security definer set search_path = public as $$
declare d int := coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'keep_min'), 1440);
        fd int := coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'file_keep_min'), 1440);
        n int; paths text[]; fp text[];
begin
  -- বার্তার মেয়াদ (সেশন অনুযায়ী বা ডিফল্ট)
  select coalesce(array_agg(m.file_path) filter (where m.file_path is not null), '{}') into paths
    from mc2_ac_messages m join mc2_ac_sessions s on s.id = m.session_id
    where coalesce(s.keep_min, d) > 0 and m.created_at < now() - make_interval(mins => coalesce(s.keep_min, d));
  delete from mc2_ac_messages m using mc2_ac_sessions s
    where s.id = m.session_id and coalesce(s.keep_min, d) > 0 and m.created_at < now() - make_interval(mins => coalesce(s.keep_min, d));
  get diagnostics n = row_count;
  -- শুধু ফাইলের মেয়াদ: বার্তা থাকে, ফাইল মুছে "ফাইলের মেয়াদ শেষ" দেখায়
  if fd > 0 then
    select coalesce(array_agg(file_path), '{}') into fp from mc2_ac_messages where file_path is not null and created_at < now() - make_interval(mins => fd);
    update mc2_ac_messages set file_path = null, file_expired = true where file_path is not null and created_at < now() - make_interval(mins => fd);
    paths := paths || fp;
  end if;
  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects where bucket_id = 'mc2-chat' and (name = any (paths)
      or (created_at < now() - interval '1 day' and name not in (select file_path from mc2_ac_messages where file_path is not null)));
  exception when others then null;
  end;
  return n;
end $$;
revoke all on function mc2_ac_purge() from public, anon, authenticated;

create or replace function mc2_ac_admin_retention() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  return jsonb_build_object('default', coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'keep_min'), 1440),
    'file_default', coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'file_keep_min'), 1440),
    'sessions', coalesce((select jsonb_agg(to_jsonb(x) order by x.dsort, x.ssort) from (
      select s.id, d.name as dept, s.name, s.keep_min, d.sort as dsort, s.sort as ssort,
        (select count(*) from mc2_ac_messages m where m.session_id = s.id) as msgs,
        (select count(*) from mc2_ac_messages m where m.session_id = s.id and m.file_path is not null) as files
      from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id) x), '[]'::jsonb));
end $$;

create or replace function mc2_ac_admin_file_keep(p_min int) returns void language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm();
begin
  if p_min is null or p_min < 0 or p_min > 525600 then raise exception 'সময় ০ থেকে ৫,২৫,৬০০ মিনিটের (১ বছর) মধ্যে দিন'; end if;
  insert into mc2_ac_cfg(key, value) values ('file_keep_min', to_jsonb(p_min)) on conflict (key) do update set value = excluded.value;
  perform mc2_ac_log(null, 'keep_set', 'ফাইল ডিফল্ট = ' || p_min || ' মিনিট', null, a);
end $$;

-- ৩) Seen তালিকা: একই নামের একাধিক ইউজার থাকলে নামের পাশে তাদের আলাদা ID দেখায়
create or replace function mc2_ac_seenlist(p_msg bigint) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(z.n order by z.at), '[]'::jsonb) from (
    select case when count(*) over (partition by lower(s.nick)) > 1 then s.nick || ' (' || mc2_uid(s.voter) || ')' else s.nick end as n, s.at
    from mc2_ac_seen s join mc2_ac_messages m on m.session_id = s.session_id
    where m.id = p_msg and s.last_id >= m.id and s.voter <> m.voter) z $$;
grant execute on function mc2_ac_seenlist(bigint) to anon, authenticated;

-- অ্যাডমিন RPC-র অনুমতি আবার বসানো (নতুন ফাংশনসহ)
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.proname like 'mc2\_ac\_admin\_%' and p.pronamespace = 'public'::regnamespace loop
    execute 'revoke all on function ' || f.sig || ' from public, anon';
    execute 'grant execute on function ' || f.sig || ' to authenticated';
  end loop;
end $$;


-- ==================== 11_supabase-ui-settings.sql ====================
-- Friend Adda: হোম / নিয়ম-পপআপ / ফল-কার্ডের বাটন অন-অফ সেটিংস (ছোট ফাইল — এটা একবার চালাতে হবে)
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run। বারবার চালালেও ক্ষতি নেই।
-- আগে supabase-gallery.sql চালানো থাকতে হবে (mc2_settings টেবিল সেখানে; সাইট ওটা পাবলিকলি পড়তে পারে, শুধু অ্যাডমিন লিখতে পারে)।
-- কী করে: mc2_settings-এ নতুন key 'ui_cfg' (JSON: {"off":["চাবি",...]}) সেভ করার অনুমতি দেয়, আর এই key সেভ করলে
-- কুইজের প্রশ্ন নতুন করে বানানোর ট্রিগার যেন অকারণে না চলে তা ঠিক করে।

create or replace function mc2_settings_check() returns trigger language plpgsql as $$
begin
  if new.key = 'quiz_count' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not between 1 and 50 then raise exception 'quiz_count must be 1..50'; end if;
  elsif new.key = 'wrong_options' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not in (3, 4) then raise exception 'wrong_options must be 3 or 4'; end if;
  elsif new.key = 'png_max_kb' then
    if jsonb_typeof(new.value) <> 'number' or not ((new.value #>> '{}')::numeric = 0 or (new.value #>> '{}')::numeric between 100 and 5000) then raise exception 'png_max_kb must be 0 or 100..5000'; end if;
  elsif new.key = 'quiz_categories' then
    if jsonb_typeof(new.value) <> 'array' then raise exception 'quiz_categories must be an array'; end if;
  elsif new.key = 'ui_cfg' then
    if jsonb_typeof(new.value) <> 'object' or jsonb_typeof(new.value -> 'off') is distinct from 'array' or pg_column_size(new.value) > 8000 then raise exception 'ui_cfg must be {"off":[...]}'; end if;
  else
    raise exception 'unknown setting';
  end if;
  return new;
end $$;
drop trigger if exists t_mc2_settings_check on mc2_settings;
create trigger t_mc2_settings_check before insert or update on mc2_settings for each row execute function mc2_settings_check();

-- আগে: যেকোনো সেটিংস সেভে প্রশ্ন নতুন করে বানাত। এখন: 'ui_cfg' বাদে বাকি key-র জন্য আগের মতোই।
drop trigger if exists t_mc2_settings_q on mc2_settings;
create trigger t_mc2_settings_q after insert or update on mc2_settings for each row when (new.key <> 'ui_cfg') execute function mc2_trg_rebuild();

insert into mc2_settings(key, value) values ('ui_cfg', '{"off":[]}') on conflict (key) do nothing;


-- ==================== 12_supabase-new-20261017.sql ====================
-- NEW SQL (2026-10-17): বিজয়ী ঘোষণা + কাস্টম লটারি লিস্ট + ওয়েবসাইটে অন/অফ
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run চাপুন। (পুরোনো কিছু বদলায় না, আবার চালালেও সমস্যা নেই)
-- আগে চালানো থাকতে হবে: supabase-community.sql (mc2_is_admin())।

create table if not exists mc2_draws (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  draw_date date not null default current_date,
  kind text not null default 'week' check (kind in ('week','month','custom')),
  title text not null,
  descr text,
  source text,
  winners jsonb not null default '[]'::jsonb,
  show boolean not null default true
);
create table if not exists mc2_dlists (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  items jsonb not null default '[]'::jsonb
);
create table if not exists mc2_draw_cfg (k text primary key, v text);
insert into mc2_draw_cfg (k, v) values ('show', '1') on conflict (k) do nothing;
alter table mc2_draws enable row level security;
alter table mc2_dlists enable row level security;
alter table mc2_draw_cfg enable row level security;   -- সরাসরি পড়া/লেখা বন্ধ; সব নিচের ফাংশন দিয়ে

-- বিজয়ীর তালিকা থেকে শুধু নিরাপদ ফিল্ড রাখে
create or replace function mc2_draw_clean(p jsonb) returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', left(trim(w ->> 'name'), 80),
    'dept', left(coalesce(w ->> 'dept', ''), 80),
    'batch', left(coalesce(w ->> 'batch', ''), 40),
    'rank', case when (w ->> 'rank') ~ '^\d{1,6}$' then (w ->> 'rank')::int end,
    'score', case when (w ->> 'score') ~ '^\d{1,6}$' then (w ->> 'score')::int end,
    'note', left(coalesce(w ->> 'note', ''), 200))), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) w
  where length(trim(coalesce(w ->> 'name', ''))) > 0
$$;

-- পাবলিক: সাইটের বিজয়ী পেজ (অফ থাকলে on=false, কিছুই দেয় না)
create or replace function mc2_draws_public(p_limit int default 30, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare on_ boolean; r jsonb;
begin
  select coalesce((select v from mc2_draw_cfg where k = 'show'), '1') = '1' into on_;
  if not on_ then return jsonb_build_object('on', false, 'rows', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into r from (
    select id, draw_date, kind, title, descr, winners from mc2_draws where show
    order by draw_date desc, id desc limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)) x;
  return jsonb_build_object('on', true, 'rows', r);
end $$;

-- অ্যাডমিন
create or replace function mc2_draw_admin_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb; on_ boolean;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  select coalesce((select v from mc2_draw_cfg where k = 'show'), '1') = '1' into on_;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into r from (select * from mc2_draws order by draw_date desc, id desc limit 500) x;
  return jsonb_build_object('on', on_, 'rows', r);
end $$;

create or replace function mc2_draw_save(p jsonb) returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint; t text; k text; w jsonb;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  t := left(trim(coalesce(p ->> 'title', '')), 120);
  if length(t) < 2 then raise exception 'title needed'; end if;
  k := case when p ->> 'kind' in ('week', 'month', 'custom') then p ->> 'kind' else 'week' end;
  w := mc2_draw_clean(p -> 'winners');
  if jsonb_array_length(w) > 300 then raise exception 'too many'; end if;
  if (p ->> 'id') ~ '^\d+$' and exists (select 1 from mc2_draws where id = (p ->> 'id')::bigint) then
    update mc2_draws set title = t, kind = k, draw_date = coalesce(nullif(p ->> 'date', '')::date, draw_date),
      descr = nullif(left(trim(coalesce(p ->> 'descr', '')), 2000), ''), source = left(coalesce(p ->> 'source', ''), 120),
      winners = w, show = coalesce((p ->> 'show')::boolean, true) where id = (p ->> 'id')::bigint returning id into v;
  else
    insert into mc2_draws (title, kind, draw_date, descr, source, winners, show)
    values (t, k, coalesce(nullif(p ->> 'date', '')::date, current_date), nullif(left(trim(coalesce(p ->> 'descr', '')), 2000), ''),
      left(coalesce(p ->> 'source', ''), 120), w, coalesce((p ->> 'show')::boolean, true)) returning id into v;
  end if;
  return v;
end $$;

create or replace function mc2_draw_show(p_id bigint, p_show boolean) returns void language plpgsql security definer set search_path = public as $$
begin if not mc2_is_admin() then raise exception 'forbidden'; end if; update mc2_draws set show = p_show where id = p_id; end $$;
create or replace function mc2_draw_del(p_id bigint) returns void language plpgsql security definer set search_path = public as $$
begin if not mc2_is_admin() then raise exception 'forbidden'; end if; delete from mc2_draws where id = p_id; end $$;
create or replace function mc2_draw_cfg_set(p_on boolean) returns void language plpgsql security definer set search_path = public as $$
begin if not mc2_is_admin() then raise exception 'forbidden'; end if;
  insert into mc2_draw_cfg (k, v) values ('show', case when p_on then '1' else '0' end) on conflict (k) do update set v = excluded.v; end $$;

-- কাস্টম লটারি লিস্ট (নামের তালিকা)
create or replace function mc2_dlist_all() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(x) from (select id, name, items, created_at from mc2_dlists order by id desc limit 200) x), '[]'::jsonb); end $$;
create or replace function mc2_dlist_save(p_id bigint, p_name text, p_items jsonb) returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint; it jsonb;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if length(trim(coalesce(p_name, ''))) < 1 then raise exception 'name needed'; end if;
  select coalesce(jsonb_agg(to_jsonb(left(trim(e), 80))), '[]'::jsonb) into it
    from jsonb_array_elements_text(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) e where length(trim(e)) > 0;
  if jsonb_array_length(it) > 3000 then raise exception 'too many'; end if;
  if p_id is not null and exists (select 1 from mc2_dlists where id = p_id) then
    update mc2_dlists set name = left(trim(p_name), 80), items = it where id = p_id returning id into v;
  else insert into mc2_dlists (name, items) values (left(trim(p_name), 80), it) returning id into v; end if;
  return v;
end $$;
create or replace function mc2_dlist_del(p_id bigint) returns void language plpgsql security definer set search_path = public as $$
begin if not mc2_is_admin() then raise exception 'forbidden'; end if; delete from mc2_dlists where id = p_id; end $$;

revoke all on function mc2_draw_clean(jsonb), mc2_draws_public(int, int), mc2_draw_admin_list(), mc2_draw_save(jsonb), mc2_draw_show(bigint, boolean), mc2_draw_del(bigint), mc2_draw_cfg_set(boolean), mc2_dlist_all(), mc2_dlist_save(bigint, text, jsonb), mc2_dlist_del(bigint) from public, anon;
grant execute on function mc2_draws_public(int, int) to anon, authenticated;
grant execute on function mc2_draw_admin_list(), mc2_draw_save(jsonb), mc2_draw_show(bigint, boolean), mc2_draw_del(bigint), mc2_draw_cfg_set(boolean), mc2_dlist_all(), mc2_dlist_save(bigint, text, jsonb), mc2_dlist_del(bigint) to authenticated;

-- নাম-চেক (Run করার পর আলাদাভাবে চালান; missing ফাঁকা এলে সব ঠিক):
-- select n as missing from unnest(array['mc2_draws_public','mc2_draw_admin_list','mc2_draw_save','mc2_draw_show','mc2_draw_del','mc2_draw_cfg_set','mc2_dlist_all','mc2_dlist_save','mc2_dlist_del']) n where not exists (select 1 from pg_proc where proname = n);


-- ==================== 13_supabase-new-20261017b.sql ====================
-- NEW SQL (2026-10-17 b): (১) বিভাগ-ভিত্তিক চ্যাট ও অ্যাটাচমেন্ট মোছার সময়, (২) চ্যাটের সক্রিয় ইউজার তালিকা (ব্যান অবস্থাসহ), (৩) ভিজিটর ট্যাবের অনলাইন তালিকা (দেশ, ফোন মডেল, শেষ সক্রিয়)
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run চাপুন। পুরোনো কিছু বদলায় না (শুধু মোছার ফাংশন বিভাগের সময় মানতে শেখে); আবার চালালেও সমস্যা নেই।
-- আগে চালানো থাকতে হবে: moderation, live-board, additions, userinfo (সবই চালানো আছে)।

-- ========== ১) বিভাগ-ভিত্তিক মোছার সময় ==========
-- মিনিটে। খালি (null) = ডিফল্ট অনুযায়ী; 0 = কখনো মুছবে না। চ্যাট: সেশনের সময > বিভাগের সময > ডিফল্ট। অ্যাটাচমেন্ট: বিভাগের সময > ডিফল্ট।
alter table mc2_ac_depts add column if not exists keep_min int check (keep_min is null or keep_min between 0 and 525600);
alter table mc2_ac_depts add column if not exists file_keep_min int check (file_keep_min is null or file_keep_min between 0 and 525600);

create or replace function mc2_ac_purge() returns int language plpgsql security definer set search_path = public as $$
declare d int := coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'keep_min'), 1440);
        fd int := coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'file_keep_min'), 1440);
        n int; paths text[]; fp text[];
begin
  -- বার্তার মেয়াদ: সেশন > বিভাগ > ডিফল্ট
  select coalesce(array_agg(m.file_path) filter (where m.file_path is not null), '{}') into paths
    from mc2_ac_messages m join mc2_ac_sessions s on s.id = m.session_id join mc2_ac_depts dp on dp.id = s.dept_id
    where coalesce(s.keep_min, dp.keep_min, d) > 0 and m.created_at < now() - make_interval(mins => coalesce(s.keep_min, dp.keep_min, d));
  delete from mc2_ac_messages m using mc2_ac_sessions s, mc2_ac_depts dp
    where s.id = m.session_id and dp.id = s.dept_id and coalesce(s.keep_min, dp.keep_min, d) > 0
      and m.created_at < now() - make_interval(mins => coalesce(s.keep_min, dp.keep_min, d));
  get diagnostics n = row_count;
  -- শুধু ফাইলের মেয়াদ (বিভাগ > ডিফল্ট): বার্তা থাকে, ফাইল মুছে "ফাইলের মেয়াদ শেষ" দেখায়
  select coalesce(array_agg(m.file_path), '{}') into fp
    from mc2_ac_messages m join mc2_ac_sessions s on s.id = m.session_id join mc2_ac_depts dp on dp.id = s.dept_id
    where m.file_path is not null and coalesce(dp.file_keep_min, fd) > 0 and m.created_at < now() - make_interval(mins => coalesce(dp.file_keep_min, fd));
  update mc2_ac_messages m set file_path = null, file_expired = true from mc2_ac_sessions s, mc2_ac_depts dp
    where s.id = m.session_id and dp.id = s.dept_id and m.file_path is not null and coalesce(dp.file_keep_min, fd) > 0
      and m.created_at < now() - make_interval(mins => coalesce(dp.file_keep_min, fd));
  paths := paths || fp;
  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects where bucket_id = 'mc2-chat' and (name = any (paths)
      or (created_at < now() - interval '1 day' and name not in (select file_path from mc2_ac_messages where file_path is not null)));
  exception when others then null;
  end;
  return n;
end $$;
revoke all on function mc2_ac_purge() from public, anon, authenticated;

-- অ্যাডমিন পেজের জন্য: আগের সব কিছু + বিভাগের সময় ('depts', প্রতি সেশনে 'dept_id', 'dkeep', 'dfile')
create or replace function mc2_ac_admin_retention() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  return jsonb_build_object('default', coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'keep_min'), 1440),
    'file_default', coalesce((select (value #>> '{}')::int from mc2_ac_cfg where key = 'file_keep_min'), 1440),
    'depts', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'keep_min', d.keep_min, 'file_keep_min', d.file_keep_min) order by d.sort, d.name) from mc2_ac_depts d), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(to_jsonb(x) order by x.dsort, x.ssort) from (
      select s.id, d.id as dept_id, d.name as dept, s.name, s.keep_min, d.keep_min as dkeep, d.file_keep_min as dfile, d.sort as dsort, s.sort as ssort,
        (select count(*) from mc2_ac_messages m where m.session_id = s.id) as msgs,
        (select count(*) from mc2_ac_messages m where m.session_id = s.id and m.file_path is not null) as files
      from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id) x), '[]'::jsonb));
end $$;

-- বিভাগের সময় বদল (Save বোতাম): p_chat_min = চ্যাটের সময়, p_file_min = অ্যাটাচমেন্টের সময়; null = ডিফল্ট অনুযায়ী; 0 = কখনো না
create or replace function mc2_ac_admin_dept_keep(p_dept int, p_chat_min int, p_file_min int) returns jsonb language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm(); nm text;
begin
  if (p_chat_min is not null and (p_chat_min < 0 or p_chat_min > 525600)) or (p_file_min is not null and (p_file_min < 0 or p_file_min > 525600)) then
    raise exception 'সময় ০ থেকে ৫,২৫,৬০০ মিনিটের (১ বছর) মধ্যে দিন';
  end if;
  update mc2_ac_depts set keep_min = p_chat_min, file_keep_min = p_file_min where id = p_dept returning name into nm;
  if nm is null then raise exception 'বিভাগ পাওয়া যায়নি'; end if;
  perform mc2_ac_log(null, 'keep_set', 'বিভাগ ' || nm || ': চ্যাট = ' || coalesce(p_chat_min::text, 'ডিফল্ট') || ', ফাইল = ' || coalesce(p_file_min::text, 'ডিফল্ট') || ' মিনিট', null, a);
  return jsonb_build_object('chat', p_chat_min, 'file', p_file_min);
end $$;

-- ========== ২) চ্যাটের সক্রিয় ইউজার (অ্যাডমিন: সব তথ্য + ব্যান অবস্থা) ==========
-- p_hours = 0: শুধু এখন চ্যাটে অনলাইন; p_hours > 0: অনলাইন + গত p_hours ঘণ্টায় বার্তা পাঠানো (সর্বোচ্চ ৭২০)। p_dept খালি = সব বিভাগ।
create or replace function mc2_ac_admin_active(p_hours int default 24, p_dept int default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.onl desc, x.ls desc nulls last) from (
    select a.voter, mc2_uid(a.voter) as uid,
      coalesce(lm.nick, p.nick, 'বেনামি') as nick,
      coalesce(dd.name, p.chat_dept) as dept, coalesce(ss.name, p.chat_session) as sess,
      coalesce(mc2_online(p.last_seen, p.offline), false) as onl,
      (extract(epoch from greatest(p.last_seen, lm.created_at)) * 1000)::bigint as ls,
      (select count(*) from mc2_ac_messages g where g.voter = a.voter and not g.deleted) as msgs,
      p.ip, p.country, p.region, p.city, left(p.ua, 200) as ua, p.info ->> 'model' as model,
      coalesce(mc2_ac_block(a.voter), 'ok') as st, md.until, md.reason, coalesce(md.verified, false) as verified, coalesce(md.warns, 0) as warns,
      (select count(distinct r.reporter) from mc2_ac_reports r where r.target = a.voter and r.status = 'valid') as valid_cnt
    from (
      select voter from mc2_presence where page = '#anon' and mc2_online(last_seen, offline)
      union
      select voter from mc2_ac_messages where p_hours > 0 and created_at > now() - make_interval(hours => least(p_hours, 720))
    ) a
    left join mc2_presence p on p.voter = a.voter
    left join lateral (select g.nick, g.dept_id, g.session_id, g.created_at from mc2_ac_messages g where g.voter = a.voter order by g.id desc limit 1) lm on true
    left join mc2_ac_depts dd on dd.id = lm.dept_id
    left join mc2_ac_sessions ss on ss.id = lm.session_id
    left join mc2_ac_mod md on md.voter = a.voter
    where p_dept is null or dd.id = p_dept or p.chat_dept_id = p_dept
    limit 300) x), '[]'::jsonb);
end $$;

-- ========== ৩) ভিজিটর ট্যাব: অনলাইন সংখ্যা + দেশভিত্তিক গণনা + অনলাইনদের তালিকা ==========
create or replace function mc2_admin_online_full() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare dday date := (now() at time zone 'Asia/Dhaka')::date;
begin
  if not mc2_is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'online', (select count(*) from mc2_presence where mc2_online(last_seen, offline)),
    'today', (select count(*) from mc2_presence where (last_seen at time zone 'Asia/Dhaka')::date = dday),
    'total', (select count(*) from mc2_presence),
    'countries', coalesce((select jsonb_agg(jsonb_build_object('c', c, 'n', n) order by n desc, c) from (
      select coalesce(nullif(upper(country), ''), '') as c, count(*) as n from mc2_presence where mc2_online(last_seen, offline) group by 1) z), '[]'::jsonb),
    'rows', coalesce((select jsonb_agg(to_jsonb(t) order by t.ls desc) from (
      select p.voter as v, mc2_uid(p.voter) as u, coalesce(p.game_name, p.nick, 'অজানা') as n, coalesce(p.game_dept, p.chat_dept) as d, coalesce(p.game_batch, p.chat_session) as s,
        p.page as pg, p.ip, p.country, p.region, p.city, left(p.ua, 200) as ua, p.info ->> 'model' as model, p.visits,
        (extract(epoch from p.last_seen) * 1000)::bigint as ls, (extract(epoch from p.joined_at) * 1000)::bigint as jn
      from mc2_presence p where mc2_online(p.last_seen, p.offline) order by p.last_seen desc limit 300) t), '[]'::jsonb));
end $$;
revoke all on function mc2_admin_online_full() from public, anon; grant execute on function mc2_admin_online_full() to authenticated;

-- অ্যাডমিন RPC-র অনুমতি (নতুন ফাংশনসহ)
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.proname like 'mc2\_ac\_admin\_%' and p.pronamespace = 'public'::regnamespace loop
    execute 'revoke all on function ' || f.sig || ' from public, anon';
    execute 'grant execute on function ' || f.sig || ' to authenticated';
  end loop;
end $$;

notify pgrst, 'reload schema';

-- নাম-চেক (Run করার পর এটা আলাদা চালান; দুটোই ঠিক থাকলে cols_ok = 2 ও funcs_ok = 3):
-- select (select count(*) from information_schema.columns where table_name = 'mc2_ac_depts' and column_name in ('keep_min', 'file_keep_min')) as cols_ok,
--        (select count(distinct proname) from pg_proc where proname in ('mc2_ac_admin_dept_keep', 'mc2_ac_admin_active', 'mc2_admin_online_full')) as funcs_ok;


-- ==================== 14_supabase-new-20261017c.sql ====================
-- Friend Adda: কার্ড PNG-এর KB ইচ্ছামতো (১০–১০,০০,০০০ KB; ০ = আনলিমিটেড) + কাস্টম কার্ড সাইজ (চওড়া×উচ্চতা) সেটিংস (ছোট ফাইল — একবার চালাতে হবে)
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run। বারবার চালালেও ক্ষতি নেই।
-- আগে supabase-gallery.sql ও supabase-ui-settings.sql চালানো থাকতে হবে (সেগুলো চালানোই আছে)।
-- কী করে: (১) 'png_max_kb'-এর সীমা ১০০–৫০০০ থেকে বাড়িয়ে ১০–১০,০০,০০০ করে (০ = আনলিমিটেড);
--          (২) mc2_settings-এ নতুন key 'card_cfg' ({"on":bool,"w":..,"h":..,"sw":..,"sh":..}) সেভ করার অনুমতি দেয় (১০০–৮০০০ px);
--          (৩) 'card_cfg' সেভ করলে কুইজের প্রশ্ন নতুন করে বানানোর ট্রিগার যেন অকারণে না চলে।

create or replace function mc2_settings_check() returns trigger language plpgsql as $$
begin
  if new.key = 'quiz_count' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not between 1 and 50 then raise exception 'quiz_count must be 1..50'; end if;
  elsif new.key = 'wrong_options' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not in (3, 4) then raise exception 'wrong_options must be 3 or 4'; end if;
  elsif new.key = 'png_max_kb' then
    if jsonb_typeof(new.value) <> 'number' or not ((new.value #>> '{}')::numeric = 0 or (new.value #>> '{}')::numeric between 10 and 1000000) then raise exception 'png_max_kb must be 0 or 10..1000000'; end if;
  elsif new.key = 'quiz_categories' then
    if jsonb_typeof(new.value) <> 'array' then raise exception 'quiz_categories must be an array'; end if;
  elsif new.key = 'ui_cfg' then
    if jsonb_typeof(new.value) <> 'object' or jsonb_typeof(new.value -> 'off') is distinct from 'array' or pg_column_size(new.value) > 8000 then raise exception 'ui_cfg must be {"off":[...]}'; end if;
  elsif new.key = 'card_cfg' then
    if jsonb_typeof(new.value) <> 'object' or pg_column_size(new.value) > 2000 then raise exception 'card_cfg must be an object'; end if;
    if exists (select 1 from jsonb_each(new.value) e where e.key in ('w', 'h', 'sw', 'sh') and (jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}')::numeric not between 100 and 8000)) then raise exception 'card_cfg sizes must be 100..8000'; end if;
  else
    raise exception 'unknown setting';
  end if;
  return new;
end $$;
drop trigger if exists t_mc2_settings_check on mc2_settings;
create trigger t_mc2_settings_check before insert or update on mc2_settings for each row execute function mc2_settings_check();

drop trigger if exists t_mc2_settings_q on mc2_settings;
create trigger t_mc2_settings_q after insert or update on mc2_settings for each row when (new.key not in ('ui_cfg', 'card_cfg')) execute function mc2_trg_rebuild();

insert into mc2_settings(key, value) values ('card_cfg', '{"on":false,"w":1080,"h":1400,"sw":1080,"sh":1920}') on conflict (key) do nothing;

