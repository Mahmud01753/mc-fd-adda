-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালাবেন না (শুধু নতুন Supabase প্রজেক্টে একবার)
-- কাজ: রিসাইকেল বিন, অটো-ক্লিনআপ, মডারেশন, রুমের পাসওয়ার্ড।
-- SQL-2 (বিন/ক্লিনআপ/মডারেশন) — পুরোটা কপি করে Supabase SQL Editor-এ Run। ক্রম: ১ → ২ → ৩ → ADMIN

-- ==================== 15_supabase-new-20261017d.sql ====================
-- Friend Adda — নতুন SQL (২০২৬-১০-১৭ d): রিঅ্যাকশন নামের তালিকা + চ্যাট রুমের পাসওয়ার্ড (ডিফল্ট বন্ধ, অ্যাডমিন চালু/বন্ধ, ছাড়লে আবার পাসওয়ার্ড)।
-- Supabase SQL Editor-এ একবার চালান (supabase-moderation.sql আগে চালানো থাকতে হবে)। আবার চালালেও ক্ষতি নেই।

-- চ্যাট পাঠানো: পাসওয়ার্ড দেওয়া রুমে না ঢুকলে -6
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


-- ==================== 16_supabase-new-20261018.sql ====================
-- NEW SQL (2026-10-18): লটারি ফোল্ডার (হোমে অন/অফ, ফেসবুক ফোল্ডার, বিজয়ীর চাবি) + ভেরিফাই/বাদ ফ্ল্যাগ + ফেসবুক নাম/লিস্ট/বিজয়ী আনলিমিটেড (১ লাখ পর্যন্ত)
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run চাপুন। (পুরোনো কিছু বদলায় না, আবার চালালেও সমস্যা নেই)
-- আগে চালানো থাকতে হবে: supabase-new-20261017.sql (mc2_draws, mc2_is_admin())।

alter table mc2_draws add column if not exists home boolean not null default false;      -- হোমে দেখাবে কি না (ডিফল্ট অফ)
alter table mc2_draws add column if not exists fb boolean not null default false;        -- ফেসবুক ফোল্ডার
alter table mc2_draws add column if not exists fbnames jsonb not null default '[]'::jsonb; -- ফেসবুক ফোল্ডারের নাম (শুধু অ্যাডমিন)
alter table mc2_draws add column if not exists wkeys jsonb not null default '[]'::jsonb;   -- বিজয়ীর চাবি (শুধু অ্যাডমিন; একবার জিতলে আর ওঠে না)
alter table mc2_draws add column if not exists srcs jsonb not null default '[]'::jsonb;    -- কোন কোন লিস্ট থেকে এসেছে

create table if not exists mc2_entry_flags (
  k text primary key,
  st text not null check (st in ('ok', 'no', 'ex')),   -- ok = ভেরিফাইড, no = নট ভেরিফাইড, ex = লটারি থেকে বাদ
  at timestamptz not null default now()
);
alter table mc2_entry_flags enable row level security;   -- সরাসরি পড়া/লেখা বন্ধ; শুধু নিচের ফাংশন

create or replace function mc2_txt_arr(p jsonb, p_max int) returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(to_jsonb(left(trim(e), 90))), '[]'::jsonb)
  from (select e from jsonb_array_elements_text(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) e
        where length(trim(e)) > 0 limit p_max) q
$$;

-- সেভ (আগের ফাংশন বদলে নতুন ফিল্ডসহ)
create or replace function mc2_draw_save(p jsonb) returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint; t text; k text; w jsonb; fn jsonb; wk jsonb; sr jsonb; hm boolean; fbb boolean;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  t := left(trim(coalesce(p ->> 'title', '')), 120);
  if length(t) < 2 then raise exception 'title needed'; end if;
  k := case when p ->> 'kind' in ('week', 'month', 'custom') then p ->> 'kind' else 'week' end;
  w := mc2_draw_clean(p -> 'winners');
  if jsonb_array_length(w) > 100000 then raise exception 'too many'; end if;
  fn := mc2_draw_clean(p -> 'fbnames');
  if jsonb_array_length(fn) > 100000 then raise exception 'too many'; end if;
  wk := mc2_txt_arr(p -> 'wkeys', 200000);
  sr := mc2_txt_arr(p -> 'srcs', 500);
  hm := coalesce((p ->> 'home')::boolean, false);
  fbb := coalesce((p ->> 'fb')::boolean, false);
  if (p ->> 'id') ~ '^\d+$' and exists (select 1 from mc2_draws where id = (p ->> 'id')::bigint) then
    update mc2_draws set title = t, kind = k, draw_date = coalesce(nullif(p ->> 'date', '')::date, draw_date),
      descr = nullif(left(trim(coalesce(p ->> 'descr', '')), 2000), ''), source = left(coalesce(p ->> 'source', ''), 120),
      winners = w, show = coalesce((p ->> 'show')::boolean, true), home = hm, fb = fbb, fbnames = fn, wkeys = wk, srcs = sr
    where id = (p ->> 'id')::bigint returning id into v;
  else
    insert into mc2_draws (title, kind, draw_date, descr, source, winners, show, home, fb, fbnames, wkeys, srcs)
    values (t, k, coalesce(nullif(p ->> 'date', '')::date, current_date), nullif(left(trim(coalesce(p ->> 'descr', '')), 2000), ''),
      left(coalesce(p ->> 'source', ''), 120), w, coalesce((p ->> 'show')::boolean, true), hm, fbb, fn, wk, sr) returning id into v;
  end if;
  return v;
end $$;

-- হোমে দেখানোর সুইচ (প্রতিটি ফোল্ডারের আলাদা)
create or replace function mc2_draw_home_set(p_id bigint, p_on boolean) returns void language plpgsql security definer set search_path = public as $$
begin if not mc2_is_admin() then raise exception 'forbidden'; end if; update mc2_draws set home = coalesce(p_on, false) where id = p_id; end $$;

-- পাবলিক: হোমে যেসব ফোল্ডার অন (মাস্টার সুইচ অফ থাকলে কিছুই দেয় না); শুধু নিরাপদ ফিল্ড, কোনো চাবি/ফেসবুক-নাম নয়
create or replace function mc2_draws_home() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare on_ boolean; r jsonb;
begin
  select coalesce((select v from mc2_draw_cfg where k = 'show'), '1') = '1' into on_;
  if not on_ then return jsonb_build_object('on', false, 'rows', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into r from (
    select id, draw_date, kind, title, descr, winners from mc2_draws
    where home and jsonb_array_length(winners) > 0 order by draw_date desc, id desc limit 12) x;
  return jsonb_build_object('on', true, 'rows', r);
end $$;

-- ভেরিফাই / বাদ ফ্ল্যাগ
create or replace function mc2_dlist_save(p_id bigint, p_name text, p_items jsonb) returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint; it jsonb;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if length(trim(coalesce(p_name, ''))) < 1 then raise exception 'name needed'; end if;
  select coalesce(jsonb_agg(to_jsonb(left(trim(e), 90))), '[]'::jsonb) into it
    from jsonb_array_elements_text(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) e where length(trim(e)) > 0;
  if jsonb_array_length(it) > 100000 then raise exception 'too many'; end if;
  if p_id is not null and exists (select 1 from mc2_dlists where id = p_id) then
    update mc2_dlists set name = left(trim(p_name), 80), items = it where id = p_id returning id into v;
  else insert into mc2_dlists (name, items) values (left(trim(p_name), 80), it) returning id into v; end if;
  return v;
end $$;

create or replace function mc2_flag_all() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_object_agg(k, st) from mc2_entry_flags), '{}'::jsonb); end $$;
create or replace function mc2_flag_set(p_k text, p_st text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if length(coalesce(p_k, '')) < 3 or length(p_k) > 120 then raise exception 'bad key'; end if;
  if p_st is null or p_st = '' then delete from mc2_entry_flags where k = p_k; return; end if;
  if p_st not in ('ok', 'no', 'ex') then raise exception 'bad status'; end if;
  insert into mc2_entry_flags (k, st) values (p_k, p_st) on conflict (k) do update set st = excluded.st, at = now();
end $$;

revoke all on function mc2_txt_arr(jsonb, int), mc2_draw_save(jsonb), mc2_draw_home_set(bigint, boolean), mc2_draws_home(), mc2_flag_all(), mc2_flag_set(text, text) from public, anon;
grant execute on function mc2_draws_home() to anon, authenticated;
grant execute on function mc2_draw_save(jsonb), mc2_draw_home_set(bigint, boolean), mc2_flag_all(), mc2_flag_set(text, text) to authenticated;

-- নাম-চেক (Run করার পর আলাদাভাবে চালান; missing ফাঁকা এলে সব ঠিক):
-- select n as missing from unnest(array['mc2_draw_save','mc2_draw_home_set','mc2_draws_home','mc2_flag_all','mc2_flag_set','mc2_txt_arr']) n where not exists (select 1 from pg_proc where proname = n);


-- ==================== 17_supabase-new-20261018b.sql ====================
-- NEW SQL (2026-10-18 b): কুইজে অপশন সংখ্যা কাস্টম (মোট = ১ সঠিক + যত ছবি তত ভুল; যেমন মোট ২, ৩, ৫, ৬, ৭, ৯)
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run। আবার চালালেও ক্ষতি নেই।
-- আগে চালানো থাকতে হবে: supabase-new-20261017c.sql (সেগুলো চালানোই আছে)।

create or replace function mc2_settings_check() returns trigger language plpgsql as $$
begin
  if new.key = 'quiz_count' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not between 1 and 50 then raise exception 'quiz_count must be 1..50'; end if;
  elsif new.key = 'wrong_options' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not between 1 and 500 then raise exception 'wrong_options must be 1..500'; end if;
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

create or replace function mc2_rebuild_questions() returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select least(greatest(coalesce((select (value #>> '{}')::int from mc2_settings where key = 'wrong_options'), 3), 1), 500) into n;
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

select mc2_rebuild_questions();


-- ==================== 18_supabase-new-20261018d.sql ====================
-- বিজয়ীর পুরস্কার স্ট্যাটাস (দেওয়া হয়েছে/হয়নি) + অ্যাডমিনের ব্যক্তিগত নোট (শুধু অ্যাডমিন দেখে; পাবলিক RPC-তে কখনো যায় না)
-- আগে চালানো থাকতে হবে: supabase-new-20261017.sql (mc2_draws, mc2_is_admin())
create table if not exists mc2_prize_notes (
  draw_id bigint not null,
  wid text not null,                       -- নাম|বিভাগ|সেশন|ক্রম (একই নামের দুজনকে আলাদা রাখে)
  given boolean not null default false,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (draw_id, wid)
);
alter table mc2_prize_notes enable row level security;   -- সরাসরি পড়া/লেখা বন্ধ; শুধু নিচের ফাংশন

create or replace function mc2_pn_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('draw_id', draw_id, 'wid', wid, 'given', given, 'note', note)) from mc2_prize_notes), '[]'::jsonb);
end $$;

create or replace function mc2_pn_set(p_draw bigint, p_wid text, p_given boolean, p_note text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if length(coalesce(p_wid, '')) < 1 or length(p_wid) > 400 then raise exception 'bad key'; end if;
  insert into mc2_prize_notes (draw_id, wid, given, note, updated_at)
  values (p_draw, p_wid, coalesce(p_given, false), left(coalesce(p_note, ''), 3000), now())
  on conflict (draw_id, wid) do update set given = excluded.given, note = excluded.note, updated_at = now();
end $$;

revoke all on function mc2_pn_list(), mc2_pn_set(bigint, text, boolean, text) from public, anon;
grant execute on function mc2_pn_list(), mc2_pn_set(bigint, text, boolean, text) to authenticated;

-- নাম-চেক: ৩টা সারি (table + ২ ফাংশন) এলে ঠিক
select 'mc2_prize_notes' as name, (to_regclass('public.mc2_prize_notes') is not null) as ok
union all select proname, true from pg_proc where proname in ('mc2_pn_list', 'mc2_pn_set');


-- ==================== 19_supabase-new-20261018e.sql ====================
-- NEW SQL (2026-10-18 e): বিজয়ীর পাশে 🚩 ফ্ল্যাগ (শুধু অ্যাডমিন)। পাবলিক সাইটে কিছু দেখায় না।
-- আগে চালানো থাকতে হবে: supabase-new-20261018d.sql (mc2_prize_notes)। আবার চালালেও সমস্যা নেই।
alter table mc2_prize_notes add column if not exists flag boolean not null default false;

create or replace function mc2_pn_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('draw_id', draw_id, 'wid', wid, 'given', given, 'note', note, 'flag', flag)) from mc2_prize_notes), '[]'::jsonb);
end $$;

create or replace function mc2_pn_flag(p_draw bigint, p_wid text, p_flag boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if length(coalesce(p_wid, '')) < 1 or length(p_wid) > 400 then raise exception 'bad key'; end if;
  insert into mc2_prize_notes (draw_id, wid, flag, updated_at) values (p_draw, p_wid, coalesce(p_flag, false), now())
  on conflict (draw_id, wid) do update set flag = excluded.flag, updated_at = now();
end $$;

revoke all on function mc2_pn_list(), mc2_pn_flag(bigint, text, boolean) from public, anon;
grant execute on function mc2_pn_list(), mc2_pn_flag(bigint, text, boolean) to authenticated;

-- নাম-চেক: ২টা সারি (mc2_pn_flag, flag কলাম) এলে ঠিক
select 'mc2_pn_flag' as name, exists (select 1 from pg_proc where proname = 'mc2_pn_flag') as ok
union all select 'flag column', exists (select 1 from information_schema.columns where table_name = 'mc2_prize_notes' and column_name = 'flag');


-- ==================== 20_supabase-new-20261018f.sql ====================
-- NEW SQL (2026-10-18 f): হোমের বিজয়ী লাইনের অন/অফ ও লেখা (mc2_settings key 'home_cfg')
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run। আবার চালালেও ক্ষতি নেই।
-- আগে চালানো থাকতে হবে: supabase-new-20261018b.sql (চালানোই আছে)।
-- home_cfg = {"l1":true|false, "l2":true|false, "t1":"লেখা", "t2":"লেখা"}; পাবলিক-রিড (mc2_settings আগেই পাবলিক-রিড)।

create or replace function mc2_settings_check() returns trigger language plpgsql as $$
begin
  if new.key = 'quiz_count' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not between 1 and 50 then raise exception 'quiz_count must be 1..50'; end if;
  elsif new.key = 'wrong_options' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not between 1 and 500 then raise exception 'wrong_options must be 1..500'; end if;
  elsif new.key = 'png_max_kb' then
    if jsonb_typeof(new.value) <> 'number' or not ((new.value #>> '{}')::numeric = 0 or (new.value #>> '{}')::numeric between 10 and 1000000) then raise exception 'png_max_kb must be 0 or 10..1000000'; end if;
  elsif new.key = 'quiz_categories' then
    if jsonb_typeof(new.value) <> 'array' then raise exception 'quiz_categories must be an array'; end if;
  elsif new.key = 'ui_cfg' then
    if jsonb_typeof(new.value) <> 'object' or jsonb_typeof(new.value -> 'off') is distinct from 'array' or pg_column_size(new.value) > 8000 then raise exception 'ui_cfg must be {"off":[...]}'; end if;
  elsif new.key = 'card_cfg' then
    if jsonb_typeof(new.value) <> 'object' or pg_column_size(new.value) > 2000 then raise exception 'card_cfg must be an object'; end if;
    if exists (select 1 from jsonb_each(new.value) e where e.key in ('w', 'h', 'sw', 'sh') and (jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}')::numeric not between 100 and 8000)) then raise exception 'card_cfg sizes must be 100..8000'; end if;
  elsif new.key = 'home_cfg' then
    if jsonb_typeof(new.value) <> 'object' or pg_column_size(new.value) > 2000 then raise exception 'home_cfg must be an object'; end if;
  else
    raise exception 'unknown setting';
  end if;
  return new;
end $$;
drop trigger if exists t_mc2_settings_check on mc2_settings;
create trigger t_mc2_settings_check before insert or update on mc2_settings for each row execute function mc2_settings_check();

-- প্রশ্ন নতুন করে বানানোর ট্রিগার home_cfg-তে চলবে না
drop trigger if exists t_mc2_settings_q on mc2_settings;
create trigger t_mc2_settings_q after insert or update on mc2_settings for each row when (new.key not in ('ui_cfg', 'card_cfg', 'home_cfg')) execute function mc2_trg_rebuild();

-- নাম-চেক: দুটো সারিতেই true এলে ঠিক
select 'check fn has home_cfg' as name, (select prosrc like '%home_cfg%' from pg_proc where proname = 'mc2_settings_check' limit 1) as ok
union all select 'trigger skips home_cfg', exists (select 1 from pg_trigger where tgname = 't_mc2_settings_q' and pg_get_triggerdef(oid) like '%home_cfg%');


-- ==================== 21_supabase-new-20261018g.sql ====================
-- NEW SQL (2026-10-18): ইউজার ফোল্ডার (অ্যাডমিনের 🎁 পুরস্কার > 📁 ফোল্ডার) — ফোল্ডার ও সদস্যের টেবিল, শুধু অ্যাডমিন অ্যাক্সেস
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run চাপুন। (পুরোনো কিছু বদলায় না, আবার চালালেও সমস্যা নেই)
-- আগে চালানো থাকতে হবে: supabase-community.sql (mc2_is_admin())।
--
-- অটো ফোল্ডার "👥 সব ইউজার" ও "🎁 ফর্ম জমা" এখানে সেভ হয় না — ওই দুটো mc2_scores ও contest_entries থেকে নিজে তৈরি হয়, তাই মোছা বা নাম বদলানো যায় না।
-- এই টেবিলে শুধু কাস্টম ফোল্ডার ও তাদের সদস্য থাকে। ফোল্ডার মুছলে শুধু ফোল্ডার ও সদস্য-তালিকা যায়; ইউজারের স্কোর/ফর্ম/কার্ড কিছুই মোছে না।
-- "ইউজার" = ডিভাইস + নামের জুটি (ukey: u:<ডিভাইস>|<ছোট হাতের নাম>; ডিভাইস ছাড়া হাতে লেখা নামে n:<নাম>)।

create table if not exists mc2_ufolders (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 80 and btrim(name) not in ('👥 সব ইউজার', '🎁 ফর্ম জমা')),
  created_at timestamptz not null default now()
);
create unique index if not exists mc2_ufolders_name_u on mc2_ufolders (lower(btrim(name)));

create table if not exists mc2_ufolder_members (
  id bigint generated always as identity primary key,
  folder_id bigint not null references mc2_ufolders (id) on delete cascade,
  ukey text not null check (char_length(ukey) between 3 and 200),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  device text,
  dept text,
  batch text,
  score int,
  src text not null default 'all' check (src in ('all', 'form', 'manual')),   -- all = সব ইউজার থেকে, form = ফর্ম জমা থেকে, manual = হাতে লেখা নাম
  at timestamptz,                                                             -- কপির সময় ইউজারের শেষ সক্রিয়তা (খেলা/ফর্ম জমা)
  added_at timestamptz not null default now(),
  unique (folder_id, ukey)
);
create index if not exists mc2_ufolder_members_f on mc2_ufolder_members (folder_id);

-- শুধু অ্যাডমিন (লগইন করা + mc2_admins তালিকায়); অ্যানন/পাবলিক কিছুই পড়তে বা লিখতে পারে না
alter table mc2_ufolders enable row level security;
alter table mc2_ufolder_members enable row level security;
revoke all on mc2_ufolders, mc2_ufolder_members from anon, authenticated;
grant select, insert, update, delete on mc2_ufolders, mc2_ufolder_members to authenticated;
drop policy if exists "ufolders admin" on mc2_ufolders;
create policy "ufolders admin" on mc2_ufolders for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
drop policy if exists "ufolder members admin" on mc2_ufolder_members;
create policy "ufolder members admin" on mc2_ufolder_members for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());

-- নাম-চেক (Run করার পর আলাদাভাবে চালান; ২টা সারি এলে ঠিক):
-- select tablename, rowsecurity from pg_tables where tablename in ('mc2_ufolders', 'mc2_ufolder_members');


-- ==================== 22_supabase-new-20261018h.sql ====================
-- NEW SQL (2026-10-18, ধাপ ২-ক): ফোল্ডারের ধরন — লটারির বিজয়ী ফোল্ডার চেনার জন্য
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run চাপুন। (পুরোনো কিছু বদলায় না, আবার চালালেও সমস্যা নেই)
-- আগে চালানো থাকতে হবে: supabase-new-20261018g.sql (mc2_ufolders ও mc2_ufolder_members)।
--
-- kind = 'custom'  : হাতে বানানো সাধারণ ফোল্ডার (আগের সবগুলো এটাই থাকবে)
-- kind = 'winners' : লটারির পর নিজে তৈরি হওয়া বিজয়ী ফোল্ডার
-- নতুন টেবিল নেই, তাই আগের RLS (শুধু অ্যাডমিন অ্যাক্সেস) সেভাবেই কাজ করে; অ্যানন/পাবলিক কিছুই পড়তে বা লিখতে পারে না।

alter table mc2_ufolders add column if not exists kind text not null default 'custom';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'mc2_ufolders_kind_ck') then
    alter table mc2_ufolders add constraint mc2_ufolders_kind_ck check (kind in ('custom', 'winners'));
  end if;
end $$;

-- নাম-চেক (Run করার পর আলাদাভাবে চালান; kind কলামসহ ১টা সারি এলে ঠিক):
-- select column_name from information_schema.columns where table_name = 'mc2_ufolders' and column_name = 'kind';


-- ==================== 23_supabase-new-20261018i.sql ====================
-- NEW SQL (2026-10-18, ধাপ ২-খ): স্মার্ট ফোল্ডার (সেভ করা ফিল্টার) ও লটারির রেকর্ড
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run চাপুন। (পুরোনো কিছু বদলায় না, আবার চালালেও সমস্যা নেই)
-- আগে চালানো থাকতে হবে: supabase-new-20261018g.sql ও supabase-new-20261018h.sql।
--
-- filter : স্মার্ট ফোল্ডারের সেভ করা ফিল্টার (যেমন বিভাগ + এই সপ্তাহ); সদস্য তালিকা সেভ হয় না, প্রতিবার নতুন করে হিসাব হয় — তাই নতুন লোক এলে নিজে ঢোকে।
-- meta   : বিজয়ী ফোল্ডারের লটারি-রেকর্ড (কোন ফোল্ডারে "this" টিক ছিল, পুলে কতজন ছিল, বাতিল হওয়া বিজয়ী)।
-- আনডু (মুভ/মোছা ফেরানো) পাতা খোলা থাকা পর্যন্ত চলে, তাই এর জন্য টেবিল লাগে না।
-- নতুন টেবিল নেই, তাই আগের RLS (শুধু অ্যাডমিন অ্যাক্সেস) সেভাবেই কাজ করে; অ্যানন/পাবলিক কিছুই পড়তে বা লিখতে পারে না।

alter table mc2_ufolders add column if not exists filter jsonb;
alter table mc2_ufolders add column if not exists meta jsonb not null default '{}'::jsonb;

alter table mc2_ufolders drop constraint if exists mc2_ufolders_kind_ck;
alter table mc2_ufolders add constraint mc2_ufolders_kind_ck check (kind in ('custom', 'winners', 'smart'));

-- নাম-চেক (Run করার পর আলাদাভাবে চালান; ২টা সারি এলে ঠিক):
-- select column_name from information_schema.columns where table_name = 'mc2_ufolders' and column_name in ('filter', 'meta');


-- ==================== 24_supabase-new-20261018j.sql ====================
-- NEW SQL (2026-10-18 j): কাজ ৩ লিডারবোর্ড নিয়ন্ত্রণ + কাজ ৫ চ্যাটের কাস্টম ফাইল টাইপ/MB
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run। আবার চালালেও ক্ষতি নেই। এই SQL চালানোর আগেও সাইট আগের মতো চলে।
-- আগে চালানো থাকতে হবে: সব আগের SQL (চালানোই আছে)।
-- ক) mc2_scores.hidden + board_cfg {board_on} + mc2_board/mc2_top_cards (hidden বাদ, বন্ধ থাকলে খালি) + অ্যাডমিন RPC।
-- খ) mc2_ac_cfg key 'ftypes' = {"ext":[ধরন, মাইম, সর্বোচ্চ MB, চালু?]}; mc2_ac_ftypes() এখান থেকে পড়ে, না থাকলে ডিফল্ট তালিকা।
-- device/IP পাবলিক ফাংশনে কখনো বেরোয় না।

