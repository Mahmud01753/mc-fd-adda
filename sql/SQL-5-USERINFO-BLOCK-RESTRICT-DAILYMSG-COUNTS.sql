-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালানোর দরকার নেই
-- কাজ: User Info কার্ডে ব্লক, রেস্ট্রিকশন ও দৈনিক বার্তার সংখ্যা।
-- SQL-5: User Info কার্ডে — ব্লক/রেস্ট্রিকশন স্ট্যাটাস + মোট বার্তা + আজকের বার্তা + গত ৭ দিনের দৈনিক বার্তা
-- আগের mc2_ac_usercard-এর সবকিছু আছে, শুধু নতুন ফিল্ড যোগ হয়েছে। আবার চালালেও ক্ষতি নেই।
-- না চালালে: কার্ডে আগের মতোই শুধু "বার্তা: N টি" দেখাবে, নতুন অংশ আসবে না (সাইট ভাঙবে না)।
-- পাবলিক ভিউতে শুধু হ্যাঁ/না + সংখ্যা যায় — কারণ, আইপি, ডিভাইস আইডি যায় না। সময়: Asia/Dhaka।
create or replace function mc2_ac_usercard(p_session int, p_uid text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v text; p mc2_presence; dn text; sn text; dday date := (now() at time zone 'Asia/Dhaka')::date;
begin
  select m.voter into v from mc2_ac_messages m where m.session_id = p_session and mc2_uid(m.voter) = p_uid limit 1;
  if v is null then select pr.voter into v from mc2_presence pr where pr.chat_session_id = p_session and mc2_uid(pr.voter) = p_uid limit 1; end if;
  if v is null then return null; end if;
  select * into p from mc2_presence where voter = v;
  select d.name, s.name into dn, sn from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.id = p_session;
  return jsonb_build_object('u', p_uid,
    'n', coalesce((select m.nick from mc2_ac_messages m where m.voter = v and m.session_id = p_session order by m.id desc limit 1), p.nick, 'বেনামি'),
    'dept', dn, 'sess', sn,
    'best', (select max(score) from mc2_scores where device = v), 'pct', (select max(pct) from mc2_scores where device = v), 'plays', (select count(*) from mc2_scores where device = v),
    'onl', coalesce(mc2_online(p.last_seen, p.offline), false), 'ls', (extract(epoch from p.last_seen) * 1000)::bigint,
    'msgs', (select count(*) from mc2_ac_messages where voter = v and session_id = p_session and not deleted),
    -- নতুন ↓
    'today', (select count(*) from mc2_ac_messages where voter = v and session_id = p_session and not deleted and (created_at at time zone 'Asia/Dhaka')::date = dday),
    'days', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(g.d, 'YYYY-MM-DD'), 'n', coalesce(c.n, 0)) order by g.d desc)
                      from (select generate_series((dday - 6)::timestamp, dday::timestamp, interval '1 day')::date as d) g
                      left join (select (created_at at time zone 'Asia/Dhaka')::date as d, count(*) as n from mc2_ac_messages
                                 where voter = v and session_id = p_session and not deleted and created_at > now() - interval '9 days' group by 1) c on c.d = g.d), '[]'::jsonb),
    'banned', (exists (select 1 from mc2_ac_mod where voter = v and state = 'banned' and (until is null or until > now()))
               or exists (select 1 from mc2_chat_bans where voter = v and until > now())),
    'restricted', (exists (select 1 from fa_restrictions where voter = v and lifted_at is null and until > now())
                   or exists (select 1 from mc2_ac_mod where voter = v and state = 'restricted' and until > now())),
    'ru', (select (extract(epoch from max(z.u)) * 1000)::bigint
           from (select until as u from fa_restrictions where voter = v and lifted_at is null and until > now()
                 union all select until from mc2_ac_mod where voter = v and state = 'restricted' and until > now()) z),
    'rcnt', (select count(*) from fa_restrictions where voter = v and not forgiven));
end $$;
grant execute on function mc2_ac_usercard(int, text) to anon, authenticated;

-- চেক (চালানোর পর): যেকোনো একটা সক্রিয় ইউজারের কার্ডে নতুন ফিল্ড আসছে কিনা
-- select mc2_ac_usercard(<session_id>, '<user id>');
