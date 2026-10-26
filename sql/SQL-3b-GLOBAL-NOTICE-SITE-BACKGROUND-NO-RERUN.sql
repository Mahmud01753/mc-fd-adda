-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালাবেন না (শুধু নতুন Supabase প্রজেক্টে একবার)
-- কাজ: সর্বজনীন নোটিশ ও সাইটের ব্যাকগ্রাউন্ড।
-- ✅ চালানো সম্পন্ন (২০২৬-১০-২৪)। আবার চালাতে হবে না।
-- ############################################################################
-- NEW-SQL-RUN-THESE.sql — Supabase → SQL Editor-এ এই পুরো ফাইল একবার Run করুন।
-- আবার চালালেও ক্ষতি নেই। এতে ৩টা অংশ আছে:
--   (১) রুম ঠিক করা + home_on (হোমে রুম অন/অফ) + পুরোনো ৫৭ বার্তা
--   (২) সাইটের ব্যাকগ্রাউন্ড (কাস্টম ছবিসহ) — আগে supabase-bg.sql চালিয়ে থাকলেও চলবে
--   (৩) নোটিশ দেখান/লুকান (pw_note_on)
--   (৪) সর্বজনীন নোটিশ (fa_global_notice)
-- শেষে "চেক" সিলেক্টে হোমে চালু রুমের নাম দেখাবে।
-- ############################################################################

-- (১) ====================================================================
-- ============================================================================
-- ROOM-FIX-AND-IMPORT.sql  (Supabase → SQL Editor → একবার Run; আবার চালালেও ক্ষতি নেই)
-- ১) "রাষ্ট্রবিজ্ঞান" বিভাগ + ২০১৭-১৮ … ২০২৫-২৬, অ্যালামনাই সেশন না থাকলে বানায় (হোমে "রুম পাওয়া যায়নি" এর আসল কারণ এটাই হতে পারে)
-- ২) mc2_ac_sessions-এ home_on কলাম (অ্যাডমিন থেকে হোমে রুম অন/অফ)। প্রথমবার শুধু রাষ্ট্রবিজ্ঞান ২০২৩-২৪ অন হবে
-- ৩) পুরোনো ৫৭টি বার্তা (IP সহ) আবার বসায় (আগে থাকলে শুধু IP আপডেট)
-- ============================================================================
insert into mc2_ac_depts (name, sort) values ('রাষ্ট্রবিজ্ঞান', 1) on conflict (name) do nothing;
update mc2_ac_depts set active = true where name = 'রাষ্ট্রবিজ্ঞান';

insert into mc2_ac_sessions (dept_id, name, sort)
select d.id, x.n, x.o from mc2_ac_depts d,
  (values ('২০১৭-১৮',1),('২০১৮-১৯',2),('২০১৯-২০',3),('২০২০-২১',4),('২০২১-২২',5),('২০২২-২৩',6),('২০২৩-২৪',7),('২০২৪-২৫',8),('২০২৫-২৬',9),('অ্যালামনাই',10)) as x(n, o)
where d.name = 'রাষ্ট্রবিজ্ঞান'
on conflict (dept_id, name) do nothing;
update mc2_ac_sessions s set active = true from mc2_ac_depts d where d.id = s.dept_id and d.name = 'রাষ্ট্রবিজ্ঞান' and s.name = '২০২৩-২৪';

alter table mc2_ac_sessions add column if not exists home_on boolean not null default false;
grant select (home_on) on mc2_ac_sessions to anon;
do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'mc2_ac_sessions' and column_name = 'pw_note') then
    execute 'grant select (pw_note) on mc2_ac_sessions to anon';
  end if;
end $$;
update mc2_ac_sessions s set home_on = true from mc2_ac_depts d
where d.id = s.dept_id and d.name = 'রাষ্ট্রবিজ্ঞান' and s.name = '২০২৩-২৪'
  and not exists (select 1 from mc2_ac_sessions where home_on);