alter table mc2_scores add column if not exists hidden boolean not null default false;
create index if not exists mc2_scores_hidden on mc2_scores (hidden) where hidden;

create or replace function mc2_settings_check() returns trigger language plpgsql as $$
begin
  if new.key = 'quiz_count' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not between 1 and 50 then raise exception 'quiz_count must be 1..50'; end if;
  elsif new.key = 'wrong_options' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric not between 1 and 500 then raise exception 'wrong_options must be 1..500'; end if;
  elsif new.key = 'png_max_kb' then
    if jsonb_typeof(new.value) <> 'number' or not ((new.value #>> '{}')::numeric = 0 or (new.value #>> '{}')::numeric between 10 and 1000000) then raise exception 'png_max_kb must be 0 or 10..1000000'; end if;
  elsif new.key = 'quiz_categories' then
    if jsonb_typeof(new.value) <> 'array' then raise exception 'quiz_categories must be an array'; end if;
  elsif new.key = 'ui_cfg' then
    if jsonb_typeof(new.value) <> 'object' or jsonb_typeof(new.value -> 'off') is distinct from 'array' or pg_column_size(new.value) > 8000 then raise exception 'ui_cfg must be {"off":[...]}'; end if;
  elsif new.key = 'card_cfg' then
    if jsonb_typeof(new.value) <> 'object' or pg_column_size(new.value) > 2000 then raise exception 'card_cfg must be an object'; end if;
    if exists (select 1 from jsonb_each(new.value) e where e.key in ('w', 'h', 'sw', 'sh') and (jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}')::numeric not between 100 and 8000)) then raise exception 'card_cfg sizes must be 100..8000'; end if;
  elsif new.key = 'home_cfg' then
    if jsonb_typeof(new.value) <> 'object' or pg_column_size(new.value) > 2000 then raise exception 'home_cfg must be an object'; end if;
  elsif new.key = 'board_cfg' then
    if jsonb_typeof(new.value) <> 'object' or pg_column_size(new.value) > 1000 then raise exception 'board_cfg must be an object'; end if;
  else
    raise exception 'unknown setting';
  end if;
  return new;
end $$;

drop trigger if exists t_mc2_settings_check on mc2_settings;
create trigger t_mc2_settings_check before insert or update on mc2_settings for each row execute function mc2_settings_check();
drop trigger if exists t_mc2_settings_q on mc2_settings;
create trigger t_mc2_settings_q after insert or update on mc2_settings for each row when (new.key not in ('ui_cfg', 'card_cfg', 'home_cfg', 'board_cfg')) execute function mc2_trg_rebuild();

create or replace function mc2_board(p_dept text default null, p_batch text default null, p_from timestamptz default null, p_to timestamptz default null, p_q text default null, p_mode text default 'best', p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare lim int := least(greatest(coalesce(p_limit, 50), 1), 500); ofs int := greatest(coalesce(p_offset, 0), 0);
  q text := nullif(left(trim(coalesce(p_q, '')), 40), ''); ip text := mc2_ip(); res jsonb;
begin
  if coalesce((select (value ->> 'board_on')::boolean from mc2_settings where key = 'board_cfg'), true) = false then return jsonb_build_object('total', 0, 'rows', '[]'::jsonb, 'depts', '[]'::jsonb, 'batches', '[]'::jsonb); end if;
  if ip is not null and not mc2_ac_rl('board:ip:' || ip || ':60', 60, 60) then return jsonb_build_object('err', 'slow'); end if;
  if q is not null then q := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_'); end if;
  with base as (
    select s.id, s.name, s.dept, s.batch, s.score, s.ok, s.total, s.pct, s.created_at,
      row_number() over (partition by lower(s.name), s.dept, coalesce(s.batch, '') order by s.score desc, s.created_at) as rn
    from mc2_scores s
    where not coalesce(s.hidden, false) and (nullif(p_dept, '') is null or s.dept = p_dept) and (nullif(p_batch, '') is null or s.batch = p_batch)
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

create or replace function mc2_top_cards(p_dept text default null, p_batch text default null, p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ip text := mc2_ip(); res jsonb;
begin
  if coalesce((select (value ->> 'board_on')::boolean from mc2_settings where key = 'board_cfg'), true) = false then return jsonb_build_object('rows', '[]'::jsonb); end if;
  if ip is not null and not mc2_ac_rl('topc:ip:' || ip || ':60', 60, 60) then return jsonb_build_object('err', 'slow'); end if;
  with base as (
    select s.id, s.name, s.dept, s.batch, s.score, s.ok, s.total, s.pct, s.created_at, s.device,
      row_number() over (partition by lower(s.name), s.dept, coalesce(s.batch, '') order by s.score desc, s.created_at) as rn
    from mc2_scores s
    where not coalesce(s.hidden, false) and (nullif(p_dept, '') is null or s.dept = p_dept) and (nullif(p_batch, '') is null or s.batch = p_batch)
      and (p_from is null or s.created_at >= p_from) and (p_to is null or s.created_at < p_to)
  ), pick as (select base.*, rank() over (order by score desc) as rk from base where rn = 1),
  top as (select * from pick order by rk, created_at, id limit 3)
  select coalesce(jsonb_agg(jsonb_build_object('rk', t.rk, 'name', t.name, 'dept', t.dept, 'batch', t.batch, 'score', t.score, 'ok', coalesce(t.ok, 0), 'total', coalesce(t.total, 0), 'pct', t.pct,
    'ts', (extract(epoch from t.created_at) * 1000)::bigint, 'rec', c.rec, 'photo', case when c.show then c.photo end) order by t.rk, t.created_at, t.id), '[]'::jsonb) into res
  from top t left join lateral (select x.rec, x.photo, x.show from mc2_cards x where x.device = t.device and lower(x.name) = lower(t.name) order by x.score desc limit 1) c on true;
  return jsonb_build_object('rows', res);
end $$;

-- ===== অ্যাডমিন: লিডারবোর্ড এন্ট্রি তালিকা/এডিট/হাইড/ডিলিট/ছবি (সবগুলো mc2_is_admin() ছাড়া চলে না) =====
create or replace function mc2_board_admin_list(p_q text default null, p_dept text default null, p_batch text default null, p_state text default 'all', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(left(trim(coalesce(p_q, '')), 40), ''); lim int := least(greatest(coalesce(p_limit, 50), 1), 200); res jsonb; tot int;
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  if q is not null then q := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_'); end if;
  select count(*) into tot from mc2_scores s where (q is null or s.name ilike '%' || q || '%') and (nullif(p_dept, '') is null or s.dept = p_dept) and (nullif(p_batch, '') is null or s.batch = p_batch)
    and (p_state = 'all' or (p_state = 'hidden' and s.hidden) or (p_state = 'shown' and not s.hidden));
  select coalesce(jsonb_agg(r order by r.sc desc, r.id), '[]'::jsonb) into res from (
    select s.id, s.name, s.dept, s.batch, s.score as sc, s.ok, s.total, s.hidden, (extract(epoch from s.created_at) * 1000)::bigint as ts,
      exists (select 1 from mc2_cards c where c.device = s.device and lower(c.name) = lower(s.name)) as has_card,
      coalesce((select bool_or(c.photo is not null) from mc2_cards c where c.device = s.device and lower(c.name) = lower(s.name)), false) as has_photo,
      coalesce((select bool_and(c.show) from mc2_cards c where c.device = s.device and lower(c.name) = lower(s.name)), true) as photo_show
    from mc2_scores s where (q is null or s.name ilike '%' || q || '%') and (nullif(p_dept, '') is null or s.dept = p_dept) and (nullif(p_batch, '') is null or s.batch = p_batch)
      and (p_state = 'all' or (p_state = 'hidden' and s.hidden) or (p_state = 'shown' and not s.hidden))
    order by s.score desc, s.id offset greatest(coalesce(p_offset, 0), 0) limit lim) r;
  return jsonb_build_object('total', tot, 'rows', res);
end $$;

create or replace function mc2_board_admin_edit(p_id bigint, p_name text, p_dept text, p_batch text, p_score int) returns text
language plpgsql security definer set search_path = public as $$
declare o mc2_scores%rowtype; nm text := trim(coalesce(p_name, ''));
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  select * into o from mc2_scores where id = p_id; if not found then return 'missing'; end if;
  if char_length(nm) not between 1 and 30 or char_length(coalesce(p_dept, '')) not between 1 and 60 or p_score not between 0 and 1000 or char_length(coalesce(p_batch, '')) > 40 then return 'invalid'; end if;
  update mc2_scores set name = nm, dept = p_dept, batch = nullif(trim(coalesce(p_batch, '')), ''), score = p_score, pct = round(p_score / 10.0)::int where id = p_id;
  if lower(o.name) <> lower(nm) or o.name <> nm then
    begin update mc2_cards set name = nm where device = o.device and lower(name) = lower(o.name);
    exception when unique_violation then null; end;
  end if;
  return 'ok';
end $$;

create or replace function mc2_board_admin_hide(p_ids bigint[], p_hide boolean) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  update mc2_scores set hidden = coalesce(p_hide, true) where id = any(coalesce(p_ids, '{}'));
  get diagnostics n = row_count; return n;
end $$;

create or replace function mc2_board_admin_delete(p_ids bigint[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  delete from mc2_scores where id = any(coalesce(p_ids, '{}'));
  get diagnostics n = row_count; return n;
end $$;

-- p_mode: 'hide' = সেরা ৩-এ ছবি লুকানো; 'show' = আবার দেখানো; 'remove' = ছবি মুছে ফেলা
create or replace function mc2_board_admin_photo(p_ids bigint[], p_mode text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  if p_mode not in ('hide', 'show', 'remove') then return 0; end if;
  update mc2_cards c set show = case p_mode when 'hide' then false when 'show' then true else c.show end, photo = case when p_mode = 'remove' then null else c.photo end
    from mc2_scores s where s.id = any(coalesce(p_ids, '{}')) and c.device = s.device and lower(c.name) = lower(s.name);
  get diagnostics n = row_count; return n;
end $$;

-- ===== চ্যাটের ফাইল টাইপ: ডিফল্ট + ডাটাবেজ (mc2_ac_cfg key 'ftypes') =====
create or replace function mc2_ac_ftypes_default() returns jsonb language sql immutable as $$ select '{
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
create or replace function mc2_ac_ftypes() returns jsonb language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from mc2_ac_cfg where key = 'ftypes' and jsonb_typeof(value) = 'object')
    then coalesce((select jsonb_object_agg(e.key, e.value) from mc2_ac_cfg c, jsonb_each(c.value) e where c.key = 'ftypes' and jsonb_typeof(c.value) = 'object' and coalesce(e.value ->> 3, 'true') <> 'false'), '{}'::jsonb)
    else mc2_ac_ftypes_default() end $$;
grant execute on function mc2_ac_ftypes() to anon, authenticated;
grant execute on function mc2_ac_ftypes_default() to anon, authenticated;

-- বাকেটের সীমা চালু টাইপগুলো থেকে (সর্বোচ্চ MB ও সব মাইম)
create or replace function mc2_ac_apply_bucket() returns void language plpgsql security definer set search_path = public as $$
declare ft jsonb := mc2_ac_ftypes(); mx bigint; mt text[];
begin
  select coalesce(max((v ->> 2)::numeric), 25)::bigint * 1048576 into mx from jsonb_each(ft) e(k, v);
  select array_agg(distinct v ->> 1) into mt from jsonb_each(ft) e(k, v);
  begin update storage.buckets set public = true, file_size_limit = mx, allowed_mime_types = mt where id = 'mc2-chat';
  exception when undefined_column then update storage.buckets set public = true, file_size_limit = mx where id = 'mc2-chat'; end;
end $$;

create or replace function mc2_ac_ftypes_admin() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  return coalesce((select value from mc2_ac_cfg where key = 'ftypes' and jsonb_typeof(value) = 'object'), mc2_ac_ftypes_default());
end $$;

create or replace function mc2_ac_ftypes_set(p_list jsonb) returns text language plpgsql security definer set search_path = public as $$
declare e record; n int := 0;
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  if p_list is null or jsonb_typeof(p_list) <> 'object' or pg_column_size(p_list) > 20000 then return 'invalid'; end if;
  for e in select key, value from jsonb_each(p_list) loop
    n := n + 1;
    if e.key !~ '^[a-z0-9]{1,5}$' or e.key in ('html', 'htm', 'svg', 'js', 'xhtml', 'xml', 'php', 'mjs') then return 'bad_ext:' || e.key; end if;
    if jsonb_typeof(e.value) <> 'array' or jsonb_array_length(e.value) < 3 then return 'bad_row:' || e.key; end if;
    if (e.value ->> 0) not in ('image', 'video', 'audio', 'file') then return 'bad_kind:' || e.key; end if;
    if (e.value ->> 1) !~ '^[a-z0-9.+-]+/[a-z0-9.+_-]+$' or char_length(e.value ->> 1) > 100 or (e.value ->> 1) in ('text/html', 'image/svg+xml', 'application/javascript', 'text/javascript', 'application/xhtml+xml') then return 'bad_mime:' || e.key; end if;
    if jsonb_typeof(e.value -> 2) <> 'number' or (e.value ->> 2)::numeric not between 1 and 5000 then return 'bad_mb:' || e.key; end if;
  end loop;
  if n > 200 then return 'too_many'; end if;
  insert into mc2_ac_cfg(key, value) values ('ftypes', p_list) on conflict (key) do update set value = excluded.value;
  perform mc2_ac_apply_bucket();
  return 'ok';
end $$;
grant execute on function mc2_board_admin_list(text, text, text, text, int, int), mc2_board_admin_edit(bigint, text, text, text, int), mc2_board_admin_hide(bigint[], boolean), mc2_board_admin_delete(bigint[]), mc2_board_admin_photo(bigint[], text),
  mc2_ac_ftypes_admin(), mc2_ac_ftypes_set(jsonb), mc2_ac_apply_bucket() to authenticated;
select mc2_ac_apply_bucket();

-- নাম-চেক: সবগুলো true এলে ঠিক
select 'hidden column' as name, exists (select 1 from information_schema.columns where table_name = 'mc2_scores' and column_name = 'hidden') as ok
union all select 'board fn has hidden', (select prosrc like '%hidden%' and prosrc like '%board_cfg%' from pg_proc where proname = 'mc2_board' limit 1)
union all select 'top fn has hidden', (select prosrc like '%hidden%' and prosrc like '%board_cfg%' from pg_proc where proname = 'mc2_top_cards' limit 1)
union all select 'check fn has board_cfg', (select prosrc like '%board_cfg%' from pg_proc where proname = 'mc2_settings_check' limit 1)
union all select 'admin rpcs', (select count(*) = 8 from pg_proc where proname in ('mc2_board_admin_list', 'mc2_board_admin_edit', 'mc2_board_admin_hide', 'mc2_board_admin_delete', 'mc2_board_admin_photo', 'mc2_ac_ftypes_admin', 'mc2_ac_ftypes_set', 'mc2_ac_apply_bucket'))
union all select 'ftypes reads cfg', (select prosrc like '%ftypes%' from pg_proc where proname = 'mc2_ac_ftypes' limit 1);


-- ==================== 25_supabase-new-20261018k.sql ====================
-- NEW SQL (2026-10-18 k): ইউজারের অবস্থা ৪টা — নতুন 📵 "সাড়া পাওয়া যায়নি" (মান 'nr')
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run চাপুন। পুরোনো ফ্ল্যাগের ডেটা (ok / no / ex) একটুও বদলায় না। আবার চালালেও সমস্যা নেই।
-- আগে চালানো থাকতে হবে: supabase-new-20261018.sql (mc2_entry_flags, mc2_flag_set) — আগেই চালানো আছে।
-- না চালানো পর্যন্ত সাইট আগের মতোই চলে; শুধু 📵 বাছলে "নতুন SQL চালান" বার্তা আসে।

do $$
declare c record;
begin
  -- আগের check (st in ok/no/ex) সরিয়ে ৪ মানের নতুন check; নামে 'ex' আছে এমন check-ই সরে (নিজের আগের চালানোও)
  for c in select conname from pg_constraint
           where conrelid = 'public.mc2_entry_flags'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%''ex''%'
  loop
    execute format('alter table public.mc2_entry_flags drop constraint %I', c.conname);
  end loop;
  alter table public.mc2_entry_flags add constraint mc2_entry_flags_st_chk check (st in ('ok', 'no', 'ex', 'nr'));
end $$;

create or replace function mc2_flag_set(p_k text, p_st text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if length(coalesce(p_k, '')) < 3 or length(p_k) > 120 then raise exception 'bad key'; end if;
  if p_st is null or p_st = '' then delete from mc2_entry_flags where k = p_k; return; end if;
  if p_st not in ('ok', 'no', 'ex', 'nr') then raise exception 'bad status'; end if;   -- ok = ভেরিফাইড, no = নন-ভেরিফাইড, ex = বাদ, nr = সাড়া পাওয়া যায়নি
  insert into mc2_entry_flags (k, st) values (p_k, p_st) on conflict (k) do update set st = excluded.st, at = now();
end $$;
revoke all on function mc2_flag_set(text, text) from public, anon;
grant execute on function mc2_flag_set(text, text) to authenticated;

-- নাম-চেক: দুটো সারিতেই ok = true এলে ঠিক
select 'mc2_entry_flags check (nr)' as item, exists (select 1 from pg_constraint where conrelid = 'public.mc2_entry_flags'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%''nr''%') as ok
union all
select 'mc2_flag_set (nr)', exists (select 1 from pg_proc where proname = 'mc2_flag_set' and prosrc like '%''nr''%');


-- ==================== 26_supabase-new-20261018l.sql ====================
-- NEW SQL (2026-10-18 l): নতুন অটো ফোল্ডারের নাম আটকানো — mc2_ufolders.name check-এ '🎮 খেলেছে' ও '🎮🎁 খেলেছে + ফর্ম জমা' যোগ
-- Supabase > SQL Editor-এ পুরোটা পেস্ট করে একবার Run চাপুন। আবার চালালেও সমস্যা নেই। আগের কোনো ফোল্ডার/ডেটা বদলায় না।
-- আগে চালানো থাকতে হবে: supabase-new-20261018g.sql (mc2_ufolders) — আগেই চালানো আছে।
-- না চালানো পর্যন্ত সাইট আগের মতোই চলে (শুধু ডাটাবেজে এই ৪ নামে নতুন কাস্টম ফোল্ডার আটকাবে না; অ্যাডমিন প্যানেল নিজেই আগে থেকে এই নামগুলো আটকায়)।
-- NOT VALID = শুধু নতুন/বদলানো সারিতে নিয়ম খাটে; আগে থেকে থাকা কোনো ফোল্ডারের নাম এই ৪টার একটা হলেও ALTER ব্যর্থ হয় না।

do $$
declare c record;
begin
  -- আগের name-check সরানো (যার ভেতরে '👥 সব ইউজার' আছে — নিজের আগের চালানোও), তারপর ৪ নামের নতুন check
  for c in select conname from pg_constraint
           where conrelid = 'public.mc2_ufolders'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%সব ইউজার%'
  loop
    execute format('alter table public.mc2_ufolders drop constraint %I', c.conname);
  end loop;
  alter table public.mc2_ufolders add constraint mc2_ufolders_name_chk
    check (char_length(btrim(name)) between 1 and 80 and btrim(name) not in ('👥 সব ইউজার', '🎁 ফর্ম জমা', '🎮 খেলেছে', '🎮🎁 খেলেছে + ফর্ম জমা')) not valid;
end $$;

-- নাম-চেক: ok = true এলে ঠিক
select 'mc2_ufolders name check (৪টা অটো নাম)' as item,
  exists (select 1 from pg_constraint where conrelid = 'public.mc2_ufolders'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%সব ইউজার%' and pg_get_constraintdef(oid) like '%ফর্ম জমা%' and pg_get_constraintdef(oid) like '%খেলেছে%') as ok;


-- ==================== 27_supabase-new-20261019.sql ====================
-- supabase-new-20261019.sql — জায়গা বাঁচানো ও গতি (২০২৬-১০-১৯)। আবার চালালেও ক্ষতি নেই।
-- ১) mc2_scores / mc2_visits-এ device ইনডেক্স (গতি) + মোছার জন্য সময়-ইনডেক্স
-- ২) আইপি-সীমা উদার: লিডারবোর্ড/টপ৩ ৬০→৬০০ প্রতি মিনিট; কার্ড সেভ ১৫০০/ঘণ্টা, স্কোর জমা ১৫০০/ঘণ্টা, কনটেস্ট এন্ট্রি ৩০০/ঘণ্টা (প্রতি আইপি)। এগুলো ও আগের ডিভাইস-সীমা (স্কোর ৩০/ঘণ্টা, ভিজিট ৪০/ঘণ্টা, কার্ড ২০/ডিভাইস, ২ সেকেন্ড ব্যবধান) এখন ডিফল্ট; সবই অ্যাডমিন '🧹 অটো-ক্লিন' ট্যাব থেকে বদলানো যায়
-- ৩) কার্ডে pinned: যেটা একবার টপ ৩-এ এসেছে সেটা কখনো অটো-মোছা হবে না
-- ৪) অটো-ক্লিনআপ (অ্যাডমিন "🧹 অটো-ক্লিন" ট্যাব থেকে নিয়ন্ত্রণ): ছোট ব্যাচে, আগে অন্য ডেটা, কার্ড: সংখ্যা card_max (ডিফল্ট ১০০০) ছাড়ালে বাড়তি পুরোনোগুলো, দিনের সীমা ছাড়া; স্কোর ও ইউজার ইনফো টেবিল অক্ষত
-- এই ফাইল Free প্ল্যানের ৫০০ MB সীমা ধরে বানানো; কিছুই একসাথে সব মোছে না।

create index if not exists mc2_scores_dev_ct on mc2_scores (device, created_at);
create index if not exists mc2_visits_dev_ct on mc2_visits (device, created_at);
create index if not exists mc2_visits_ct on mc2_visits (created_at);
create index if not exists mc2_answers_ct on mc2_answers (created_at);
create index if not exists mc2_presence_ls on mc2_presence (last_seen);

alter table mc2_cards add column if not exists pinned boolean not null default false;
update mc2_cards c set pinned = true where not c.pinned and (select count(*) from mc2_cards x where x.score > c.score) < 3;

create table if not exists mc2_cleanup_cfg (id int primary key check (id = 1), cfg jsonb not null default '{}'::jsonb);
create table if not exists mc2_cleanup_log (id bigint generated always as identity primary key, ts timestamptz not null default now(), what text not null, n int not null, note text);
alter table mc2_cleanup_cfg enable row level security;
alter table mc2_cleanup_log enable row level security;
revoke all on mc2_cleanup_cfg, mc2_cleanup_log from anon, authenticated;

create or replace function mc2_cleanup_defaults() returns jsonb language sql immutable as $$
  select jsonb_build_object('on', true, 'others_on', true, 'db_mb', 500, 'start_pct', 70, 'card_pct', 80, 'card_max', 1000, 'batch', 200, 'card_batch', 50,
    'min_age_days', 7, 'card_min_days', 0, 'visits_days', 0, 'answers_days', 0, 'presence_days', 0, 'cards_days', 0,
    'ip_view_min', 600, 'ip_card_hr', 1500, 'ip_score_hr', 1500, 'ip_entry_hr', 300, 'score_dev_hr', 30, 'visit_dev_hr', 40, 'card_per_dev', 20, 'card_gap_sec', 2)
$$;

create or replace function mc2_cleanup_cfg_get() returns jsonb language sql stable security definer set search_path = public as $$
  select mc2_cleanup_defaults() || coalesce((select cfg from mc2_cleanup_cfg where id = 1), '{}'::jsonb)
$$;

create or replace function mc2_lim(p_k text) returns int language sql stable security definer set search_path = public as $$
  select coalesce((select (cfg ->> p_k)::int from mc2_cleanup_cfg where id = 1), (mc2_cleanup_defaults() ->> p_k)::int)
$$;

create or replace function mc2_cleanup_cards(p_n int, p_days int, p_dry boolean, p_note text) returns int
language plpgsql security definer set search_path = public as $$
declare d int := 0;
begin
  if p_n <= 0 then return 0; end if;
  -- টপ ৩ (এখন বা কখনো) ও pinned কখনো নয়। শুধু কার্ড মোছে: mc2_scores (স্কোর) ও ইউজার ইনফো টেবিল অক্ষত থাকে।
  if p_dry then
    select count(*) into d from (select 1 from mc2_cards x where not x.pinned and (select count(*) from mc2_cards y where y.score > x.score) >= 3
      and x.updated_at < now() - make_interval(days => p_days) limit p_n) z;
  else
    delete from mc2_cards where id in (select x.id from mc2_cards x where not x.pinned and (select count(*) from mc2_cards y where y.score > x.score) >= 3
      and x.updated_at < now() - make_interval(days => p_days) order by x.updated_at limit p_n);
    get diagnostics d = row_count;
    if d > 0 then insert into mc2_cleanup_log(what, n, note) values ('mc2_cards', d, p_note); end if;
  end if;
  return d;
end $$;
revoke all on function mc2_cleanup_cards(int, int, boolean, text) from public, anon, authenticated;

create or replace function mc2_cleanup_run(p_dry boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c jsonb := mc2_cleanup_cfg_get(); sz bigint; pct numeric; ncards int; pressure boolean; lim int; minage int;
  t record; dd int; cond text; d int; other int := 0; cd int; cl int; cmax int; ca int; res jsonb := '{}'::jsonb;
begin
  if not coalesce((c ->> 'on')::boolean, true) then return jsonb_build_object('on', false); end if;
  sz := pg_database_size(current_database());
  pct := round(sz * 100.0 / ((c ->> 'db_mb')::numeric * 1048576), 1);
  select count(*) into ncards from mc2_cards;
  pressure := pct >= (c ->> 'start_pct')::numeric and coalesce((c ->> 'others_on')::boolean, true);
  lim := greatest((c ->> 'batch')::int, 1); minage := greatest((c ->> 'min_age_days')::int, 1);
  for t in select * from (values ('mc2_visits', 'created_at', 'visits_days'), ('mc2_answers', 'created_at', 'answers_days'), ('mc2_presence', 'last_seen', 'presence_days')) v(tbl, col, key) loop
    dd := (c ->> t.key)::int;
    cond := format('(%s > 0 and %I < now() - make_interval(days => %s))', dd, t.col, dd);
    if pressure then cond := cond || format(' or %I < now() - make_interval(days => %s)', t.col, minage); end if;
    if p_dry then
      execute format('select count(*) from (select 1 from %I where %s limit %s) z', t.tbl, cond, lim) into d;
    else
      execute format('delete from %I where ctid = any(array(select ctid from %I where %s order by %I limit %s))', t.tbl, t.tbl, cond, t.col, lim);
      get diagnostics d = row_count;
      if d > 0 then insert into mc2_cleanup_log(what, n, note) values (t.tbl, d, case when pressure then 'pressure' else 'age' end); end if;
    end if;
    other := other + d; res := res || jsonb_build_object(t.tbl, d);
  end loop;
  cd := (c ->> 'cards_days')::int; cl := greatest((c ->> 'card_batch')::int, 1); cmax := (c ->> 'card_max')::int; ca := (c ->> 'card_min_days')::int;
  -- কার্ড ১) সময় ধরে (cards_days > 0), ২) সংখ্যা card_max ছাড়ালে বাড়তি পুরোনোগুলো (দিনের সীমা নেই, প্রতিবারে card_batch), ৩) DB card_pct% ভরলে ও অন্য ডেটা শেষ হলে
  d := 0; if cd > 0 then d := mc2_cleanup_cards(cl, cd, p_dry, 'age'); end if;
  res := res || jsonb_build_object('cards_age', d);
  d := 0;
  if ncards > cmax then d := mc2_cleanup_cards(least(cl, ncards - cmax), ca, p_dry, 'count'); end if;
  if d = 0 and pct >= (c ->> 'card_pct')::numeric and other = 0 then d := mc2_cleanup_cards(cl, ca, p_dry, 'pressure'); end if;
  res := res || jsonb_build_object('cards_pressure', d);
  if not p_dry and random() < 0.05 then delete from mc2_cleanup_log where ts < now() - interval '60 days'; end if;
  return res || jsonb_build_object('pct', pct, 'size_mb', round(sz / 1048576.0, 1), 'cards', ncards, 'pressure', pressure, 'dry', p_dry);
end $$;
revoke all on function mc2_cleanup_run(boolean) from public, anon, authenticated;

create or replace function mc2_cleanup_tick() returns void language plpgsql security definer set search_path = public as $$
begin
  if mc2_ac_rl('cleanup', 1, 600) then perform mc2_cleanup_run(false); end if;
exception when others then null;
end $$;
revoke all on function mc2_cleanup_tick() from public, anon, authenticated;

create or replace function mc2_cleanup_admin_get() returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb := mc2_cleanup_cfg_get(); sz bigint := pg_database_size(current_database());
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object('cfg', c, 'size_mb', round(sz / 1048576.0, 1), 'pct', round(sz * 100.0 / ((c ->> 'db_mb')::numeric * 1048576), 1),
    'cards', (select count(*) from mc2_cards), 'pinned', (select count(*) from mc2_cards where pinned),
    'visits', (select count(*) from mc2_visits), 'answers', (select count(*) from mc2_answers), 'presence', (select count(*) from mc2_presence),
    'log', coalesce((select jsonb_agg(jsonb_build_object('ts', l.ts, 'what', l.what, 'n', l.n, 'note', l.note) order by l.ts desc) from (select * from mc2_cleanup_log order by ts desc limit 20) l), '[]'::jsonb));
end $$;

create or replace function mc2_cleanup_admin_set(p_cfg jsonb) returns void language plpgsql security definer set search_path = public as $$
declare k text; v numeric; lo numeric; hi numeric;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if p_cfg is null or jsonb_typeof(p_cfg) <> 'object' then raise exception 'bad cfg'; end if;
  for k in select jsonb_object_keys(p_cfg) loop
    if k in ('on', 'others_on') then
      if jsonb_typeof(p_cfg -> k) <> 'boolean' then raise exception '% must be true/false', k; end if;
    else
      if k not in ('db_mb', 'start_pct', 'card_pct', 'card_max', 'batch', 'card_batch', 'min_age_days', 'card_min_days', 'visits_days', 'answers_days', 'presence_days', 'cards_days',
                   'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev', 'card_gap_sec') then raise exception 'unknown key %', k; end if;
      if jsonb_typeof(p_cfg -> k) <> 'number' then raise exception '% must be a number', k; end if;
      v := (p_cfg ->> k)::numeric;
      lo := case when k in ('db_mb', 'batch', 'card_batch', 'min_age_days', 'card_max', 'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev') then 1 when k in ('start_pct', 'card_pct') then 10 else 0 end;
      hi := case when k = 'db_mb' then 100000 when k in ('start_pct', 'card_pct') then 99 when k = 'batch' then 5000 when k = 'card_batch' then 1000 when k = 'card_max' then 1000000
                 when k in ('ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr') then 1000000 when k in ('score_dev_hr', 'visit_dev_hr') then 100000 when k = 'card_per_dev' then 1000 when k = 'card_gap_sec' then 60 else 3650 end;
      if v < lo or v > hi or v <> trunc(v) then raise exception '% must be a whole number % to %', k, lo, hi; end if;
    end if;
  end loop;
  insert into mc2_cleanup_cfg(id, cfg) values (1, p_cfg) on conflict (id) do update set cfg = excluded.cfg;
end $$;

create or replace function mc2_cleanup_admin_run(p_dry boolean default true) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return mc2_cleanup_run(coalesce(p_dry, true));
end $$;
revoke all on function mc2_cleanup_admin_get(), mc2_cleanup_admin_set(jsonb), mc2_cleanup_admin_run(boolean) from public, anon;
grant execute on function mc2_cleanup_admin_get(), mc2_cleanup_admin_set(jsonb), mc2_cleanup_admin_run(boolean) to authenticated;

-- আইপি-সীমা উদার + কার্ড pinned + অটো-ক্লিনআপ হুক (নিচের ফাংশনগুলো আগের সংস্করণের কপি, শুধু নির্দেশিত লাইন বদলানো)
create or replace function mc2_card_save(p_device text, p_name text, p_dept text, p_batch text, p_score int, p_rec jsonb, p_thumb text, p_photo text)
returns text language plpgsql security definer set search_path = public as $$
declare v record; nm text := trim(coalesce(p_name, '')); rec jsonb; old record;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 or char_length(nm) not between 1 and 30 or p_score is null or p_score not between 0 and 1000 then return 'invalid'; end if;
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
  elsif (select count(*) from mc2_cards where device = p_device) >= mc2_lim('card_per_dev') then return 'slow'; end if;
  rec := p_rec - 'device' || jsonb_build_object('name', v.name, 'dept', v.dept, 'batch', coalesce(v.batch, ''), 'score', v.score, 'pct', v.pct, 'ok', coalesce(v.ok, 0), 'total', coalesce(v.total, 0),
    'club', coalesce(v.club, ''), 'title', coalesce(v.title, ''));
  insert into mc2_cards(device, name, dept, batch, score, pct, ok, total, rec, thumb, photo)
  values (p_device, v.name, v.dept, v.batch, v.score, v.pct, v.ok, v.total, rec, p_thumb, nullif(p_photo, ''))
  on conflict (device, (lower(name))) do update set name = excluded.name, dept = excluded.dept, batch = excluded.batch, score = excluded.score, pct = excluded.pct, ok = excluded.ok, total = excluded.total,
    rec = excluded.rec, thumb = excluded.thumb, photo = excluded.photo, updated_at = now();
  if (select count(*) from mc2_cards x where x.score > v.score) < 3 then update mc2_cards set pinned = true where device = p_device and lower(name) = lower(v.name); end if;
  if random() < 0.1 then begin perform mc2_cleanup_tick(); exception when others then null; end; end if;
  return 'ok';
end $$;

create or replace function mc2_top_cards(p_dept text default null, p_batch text default null, p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ip text := mc2_ip(); res jsonb;
begin
  if coalesce((select (value ->> 'board_on')::boolean from mc2_settings where key = 'board_cfg'), true) = false then return jsonb_build_object('rows', '[]'::jsonb); end if;
  if ip is not null and not mc2_ac_rl('topc:ip:' || ip || ':m', mc2_lim('ip_view_min'), 60) then return jsonb_build_object('err', 'slow'); end if;
  with base as (
    select s.id, s.name, s.dept, s.batch, s.score, s.ok, s.total, s.pct, s.created_at, s.device,
      row_number() over (partition by lower(s.name), s.dept, coalesce(s.batch, '') order by s.score desc, s.created_at) as rn
    from mc2_scores s
    where not coalesce(s.hidden, false) and (nullif(p_dept, '') is null or s.dept = p_dept) and (nullif(p_batch, '') is null or s.batch = p_batch)
      and (p_from is null or s.created_at >= p_from) and (p_to is null or s.created_at < p_to)
  ), pick as (select base.*, rank() over (order by score desc) as rk from base where rn = 1),
  top as (select * from pick order by rk, created_at, id limit 3)
  select coalesce(jsonb_agg(jsonb_build_object('rk', t.rk, 'name', t.name, 'dept', t.dept, 'batch', t.batch, 'score', t.score, 'ok', coalesce(t.ok, 0), 'total', coalesce(t.total, 0), 'pct', t.pct,
    'ts', (extract(epoch from t.created_at) * 1000)::bigint, 'rec', c.rec, 'photo', case when c.show then c.photo end) order by t.rk, t.created_at, t.id), '[]'::jsonb) into res
  from top t left join lateral (select x.rec, x.photo, x.show from mc2_cards x where x.device = t.device and lower(x.name) = lower(t.name) order by x.score desc limit 1) c on true;
  return jsonb_build_object('rows', res);
end $$;

create or replace function mc2_board(p_dept text default null, p_batch text default null, p_from timestamptz default null, p_to timestamptz default null, p_q text default null, p_mode text default 'best', p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare lim int := least(greatest(coalesce(p_limit, 50), 1), 500); ofs int := greatest(coalesce(p_offset, 0), 0);
  q text := nullif(left(trim(coalesce(p_q, '')), 40), ''); ip text := mc2_ip(); res jsonb;
begin
  if coalesce((select (value ->> 'board_on')::boolean from mc2_settings where key = 'board_cfg'), true) = false then return jsonb_build_object('total', 0, 'rows', '[]'::jsonb, 'depts', '[]'::jsonb, 'batches', '[]'::jsonb); end if;
  if ip is not null and not mc2_ac_rl('board:ip:' || ip || ':m', mc2_lim('ip_view_min'), 60) then return jsonb_build_object('err', 'slow'); end if;
  if q is not null then q := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_'); end if;
  with base as (
    select s.id, s.name, s.dept, s.batch, s.score, s.ok, s.total, s.pct, s.created_at,
      row_number() over (partition by lower(s.name), s.dept, coalesce(s.batch, '') order by s.score desc, s.created_at) as rn
    from mc2_scores s
    where not coalesce(s.hidden, false) and (nullif(p_dept, '') is null or s.dept = p_dept) and (nullif(p_batch, '') is null or s.batch = p_batch)
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

create or replace function mc2_submit_score(p_name text, p_dept text, p_batch text, p_club text, p_title text, p_pct int, p_score int, p_ok int, p_total int, p_device text, p_info jsonb)
returns text language plpgsql security definer set search_path = public as $$
begin
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 30 or char_length(coalesce(p_dept, '')) not between 1 and 60
     or p_pct not between 0 and 100 or p_score not between 0 and 1000 or char_length(coalesce(p_device, '')) not between 8 and 40 then return 'invalid'; end if;
  if mc2_ip() is not null and not mc2_ac_rl('score:ip:' || mc2_ip(), mc2_lim('ip_score_hr'), 3600) then return 'slow'; end if;
  if (select count(*) from mc2_scores where device = p_device and created_at > now() - interval '1 hour') >= mc2_lim('score_dev_hr') then return 'slow'; end if;
  insert into mc2_scores(name, dept, batch, club, title, pct, score, ok, total, device, ip, ua, info)
  values (trim(p_name), p_dept, left(p_batch, 40), left(p_club, 60), left(p_title, 60), p_pct, p_score, p_ok, p_total, p_device, mc2_ip(), left(mc2_hdr('user-agent'), 400), p_info);
  return 'ok';
end $$;

create or replace function mc2_log_visit(p_device text, p_page text, p_info jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 then return; end if;
  if (select count(*) from mc2_visits where device = p_device and created_at > now() - interval '1 hour') >= mc2_lim('visit_dev_hr') then return; end if;
  insert into mc2_visits(device, page, ip, ua, info) values (p_device, left(p_page, 100), mc2_ip(), left(mc2_hdr('user-agent'), 400), p_info);
  if random() < 0.02 then perform mc2_cleanup_tick(); end if;
end $$;

create or replace function mc2_ac_tick() returns void language plpgsql security definer set search_path = public as $$
begin if mc2_ac_rl('purge', 1, 300) then perform mc2_ac_purge(); perform mc2_ac_purge_live(); end if; perform mc2_cleanup_tick(); end $$;

create or replace function submit_entry(p_name text, p_link text, p_shot text, p_contact text, p_pct int, p_score int, p_device text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 60 then raise exception 'bad name'; end if;
  if p_link is null or length(p_link) > 400 or p_link !~* '^https?://([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch|fb\.me)/' then raise exception 'bad link'; end if;
  if p_shot is null or length(p_shot) > 500 then raise exception 'bad shot'; end if;
  if mc2_ip() is not null and not mc2_ac_rl('entry:ip:' || mc2_ip(), mc2_lim('ip_entry_hr'), 3600) then raise exception 'slow'; end if;
  insert into contest_entries (name, fb_link, shot_url, contact, pct, score, device)
  values (trim(p_name), trim(p_link), p_shot, nullif(left(trim(coalesce(p_contact, '')), 300), ''), p_pct, p_score, nullif(left(coalesce(p_device, ''), 80), ''))
  returning id into v;
  return v;
exception when unique_violation then
  raise exception 'duplicate';
end $$;

-- নাম-চেক: ৫টা সারিতেই true এলে ঠিক
select 'mc2_cards.pinned' as item, exists (select 1 from information_schema.columns where table_name = 'mc2_cards' and column_name = 'pinned') as ok
union all select 'mc2_lim', exists (select 1 from pg_proc where proname = 'mc2_lim')
union all select 'mc2_cleanup_run', exists (select 1 from pg_proc where proname = 'mc2_cleanup_run')
union all select 'mc2_cleanup_admin_get', exists (select 1 from pg_proc where proname = 'mc2_cleanup_admin_get')
union all select 'mc2_scores_dev_ct', exists (select 1 from pg_indexes where indexname = 'mc2_scores_dev_ct');


-- ==================== 28_supabase-new-20261019b.sql ====================
-- supabase-new-20261019b.sql  (ধাপ ১: বিন, ২০-কার্ড পুরোনোটা কাটা, ভিজিট-লগ ৩০০০ সারি (সময়ে মোছা বন্ধ, কাস্টম), card_max বন্ধ)
-- আগে ব্যাকআপ নিন। supabase-new-20261019.sql চালানোর পরে এটা চালান। বারবার চালালেও ভাঙে না।
-- বিঃদ্রঃ আগে অ্যাডমিন থেকে সেভ করা মান (cfg) ডিফল্টের ওপরে থাকে, তাই সেগুলো অ্যাডমিনে একবার দেখে নিন।

create table if not exists mc2_bin (id bigint generated always as identity primary key, src text not null, row jsonb not null, bytes int not null default 0, deleted_at timestamptz not null default now());
create index if not exists mc2_bin_t on mc2_bin (deleted_at);
alter table mc2_bin enable row level security;
revoke all on mc2_bin from anon, authenticated;

create or replace function mc2_cards_to_bin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('mc2.nobin', true), '') = 'on' then return old; end if;
  insert into mc2_bin(src, row, bytes) values ('mc2_cards', to_jsonb(old), pg_column_size(old));
  return old;
end $$;
drop trigger if exists mc2_cards_bin on mc2_cards;
create trigger mc2_cards_bin before delete on mc2_cards for each row execute function mc2_cards_to_bin();

create or replace function mc2_cleanup_defaults() returns jsonb language sql immutable as $$
  select jsonb_build_object('on', true, 'others_on', true, 'db_mb', 500, 'start_pct', 70, 'card_pct', 80, 'card_max', 1000000, 'batch', 200, 'card_batch', 50,
    'min_age_days', 7, 'card_min_days', 0, 'visits_days', 0, 'visits_max', 3000, 'bin_days', 30, 'answers_days', 0, 'presence_days', 60, 'cards_days', 0,
    'ip_view_min', 600, 'ip_card_hr', 1500, 'ip_score_hr', 1500, 'ip_entry_hr', 300, 'score_dev_hr', 30, 'visit_dev_hr', 40, 'card_per_dev', 20, 'card_gap_sec', 2)
$$;

create or replace function mc2_cleanup_cfg_get() returns jsonb language sql stable security definer set search_path = public as $$
  select mc2_cleanup_defaults() || coalesce((select cfg from mc2_cleanup_cfg where id = 1), '{}'::jsonb)
$$;

create or replace function mc2_lim(p_k text) returns int language sql stable security definer set search_path = public as $$
  select coalesce((select (cfg ->> p_k)::int from mc2_cleanup_cfg where id = 1), (mc2_cleanup_defaults() ->> p_k)::int)
$$;

create or replace function mc2_cleanup_cards(p_n int, p_days int, p_dry boolean, p_note text) returns int
language plpgsql security definer set search_path = public as $$
declare d int := 0;
begin
  if p_n <= 0 then return 0; end if;
  -- টপ ৩ (এখন বা কখনো) ও pinned কখনো নয়। শুধু কার্ড মোছে: mc2_scores (স্কোর) ও ইউজার ইনফো টেবিল অক্ষত থাকে।
  if p_dry then
    select count(*) into d from (select 1 from mc2_cards x where not x.pinned and (select count(*) from mc2_cards y where y.score > x.score) >= 3
      and x.updated_at < now() - make_interval(days => p_days) limit p_n) z;
  else
    delete from mc2_cards where id in (select x.id from mc2_cards x where not x.pinned and (select count(*) from mc2_cards y where y.score > x.score) >= 3
      and x.updated_at < now() - make_interval(days => p_days) order by x.updated_at limit p_n);
    get diagnostics d = row_count;
    if d > 0 then insert into mc2_cleanup_log(what, n, note) values ('mc2_cards', d, p_note); end if;
  end if;
  return d;
end $$;

create or replace function mc2_cleanup_admin_set(p_cfg jsonb) returns void language plpgsql security definer set search_path = public as $$
declare k text; v numeric; lo numeric; hi numeric;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if p_cfg is null or jsonb_typeof(p_cfg) <> 'object' then raise exception 'bad cfg'; end if;
  for k in select jsonb_object_keys(p_cfg) loop
    if k in ('on', 'others_on') then
      if jsonb_typeof(p_cfg -> k) <> 'boolean' then raise exception '% must be true/false', k; end if;
    else
      if k not in ('db_mb', 'start_pct', 'card_pct', 'card_max', 'batch', 'card_batch', 'min_age_days', 'card_min_days', 'visits_days', 'answers_days', 'presence_days', 'cards_days',
                   'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev', 'card_gap_sec', 'visits_max', 'bin_days') then raise exception 'unknown key %', k; end if;
      if jsonb_typeof(p_cfg -> k) <> 'number' then raise exception '% must be a number', k; end if;
      v := (p_cfg ->> k)::numeric;
      lo := case when k in ('db_mb', 'batch', 'card_batch', 'min_age_days', 'card_max', 'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev', 'visits_max') then 1 when k in ('start_pct', 'card_pct') then 10 else 0 end;
      hi := case when k = 'db_mb' then 100000 when k in ('start_pct', 'card_pct') then 99 when k = 'batch' then 5000 when k = 'card_batch' then 1000 when k = 'card_max' then 1000000
                 when k in ('ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr') then 1000000 when k in ('score_dev_hr', 'visit_dev_hr') then 100000 when k = 'card_per_dev' then 1000 when k = 'visits_max' then 1000000 when k = 'card_gap_sec' then 60 else 3650 end;
      if v < lo or v > hi or v <> trunc(v) then raise exception '% must be a whole number % to %', k, lo, hi; end if;
    end if;
  end loop;
  insert into mc2_cleanup_cfg(id, cfg) values (1, p_cfg) on conflict (id) do update set cfg = excluded.cfg;
end $$;

create or replace function mc2_card_save(p_device text, p_name text, p_dept text, p_batch text, p_score int, p_rec jsonb, p_thumb text, p_photo text)
returns text language plpgsql security definer set search_path = public as $$
declare v record; nm text := trim(coalesce(p_name, '')); rec jsonb; old record;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 or char_length(nm) not between 1 and 30 or p_score is null or p_score not between 0 and 1000 then return 'invalid'; end if;
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
  if (select count(*) from mc2_cards x where x.score > v.score) < 3 then update mc2_cards set pinned = true where device = p_device and lower(name) = lower(v.name); end if;
  if random() < 0.1 then begin perform mc2_cleanup_tick(); exception when others then null; end; end if;
  return 'ok';
end $$;

create or replace function mc2_cleanup_visits() returns int language plpgsql security definer set search_path = public as $$
declare c jsonb := mc2_cleanup_cfg_get(); dd int := (c ->> 'visits_days')::int; mx int := (c ->> 'visits_max')::int; n int := 0; k int; tot int;
begin
  if dd > 0 then
    delete from mc2_visits where ctid = any(array(select ctid from mc2_visits where created_at < now() - make_interval(days => dd) order by created_at limit 2000));
    get diagnostics k = row_count; n := n + k;
  end if;
  if mx > 0 then
    select count(*) into tot from mc2_visits;
    if tot > mx then
      delete from mc2_visits where ctid = any(array(select ctid from mc2_visits order by created_at limit least(tot - mx, 2000)));
      get diagnostics k = row_count; n := n + k;
    end if;
  end if;
  if n > 0 then insert into mc2_cleanup_log(what, n, note) values ('mc2_visits', n, 'age/count'); end if;
  return n;
end $$;
revoke all on function mc2_cleanup_visits() from public, anon, authenticated;

create or replace function mc2_bin_sweep() returns int language plpgsql security definer set search_path = public as $$
declare d int := mc2_lim('bin_days'); n int := 0;
begin
  if d > 0 then delete from mc2_bin where deleted_at < now() - make_interval(days => d); get diagnostics n = row_count; end if;
  return n;
end $$;
revoke all on function mc2_bin_sweep() from public, anon, authenticated;

create or replace function mc2_cleanup_tick() returns void language plpgsql security definer set search_path = public as $$
begin
  if mc2_ac_rl('cleanup', 1, 600) then
    perform mc2_cleanup_visits(); perform mc2_bin_sweep(); perform mc2_cleanup_run(false);
  end if;
exception when others then null;
end $$;
revoke all on function mc2_cleanup_tick() from public, anon, authenticated;

create or replace function mc2_bin_list(p_limit int default 100, p_src text default null) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object('total', (select count(*) from mc2_bin where p_src is null or src = p_src), 'mb', (select round(coalesce(sum(bytes), 0) / 1048576.0, 2) from mc2_bin where p_src is null or src = p_src),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'src', x.src, 'at', x.deleted_at, 'name', coalesce(x.row ->> 'name', x.row ->> 'page', x.row ->> 'device', '—'), 'score', x.row ->> 'score', 'device', x.row ->> 'device') order by x.deleted_at desc)
      from (select * from mc2_bin where p_src is null or src = p_src order by deleted_at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) x), '[]'::jsonb));
end $$;

create or replace function mc2_bin_restore(p_id bigint) returns text language plpgsql security definer set search_path = public as $$
declare b record; n int; ident boolean;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  select * into b from mc2_bin where id = p_id;
  if not found then return 'missing'; end if;
  if b.src not in ('mc2_cards', 'contest_entries', 'mc2_scores', 'mc2_visits', 'mc2_answers', 'mc2_ufolder_members') then return 'unsupported'; end if;
  select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = b.src and is_identity = 'YES') into ident;
  execute format('insert into %I %s select * from jsonb_populate_record(null::%I, $1) on conflict do nothing', b.src, case when ident then 'overriding system value' else '' end, b.src) using b.row;
  get diagnostics n = row_count;
  if n = 0 then return 'exists'; end if;
  perform set_config('mc2.keepfile', 'on', true); delete from mc2_bin where id = p_id; perform set_config('mc2.keepfile', '', true);
  return 'ok';
end $$;

create or replace function mc2_bin_delete(p_id bigint) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  delete from mc2_bin where id = p_id;
  return found;
end $$;

-- যেকোনো টেবিলের মোছা সারি বিনে (কার্ডের ট্রিগার আলাদা আছে)। জমা ইউজার (contest_entries) ও স্কোর (mc2_scores) বিনে যাবে। চ্যাট ও ফাইল বিনে যায় না।
create or replace function mc2_row_to_bin() returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(old); nm text;
begin
  -- জমা ইউজার মুছলে স্ক্রিনশটের ছবি সাথে সাথে মুছে যায় (বিনে যায় না); বিনে শুধু লগ-তথ্য যায় (shot_url = 'deleted')
  if tg_table_name = 'contest_entries' then
    nm := substring(old.shot_url from '/object/public/contest/(.+)$');
    if nm is not null then
      begin perform set_config('storage.allow_delete_query', 'true', true); delete from storage.objects where bucket_id = 'contest' and name = nm; exception when others then null; end;
    end if;
    j := jsonb_set(j, '{shot_url}', '"deleted"');
  end if;
  if coalesce(current_setting('mc2.nobin', true), '') = 'on' then return old; end if;
  insert into mc2_bin(src, row, bytes) values (tg_table_name, j, pg_column_size(old));
  return old;
end $$;
do $$ begin
  if to_regclass('public.contest_entries') is not null then drop trigger if exists mc2_bin_t on contest_entries; create trigger mc2_bin_t before delete on contest_entries for each row execute function mc2_row_to_bin(); end if;
  if to_regclass('public.mc2_ufolder_members') is not null then drop trigger if exists mc2_bin_t on mc2_ufolder_members; create trigger mc2_bin_t before delete on mc2_ufolder_members for each row execute function mc2_row_to_bin(); end if;
  if to_regclass('public.mc2_scores') is not null then drop trigger if exists mc2_bin_t on mc2_scores; create trigger mc2_bin_t before delete on mc2_scores for each row execute function mc2_row_to_bin(); end if;
end $$;

-- বিন থেকে জমা-ইউজার চিরতরে মুছলে তার স্ক্রিনশটের ফাইলও মুছবে (ফিরিয়ে আনার সময় নয়)।
create or replace function mc2_bin_gc() returns trigger language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if old.src = 'contest_entries' and coalesce(current_setting('mc2.keepfile', true), '') <> 'on' then
    nm := substring(old.row ->> 'shot_url' from '/object/public/contest/(.+)$');
    if nm is not null then begin perform set_config('storage.allow_delete_query', 'true', true); delete from storage.objects where bucket_id = 'contest' and name = nm; exception when others then null; end; end if;
  end if;
  return old;
end $$;
drop trigger if exists mc2_bin_gc on mc2_bin;
create trigger mc2_bin_gc before delete on mc2_bin for each row execute function mc2_bin_gc();

create or replace function mc2_bin_purge(p_days int default null) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  delete from mc2_bin where p_days is null or deleted_at < now() - make_interval(days => p_days);
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function mc2_bin_list(int, text), mc2_bin_restore(bigint), mc2_bin_delete(bigint), mc2_bin_purge(int) to authenticated;


-- ==================== 29_supabase-new-20261019c.sql ====================
-- supabase-new-20261019c.sql (ধাপ ২: ৯০% শুরু, সীমা শিখে থামা, ৮০ মেঝে, ক্রম মেনে কাটা)
-- আগে ...19.sql ও ...19b.sql চালান। ব্যাকআপ নিন। অ্যাডমিনে আগে সেভ করা start_pct/card_pct (যেমন ৭০/৮০) ডিফল্টের ওপরে থাকে, সেগুলো ৯০ করে দিন।
create table if not exists mc2_cleanup_state (k text primary key, stop numeric not null, active boolean not null default false, remain bigint not null default 0, ended timestamptz);
alter table mc2_cleanup_state enable row level security; revoke all on mc2_cleanup_state from anon, authenticated;

create or replace function mc2_cleanup_defaults() returns jsonb language sql immutable as $$
  select jsonb_build_object('on', true, 'others_on', true, 'db_mb', 500, 'start_pct', 90, 'card_pct', 90, 'card_max', 1000000, 'batch', 200, 'card_batch', 50,
    'min_age_days', 7, 'card_min_days', 0, 'visits_days', 0, 'visits_max', 3000, 'bin_days', 30, 'answers_days', 0, 'presence_days', 60, 'cards_days', 0,
    'stop_pct', 87, 'floor_pct', 80, 'step_pct', 2, 'storage_mb', 1024, 'shot_ok_days', 7, 'shot_no_days', 0, 'ip_view_min', 600, 'ip_card_hr', 1500, 'ip_score_hr', 1500, 'ip_entry_hr', 300, 'score_dev_hr', 30, 'visit_dev_hr', 40, 'card_per_dev', 20, 'card_gap_sec', 2)
$$;

create or replace function mc2_cleanup_cfg_get() returns jsonb language sql stable security definer set search_path = public as $$
  select mc2_cleanup_defaults() || coalesce((select cfg from mc2_cleanup_cfg where id = 1), '{}'::jsonb)
$$;

create or replace function mc2_lim(p_k text) returns int language sql stable security definer set search_path = public as $$
  select coalesce((select (cfg ->> p_k)::int from mc2_cleanup_cfg where id = 1), (mc2_cleanup_defaults() ->> p_k)::int)
$$;

create or replace function mc2_cleanup_cards(p_n int, p_days int, p_dry boolean, p_note text) returns int
language plpgsql security definer set search_path = public as $$
declare d int := 0;
begin
  if p_n <= 0 then return 0; end if;
  -- টপ ৩ (এখন বা কখনো) ও pinned কখনো নয়। শুধু কার্ড মোছে: mc2_scores (স্কোর) ও ইউজার ইনফো টেবিল অক্ষত থাকে।
  if p_dry then
    select count(*) into d from (select 1 from mc2_cards x where not x.pinned and (select count(*) from mc2_cards y where y.score > x.score) >= 3
      and x.updated_at < now() - make_interval(days => p_days) limit p_n) z;
  else
    delete from mc2_cards where id in (select x.id from mc2_cards x where not x.pinned and (select count(*) from mc2_cards y where y.score > x.score) >= 3
      and x.updated_at < now() - make_interval(days => p_days) order by x.updated_at limit p_n);
    get diagnostics d = row_count;
    if d > 0 then insert into mc2_cleanup_log(what, n, note) values ('mc2_cards', d, p_note); end if;
  end if;
  return d;
end $$;

create or replace function mc2_cleanup_admin_set(p_cfg jsonb) returns void language plpgsql security definer set search_path = public as $$
declare k text; v numeric; lo numeric; hi numeric;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if p_cfg is null or jsonb_typeof(p_cfg) <> 'object' then raise exception 'bad cfg'; end if;
  for k in select jsonb_object_keys(p_cfg) loop
    if k in ('on', 'others_on') then
      if jsonb_typeof(p_cfg -> k) <> 'boolean' then raise exception '% must be true/false', k; end if;
    else
      if k not in ('db_mb', 'start_pct', 'card_pct', 'card_max', 'batch', 'card_batch', 'min_age_days', 'card_min_days', 'visits_days', 'answers_days', 'presence_days', 'cards_days',
                   'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev', 'card_gap_sec', 'visits_max', 'bin_days', 'stop_pct', 'floor_pct', 'step_pct', 'storage_mb', 'shot_ok_days', 'shot_no_days') then raise exception 'unknown key %', k; end if;
      if jsonb_typeof(p_cfg -> k) <> 'number' then raise exception '% must be a number', k; end if;
      v := (p_cfg ->> k)::numeric;
      lo := case when k in ('db_mb', 'batch', 'card_batch', 'min_age_days', 'card_max', 'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev', 'visits_max', 'step_pct', 'storage_mb') then 1 when k in ('start_pct', 'card_pct', 'stop_pct', 'floor_pct') then 10 else 0 end;
      hi := case when k = 'db_mb' then 100000 when k in ('start_pct', 'card_pct', 'stop_pct', 'floor_pct') then 99 when k = 'step_pct' then 20 when k = 'storage_mb' then 100000 when k = 'batch' then 5000 when k = 'card_batch' then 1000 when k = 'card_max' then 1000000
                 when k in ('ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr') then 1000000 when k in ('score_dev_hr', 'visit_dev_hr') then 100000 when k = 'card_per_dev' then 1000 when k = 'visits_max' then 1000000 when k = 'card_gap_sec' then 60 else 3650 end;
      if v < lo or v > hi or v <> trunc(v) then raise exception '% must be a whole number % to %', k, lo, hi; end if;
    end if;
  end loop;
  insert into mc2_cleanup_cfg(id, cfg) values (1, p_cfg) on conflict (id) do update set cfg = excluded.cfg;
end $$;

create or replace function mc2_cleanup_stage(p_stage text, p_lim int, p_c jsonb, out o_bytes bigint, out o_n int) language plpgsql security definer set search_path = public as $$
declare t record; bb bigint; nn int; paths text[]; ca int := coalesce((p_c ->> 'card_min_days')::int, 0);
begin
  o_bytes := 0; o_n := 0;
  perform set_config('mc2.nobin', 'on', true);
  if p_stage = 'bin' then
    with d as (delete from mc2_bin where id in (select id from mc2_bin order by deleted_at limit p_lim) returning bytes) select coalesce(sum(bytes), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'chat' then
    with d as (delete from mc2_ac_messages where id in (select id from mc2_ac_messages order by id limit p_lim) returning file_path, pg_column_size(mc2_ac_messages.*) b)
      select coalesce(sum(b), 0), count(*), coalesce(array_agg(file_path) filter (where file_path is not null), '{}') into o_bytes, o_n, paths from d;
    if array_length(paths, 1) > 0 then
      begin perform set_config('storage.allow_delete_query', 'true', true); delete from storage.objects where bucket_id = 'mc2-chat' and name = any (paths); exception when others then null; end;
    end if;
  elsif p_stage = 'extra' then
    with d as (delete from mc2_cards where id in (select x.id from (select id, pinned, updated_at, row_number() over (partition by device order by updated_at desc) rn from mc2_cards) x where x.rn > 5 and not x.pinned order by x.updated_at limit p_lim) returning pg_column_size(mc2_cards.*) b)
      select coalesce(sum(b), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'low' then
    for t in select * from (values ('mc2_visits', 'created_at'), ('mc2_answers', 'created_at'), ('mc2_presence', 'last_seen')) v(tbl, col) loop
      execute format('with d as (delete from %I where ctid = any(array(select ctid from %I order by %I limit %s)) returning pg_column_size(%I.*) b) select coalesce(sum(b), 0), count(*) from d', t.tbl, t.tbl, t.col, p_lim, t.tbl) into bb, nn;
      o_bytes := o_bytes + bb; o_n := o_n + nn; exit when o_n > 0;
    end loop;
  elsif p_stage = 'cards' then
    with d as (delete from mc2_cards where id in (select x.id from mc2_cards x where not x.pinned and (select count(*) from mc2_cards y where y.score > x.score) >= 3 and x.updated_at < now() - make_interval(days => ca) order by x.updated_at limit p_lim) returning pg_column_size(mc2_cards.*) b)
      select coalesce(sum(b), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'schat' then
    begin
      perform set_config('storage.allow_delete_query', 'true', true);
      with d as (delete from storage.objects where id in (select id from storage.objects where bucket_id = 'mc2-chat' order by created_at limit p_lim) returning coalesce((metadata ->> 'size')::bigint, 0) b) select coalesce(sum(b), 0), count(*) into o_bytes, o_n from d;
    exception when others then o_bytes := 0; o_n := 0; end;
  elsif p_stage = 'sshot' then
    select s.o_bytes, s.o_n into o_bytes, o_n from mc2_shot_stage(p_lim) s;
  end if;
  perform set_config('mc2.nobin', '', true);
end $$;
revoke all on function mc2_cleanup_stage(text, int, jsonb) from public, anon, authenticated;

create or replace function mc2_cleanup_run(p_dry boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb := mc2_cleanup_cfg_get(); m text; lim bigint; used bigint; pct numeric; stp numeric; fl numeric := (c ->> 'floor_pct')::numeric; sp numeric := (c ->> 'start_pct')::numeric; s0 numeric := (c ->> 'stop_pct')::numeric;
  st record; goal bigint; stg text; r record; freed bigint; rem bigint; res jsonb := jsonb_build_object('dry', p_dry); lot int := greatest((c ->> 'batch')::int, 1);
begin
  if not coalesce((c ->> 'on')::boolean, true) then return jsonb_build_object('on', false); end if;
  foreach m in array array['db', 'st'] loop
    if m = 'db' then used := pg_database_size(current_database()); lim := (c ->> 'db_mb')::bigint * 1048576;
    else select coalesce(sum((metadata ->> 'size')::bigint), 0) into used from storage.objects; lim := (c ->> 'storage_mb')::bigint * 1048576; end if;
    pct := round(used * 100.0 / lim, 1);
    res := res || jsonb_build_object(m || '_pct', pct);
    if m = 'db' then res := res || jsonb_build_object('pct', pct, 'size_mb', round(used / 1048576.0, 1), 'cards', (select count(*) from mc2_cards)); end if;
    insert into mc2_cleanup_state(k, stop) values (m, s0) on conflict (k) do nothing;
    select * into st from mc2_cleanup_state where k = m;
    if not st.active then
      if pct < sp then
        if not p_dry and st.ended is not null and st.ended < now() - interval '3 days' and st.stop <> s0 then update mc2_cleanup_state set stop = s0 where k = m; end if;
        continue;
      end if;
      stp := st.stop;
      if st.ended is not null and st.ended > now() - interval '24 hours' then stp := stp - (c ->> 'step_pct')::numeric; end if;
      stp := greatest(fl, least(stp, sp - 1));
      goal := least(((pct - stp) / 100.0 * lim)::bigint, (lim * 0.15)::bigint);
      res := res || jsonb_build_object(m || '_stop', stp, m || '_goal_mb', round(goal / 1048576.0, 1));
      if goal <= 0 or p_dry then continue; end if;
      update mc2_cleanup_state set stop = stp, active = true, remain = goal where k = m;
    else
      if p_dry then res := res || jsonb_build_object(m || '_active', true, m || '_remain_mb', round(st.remain / 1048576.0, 1)); continue; end if;
      if pct <= fl or (m = 'st' and pct <= st.stop) then update mc2_cleanup_state set active = false, ended = now() where k = m; continue; end if;
    end if;
    freed := 0;
    foreach stg in array (case when m = 'db' then array['bin', 'chat', 'extra', 'low', 'cards'] else array['schat', 'sshot'] end) loop
      select * into r from mc2_cleanup_stage(stg, case when stg = 'cards' then greatest((c ->> 'card_batch')::int, 1) else lot end, c);
      if r.o_n > 0 then
        freed := r.o_bytes;
        insert into mc2_cleanup_log(what, n, note) values (stg, r.o_n, m || ' ' || pct || '%');
        res := res || jsonb_build_object('stage_' || m, stg, 'n_' || m, r.o_n);
        exit;
      end if;
    end loop;
    select remain - freed into rem from mc2_cleanup_state where k = m;
    if freed = 0 or rem <= 0 then update mc2_cleanup_state set active = false, ended = now(), remain = 0 where k = m;
    else update mc2_cleanup_state set remain = rem where k = m; end if;
  end loop;
  return res;
end $$;
revoke all on function mc2_cleanup_run(boolean) from public, anon, authenticated;

-- ---------- পুরস্কারের স্ক্রিনশট (contest_entries.shot_url, বাকেট 'contest') ----------
-- ভেরিফাইড = mc2_entry_flags.st = 'ok' (অ্যাডমিন "পুরস্কার" পেজে বসানো), চাবি: 'd:'||device অথবা 'n:'||lower(trim(name))
-- শুধু ছবির ফাইল মোছে, লগ-সারি থাকে (shot_url = 'deleted')। বিনে যায় না।
create or replace function mc2_shot_ok_at(p_dev text, p_name text) returns timestamptz language sql stable security definer set search_path = public as $$
  select max(f.at) from mc2_entry_flags f where f.st = 'ok' and (f.k = 'n:' || lower(trim(coalesce(p_name, ''))) or (p_dev is not null and f.k = 'd:' || p_dev)) $$;
create or replace function mc2_shot_ok(p_dev text, p_name text) returns boolean language sql stable security definer set search_path = public as $$
  select mc2_shot_ok_at(p_dev, p_name) is not null $$;
revoke all on function mc2_shot_ok_at(text, text), mc2_shot_ok(text, text) from public, anon, authenticated;

create or replace function mc2_shot_remove(p_ids bigint[]) returns bigint language plpgsql security definer set search_path = public as $$
declare nm text[]; b bigint := 0;
begin
  select coalesce(array_agg(substring(shot_url from '/object/public/contest/(.+)$')), '{}') into nm from contest_entries where id = any (p_ids) and shot_url like '%/object/public/contest/%';
  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    with d as (delete from storage.objects where bucket_id = 'contest' and name = any (nm) returning coalesce((metadata ->> 'size')::bigint, 0) s) select coalesce(sum(s), 0) into b from d;
    update contest_entries set shot_url = 'deleted' where id = any (p_ids) and shot_url like '%/object/public/contest/%';
  exception when others then b := 0; end;
  return b;
end $$;
revoke all on function mc2_shot_remove(bigint[]) from public, anon, authenticated;

create or replace function mc2_shot_delete(p_id bigint) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  perform mc2_shot_remove(array[p_id]);
  return true;
end $$;
grant execute on function mc2_shot_delete(bigint) to authenticated;

create or replace function mc2_shot_stage(p_lim int, out o_bytes bigint, out o_n int) language plpgsql security definer set search_path = public as $$
declare ids bigint[];
begin
  select coalesce(array_agg(x.id), '{}') into ids from (select e.id from contest_entries e where e.shot_url like '%/object/public/contest/%' and not mc2_shot_ok(e.device, e.name) order by e.created_at limit p_lim) x;
  o_n := coalesce(array_length(ids, 1), 0); o_bytes := case when o_n > 0 then mc2_shot_remove(ids) else 0 end;
end $$;
revoke all on function mc2_shot_stage(int) from public, anon, authenticated;

create or replace function mc2_shot_purge() returns int language plpgsql security definer set search_path = public as $$
declare c jsonb := mc2_cleanup_cfg_get(); ok int := (c ->> 'shot_ok_days')::int; nk int := (c ->> 'shot_no_days')::int; ids bigint[]; n int := 0;
begin
  if ok > 0 then
    select coalesce(array_agg(x.id), '{}') into ids from (select e.id from contest_entries e where e.shot_url like '%/object/public/contest/%' and mc2_shot_ok_at(e.device, e.name) < now() - make_interval(days => ok) limit 200) x;
    if array_length(ids, 1) > 0 then perform mc2_shot_remove(ids); n := n + array_length(ids, 1); end if;
  end if;
  if nk > 0 then
    select coalesce(array_agg(x.id), '{}') into ids from (select e.id from contest_entries e where e.shot_url like '%/object/public/contest/%' and not mc2_shot_ok(e.device, e.name) and e.created_at < now() - make_interval(days => nk) limit 200) x;
    if array_length(ids, 1) > 0 then perform mc2_shot_remove(ids); n := n + array_length(ids, 1); end if;
  end if;
  if n > 0 then insert into mc2_cleanup_log(what, n, note) values ('shots', n, 'age'); end if;
  return n;
end $$;
revoke all on function mc2_shot_purge() from public, anon, authenticated;

create or replace function mc2_cleanup_tick() returns void language plpgsql security definer set search_path = public as $$
begin
  if mc2_ac_rl('cleanup', 1, 600) then
    perform mc2_cleanup_visits(); perform mc2_bin_sweep(); perform mc2_shot_purge(); perform mc2_cleanup_run(false);
  end if;
exception when others then null;
end $$;
revoke all on function mc2_cleanup_tick() from public, anon, authenticated;


-- ==================== 30_supabase-new-20261019d.sql ====================
-- supabase-new-20261019d.sql (ধাপ ৩: অ্যাডমিনের "বিন ও ডিলিট" পেজের জন্য ফাংশন)
-- আগে ...19, ...19b, ...19c চালান। শুধু অ্যাডমিন চালাতে পারে (mc2_is_admin)। বারবার চালালেও ভাঙে না।

create or replace function mc2_space_stats() returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb := mc2_cleanup_cfg_get(); dbu bigint := pg_database_size(current_database()); stu bigint; dl bigint := (c ->> 'db_mb')::bigint * 1048576; sl bigint := (c ->> 'storage_mb')::bigint * 1048576;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  select coalesce(sum((metadata ->> 'size')::bigint), 0) into stu from storage.objects;
  return jsonb_build_object(
    'db_mb', round(dbu / 1048576.0, 1), 'db_limit', (c ->> 'db_mb')::int, 'db_pct', round(dbu * 100.0 / dl, 1),
    'st_mb', round(stu / 1048576.0, 1), 'st_limit', (c ->> 'storage_mb')::int, 'st_pct', round(stu * 100.0 / sl, 1),
    'start_pct', (c ->> 'start_pct')::numeric, 'floor_pct', (c ->> 'floor_pct')::numeric,
    'buckets', coalesce((select jsonb_agg(jsonb_build_object('id', b.bucket_id, 'n', b.n, 'mb', b.mb) order by b.mb desc)
      from (select bucket_id, count(*) n, round(coalesce(sum((metadata ->> 'size')::bigint), 0) / 1048576.0, 2) mb from storage.objects group by bucket_id) b), '[]'::jsonb),
    'state', coalesce((select jsonb_object_agg(k, jsonb_build_object('stop', stop, 'active', active, 'ended', ended)) from mc2_cleanup_state), '{}'::jsonb));
end $$;

create or replace function mc2_manual_stats(p_days int default 0) returns jsonb language plpgsql security definer set search_path = public as $$
declare cut timestamptz := case when coalesce(p_days, 0) > 0 then now() - make_interval(days => p_days) else 'infinity'::timestamptz end;
  r jsonb := '{}'::jsonb; n bigint; b bigint; t record;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  for t in select * from (values ('visits', 'mc2_visits', 'created_at', 'true'), ('answers', 'mc2_answers', 'created_at', 'true'), ('presence', 'mc2_presence', 'last_seen', 'true'),
    ('chat_msgs', 'mc2_ac_messages', 'created_at', 'true'), ('cards', 'mc2_cards', 'updated_at', 'not x.pinned'), ('bin', 'mc2_bin', 'deleted_at', 'true')) v(k, tbl, col, extra) loop
    execute format('select count(*), coalesce(sum(pg_column_size(x.*)), 0) from %I x where x.%I < $1 and %s', t.tbl, t.col, t.extra) into n, b using cut;
    r := r || jsonb_build_object(t.k, jsonb_build_object('n', n, 'mb', round(b / 1048576.0, 2)));
  end loop;
  select count(*), coalesce(sum((metadata ->> 'size')::bigint), 0) into n, b from storage.objects where bucket_id = 'mc2-chat' and created_at < cut;
  r := r || jsonb_build_object('chat_files', jsonb_build_object('n', n, 'mb', round(b / 1048576.0, 2)));
  select count(*), coalesce(sum((o.metadata ->> 'size')::bigint), 0) into n, b from contest_entries e left join storage.objects o on o.bucket_id = 'contest' and o.name = substring(e.shot_url from '/object/public/contest/(.+)$') where e.shot_url like '%/object/public/contest/%' and e.created_at < cut;
  r := r || jsonb_build_object('shots', jsonb_build_object('n', n, 'mb', round(b / 1048576.0, 2)));
  select count(*) into n from contest_entries where created_at < cut;
  r := r || jsonb_build_object('shot_rows', jsonb_build_object('n', n, 'mb', 0));
  return r || jsonb_build_object('top', (select count(*) from mc2_cards where pinned));
end $$;

create or replace function mc2_manual_delete(p_what text[], p_days int default 0, p_top boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare cut timestamptz := case when coalesce(p_days, 0) > 0 then now() - make_interval(days => p_days) else 'infinity'::timestamptz end;
  r jsonb := '{}'::jsonb; n int; tot int := 0; paths text[]; ids bigint[];
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if 'visits' = any (p_what) then insert into mc2_bin(src, row, bytes) select 'mc2_visits', to_jsonb(t), pg_column_size(t) from mc2_visits t where t.created_at < cut; delete from mc2_visits where created_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('visits', n); tot := tot + n; end if;
  if 'answers' = any (p_what) then insert into mc2_bin(src, row, bytes) select 'mc2_answers', to_jsonb(t), pg_column_size(t) from mc2_answers t where t.created_at < cut; delete from mc2_answers where created_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('answers', n); tot := tot + n; end if;
  if 'presence' = any (p_what) then delete from mc2_presence where last_seen < cut; get diagnostics n = row_count; r := r || jsonb_build_object('presence', n); tot := tot + n; end if;
  if 'chat_msgs' = any (p_what) then
    with d as (delete from mc2_ac_messages where created_at < cut returning file_path) select count(*), coalesce(array_agg(file_path) filter (where file_path is not null), '{}') into n, paths from d;
    if array_length(paths, 1) > 0 then begin perform set_config('storage.allow_delete_query', 'true', true); delete from storage.objects where bucket_id = 'mc2-chat' and name = any (paths); exception when others then null; end; end if;
    r := r || jsonb_build_object('chat_msgs', n); tot := tot + n;
  end if;
  if 'chat_files' = any (p_what) then
    begin perform set_config('storage.allow_delete_query', 'true', true); delete from storage.objects where bucket_id = 'mc2-chat' and created_at < cut; get diagnostics n = row_count; exception when others then n := 0; end;
    r := r || jsonb_build_object('chat_files', n); tot := tot + n;
  end if;
  if 'shots' = any (p_what) then
    select coalesce(array_agg(e.id), '{}') into ids from contest_entries e where e.shot_url like '%/object/public/contest/%' and e.created_at < cut;
    n := coalesce(array_length(ids, 1), 0); if n > 0 then perform mc2_shot_remove(ids); end if;
    if 'shots' = any (p_what) then r := r || jsonb_build_object('shots', n); tot := tot + n; end if;
  end if;
  if 'shot_rows' = any (p_what) then delete from contest_entries where created_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('shot_rows', n); tot := tot + n; end if;
  if 'cards' = any (p_what) then delete from mc2_cards where updated_at < cut and (p_top or not pinned); get diagnostics n = row_count; r := r || jsonb_build_object('cards', n); tot := tot + n; end if;
  if 'bin' = any (p_what) then delete from mc2_bin where deleted_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('bin', n); tot := tot + n; end if;
  insert into mc2_cleanup_log(what, n, note) values ('manual', tot, array_to_string(p_what, ','));
  return r;
end $$;

grant execute on function mc2_space_stats(), mc2_manual_stats(int), mc2_manual_delete(text[], int, boolean) to authenticated;


-- ==================== 31_supabase-new-20261020.sql ====================
-- ============================================================
-- বেনামি চ্যাট: একসাথে পাসওয়ার্ড লক (২০২৬-১০-২০)
-- আগে থেকে থাকা: প্রতি সেশনে আলাদা পাসওয়ার্ড (supabase-new-20261017d.sql / supabase-moderation.sql) — সেটা বদলায়নি।
-- নতুন: (ক) একটি বিভাগের সব সেশনে একসাথে, (খ) সব বিভাগের সব সেশনে একসাথে — পাসওয়ার্ড বসানো/সরানো, চালু/বন্ধ।
-- পাসওয়ার্ড প্রতি সেশনের আইডি মিশিয়ে আলাদা আলাদা হ্যাশ হয়ে সেভ হয় (আগের নিয়মেই)। পড়া ও পাঠানো সার্ভারেই আটকায়।
-- বদলালে/সরালে/চালু-বন্ধ করলে ওই সেশনগুলোর আগের সবার অ্যাক্সেস মুছে যায়। Supabase SQL Editor-এ একবার Run করুন; আবার চালালেও ক্ষতি নেই।
-- ============================================================
create or replace function mc2_ac_admin_setpw_bulk(p_scope text, p_dept int, p_pw text) returns int language plpgsql security definer set search_path = public as $$
declare w text := btrim(coalesce(p_pw, '')); n int;
begin
  perform mc2_ac_adm();
  if p_scope not in ('all', 'dept') then raise exception 'অবৈধ পরিসর'; end if;
  if p_scope = 'dept' and p_dept is null then raise exception 'বিভাগ বাছুন'; end if;
  if w <> '' and char_length(w) not between 3 and 40 then raise exception 'পাসওয়ার্ড ৩ থেকে ৪০ অক্ষরের হতে হবে'; end if;
  if w = '' then
    update mc2_ac_sessions set pw_hash = null, pw_on = false where p_scope = 'all' or dept_id = p_dept;
  else
    update mc2_ac_sessions set pw_hash = mc2_ac_pwh(id, w), pw_on = true where p_scope = 'all' or dept_id = p_dept;
  end if;
  get diagnostics n = row_count;
  delete from mc2_ac_access where session_id in (select id from mc2_ac_sessions where p_scope = 'all' or dept_id = p_dept);
  return n;
end $$;
revoke all on function mc2_ac_admin_setpw_bulk(text, int, text) from public, anon;
grant execute on function mc2_ac_admin_setpw_bulk(text, int, text) to authenticated;

-- চালু/বন্ধ: চালু শুধু তাদের, যাদের পাসওয়ার্ড সেভ করা আছে; বন্ধ সবার (সেভ করা পাসওয়ার্ড থাকে)
create or replace function mc2_ac_admin_pwon_bulk(p_scope text, p_dept int, p_on boolean) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform mc2_ac_adm();
  if p_scope not in ('all', 'dept') then raise exception 'অবৈধ পরিসর'; end if;
  if p_scope = 'dept' and p_dept is null then raise exception 'বিভাগ বাছুন'; end if;
  update mc2_ac_sessions set pw_on = p_on
   where (p_scope = 'all' or dept_id = p_dept) and (not p_on or pw_hash is not null);
  get diagnostics n = row_count;
  delete from mc2_ac_access where session_id in (select id from mc2_ac_sessions where p_scope = 'all' or dept_id = p_dept);
  return n;
end $$;
revoke all on function mc2_ac_admin_pwon_bulk(text, int, boolean) from public, anon;
grant execute on function mc2_ac_admin_pwon_bulk(text, int, boolean) to authenticated;

-- ============================================================
-- পাসওয়ার্ড-লক চ্যাটে ইউজারকে দেখানোর "নির্দেশনা" (ঐচ্ছিক; ডিফল্টে খালি = কিছু দেখায় না)
-- অ্যাডমিন লিখলে তবেই ইউজার দেখে — পাসওয়ার্ডের ঘরের নিচে, ভুল পাসওয়ার্ড দিলেও। যেমন: শর্ত, পেইড কি না, কার কাছে পাসওয়ার্ড পাবে।
-- সর্বোচ্চ ৫০০ অক্ষর। এক সেশনে, একটা বিভাগের সব সেশনে, বা সব সেশনে একসাথে বসানো/সরানো যায়।
-- ============================================================
alter table mc2_ac_sessions add column if not exists pw_note text;
grant select (pw_note) on mc2_ac_sessions to anon;
create or replace function mc2_ac_admin_pwnote(p_session int, p_note text) returns void language plpgsql security definer set search_path = public as $$
declare w text := btrim(coalesce(p_note, ''));
begin
  perform mc2_ac_adm();
  if char_length(w) > 500 then raise exception 'নির্দেশনা ৫০০ অক্ষরের বেশি হবে না'; end if;
  update mc2_ac_sessions set pw_note = nullif(w, '') where id = p_session;
end $$;
revoke all on function mc2_ac_admin_pwnote(int, text) from public, anon;
grant execute on function mc2_ac_admin_pwnote(int, text) to authenticated;
create or replace function mc2_ac_admin_pwnote_bulk(p_scope text, p_dept int, p_note text) returns int language plpgsql security definer set search_path = public as $$
declare w text := btrim(coalesce(p_note, '')); n int;
begin
  perform mc2_ac_adm();
  if p_scope not in ('all', 'dept') then raise exception 'অবৈধ পরিসর'; end if;
  if p_scope = 'dept' and p_dept is null then raise exception 'বিভাগ বাছুন'; end if;
  if char_length(w) > 500 then raise exception 'নির্দেশনা ৫০০ অক্ষরের বেশি হবে না'; end if;
  update mc2_ac_sessions set pw_note = nullif(w, '') where p_scope = 'all' or dept_id = p_dept;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function mc2_ac_admin_pwnote_bulk(text, int, text) from public, anon;
grant execute on function mc2_ac_admin_pwnote_bulk(text, int, text) to authenticated;


-- ==================== 32_supabase-new-20261020b.sql ====================
-- supabase-new-20261020b.sql — পার্ট ৫: স্ক্রিনশট ও বিন (একবার Run; আগে ব্যাকআপ; ...19c ও ...20 আগে চালানো থাকতে হবে)
-- ১) Storage চাপে স্ক্রিনশট মোছা বন্ধ (mc2_cleanup_stage থেকে 'sshot' ধাপ বাদ; mc2_shot_stage এখন কিছুই মোছে না)।
-- ২) শুধু Verified স্ক্রিনশট, যাচাইয়ের shot_ok_days (ডিফল্ট ৭) দিন পর মুছবে। shot_no_days এখন আর কাজ করে না।
--    অবস্থা (mc2_entry_flags.st): ok=Verified | no=Unverified | কোনো ফ্ল্যাগ নেই=Pending | ex/nr/অন্য=Unknown।
--    ফ্ল্যাগের চাবি অ্যাডমিন অ্যাপের মতোই: device থাকলে 'd:'||device, নইলে 'n:'||lower(trim(name)); একটাই চাবি দেখা হয়।
-- ৩) বিন: মেয়াদ bin_days (ডিফল্ট ৩০); bin_days = ০ বা অটো-ক্লিন বন্ধ থাকলে বিন কখনো নিজে খালি হয় না (চাপের ধাপেও না)।

create or replace function mc2_shot_status(p_dev text, p_name text) returns text language sql stable security definer set search_path = public as $$
  select case coalesce((select f.st from mc2_entry_flags f
                         where f.k = case when nullif(trim(coalesce(p_dev, '')), '') is not null then 'd:' || p_dev else 'n:' || lower(trim(coalesce(p_name, ''))) end), '')
    when 'ok' then 'verified' when 'no' then 'unverified' when '' then 'pending' else 'unknown' end $$;

create or replace function mc2_shot_ok_at(p_dev text, p_name text) returns timestamptz language sql stable security definer set search_path = public as $$
  select f.at from mc2_entry_flags f
   where f.st = 'ok' and f.k = case when nullif(trim(coalesce(p_dev, '')), '') is not null then 'd:' || p_dev else 'n:' || lower(trim(coalesce(p_name, ''))) end $$;
create or replace function mc2_shot_ok(p_dev text, p_name text) returns boolean language sql stable security definer set search_path = public as $$
  select mc2_shot_status(p_dev, p_name) = 'verified' $$;
revoke all on function mc2_shot_status(text, text), mc2_shot_ok_at(text, text), mc2_shot_ok(text, text) from public, anon, authenticated;

-- জায়গার চাপে কখনো স্ক্রিনশট মোছে না
create or replace function mc2_shot_stage(p_lim int, out o_bytes bigint, out o_n int) language plpgsql security definer set search_path = public as $$
begin o_bytes := 0; o_n := 0; end $$;
revoke all on function mc2_shot_stage(int) from public, anon, authenticated;

create or replace function mc2_cleanup_stage(p_stage text, p_lim int, p_c jsonb, out o_bytes bigint, out o_n int) language plpgsql security definer set search_path = public as $$
declare t record; bb bigint; nn int; paths text[]; ca int := coalesce((p_c ->> 'card_min_days')::int, 0);
begin
  o_bytes := 0; o_n := 0;
  perform set_config('mc2.nobin', 'on', true);
  if p_stage = 'bin' and coalesce((p_c ->> 'bin_days')::int, 0) <= 0 then null;  -- বিন OFF (০ দিন): চাপেও বিন খালি হবে না
  elsif p_stage = 'bin' then
    with d as (delete from mc2_bin where id in (select id from mc2_bin order by deleted_at limit p_lim) returning bytes) select coalesce(sum(bytes), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'chat' then
    with d as (delete from mc2_ac_messages where id in (select id from mc2_ac_messages order by id limit p_lim) returning file_path, pg_column_size(mc2_ac_messages.*) b)
      select coalesce(sum(b), 0), count(*), coalesce(array_agg(file_path) filter (where file_path is not null), '{}') into o_bytes, o_n, paths from d;
    if array_length(paths, 1) > 0 then
      begin perform set_config('storage.allow_delete_query', 'true', true); delete from storage.objects where bucket_id = 'mc2-chat' and name = any (paths); exception when others then null; end;
    end if;
  elsif p_stage = 'extra' then
    with d as (delete from mc2_cards where id in (select x.id from (select id, pinned, updated_at, row_number() over (partition by device order by updated_at desc) rn from mc2_cards) x where x.rn > 5 and not x.pinned order by x.updated_at limit p_lim) returning pg_column_size(mc2_cards.*) b)
      select coalesce(sum(b), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'low' then
    for t in select * from (values ('mc2_visits', 'created_at'), ('mc2_answers', 'created_at'), ('mc2_presence', 'last_seen')) v(tbl, col) loop
      execute format('with d as (delete from %I where ctid = any(array(select ctid from %I order by %I limit %s)) returning pg_column_size(%I.*) b) select coalesce(sum(b), 0), count(*) from d', t.tbl, t.tbl, t.col, p_lim, t.tbl) into bb, nn;
      o_bytes := o_bytes + bb; o_n := o_n + nn; exit when o_n > 0;
    end loop;
  elsif p_stage = 'cards' then
    with d as (delete from mc2_cards where id in (select x.id from mc2_cards x where not x.pinned and (select count(*) from mc2_cards y where y.score > x.score) >= 3 and x.updated_at < now() - make_interval(days => ca) order by x.updated_at limit p_lim) returning pg_column_size(mc2_cards.*) b)
      select coalesce(sum(b), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'schat' then
    begin
      perform set_config('storage.allow_delete_query', 'true', true);
      with d as (delete from storage.objects where id in (select id from storage.objects where bucket_id = 'mc2-chat' order by created_at limit p_lim) returning coalesce((metadata ->> 'size')::bigint, 0) b) select coalesce(sum(b), 0), count(*) into o_bytes, o_n from d;
    exception when others then o_bytes := 0; o_n := 0; end;
  end if;
  perform set_config('mc2.nobin', '', true);
end $$;

-- শুধু Verified: যাচাইয়ের shot_ok_days দিন পর ছবির ফাইল মোছে (লগ-সারি থাকে, shot_url = 'deleted')। Unverified/Unknown/Pending কখনো নয়।
create or replace function mc2_shot_purge() returns int language plpgsql security definer set search_path = public as $$
declare ok int := coalesce((mc2_cleanup_cfg_get() ->> 'shot_ok_days')::int, 7); ids bigint[]; n int := 0;
begin
  if ok > 0 then
    select coalesce(array_agg(x.id), '{}') into ids from (
      select e.id from contest_entries e
       where e.shot_url like '%/object/public/contest/%' and mc2_shot_status(e.device, e.name) = 'verified'
         and mc2_shot_ok_at(e.device, e.name) < now() - make_interval(days => ok) limit 200) x;
    if array_length(ids, 1) > 0 then perform mc2_shot_remove(ids); n := array_length(ids, 1); end if;
  end if;
  if n > 0 then insert into mc2_cleanup_log(what, n, note) values ('shots', n, 'verified+' || ok || 'd'); end if;
  return n;
end $$;
revoke all on function mc2_shot_purge() from public, anon, authenticated;

-- বিন: OFF (bin_days = 0) বা অটো-ক্লিন বন্ধ থাকলে কিছুই মোছে না
create or replace function mc2_bin_sweep() returns int language plpgsql security definer set search_path = public as $$
declare d int := mc2_lim('bin_days'); n int := 0;
begin
  if not coalesce((mc2_cleanup_cfg_get() ->> 'on')::boolean, true) then return 0; end if;
  if d > 0 then delete from mc2_bin where deleted_at < now() - make_interval(days => d); get diagnostics n = row_count; end if;
  return n;
end $$;
revoke all on function mc2_bin_sweep() from public, anon, authenticated;

-- সেভ করা পুরোনো shot_no_days সরানো (এটা এখন অব্যবহৃত)
update mc2_cleanup_cfg set cfg = cfg - 'shot_no_days' where id = 1;

select 'ok' as result, (select count(*) from contest_entries where shot_url like '%/object/public/contest/%') as shots_left;


-- ==================== 33_supabase-new-20261020c.sql ====================
-- supabase-new-20261020c.sql — টপ ৩-এর স্থায়ী ইতিহাস (একবার Run; আবার চালালেও ক্ষতি নেই)
-- আগে ...19, ...19b, ...19c চালানো থাকতে হবে (mc2_cards.pinned লাগে)। কোনো পুরোনো ফাংশন/টেবিল বদলায় না; mc2_card_save-ও না।
-- টপ = mc2_cards-এ স্কোর অনুযায়ী ১–৩ নম্বর (সমান স্কোরে একই Rank; pinned-এর নিয়মের মতোই)।
-- ১) mc2_top_hist: প্রতি কার্ডে একটা সারি — কার্ড ID, মালিক ID (device), প্রথম টপে যাওয়ার সময়/স্কোর, মোট কতবার টপে এসেছে, সর্বোচ্চ ও বর্তমান Rank (বর্তমান NULL = এখন টপে নেই)।
-- ২) mc2_top_log: প্রতিটি ঘটনা — enter (টপে ঢোকা, তারিখ+স্কোরসহ) / change (Rank বদল: আগের→পরের) / leave (টপ থেকে নামা)।
-- ৩) কার্ড সেভ/স্কোর বদল/মোছায় ট্রিগার নিজে ইতিহাস হালনাগাদ করে; ইতিহাসে ভুল হলেও কার্ড সেভ আটকায় না।
-- ৪) কার্ড মুছে গেলেও ইতিহাস থাকে (কার্ডের সাথে সংযোগ-নিষেধ নেই)। অটো-ক্লিনআপ এই দুই টেবিল ছোঁয় না।

create table if not exists mc2_top_hist (
  card_id bigint primary key,
  device text not null,
  name text,
  first_top_at timestamptz not null default now(),
  first_score int,
  times_in_top int not null default 1 check (times_in_top >= 1),
  best_rank smallint check (best_rank between 1 and 3),
  cur_rank smallint check (cur_rank between 1 and 3),
  last_top_at timestamptz not null default now(),
  last_score int,
  updated_at timestamptz not null default now()
);
create index if not exists mc2_top_hist_dev on mc2_top_hist (device);
create index if not exists mc2_top_hist_first on mc2_top_hist (first_top_at desc);
create index if not exists mc2_top_hist_cur on mc2_top_hist (cur_rank) where cur_rank is not null;

create table if not exists mc2_top_log (
  id bigint generated always as identity primary key,
  card_id bigint not null,
  device text not null,
  name text,
  kind text not null check (kind in ('enter', 'change', 'leave')),
  old_rank smallint,
  new_rank smallint,
  score int,
  at timestamptz not null default now(),
  note text
);
create index if not exists mc2_top_log_card on mc2_top_log (card_id, at desc);
create index if not exists mc2_top_log_dev on mc2_top_log (device, at desc);
create index if not exists mc2_top_log_at on mc2_top_log (at desc);

alter table mc2_top_hist enable row level security;
alter table mc2_top_log enable row level security;
revoke all on mc2_top_hist, mc2_top_log from anon, authenticated;
grant select on mc2_top_hist, mc2_top_log to authenticated;
drop policy if exists "admin top hist" on mc2_top_hist;
create policy "admin top hist" on mc2_top_hist for select to authenticated using (mc2_is_admin());
drop policy if exists "admin top log" on mc2_top_log;
create policy "admin top log" on mc2_top_log for select to authenticated using (mc2_is_admin());

-- বর্তমান টপ ৩ মিলিয়ে ইতিহাস হালনাগাদ। ফেরত: কতটা ঘটনা লেখা হলো। p_backfill = true হলে সময় = কার্ডের updated_at (শুধু প্রথমবারের ভরাটে)।
create or replace function mc2_top_sync(p_backfill boolean default false) returns int
language plpgsql security definer set search_path = public as $$
declare r record; h record; n int := 0; ids bigint[] := '{}'; ts timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('mc2_top_sync'));
  for r in select t.id, t.device, t.name, t.score, t.rk::int as rk, t.updated_at
             from (select c.id, c.device, c.name, c.score, c.updated_at, rank() over (order by c.score desc) as rk from mc2_cards c) t
            where t.rk <= 3 order by t.rk, t.id loop
    ids := ids || r.id;
    ts := case when p_backfill then r.updated_at else now() end;
    select * into h from mc2_top_hist where card_id = r.id;
    if not found then
      insert into mc2_top_hist(card_id, device, name, first_top_at, first_score, best_rank, cur_rank, last_top_at, last_score)
      values (r.id, r.device, r.name, ts, r.score, r.rk, r.rk, ts, r.score);
      insert into mc2_top_log(card_id, device, name, kind, new_rank, score, at, note)
      values (r.id, r.device, r.name, 'enter', r.rk, r.score, ts, case when p_backfill then 'backfill' end);
      n := n + 1;
    elsif h.cur_rank is null then
      update mc2_top_hist set times_in_top = times_in_top + 1, cur_rank = r.rk, best_rank = least(coalesce(best_rank, r.rk), r.rk),
        last_top_at = ts, last_score = r.score, name = r.name, updated_at = now() where card_id = r.id;
      insert into mc2_top_log(card_id, device, name, kind, new_rank, score, at) values (r.id, r.device, r.name, 'enter', r.rk, r.score, ts);
      n := n + 1;
    elsif h.cur_rank <> r.rk then
      update mc2_top_hist set cur_rank = r.rk, best_rank = least(coalesce(best_rank, r.rk), r.rk), last_score = r.score, name = r.name, updated_at = now() where card_id = r.id;
      insert into mc2_top_log(card_id, device, name, kind, old_rank, new_rank, score, at) values (r.id, r.device, r.name, 'change', h.cur_rank, r.rk, r.score, ts);
      n := n + 1;
    elsif h.last_score is distinct from r.score then
      update mc2_top_hist set last_score = r.score, updated_at = now() where card_id = r.id;  -- Rank একই, শুধু স্কোর বেড়েছে: লগ নয়
    end if;
  end loop;
  for h in select * from mc2_top_hist where cur_rank is not null and card_id <> all (ids) loop
    update mc2_top_hist set cur_rank = null, updated_at = now() where card_id = h.card_id;
    insert into mc2_top_log(card_id, device, name, kind, old_rank, score, note)
    select h.card_id, h.device, h.name, 'leave', h.cur_rank, coalesce((select x.score from mc2_cards x where x.id = h.card_id), h.last_score),
           case when exists (select 1 from mc2_cards x where x.id = h.card_id) then null else 'card deleted' end;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function mc2_top_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin perform mc2_top_sync(false); exception when others then null; end;
  return null;
end $$;
revoke all on function mc2_top_sync(boolean), mc2_top_trg() from public, anon, authenticated;

drop trigger if exists mc2_cards_topsync on mc2_cards;
create trigger mc2_cards_topsync after insert or delete or update of score on mc2_cards for each statement execute function mc2_top_trg();

-- একবারের ভরাট (ইতিহাস খালি থাকলেই): এখনকার টপ ৩ + আগে pinned হওয়া কার্ড। আগের সঠিক সময়/Rank জানা নেই, তাই updated_at ও স্কোর ধরা হয় এবং লগে note = backfill।
do $$
begin
  if not exists (select 1 from mc2_top_hist) then
    perform mc2_top_sync(true);
    insert into mc2_top_hist(card_id, device, name, first_top_at, first_score, last_top_at, last_score)
    select c.id, c.device, c.name, c.updated_at, c.score, c.updated_at, c.score from mc2_cards c where c.pinned
    on conflict (card_id) do nothing;
    insert into mc2_top_log(card_id, device, name, kind, score, at, note)
    select h.card_id, h.device, h.name, 'enter', h.first_score, h.first_top_at, 'backfill: আগের Rank জানা নেই'
      from mc2_top_hist h where h.best_rank is null and not exists (select 1 from mc2_top_log l where l.card_id = h.card_id);
  end if;
end $$;

-- নাম-চেক: সব সারিতে ok = true এলে ঠিক
select 'mc2_top_hist' as item, to_regclass('public.mc2_top_hist') is not null as ok
union all select 'mc2_top_log', to_regclass('public.mc2_top_log') is not null
union all select '৬টা ইনডেক্স', (select count(*) = 6 from pg_indexes where schemaname = 'public'
  and indexname in ('mc2_top_hist_dev', 'mc2_top_hist_first', 'mc2_top_hist_cur', 'mc2_top_log_card', 'mc2_top_log_dev', 'mc2_top_log_at'))
union all select 'mc2_top_sync', exists (select 1 from pg_proc where proname = 'mc2_top_sync')
union all select 'ট্রিগার mc2_cards_topsync', exists (select 1 from pg_trigger where tgname = 'mc2_cards_topsync' and not tgisinternal);


-- ==================== 34_supabase-new-20261021.sql ====================
-- supabase-new-20261021.sql — টপ ৩ সুরক্ষা ঠিক করা (একবার Run; আবার চালালেও ক্ষতি নেই)
-- সমস্যা: আগে "count(score >) < 3" ছিল, তাই সমান স্কোরে অনেক কার্ড একসাথে "টপ" ধরা পড়ত ও pinned (অটো-ক্লিন সুরক্ষিত) হয়ে যেত।
-- নতুন নিয়ম: টপ = ঠিক ৩টা আসন (লিডারবোর্ডের টপ ৩-এর মতোই)। ক্রম: স্কোর বেশি আগে; সমান স্কোরে যে আগে ওই স্কোর করেছে (mc2_scores.created_at), তারপর id।
-- Rank দেখানোর নিয়ম অপরিবর্তিত: সমান স্কোরে একই Rank (যেমন 1,1,2), কিন্তু আসন ৩টাই।
-- কার্ড একবার টপের আসনে ঢুকলেই pinned = true হয় এবং কখনো আর false হয় না: স্কোর কমলে, লিডারবোর্ড থেকে বাদ গেলে বা লুকালেও সুরক্ষা থাকে।
-- pinned দেওয়ার কাজ এখন mc2_top_sync() (কার্ড insert/delete/স্কোর বদলের ট্রিগার) করে; mc2_card_save থেকে পুরোনো "count(score >) < 3" লাইনটা বাদ।
-- ইতিহাস (mc2_top_hist / mc2_top_log) কার্ড আপডেট বা ডিলিটে হারায় না: কার্ডের সাথে কোনো সংযোগ-নিষেধ নেই, অটো-ক্লিন/বিন এগুলো ছোঁয় না।
-- নতুন: (ক) ইতিহাসে dept, batch, best_score জমা থাকে (কার্ড মুছে গেলেও কে ছিল জানা যায়); (খ) টপে থাকা কার্ড মুছে একই device+নামে আবার কার্ড হলে ইতিহাস নতুন কার্ডে জুড়ে যায় ও সেটা সরাসরি pinned হয়।
-- আগে ...19, ...19b, ...19c, ...20c চালানো থাকতে হবে। পুরোনো pinned কার্ড কাউকে আনপিন করা হয় না (কোনো ডেটা মোছা/বদলানো হয় না)।

-- ০) ইতিহাসে কার্ড মুছে গেলেও থেকে যাওয়ার মতো তথ্য
alter table mc2_top_hist add column if not exists dept text;
alter table mc2_top_hist add column if not exists batch text;
alter table mc2_top_hist add column if not exists best_score int;
update mc2_top_hist h set dept = c.dept, batch = c.batch from mc2_cards c where c.id = h.card_id and h.dept is null;
update mc2_top_hist set best_score = greatest(coalesce(first_score, 0), coalesce(last_score, 0)) where best_score is null;

-- ১) ঠিক ৩ আসন: (id, rank) ফেরত
create or replace function mc2_top_seats() returns table(id bigint, rk int)
language sql stable security definer set search_path = public as $$
  with lim as (select coalesce((select c.score from mc2_cards c order by c.score desc offset 2 limit 1), -1) as s3),
  cand as (
    select c.id, c.score, c.created_at,
      (select min(s.created_at) from mc2_scores s where s.device = c.device and lower(s.name) = lower(c.name) and s.score = c.score) as reached
    from mc2_cards c, lim where c.score >= lim.s3
  ), rk as (
    select c.id, c.score, c.reached, c.created_at, rank() over (order by c.score desc) as r from cand c
  )
  select rk.id, rk.r::int from rk order by rk.score desc, rk.reached nulls last, rk.created_at, rk.id limit 3
$$;
revoke all on function mc2_top_seats() from public, anon, authenticated;

-- ২) mc2_top_sync: এখন ৩ আসন ধরে ইতিহাস হালনাগাদ করে + আসনে ঢোকা কার্ড pinned করে
create or replace function mc2_top_sync(p_backfill boolean default false) returns int
language plpgsql security definer set search_path = public as $$
declare r record; h record; n int := 0; ids bigint[] := '{}'; ts timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('mc2_top_sync'));
  for r in select t.id, c.device, c.name, c.dept, c.batch, c.score, t.rk, c.updated_at
             from mc2_top_seats() t join mc2_cards c on c.id = t.id order by t.rk, t.id loop
    ids := ids || r.id;
    update mc2_cards set pinned = true where id = r.id and not pinned;
    ts := case when p_backfill then r.updated_at else now() end;
    select * into h from mc2_top_hist where card_id = r.id;
    if not found then
      insert into mc2_top_hist(card_id, device, name, first_top_at, first_score, best_rank, cur_rank, last_top_at, last_score)
      values (r.id, r.device, r.name, ts, r.score, r.rk, r.rk, ts, r.score);
      insert into mc2_top_log(card_id, device, name, kind, new_rank, score, at, note)
      values (r.id, r.device, r.name, 'enter', r.rk, r.score, ts, case when p_backfill then 'backfill' end);
      n := n + 1;
    elsif h.cur_rank is null then
      update mc2_top_hist set times_in_top = times_in_top + 1, cur_rank = r.rk, best_rank = least(coalesce(best_rank, r.rk), r.rk),
        last_top_at = ts, last_score = r.score, name = r.name, updated_at = now() where card_id = r.id;
      insert into mc2_top_log(card_id, device, name, kind, new_rank, score, at) values (r.id, r.device, r.name, 'enter', r.rk, r.score, ts);
      n := n + 1;
    elsif h.cur_rank <> r.rk then
      update mc2_top_hist set cur_rank = r.rk, best_rank = least(coalesce(best_rank, r.rk), r.rk), last_score = r.score, name = r.name, updated_at = now() where card_id = r.id;
      insert into mc2_top_log(card_id, device, name, kind, old_rank, new_rank, score, at) values (r.id, r.device, r.name, 'change', h.cur_rank, r.rk, r.score, ts);
      n := n + 1;
    elsif h.last_score is distinct from r.score then
      update mc2_top_hist set last_score = r.score, updated_at = now() where card_id = r.id;
    end if;
    update mc2_top_hist set dept = r.dept, batch = r.batch, best_score = greatest(coalesce(best_score, r.score), r.score) where card_id = r.id;
  end loop;
  for h in select * from mc2_top_hist where cur_rank is not null and card_id <> all (ids) loop
    update mc2_top_hist set cur_rank = null, updated_at = now() where card_id = h.card_id;
    insert into mc2_top_log(card_id, device, name, kind, old_rank, score, note)
    select h.card_id, h.device, h.name, 'leave', h.cur_rank, coalesce((select x.score from mc2_cards x where x.id = h.card_id), h.last_score),
           case when exists (select 1 from mc2_cards x where x.id = h.card_id) then null else 'card deleted' end;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function mc2_top_sync(boolean) from public, anon, authenticated;

-- ২ক) কার্ড মুছে আবার একই device+নামে তৈরি হলে: ইতিহাস নতুন কার্ডে জুড়ে যায় (log-সহ) ও কার্ড pinned হয়। ভুল হলেও কার্ড সেভ আটকায় না।
create or replace function mc2_cards_hist_link() returns trigger language plpgsql security definer set search_path = public as $$
declare oid_ bigint;
begin
  begin
    if exists (select 1 from mc2_top_hist h where h.device = new.device and lower(h.name) = lower(new.name)) then new.pinned := true; end if;
    if not exists (select 1 from mc2_cards c where c.device = new.device and lower(c.name) = lower(new.name))
       and not exists (select 1 from mc2_top_hist where card_id = new.id) then
      select h.card_id into oid_ from mc2_top_hist h
       where h.device = new.device and lower(h.name) = lower(new.name) and not exists (select 1 from mc2_cards c where c.id = h.card_id)
       order by h.last_top_at desc limit 1;
      if oid_ is not null then
        update mc2_top_hist set card_id = new.id where card_id = oid_;
        update mc2_top_log set card_id = new.id where card_id = oid_;
      end if;
    end if;
  exception when others then null;
  end;
  return new;
