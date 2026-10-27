-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালালে ক্ষতি নেই, কিন্তু চালালে পরে SQL-14 আবার চালাতে হবে (৯ পুরোনো mc2_ac_meta বসায়, ১৪ নতুনটা)
-- কাজ: অ্যাডমিন বার্তা সরালে সবাই "অ্যাডমিন সরিয়েছেন" ও ঐচ্ছিক অ্যাডমিন নোট দেখে।
-- SQL-9: অ্যাডমিন চ্যাটে কোনো বার্তা সরালে সবাই "🛡️ অ্যাডমিন এই বার্তাটি সরিয়েছেন" দেখে; অ্যাডমিন নোট লিখলে সেটাও তার নিচে সবাইকে দেখায় (না লিখলে আগের মতোই শুধু ঐ লাইন)।
-- কী বদলায়: (১) mc2_ac_messages-এ নতুন কলাম mod_note (পাবলিক পড়তে পারবে); (২) mc2_ac_admin_remove নোটটা সেখানে রাখে; (৩) mc2_ac_meta পোলিংয়ে mr/mn পাঠায়, তাই যাঁরা চ্যাট খুলে আছেন তাঁদের স্ক্রিনেও সাথে সাথে আপডেট হয়।
-- আবার চালালেও ক্ষতি নেই। না চালালে: সরানো বার্তায় আগের মতোই শুধু "অ্যাডমিন সরিয়েছেন" দেখাবে, নোট আসবে না; বাকি সব ঠিক চলবে (সাইট ভাঙবে না)।
-- অ্যাডমিন নোটে ব্যক্তিগত কিছু লিখবেন না — এটা সেশনের সবাই দেখে। নোটের লগ আগের মতো অ্যাডমিন-লগেও থাকে।
alter table mc2_ac_messages add column if not exists mod_note text;
grant select (mod_note) on mc2_ac_messages to anon;

create or replace function mc2_ac_admin_remove(p_msg bigint, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a text := mc2_ac_adm(); m record;
begin
  select id, voter, file_path into m from mc2_ac_messages where id = p_msg;
  if not found then raise exception 'বার্তা পাওয়া যায়নি'; end if;
  update mc2_ac_messages set deleted = true, mod_removed = true, mod_note = nullif(mc2_ac_clean(p_reason, 300), ''), body = '', kind = 'text', file_path = null, file_name = null, file_size = null, file_mime = null, reply_to = null, reply_nick = null, reply_text = null where id = p_msg;
  update mc2_ac_messages set reply_text = 'মুছে ফেলা বার্তা' where reply_to = p_msg;
  delete from mc2_ac_reactions where message_id = p_msg;
  perform mc2_ac_log(m.voter, 'msg_remove', mc2_ac_clean(p_reason, 300), null, a, p_msg);
  return jsonb_build_object('file', m.file_path);
end $$;

-- পোলিং: আগের mc2_ac_meta-র সবকিছু আছে, প্রতি বার্তায় শুধু 'mr' (অ্যাডমিন সরিয়েছে কিনা) ও 'mn' (অ্যাডমিন নোট) যোগ হয়েছে
create or replace function mc2_ac_meta(p_session int, p_min bigint, p_voter text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('up', mc2_ac_upload_on(), 'me', mc2_ac_me(p_voter),
    'on', (select count(*) from mc2_presence p where p.chat_session_id = p_session and p.page = '#anon' and mc2_online(p.last_seen, p.offline)),
    'rows', coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', m.id, 'n', m.nick, 'd', m.deleted, 'o', m.voter = p_voter, 'u', mc2_uid(m.voter),
      'a', exists (select 1 from mc2_presence p where p.voter = m.voter and mc2_online(p.last_seen, p.offline)),
      'r', (select coalesce(jsonb_object_agg(e, c), '{}'::jsonb) from (select emoji e, count(*) c from mc2_ac_reactions r where r.message_id = m.id group by emoji) z),
      'm', (select emoji from mc2_ac_reactions r where r.message_id = m.id and r.voter = p_voter),
      's', (select count(*) from mc2_ac_seen s where s.session_id = m.session_id and s.last_id >= m.id and s.voter <> m.voter),
      'mr', m.mod_removed, 'mn', m.mod_note) x
    from mc2_ac_messages m where m.session_id = p_session and m.id >= p_min and not m.hidden order by m.id desc limit 500) t), '[]'::jsonb)) $$;
grant execute on function mc2_ac_meta(int, bigint, text) to anon, authenticated;

-- চেক (চালানোর পর): select column_name from information_schema.columns where table_name = 'mc2_ac_messages' and column_name = 'mod_note';  → ১টা সারি
