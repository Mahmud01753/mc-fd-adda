-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৮, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-33 (part153): 🌐 আইপি ব্যান + স্থায়ী ব্যান এখন ৩টি রিপোর্ট/যাচাই ছাড়াই (অ্যাডমিন চাইলে) + একই আইপির ইউজার দেখা
-- Supabase → SQL Editor-এ পুরোটা পেস্ট করে একবার Run করুন (আবার চালালেও ক্ষতি নেই)। আগে SQL-1, SQL-3 ও SQL-32 চালানো থাকতে হবে (আছে)।
--
-- কী বদলায়:
--  ১) নতুন টেবিল fa_ip_bans + ফাংশন: fa_ip_key (আইপি-কে একটা কী বানায়; IPv6 হলে /64 গোষ্ঠী ধরে), fa_ip_ban (ইউজার থেকে আইপি বের করে বা হাতে আইপি লিখে ব্যান),
--     fa_ip_unban, fa_admin_ip_bans (তালিকা), fa_admin_ip_info (ইউজারের আইপি + ওই আইপি থেকে আসা সব ইউজার)।
--  ২) mc2_ac_block-এ আইপি-চেক যোগ: আইপি-ব্যান থাকলে ওই আইপি থেকে বার্তা/রিঅ্যাকশন/ফাইল সব আটকায় (ইনকগনিটো/নতুন নামে ঢুকলেও), আর ইউজার ব্যান-স্ক্রিন দেখে।
--     অ্যাডমিন নিজে (লগইন থাকলে) কখনো আইপি-ব্যানে আটকায় না, আর অ্যাডমিন-তালিকাও অক্ষত থাকে।
--  ৩) mc2_ac_me: আইপি-ব্যানের কারণ/মেয়াদ ইউজারের ব্যান-স্ক্রিনে দেখায়।
--  ৪) mc2_ac_admin_sanction: স্থায়ী ব্যানের দুই অপশন — রিপোর্ট সহ (৩টি বৈধ রিপোর্ট + যাচাই লাগে) ও রিপোর্ট ছাড়া (লাগে না, ডিফল্ট); সাময়িক ব্যানের সীমা ৫ মিনিট – ৩৬৫ দিন।
--
-- চালালে: নতুন সব ফিচার কাজ করে। না চালালে: সাইট আগের মতোই চলে (আইপি-ব্যান বাটন "SQL-33 চালান" বলবে)।
-- ⚠️ কলেজের ওয়াইফাই/মোবাইল নেটওয়ার্কে অনেকের আইপি এক — আইপি-ব্যান দিলে সবাই আটকাতে পারে; তাই বসানোর আগে "এই আইপিতে আর কতজন" দেখানো হয়।

create table if not exists fa_ip_bans (
  id         bigserial primary key,
  ip         text not null,
  ip_key     text not null,
  reason     text not null,
  created_at timestamptz not null default now(),
  until      timestamptz,                -- খালি = স্থায়ী
  lifted_at  timestamptz,
  by_admin   text,
  voter      text,
  nick       text
);
create index if not exists fa_ip_bans_key on fa_ip_bans (ip_key) where lifted_at is null;
alter table fa_ip_bans enable row level security;   -- সরাসরি টেবিল বন্ধ

create or replace function fa_ip_key(p text) returns text language plpgsql immutable as $$
declare i inet;
begin
  if p is null or btrim(p) = '' then return null; end if;
  begin i := btrim(p)::inet; exception when others then return null; end;
  if family(i) = 6 then return host(network(set_masklen(i, 64))); end if;
  return host(i);
end $$;

-- ইউজারের জানা আইপি (সর্বশেষ)
create or replace function fa_voter_ip(p_voter text) returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select ip from mc2_presence where voter = p_voter and ip is not null limit 1),
    (select ip from mc2_ac_messages where voter = p_voter and ip is not null order by id desc limit 1));
$$;
revoke all on function fa_voter_ip(text) from public, anon, authenticated;

