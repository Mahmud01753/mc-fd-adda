-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালালে ক্ষতি নেই
-- কাজ: User Info সদস্য-তালিকায় নামের পাশে মোট বার্তা (💬) ও রেস্ট্রিকশন (⛔) সংখ্যা।
-- SQL-8: চ্যাটের "👥 User Info" সদস্য-তালিকায় প্রতিটা নামের পাশে মোট বার্তা (💬) ও মোট রেস্ট্রিকশন (⛔) সংখ্যা — যেকোনো নামে ঢোকা পাবলিক দেখবে।
-- আগের mc2_ac_members-এর সবকিছু আছে, শুধু দুটো সংখ্যা যোগ হয়েছে: m = মোট বার্তা (এই সেশনে, মোছা বাদে), r = মোট রেস্ট্রিকশন (ক্ষমা-না-করা)।
-- আবার চালালেও ক্ষতি নেই। না চালালে: তালিকায় আগের মতোই শুধু নাম ও অনলাইন/Last Active দেখাবে (সংখ্যা আসবে না); নামে ক্লিক করলে কার্ডে সংখ্যা আগের SQL-5 থেকেই আসে।
-- পাবলিকে শুধু সংখ্যা যায় — কারণ, আইপি, ডিভাইস আইডি যায় না।
create or replace function mc2_ac_members(p_session int) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.onl desc, x.ls desc nulls last), '[]'::jsonb) from (
    select mc2_uid(v.voter) u,
      coalesce((select m.nick from mc2_ac_messages m where m.voter = v.voter and m.session_id = p_session order by m.id desc limit 1), p.nick, 'বেনামি') n,
      coalesce(mc2_online(p.last_seen, p.offline), false) onl,
      (extract(epoch from p.last_seen) * 1000)::bigint ls,
      coalesce(mc.c, 0)::int m,
      coalesce(rc.c, 0)::int r
    from (select voter from mc2_ac_messages where session_id = p_session and not hidden and created_at > now() - interval '30 days' group by voter
          union select voter from mc2_presence where chat_session_id = p_session and page = '#anon' and mc2_online(last_seen, offline)) v
    left join mc2_presence p on p.voter = v.voter
    left join (select voter, count(*) c from mc2_ac_messages where session_id = p_session and not deleted group by voter) mc on mc.voter = v.voter
    left join (select voter, count(*) c from fa_restrictions where not forgiven group by voter) rc on rc.voter = v.voter
    limit 80) x $$;
grant execute on function mc2_ac_members(int) to anon, authenticated;

-- চেক (চালানোর পর): select mc2_ac_members(<session_id>);  → প্রতিটা সদস্যে "m" ও "r" থাকবে
