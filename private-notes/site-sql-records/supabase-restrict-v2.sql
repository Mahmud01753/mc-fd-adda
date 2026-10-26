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
