-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালালে ক্ষতি নেই
-- কাজ: মাস্টার্স/অনার্সের সেশনের সাজানোর ক্রম ঠিক (২০১৭-১৮ → … → অ্যালামনাই)।
-- ============================================================================
-- SQL-13-MASTERS-SESSION-ORDER-FIX.sql
-- Supabase → SQL Editor → New query → পুরোটা পেস্ট → Run (আবার চালালেও ক্ষতি নেই)
--
-- কোনো বার্তা/সেশন মোছে না, নাম বা home_on বদলায় না — শুধু সেশনের সাজানোর নম্বর (sort) ঠিক করে।
-- মাস্টার্সে ২০১৭-১৮ ও ২০১৯-২০ (পুরোনো বার্তাসহ) মাস্টার্সেই থাকে; ক্রম হবে
--   ২০১৭-১৮, ২০১৯-২০, ২০২১-২২, ২০২২-২৩, ২০২৩-২৪, ২০২৪-২৫, ২০২৫-২৬, সবার শেষে অ্যালামনাই।
-- অনার্সও একইভাবে সাজানো (ইতিমধ্যে ঠিক থাকলে কিছুই বদলায় না)।
-- ============================================================================
with ranked as (
  select s.id,
         row_number() over (partition by s.dept_id order by (s.name = 'অ্যালামনাই'), s.name) as rn
    from mc2_ac_sessions s
    join mc2_ac_depts d on d.id = s.dept_id
   where d.name in ('Political science Master’s', 'Political science Honours')
)
update mc2_ac_sessions s set sort = r.rn from ranked r where r.id = s.id and s.sort is distinct from r.rn;

-- ফল (বার্তার সংখ্যা মিলিয়ে দেখুন — কিছু কমেনি); শেষ সারিতে মোট বার্তা
select d.name as dept, s.name as session, s.sort, s.home_on,
       (select count(*) from mc2_ac_messages m where m.session_id = s.id) as messages
  from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id
 where d.name like 'Political science%'
 order by d.sort, s.sort;

select count(*) as total_messages_all_rooms from mc2_ac_messages;
