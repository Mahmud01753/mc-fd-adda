-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালানোর দরকার নেই
-- কাজ: ⏱ লিমিট মেনু, স্টোরেজ অটো-ক্লিন, ডিফল্ট খারাপ শব্দ (২০+২০)।
-- ############################################################################
-- RUN-NOW.sql — Supabase → SQL Editor-এ এই পুরো ফাইল একবার Run করুন। আবার চালালেও ক্ষতি নেই।
-- কোনো টেবিল/ডাটা মোছে না। এতে ৫টা অংশ আছে:
--   (১) ⏱ লিমিট মেনু (আগের PENDING-LIMITS.sql — ডিফল্টে সব বন্ধ, কিছু বদলায় না)
--   (২) 🗄 স্টোরেজ অটো-ক্লিন: ৫০% হলে প্রতিবার ~৫০ MB পুরোনো চ্যাট-ফাইল মোছে; ৯০% হলে ৫০%-এ নামায়। শুধু ফাইল — চ্যাটের বার্তা নয়
--   (৩) পুরোনো অটো-ক্লিন যেন চ্যাটের বার্তা/ফাইল না মোছে (শুধু আপনার দেওয়া সময়ে মুছবে)
--   (৪) ডিফল্ট খারাপ শব্দ: ২০টি বাংলা + ২০টি ইংরেজি (আগে থাকলে আবার বসে না)
--   (৫) API স্কিমা রিফ্রেশ
-- আগে চালানো থাকতে হবে: SQL-1, 2, 3 (সবই আপনার নোট অনুযায়ী চালানো)।
-- শেষে "চেক" সিলেক্টে সব সারিতে ok = true আসতে হবে।
-- ############################################################################

-- (১) ====================================================================
-- ========== ১) টেবিল ==========
create table if not exists fa_settings (key text primary key, val jsonb not null default 'false'::jsonb, updated_at timestamptz not null default now());
alter table fa_settings enable row level security;

create table if not exists fa_ip_rules (
  addr text primary key check (char_length(addr) between 3 and 64),
  per_min int check (per_min is null or per_min between 0 and 100000),
  per_hr int check (per_hr is null or per_hr between 0 and 1000000),
  blocked boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);
alter table fa_ip_rules enable row level security;
revoke all on fa_ip_rules from anon, authenticated;

create table if not exists fa_lim_hits (
  day date not null default current_date,
  kind text not null,
  n int not null default 0,
  primary key (day, kind)
);
alter table fa_lim_hits enable row level security;
revoke all on fa_lim_hits from anon, authenticated;

-- ========== ২) ভেতরের সাহায্যকারী ফাংশন (ক্লায়েন্ট ডাকতে পারে না) ==========
-- কনফিগ পড়া: ডিফল্ট {"on": false} = আনলিমিটেড
create or replace function fa_lim_cfg() returns jsonb language sql stable security definer set search_path = public as $$
  select case when jsonb_typeof(v) = 'object' then v else '{}'::jsonb end
  from (select coalesce((select val from fa_settings where key = 'limits'), '{}'::jsonb) as v) x
$$;
revoke all on function fa_lim_cfg() from public, anon, authenticated;

-- কনফিগের একটা সংখ্যা (না থাকলে ডিফল্ট)
create or replace function fa_lim_n(c jsonb, k text, d int) returns int language sql immutable as $$
  select coalesce(case when (c ->> k) ~ '^[0-9]{1,7}$' then (c ->> k)::int end, d)
$$;
revoke all on function fa_lim_n(jsonb, text, int) from public, anon, authenticated;

-- আটকানোর হিসাব (দিন + ধরন)
create or replace function fa_lim_hit(p_kind text) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into fa_lim_hits(day, kind, n) values (current_date, left(coalesce(p_kind, 'x'), 20), 1)
  on conflict (day, kind) do update set n = fa_lim_hits.n + 1;
  if random() < 0.01 then delete from fa_lim_hits where day < current_date - 30; end if;
end $$;
revoke all on function fa_lim_hit(text) from public, anon, authenticated;