-- (আইপি লুকানো: সব 0.0.0.0) চ্যাটের পুরোনো বার্তা + IP আমদানি (আগে চালানো হলেও ঠিক আছে, শুধু IP বসবে)। রুম/সেশন আগেই আছে, নাম ধরে মেলানো হয়।
alter table mc2_ac_messages disable trigger user;
insert into mc2_ac_messages (id, dept_id, session_id, nick, body, voter, created_at, reply_to, reply_nick, reply_text, deleted, ip)
select v.id, s.dept_id, s.id, v.nick, v.body, v.voter, v.ts::timestamptz, v.rt::bigint, v.rn, v.rx, v.de::boolean, v.ip
from (values
(33,93,'Asire vai','Ok','dmvhcv7qkc6qx3b4p','2026-10-21T00:13:04+00',null,null,null,'f','0.0.0.0'),
(34,93,'Asire vai','😁','dmvhcv7qkc6qx3b4p','2026-10-21T00:13:13+00',null,null,null,'f','0.0.0.0'),
(35,93,'Asire vai','Kni','dmvicfjsdm5an2p2b','2026-10-21T16:46:28+00',null,null,null,'f','0.0.0.0'),
(36,93,'Asire vai','😜','dmvicfjsdm5an2p2b','2026-10-21T16:46:33+00',null,null,null,'f','0.0.0.0'),
(37,93,'Asire vai','Koi','dmvicfjsdm5an2p2b','2026-10-21T16:46:59+00','35','Asire vai','Kni','f','0.0.0.0'),
(38,93,'Asire vai','Ay','dmvicfjsdm5an2p2b','2026-10-21T16:47:09+00','32','হুকুম কারী','🙃','f','0.0.0.0'),
(39,91,'নাই নাম','Hi','dmvide3ubmnh6w6u6','2026-10-21T18:08:54+00',null,null,null,'f','0.0.0.0'),
(40,93,'Asire vai','Ki','dmvill0hpmjwspsoy','2026-10-21T21:07:23+00',null,null,null,'f','0.0.0.0'),
(41,93,'Asire vai','Kno','dmvill0hpmjwspsoy','2026-10-21T21:07:29+00','38','Asire vai','Ay','f','0.0.0.0'),
(42,93,'asi re','kno','dmvjdjiafg89frvuv','2026-10-22T10:12:33+00',null,null,null,'f','0.0.0.0'),
(43,93,'asi re','😎','dmvjdjiafg89frvuv','2026-10-22T10:12:37+00',null,null,null,'f','0.0.0.0'),
(44,97,'Zara mehjabin jui','Assalamualaikum','dmvjwy4lsk5qjj6dh','2026-10-22T19:09:42+00',null,null,null,'f','0.0.0.0'),
(45,97,'বেথেলহামের নক্ষত্র','Walaikum salam','dmvjwy83tc7f12qwc','2026-10-22T19:11:13+00',null,null,null,'f','0.0.0.0'),
(46,97,'বেথেলহামের নক্ষত্র','Hi president Trump','dmvjwy83tc7f12qwc','2026-10-22T19:11:28+00',null,null,null,'f','0.0.0.0'),
(47,97,'President Trump😁','Hellllo','dmvjwy04pg5vvb4ui','2026-10-22T19:11:29+00',null,null,null,'f','0.0.0.0'),
(48,97,'বেথেলহামের নক্ষত্র','Kiya huya','dmvjwy83tc7f12qwc','2026-10-22T19:11:58+00',null,null,null,'f','0.0.0.0'),
(49,97,'President Trump😁','yes,, what do you want?','dmvjwy04pg5vvb4ui','2026-10-22T19:12:10+00',null,null,null,'f','0.0.0.0'),
(50,97,'Fahmida Akter Jafrin','Hlw','dmvjx21ir03vb9mew','2026-10-22T19:12:14+00',null,null,null,'f','0.0.0.0'),
(51,97,'বেথেলহামের নক্ষত্র','Good','dmvjwy83tc7f12qwc','2026-10-22T19:13:06+00',null,null,null,'f','0.0.0.0'),
(52,97,'বেথেলহামের নক্ষত্র','Your mundu','dmvjwy83tc7f12qwc','2026-10-22T19:13:22+00','49','President Trump😁','yes,, what do you want?','f','0.0.0.0'),
(53,97,'বেথেলহামের নক্ষত্র','Hi jafrin kmn aco','dmvjwy83tc7f12qwc','2026-10-22T19:13:49+00','50','Fahmida Akter Jafrin','Hlw','f','0.0.0.0'),
(54,97,'বেথেলহামের নক্ষত্র','Koi ba Trump','dmvjwy83tc7f12qwc','2026-10-22T19:15:42+00',null,null,null,'f','0.0.0.0'),
(55,97,'President Trump😁','its not possible','dmvjwy04pg5vvb4ui','2026-10-22T19:15:54+00','52','Hi','Your mundu','f','0.0.0.0'),
(56,97,'বেথেলহামের নক্ষত্র','Why','dmvjwy83tc7f12qwc','2026-10-22T19:17:11+00','55','President Trump😁','its not possible','f','0.0.0.0'),
(57,97,'President Trump😁','I am the president of this world😁','dmvjwy04pg5vvb4ui','2026-10-22T19:17:35+00',null,null,null,'f','0.0.0.0'),
(58,97,'বেথেলহামের নক্ষত্র','I am the ruler of trump.','dmvjwy83tc7f12qwc','2026-10-22T19:18:11+00','57','President Trump😁','I am the president of this world😁','f','0.0.0.0'),
(59,97,'President Trump😁','good,,, baca akdin asio amr white house 😃','dmvjwy04pg5vvb4ui','2026-10-22T19:22:28+00',null,null,null,'f','0.0.0.0'),
(60,97,'বেথেলহামের নক্ষত্র','Ok','dmvjwy83tc7f12qwc','2026-10-22T19:32:11+00',null,null,null,'f','0.0.0.0'),
(61,97,'বেথেলহামের নক্ষত্র','Tik ace','dmvjwy83tc7f12qwc','2026-10-22T19:32:29+00',null,null,null,'f','0.0.0.0'),
(62,97,'বেথেলহামের নক্ষত্র','','dmvjwy83tc7f12qwc','2026-10-22T19:43:12+00',null,null,null,'t','0.0.0.0'),
(63,97,'বেথেলহামের নক্ষত্র','Aso','dmvjwy83tc7f12qwc','2026-10-22T19:43:14+00',null,null,null,'f','0.0.0.0'),
(64,97,'বেথেলহামের নক্ষত্র','Nai kno','dmvjwy83tc7f12qwc','2026-10-22T19:43:19+00',null,null,null,'f','0.0.0.0'),
(65,97,'বেথেলহামের নক্ষত্র','🤪','dmvjwy83tc7f12qwc','2026-10-22T19:46:12+00',null,null,null,'f','0.0.0.0'),
(66,97,'MD SHOHAG MIA','Assalamoalikom','dmvjz4jlkybmx3pxu','2026-10-22T20:09:51+00',null,null,null,'f','0.0.0.0'),
(67,97,'Hi','Keu nai','dmvk5anphujco7x0r','2026-10-22T23:02:09+00',null,null,null,'f','0.0.0.0'),
(68,97,'Hi','🤪','dmvk5anphujco7x0r','2026-10-22T23:03:01+00',null,null,null,'f','0.0.0.0'),
(69,97,'Hi','Asi','dmvjwwxcnsdjj5icc','2026-10-23T04:51:14+00',null,null,null,'f','0.0.0.0'),
(70,97,'Butterfly','Hlw','dmvkicafiqlnl0qh7','2026-10-23T05:07:18+00',null,null,null,'f','0.0.0.0'),
(71,97,'Butterfly','Kew nai reh','dmvkicafiqlnl0qh7','2026-10-23T05:08:35+00',null,null,null,'f','0.0.0.0'),
(72,97,'Butterfly','Jaigi','dmvkicafiqlnl0qh7','2026-10-23T05:08:39+00',null,null,null,'f','0.0.0.0'),
(73,97,'Butterfly','😒','dmvkicafiqlnl0qh7','2026-10-23T05:08:50+00',null,null,null,'f','0.0.0.0'),
(74,97,'আমার কোন নাম নাই','🙃','dmvkj1wpmfokvv9jm','2026-10-23T05:27:47+00',null,null,null,'f','0.0.0.0'),
(75,97,'HITLER','সবাই কেমন আছো?','dmvkj5mxptmx3pmhz','2026-10-23T05:31:29+00',null,null,null,'f','0.0.0.0'),
(76,97,'President Trump😁','hitler er smy sesh','dmvjwy04pg5vvb4ui','2026-10-23T05:45:03+00',null,null,null,'f','0.0.0.0'),
(77,97,'President Trump😁','akon trumper smy','dmvjwy04pg5vvb4ui','2026-10-23T05:45:21+00',null,null,null,'f','0.0.0.0'),
(78,97,'MD: KAMRUL ISLAM','অনেক কতাবার্তা হয়ে গেছে','dmvkkt05z7pf2l181','2026-10-23T06:18:07+00',null,null,null,'f','0.0.0.0'),
(79,97,'Amith','Hi','dmvkl32pw914gu5w2','2026-10-23T06:24:26+00',null,null,null,'f','0.0.0.0'),
(80,97,'বেথেলহামের নক্ষত্র','Koi','dmvjwy83tc7f12qwc','2026-10-23T09:35:56+00',null,null,null,'f','0.0.0.0'),
(81,97,'বেথেলহামের নক্ষত্র','নাম ছাড়া মাত রে হুরুতাইন দেখি কে কিতা কইতায় পারাও','dmvjwy83tc7f12qwc','2026-10-23T09:36:21+00',null,null,null,'f','0.0.0.0'),
(82,97,'আমার কোন নাম নাই','আইলাম','dmvkj1wpmfokvv9jm','2026-10-23T09:47:46+00',null,null,null,'f','0.0.0.0'),
(83,97,'MD: KAMRUL ISLAM','ভাল্লাগেনা কিছু 😁','dmvkkt05z7pf2l181','2026-10-23T12:06:58+00',null,null,null,'f','0.0.0.0'),
(84,97,'বেথেলহামের নক্ষত্র','আসো সবাই','dmvjwy83tc7f12qwc','2026-10-23T13:54:49+00',null,null,null,'f','0.0.0.0'),
(85,97,'MD: KAMRUL ISLAM','হুম, আছুি','dmvkkt05z7pf2l181','2026-10-23T15:14:09+00',null,null,null,'f','0.0.0.0'),
(86,97,'বেথেলহামের নক্ষত্র','কইরে সবাইকে নিয়ে আসো','dmvjwy83tc7f12qwc','2026-10-23T15:41:15+00',null,null,null,'f','0.0.0.0'),
(87,97,'বেথেলহামের নক্ষত্র','Aso re koi tora','dmvjwy83tc7f12qwc','2026-10-23T16:07:18+00',null,null,null,'f','0.0.0.0'),
(88,97,'বেথেলহামের নক্ষত্র','Aso','dmvjwy83tc7f12qwc','2026-10-23T16:07:52+00',null,null,null,'f','0.0.0.0'),
(89,97,'MD: KAMRUL ISLAM','হুম আছি🖖','dmvkkt05z7pf2l181','2026-10-23T17:10:57+00',null,null,null,'f','0.0.0.0')
) as v(id, sess, nick, body, voter, ts, rt, rn, rx, de, ip)
join mc2_ac_depts d on d.name = 'রাষ্ট্রবিজ্ঞান'
join mc2_ac_sessions s on s.dept_id = d.id
  and s.name = case v.sess when 91 then '২০১৭-১৮' when 93 then '২০১৯-২০' else '২০২৩-২৪' end