end $$;
revoke all on function mc2_cards_hist_link() from public, anon, authenticated;
drop trigger if exists mc2_cards_histlink on mc2_cards;
create trigger mc2_cards_histlink before insert on mc2_cards for each row execute function mc2_cards_hist_link();

-- ৩) mc2_card_save: ...19b-র সংস্করণের কপি; শুধু পুরোনো "count(score >) < 3 → pinned" লাইনটা বাদ (pinned এখন ওপরের mc2_top_sync দেয়)
create or replace function mc2_card_save(p_device text, p_name text, p_dept text, p_batch text, p_score int, p_rec jsonb, p_thumb text, p_photo text)
returns text language plpgsql security definer set search_path = public as $$
declare v record; nm text := trim(coalesce(p_name, '')); rec jsonb; old record;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 or char_length(nm) not between 1 and 30 or p_score is null or p_score not between 0 and 1000 then return 'invalid'; end if;
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

-- ৪) একবারের মিলানো: এখনকার ঠিক ৩ আসনের কার্ড pinned + ইতিহাসে (ট্রিগার না চালিয়েও এখনই)
select mc2_top_sync(false);

-- নাম-চেক: সব সারিতে ok = true এলে ঠিক
select 'mc2_top_seats' as item, exists (select 1 from pg_proc where proname = 'mc2_top_seats') as ok
union all select 'ঠিক ৩ আসন (কার্ড ৩টির কম হলে যত আছে)', (select count(*) from mc2_top_seats()) = least(3, (select count(*) from mc2_cards))
union all select 'আসনের সব কার্ড pinned', not exists (select 1 from mc2_top_seats() s join mc2_cards c on c.id = s.id where not c.pinned)
union all select 'ইতিহাসে dept/batch/best_score কলাম', (select count(*) = 3 from information_schema.columns where table_name = 'mc2_top_hist' and column_name in ('dept', 'batch', 'best_score'))
union all select 'ট্রিগার mc2_cards_histlink', exists (select 1 from pg_trigger where tgname = 'mc2_cards_histlink' and not tgisinternal)
union all select 'mc2_card_save-এ পুরোনো লাইন নেই', (select prosrc not like '%x.score > v.score%' from pg_proc where proname = 'mc2_card_save' limit 1);