-- ========== ৩) mc2_ac_send — আগের সব যাচাই একই; লিমিটগুলো এখন কনফিগ/IP-নিয়ম থেকে ==========
-- রিটার্ন কোড আগের মতো: >0 সফল (বার্তার id), 0 চ্যাট বন্ধ, -1 লেখা ঠিক নয়, -2 ফাইল বন্ধ, -3 পাঠানো নিষেধ (ব্যান / IP ব্লক), -4 খুব দ্রুত, -5 ফাইল অনুমোদিত নয়, -6 পাসওয়ার্ড বদলেছে
create or replace function mc2_ac_send(p_session int, p_nick text, p_body text, p_voter text, p_reply bigint default null, p_kind text default 'text', p_path text default null, p_fname text default null, p_size bigint default null, p_mime text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare q record; o record; ru record; ft jsonb; ext text; kd text := 'text'; fn text; fsz bigint; fmt text; r bigint; rid bigint; rn text; rt text;
  b text := mc2_ac_clean(p_body, 400); nk text := mc2_ac_clean(p_nick, 30); v text := coalesce(p_voter, ''); ip text := mc2_ip();
  cfg jsonb := fa_lim_cfg(); lon boolean := coalesce((cfg ->> 'on') = 'true', false);
  l_gap int; l_dup int; l_dev int; l_ipm int; l_iph int; l_fm int; l_fh int;
begin
  if v !~ '^[A-Za-z0-9_-]{8,80}$' then return -1; end if;
  select s.id, s.dept_id into q from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.id = p_session and s.active and d.active;
  if not found then return 0; end if;
  if not mc2_ac_can(p_session, v) then return -6; end if;   -- পাসওয়ার্ড দেওয়া চ্যাটে ঢোকেনি
  if mc2_ac_block(v) is not null then return -3; end if;

  -- লিমিটের মান: সুইচ বন্ধ থাকলে সবই ০ (= সীমা নেই), অর্থাৎ আগের মতো আনলিমিটেড
  if lon then
    l_gap := fa_lim_n(cfg, 'gap_sec', 2);  l_dup := fa_lim_n(cfg, 'dup_sec', 20); l_dev := fa_lim_n(cfg, 'dev_min', 20);
    l_ipm := fa_lim_n(cfg, 'ip_min', 60);  l_iph := fa_lim_n(cfg, 'ip_hr', 0);
    l_fm := fa_lim_n(cfg, 'file_min', 5);  l_fh := fa_lim_n(cfg, 'file_hr', 30);
  else
    l_gap := 0; l_dup := 0; l_dev := 0; l_ipm := 0; l_iph := 0; l_fm := 0; l_fh := 0;
  end if;

  -- IP-ভিত্তিক আলাদা নিয়ম (সুইচ বন্ধ থাকলেও কাজ করে; নিয়ম না থাকলে কিছুই বদলায় না)
  if ip is not null then
    select * into ru from fa_ip_rules x where x.addr = ip;
    if found then
      if ru.blocked then perform fa_lim_hit('ip_block'); return -3; end if;
      if ru.per_min is not null then l_ipm := ru.per_min; end if;   -- ০ = এই IP আনলিমিটেড
      if ru.per_hr is not null then l_iph := ru.per_hr; end if;
    end if;
  end if;

  perform mc2_ac_tick();
  if nk = '' then nk := 'বেনামি'; end if;
  if p_path is null then
    -- টেক্সট বার্তা
    if b = '' then return -1; end if;
    if (select count(*) from regexp_matches(b, '(https?://|www\.)', 'gi')) > 3 then return -1; end if;
    if l_dup > 0 and exists (select 1 from mc2_ac_messages where voter = v and kind = 'text' and body = b and created_at > now() - make_interval(secs => l_dup)) then
      perform fa_lim_hit('dup'); return -4;
    end if;
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
    if l_fm > 0 and not mc2_ac_rl('file:v:' || v || ':60', l_fm, 60) then perform fa_lim_hit('file'); return -4; end if;
    if l_fh > 0 and not mc2_ac_rl('file:v:' || v || ':3600', l_fh, 3600) then perform fa_lim_hit('file'); return -4; end if;
  end if;

  -- দুই বার্তার মাঝের বিরতি / ডিভাইসের মিনিট-সীমা / IP-র মিনিট ও ঘণ্টার সীমা
  if l_gap > 0 and exists (select 1 from mc2_ac_messages where voter = v and created_at > now() - make_interval(secs => l_gap)) then perform fa_lim_hit('gap'); return -4; end if;
  if l_dev > 0 and not mc2_ac_rl('send:v:' || v || ':60', l_dev, 60) then perform fa_lim_hit('dev'); return -4; end if;
  if ip is not null and l_ipm > 0 and not mc2_ac_rl('send:ip:' || ip || ':60', l_ipm, 60) then perform fa_lim_hit('ip'); return -4; end if;
  if ip is not null and l_iph > 0 and not mc2_ac_rl('send:ip:' || ip || ':3600', l_iph, 3600) then perform fa_lim_hit('ip'); return -4; end if;

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

-- ========== ৪) অ্যাডমিন হ্যান্ডলার (শুধু লগইন করা অ্যাডমিন) ==========
-- বর্তমান অবস্থা: সুইচ, সব মান (ডিফল্ট সহ), IP-নিয়ম, শেষ ৭ দিনের আটকানোর হিসাব
create or replace function fa_lim_get() returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  c := fa_lim_cfg();
  return jsonb_build_object(
    'on', coalesce((c ->> 'on') = 'true', false),
    'cfg', jsonb_build_object('gap_sec', fa_lim_n(c, 'gap_sec', 2), 'dup_sec', fa_lim_n(c, 'dup_sec', 20), 'dev_min', fa_lim_n(c, 'dev_min', 20),
      'ip_min', fa_lim_n(c, 'ip_min', 60), 'ip_hr', fa_lim_n(c, 'ip_hr', 0), 'file_min', fa_lim_n(c, 'file_min', 5), 'file_hr', fa_lim_n(c, 'file_hr', 30)),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('addr', addr, 'per_min', per_min, 'per_hr', per_hr, 'blocked', blocked, 'note', note, 'at', created_at) order by created_at desc) from fa_ip_rules), '[]'::jsonb),
    'hits', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'n', n) order by day desc, kind) from fa_lim_hits where day >= current_date - 6), '[]'::jsonb)
  );
