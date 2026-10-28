-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৮, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-34 (part154): একই ডিভাইস থেকে নতুন ইউজার-আইডিতে ফিরে এলে শনাক্ত করা (ইনকগনিটো/ডাটা মোছার পরেও)
-- Supabase → SQL Editor-এ পুরোটা পেস্ট করে একবার Run করুন (আবার চালালেও ক্ষতি নেই)। আগে SQL-33 চালানো থাকতে হবে (fa_ip_key লাগে)।
--
-- কী করে:
--  ১) fa_dev_fp টেবিল: প্রতি ইউজার-আইডির সাথে তার ডিভাইসের "ছাপ" (স্ক্রিন, ভাষা, টাইমজোন, প্রসেসর, GPU ইত্যাদির হ্যাশ — ব্যক্তিগত কিছু নয়), ব্রাউজার-তথ্য (user-agent) ও আইপি। চ্যাটে ঢুকলে ব্রাউজার থেকে ৬ ঘণ্টায় সর্বোচ্চ একবার fa_dev_seen দিয়ে জমে।
--  ২) fa_admin_same_device(ইউজার): শুধু অ্যাডমিন — একই ছাপ/ব্রাউজার/আইপি মিললে অন্য কোন কোন ইউজার-আইডি, কতটা মিল। "খুব সম্ভব" = ছাপ+ব্রাউজার মিলেছে; "সম্ভাব্য" = শুধু ছাপ, বা শুধু ব্রাউজার+আইপি।
--
-- ⚠️ এটা শনাক্ত করার সংকেত, প্রমাণ নয়: একই মডেলের দুটো ফোনের ছাপ এক হতে পারে। তাই নিজে থেকে কাউকে ব্যান করে না — শুধু অ্যাডমিনকে দেখায়, সিদ্ধান্ত অ্যাডমিনের।
-- চালালে: ইউজার-ইনফোতে "📱 একই ডিভাইসের সম্ভাব্য অন্য আইডি" দেখায় (ইউজার এই আপডেটের পর চ্যাটে ঢুকলে তবেই তার ছাপ জমে)। না চালালে সাইট আগের মতোই চলে।

create table if not exists fa_dev_fp (
  voter      text primary key,
  fp         text not null,
  ua         text,
  ip         text,
  ip_key     text,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);
create index if not exists fa_dev_fp_fp on fa_dev_fp (fp);
create index if not exists fa_dev_fp_ipk on fa_dev_fp (ip_key);
alter table fa_dev_fp enable row level security;   -- সরাসরি টেবিল বন্ধ

create or replace function fa_dev_seen(p_voter text, p_fp text)
returns void language plpgsql security definer set search_path = public as $$
declare v text := coalesce(p_voter, ''); f text := lower(coalesce(p_fp, '')); ip text := mc2_ip();
begin
  if v !~ '^[A-Za-z0-9_-]{8,80}$' or f !~ '^[a-z0-9]{6,32}$' then return; end if;
  if not mc2_ac_rl('fp:v:' || v, 6, 3600) then return; end if;
  if ip is not null and not mc2_ac_rl('fp:ip:' || ip, 60, 3600) then return; end if;
  insert into fa_dev_fp (voter, fp, ua, ip, ip_key) values (v, f, left(coalesce(mc2_hdr('user-agent'), ''), 300), ip, fa_ip_key(ip))
  on conflict (voter) do update set fp = excluded.fp, ua = excluded.ua, ip = coalesce(excluded.ip, fa_dev_fp.ip), ip_key = coalesce(excluded.ip_key, fa_dev_fp.ip_key), last_seen = now();
end $$;
revoke all on function fa_dev_seen(text, text) from public;
grant execute on function fa_dev_seen(text, text) to anon, authenticated;

create or replace function fa_admin_same_device(p_voter text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('voter', x.voter, 'uid', mc2_uid(x.voter), 'nick', x.nick, 'last', (extract(epoch from x.last_seen) * 1000)::bigint,
             'lv', case when x.fpm and x.uam then 'high' else 'mid' end, 'fp', x.fpm, 'ua', x.uam, 'ip', x.ipm,
             'st', coalesce(mc2_ac_block(x.voter), 'ok')) order by x.sc desc, x.last_seen desc)
    from (
      select o.voter, o.last_seen,
             coalesce((select p.nick from mc2_presence p where p.voter = o.voter), (select m.nick from mc2_ac_messages m where m.voter = o.voter order by m.id desc limit 1)) as nick,
             (o.fp = me.fp) as fpm,
             (o.ua is not null and o.ua = me.ua) as uam,
             (o.ip_key is not null and o.ip_key = me.ip_key) as ipm,
             ((o.fp = me.fp)::int * 2 + (o.ua is not null and o.ua = me.ua)::int + (o.ip_key is not null and o.ip_key = me.ip_key)::int) as sc
        from fa_dev_fp o join fa_dev_fp me on me.voter = p_voter
       where o.voter <> p_voter
       order by sc desc, o.last_seen desc limit 60) x
    where x.sc >= 2), '[]'::jsonb);
end $$;
revoke all on function fa_admin_same_device(text) from public, anon;
grant execute on function fa_admin_same_device(text) to authenticated;

-- চেক (চালানোর পর): ১টা সারি — 0 আসবে (এখনো কারো ছাপ জমেনি)
select count(*) as fingerprints_saved from fa_dev_fp;
