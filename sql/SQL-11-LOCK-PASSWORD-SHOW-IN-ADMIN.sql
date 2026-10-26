-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালালে ক্ষতি নেই
-- কাজ: লকের পাসওয়ার্ড অ্যাডমিন প্যানেলে 👁 দেখা/📋 কপি।
-- SQL-11: লকের পাসওয়ার্ড অ্যাডমিন প্যানেলে দেখা (👁 দেখান / 🙈 লুকান / 📋 কপি)।
-- আগে শুধু হ্যাশ (pw_hash) সেভ হতো, তাই দেখানো যেত না। এখন থেকে নতুন বসানো পাসওয়ার্ড pw_plain কলামেও থাকবে।
-- জনসাধারণ (anon) pw_plain কখনো পড়তে পারে না (কলামে grant নেই); পড়ার ফাংশনগুলো সার্ভারে অ্যাডমিন যাচাই করে।
-- আগে SQL-1 ও SQL-2 চালানো থাকতে হবে। আবার চালালেও ক্ষতি নেই।
-- চালালে: 🔒 লক ও নোটিশ এবং 📁 চ্যাট মডিফাই-এ "বর্তমান পাসওয়ার্ড" দেখা যায় (এই SQL-এর পরে বসানো পাসওয়ার্ড)।
-- না চালালে: সাইট আগের মতোই চলে; "দেখান" চাপলে "SQL-11 চালান" লেখা আসে। আগে বসানো পাসওয়ার্ড (শুধু হ্যাশ) কখনোই দেখা যায় না — নতুন দিতে হবে।

-- ১) প্লেইন-পাসওয়ার্ড কলাম (পাবলিকে grant নয়)
alter table mc2_ac_sessions add column if not exists pw_plain text;
revoke all (pw_plain) on mc2_ac_sessions from public, anon;

-- ২) এক সেশনের পাসওয়ার্ড বসানো/বদলানো/সরানো — আগের মতোই, সাথে pw_plain লেখে (খালি = সরানো, দুটোই মোছে)
create or replace function mc2_ac_admin_setpw(p_session int, p_pw text) returns void language plpgsql security definer set search_path = public as $$
declare w text := btrim(coalesce(p_pw, ''));
begin
  perform mc2_ac_adm();
  if w = '' then update mc2_ac_sessions set pw_hash = null, pw_plain = null, pw_on = false where id = p_session;
  else
    if char_length(w) not between 3 and 40 then raise exception 'পাসওয়ার্ড ৩ থেকে ৪০ অক্ষরের হতে হবে'; end if;
    update mc2_ac_sessions set pw_hash = mc2_ac_pwh(p_session, w), pw_plain = w, pw_on = true where id = p_session;
  end if;
  delete from mc2_ac_access where session_id = p_session;
end $$;
revoke all on function mc2_ac_admin_setpw(int, text) from public, anon;
grant execute on function mc2_ac_admin_setpw(int, text) to authenticated;

-- ৩) একসাথে (বিভাগ/সব) পাসওয়ার্ড বসানো/সরানো — আগের মতোই, সাথে pw_plain
create or replace function mc2_ac_admin_setpw_bulk(p_scope text, p_dept int, p_pw text) returns int language plpgsql security definer set search_path = public as $$
declare w text := btrim(coalesce(p_pw, '')); n int;
begin
  perform mc2_ac_adm();
  if p_scope not in ('all', 'dept') then raise exception 'অবৈধ পরিসর'; end if;
  if p_scope = 'dept' and p_dept is null then raise exception 'বিভাগ বাছুন'; end if;
  if w <> '' and char_length(w) not between 3 and 40 then raise exception 'পাসওয়ার্ড ৩ থেকে ৪০ অক্ষরের হতে হবে'; end if;
  if w = '' then
    update mc2_ac_sessions set pw_hash = null, pw_plain = null, pw_on = false where p_scope = 'all' or dept_id = p_dept;
  else
    update mc2_ac_sessions set pw_hash = mc2_ac_pwh(id, w), pw_plain = w, pw_on = true where p_scope = 'all' or dept_id = p_dept;
  end if;
  get diagnostics n = row_count;
  delete from mc2_ac_access where session_id in (select id from mc2_ac_sessions where p_scope = 'all' or dept_id = p_dept);
  return n;
end $$;
revoke all on function mc2_ac_admin_setpw_bulk(text, int, text) from public, anon;
grant execute on function mc2_ac_admin_setpw_bulk(text, int, text) to authenticated;

-- ৪) শুধু অ্যাডমিন: এক সেশনের বর্তমান পাসওয়ার্ড (null = নেই, বা পুরোনো — শুধু হ্যাশ ছিল)
create or replace function fa_admin_pw_get(p_session int) returns text language plpgsql stable security definer set search_path = public as $$
begin
  perform mc2_ac_adm();
  return (select s.pw_plain from mc2_ac_sessions s where s.id = p_session and s.pw_hash is not null);
end $$;
revoke all on function fa_admin_pw_get(int) from public, anon;
grant execute on function fa_admin_pw_get(int) to authenticated;

-- ৫) শুধু অ্যাডমিন: একসাথে-লকের পরিসরের (সব / এক বিভাগ) বর্তমান পাসওয়ার্ড — {total, none, old, list:[{pw, n}]}
--    none = পাসওয়ার্ড নেই, old = পাসওয়ার্ড আছে কিন্তু শুধু হ্যাশ (দেখা যায় না)
create or replace function fa_admin_pw_scope(p_scope text, p_dept int) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform mc2_ac_adm();
  if p_scope not in ('all', 'dept') then raise exception 'অবৈধ পরিসর'; end if;
  select jsonb_build_object(
      'total', count(*),
      'none', count(*) filter (where s.pw_hash is null),
      'old', count(*) filter (where s.pw_hash is not null and s.pw_plain is null),
      'list', coalesce((select jsonb_agg(jsonb_build_object('pw', z.pw_plain, 'n', z.c) order by z.c desc)
                         from (select s2.pw_plain, count(*) as c from mc2_ac_sessions s2
                                where (p_scope = 'all' or s2.dept_id = p_dept) and s2.pw_hash is not null and s2.pw_plain is not null
                                group by s2.pw_plain) z), '[]'::jsonb))
    into r from mc2_ac_sessions s where (p_scope = 'all' or s.dept_id = p_dept);
  return r;
end $$;
revoke all on function fa_admin_pw_scope(text, int) from public, anon;
grant execute on function fa_admin_pw_scope(text, int) to authenticated;