-- আইপি ব্যান
create or replace function fa_ip_ban(p_voter text, p_ip text, p_minutes int, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare vip text; k text; u timestamptz := null; adm text; nid bigint; nk text; n int;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'কারণ লিখুন'; end if;
  vip := coalesce(nullif(btrim(coalesce(p_ip, '')), ''), fa_voter_ip(p_voter));
  if vip is null then raise exception 'এই ইউজারের আইপি জানা নেই — হাতে আইপি লিখে দিন'; end if;
  k := fa_ip_key(vip);
  if k is null then raise exception 'আইপি ঠিক নয়'; end if;
  if k = fa_ip_key(mc2_ip()) then raise exception 'এটা আপনার নিজের আইপি — ব্যান করা যাবে না'; end if;
  if p_minutes is not null and p_minutes > 0 then
    if p_minutes > 52560000 then raise exception 'সময় বেশি'; end if;
    u := now() + make_interval(mins => p_minutes);
  end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;
  select nick into nk from mc2_presence where voter = p_voter;
  update fa_ip_bans set lifted_at = now() where ip_key = k and lifted_at is null;   -- আগেরটা বদলে নতুন
  insert into fa_ip_bans (ip, ip_key, reason, until, by_admin, voter, nick)
  values (left(vip, 64), k, left(btrim(p_reason), 300), u, adm, nullif(p_voter, ''), left(coalesce(nk, ''), 40)) returning id into nid;
  if coalesce(p_voter, '') <> '' then
    perform mc2_ac_log(p_voter, 'ip_ban', left(btrim(p_reason), 300), u, adm);
  end if;
  select count(*) into n from (
    select voter from mc2_presence where fa_ip_key(ip) = k
    union select voter from mc2_ac_messages where fa_ip_key(ip) = k and created_at > now() - interval '60 days') x;
  return jsonb_build_object('id', nid, 'ip', vip, 'key', k, 'until', case when u is null then null else (extract(epoch from u) * 1000)::bigint end, 'users', n);
end $$;
revoke all on function fa_ip_ban(text, text, int, text) from public, anon;
grant execute on function fa_ip_ban(text, text, int, text) to authenticated;

create or replace function fa_ip_unban(p_id bigint)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  update fa_ip_bans set lifted_at = now() where id = p_id and lifted_at is null;
  get diagnostics n = row_count; return n;
end $$;
revoke all on function fa_ip_unban(bigint) from public, anon;
grant execute on function fa_ip_unban(bigint) to authenticated;

create or replace function fa_admin_ip_bans(p_active_only boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'ip', ip, 'reason', reason, 'voter', voter, 'nick', nick,
      'c', (extract(epoch from created_at) * 1000)::bigint, 'e', case when until is null then null else (extract(epoch from until) * 1000)::bigint end,
      'l', case when lifted_at is null then null else (extract(epoch from lifted_at) * 1000)::bigint end, 'by', by_admin) order by created_at desc)
    from (select * from fa_ip_bans where (not p_active_only) or (lifted_at is null and (until is null or until > now())) order by created_at desc limit 200) x), '[]'::jsonb);
end $$;
revoke all on function fa_admin_ip_bans(boolean) from public, anon;
grant execute on function fa_admin_ip_bans(boolean) to authenticated;

-- ইউজারের আইপি + ওই আইপি থেকে আসা সব ইউজার (শুধু অ্যাডমিন)
create or replace function fa_admin_ip_info(p_voter text, p_ip text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare vip text; k text;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  vip := coalesce(nullif(btrim(coalesce(p_ip, '')), ''), fa_voter_ip(p_voter));
  k := fa_ip_key(vip);
  if k is null then return jsonb_build_object('ip', null, 'users', '[]'::jsonb, 'bans', '[]'::jsonb); end if;
  return jsonb_build_object('ip', vip, 'key', k,
    'bans', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'reason', b.reason, 'e', case when b.until is null then null else (extract(epoch from b.until) * 1000)::bigint end))
                       from fa_ip_bans b where b.ip_key = k and b.lifted_at is null and (b.until is null or b.until > now())), '[]'::jsonb),
    'users', coalesce((select jsonb_agg(jsonb_build_object('voter', t.voter, 'uid', mc2_uid(t.voter), 'nick', t.nick, 'last', (extract(epoch from t.last) * 1000)::bigint,
                         'st', coalesce(mc2_ac_block(t.voter), 'ok')) order by t.last desc)
                       from (select voter, max(nick) nick, max(last) last from (
                               select voter, nick, last_seen as last from mc2_presence where fa_ip_key(ip) = k
                               union all
                               select voter, nick, created_at from mc2_ac_messages where fa_ip_key(ip) = k and created_at > now() - interval '60 days') u
                             group by voter order by max(last) desc limit 40) t), '[]'::jsonb));
end $$;
revoke all on function fa_admin_ip_info(text, text) from public, anon;
grant execute on function fa_admin_ip_info(text, text) to authenticated;

-- mc2_ac_block: ডিভাইস-ব্যান/Restriction (আগের মতো) + আইপি-ব্যান। অ্যাডমিন নিজে আইপি-ব্যানে আটকায় না।
create or replace function mc2_ac_block(p_voter text) returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    case when exists (select 1 from fa_ip_bans b where b.lifted_at is null and (b.until is null or b.until > now()) and b.ip_key = fa_ip_key(mc2_ip()))
          and not coalesce(mc2_is_admin(), false) then 'banned' end,
    (select case when m.state = 'banned' and (m.until is null or m.until > now()) then 'banned'
                 when m.state = 'restricted' and m.until > now() then 'restricted' end
       from mc2_ac_mod m where m.voter = p_voter));
$$;
revoke all on function mc2_ac_block(text) from public, anon, authenticated;

