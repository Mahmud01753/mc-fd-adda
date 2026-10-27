-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আর কখনো চালাবেন না — চালালে মাস্টার্সের সেশন-ক্রম আবার এলোমেলো হয়
-- কাজ: মাস্টার্স ও অনার্স আলাদা বিভাগ/সেশন; ডিফল্ট রুম = Political science Master’s ২০২৩-24।
-- ============================================================================
-- SQL-12-SPLIT-MASTERS-HONOURS-ROOMS-NO-RERUN.sql
-- Supabase → SQL Editor → New query → পুরোটা পেস্ট → Run (আবার চালালেও ক্ষতি নেই)
--
-- ১) এখনকার ডিফল্ট রুম (বিভাগ "রাষ্ট্রবিজ্ঞান", সেশন ২০২৩-২৪, ৫৭টা বার্তা) → বিভাগের নাম হবে
--    "Political science Master’s" (একই আইডি, বার্তা/পাসওয়ার্ড/ইউজার অক্ষত)। হোম ও চ্যাট হেডারে দেখাবে
--    "Political science Master’s · Session 2023-24"।
--    মাস্টার্সের সেশন: ২০২১-২২, ২০২২-২৩, ২০২৩-২৪ (ডিফল্ট, হোমে চালু), ২০২৪-২৫, ২০২৫-২৬, সবার শেষে অ্যালামনাই।
-- ২) আলাদা বিভাগ "Political science Honours" — নিজস্ব সেশন ২০১৭-১৮ … ২০২৫-২৬ + অ্যালামনাই।
--    মাস্টার্স আর অনার্সের সেশন আলাদা আইডি, তাই অনার্স ২০২৩-এর বার্তা মাস্টার্স ২০২৩-এ ঢুকবে না।
--    অনার্সের সব সেশন হোমে বন্ধ (home_on = false)। অ্যাডমিন → 📁 চ্যাট মডিফাই → "🏠 হোমে দেখান" দিলে
--    হোমে "Political science Honours / Master’s" ড্রপডাউন আসবে, বাছলে ওই বিভাগের সেশন আসবে।
-- ৩) মাস্টার্স থেকে ফাঁকা পুরোনো সেশন (২০১৭-১৮ … ২০২০-২১) সরে যায় — শুধু যেগুলোতে
--    কোনো বার্তা ও পাসওয়ার্ড নেই। অন্য বিভাগগুলোর ফাঁকা বাড়তি "অ্যালামনাই" কপিও মোছে (মাস্টার্স ও অনার্সেরটা থাকে)।
-- ৫) হোমে ডিফল্টে শুধু মাস্টার্স ২০২৩-২৪ চালু; আর সব সেশন বন্ধ (home_on = false)। বাকি সব অ্যাডমিন থেকে অন/অফ করা যায়।
-- ৪) আগের খসড়া SQL-12 (সেশন রিনেইম) চালানো হয়ে থাকলে সেটা ফিরিয়ে নেয়।
-- ============================================================================
do $$
declare
  m int; h int;
  v_old text := 'Political science Master’s 2023-24';
  v_ms text[] := array['২০২১-২২','২০২২-২৩','২০২৩-২৪','২০২৪-২৫','২০২৫-২৬','অ্যালামনাই'];
  v_hs text[] := array['২০১৭-১৮','২০১৮-১৯','২০১৯-২০','২০২০-২১','২০২১-২২','২০২২-২৩','২০২৩-২৪','২০২৪-২৫','২০২৫-২৬','অ্যালামনাই'];
  i int;
begin
  -- মাস্টার্স বিভাগ: পুরোনো "রাষ্ট্রবিজ্ঞান"-কেই নাম বদলে (আইডি একই)
  select id into m from mc2_ac_depts where name = 'Political science Master’s';
  if m is null then
    select id into m from mc2_ac_depts where name = 'রাষ্ট্রবিজ্ঞান';
    if m is not null then
      update mc2_ac_depts set name = 'Political science Master’s', sort = 1, active = true where id = m;
    else
      insert into mc2_ac_depts (name, sort) values ('Political science Master’s', 1) returning id into m;
    end if;
  end if;
  update mc2_ac_depts set sort = 1, active = true where id = m;

  -- আগের খসড়া SQL-12 চালানো থাকলে ফিরিয়ে নেওয়া
  if exists (select 1 from mc2_ac_sessions where dept_id = m and name = v_old) then
    delete from mc2_ac_sessions s where s.dept_id = m and s.name = '২০২৩-২৪'
      and not exists (select 1 from mc2_ac_messages x where x.session_id = s.id);
    update mc2_ac_sessions set name = '২০২৩-২৪' where dept_id = m and name = v_old;
  end if;

  -- মাস্টার্সের ৫টা সেশন
  for i in 1 .. array_length(v_ms, 1) loop
    insert into mc2_ac_sessions (dept_id, name, sort, active) values (m, v_ms[i], i, true)
    on conflict (dept_id, name) do update set sort = i, active = true;
  end loop;

  -- মাস্টার্স থেকে ফাঁকা পুরোনো সেশন সরানো (বার্তা বা পাসওয়ার্ড থাকলে ছোঁয় না)
  delete from mc2_ac_sessions s
   where s.dept_id = m and s.name in ('২০১৭-১৮','২০১৮-১৯','২০১৯-২০','২০২০-২১')
     and s.pw_hash is null
     and not exists (select 1 from mc2_ac_messages x where x.session_id = s.id);

  -- অনার্স বিভাগ + সব সেশন (হোমে বন্ধ)
  select id into h from mc2_ac_depts where name = 'Political science Honours';
  if h is null then
    insert into mc2_ac_depts (name, sort) values ('Political science Honours', 2) returning id into h;
  end if;
  update mc2_ac_depts set sort = 2, active = true where id = h;
  for i in 1 .. array_length(v_hs, 1) loop
    insert into mc2_ac_sessions (dept_id, name, sort, active) values (h, v_hs[i], i, true)
    on conflict (dept_id, name) do update set sort = i, active = true;
  end loop;

  -- অন্য বিভাগগুলোর ফাঁকা বাড়তি "অ্যালামনাই" কপি মোছা (অনার্সেরটা থাকে; বার্তা/পাসওয়ার্ড থাকলে ছোঁয় না)
  delete from mc2_ac_sessions s
   where s.name = 'অ্যালামনাই' and s.dept_id <> h and s.dept_id <> m
     and s.pw_hash is null
     and not exists (select 1 from mc2_ac_messages x where x.session_id = s.id);

  -- হোমে ডিফল্ট: শুধু মাস্টার্স ২০২৩-২৪ চালু, বাকি সব বন্ধ
  update mc2_ac_sessions set home_on = false where home_on;
  update mc2_ac_sessions set home_on = true where dept_id = m and name = '২০২৩-২৪';
end $$;

-- ফল: প্রথমে মাস্টার্স (২০২৩-২৪-এ বার্তা, শুধু ওটাই home_on = true; শেষে অ্যালামনাই), তারপর অনার্স (সব false, ০ বার্তা)
select d.name as dept, s.name as session, s.sort, s.home_on,
       (select count(*) from mc2_ac_messages m where m.session_id = s.id) as messages
  from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id
 where d.name like 'Political science%'
 order by d.sort, s.sort;
