-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালালে ক্ষতি নেই
-- কাজ: চ্যাটে ঢোকার সময়ই নাম রেকর্ড, তাই নামের ইতিহাস ও 🎭 ব্যাজ কাজ করে।
-- SQL-10: চ্যাটে ঢোকার সময়ই নাম রেকর্ড (আগে শুধু ভেতরে ✎ দিয়ে নাম বদলালে লেখা হতো, তাই "📝 নামের ইতিহাস" ফাঁকা থাকত)।
-- আগে SQL-6 চালানো থাকতে হবে (fa_name_history টেবিল)। আবার চালালেও ক্ষতি নেই।
-- চালালে: হোম থেকে নাম লিখে ঢুকলেও ইতিহাসে এন্ট্রি পড়বে; অ্যাডমিন কার্ডে "🎭 N টি নাম" ব্যাজ ও নাম-ভিত্তিক হিসাব আসবে।
-- না চালালে: সাইট আগের মতোই চলবে (চ্যাট থেকে চুপচাপ ব্যর্থ হয়), শুধু ট্যাব ফাঁকা থাকবে ও 🎭 ব্যাজ আসবে না।
-- আইপি/ডিভাইস আইডি পাবলিকে যায় না; অ্যাডমিন-ফাংশনগুলো সার্ভারেও অ্যাডমিন যাচাই করে।

-- ১) চ্যাটে ঢোকার সময় ডাকা হয়: শেষ রেকর্ডের নাম থেকে আলাদা হলে (প্রথমবার হলে পুরোনো = ফাঁকা) এন্ট্রি লেখে।
--    mc2_ac_rename-এর মতোই ঘণ্টায় ১০ বারের সীমা ও প্রতি ইউজারের সর্বশেষ ২০০টা রাখা; কিন্তু পুরোনো বার্তার নাম বদলায় না।
--    (সীমা গোনা হয় শুধু আসলে লেখার সময় — একই নামে বারবার ঢুকলে সীমা খরচ হয় না।)
create or replace function fa_name_log(p_voter text, p_nick text) returns void language plpgsql security definer set search_path = public as $$
declare n text := mc2_ac_clean(p_nick, 30); last_n text;
begin
  if n = '' or coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' then return; end if;
  select h.new_nick into last_n from fa_name_history h where h.voter = p_voter order by h.id desc limit 1;
  if last_n is not null and last_n = n then return; end if;
  if not mc2_ac_rl('nlog:v:' || p_voter || ':3600', 10, 3600) then return; end if;
  insert into fa_name_history (voter, uid, old_nick, new_nick) values (p_voter, coalesce(mc2_uid(p_voter), ''), coalesce(last_n, ''), n);
  delete from fa_name_history where voter = p_voter and id not in (select id from fa_name_history where voter = p_voter order by id desc limit 200);
end $$;
grant execute on function fa_name_log(text, text) to anon, authenticated;

-- ২) অ্যাডমিন: কোন ইউজার আইডি কয়টা আলাদা নাম ব্যবহার করেছে (শুধু ২ বা বেশি নামধারীরা) → [{u, c}]
create or replace function fa_admin_name_counts() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('u', z.uid, 'c', z.c))
                   from (select s.uid, count(distinct lower(s.nm)) c
                         from (select uid, new_nick nm from fa_name_history where uid <> ''
                               union all select uid, old_nick from fa_name_history where uid <> '' and old_nick <> '') s
                         group by s.uid having count(distinct lower(s.nm)) > 1) z), '[]'::jsonb);
end $$;
grant execute on function fa_admin_name_counts() to authenticated;

-- ৩) অ্যাডমিন: একজনের (ইউজার আইডি) প্রতিটা নামে কয়টা বার্তা/রেস্ট্রিকশন, কখন থেকে কখন → [{n, m, r, f, l}]
--    বার্তার নাম = বার্তা পাঠানোর সময়ের নাম (✎ দিয়ে আগে বদলানো পুরোনো বার্তা আগের SQL-6 নিয়মে নতুন নামে আছে)।
create or replace function fa_admin_name_stats(p_uid text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  select h.voter into v from fa_name_history h where h.uid = p_uid order by h.id desc limit 1;
  if v is null then select p.voter into v from mc2_presence p where mc2_uid(p.voter) = p_uid limit 1; end if;
  if v is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('n', z.nm, 'm', z.m, 'r', z.r, 'f', z.f, 'l', z.l) order by z.l desc nulls last)
    from (select coalesce(a.nm, b.nm) nm, coalesce(a.m, 0) m, coalesce(b.r, 0) r,
                 least(a.f, b.f) f, greatest(a.l, b.l) l
          from (select m.nick nm, count(*) filter (where not m.deleted) m, (extract(epoch from min(m.created_at)) * 1000)::bigint f, (extract(epoch from max(m.created_at)) * 1000)::bigint l
                from mc2_ac_messages m where m.voter = v group by m.nick) a
          full join (select r.nick nm, count(*) filter (where not r.forgiven) r, (extract(epoch from min(r.created_at)) * 1000)::bigint f, (extract(epoch from max(r.created_at)) * 1000)::bigint l
                     from fa_restrictions r where r.voter = v group by r.nick) b on lower(a.nm) = lower(b.nm)) z), '[]'::jsonb);
end $$;
grant execute on function fa_admin_name_stats(text) to authenticated;

notify pgrst, 'reload schema';

-- চেক (চালানোর পর): select fa_name_log('test-device-0001', 'টেস্ট'); select count(*) from fa_name_history where voter = 'test-device-0001';  → ১
-- (টেস্ট এন্ট্রি মুছতে: delete from fa_name_history where voter = 'test-device-0001';)