-- (ঐচ্ছিক, শুধু দেখার জন্য — কিছু বদলায় না) আগের ভুল নিয়মে pinned হওয়া কিন্তু এখন ৩ আসনে নেই এমন কার্ড কতগুলো:
-- select count(*) from mc2_cards where pinned and id not in (select id from mc2_top_seats());


-- ==================== 35_supabase-new-20261021b.sql ====================
-- supabase-new-20261021b.sql — অটো-ক্লিন নিয়ম (একবার Run; আবার চালালেও ক্ষতি নেই; ...19c ও ...20b আগে চালানো থাকতে হবে)
-- ১) advisory lock: ক্লিনআপ একসাথে দুই জায়গা থেকে চলবে না (pg_try_advisory_xact_lock; না পেলে অপেক্ষা নয়, বাদ)। ড্রাই-রান লক নেয় না।
-- ২) কার্ড: অটো-ক্লিন ডিভাইসের সর্বশেষ ৫টি কার্ড ও টপ ৩ (pinned) কখনো মোছে না — শেষ 'cards' ধাপ বন্ধ; শুধু 'extra' ধাপ ৫টির বাইরেরগুলো (pinned বাদে) মোছে। নিজে মুছতে চাইলে অ্যাডমিন > বিন > ম্যানুয়াল মোছা (দিন-ফিল্টার + "টপসহ" অপশন) আগের মতোই আছে।
-- ৩) কাটার গতি আগের মতোই অপরিবর্তিত: ৯০% ছুঁলে শুরু, ছোট লক্ষ্য (stop ৮৭%, দ্রুত আবার ভরলে step ২% করে গভীরে), প্রতি রানে ১ ব্যাচ, ৮০% মেঝে। ৮০%-এ একটানে নামানোর চেষ্টা নেই।
-- ৪) অটো-ক্লিন OFF রাখা: অ্যাডমিন > অটো-ক্লিন > "অটো-ক্লিন চালু" টিক তুলে সেভ (আগে থেকেই আছে), অথবা SQL-এ জোর করে বন্ধ: select mc2_cleanup_stop_now();   আবার চালু: select mc2_cleanup_resume();   অবস্থা দেখা: select mc2_cleanup_status();
--    বন্ধ থাকলে tick-এর সব কাজ (ভিজিট/বিন/স্ক্রিনশট/ক্লিনআপ) থামে। ম্যানুয়াল মোছা ও চ্যাটের নিজস্ব মেয়াদ এই সুইচে বন্ধ হয় না।
-- ৫) mc2_bin_sweep: একবারে সর্বোচ্চ ২০০০ সারি। কোনো TRUNCATE নেই; সব ডিলিটে WHERE আছে।
-- ফাংশনগুলো ...19c / ...20b-র কপি, শুধু নির্দেশিত অংশ বদলানো।

