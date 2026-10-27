-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৬, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- Friend Adda: "নামে ক্লিক → বাবল" + "নাম ছাড়া বাবল" সিস্টেম (সেটিং, লগ, মিউট, স্প্যাম লিমিট, খারাপ শব্দ আটকানো, জরুরি অফ)। Supabase SQL Editor-এ একবার চালান।
-- চালালে: চ্যাটের নিচের অনলাইন স্ট্রিপ, নামে ক্লিক করে বাবল, নাম ছাড়া বাবল, অ্যাডমিনের তালা-ফোল্ডার ও মূল অ্যাডমিনের "💬 চ্যাট বাবল" ট্যাব কাজ করবে; সব ইউজার সেটিং ও বাবল পাবে।
-- না চালালে: স্ট্রিপে নাম দেখাবে কিন্তু বাবল পাঠানো/সেটিং সেভ কাজ করবে না (নামে ক্লিক আগের মতো শুধু নাম মেনশন হয়ে বসবে); বাকি সাইট আগের মতোই চলবে।
-- নিরাপত্তা: ইউজারের কোনো টেবিলে সরাসরি ঢোকার অনুমতি নেই — সবকিছু নিচের ফাংশন দিয়ে। আইডি ব্যান/রেস্ট্রিকশন কিছুই হয় না; খারাপ শব্দ থাকলে শুধু বাবল আটকায়।