end $$;
revoke all on function fa_lim_get() from public, anon;
grant execute on function fa_lim_get() to authenticated;

-- সেভ: p = {"on":true/false, "gap_sec":2, "dup_sec":20, "dev_min":20, "ip_min":60, "ip_hr":0, "file_min":5, "file_hr":30}  (০ = ওই সীমা নেই)
create or replace function fa_lim_set(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare k text; n jsonb := '{}'::jsonb; old jsonb;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  old := fa_lim_cfg();
  n := jsonb_build_object('on', coalesce((p ->> 'on') = 'true', false));
  foreach k in array array['gap_sec', 'dup_sec', 'dev_min', 'ip_min', 'ip_hr', 'file_min', 'file_hr'] loop
    if (p ->> k) ~ '^[0-9]{1,6}$' then n := n || jsonb_build_object(k, (p ->> k)::int);
    elsif old ? k then n := n || jsonb_build_object(k, old -> k); end if;
  end loop;
  insert into fa_settings (key, val) values ('limits', n)
  on conflict (key) do update set val = excluded.val, updated_at = now();
  return n;
end $$;
revoke all on function fa_lim_set(jsonb) from public, anon;
grant execute on function fa_lim_set(jsonb) to authenticated;

-- IP-নিয়ম যোগ/বদল: per_min/per_hr ফাঁকা (null) = সাধারণ লিমিট; ০ = ওই IP আনলিমিটেড; blocked = ওই IP থেকে পাঠানো বন্ধ
create or replace function fa_lim_rule_set(p_ip text, p_per_min int, p_per_hr int, p_blocked boolean, p_note text) returns boolean language plpgsql security definer set search_path = public as $$
declare a text := left(btrim(coalesce(p_ip, '')), 64);
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if char_length(a) < 3 or a ~ '[[:space:],]' then raise exception 'IP ঠিক নয়'; end if;
  insert into fa_ip_rules(addr, per_min, per_hr, blocked, note)
  values (a, p_per_min, p_per_hr, coalesce(p_blocked, false), nullif(left(btrim(coalesce(p_note, '')), 120), ''))
  on conflict (addr) do update set per_min = excluded.per_min, per_hr = excluded.per_hr, blocked = excluded.blocked, note = excluded.note;
  return true;
end $$;
revoke all on function fa_lim_rule_set(text, int, int, boolean, text) from public, anon;
grant execute on function fa_lim_rule_set(text, int, int, boolean, text) to authenticated;

create or replace function fa_lim_rule_del(p_ip text) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  delete from fa_ip_rules where addr = p_ip;
  return true;
end $$;
revoke all on function fa_lim_rule_del(text) from public, anon;
grant execute on function fa_lim_rule_del(text) to authenticated;

-- কোন IP থেকে সাম্প্রতিক কত বার্তা, কয়টা ডিভাইস (p_mins মিনিট; সর্বোচ্চ ৭ দিন)
create or replace function fa_lim_ips(p_mins int default 60) returns jsonb language plpgsql security definer set search_path = public as $$
declare m int := greatest(1, least(coalesce(p_mins, 60), 10080));
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('ip', t.ip, 'msgs', t.msgs, 'devs', t.devs, 'last', t.last_at, 'rule', exists (select 1 from fa_ip_rules x where x.addr = t.ip)) order by t.msgs desc)
    from (select mm.ip as ip, count(*) as msgs, count(distinct mm.voter) as devs, max(mm.created_at) as last_at
          from mc2_ac_messages mm where mm.ip is not null and mm.created_at > now() - make_interval(mins => m)
          group by mm.ip order by count(*) desc limit 50) t
  ), '[]'::jsonb);
