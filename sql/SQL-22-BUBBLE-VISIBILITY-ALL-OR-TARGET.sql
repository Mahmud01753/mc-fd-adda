-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৬, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-22: বাবল কে দেখবে — "সবাই" নাকি "শুধু যাকে দিয়েছে সে" (অ্যাডমিন প্যানেলের নতুন সেটিং "👁 নামে-পাঠানো বাবল কে দেখবে")।
-- কাজ: শুধু mc2_bub_get ফাংশনটা বদলায় (SQL-20-এর ফাংশনের মতোই, সঙ্গে ১টা শর্ত)। নতুন টেবিল নেই, ডেটা বদলায় না। ডিফল্ট সেটিং "সবাই দেখবে" — তাই চালালেও আচরণ আগের মতোই থাকে যতক্ষণ না অ্যাডমিনে "শুধু যাকে দিয়েছে" বাছা হয়।
-- আবার চালালেও ক্ষতি নেই। না চালালে: সেটিং ব্রাউজারেই কাজ করবে (অন্যরা বাবল দেখবে না) — তবে বাবলের লেখা নেটওয়ার্কে সবার ব্রাউজারে পৌঁছাবে (কেউ ডেভেলপার টুলে দেখতে পারবে)। সত্যিকারের গোপনীয়তার জন্য এই SQL চালান।
-- নিয়ম: "শুধু যাকে দিয়েছে" হলে নামে-পাঠানো বাবল দেখে — প্রাপক, প্রেরক, ও অ্যাডমিন (সুইচ অন থাকলে)। নাম-ছাড়া বাবল ও বিশেষ দিনের বাবল সবসময় সবাই দেখে।

create or replace function public.mc2_bub_get(p_session int, p_after bigint, p_voter text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c jsonb; v text := left(coalesce(p_voter, ''), 80); u text; mu boolean := false; lm int := 0; lt int := 0;
        sn boolean; sa boolean; vis text; adm boolean := false; items jsonb := '[]'::jsonb; mx bigint;
begin
  select cfg into c from mc2_bub_cfg where id = 1; c := coalesce(c, '{}'::jsonb);
  u := mc2_uid(v);
  select coalesce(x.muted, false), coalesce(x.lim_m, 0), coalesce(x.lim_t, 0) into mu, lm, lt from mc2_bub_user x where x.uid = u;
  mu := coalesce(mu, false); lm := coalesce(lm, 0); lt := coalesce(lt, 0);
  sn := coalesce((c->>'showSender')::boolean, false);
  sa := coalesce((c->>'showAnon')::boolean, false);
  vis := coalesce(c->>'vis', 'all');
  begin adm := coalesce((c->>'admSee')::boolean, true) and coalesce(mc2_is_admin(), false); exception when others then adm := false; end;
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
        and (vis <> 'to' or adm or b.special or b.anon or b.to_uid is null or b.to_uid = u or b.uid = u)
      order by b.id limit 20) q;
  end if;
  return jsonb_build_object('cfg', c, 'me', jsonb_build_object('u', u, 'mu', mu, 'lm', lm, 'lt', lt), 'items', items, 'last', greatest(mx, coalesce(p_after, 0)));
end $$;
grant execute on function public.mc2_bub_get(int, bigint, text) to anon, authenticated;