-- ================= টেবিল =================
create table if not exists public.mc2_bub_cfg (
  id int primary key default 1 check (id = 1),
  cfg jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.mc2_bub_cfg (id) values (1) on conflict (id) do nothing;
alter table public.mc2_bub_cfg enable row level security;

create table if not exists public.mc2_bub_user (   -- ইউজার ধরে ধরে: বাবল বন্ধ / আলাদা লিমিট (০ = ডিফল্ট)
  uid text primary key,
  nick text,
  muted boolean not null default false,
  lim_m int not null default 0,
  lim_t int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.mc2_bub_user enable row level security;

create table if not exists public.mc2_bubbles (    -- সব বাবল + আটকানো চেষ্টার লগ (৭ দিন)
  id bigserial primary key,
  session_id int,                                  -- null = সব রুমে (বিশেষ বাবল)
  voter text not null,
  uid text not null,
  nick text,
  to_uid text,
  to_nick text,
  body text not null,
  anim int,
  color text,
  emoji text,
  anon boolean not null default false,
  special boolean not null default false,
  status text not null default 'ok',               -- ok | badword | limit | muted
  created_at timestamptz not null default now()
);
create index if not exists mc2_bubbles_s on public.mc2_bubbles (session_id, id);
create index if not exists mc2_bubbles_v on public.mc2_bubbles (voter, created_at);
create index if not exists mc2_bubbles_t on public.mc2_bubbles (created_at);
alter table public.mc2_bubbles enable row level security;

-- ================= ইউজারের দিক: নতুন বাবল + সেটিং আনা =================
-- p_after = -1 হলে শুধু বর্তমান শেষ আইডি ও সেটিং আসে (পুরোনো বাবল আবার দেখায় না)।
create or replace function public.mc2_bub_get(p_session int, p_after bigint, p_voter text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c jsonb; v text := left(coalesce(p_voter, ''), 80); u text; mu boolean := false; lm int := 0; lt int := 0;
        sn boolean; sa boolean; items jsonb := '[]'::jsonb; mx bigint;
begin
  select cfg into c from mc2_bub_cfg where id = 1; c := coalesce(c, '{}'::jsonb);
  u := mc2_uid(v);
  select coalesce(x.muted, false), coalesce(x.lim_m, 0), coalesce(x.lim_t, 0) into mu, lm, lt from mc2_bub_user x where x.uid = u;
  mu := coalesce(mu, false); lm := coalesce(lm, 0); lt := coalesce(lt, 0);
  sn := coalesce((c->>'showSender')::boolean, false);
  sa := coalesce((c->>'showAnon')::boolean, false);
  select coalesce(max(id), 0) into mx from mc2_bubbles;
  if coalesce(p_after, -1) >= 0 then
    select coalesce(jsonb_agg(j order by id), '[]'::jsonb) into items from (
      select b.id, jsonb_build_object(
        'id', b.id, 't', b.body, 'to', b.to_nick, 'tu', b.to_uid, 'a', b.anim, 'c', b.color, 'e', b.emoji,
        'an', b.anon, 'sp', b.special,
        'f', case when b.special then null when (b.anon and sa) or ((not b.anon) and sn) then b.nick else null end) j
      from mc2_bubbles b
      where b.status = 'ok' and b.id > p_after and (b.session_id = p_session or b.session_id is null)
        and b.created_at > now() - interval '30 seconds'
      order by b.id limit 20) q;
  end if;
  return jsonb_build_object('cfg', c, 'me', jsonb_build_object('u', u, 'mu', mu, 'lm', lm, 'lt', lt), 'items', items, 'last', greatest(mx, coalesce(p_after, 0)));
end $$;
grant execute on function public.mc2_bub_get(int, bigint, text) to anon, authenticated;

-- ================= বাবল পাঠানো (সব পরীক্ষা সার্ভারে) =================
create or replace function public.mc2_bub_send(p_session int, p_nick text, p_voter text, p_to_uid text, p_to_nick text, p_body text,
  p_anon boolean, p_anim int, p_color text, p_emoji text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb; v text := left(coalesce(p_voter, ''), 80); n text := left(btrim(coalesce(p_nick, '')), 30); b text := btrim(coalesce(p_body, ''));
        adm boolean := false; u text; mx int; an boolean := coalesce(p_anon, false); k text; mu boolean := false; ovm int := 0; ovt int := 0;
        lm int; lt int; ca int; cb int; f1 timestamptz; f2 timestamptz; wait int := 0; an_i int; col text; emo text; tn text; tu text; rid bigint;
begin
  if v = '' or p_session is null then return jsonb_build_object('ok', false, 'err', 'bad'); end if;
  begin adm := coalesce(mc2_is_admin(), false); exception when others then adm := false; end;
  u := mc2_uid(v);
  select cfg into c from mc2_bub_cfg where id = 1; c := coalesce(c, '{}'::jsonb);
  if n = '' then n := 'বেনামি'; end if;
  mx := least(500, greatest(5, coalesce((c->>'max')::int, 50)));
  if coalesce((c->>'kill')::boolean, false) then return jsonb_build_object('ok', false, 'err', 'kill'); end if;
  if not adm then
    if an then
      if not coalesce((c->>'anonOn')::boolean, false) then return jsonb_build_object('ok', false, 'err', 'off'); end if;
    else
      if not coalesce((c->>'userShow')::boolean, false) then return jsonb_build_object('ok', false, 'err', 'off'); end if;
    end if;
  end if;
  if b = '' then return jsonb_build_object('ok', false, 'err', 'empty'); end if;
  if char_length(b) > mx then return jsonb_build_object('ok', false, 'err', 'long', 'max', mx); end if;
  tn := case when an then null else left(nullif(btrim(coalesce(p_to_nick, '')), ''), 30) end;
  tu := case when an then null else left(nullif(btrim(coalesce(p_to_uid, '')), ''), 20) end;
  select coalesce(x.muted, false), coalesce(x.lim_m, 0), coalesce(x.lim_t, 0) into mu, ovm, ovt from mc2_bub_user x where x.uid = u;
  if not adm then
    if mu then
      insert into mc2_bubbles(session_id, voter, uid, nick, to_uid, to_nick, body, anon, status) values (p_session, v, u, n, tu, tn, b, an, 'muted');
      return jsonb_build_object('ok', false, 'err', 'muted');
    end if;
    if fa_bad_hit(b) is not null then
      insert into mc2_bubbles(session_id, voter, uid, nick, to_uid, to_nick, body, anon, status) values (p_session, v, u, n, tu, tn, b, an, 'badword');
      return jsonb_build_object('ok', false, 'err', 'badword');
    end if;
    k := case when an then 'a' else 'n' end;
    lm := case when ovm > 0 then ovm else greatest(1, coalesce((c #>> array['lim', k, 'm'])::int, 1)) end;
    lt := case when ovt > 0 then ovt else greatest(1, coalesce((c #>> array['lim', k, 't'])::int, 3)) end;
    select count(*) filter (where created_at > now() - interval '60 seconds'), count(*),
           min(created_at) filter (where created_at > now() - interval '60 seconds'), min(created_at)
      into ca, cb, f1, f2
      from mc2_bubbles where voter = v and anon = an and status = 'ok' and not special and created_at > now() - interval '10 minutes';
    if ca >= lm then wait := ceil(extract(epoch from (f1 + interval '60 seconds' - now())))::int;
    elsif cb >= lt then wait := ceil(extract(epoch from (f2 + interval '10 minutes' - now())))::int;
    end if;
    if wait > 0 then
      insert into mc2_bubbles(session_id, voter, uid, nick, to_uid, to_nick, body, anon, status) values (p_session, v, u, n, tu, tn, b, an, 'limit');
      return jsonb_build_object('ok', false, 'err', 'limit', 'wait', greatest(wait, 1), 'lm', lm, 'lt', lt);
    end if;
  end if;
  -- ইউজার অ্যানিমেশন/রঙ/ইমোজি বাছতে পারবে কি না (অ্যাডমিন সব পারে)
  an_i := case when (adm or coalesce((c->>'userAnim')::boolean, false)) and p_anim between 0 and 10 then p_anim else null end;
  col := case when (adm or coalesce((c->>'userColor')::boolean, false)) and p_color in ('white', 'gold', 'pink', 'green', 'blue') then p_color else null end;
  emo := case when (adm or coalesce((c->>'userEmoji')::boolean, false)) then left(nullif(btrim(coalesce(p_emoji, '')), ''), 8) else null end;
  insert into mc2_bubbles(session_id, voter, uid, nick, to_uid, to_nick, body, anim, color, emoji, anon, status)
  values (p_session, v, u, n, tu, tn, b, an_i, col, emo, an, 'ok') returning id into rid;
  delete from mc2_bubbles where created_at < now() - interval '7 days';
  return jsonb_build_object('ok', true, 'id', rid);
end $$;
grant execute on function public.mc2_bub_send(int, text, text, text, text, text, boolean, int, text, text) to anon, authenticated;

-- ================= শুধু অ্যাডমিন =================
create or replace function public.mc2_admin_set_bub(p_cfg jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  if p_cfg is null or jsonb_typeof(p_cfg) <> 'object' then raise exception 'bad cfg'; end if;
  if length(p_cfg::text) > 8000 then raise exception 'cfg too long'; end if;
  update mc2_bub_cfg set cfg = p_cfg, updated_at = now() where id = 1;
end $$;
revoke all on function public.mc2_admin_set_bub(jsonb) from public, anon;
grant execute on function public.mc2_admin_set_bub(jsonb) to authenticated;

create or replace function public.mc2_admin_bub_special(p_body text, p_emoji text, p_anim int, p_color text) returns bigint
language plpgsql security definer set search_path = public as $$
declare r bigint; b text := left(btrim(coalesce(p_body, '')), 200);
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  if b = '' then raise exception 'empty'; end if;
  insert into mc2_bubbles(session_id, voter, uid, nick, body, anim, color, emoji, anon, special, status)
  values (null, 'admin', 'ADMIN', 'অ্যাডমিন', b, case when p_anim between 0 and 10 then p_anim else null end,
          case when p_color in ('white', 'gold', 'pink', 'green', 'blue') then p_color else 'gold' end, left(nullif(btrim(coalesce(p_emoji, '')), ''), 8), false, true, 'ok')
  returning id into r;
  return r;
end $$;
revoke all on function public.mc2_admin_bub_special(text, text, int, text) from public, anon;
grant execute on function public.mc2_admin_bub_special(text, text, int, text) to authenticated;

-- কে কাকে কী পাঠাল (বেনামির আসল পাঠানেওয়ালাসহ) + আটকানো চেষ্টা
create or replace function public.mc2_admin_bub_log(p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(j order by id desc) from (
    select b.id, jsonb_build_object('id', b.id, 'ts', (extract(epoch from b.created_at) * 1000)::bigint, 'nick', b.nick, 'uid', b.uid,
      'to', b.to_nick, 'tu', b.to_uid, 't', b.body, 'an', b.anon, 'sp', b.special, 'st', b.status, 's', b.session_id) j
    from mc2_bubbles b order by b.id desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) q), '[]'::jsonb);
end $$;
revoke all on function public.mc2_admin_bub_log(int) from public, anon;
grant execute on function public.mc2_admin_bub_log(int) to authenticated;

create or replace function public.mc2_admin_bub_clear() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  delete from mc2_bubbles;
end $$;
revoke all on function public.mc2_admin_bub_clear() from public, anon;
grant execute on function public.mc2_admin_bub_clear() to authenticated;

-- ইউজার তালিকা (গত ৩০ দিনে চ্যাট করেছে বা বাবল সেটিং আছে) — বন্ধ/লিমিট/আজ কয়টা
create or replace function public.mc2_admin_bub_users() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.n) from (
    select x.uid u, x.nick n, coalesce(o.muted, false) mu, coalesce(o.lim_m, 0) lm, coalesce(o.lim_t, 0) lt, coalesce(b.c, 0)::int today
    from (select mc2_uid(m.voter) uid, (array_agg(m.nick order by m.id desc))[1] nick
            from mc2_ac_messages m where m.created_at > now() - interval '30 days' group by m.voter
          union select uid, nick from mc2_bub_user) x
    left join mc2_bub_user o on o.uid = x.uid
    left join (select uid, count(*) c from mc2_bubbles where status = 'ok' and not special and created_at >= date_trunc('day', now()) group by uid) b on b.uid = x.uid
    limit 400) r), '[]'::jsonb);
end $$;
revoke all on function public.mc2_admin_bub_users() from public, anon;
grant execute on function public.mc2_admin_bub_users() to authenticated;

create or replace function public.mc2_admin_bub_user_set(p_uid text, p_nick text, p_muted boolean, p_m int, p_t int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not mc2_is_admin() then raise exception 'not admin'; end if;
  if coalesce(p_uid, '') = '' then raise exception 'bad uid'; end if;
  insert into mc2_bub_user(uid, nick, muted, lim_m, lim_t, updated_at)
  values (left(p_uid, 20), left(p_nick, 30), coalesce(p_muted, false), greatest(coalesce(p_m, 0), 0), greatest(coalesce(p_t, 0), 0), now())
  on conflict (uid) do update set nick = excluded.nick, muted = excluded.muted, lim_m = excluded.lim_m, lim_t = excluded.lim_t, updated_at = now();
end $$;
revoke all on function public.mc2_admin_bub_user_set(text, text, boolean, int, int) from public, anon;
grant execute on function public.mc2_admin_bub_user_set(text, text, boolean, int, int) to authenticated;

-- চেক (চালানোর পর): select mc2_bub_get(1, -1, 'test');  → {"cfg":{},"me":{...},"items":[],"last":0}