create or replace function mc2_cleanup_lock() returns boolean language sql volatile security definer set search_path = public as $$
  select pg_try_advisory_xact_lock(hashtext('mc2_cleanup'))
$$;
revoke all on function mc2_cleanup_lock() from public, anon, authenticated;

-- mc2_cleanup_stage: ...20b-র কপি; শুধু 'cards' ধাপ বন্ধ
create or replace function mc2_cleanup_stage(p_stage text, p_lim int, p_c jsonb, out o_bytes bigint, out o_n int) language plpgsql security definer set search_path = public as $$
declare t record; bb bigint; nn int; paths text[]; ca int := coalesce((p_c ->> 'card_min_days')::int, 0);
begin
  o_bytes := 0; o_n := 0;
  perform set_config('mc2.nobin', 'on', true);
  if p_stage = 'bin' and coalesce((p_c ->> 'bin_days')::int, 0) <= 0 then null;  -- বিন OFF (০ দিন): চাপেও বিন খালি হবে না
  elsif p_stage = 'bin' then
    with d as (delete from mc2_bin where id in (select id from mc2_bin order by deleted_at limit p_lim) returning bytes) select coalesce(sum(bytes), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'chat' then
    with d as (delete from mc2_ac_messages where id in (select id from mc2_ac_messages order by id limit p_lim) returning file_path, pg_column_size(mc2_ac_messages.*) b)
      select coalesce(sum(b), 0), count(*), coalesce(array_agg(file_path) filter (where file_path is not null), '{}') into o_bytes, o_n, paths from d;
    if array_length(paths, 1) > 0 then
      begin perform set_config('storage.allow_delete_query', 'true', true); delete from storage.objects where bucket_id = 'mc2-chat' and name = any (paths); exception when others then null; end;
    end if;
  elsif p_stage = 'extra' then
    with d as (delete from mc2_cards where id in (select x.id from (select id, pinned, updated_at, row_number() over (partition by device order by updated_at desc) rn from mc2_cards) x where x.rn > 5 and not x.pinned order by x.updated_at limit p_lim) returning pg_column_size(mc2_cards.*) b)
      select coalesce(sum(b), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'low' then
    for t in select * from (values ('mc2_visits', 'created_at'), ('mc2_answers', 'created_at'), ('mc2_presence', 'last_seen')) v(tbl, col) loop
      execute format('with d as (delete from %I where ctid = any(array(select ctid from %I order by %I limit %s)) returning pg_column_size(%I.*) b) select coalesce(sum(b), 0), count(*) from d', t.tbl, t.tbl, t.col, p_lim, t.tbl) into bb, nn;
      o_bytes := o_bytes + bb; o_n := o_n + nn; exit when o_n > 0;
    end loop;
  elsif p_stage = 'cards' then null;   -- বন্ধ: কার্ড এখন শুধু 'extra' ধাপে (ডিভাইসে নতুন ৫টির বাইরেরগুলো, pinned বাদে) মোছে; টপ/pinned ও ডিভাইসের সর্বশেষ ৫টি কখনো নয়
  elsif p_stage = 'schat' then
    begin
      perform set_config('storage.allow_delete_query', 'true', true);
      with d as (delete from storage.objects where id in (select id from storage.objects where bucket_id = 'mc2-chat' order by created_at limit p_lim) returning coalesce((metadata ->> 'size')::bigint, 0) b) select coalesce(sum(b), 0), count(*) into o_bytes, o_n from d;
    exception when others then o_bytes := 0; o_n := 0; end;
  end if;
  perform set_config('mc2.nobin', '', true);
end $$;
revoke all on function mc2_cleanup_stage(text, int, jsonb) from public, anon, authenticated;

-- mc2_cleanup_run: ...19c-র কপি; শুধু লক-লাইন যোগ + 'cards' ধাপ বাদ (বাকি সব আগের মতো)
create or replace function mc2_cleanup_run(p_dry boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb := mc2_cleanup_cfg_get(); m text; lim bigint; used bigint; pct numeric; stp numeric; fl numeric := (c ->> 'floor_pct')::numeric; sp numeric := (c ->> 'start_pct')::numeric; s0 numeric := (c ->> 'stop_pct')::numeric;
  st record; goal bigint; stg text; r record; freed bigint; rem bigint; res jsonb := jsonb_build_object('dry', p_dry); lot int := greatest((c ->> 'batch')::int, 1);
begin
  if not coalesce((c ->> 'on')::boolean, true) then return jsonb_build_object('on', false); end if;
  if not p_dry and not mc2_cleanup_lock() then return jsonb_build_object('busy', true); end if;   -- অন্য ক্লিনআপ চলছে: এটা কিছু মুছবে না
  foreach m in array array['db', 'st'] loop
    if m = 'db' then used := pg_database_size(current_database()); lim := (c ->> 'db_mb')::bigint * 1048576;
    else select coalesce(sum((metadata ->> 'size')::bigint), 0) into used from storage.objects; lim := (c ->> 'storage_mb')::bigint * 1048576; end if;
    pct := round(used * 100.0 / lim, 1);
    res := res || jsonb_build_object(m || '_pct', pct);
    if m = 'db' then res := res || jsonb_build_object('pct', pct, 'size_mb', round(used / 1048576.0, 1), 'cards', (select count(*) from mc2_cards)); end if;
    insert into mc2_cleanup_state(k, stop) values (m, s0) on conflict (k) do nothing;
    select * into st from mc2_cleanup_state where k = m;
    if not st.active then
      if pct < sp then
        if not p_dry and st.ended is not null and st.ended < now() - interval '3 days' and st.stop <> s0 then update mc2_cleanup_state set stop = s0 where k = m; end if;
        continue;
      end if;
      stp := st.stop;
      if st.ended is not null and st.ended > now() - interval '24 hours' then stp := stp - (c ->> 'step_pct')::numeric; end if;
      stp := greatest(fl, least(stp, sp - 1));
      goal := least(((pct - stp) / 100.0 * lim)::bigint, (lim * 0.15)::bigint);
      res := res || jsonb_build_object(m || '_stop', stp, m || '_goal_mb', round(goal / 1048576.0, 1));
      if goal <= 0 or p_dry then continue; end if;
      update mc2_cleanup_state set stop = stp, active = true, remain = goal where k = m;
    else
      if p_dry then res := res || jsonb_build_object(m || '_active', true, m || '_remain_mb', round(st.remain / 1048576.0, 1)); continue; end if;
      if pct <= fl or (m = 'st' and pct <= st.stop) then update mc2_cleanup_state set active = false, ended = now() where k = m; continue; end if;
    end if;
    freed := 0;
    foreach stg in array (case when m = 'db' then array['bin', 'chat', 'extra', 'low']   /* 'cards' ধাপ আর নেই */ else array['schat', 'sshot'] end) loop
      select * into r from mc2_cleanup_stage(stg, case when stg = 'cards' then greatest((c ->> 'card_batch')::int, 1) else lot end, c);
      if r.o_n > 0 then
        freed := r.o_bytes;
        insert into mc2_cleanup_log(what, n, note) values (stg, r.o_n, m || ' ' || pct || '%');
        res := res || jsonb_build_object('stage_' || m, stg, 'n_' || m, r.o_n);
        exit;
      end if;
    end loop;
    select remain - freed into rem from mc2_cleanup_state where k = m;
    if freed = 0 or rem <= 0 then update mc2_cleanup_state set active = false, ended = now(), remain = 0 where k = m;
    else update mc2_cleanup_state set remain = rem where k = m; end if;
  end loop;
  return res;
end $$;
revoke all on function mc2_cleanup_run(boolean) from public, anon, authenticated;

create or replace function mc2_cleanup_tick() returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((mc2_cleanup_cfg_get() ->> 'on')::boolean, true) then return; end if;   -- জোর করে বন্ধ করা থাকলে কিছুই চলবে না
  if mc2_cleanup_lock() then
    if mc2_ac_rl('cleanup', 1, 600) then
      perform mc2_cleanup_visits(); perform mc2_bin_sweep(); perform mc2_shot_purge(); perform mc2_cleanup_run(false);
    end if;
  end if;
exception when others then null;
end $$;
revoke all on function mc2_cleanup_tick() from public, anon, authenticated;

create or replace function mc2_bin_sweep() returns int language plpgsql security definer set search_path = public as $$
declare d int := mc2_lim('bin_days'); n int := 0;
begin
  if not coalesce((mc2_cleanup_cfg_get() ->> 'on')::boolean, true) then return 0; end if;
  if d > 0 then
    delete from mc2_bin where id in (select b.id from mc2_bin b where b.deleted_at < now() - make_interval(days => d) order by b.deleted_at limit 2000);
    get diagnostics n = row_count;
  end if;
  return n;
end $$;
revoke all on function mc2_bin_sweep() from public, anon, authenticated;

-- জোর করে বন্ধ (SQL Editor থেকে): অটো-ক্লিন OFF + চলমান অবস্থা বাতিল + চলতে থাকা ক্লিনআপ কোয়েরি থামানোর চেষ্টা
create or replace function mc2_cleanup_stop_now() returns text language plpgsql security definer set search_path = public as $$
declare k int := 0;
begin
  insert into mc2_cleanup_cfg(id, cfg) values (1, jsonb_build_object('on', false))
    on conflict (id) do update set cfg = mc2_cleanup_cfg.cfg || jsonb_build_object('on', false);
  update mc2_cleanup_state set active = false, remain = 0, ended = now();
  begin
    select count(pg_cancel_backend(pid)) into k from pg_stat_activity
     where pid <> pg_backend_pid() and datname = current_database() and state = 'active' and query ilike '%mc2_cleanup_%';
  exception when others then k := -1;   -- অনুমতি না থাকলে: সুইচ OFF-ই যথেষ্ট, চলমান ব্যাচ নিজে শেষ হবে
  end;
  insert into mc2_cleanup_log(what, n, note) values ('stop_now', 0, 'manual force stop; cancelled=' || k);
  return 'বন্ধ করা হয়েছে (auto-clean OFF). cancelled=' || k;
end $$;

create or replace function mc2_cleanup_resume() returns text language plpgsql security definer set search_path = public as $$
begin
  insert into mc2_cleanup_cfg(id, cfg) values (1, jsonb_build_object('on', true))
    on conflict (id) do update set cfg = mc2_cleanup_cfg.cfg || jsonb_build_object('on', true);
  insert into mc2_cleanup_log(what, n, note) values ('resume', 0, 'manual resume');
  return 'চালু করা হয়েছে (auto-clean ON)';
end $$;

-- অবস্থা দেখা: চালু/বন্ধ, ডাটাবেজ আসল মাপ ও %, চলমান অবস্থা, শেষ ১০ লগ। কিছু বদলায় না।
create or replace function mc2_cleanup_status() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'on', coalesce((mc2_cleanup_cfg_get() ->> 'on')::boolean, true),
    'db_mb', round(pg_database_size(current_database()) / 1048576.0, 1),
    'db_pct', round(pg_database_size(current_database()) * 100.0 / ((mc2_cleanup_cfg_get() ->> 'db_mb')::numeric * 1048576), 1),
    'start_pct', mc2_cleanup_cfg_get() ->> 'start_pct', 'floor_pct', mc2_cleanup_cfg_get() ->> 'floor_pct',
    'state', coalesce((select jsonb_agg(to_jsonb(s)) from mc2_cleanup_state s), '[]'::jsonb),
    'last', coalesce((select jsonb_agg(to_jsonb(l)) from (select ts, what, n, note from mc2_cleanup_log order by id desc limit 10) l), '[]'::jsonb))
$$;
revoke all on function mc2_cleanup_stop_now(), mc2_cleanup_resume(), mc2_cleanup_status() from public, anon, authenticated;

-- নাম-চেক: সব সারিতে ok = true এলে ঠিক
select 'mc2_cleanup_lock' as item, exists (select 1 from pg_proc where proname = 'mc2_cleanup_lock') as ok
union all select 'mc2_cleanup_run-এ লক', (select prosrc like '%mc2_cleanup_lock%' from pg_proc where proname = 'mc2_cleanup_run' limit 1)
union all select 'mc2_cleanup_run-এ cards ধাপ নেই', (select prosrc not like '%''low'', ''cards''%' from pg_proc where proname = 'mc2_cleanup_run' limit 1)
union all select 'mc2_cleanup_stage-এ cards বন্ধ', (select prosrc like '%p_stage = ''cards'' then null%' from pg_proc where proname = 'mc2_cleanup_stage' limit 1)
union all select 'mc2_cleanup_tick-এ লক ও সুইচ', (select prosrc like '%mc2_cleanup_lock%' and prosrc like '%''on''%' from pg_proc where proname = 'mc2_cleanup_tick' limit 1)
union all select 'mc2_bin_sweep-এ সীমা ২০০০', (select prosrc like '%limit 2000%' from pg_proc where proname = 'mc2_bin_sweep' limit 1)
union all select 'বন্ধ/চালু/অবস্থা ফাংশন', (select count(*) = 3 from pg_proc where proname in ('mc2_cleanup_stop_now', 'mc2_cleanup_resume', 'mc2_cleanup_status'));


-- ==================== 36_supabase-new-20261022.sql ====================
-- supabase-new-20261022.sql — অটো-ক্লিন: কাটার ক্রম ২% → ৩% → ৫% (আবার ২…) + ২৪ ঘণ্টায় ৩ বার ৯০% ছুঁলে অ্যাডমিনকে সতর্কবার্তা (একবার Run; আবার চালালেও ক্ষতি নেই)
-- আগে ব্যাকআপ। ...19c, ...20b, ...21b আগে চালানো থাকতে হবে।
-- নিয়ম: ডেটাবেস (বা Storage) ৯০% ছুঁলে — ১ম বার সীমার ২% পরিমাণ পুরোনো ডেটা কেটে জায়গা খালি করে (≈ ৯০ → ৮৮%), ২য় বার ৩% (≈ ৮৭%), ৩য় বার ৫% (≈ ৮৫%), তারপর আবার ২, ৩, ৫… যতবার "আবার ভরে" ততবার এই ক্রমে।
--   জরুরি: Postgres-এ DELETE করলে ডেটাবেস ফাইলের সাইজ (Supabase যা মাপে) কমে না; খালি জায়গা নতুন ডেটায় ভরে, ফাইল তখন বাড়েনি। তাই ডেটাবেসে "আবার ভরেছে" ধরা হয় শুধু তখন, যখন ফাইল-সাইজ শেষ চক্র শেষ হওয়ার সাইজের চেয়ে ≈০.২% (≈১ MB) বাড়ে — মানে খালি করা জায়গা নতুন ডেটায় ফুরিয়েছে। নইলে প্রতি ১০ মিনিটে নতুন চক্র শুরু হয়ে ২,৩,৫ ক্রম দ্রুত এগোত ও ভুয়া সতর্কতা যেত।
--   Storage-এ ফাইল মুছলে সাইজ সত্যিই কমে, তাই সেখানে সরাসরি % দেখে চলে। ৮০% মেঝে, প্রতি চক্রে সর্বোচ্চ ১৫%, advisory lock ও বন্ধ-সুইচ (on) আগের মতোই। ৩ দিন কাটা না লাগলে ক্রম আবার ২% থেকে।
--   cut1/cut2/cut3 (ডিফল্ট ২/৩/৫) অ্যাডমিন > 🧹 অটো-ক্লিনে বদলানো যাবে। পুরোনো stop_pct/step_pct এখন কাটার হিসাবে ব্যবহার হয় না।
-- সতর্কবার্তা: alert_hr (ডিফল্ট ২৪) ঘণ্টায় alert_n (ডিফল্ট ৩) বার চক্র শুরু হলে → (১) অ্যাডমিনে লাল ব্যানার ও তালিকা (সবসময়), (২) নিচের notify_url দিলে ফোনে/মেইলে বার্তা (pg_net দিয়ে; একটা বিনামূল্যের ntfy.sh লিংক বা Slack/Discord webhook)।
--   সতর্কবার্তা ২৪ ঘণ্টায় একবারের বেশি যায় না। ডেটাবেস থেকে সত্যিকারের স্ক্রিনশট পাঠানো যায় না; বার্তায় সব সংখ্যা (%, MB, কার্ড, সময়) থাকে, আর অ্যাডমিনে ব্যানারটা স্ক্রিনশট নেওয়ার মতো।
-- কোনো TRUNCATE নেই; সব ডিলিটে WHERE আছে।

do $$ begin create extension if not exists pg_net with schema extensions; exception when others then raise notice 'pg_net চালু করা যায়নি — অ্যাডমিনের ব্যানার কাজ করবে, বাইরে বার্তা যাবে না'; end $$;

alter table mc2_cleanup_state add column if not exists seq int not null default 0;
alter table mc2_cleanup_state add column if not exists last_start timestamptz;
alter table mc2_cleanup_state add column if not exists base bigint;   -- ডেটাবেস: শেষ চক্র শেষ হওয়ার সময়ের ফাইল-সাইজ (আবার "ভরেছে" ধরার ভিত্তি)

create table if not exists mc2_cleanup_starts (id bigserial primary key, k text not null, at timestamptz not null default now(), pct numeric, cut numeric);
create index if not exists mc2_cleanup_starts_k_at on mc2_cleanup_starts (k, at);
create table if not exists mc2_cleanup_alerts (id bigserial primary key, at timestamptz not null default now(), k text not null, msg text not null, sent text, seen boolean not null default false);
alter table mc2_cleanup_starts enable row level security;
alter table mc2_cleanup_alerts enable row level security;

create or replace function mc2_cleanup_defaults() returns jsonb language sql immutable as $$
  select jsonb_build_object('on', true, 'others_on', true, 'db_mb', 500, 'start_pct', 90, 'card_pct', 90, 'card_max', 1000000, 'batch', 200, 'card_batch', 50,
    'min_age_days', 7, 'card_min_days', 0, 'visits_days', 0, 'visits_max', 3000, 'bin_days', 30, 'answers_days', 0, 'presence_days', 60, 'cards_days', 0,
    'stop_pct', 87, 'floor_pct', 80, 'step_pct', 2, 'storage_mb', 1024, 'shot_ok_days', 7, 'shot_no_days', 0, 'ip_view_min', 600, 'ip_card_hr', 1500, 'ip_score_hr', 1500, 'ip_entry_hr', 300, 'score_dev_hr', 30, 'visit_dev_hr', 40, 'card_per_dev', 20, 'card_gap_sec', 2,
    'cut1', 2, 'cut2', 3, 'cut3', 5, 'alert_n', 3, 'alert_hr', 24, 'notify_url', '', 'notify_email', '')
$$;

create or replace function mc2_cleanup_admin_set(p_cfg jsonb) returns void language plpgsql security definer set search_path = public as $$
declare k text; v numeric; lo numeric; hi numeric;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if p_cfg is null or jsonb_typeof(p_cfg) <> 'object' then raise exception 'bad cfg'; end if;
  for k in select jsonb_object_keys(p_cfg) loop
    if k in ('notify_url', 'notify_email') then
      if jsonb_typeof(p_cfg -> k) <> 'string' then raise exception '% must be text', k; end if;
      if k = 'notify_url' and (p_cfg ->> k) <> '' and (p_cfg ->> k) !~ '^https://[^[:space:]]{4,380}$' then raise exception 'notify_url must be an https link'; end if;
      if k = 'notify_email' and (p_cfg ->> k) <> '' and ((p_cfg ->> k) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(p_cfg ->> k) > 120) then raise exception 'notify_email looks wrong'; end if;
    elsif k in ('on', 'others_on') then
      if jsonb_typeof(p_cfg -> k) <> 'boolean' then raise exception '% must be true/false', k; end if;
    else
      if k not in ('db_mb', 'start_pct', 'card_pct', 'card_max', 'batch', 'card_batch', 'min_age_days', 'card_min_days', 'visits_days', 'answers_days', 'presence_days', 'cards_days',
                   'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev', 'card_gap_sec', 'visits_max', 'bin_days', 'stop_pct', 'floor_pct', 'step_pct', 'storage_mb', 'shot_ok_days', 'shot_no_days', 'cut1', 'cut2', 'cut3', 'alert_n', 'alert_hr') then raise exception 'unknown key %', k; end if;
      if jsonb_typeof(p_cfg -> k) <> 'number' then raise exception '% must be a number', k; end if;
      v := (p_cfg ->> k)::numeric;
      lo := case when k in ('db_mb', 'batch', 'card_batch', 'min_age_days', 'card_max', 'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev', 'visits_max', 'step_pct', 'storage_mb', 'cut1', 'cut2', 'cut3', 'alert_n', 'alert_hr') then 1 when k in ('start_pct', 'card_pct', 'stop_pct', 'floor_pct') then 10 else 0 end;
      hi := case when k = 'db_mb' then 100000 when k in ('start_pct', 'card_pct', 'stop_pct', 'floor_pct') then 99 when k = 'step_pct' then 20 when k in ('cut1', 'cut2', 'cut3') then 20 when k = 'alert_n' then 50 when k = 'alert_hr' then 168 when k = 'storage_mb' then 100000 when k = 'batch' then 5000 when k = 'card_batch' then 1000 when k = 'card_max' then 1000000
                 when k in ('ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr') then 1000000 when k in ('score_dev_hr', 'visit_dev_hr') then 100000 when k = 'card_per_dev' then 1000 when k = 'visits_max' then 1000000 when k = 'card_gap_sec' then 60 else 3650 end;
      if v < lo or v > hi or v <> trunc(v) then raise exception '% must be a whole number % to %', k, lo, hi; end if;
    end if;
  end loop;
  insert into mc2_cleanup_cfg(id, cfg) values (1, p_cfg) on conflict (id) do update set cfg = excluded.cfg;
end $$;
revoke all on function mc2_cleanup_admin_set(jsonb) from public, anon;
grant execute on function mc2_cleanup_admin_set(jsonb) to authenticated;

create or replace function mc2_cleanup_run(p_dry boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb := mc2_cleanup_cfg_get(); m text; lim bigint; used bigint; pct numeric; stp numeric; fl numeric := (c ->> 'floor_pct')::numeric; sp numeric := (c ->> 'start_pct')::numeric; s0 numeric := (c ->> 'stop_pct')::numeric;
  st record; goal bigint; stg text; r record; freed bigint; rem bigint; res jsonb := jsonb_build_object('dry', p_dry); lot int := greatest((c ->> 'batch')::int, 1);
  cutv numeric; n24 int;
begin
  if not coalesce((c ->> 'on')::boolean, true) then return jsonb_build_object('on', false); end if;
  if not p_dry and not mc2_cleanup_lock() then return jsonb_build_object('busy', true); end if;   -- অন্য ক্লিনআপ চলছে: এটা কিছু মুছবে না
  foreach m in array array['db', 'st'] loop
    if m = 'db' then used := pg_database_size(current_database()); lim := (c ->> 'db_mb')::bigint * 1048576;
    else select coalesce(sum((metadata ->> 'size')::bigint), 0) into used from storage.objects; lim := (c ->> 'storage_mb')::bigint * 1048576; end if;
    pct := round(used * 100.0 / lim, 1);
    res := res || jsonb_build_object(m || '_pct', pct);
    if m = 'db' then res := res || jsonb_build_object('pct', pct, 'size_mb', round(used / 1048576.0, 1), 'cards', (select count(*) from mc2_cards)); end if;
    insert into mc2_cleanup_state(k, stop) values (m, s0) on conflict (k) do nothing;
    select * into st from mc2_cleanup_state where k = m;
    if not st.active then
      if pct < sp then
        if not p_dry then
          if m = 'db' and st.base is not null then update mc2_cleanup_state set base = null where k = m; end if;   -- সাইজ ৯০%-এর নিচে নেমেছে (যেমন VACUUM FULL-এর পর): নতুন করে শুরু
          if st.seq <> 0 and st.ended is not null and st.ended < now() - interval '3 days' then update mc2_cleanup_state set seq = 0 where k = m; end if;   -- ৩ দিন শান্ত থাকলে ক্রম আবার ২% থেকে
        end if;
        continue;
      end if;
      -- ডেটাবেস: DELETE-এ ফাইলের সাইজ কমে না, খালি জায়গা নতুন ডেটায় ভরে। তাই শেষ চক্র শেষ হওয়ার সাইজের চেয়ে ≈০.২% (≈১ MB) না বাড়া পর্যন্ত আবার "ভরেছে" ধরা হয় না (নইলে প্রতি ১০ মিনিটে নতুন চক্র শুরু হতো)।
      if m = 'db' and st.base is not null and used < st.base + (lim * 0.002)::bigint then res := res || jsonb_build_object('db_wait', true); continue; end if;
      -- কাটার ক্রম: ১ম বার cut1 (২%), ২য় বার cut2 (৩%), ৩য় বার cut3 (৫%), তারপর আবার ২,৩,৫… ; প্রতিবার সীমার cut% পরিমাণ পুরোনো ডেটা কেটে জায়গা খালি করে (≈ ৯০ → ৮৮ / ৮৭ / ৮৫); ৮০% মেঝের নিচে নয়
      cutv := coalesce(nullif(c ->> ('cut' || ((st.seq % 3) + 1)), '')::numeric, 2);
      stp := greatest(fl, sp - cutv);
      goal := least((cutv / 100.0 * lim)::bigint, greatest(((pct - fl) / 100.0 * lim)::bigint, 0), (lim * 0.15)::bigint);   -- কাটার পরিমাণ = cut% × সীমা; ৮০% মেঝের নিচে নয়
      res := res || jsonb_build_object(m || '_cut', cutv, m || '_stop', stp, m || '_goal_mb', round(goal / 1048576.0, 1));
      if goal <= 0 or p_dry then continue; end if;
      update mc2_cleanup_state set stop = stp, active = true, remain = goal, seq = seq + 1, last_start = now(), base = null where k = m;
      insert into mc2_cleanup_starts(k, pct, cut) values (m, pct, cutv);
      delete from mc2_cleanup_starts where at < now() - interval '14 days';
      select count(*) into n24 from mc2_cleanup_starts where k = m and at > now() - make_interval(hours => greatest((c ->> 'alert_hr')::int, 1));
      if n24 >= greatest((c ->> 'alert_n')::int, 1) and not exists (select 1 from mc2_cleanup_alerts a where a.k = m and a.at > now() - make_interval(hours => greatest((c ->> 'alert_hr')::int, 1))) then
        begin perform mc2_cleanup_notify(m, pct, n24, cutv, stp, used, c); exception when others then null; end;   -- বার্তা না গেলেও ক্লিনআপ থামবে না
      end if;
    else
      if p_dry then res := res || jsonb_build_object(m || '_active', true, m || '_remain_mb', round(st.remain / 1048576.0, 1)); continue; end if;
      if pct <= fl or (m = 'st' and pct <= st.stop) then update mc2_cleanup_state set active = false, ended = now(), base = case when m = 'db' then used else null end where k = m; continue; end if;
    end if;
    freed := 0;
    foreach stg in array (case when m = 'db' then array['bin', 'chat', 'extra', 'low']   /* 'cards' ধাপ আর নেই */ else array['schat', 'sshot'] end) loop
      select * into r from mc2_cleanup_stage(stg, case when stg = 'cards' then greatest((c ->> 'card_batch')::int, 1) else lot end, c);
      if r.o_n > 0 then
        freed := r.o_bytes;
        insert into mc2_cleanup_log(what, n, note) values (stg, r.o_n, m || ' ' || pct || '%');
        res := res || jsonb_build_object('stage_' || m, stg, 'n_' || m, r.o_n);
        exit;
      end if;
    end loop;
    select remain - freed into rem from mc2_cleanup_state where k = m;
    if freed = 0 or rem <= 0 then update mc2_cleanup_state set active = false, ended = now(), remain = 0, base = case when m = 'db' then used else null end where k = m;
    else update mc2_cleanup_state set remain = rem where k = m; end if;
  end loop;
  return res;
end $$;
revoke all on function mc2_cleanup_run(boolean) from public, anon, authenticated;


-- সতর্কবার্তা: অ্যাডমিন তালিকায় রেখে (সবসময়), notify_url থাকলে বাইরেও পাঠায়। ব্যর্থ হলেও ক্লিনআপ থামে না।
create or replace function mc2_cleanup_notify(p_k text, p_pct numeric, p_n int, p_cut numeric, p_target numeric, p_used bigint, c jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare msg text; url text := coalesce(c ->> 'notify_url', ''); em text := nullif(c ->> 'notify_email', ''); host text; topic text; snt text := 'শুধু অ্যাডমিনে (বাইরের লিংক দেওয়া নেই)'; aid bigint; nm text := case when p_k = 'st' then 'Storage' else 'ডেটাবেস' end;
begin
  if p_k = 'test' then
    msg := '✅ Friend Adda: পরীক্ষা বার্তা — অটো-ক্লিন সতর্কবার্তা ঠিকমতো পৌঁছাচ্ছে।' || E'\nসময়: ' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY-MM-DD HH24:MI');
  else
    msg := '⚠️ Friend Adda অটো-ক্লিন সতর্কতা' || E'\n' || nm || ' ' || p_n || ' বার ' || coalesce(c ->> 'alert_hr', '24') || ' ঘণ্টায় ' || coalesce(c ->> 'start_pct', '90') || '% ছুঁয়েছে।' ||
      E'\nএখন: ' || p_pct || '% (' || round(p_used / 1048576.0, 1) || ' MB)' ||
      E'\nএবারের কাটা: ' || p_cut || '% (লক্ষ্য ' || p_target || '%)' ||
      E'\nকার্ড: ' || (select count(*) from mc2_cards) ||
      E'\nসময়: ' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY-MM-DD HH24:MI') ||
      E'\nকরণীয়: অ্যাডমিন > 🧹 অটো-ক্লিন দেখুন। বারবার হলে Supabase প্ল্যান বাড়ান বা পুরোনো ডেটা হাতে মুছুন।';
  end if;
  insert into mc2_cleanup_alerts(k, msg, sent) values (p_k, msg, snt) returning id into aid;
  if url ~ '^https://' then
    begin
      if url ~* '^https://[^/]*ntfy[^/]*/[^/?#]+/?$' then
        host := substring(url from '^(https://[^/]+)'); topic := regexp_replace(substring(url from '^https://[^/]+/([^/?#]+)'), '/$', '');
        perform net.http_post(url := host, body := jsonb_build_object('topic', topic, 'title', 'Friend Adda auto-clean alert', 'message', msg, 'priority', 4, 'tags', jsonb_build_array('warning')) || case when em is not null then jsonb_build_object('email', em) else '{}'::jsonb end);
      else
        perform net.http_post(url := url, body := jsonb_build_object('text', msg, 'content', msg, 'message', msg));
      end if;
      snt := 'বাইরে পাঠানোর অনুরোধ দেওয়া হয়েছে';
    exception when others then snt := 'বাইরে পাঠানো যায়নি: ' || left(sqlerrm, 140);
    end;
    update mc2_cleanup_alerts set sent = snt where id = aid;
  end if;
end $$;
revoke all on function mc2_cleanup_notify(text, numeric, int, numeric, numeric, bigint, jsonb) from public, anon, authenticated;

create or replace function mc2_cleanup_alerts_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object('unseen', (select count(*) from mc2_cleanup_alerts where not seen and k <> 'test'),
    'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.id desc) from (select id, (extract(epoch from at) * 1000)::bigint ts, k, msg, sent, seen from mc2_cleanup_alerts order by id desc limit 10) x), '[]'::jsonb));
end $$;
revoke all on function mc2_cleanup_alerts_list() from public, anon;
grant execute on function mc2_cleanup_alerts_list() to authenticated;

create or replace function mc2_cleanup_alerts_seen() returns void language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  update mc2_cleanup_alerts set seen = true where not seen;
end $$;
revoke all on function mc2_cleanup_alerts_seen() from public, anon;
grant execute on function mc2_cleanup_alerts_seen() to authenticated;

create or replace function mc2_cleanup_test_notify() returns void language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  perform mc2_cleanup_notify('test', 0, 0, 0, 0, 0, mc2_cleanup_cfg_get());
end $$;
revoke all on function mc2_cleanup_test_notify() from public, anon;
grant execute on function mc2_cleanup_test_notify() to authenticated;

notify pgrst, 'reload schema';

-- নাম-চেক: সব সারিতে ok = true এলে ঠিক (pg_net সারিটা false হলে শুধু বাইরের বার্তা যাবে না)
select 'কাটার ক্রম cut1..3' as item, (mc2_cleanup_defaults() ->> 'cut3') = '5' as ok
union all select 'সতর্কবার্তা ফাংশন', exists (select 1 from pg_proc where proname = 'mc2_cleanup_notify')
union all select 'সতর্কবার্তা তালিকা (অ্যাডমিন)', exists (select 1 from pg_proc where proname = 'mc2_cleanup_alerts_list')
union all select 'ক্রম/সতর্কতা টেবিল', to_regclass('public.mc2_cleanup_alerts') is not null and to_regclass('public.mc2_cleanup_starts') is not null
union all select 'pg_net (বাইরে বার্তা)', exists (select 1 from pg_extension where extname = 'pg_net');


-- ==================== 37_supabase-new-20261023.sql ====================
-- supabase-new-20261023.sql — অটো-ক্লিন: প্রতিবার (প্রতি চক্রে) সর্বোচ্চ ১০% কাটা। শুধু এই ফাইলটাই নতুন; একবার Run করুন।
-- আগে ...20261022.sql চালানো থাকতে হবে। কোনো টেবিল/ডেটা মোছে না।
-- ১) সেটিংয়ে cut1/cut2/cut3 এখন সর্বোচ্চ ১০ (আগে ২০)। ২) চক্রপ্রতি কাটার ওপরের সীমা ১৫% → ১০%। ৩) আগে সেভ করা ১০-এর বেশি মান ১০ করে দেয়।

create or replace function mc2_cleanup_admin_set(p_cfg jsonb) returns void language plpgsql security definer set search_path = public as $$
declare k text; v numeric; lo numeric; hi numeric;
begin
  if not mc2_is_admin() then raise exception 'forbidden'; end if;
  if p_cfg is null or jsonb_typeof(p_cfg) <> 'object' then raise exception 'bad cfg'; end if;
  for k in select jsonb_object_keys(p_cfg) loop
    if k in ('notify_url', 'notify_email') then
      if jsonb_typeof(p_cfg -> k) <> 'string' then raise exception '% must be text', k; end if;
      if k = 'notify_url' and (p_cfg ->> k) <> '' and (p_cfg ->> k) !~ '^https://[^[:space:]]{4,380}$' then raise exception 'notify_url must be an https link'; end if;
      if k = 'notify_email' and (p_cfg ->> k) <> '' and ((p_cfg ->> k) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(p_cfg ->> k) > 120) then raise exception 'notify_email looks wrong'; end if;
    elsif k in ('on', 'others_on') then
      if jsonb_typeof(p_cfg -> k) <> 'boolean' then raise exception '% must be true/false', k; end if;
    else
      if k not in ('db_mb', 'start_pct', 'card_pct', 'card_max', 'batch', 'card_batch', 'min_age_days', 'card_min_days', 'visits_days', 'answers_days', 'presence_days', 'cards_days',
                   'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev', 'card_gap_sec', 'visits_max', 'bin_days', 'stop_pct', 'floor_pct', 'step_pct', 'storage_mb', 'shot_ok_days', 'shot_no_days', 'cut1', 'cut2', 'cut3', 'alert_n', 'alert_hr') then raise exception 'unknown key %', k; end if;
      if jsonb_typeof(p_cfg -> k) <> 'number' then raise exception '% must be a number', k; end if;
      v := (p_cfg ->> k)::numeric;
      lo := case when k in ('db_mb', 'batch', 'card_batch', 'min_age_days', 'card_max', 'ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr', 'score_dev_hr', 'visit_dev_hr', 'card_per_dev', 'visits_max', 'step_pct', 'storage_mb', 'cut1', 'cut2', 'cut3', 'alert_n', 'alert_hr') then 1 when k in ('start_pct', 'card_pct', 'stop_pct', 'floor_pct') then 10 else 0 end;
      hi := case when k = 'db_mb' then 100000 when k in ('start_pct', 'card_pct', 'stop_pct', 'floor_pct') then 99 when k = 'step_pct' then 20 when k in ('cut1', 'cut2', 'cut3') then 10 when k = 'alert_n' then 50 when k = 'alert_hr' then 168 when k = 'storage_mb' then 100000 when k = 'batch' then 5000 when k = 'card_batch' then 1000 when k = 'card_max' then 1000000
                 when k in ('ip_view_min', 'ip_card_hr', 'ip_score_hr', 'ip_entry_hr') then 1000000 when k in ('score_dev_hr', 'visit_dev_hr') then 100000 when k = 'card_per_dev' then 1000 when k = 'visits_max' then 1000000 when k = 'card_gap_sec' then 60 else 3650 end;
      if v < lo or v > hi or v <> trunc(v) then raise exception '% must be a whole number % to %', k, lo, hi; end if;
    end if;
  end loop;
  insert into mc2_cleanup_cfg(id, cfg) values (1, p_cfg) on conflict (id) do update set cfg = excluded.cfg;
end $$;
revoke all on function mc2_cleanup_admin_set(jsonb) from public, anon;
grant execute on function mc2_cleanup_admin_set(jsonb) to authenticated;

create or replace function mc2_cleanup_run(p_dry boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb := mc2_cleanup_cfg_get(); m text; lim bigint; used bigint; pct numeric; stp numeric; fl numeric := (c ->> 'floor_pct')::numeric; sp numeric := (c ->> 'start_pct')::numeric; s0 numeric := (c ->> 'stop_pct')::numeric;
  st record; goal bigint; stg text; r record; freed bigint; rem bigint; res jsonb := jsonb_build_object('dry', p_dry); lot int := greatest((c ->> 'batch')::int, 1);
  cutv numeric; n24 int;
begin
  if not coalesce((c ->> 'on')::boolean, true) then return jsonb_build_object('on', false); end if;
  if not p_dry and not mc2_cleanup_lock() then return jsonb_build_object('busy', true); end if;   -- অন্য ক্লিনআপ চলছে: এটা কিছু মুছবে না
  foreach m in array array['db', 'st'] loop
    if m = 'db' then used := pg_database_size(current_database()); lim := (c ->> 'db_mb')::bigint * 1048576;
    else select coalesce(sum((metadata ->> 'size')::bigint), 0) into used from storage.objects; lim := (c ->> 'storage_mb')::bigint * 1048576; end if;
    pct := round(used * 100.0 / lim, 1);
    res := res || jsonb_build_object(m || '_pct', pct);
    if m = 'db' then res := res || jsonb_build_object('pct', pct, 'size_mb', round(used / 1048576.0, 1), 'cards', (select count(*) from mc2_cards)); end if;
    insert into mc2_cleanup_state(k, stop) values (m, s0) on conflict (k) do nothing;
    select * into st from mc2_cleanup_state where k = m;
    if not st.active then
      if pct < sp then
        if not p_dry then
          if m = 'db' and st.base is not null then update mc2_cleanup_state set base = null where k = m; end if;   -- সাইজ ৯০%-এর নিচে নেমেছে (যেমন VACUUM FULL-এর পর): নতুন করে শুরু
          if st.seq <> 0 and st.ended is not null and st.ended < now() - interval '3 days' then update mc2_cleanup_state set seq = 0 where k = m; end if;   -- ৩ দিন শান্ত থাকলে ক্রম আবার ২% থেকে
        end if;
        continue;
      end if;
      -- ডেটাবেস: DELETE-এ ফাইলের সাইজ কমে না, খালি জায়গা নতুন ডেটায় ভরে। তাই শেষ চক্র শেষ হওয়ার সাইজের চেয়ে ≈০.২% (≈১ MB) না বাড়া পর্যন্ত আবার "ভরেছে" ধরা হয় না (নইলে প্রতি ১০ মিনিটে নতুন চক্র শুরু হতো)।
      if m = 'db' and st.base is not null and used < st.base + (lim * 0.002)::bigint then res := res || jsonb_build_object('db_wait', true); continue; end if;
      -- কাটার ক্রম: ১ম বার cut1 (২%), ২য় বার cut2 (৩%), ৩য় বার cut3 (৫%), তারপর আবার ২,৩,৫… ; প্রতিবার সীমার cut% পরিমাণ পুরোনো ডেটা কেটে জায়গা খালি করে (≈ ৯০ → ৮৮ / ৮৭ / ৮৫); ৮০% মেঝের নিচে নয়
      cutv := coalesce(nullif(c ->> ('cut' || ((st.seq % 3) + 1)), '')::numeric, 2);
      stp := greatest(fl, sp - cutv);
      goal := least((cutv / 100.0 * lim)::bigint, greatest(((pct - fl) / 100.0 * lim)::bigint, 0), (lim * 0.10)::bigint);   -- কাটার পরিমাণ = cut% × সীমা; ৮০% মেঝের নিচে নয়
      res := res || jsonb_build_object(m || '_cut', cutv, m || '_stop', stp, m || '_goal_mb', round(goal / 1048576.0, 1));
      if goal <= 0 or p_dry then continue; end if;
      update mc2_cleanup_state set stop = stp, active = true, remain = goal, seq = seq + 1, last_start = now(), base = null where k = m;
      insert into mc2_cleanup_starts(k, pct, cut) values (m, pct, cutv);
      delete from mc2_cleanup_starts where at < now() - interval '14 days';
      select count(*) into n24 from mc2_cleanup_starts where k = m and at > now() - make_interval(hours => greatest((c ->> 'alert_hr')::int, 1));
      if n24 >= greatest((c ->> 'alert_n')::int, 1) and not exists (select 1 from mc2_cleanup_alerts a where a.k = m and a.at > now() - make_interval(hours => greatest((c ->> 'alert_hr')::int, 1))) then
        begin perform mc2_cleanup_notify(m, pct, n24, cutv, stp, used, c); exception when others then null; end;   -- বার্তা না গেলেও ক্লিনআপ থামবে না
      end if;
    else
      if p_dry then res := res || jsonb_build_object(m || '_active', true, m || '_remain_mb', round(st.remain / 1048576.0, 1)); continue; end if;
      if pct <= fl or (m = 'st' and pct <= st.stop) then update mc2_cleanup_state set active = false, ended = now(), base = case when m = 'db' then used else null end where k = m; continue; end if;
    end if;
    freed := 0;
    foreach stg in array (case when m = 'db' then array['bin', 'chat', 'extra', 'low']   /* 'cards' ধাপ আর নেই */ else array['schat', 'sshot'] end) loop
      select * into r from mc2_cleanup_stage(stg, case when stg = 'cards' then greatest((c ->> 'card_batch')::int, 1) else lot end, c);
      if r.o_n > 0 then
        freed := r.o_bytes;
        insert into mc2_cleanup_log(what, n, note) values (stg, r.o_n, m || ' ' || pct || '%');
        res := res || jsonb_build_object('stage_' || m, stg, 'n_' || m, r.o_n);
        exit;
      end if;
    end loop;
    select remain - freed into rem from mc2_cleanup_state where k = m;
    if freed = 0 or rem <= 0 then update mc2_cleanup_state set active = false, ended = now(), remain = 0, base = case when m = 'db' then used else null end where k = m;
    else update mc2_cleanup_state set remain = rem where k = m; end if;
  end loop;
  return res;
end $$;
revoke all on function mc2_cleanup_run(boolean) from public, anon, authenticated;


update mc2_cleanup_cfg set cfg = cfg
  || case when (cfg ->> 'cut1') ~ '^[0-9]+$' and (cfg ->> 'cut1')::numeric > 10 then jsonb_build_object('cut1', 10) else '{}'::jsonb end
  || case when (cfg ->> 'cut2') ~ '^[0-9]+$' and (cfg ->> 'cut2')::numeric > 10 then jsonb_build_object('cut2', 10) else '{}'::jsonb end
  || case when (cfg ->> 'cut3') ~ '^[0-9]+$' and (cfg ->> 'cut3')::numeric > 10 then jsonb_build_object('cut3', 10) else '{}'::jsonb end
 where id = 1;

-- নাম-চেক: ok = true এলে ঠিক
select 'ক্লিনআপ সীমা ১০%' as item, position('0.10' in pg_get_functiondef('mc2_cleanup_run(boolean)'::regprocedure)) > 0 as ok;