end $$;
revoke all on function fa_lim_ips(int) from public, anon;
grant execute on function fa_lim_ips(int) to authenticated;

-- ========== শেষ ==========


-- (২) ====================================================================
-- 🗄 স্টোরেজ অটো-ক্লিন। সেটিং: অ্যাডমিন → 🗄 স্টোরেজ। ডিফল্ট: সীমা ১০২৪ MB, ৫০% ছুঁলে প্রতিবার ৫০ MB, ৯০% ছুঁলে ৫০%-এ নামানো।
-- শুধু mc2-chat বাকেটের চ্যাট-ফাইল (সবচেয়ে পুরোনো আগে; শেষ ২০ মিনিটের নতুন ফাইল বাদ)। যে বার্তার ফাইল মোছা হয় সেটা "ফাইলের মেয়াদ শেষ" দেখায়।
create table if not exists fa_stor_log (
  id bigserial primary key, at timestamptz not null default now(),
  pct_before numeric, pct_after numeric, files int not null default 0, freed_mb numeric not null default 0, note text
);
alter table fa_stor_log enable row level security;
revoke all on fa_stor_log from anon, authenticated;

-- সেটিং পড়া (সেভ করা মান ডিফল্টের ওপর বসে)
create or replace function fa_stor_cfg() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('on', true, 'quota_mb', 1024, 'start_pct', 50, 'chunk_mb', 50, 'hard_pct', 90, 'target_pct', 50, 'min_age_min', 20)
         || case when jsonb_typeof(v) = 'object' then v else '{}'::jsonb end
  from (select coalesce((select val from fa_settings where key = 'stor'), '{}'::jsonb) as v) x
$$;
revoke all on function fa_stor_cfg() from public, anon, authenticated;

