-- SQL-32 (part151): মেসেজ Restriction = আজীবন-লুকানো লেখা, ইউজার Restriction আলাদা, অ্যাডমিন সেটিং-এ ডিফল্ট সময়
-- Supabase → SQL Editor-এ পুরোটা পেস্ট করে একবার Run করুন (আবার চালালেও ক্ষতি নেই)। আগে SQL-3 ও SQL-26 চালানো থাকতে হবে (আছে)।
--
-- কী বদলায়:
--  ১) fa_restrict: সময়ের সীমা ১ মিনিট – ৫২৫৬০০০০ মিনিট (≈ ১০০ বছর = "আজীবন")।
--  ২) fa_restriction_adjust: "সময় বাড়াও"-র ওপরসীমা ৩৬৫ দিন থেকে ≈ ১০০ বছর (আজীবন Restriction-এ বাড়ালে যেন মেয়াদ কমে না যায়)।
--  ৩) fa_rs: নতুন তিনটা তথ্য — 'hm' (যে বার্তাগুলোর লেখা চিরতরে লুকানো; মেয়াদ শেষ বা বন্ধ হলেও লুকানোই থাকে; শুধু অটো-Restriction "ভুল ছিল" বলে ক্ষমা করলে বাদ),
--     'dm' (মেসেজ Restriction-এর ডিফল্ট মিনিট, ডিফল্ট আজীবন), 'du' (ইউজার Restriction-এর ডিফল্ট মিনিট, ডিফল্ট ৬০)।
--  ৪) fa_set_rs_defaults(মেসেজ-মিনিট, ইউজার-মিনিট): অ্যাডমিন সেটিং থেকে ডিফল্ট বদলানোর ফাংশন।
--  ৫) fa_admin_msg_target: চলমান Restriction-এর তালিকায় 'mid' (বার্তা-ভিত্তিক না ইউজার-ভিত্তিক) যোগ।
--
-- চালালে: নতুন নিয়ম পুরোপুরি কাজ করে (লেখা চিরতরে লুকানো, ডিফল্ট সময়, দুই ধরনের Restriction)।
-- না চালালে: সাইট আগের মতোই চলবে, কিন্তু আজীবন সময় দেওয়া যাবে না এবং মেয়াদ শেষে লেখা আবার দেখা যাবে।

-- ১) fa_restrict (SQL-26-এর হুবহু, শুধু সময়ের ওপরসীমা বদলানো)
create or replace function fa_restrict(p_voter text, p_uid text, p_nick text, p_reason text, p_minutes int, p_msg bigint default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare nid bigint; adm text; u timestamptz; mid bigint := null;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if not fa_restrict_on() then raise exception 'Restriction সিস্টেম এখন বন্ধ (আগে চালু করুন)'; end if;
  if p_voter is null or length(p_voter) < 4 then raise exception 'voter'; end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 52560000 then raise exception 'minutes 1..52560000'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason'; end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;
  if p_msg is not null then
    select m.id into mid from mc2_ac_messages m where m.id = p_msg and m.voter = p_voter;
  end if;
  u := now() + make_interval(mins => p_minutes);
  insert into fa_restrictions (voter, uid, nick, reason, until, by_admin, kind, msg_id)
  values (p_voter, left(coalesce(p_uid, ''), 80), left(coalesce(p_nick, ''), 40), left(btrim(p_reason), 300), u, adm, 'admin', mid)
  returning id into nid;
  perform fa_log_restrict(nid, p_voter, left(coalesce(p_uid, ''), 80), left(coalesce(p_nick, ''), 40), 'give', p_minutes, null, u, left(btrim(p_reason), 300), adm);
  return nid;
end $$;
revoke all on function fa_restrict(text, text, text, text, int, bigint) from public, anon;
grant execute on function fa_restrict(text, text, text, text, int, bigint) to authenticated;

-- ২) fa_restriction_adjust (SQL-3-এর হুবহু, শুধু "বাড়াও"-র ওপরসীমা বদলানো)
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
  if p_minutes is null or p_minutes < 1 or p_minutes > 52560000 then raise exception 'minutes 1..52560000'; end if;

  if p_action = 'shorten' then
    nu := r.until - make_interval(mins => p_minutes);
    if nu <= now() then
      update fa_restrictions set lifted_at = now(), forgiven = (r.kind = 'auto') where id = r.id;
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

-- ৩) ডিফল্ট সময় সেট করার ফাংশন (অ্যাডমিন)
create or replace function fa_set_rs_defaults(p_msg int, p_user int)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if p_msg is null or p_msg < 1 or p_msg > 52560000 then raise exception 'msg minutes 1..52560000'; end if;
  if p_user is null or p_user < 1 or p_user > 52560000 then raise exception 'user minutes 1..52560000'; end if;
  insert into fa_settings (key, val) values ('rs_msg_min', to_jsonb(p_msg)) on conflict (key) do update set val = excluded.val, updated_at = now();
  insert into fa_settings (key, val) values ('rs_user_min', to_jsonb(p_user)) on conflict (key) do update set val = excluded.val, updated_at = now();
  return jsonb_build_object('dm', p_msg, 'du', p_user);
end $$;
revoke all on function fa_set_rs_defaults(int, int) from public, anon;
grant execute on function fa_set_rs_defaults(int, int) to authenticated;

-- ৪) fa_rs: SQL-26-এর হুবহু + 'hm', 'dm', 'du'
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
    'dm', coalesce((select (val #>> '{}')::int from fa_settings where key = 'rs_msg_min'), 52560000),
    'du', coalesce((select (val #>> '{}')::int from fa_settings where key = 'rs_user_min'), 60),
    'lk', (select jsonb_build_object('r', reason, 'e', case when until_at is null then null else (extract(epoch from until_at) * 1000)::bigint end)
             from fa_locks where p_voter is not null and voter = p_voter and lifted_at is null and (until_at is null or until_at > now()) limit 1),
    'shot', coalesce((select val = 'true'::jsonb from fa_settings where key = 'shot'), false),
    'now', (extract(epoch from now()) * 1000)::bigint
  );
$$;
grant execute on function fa_rs(text) to anon, authenticated;

-- ৫) fa_admin_msg_target: SQL-3-এর হুবহু + 'mid'
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
    'active', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'reason', reason, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind, 'mid', coalesce(msg_id, 0)) order by created_at)
                          from fa_restrictions where voter = v and lifted_at is null and until > now()), '[]'::jsonb));
end $$;
revoke all on function fa_admin_msg_target(bigint) from public, anon;
grant execute on function fa_admin_msg_target(bigint) to authenticated;

-- চেক (চালানোর পর): ১টা সারি — dm = 52560000 (আজীবন), du = 60 (১ ঘণ্টা) আসবে
select fa_rs(null)->'dm' as msg_default_min, fa_rs(null)->'du' as user_default_min;