on conflict (id) do update set ip = excluded.ip;
alter table mc2_ac_messages enable trigger user;
select setval(pg_get_serial_sequence('mc2_ac_messages','id'), greatest((select max(id) from mc2_ac_messages),1));
select count(*) as messages from mc2_ac_messages;


-- (২) ====================================================================
-- Friend Adda: সাইটের ব্যাকগ্রাউন্ড (অ্যাডমিন → 🖼 ব্যাকগ্রাউন্ড)। Supabase SQL Editor-এ একবার চালান।
create table if not exists public.mc2_site_bg (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  pick text not null default '12',          -- '00' = ব্যাকগ্রাউন্ড ছাড়া (ডিফল্ট সবুজ হেডার), '01'..'20' = ছবি
  updated_at timestamptz not null default now()
);
insert into public.mc2_site_bg (id) values (1) on conflict (id) do nothing;
alter table public.mc2_site_bg enable row level security;
drop policy if exists "mc2_site_bg read" on public.mc2_site_bg;
create policy "mc2_site_bg read" on public.mc2_site_bg for select to anon, authenticated using (true);
grant select on public.mc2_site_bg to anon, authenticated;

create or replace function public.mc2_admin_set_bg(p_on boolean, p_pick text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.mc2_is_admin() then raise exception 'not admin'; end if;
  if p_pick !~ '^(00|12)$' and not (p_pick ~ '^custom:(https://|data:image/)[^[:space:]"''\\()]+$' and length(p_pick) < 600000) then raise exception 'bad pick'; end if;
  update public.mc2_site_bg set enabled = p_on, pick = p_pick, updated_at = now() where id = 1;
end $$;
revoke all on function public.mc2_admin_set_bg(boolean, text) from public, anon;
grant execute on function public.mc2_admin_set_bg(boolean, text) to authenticated;

-- ============================================================================
-- (৩) নোটিশ হোমে দেখান/লুকান
-- ============================================================================
alter table mc2_ac_sessions add column if not exists pw_note_on boolean not null default true;
grant select (pw_note_on) on mc2_ac_sessions to anon;


-- (৪) ====================================================================
-- সর্বজনীন নোটিশ (অ্যাডমিন → 📢 সর্বজনীন নোটিশ)। ডিফল্টে বন্ধ।
create table if not exists public.fa_global_notice (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  body text not null default '' check (char_length(body) <= 500),
  updated_at timestamptz not null default now()
);
insert into public.fa_global_notice (id) values (1) on conflict (id) do nothing;
alter table public.fa_global_notice enable row level security;
drop policy if exists "fa_gn read" on public.fa_global_notice;
create policy "fa_gn read" on public.fa_global_notice for select to anon, authenticated using (true);
drop policy if exists "fa_gn admin" on public.fa_global_notice;
create policy "fa_gn admin" on public.fa_global_notice for all to authenticated using (mc2_is_admin()) with check (mc2_is_admin());
grant select on public.fa_global_notice to anon;
grant select, insert, update on public.fa_global_notice to authenticated;

-- চেক: হোমে চালু রুম
select d.name as dept, s.name as session, s.home_on, s.active from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.home_on;