-- mc2_ac_me: আইপি-ব্যান হলে তার কারণ/মেয়াদ দেখায়
create or replace function mc2_ac_me(p_voter text) returns jsonb language sql stable security definer set search_path = public as $$
  with ib as (
    select b.reason, b.until from fa_ip_bans b
     where b.lifted_at is null and (b.until is null or b.until > now()) and b.ip_key = fa_ip_key(mc2_ip()) and not coalesce(mc2_is_admin(), false)
     order by (b.until is null) desc, b.until desc limit 1)
  select jsonb_build_object(
    's', coalesce(mc2_ac_block(p_voter), 'ok'),
    'u', case when exists (select 1 from ib) then (select case when until is not null then (extract(epoch from until) * 1000)::bigint end from ib)
              else (select case when m.until is not null then (extract(epoch from m.until) * 1000)::bigint end from mc2_ac_mod m where m.voter = p_voter) end,
    'r', case when exists (select 1 from ib) then (select reason from ib)
              else (select m.reason from mc2_ac_mod m where m.voter = p_voter and mc2_ac_block(p_voter) is not null) end,
    'w', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'r', w.reason) order by w.id) from mc2_ac_warns w where w.voter = p_voter and not w.acked), '[]'::jsonb));
$$;
revoke all on function mc2_ac_me(text) from public, anon, authenticated;

-- mc2_ac_admin_sanction: স্থায়ী ব্যানের দুই অপশন (p_with_reports):
--   false (ডিফল্ট) = রিপোর্ট ছাড়া — ৩টি বৈধ রিপোর্ট/যাচাই লাগে না, অ্যাডমিন চাইলেই স্থায়ী ব্যান
--   true            = রিপোর্ট সহ  — আগের নিয়ম: ৩ জন আলাদা ইউজারের বৈধ রিপোর্ট + যাচাই (Verify) না থাকলে স্থায়ী ব্যান হয় না
-- সাময়িক ব্যান ৫ মিনিট – ৩৬৫ দিন। (আগের ৪-আর্গুমেন্টের ফাংশন সরিয়ে ৫-আর্গুমেন্টেরটা বসে — পুরোনো কল ঠিকই চলবে)
drop function if exists mc2_ac_admin_sanction(text, text, int, text);
create or replace function mc2_ac_admin_sanction(p_voter text, p_kind text, p_minutes int, p_reason text, p_with_reports boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm(); rs text := mc2_ac_clean(p_reason, 300); u timestamptz; perm boolean := (p_minutes is null or p_minutes <= 0); ok boolean; cnt int;
begin
  if coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' then raise exception 'ভুল ইউজার'; end if;
  if p_kind not in ('restrict', 'ban') then raise exception 'ভুল ধরন'; end if;
  if char_length(rs) < 3 then raise exception 'কারণ লিখুন'; end if;
  if perm then
    if p_kind <> 'ban' then raise exception 'Restriction সাময়িকই হয় — সময় দিন'; end if;
    if coalesce(p_with_reports, false) then
      select count(distinct reporter) into cnt from mc2_ac_reports where target = p_voter and status = 'valid';
      select coalesce((select verified from mc2_ac_mod where voter = p_voter), false) into ok;
      if cnt < 3 or not ok then raise exception 'রিপোর্ট সহ স্থায়ী ব্যানের আগে ৩টি বৈধ রিপোর্ট ও যাচাই (Verify) লাগবে — এখন "রিপোর্ট ছাড়া" বা সাময়িক ব্যান দিন'; end if;
    end if;
    u := null;
  else
    if p_minutes < 5 or p_minutes > 525600 then raise exception 'সময় ৫ মিনিট থেকে ৩৬৫ দিনের মধ্যে দিন'; end if;
    u := now() + make_interval(mins => p_minutes);
  end if;
  insert into mc2_ac_mod(voter, state, until, reason, review) values (p_voter, case p_kind when 'ban' then 'banned' else 'restricted' end, u, rs, false)
  on conflict (voter) do update set state = excluded.state, until = excluded.until, reason = excluded.reason, review = false, updated_at = now();
  perform mc2_ac_log(p_voter, case when p_kind = 'ban' and perm then 'ban_perm' else p_kind end, rs, u, a);
  return jsonb_build_object('state', case p_kind when 'ban' then 'banned' else 'restricted' end, 'until', u);
end $$;
revoke all on function mc2_ac_admin_sanction(text, text, int, text, boolean) from public, anon;
grant execute on function mc2_ac_admin_sanction(text, text, int, text, boolean) to authenticated;

-- চেক (চালানোর পর): ১টা সারি — ip_key = 203.0.113.5, v6_key = 2001:db8:1:2::
select fa_ip_key('203.0.113.5') as ip_key, fa_ip_key('2001:db8:1:2:aaaa:bbbb:cccc:dddd') as v6_key;
