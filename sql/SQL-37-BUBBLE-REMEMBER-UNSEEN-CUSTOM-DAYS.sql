-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৮, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-37: নামে-পাঠানো বাবল প্রাপক অনলাইনে না থাকলে/না দেখলে — পরে যখন চ্যাটে আসবে তখন আবার দেখাবে; কত দিন মনে রাখবে সেটা অ্যাডমিনে (💬 চ্যাট বাবল ট্যাব) ১–৩৬৫ দিন বসানো যায় (শুরুতে ৭ দিন)।
-- চালানোর নিয়ম: Supabase → SQL Editor → New query → পুরোটা পেস্ট → Run। আবার চালালেও ক্ষতি নেই। (আগে SQL-20 চালানো থাকতে হবে — আছে)
-- চালালে: যাকে নাম ধরে বাবল দেওয়া হয়েছে সে যতক্ষণ না বাবলটা স্ক্রিনে দেখছে, ততক্ষণ প্রতিবার চ্যাটে ঢুকলে (অ্যাডমিনের বসানো দিন পর্যন্ত, শুরুতে ৭) সেটা আবার আসবে; একবার দেখলে আর আসবে না।
-- না চালালে: সাইট আগের মতোই চলবে (বাবল শুধু পাঠানোর ৩০ সেকেন্ডের মধ্যে অনলাইনে থাকলে দেখা যাবে), কিছু ভাঙবে না।
-- নিয়ম: শুধু নামে-পাঠানো (প্রাপক আছে) সাধারণ বাবল; নাম-ছাড়া ও বিশেষ বাবল এতে নেই। বাবলের ডাটা ওই বসানো দিন পর মুছে যায় (SQL-20-এর স্থির ৭ দিনের জায়গায় এই SQL সেটাকে অ্যাডমিনের সেটিং ধরায়)।

-- অ্যাডমিনের বসানো "মনে রাখার দিন" (keepDays): ১–৩৬৫, না থাকলে ৭
create or replace function public.mc2_bub_keep_days() returns int
language sql stable security definer set search_path = public as $$
  select least(greatest(coalesce((select (cfg->>'keepDays')::numeric::int from mc2_bub_cfg where id = 1), 7), 1), 365);
$$;
grant execute on function public.mc2_bub_keep_days() to anon, authenticated;

-- SQL-20-এর mc2_bub_send-এ স্থির "৭ দিন" মোছা-নিয়ম বদলে অ্যাডমিনের সেটিং বসানো (আবার চালালে কিছু বদলায় না)
do $d$
declare def text; oldt text := 'created_at < now() - interval ''7 days'''; newt text := 'created_at < now() - make_interval(days => mc2_bub_keep_days())';
begin
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'mc2_bub_send' limit 1;
  if def is not null and position(oldt in def) > 0 then
    execute replace(def, oldt, newt);
  end if;
end $d$;

create table if not exists public.mc2_bub_seen (
  bubble_id bigint not null,
  uid text not null,
  seen_at timestamptz not null default now(),
  primary key (bubble_id, uid)
);
create index if not exists mc2_bub_seen_t on public.mc2_bub_seen (seen_at);
alter table public.mc2_bub_seen enable row level security;

-- না-দেখা বাবল আনা (প্রাপক = এই ডিভাইস, অ্যাডমিনের বসানো দিনের মধ্যে, এখনো দেখেনি)
create or replace function public.mc2_bub_missed(p_session int, p_voter text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c jsonb; v text := left(coalesce(p_voter, ''), 80); u text; sn boolean; sa boolean; items jsonb := '[]'::jsonb;
begin
  if v = '' then return '[]'::jsonb; end if;
  select cfg into c from mc2_bub_cfg where id = 1; c := coalesce(c, '{}'::jsonb);
  u := mc2_uid(v);
  sn := coalesce((c->>'showSender')::boolean, false);
  sa := coalesce((c->>'showAnon')::boolean, false);
  select coalesce(jsonb_agg(j order by id), '[]'::jsonb) into items from (
    select b.id, jsonb_build_object(
      'id', b.id, 't', b.body, 'to', b.to_nick, 'tu', b.to_uid, 'a', b.anim, 'c', b.color, 'e', b.emoji,
      'an', b.anon, 'sp', b.special,
      'f', case when b.special then null when (b.anon and sa) or ((not b.anon) and sn) then b.nick else null end) j
    from mc2_bubbles b
    where b.status = 'ok' and not b.special and not b.anon and b.to_uid = u and b.uid <> u
      and (b.session_id = p_session or b.session_id is null)
      and b.created_at > now() - make_interval(days => mc2_bub_keep_days())
      and not exists (select 1 from mc2_bub_seen s where s.bubble_id = b.id and s.uid = u)
    order by b.id limit 10) q;
  return items;
end $$;
grant execute on function public.mc2_bub_missed(int, text) to anon, authenticated;

-- দেখা হয়ে গেছে চিহ্নিত করা (শুধু নিজের নামে আসা বাবল)
create or replace function public.mc2_bub_seen(p_voter text, p_ids bigint[])
returns void language plpgsql security definer set search_path = public as $$
declare v text := left(coalesce(p_voter, ''), 80); u text;
begin
  if v = '' or p_ids is null then return; end if;
  u := mc2_uid(v);
  insert into mc2_bub_seen(bubble_id, uid)
    select b.id, u from mc2_bubbles b where b.id = any(p_ids[1:20]) and b.to_uid = u
    on conflict do nothing;
  delete from mc2_bub_seen where seen_at < now() - make_interval(days => mc2_bub_keep_days() + 1);
end $$;
grant execute on function public.mc2_bub_seen(text, bigint[]) to anon, authenticated;