-- মূল কাজ। p_force = সময়ের বিরতি না মেনে চালাও (অ্যাডমিনের বাটন); p_dry = শুধু হিসাব, কিছু মুছবে না।
create or replace function fa_stor_sweep(p_force boolean default false, p_dry boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c jsonb := fa_stor_cfg(); v_quota bigint; v_used bigint; v_pct numeric; v_need bigint := 0; v_mode text := 'none';
  v_paths text[]; v_n int := 0; v_freed bigint := 0; v_after numeric; v_age int;
begin
  if not coalesce((c ->> 'on')::boolean, false) then return jsonb_build_object('on', false); end if;
  if not p_force and not mc2_ac_rl('fa_stor', 1, 60) then return jsonb_build_object('wait', true); end if;
  if not p_dry and not pg_try_advisory_xact_lock(hashtext('fa_stor')) then return jsonb_build_object('busy', true); end if;

  v_quota := greatest((c ->> 'quota_mb')::bigint, 1) * 1048576;
  v_age := greatest(coalesce((c ->> 'min_age_min')::int, 20), 1);
  select coalesce(sum((metadata ->> 'size')::bigint), 0) into v_used from storage.objects;
  v_pct := round(v_used * 100.0 / v_quota, 1);

  if v_pct >= (c ->> 'hard_pct')::numeric then
    v_mode := 'hard'; v_need := v_used - (v_quota * (c ->> 'target_pct')::numeric / 100)::bigint;
  elsif v_pct >= (c ->> 'start_pct')::numeric then
    v_mode := 'chunk'; v_need := (c ->> 'chunk_mb')::bigint * 1048576;
  end if;
  if v_need <= 0 then return jsonb_build_object('mode', 'none', 'pct', v_pct, 'used_mb', round(v_used / 1048576.0, 1)); end if;

  -- সবচেয়ে পুরোনো চ্যাট-ফাইল থেকে শুরু করে প্রয়োজনীয় পরিমাণ পর্যন্ত
  select coalesce(array_agg(t.nm), '{}'), count(*), coalesce(sum(t.sz), 0) into v_paths, v_n, v_freed
  from (select o.name as nm, coalesce((o.metadata ->> 'size')::bigint, 0) as sz,
               sum(coalesce((o.metadata ->> 'size')::bigint, 0)) over (order by o.created_at, o.id) as cum
        from storage.objects o
        where o.bucket_id = 'mc2-chat' and o.name !~ 'emptyFolderPlaceholder$' and coalesce((o.metadata ->> 'size')::bigint, 0) > 0
          and o.created_at < now() - make_interval(mins => v_age)) t
  where t.cum - t.sz < v_need;

  if v_n = 0 or p_dry then
    return jsonb_build_object('mode', v_mode, 'dry', p_dry, 'pct', v_pct, 'files', v_n, 'freed_mb', round(v_freed / 1048576.0, 1), 'used_mb', round(v_used / 1048576.0, 1));
  end if;

  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects where bucket_id = 'mc2-chat' and name = any (v_paths);
    get diagnostics v_n = row_count;
  exception when others then
    insert into fa_stor_log(pct_before, pct_after, files, freed_mb, note) values (v_pct, v_pct, 0, 0, left('ত্রুটি: ' || sqlerrm, 200));
    return jsonb_build_object('error', sqlerrm);
  end;
  update mc2_ac_messages set file_path = null, file_expired = true where file_path = any (v_paths);

  v_after := round(greatest(v_used - v_freed, 0) * 100.0 / v_quota, 1);
  insert into fa_stor_log(pct_before, pct_after, files, freed_mb, note)
  values (v_pct, v_after, v_n, round(v_freed / 1048576.0, 1), case when v_mode = 'hard' then 'জরুরি: নামিয়ে আনা' else 'নিয়মিত কাটা' end);
  if random() < 0.05 then delete from fa_stor_log where id < (select max(id) from fa_stor_log) - 200; end if;
  return jsonb_build_object('mode', v_mode, 'pct', v_pct, 'after_pct', v_after, 'files', v_n, 'freed_mb', round(v_freed / 1048576.0, 1));
end $$;
revoke all on function fa_stor_sweep(boolean, boolean) from public, anon, authenticated;

-- অ্যাডমিন: অবস্থা
create or replace function fa_stor_get() returns jsonb language plpgsql security definer set search_path = public as $$
declare v_used bigint; v_chat bigint; v_files int; v_q numeric;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  v_q := (fa_stor_cfg() ->> 'quota_mb')::numeric * 1048576;
  select coalesce(sum((metadata ->> 'size')::bigint), 0) into v_used from storage.objects;
  select coalesce(sum((metadata ->> 'size')::bigint), 0), count(*) into v_chat, v_files from storage.objects where bucket_id = 'mc2-chat' and name !~ 'emptyFolderPlaceholder$';
  return jsonb_build_object('cfg', fa_stor_cfg(), 'used_mb', round(v_used / 1048576.0, 1), 'chat_mb', round(v_chat / 1048576.0, 1), 'chat_files', v_files,
    'pct', round(v_used * 100.0 / v_q, 1),
    'log', coalesce((select jsonb_agg(to_jsonb(l)) from (select at, pct_before, pct_after, files, freed_mb, note from fa_stor_log order by id desc limit 10) l), '[]'::jsonb));
end $$;
revoke all on function fa_stor_get() from public, anon;
grant execute on function fa_stor_get() to authenticated;

-- অ্যাডমিন: সেভ
create or replace function fa_stor_set(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb := fa_stor_cfg(); k text; v numeric;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  o := o || jsonb_build_object('on', coalesce((p ->> 'on') = 'true', false));
  foreach k in array array['quota_mb', 'start_pct', 'chunk_mb', 'hard_pct', 'target_pct'] loop
    if (p ->> k) ~ '^[0-9]{1,7}$' then o := o || jsonb_build_object(k, (p ->> k)::int); end if;
  end loop;
  if (o ->> 'quota_mb')::int < 10 or (o ->> 'quota_mb')::int > 1000000 then raise exception 'স্টোরেজ সীমা ১০–১০,০০,০০০ MB হতে হবে'; end if;
  if (o ->> 'chunk_mb')::int < 1 or (o ->> 'chunk_mb')::int > 100000 then raise exception 'প্রতিবার মোছার MB ঠিক নয়'; end if;
  if (o ->> 'start_pct')::int not between 5 and 95 or (o ->> 'target_pct')::int not between 5 and 95 or (o ->> 'hard_pct')::int not between 10 and 99 then raise exception '%% ঠিক নয় (শুরু/নামানো ৫–৯৫, জরুরি ১০–৯৯)'; end if;
  if (o ->> 'hard_pct')::int < (o ->> 'start_pct')::int or (o ->> 'target_pct')::int >= (o ->> 'hard_pct')::int then raise exception 'শুরু %% ≤ জরুরি %%, আর নামানোর %% জরুরি %%-এর চেয়ে ছোট হতে হবে'; end if;
  insert into fa_settings (key, val) values ('stor', o) on conflict (key) do update set val = excluded.val, updated_at = now();
  return o;
end $$;
revoke all on function fa_stor_set(jsonb) from public, anon;
grant execute on function fa_stor_set(jsonb) to authenticated;

-- অ্যাডমিন: এখনই চালান / ড্রাই-রান
create or replace function fa_stor_run(p_dry boolean default true) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return fa_stor_sweep(true, coalesce(p_dry, true));
end $$;
revoke all on function fa_stor_run(boolean) from public, anon;
grant execute on function fa_stor_run(boolean) to authenticated;

-- চ্যাট খোলা থাকলে ক্লায়েন্ট নিজে mc2_ac_tick ডাকে; তার সাথে স্টোরেজ চেক (সর্বোচ্চ প্রতি মিনিটে একবার)।
-- বাকি অংশ আগের mc2_ac_tick-এর হুবহু কপি।
create or replace function mc2_ac_tick() returns void language plpgsql security definer set search_path = public as $$
begin
  if mc2_ac_rl('purge', 1, 300) then perform mc2_ac_purge(); perform mc2_ac_purge_live(); end if;
  perform mc2_cleanup_tick();
  begin perform fa_stor_sweep(false, false); exception when others then null; end;
end $$;

-- (৩) ====================================================================
-- পুরোনো অটো-ক্লিন (mc2_cleanup_*) আগের মতোই থাকে; শুধু চ্যাটের বার্তা ('chat') ও চ্যাট-ফাইল ('schat') মোছার ধাপ দুটো বন্ধ।
-- (ফাইল এখন উপরের fa_stor_sweep মোছে; বার্তা মোছে শুধু মডারেশন → স্বয়ংক্রিয় মোছার সময় অনুযায়ী।)
create or replace function mc2_cleanup_stage(p_stage text, p_lim int, p_c jsonb, out o_bytes bigint, out o_n int) language plpgsql security definer set search_path = public as $$
declare t record; bb bigint; nn int; paths text[]; ca int := coalesce((p_c ->> 'card_min_days')::int, 0);
begin
  o_bytes := 0; o_n := 0;
  perform set_config('mc2.nobin', 'on', true);
  if p_stage = 'bin' and coalesce((p_c ->> 'bin_days')::int, 0) <= 0 then null;  -- বিন OFF (০ দিন): চাপেও বিন খালি হবে না
  elsif p_stage = 'bin' then
    with d as (delete from mc2_bin where id in (select id from mc2_bin order by deleted_at limit p_lim) returning bytes) select coalesce(sum(bytes), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'chat' then null;   -- বন্ধ: চ্যাটের বার্তা অটো-ক্লিনে মোছে না; শুধু আপনার দেওয়া সময় (মডারেশন → স্বয়ংক্রিয় মোছা) অনুযায়ী মোছে
  elsif p_stage = 'extra' then
    with d as (delete from mc2_cards where id in (select x.id from (select id, pinned, updated_at, row_number() over (partition by device order by updated_at desc) rn from mc2_cards) x where x.rn > 5 and not x.pinned order by x.updated_at limit p_lim) returning pg_column_size(mc2_cards.*) b)
      select coalesce(sum(b), 0), count(*) into o_bytes, o_n from d;
  elsif p_stage = 'low' then
    for t in select * from (values ('mc2_visits', 'created_at'), ('mc2_answers', 'created_at'), ('mc2_presence', 'last_seen')) v(tbl, col) loop
      execute format('with d as (delete from %I where ctid = any(array(select ctid from %I order by %I limit %s)) returning pg_column_size(%I.*) b) select coalesce(sum(b), 0), count(*) from d', t.tbl, t.tbl, t.col, p_lim, t.tbl) into bb, nn;
      o_bytes := o_bytes + bb; o_n := o_n + nn; exit when o_n > 0;
    end loop;
  elsif p_stage = 'cards' then null;   -- বন্ধ: কার্ড এখন শুধু 'extra' ধাপে (ডিভাইসে নতুন ৫টির বাইরেরগুলো, pinned বাদে) মোছে; টপ/pinned ও ডিভাইসের সর্বশেষ ৫টি কখনো নয়
  elsif p_stage = 'schat' then null;   -- বন্ধ: চ্যাট-ফাইল এখন নতুন fa_stor_sweep() মোছে (বার্তায় 'ফাইলের মেয়াদ শেষ' চিহ্নসহ)
  end if;
  perform set_config('mc2.nobin', '', true);
end $$;
revoke all on function mc2_cleanup_stage(text, int, jsonb) from public, anon, authenticated;


-- (৪) ====================================================================
-- ডিফল্ট খারাপ শব্দ: ২০টি বাংলা + ২০টি ইংরেজি (আগে থাকলে বাদ দেয়; অ্যাডমিন → 🚫 খারাপ শব্দ থেকে যোগ/মোছা যায়)
insert into mc2_bad_words (word) values
  ('খানকি'),
  ('মাগি'),
  ('মাগী'),
  ('বেশ্যা'),
  ('হারামি'),
  ('হারামজাদা'),
  ('হারামজাদী'),
  ('চোদা'),
  ('চুদি'),
  ('চোদনা'),
  ('মাদারচোদ'),
  ('বোকাচোদা'),
  ('গান্ডু'),
  ('কুত্তারবাচ্চা'),
  ('শুয়োরেরবাচ্চা'),
  ('ঢেমনা'),
  ('লুচ্চা'),
  ('রান্ডি'),
  ('বেজন্মা'),
  ('জারজ'),
  ('motherfucker'),
  ('bullshit'),
  ('shithead'),
  ('dickhead'),
  ('cunt'),
  ('dick'),
  ('pussy'),
  ('whore'),
  ('wanker'),
  ('prick'),
  ('twat'),
  ('douchebag'),
  ('jackass'),
  ('dumbass'),
  ('bollocks'),
  ('asshat'),
  ('cocksucker'),
  ('skank'),
  ('tosser'),
  ('arsehole')
on conflict (word) do nothing;

-- (৫) ====================================================================
notify pgrst, 'reload schema';

-- ===== চেক: সব সারিতে ok = true আসতে হবে =====
select 'লিমিট ফাংশন' as item, to_regprocedure('fa_lim_get()') is not null as ok
union all select 'স্টোরেজ ফাংশন', to_regprocedure('fa_stor_sweep(boolean,boolean)') is not null and to_regprocedure('fa_stor_get()') is not null
union all select 'tick-এ স্টোরেজ চেক আছে', (select prosrc like '%fa_stor_sweep%' from pg_proc where proname = 'mc2_ac_tick' limit 1)
union all select 'অটো-ক্লিনে চ্যাট মোছা বন্ধ', (select prosrc like '%চ্যাটের বার্তা অটো-ক্লিনে মোছে না%' from pg_proc where proname = 'mc2_cleanup_stage' limit 1)
union all select 'খারাপ শব্দ ≥ ৪০টি', (select count(*) >= 40 from mc2_bad_words);
select fa_stor_cfg() as storage_setting, (select round(coalesce(sum((metadata ->> 'size')::bigint), 0) / 1048576.0, 1) from storage.objects) as used_mb;
